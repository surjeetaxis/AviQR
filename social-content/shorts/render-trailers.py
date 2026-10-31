"""Vertical trailers of the full demos, posted as Instagram and Facebook Reels at the demo's 17:00 slot.

Each planned demo (out/by-date/<date>/1700-demo-*.mp4, landscape, YouTube) gets a 1080x1920 trailer: its first
TRAILER_S seconds on a blurred backdrop with "Full demo on YouTube" above, then the end card of its language
(shots2/end-<lang>.png) while the narrator (add-voice.py) says "Start free at aviqr.com. Follow ...".
The trailers are youtube:false and carry "full" (the demo's ledger key), so meta-upload.py adds the YouTube link.

Usage (from social-content/): python3 shorts/render-trailers.py --from 2026-10-28 [--jobs 4]
Output: shorts/out/trailers/trailer-<demo>.{mp4,png,json}, linked into by-date/ as 1700-trailer-<demo>.*
"""
import argparse, glob, importlib.util, json, os, re, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
BY_DATE = os.path.join(OUT, 'by-date')
TRAILERS = os.path.join(OUT, 'trailers')
TRAILER_S = 55
END_S = 3.2
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
GREEN = (15, 110, 86)

spec = importlib.util.spec_from_file_location('add_voice', os.path.join(HERE, 'add-voice.py'))
av = importlib.util.module_from_spec(spec)
spec.loader.exec_module(av)


def centered(d, y, text, size, fill, pad=None, bg=None):
    f = ImageFont.truetype(FONT, size)
    w = d.textlength(text, font=f)
    if bg:
        d.rounded_rectangle([540 - w / 2 - pad, y - pad / 2, 540 + w / 2 + pad, y + size + pad / 2], (size + pad) // 2, fill=bg)
    d.text((540 - w / 2, y), text, font=f, fill=fill, stroke_width=0 if bg else 6, stroke_fill=(10, 40, 32))


def overlay(path):
    img = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    centered(d, 300, 'AviQR', 64, GREEN, pad=36, bg=(255, 255, 255, 255))
    centered(d, 470, 'FULL DEMO', 96, (255, 255, 255))
    centered(d, 1420, 'Watch it all on YouTube', 64, (255, 255, 255))
    centered(d, 1540, 'YouTube  @aviqros', 50, (40, 40, 40), pad=40, bg=(255, 255, 255, 240))
    img.save(path)


def without_chapters(description):
    """The demo's description minus its chapter list ("0:03 ..."): the times don't fit the trailer, and the long
    caption makes Instagram fail with ProcessingFailedError."""
    text = re.sub(r'(?m)^\d+:\d\d(:\d\d)? .*\n?', '', description)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def render(job):
    meta_path, end_lines = job
    m = json.load(open(meta_path))
    name = os.path.basename(meta_path)[5:-5]
    out = os.path.join(TRAILERS, f'trailer-{name}')
    if os.path.exists(out + '.json'):
        return out
    lang = m.get('lang') or 'en'
    video = os.path.join(os.path.dirname(meta_path), m['video'])
    end_png = os.path.join(OUT, 'shots2', f'end-{lang}.png')
    clip = min(TRAILER_S, av.duration(video) - 1)
    end_clip = av.speak(av.spoken(end_lines[lang]), lang)
    end_s = max(END_S, 0.3 + len(end_clip) / av.SR + 0.5)
    with tempfile.TemporaryDirectory() as tmp:
        layer, voice_wav = os.path.join(tmp, 'layer.png'), os.path.join(tmp, 'v.wav')
        overlay(layer)
        av.write_wav(voice_wav, av.mix(end_s, sum(map(ord, name)), [(0.3, end_clip)]))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-t', f'{clip:.2f}', '-i', video, '-i', layer,
                        '-loop', '1', '-t', f'{end_s:.2f}', '-framerate', '30', '-i', end_png, '-i', voice_wav,
                        '-filter_complex',
                        '[0:v]fps=30,split[a][b];[a]scale=-2:1920,crop=1080:1920,boxblur=28:2,eq=brightness=-0.3[bg];'
                        '[b]scale=1080:-2:flags=lanczos[fg];[bg][fg]overlay=0:(H-h)/2-20[m];'
                        '[m][1:v]overlay=0:0,format=yuv420p,setsar=1[v0];[2:v]scale=1080:1920,fps=30,format=yuv420p,setsar=1[v1];'
                        f'[0:a]aresample=44100,aformat=channel_layouts=stereo,afade=t=out:st={clip - 1:.2f}:d=1[a0];'
                        '[3:a]aresample=44100,aformat=channel_layouts=stereo[a1];'
                        '[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][s]',
                        '-map', '[v]', '-map', '[s]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out + '.part.mp4'], check=True)
    os.replace(out + '.part.mp4', out + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '8', '-i', out + '.mp4', '-frames:v', '1', out + '.png'], check=True)
    meta = {k: v for k, v in m.items() if k not in ('date', 'time_ist', 'video', 'cover', 'reel', 'short', 'music')}
    meta.update({'youtube': False, 'voice': True, 'trailer_of': name, 'description': without_chapters(m.get('description', ''))})
    with open(out + '.json', 'w') as fh:
        json.dump(meta, fh, indent=1, ensure_ascii=False)
    return out


def plan(start):
    """Link each trailer into by-date/ next to its demo, as 1700-trailer-<demo>."""
    n = 0
    for old in glob.glob(os.path.join(BY_DATE, '*', '*-trailer-*')):
        if os.path.basename(os.path.dirname(old)) >= start:
            os.remove(old)
    for meta in sorted(glob.glob(os.path.join(BY_DATE, '*', '*-demo-*.json'))):
        folder, stem = os.path.dirname(meta), os.path.basename(meta)[:-5]
        src = os.path.join(TRAILERS, f'trailer-{stem[5:]}')
        if os.path.basename(folder) < start or not os.path.exists(src + '.json'):
            continue
        new = f'{stem[:4]}-trailer-{stem[5:]}'
        for ext in ('mp4', 'png'):
            os.link(f'{src}.{ext}', os.path.join(folder, f'{new}.{ext}'))
        m = json.load(open(src + '.json'))
        m = {'date': os.path.basename(folder), 'time_ist': f'{stem[:2]}:{stem[2:4]}', 'video': new + '.mp4', 'cover': new + '.png',
             **m, 'full': os.path.relpath(meta, OUT)}
        with open(os.path.join(folder, new + '.json'), 'w') as fh:
            json.dump(m, fh, indent=1, ensure_ascii=False)
        n += 1
    print(f'planned {n} trailers from {start}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='start', required=True, metavar='YYYY-MM-DD')
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--plan-only', action='store_true')
    a = ap.parse_args()
    if not a.plan_only:
        os.makedirs(TRAILERS, exist_ok=True)
        known = av.texts()
        end_lines = {lang: known[f'_end-{lang}'][1] for lang in av.LANGS}
        jobs = [(p, end_lines) for p in sorted(glob.glob(os.path.join(BY_DATE, '*', '*-demo-*.json')))
                if os.path.basename(os.path.dirname(p)) >= a.start and '-trailer-' not in p]
        print(f'{len(jobs)} demos to make trailers for', flush=True)
        with ThreadPoolExecutor(a.jobs) as ex:
            for out in ex.map(render, jobs):
                print(os.path.basename(out), flush=True)
    plan(a.start)


if __name__ == '__main__':
    main()
