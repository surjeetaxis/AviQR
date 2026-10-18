"""Post the dated AviQR Shorts in shorts/out/by-date/ as Instagram Reels and Facebook Page Reels.

The Instagram API cannot schedule, so this posts at the slot time: run it every 30 minutes and it publishes
each video whose date and time (IST) have passed in the last --late hours. Posts are recorded per platform
in shorts/out/meta-uploaded.json, so a run never posts twice and a failed platform is retried next run.
Videos go up straight from disk (resumable upload), so they do not need a public URL.

One-time setup:
  1. An Instagram Professional (Business or Creator) account linked to a Facebook Page.
  2. developers.facebook.com: create an app (type Business) and add the "Instagram" (API setup with
     Facebook login) and "Facebook Login for Business" products.
  3. Graph API Explorer: pick the app, get a User token with the permissions pages_show_list,
     pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish.
  4. ssh -t aviqr 'cd /opt/aviqr-shorts && .venv/bin/python meta-upload.py --setup --app-id ID --page-id PAGE_ID'
     It asks for the token and the app secret (hidden input), swaps them for a Page token that does not
     expire and saves ~/.config/aviqr-meta/config.json.

Every 30 minutes (cron):
  .venv/bin/python meta-upload.py

Limits: Instagram allows 50 API posts per 24 hours.
"""
import argparse, datetime, glob, json, os, sys, time

SHORTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
CONFIG = os.path.expanduser('~/.config/aviqr-meta')
GRAPH = 'https://graph.facebook.com/v26.0'
RUPLOAD = 'https://rupload.facebook.com'
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
PLATFORMS = ('instagram', 'facebook')


def api(method, path, **params):
    import requests
    r = requests.request(method, path if path.startswith('http') else f'{GRAPH}/{path}', data=params if method == 'POST' else None,
                         params=params if method == 'GET' else None, timeout=120)
    body = r.json()
    if 'error' in body:
        raise RuntimeError(f"{path}: {body['error'].get('message')}")
    return body


def push(url, token, video):
    """Send the whole file to a rupload.facebook.com upload URL."""
    import requests
    with open(video, 'rb') as fh:
        r = requests.post(url, data=fh, timeout=600, headers={
            'Authorization': f'OAuth {token}', 'offset': '0', 'file_size': str(os.path.getsize(video))})
    if not r.ok:
        raise RuntimeError(f'upload failed: {r.status_code} {r.text[:300]}')


def instagram(cfg, video, caption):
    token, ig = cfg['page_token'], cfg['ig_user_id']
    box = api('POST', f'{ig}/media', media_type='REELS', upload_type='resumable', caption=caption,
              share_to_feed='true', access_token=token)['id']
    push(f'{RUPLOAD}/ig-api-upload/v26.0/{box}', token, video)
    for _ in range(60):  # Instagram transcodes before it will publish
        status = api('GET', box, fields='status_code,status', access_token=token)
        if status['status_code'] == 'FINISHED':
            break
        if status['status_code'] == 'ERROR':
            raise RuntimeError(f"Instagram processing failed: {status.get('status')}")
        time.sleep(10)
    else:
        raise RuntimeError('Instagram processing timed out')
    return api('POST', f'{ig}/media_publish', creation_id=box, access_token=token)['id']


def facebook(cfg, video, caption):
    token, page = cfg['page_token'], cfg['page_id']
    start = api('POST', f'{page}/video_reels', upload_phase='start', access_token=token)
    push(start['upload_url'], token, video)
    api('POST', f'{page}/video_reels', upload_phase='finish', video_id=start['video_id'], video_state='PUBLISHED',
        description=caption, access_token=token)
    return start['video_id']


def due(late, ledger, start=None):
    """(metadata path, platforms still to post) for slots on or after `start` that passed within the last `late` hours, oldest first."""
    now = datetime.datetime.now(IST)
    out = []
    for meta in sorted(glob.glob(os.path.join(SHORTS, 'by-date', '*', '*.json'))):
        date = os.path.basename(os.path.dirname(meta))
        if start and date < start:
            continue
        hhmm = os.path.basename(meta)[:4]
        when = datetime.datetime.fromisoformat(f'{date}T{hhmm[:2]}:{hhmm[2:]}:00').replace(tzinfo=IST)
        todo = [p for p in PLATFORMS if p not in ledger.get(os.path.relpath(meta, SHORTS), {})]
        if now - datetime.timedelta(hours=late) <= when <= now and todo:
            out.append((meta, todo))
    return out


