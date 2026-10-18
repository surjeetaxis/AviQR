"""Upload the dated AviQR Shorts in shorts/out/by-date/ to YouTube as scheduled (private until publishAt).

Each video uses the made_for_kids flag from its metadata (false for AviQR), category Science & Technology.
Uploaded files are recorded in shorts/out/uploaded.json so a run never uploads twice.

One-time setup:
  1. Google Cloud console: create a project, enable "YouTube Data API v3", create an OAuth client
     of type "Desktop app" and save its JSON as ~/.config/aviqr-youtube/client_secret.json
  2. python3 youtube-upload.py --auth   (opens a browser; pick the AviQR channel)

Daily run (root cron on the AviQR server):
  .venv/bin/python youtube-upload.py --ahead 2

Quota: a video upload costs 1,600 of the default 10,000 daily units, so --max defaults to 6 per run.
Projects that have not passed YouTube's API audit can only upload private videos; scheduled
publishing needs the audit (https://support.google.com/youtube/contact/yt_api_form).
"""
import argparse, datetime, glob, json, os, sys

SHORTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
CONFIG = os.path.expanduser('~/.config/aviqr-youtube')
SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube']
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def credentials(interactive):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    token = os.path.join(CONFIG, 'token.json')
    # --auth always signs in again, e.g. to replace a 7-day token issued while the app was in testing.
    creds = Credentials.from_authorized_user_file(token, SCOPES) if os.path.exists(token) and not interactive else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    elif not creds or not creds.valid:
        if not interactive:
            sys.exit('Not signed in: run youtube-upload.py --auth once.')
        secret = os.path.join(CONFIG, 'client_secret.json')
        if not os.path.exists(secret):
            sys.exit(f'Missing {secret}\n'
                     'Create a "Desktop app" OAuth client for the YouTube Data API v3 in Google Cloud console,\n'
                     'download its JSON and save it at that path, then run --auth again.')
        flow = InstalledAppFlow.from_client_secrets_file(secret, SCOPES)
        creds = flow.run_local_server(port=0)
    os.makedirs(CONFIG, exist_ok=True)
    with open(token, 'w') as fh:
        fh.write(creds.to_json())
    os.chmod(token, 0o600)
    return creds


def due(ahead, ledger):
    """Metadata files for dates from today up to today+ahead that are not uploaded yet, oldest first."""
    today = datetime.datetime.now(IST).date()
    last = today + datetime.timedelta(days=ahead)
    out = []
    for meta in sorted(glob.glob(os.path.join(SHORTS, 'by-date', '*', '*.json'))):
        date = datetime.date.fromisoformat(os.path.basename(os.path.dirname(meta)))
        if today <= date <= last and os.path.relpath(meta, SHORTS) not in ledger:
            out.append(meta)
    return out


def publish_at(m):
    when = datetime.datetime.fromisoformat(f"{m['date']}T{m['time_ist']}:00").replace(tzinfo=IST)
    if when < datetime.datetime.now(IST) + datetime.timedelta(minutes=30):
        return None  # slot already passed: publish immediately instead
    return when.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def upload(youtube, meta_path):
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload
    m = json.load(open(meta_path))
    folder = os.path.dirname(meta_path)
    video = os.path.join(folder, m['video'])
    if not os.path.exists(video):
        raise FileNotFoundError(f'{video} has not been rendered yet')
    when = publish_at(m)
    status = {'privacyStatus': 'private' if when else 'public', 'selfDeclaredMadeForKids': m.get('made_for_kids', False),
              'embeddable': True}
    if when:
        status['publishAt'] = when
    title = m['title'] if '#shorts' in m['title'].lower() else f"{m['title'][:91]} #shorts"
    body = {'snippet': {'title': title[:100], 'description': m['description'][:5000], 'tags': m['tags'],
                        'categoryId': '28', 'defaultLanguage': 'en', 'defaultAudioLanguage': 'en'},
            'status': status}
    req = youtube.videos().insert(part='snippet,status', body=body,
                                  media_body=MediaFileUpload(video, mimetype='video/mp4', chunksize=-1, resumable=True))
    resp = None
    while resp is None:
        _, resp = req.next_chunk()
    cover = os.path.join(folder, m['cover'])
    if os.path.exists(cover):
        try:  # custom thumbnails need a verified channel; Shorts may ignore them
            youtube.thumbnails().set(videoId=resp['id'], media_body=MediaFileUpload(cover, mimetype='image/png')).execute()
        except HttpError as e:
            print(f'  thumbnail skipped: {e.reason}')
    return resp['id'], when


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--auth', action='store_true', help='sign in once and save the token')
    ap.add_argument('--ahead', type=int, default=2, help='upload videos dated up to this many days ahead')
    ap.add_argument('--max', type=int, default=6, help='uploads per run (API quota)')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    ledger_path = os.path.join(SHORTS, 'uploaded.json')
    ledger = json.load(open(ledger_path)) if os.path.exists(ledger_path) else {}
    todo = due(a.ahead, ledger)[:a.max]
    if a.dry_run:
        for meta in todo:
            m = json.load(open(meta))
            print(f"{m['date']} {m['time_ist']}  {m['title']}  ({m['video']})")
        return
    from googleapiclient.discovery import build
    youtube = build('youtube', 'v3', credentials=credentials(a.auth), cache_discovery=False)
    if a.auth:
        me = youtube.channels().list(part='snippet', mine=True).execute()['items'][0]['snippet']['title']
        print(f'Signed in as channel: {me}')
        return
    for meta in todo:
        vid, when = upload(youtube, meta)
        ledger[os.path.relpath(meta, SHORTS)] = {'id': vid, 'publish_at': when,
                                                 'uploaded': datetime.datetime.now(IST).isoformat(timespec='seconds')}
        with open(ledger_path, 'w') as fh:
            json.dump(ledger, fh, indent=1)
        print(f"uploaded {os.path.basename(meta)[:-5]} -> https://youtu.be/{vid} ({'scheduled ' + when if when else 'public now'})")
    print(f'{len(todo)} uploaded; {len(due(a.ahead, ledger))} more due within {a.ahead} days')


if __name__ == '__main__':
    main()
