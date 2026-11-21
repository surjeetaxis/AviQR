"""Lay out the posting plan again from a start date: fewer Shorts, languages rotating, and a weekly how-to video.

Each day from --start (IST):
  09:30, 15:30, 18:30  three Shorts, each in a different language (all nine stay; the first stats showed the regional
                       languages doing best), on every platform;
  17:00, every 2nd day a full demo (YouTube, Facebook) with its trailer (Instagram, Facebook);
  11:00 on Tuesdays    a how-to video from render-howtos.py (YouTube, Facebook).

It only moves videos that neither uploader has sent (out/uploaded.json, out/meta-uploaded.json), keeps their order per
language, and starts the day after the last sent video at the earliest, so it is safe to run again. Run it on the
server, and locally with --ledgers <copies of the server ledgers> to keep both plans equal:
  python3 shorts/replan-cadence.py --start 2026-11-07 --dry-run
"""
import argparse, datetime, glob, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
BY_DATE = os.path.join(OUT, 'by-date')
HOWTO = os.path.join(OUT, 'howto')
SHORT_TIMES = ['0930', '1530', '1830']
DEMO_TIME, DEMO_EVERY = '1700', 2
HOWTO_TIME, HOWTO_WEEKDAY = '1100', 1  # Tuesday
LANGS = {'en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu'}
EXTS = ('json', 'mp4', 'png')


def lang(name):
    last = name.rsplit('-', 1)[-1]
    return last if last in LANGS else 'none'