def setup(a):
    import getpass
    token = getpass.getpass('Graph API Explorer user token: ').strip()
    secret = a.app_secret or getpass.getpass('App secret: ').strip()
    user = api('GET', 'oauth/access_token', grant_type='fb_exchange_token', client_id=a.app_id,
               client_secret=secret, fb_exchange_token=token)['access_token']
    # A Page token fetched with a long-lived user token does not expire.
    fields = 'id,name,access_token,instagram_business_account'
    if a.page_id:  # me/accounts can leave out Pages that are tied to a business, so ask for the Page itself
        pages = [api('GET', a.page_id, fields=fields, access_token=user)]
    else:
        pages = api('GET', 'me/accounts', fields=fields, access_token=user)['data']
        pages = [p for p in pages if not a.page or p['name'].lower() == a.page.lower()]
    if len(pages) != 1:
        sys.exit('Pick one Page with --page: ' + ', '.join(p['name'] for p in pages) if pages
                 else 'No matching Facebook Page; pass its ID with --page-id.')
    page = pages[0]
    if 'access_token' not in page:
        sys.exit(f"No Page token for {page['name']}: the token's user needs full control of the Page.")
    if 'instagram_business_account' not in page:
        sys.exit(f"Page {page['name']} has no linked Instagram Professional account.")
    cfg = {'page_id': page['id'], 'page_name': page['name'], 'page_token': page['access_token'],
           'ig_user_id': page['instagram_business_account']['id']}
    ig = api('GET', cfg['ig_user_id'], fields='username', access_token=cfg['page_token'])['username']
    os.makedirs(CONFIG, exist_ok=True)
    path = os.path.join(CONFIG, 'config.json')
    with open(path, 'w') as fh:
        json.dump(cfg, fh, indent=1)
    os.chmod(path, 0o600)
    print(f"Saved {path}: Facebook Page {page['name']}, Instagram @{ig}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--setup', action='store_true', help='save a non-expiring Page token; asks for a Graph API Explorer user token')
    ap.add_argument('--app-id')
    ap.add_argument('--app-secret', help='asked for when left out')
    ap.add_argument('--page', help='Facebook Page name, if the account manages several')
    ap.add_argument('--page-id', help='Facebook Page ID, for a Page that me/accounts does not list')
    ap.add_argument('--late', type=float, default=6, help='still post a slot missed by up to this many hours')
    ap.add_argument('--from', dest='start', metavar='YYYY-MM-DD', help='never post slots dated before this')
    ap.add_argument('--only', choices=PLATFORMS, help='post to one platform only')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if a.setup:
        if not a.app_id:
            sys.exit('--setup needs --app-id')
        return setup(a)
    # One run at a time: an overlapping run would post the same slot again before the ledger is written.
    import fcntl
    lock = open(os.path.join(SHORTS, '.meta-upload.lock'), 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit('Another meta-upload run is in progress.')
    ledger_path = os.path.join(SHORTS, 'meta-uploaded.json')
    ledger = json.load(open(ledger_path)) if os.path.exists(ledger_path) else {}
    todo = due(a.late, ledger, a.start)
    if a.dry_run:
        for meta, platforms in todo:
            print(f"{os.path.relpath(meta, SHORTS)} -> {', '.join(platforms)}")
        return
    path = os.path.join(CONFIG, 'config.json')
    if not os.path.exists(path):
        sys.exit(f'Missing {path}: run meta-upload.py --setup first.')
    cfg = json.load(open(path))
    failed = 0
    for meta, platforms in todo:
        m = json.load(open(meta))
        video = os.path.join(os.path.dirname(meta), m['video'])
        caption = f"{m['title']}\n\n{m['description']}"[:2200]
        for platform in platforms:
            if a.only and platform != a.only:
                continue
            try:
                post_id = (instagram if platform == 'instagram' else facebook)(cfg, video, caption)
            except Exception as e:
                failed += 1
                print(f'{platform} failed for {os.path.basename(meta)[:-5]}: {e}')
                continue
            ledger.setdefault(os.path.relpath(meta, SHORTS), {})[platform] = {
                'id': post_id, 'posted': datetime.datetime.now(IST).isoformat(timespec='seconds')}
            with open(ledger_path, 'w') as fh:
                json.dump(ledger, fh, indent=1)
            print(f'{platform}: posted {os.path.basename(meta)[:-5]} -> {post_id}')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
