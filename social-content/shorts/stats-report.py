"""Weekly growth report: which formats, languages and videos gain views, likes and comments, on every platform.

Reads the uploaders' ledgers (uploaded.json for YouTube, meta-uploaded.json for Instagram and Facebook), asks each
platform for the current counts, saves a snapshot in <shorts>/stats/<date>.json and writes <shorts>/stats/report-<date>.md
with this week's change against the previous snapshot. The same file runs for FirstWords and AviQR:

  FirstWords: .venv/bin/python scripts/stats-report.py
  AviQR:      .venv/bin/python stats-report.py --shorts out --youtube-config ~/.config/aviqr-youtube --meta-config ~/.config/aviqr-meta

Cost: YouTube videos.list is 1 quota unit per 50 videos. Instagram views and Facebook plays need the
instagram_manage_insights and read_insights permissions; without them the report shows likes and comments only.
"""
import argparse, datetime, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
GRAPH = 'https://graph.facebook.com/v26.0'
LANGS = {'en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu'}
# AviQR's one-letter Short families (social-content/shorts/flows.mjs); FirstWords names are already words.
NAMES = {'h': 'hotel PMS screens', 'w': 'website features', 'm': 'food court', 's': 'multi-outlet brand', 'o': 'restaurant owner',
         'c': 'customer menu', 'b': 'booking site', 'l': 'hotel landing page', 'r': 'staff roles', 'demo': 'full demo (long)',
         'trailer-demo': 'demo trailer', 'lesson': 'lesson (long)', 'compilation': 'compilation (long)',
         'marathon': 'marathon (long)', 'app': 'app demo (long)', 'parent': 'parent tips', 'say': 'say it with me'}


def default_shorts():
    for path in (os.path.join(HERE, '..', 'marketing', 'shorts'), os.path.join(HERE, 'out')):
        if os.path.exists(os.path.join(path, 'uploaded.json')):
            return os.path.abspath(path)
    return os.path.abspath(os.path.join(HERE, '..', 'marketing', 'shorts'))


def classify(key):
    """(format, language) from a ledger key like by-date/2026-11-07/0800-810-game-find-x-rock.json or .../1830-h-25-ta.json."""
    name = os.path.basename(key)[:-5]
    name = re.sub(r'^\d{4}-', '', name)
    lang = None
    parts = name.split('-')
    if parts[-1] in LANGS:
        lang, parts = parts[-1], parts[:-1]
    if parts[0].isdigit():
        parts = parts[1:]
    if parts[0] == 'game' and len(parts) > 1:
        fmt = f'game-{parts[1]}'
    elif parts[0] in ('trailer', 'demo', 'lesson', 'compilation', 'marathon', 'app', 'parent', 'say', 'guess', 'learn'):
        fmt = parts[0] if parts[0] != 'trailer' else f"trailer-{parts[1] if len(parts) > 1 else ''}".rstrip('-')
    elif len(parts[0]) == 1:
        fmt = parts[0]
    else:
        fmt = 'product clip'  # AviQR's numbered clips cut from the demo recordings (31-47)
    return NAMES.get(fmt, fmt), lang


def youtube_counts(config, ids):
    sys.path.insert(0, HERE)
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    token = os.path.join(os.path.expanduser(config), 'token.json')
    creds = Credentials.from_authorized_user_file(token)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    yt = build('youtube', 'v3', credentials=creds, cache_discovery=False)
    ch = yt.channels().list(part='statistics,snippet', mine=True).execute()['items'][0]
    out = {}
    for i in range(0, len(ids), 50):
        for v in yt.videos().list(part='statistics,status', id=','.join(ids[i:i + 50])).execute().get('items', []):
            s = v['statistics']
            out[v['id']] = {'views': int(s.get('viewCount', 0)), 'likes': int(s.get('likeCount', 0)),
                            'comments': int(s.get('commentCount', 0)), 'public': v['status']['privacyStatus'] == 'public'}
    channel = {'title': ch['snippet']['title'], 'subscribers': int(ch['statistics'].get('subscriberCount', 0)),
               'views': int(ch['statistics'].get('viewCount', 0)), 'videos': int(ch['statistics'].get('videoCount', 0))}
    return channel, out


def graph(path, token, **params):
    import requests
    r = requests.get(f'{GRAPH}/{path}', params={**params, 'access_token': token}, timeout=60)
    body = r.json()
    if 'error' in body:
        raise RuntimeError(body['error'].get('message'))
    return body