def interleave(queues):
    """One list from several, always taking from the queue that is furthest behind, never the same one twice running."""
    total = {k: len(q) for k, q in queues.items()}
    taken = {k: 0 for k in queues}
    out, last = [], None
    while any(queues.values()):
        ready = [k for k in queues if queues[k] and (k != last or len([q for q in queues.values() if q]) == 1)]
        k = min(ready, key=lambda k: (taken[k] / total[k], k))
        out.append(queues[k].pop(0))
        taken[k] += 1
        last = k
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--start', required=True, metavar='YYYY-MM-DD')
    ap.add_argument('--ledgers', metavar='DIR', help='folder holding uploaded.json and meta-uploaded.json (default: out/)')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    sent = set()
    for name in ('uploaded.json', 'meta-uploaded.json'):
        path = os.path.join(a.ledgers or OUT, name)
        if os.path.exists(path):
            sent |= set(json.load(open(path)))
    start = a.start
    if sent:
        start = max(start, (datetime.date.fromisoformat(max(k.split('/')[1] for k in sent)) + datetime.timedelta(days=1)).isoformat())

    shorts, demos, trailers, sent_howtos = {}, [], {}, set()
    for meta in sorted(glob.glob(os.path.join(BY_DATE, '*', '*.json'))):
        rel, date, stem = os.path.relpath(meta, OUT), os.path.basename(os.path.dirname(meta)), os.path.basename(meta)[:-5]
        name = stem[5:]
        if rel in sent or date < start:
            if name.startswith('howto-'):
                sent_howtos.add(name)
            continue
        if name.startswith('howto-'):
            continue  # placed again from out/howto below
        m = json.load(open(meta))
        item = {'dir': os.path.dirname(meta), 'stem': stem, 'name': name, 'meta': m}
        if name.startswith('trailer-'):
            trailers[m.get('full')] = item
        elif not m.get('reel', True):
            demos.append(item)
        else:
            shorts.setdefault(lang(name), []).append(item)
    queue = interleave(shorts)
    howtos = sorted(p[:-5] for p in glob.glob(os.path.join(HOWTO, 'howto-*.json')))
    order = ['qr-menu', 'qr-ordering', 'restaurant-dashboard', 'hotel-guest-requests', 'staff-logins']
    howtos = sorted((h for h in howtos if os.path.basename(h) not in sent_howtos),
                    key=lambda h: next((k for k, s in enumerate(order) if f'howto-{s}-' in os.path.basename(h)), 99))

    plan, day, n = [], datetime.date.fromisoformat(start), 0
    while queue or demos or howtos:
        d = day.isoformat()
        for t in SHORT_TIMES:
            if queue:
                plan.append((queue.pop(0), d, t))
        if demos and n % DEMO_EVERY == 0:
            demo = demos.pop(0)
            plan.append((demo, d, DEMO_TIME))
            trailer = trailers.pop(os.path.relpath(os.path.join(demo['dir'], demo['stem'] + '.json'), OUT), None)
            if trailer:
                trailer['full'] = f"by-date/{d}/{DEMO_TIME}-{demo['name']}.json"
                plan.append((trailer, d, DEMO_TIME))
        if howtos and day.weekday() == HOWTO_WEEKDAY:
            plan.append((howtos.pop(0), d, HOWTO_TIME))
        day += datetime.timedelta(days=1)
        n += 1
    counts = {}
    for item, _, _ in plan:
        kind = 'how-to' if isinstance(item, str) else 'trailer' if item['name'].startswith('trailer-') else \
            'demo' if not item['meta'].get('reel', True) else 'short'
        counts[kind] = counts.get(kind, 0) + 1
    print(f"plan from {start} to {(day - datetime.timedelta(days=1)).isoformat()}: " + ', '.join(f'{v} {k}' for k, v in sorted(counts.items()))
          + (f'; {len(trailers)} trailers left without their demo' if trailers else ''))
    if a.dry_run:
        for item, d, t in plan[:14]:
            print(f"  {d} {t}  {os.path.basename(item) if isinstance(item, str) else item['name']}")
        return
    if trailers:
        raise SystemExit('Not moving anything: some trailers have no demo in the plan.')

    staging = os.path.join(BY_DATE, '.replan')
    os.makedirs(staging, exist_ok=True)
    for item, _, _ in plan:
        if isinstance(item, str):
            continue
        for ext in EXTS:
            src = os.path.join(item['dir'], f"{item['stem']}.{ext}")
            if os.path.exists(src):
                os.replace(src, os.path.join(staging, f"{item['stem']}.{ext}"))
    for old in glob.glob(os.path.join(BY_DATE, '*', '*-howto-*')):  # unsent how-tos are placed again
        if os.path.basename(os.path.dirname(old)) >= start:
            os.remove(old)
    for item, d, t in plan:
        folder = os.path.join(BY_DATE, d)
        os.makedirs(folder, exist_ok=True)
        if isinstance(item, str):
            name, m = os.path.basename(item), json.load(open(item + '.json'))
            stem = f'{t}-{name}'
            for ext in ('mp4', 'png'):
                os.link(f'{item}.{ext}', os.path.join(folder, f'{stem}.{ext}'))
        else:
            name, m, stem = item['name'], item['meta'], f"{t}-{item['name']}"
            for ext in ('mp4', 'png'):
                src = os.path.join(staging, f"{item['stem']}.{ext}")
                if os.path.exists(src):
                    os.replace(src, os.path.join(folder, f'{stem}.{ext}'))
            os.remove(os.path.join(staging, f"{item['stem']}.json"))
            if 'full' in item:
                m['full'] = item['full']
        m.update({'date': d, 'time_ist': f'{t[:2]}:{t[2:]}', 'video': f'{stem}.mp4', 'cover': f'{stem}.png'})
        with open(os.path.join(folder, f'{stem}.json'), 'w') as fh:
            json.dump(m, fh, indent=1, ensure_ascii=False)
    left = os.listdir(staging)
    if left:
        raise SystemExit(f'{len(left)} files left in {staging}: {left[:5]}')
    os.rmdir(staging)
    for folder in glob.glob(os.path.join(BY_DATE, '*')):
        if os.path.isdir(folder) and not os.listdir(folder):
            os.rmdir(folder)
    print('done')


if __name__ == '__main__':
    main()