def meta_counts(config, ledger):
    cfg = json.load(open(os.path.join(os.path.expanduser(config), 'config.json')))
    token = cfg['page_token']
    out, notes = {}, set()
    for key, platforms in ledger.items():
        for platform, entry in platforms.items():
            pid, row = entry['id'], {}
            try:
                if platform == 'instagram':
                    m = graph(pid, token, fields='like_count,comments_count')
                    row = {'likes': m.get('like_count', 0), 'comments': m.get('comments_count', 0)}
                    try:
                        ins = graph(f'{pid}/insights', token, metric='views,reach,shares,saved')['data']
                        row.update({i['name']: i['values'][0]['value'] for i in ins})
                    except RuntimeError:
                        notes.add('Instagram views need the instagram_manage_insights permission.')
                else:
                    m = graph(pid, token, fields='likes.summary(total_count).limit(0),comments.summary(total_count).limit(0)')
                    row = {'likes': m.get('likes', {}).get('summary', {}).get('total_count', 0),
                           'comments': m.get('comments', {}).get('summary', {}).get('total_count', 0)}
                    try:
                        ins = graph(f'{pid}/video_insights', token, metric='total_video_views')['data']
                        row['views'] = ins[0]['values'][0]['value'] if ins else 0
                    except RuntimeError:
                        notes.add('Facebook plays need the read_insights permission.')
            except RuntimeError as e:
                notes.add(f'{platform}: some posts could not be read ({str(e)[:80]}).')
                continue
            out[f'{platform}:{key}'] = row
    try:
        f = graph(cfg['ig_user_id'], token, fields='followers_count,media_count,username')
        notes.add(f"Instagram @{f['username']}: {f['followers_count']} followers, {f['media_count']} posts.")
        followers = {'instagram': f['followers_count']}
    except RuntimeError:
        followers = {}
    try:
        p = graph(cfg['page_id'], token, fields='followers_count,fan_count,name')
        followers['facebook'] = p.get('followers_count', p.get('fan_count', 0))
    except RuntimeError:
        pass
    return followers, out, sorted(notes)


def table(rows, headers):
    lines = ['| ' + ' | '.join(headers) + ' |', '|' + '---|' * len(headers)]
    lines += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shorts', default=default_shorts(), help='folder with uploaded.json and meta-uploaded.json')
    ap.add_argument('--youtube-config', default='~/.config/firstwords-youtube')
    ap.add_argument('--meta-config', default='~/.config/firstwords-meta')
    ap.add_argument('--top', type=int, default=10)
    a = ap.parse_args()
    shorts = os.path.abspath(a.shorts)
    yt_ledger = json.load(open(os.path.join(shorts, 'uploaded.json')))
    meta_ledger = json.load(open(os.path.join(shorts, 'meta-uploaded.json')))
    now = datetime.datetime.now(IST)
    today = now.date().isoformat()

    channel, yt = youtube_counts(a.youtube_config, [v['id'] for v in yt_ledger.values()])
    followers, meta, notes = meta_counts(a.meta_config, meta_ledger)
    snap = {'date': today, 'channel': channel, 'followers': followers, 'youtube': {}, 'meta': meta}
    for key, entry in yt_ledger.items():
        if entry['id'] in yt:
            snap['youtube'][key] = {**yt[entry['id']], 'id': entry['id']}
    stats_dir = os.path.join(shorts, 'stats')
    os.makedirs(stats_dir, exist_ok=True)
    previous = sorted(p for p in glob.glob(os.path.join(stats_dir, '20*.json')) if os.path.basename(p)[:10] < today)
    prev = json.load(open(previous[-1])) if previous else None
    with open(os.path.join(stats_dir, f'{today}.json'), 'w') as fh:
        json.dump(snap, fh, indent=1, ensure_ascii=False)

    since = f" since {prev['date']}" if prev else ' (first report: totals so far)'
    pv = (prev or {}).get('youtube', {})
    out = [f"# {channel['title']}: growth report {today}", '']
    pc = (prev or {}).get('channel', {})
    if prev:
        out.append(f"**YouTube:** {channel['subscribers']} subscribers ({channel['subscribers'] - pc.get('subscribers', 0):+d}), "
                   f"{channel['views']} views ({channel['views'] - pc.get('views', 0):+d}{since}), {channel['videos']} videos.")
    else:
        out.append(f"**YouTube:** {channel['subscribers']} subscribers, {channel['views']} views, {channel['videos']} videos{since}.")
    pf = (prev or {}).get('followers', {})
    for platform, n in followers.items():
        out.append(f"**{platform.title()}:** {n} followers" + (f" ({n - pf.get(platform, n):+d})." if prev else '.'))
    out.append('')

    # YouTube by format and language: only public videos count, so scheduled ones don't drag the averages down.
    def gain(key, row, field='views'):
        return row[field] - pv.get(key, {}).get(field, 0)

    groups, langs = {}, {}
    public = {k: r for k, r in snap['youtube'].items() if r['public']}
    for key, row in public.items():
        fmt, lang = classify(key)
        for bucket, name in ((groups, fmt), (langs, lang)):
            if name is None:
                continue
            g = bucket.setdefault(name, {'n': 0, 'views': 0, 'gain': 0, 'likes': 0, 'comments': 0, 'zero': 0})
            g['n'] += 1
            g['views'] += row['views']
            g['gain'] += gain(key, row)
            g['likes'] += row['likes']
            g['comments'] += row['comments']
            g['zero'] += row['views'] == 0

    def rows(bucket):
        return [(name, g['n'], g['views'], f"{g['views'] / g['n']:.1f}", *([f"{g['gain']:+d}"] if prev else []), g['likes'],
                 g['comments'], f"{100 * g['zero'] / g['n']:.0f}%")
                for name, g in sorted(bucket.items(), key=lambda kv: -kv[1]['views'] / kv[1]['n'])]

    headers = ['Videos', 'Views', 'Avg views', *(['Views this week'] if prev else []), 'Likes', 'Comments', '0 views']
    out += ['## YouTube by format (public videos, best average first)', '', table(rows(groups), ['Format'] + headers), '']
    if langs:
        out += ['## YouTube by language', '', table(rows(langs), ['Language'] + headers), '']
    ranked = sorted(public.items(), key=lambda kv: -gain(*kv))[:a.top]
    out += [f'## Top {a.top} YouTube videos{" this week" if prev else ""}', '',
            table([(os.path.basename(k)[5:-5], gain(k, r), r['views'], r['likes'], r['comments'], f"https://youtu.be/{r['id']}")
                   for k, r in ranked], ['Video', 'Views gained' if prev else 'Views', 'Total', 'Likes', 'Comments', 'Link']), '']

    # Instagram and Facebook by format.
    pm = (prev or {}).get('meta', {})
    for platform in ('instagram', 'facebook'):
        bucket = {}
        for key, row in meta.items():
            if not key.startswith(platform + ':'):
                continue
            fmt, _ = classify(key.split(':', 1)[1])
            g = bucket.setdefault(fmt, {'n': 0, 'likes': 0, 'comments': 0, 'views': 0, 'gain': 0})
            g['n'] += 1
            for f in ('likes', 'comments', 'views'):
                g[f] += row.get(f, 0) or 0
            g['gain'] += (row.get('views', 0) or 0) - (pm.get(key, {}).get('views', 0) or 0)
        if not bucket:
            continue
        has_views = any(g['views'] for g in bucket.values())
        rws = [(name, g['n'], *((g['views'], f"{g['views'] / g['n']:.1f}", *([f"{g['gain']:+d}"] if prev else [])) if has_views else ()),
                g['likes'], g['comments'], f"{(g['likes'] + g['comments']) / g['n']:.2f}")
               for name, g in sorted(bucket.items(), key=lambda kv: -(kv[1]['views'] or kv[1]['likes'] + kv[1]['comments']) / kv[1]['n'])]
        hdr = ['Format', 'Posts', *(['Views', 'Avg views', *(['Views this week'] if prev else [])] if has_views else []), 'Likes',
               'Comments', 'Engagement per post']
        out += [f'## {platform.title()} by format', '', table(rws, hdr), '']
    if notes:
        out += ['## Notes', ''] + [f'- {n}' for n in notes] + ['']
    path = os.path.join(stats_dir, f'report-{today}.md')
    with open(path, 'w') as fh:
        fh.write('\n'.join(out))
    print('\n'.join(out))
    print(f'\nSaved {path}')


if __name__ == '__main__':
    main()
