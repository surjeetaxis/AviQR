"""Give the planned AviQR Shorts a voice: a natural human-sounding narrator explains each screen in the Short's language.

The narrator (Google Cloud Text-to-Speech, Chirp 3 HD, Indian English and 8 Indian languages) reads the hook, each
caption and the end card ("Start free at aviqr.com. Follow for a new feature every day."), over the generated
music from add-music.py, which ducks under the voice.
  - Screen Shorts (flows.mjs in every language, and the website Shorts 01-30) are re-encoded from their screenshots
    so each screen stays up until its line is spoken.
  - Product clips (31-47) keep their footage; the last frame is held if the end line needs longer.
The source copy in out/videos/ is replaced too (it was a hard link), and each JSON gets "voice": true.
Full demos (landscape, 1700-demo-*) are left alone.

One-time setup (the Google Cloud project that pays for the voice, signed in as its owner):
  enable "Cloud Text-to-Speech API", then
  gcloud auth application-default login
  gcloud auth application-default set-quota-project <project>      (or set AQ_TTS_PROJECT)
Usage (from social-content/):
  python3 shorts/add-voice.py --from 2026-10-30 --skip-uploaded /tmp/uploaded.json [--only o-kot-hi] [--limit 3]
  rsync -a --include='*/' --include='*.mp4' --include='*.json' --exclude='*' shorts/out/by-date/ aviqr:/opt/aviqr-shorts/out/by-date/
"""
import argparse, base64, glob, hashlib, importlib.util, io, json, os, re, subprocess, tempfile, time, wave
from concurrent.futures import ThreadPoolExecutor
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
BY_DATE = os.path.join(OUT, 'by-date')
VIDEOS = os.path.join(OUT, 'videos')
SR = 44100
FPS = 30
HOOK_S, SHOT_S, END_S, FADE_S = 2.6, 5.2, 3.2, 0.4
LANGS = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu']
VOICE = os.environ.get('AQ_VOICE', 'Kore')  # Chirp 3 HD voice name; the same voice exists in every Indian locale
PROJECT = os.environ.get('AQ_TTS_PROJECT', 'aviqr-uploader-512005')
CACHE = os.path.expanduser('~/.cache/aviqr-voice')
END_EN = ['Start free at aviqr.com', '', 'Follow for a new feature every day']

spec = importlib.util.spec_from_file_location('add_music', os.path.join(HERE, 'add-music.py'))
am = importlib.util.module_from_spec(spec)
spec.loader.exec_module(am)

# ---------- voice ----------
_token = {'value': None, 'at': 0}


def token():
    if not _token['value'] or time.time() - _token['at'] > 1800:
        _token['value'] = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                                         capture_output=True, text=True, check=True).stdout.strip()
        _token['at'] = time.time()
    return _token['value']


def speak(text, lang, rate=1.0):
    """Mono float samples at SR for `text` in `lang`, cached on disk."""
    name = f'{lang}-IN-Chirp3-HD-{VOICE}'
    key = hashlib.sha1(json.dumps([text, name, rate]).encode()).hexdigest()
    path = os.path.join(CACHE, key + '.wav')
    if not os.path.exists(path):
        import requests
        body = {'input': {'text': text}, 'voice': {'languageCode': f'{lang}-IN', 'name': name},
                'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': SR, 'speakingRate': rate}}
        for attempt in range(5):
            r = requests.post('https://texttospeech.googleapis.com/v1/text:synthesize', json=body, timeout=60,
                              headers={'Authorization': f'Bearer {token()}', 'x-goog-user-project': PROJECT})
            if r.status_code in (429, 500, 503) and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            if not r.ok:
                raise RuntimeError(f'Text-to-Speech {r.status_code}: {r.text[:300]}')
            break
        os.makedirs(CACHE, exist_ok=True)
        with open(path + '.part', 'wb') as fh:
            fh.write(base64.b64decode(r.json()['audioContent']))
        os.replace(path + '.part', path)
    with wave.open(path) as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float) / 32768
    loud = np.nonzero(np.abs(audio) > 0.01)[0]
    return audio[max(0, loud[0] - int(0.03 * SR)):loud[-1] + int(0.12 * SR)] if len(loud) else audio


def spoken(text):
    """Captions are written for the eye: make arrows, slashes and symbols readable aloud."""
    text = re.sub(r'\s*→\s*', ', ', text)
    text = text.replace('·', ',').replace('…', '.').replace(' / ', ' or ').replace('&', ' and ')
    return re.sub(r'\s+,', ',', re.sub(r'\s+', ' ', text)).strip()


def mix(seconds, seed, lines):
    """Music ducked under the voice lines [(start, samples)], at about the level add-music.py uses."""
    bed = am.music(seconds, seed)
    n = len(bed)
    vox, duck = np.zeros(n), np.ones(n)
    for start, clip in lines:
        s0 = int(start * SR)
        cnt = max(0, min(len(clip), n - s0))
        vox[s0:s0 + cnt] += clip[:cnt] / max(1e-6, np.abs(clip).max()) * 0.95
        duck[max(0, s0 - int(0.15 * SR)):min(n, s0 + cnt + int(0.25 * SR))] = 0.22
    kernel = np.ones(int(0.12 * SR)) / int(0.12 * SR)
    out = bed * np.convolve(duck, kernel, mode='same') * 0.6 + vox
    return out / max(1.0, np.abs(out).max() / 0.95)


def write_wav(path, samples):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())

# ---------- texts ----------


def texts():
    """{video id: (lang, hook, [captions], kind, extra)} for every Short the renderers know."""
    js = ("import {FLOWS} from './shorts/flows.mjs'; import {SHORTS, CLIPS} from './shorts/render.mjs';"
          "console.log(JSON.stringify({flows: FLOWS.map(f => [f.id, f.en]), shorts: SHORTS.map(s => [s.id, s.hook, s.caps]),"
          "clips: CLIPS.map(c => [c.id, c.hook, c.caps])}))")
    data = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], cwd=os.path.dirname(HERE),
                                     capture_output=True, text=True, check=True).stdout)
    out = {}
    for sid, hook, caps in data['shorts']:
        out[sid] = ('en', hook, caps, 'website', None)
    for cid, hook, caps in data['clips']:
        out[cid] = ('en', hook, caps, 'clip', None)
    for lang in LANGS:
        tr = {} if lang == 'en' else json.load(open(os.path.join(HERE, 'i18n', f'{lang}.json')))
        end = tr.get('_end', END_EN)
        for fid, en in data['flows']:
            t = en if lang == 'en' else tr.get(fid)
            if t:
                out[f'{fid}-{lang}'] = (lang, t[0], t[1:-1], 'flow', None)
        out[f'_end-{lang}'] = (lang, f'{end[0]}. {end[2]}.', [], 'end', None)
    return out

# ---------- video ----------


def encode_stills(images, wav, mp4):
    """render.mjs encode(): each still with a slow zoom, neighbours crossfaded; images = [(png, seconds)]."""
    inputs, filters = [], []
    for i, (png, seconds) in enumerate(images):
        inputs += ['-loop', '1', '-t', f'{seconds:.2f}', '-framerate', str(FPS), '-i', png]
        frames = round(seconds * FPS)
        filters.append(f"[{i}:v]scale=2160:3840:flags=lanczos,zoompan=z='1+0.05*on/{frames}':x='iw/2-(iw/zoom/2)'"
                       f":y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps={FPS},format=yuv420p,setsar=1[v{i}]")
    last, offset = 'v0', images[0][1] - FADE_S
    for i in range(1, len(images)):
        filters.append(f'[{last}][v{i}]xfade=transition=fade:duration={FADE_S}:offset={offset:.2f}[x{i}]')
        last = f'x{i}'
        offset += images[i][1] - FADE_S
    total = sum(s for _, s in images) - FADE_S * (len(images) - 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-i', wav, '-filter_complex', ';'.join(filters),
                    '-map', f'[{last}]', '-map', f'{len(images)}:a', '-t', f'{total:.2f}', '-c:v', 'libx264', '-preset', 'medium',
                    '-crf', '19', '-r', str(FPS), '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', mp4],
                   check=True)


def duration(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True, check=True).stdout)


def stills_for(vid, kind, lang):
    """(hook png, [screen pngs], end png) captured by render.mjs / app.mjs."""
    if kind == 'website':
        shots = os.path.join(OUT, 'shots')
        screens = sorted(glob.glob(os.path.join(shots, f'{vid}-[1-8].png')))
        return os.path.join(shots, f'{vid}-0hook.png'), screens, os.path.join(shots, f'{vid}-9end.png')
    shots = os.path.join(OUT, 'shots2')
    screens = sorted(p for p in glob.glob(os.path.join(shots, f'{vid}-*.png')) if re.search(r'-[1-9]\.png$', p))
    return os.path.join(shots, f'{vid}-0.png'), screens, os.path.join(shots, f'end-{lang}.png')


def voice_stills(vid, kind, lang, hook, caps, end_line, seed, mp4, tmp):
    hook_png, screens, end_png = stills_for(vid, kind, lang)
    for p in [hook_png, end_png, *screens]:
        if not os.path.exists(p):
            raise FileNotFoundError(p)
    clips = [speak(spoken(hook), lang)] + [speak(spoken(c), lang) for c in caps[:len(screens)]] + [speak(spoken(end_line), lang)]
    pngs = [hook_png] + screens[:len(caps)] + [end_png]
    mins = [HOOK_S] + [SHOT_S] * (len(pngs) - 2) + [END_S]
    lens = [max(m, 0.3 + len(c) / SR + 0.6) for m, c in zip(mins, clips)]
    lines, start = [], 0.0
    for clip, seconds in zip(clips, lens):
        lines.append((start + 0.3, clip))
        start += seconds - FADE_S
    total = sum(lens) - FADE_S * (len(lens) - 1)
    wav = os.path.join(tmp, 'a.wav')
    write_wav(wav, mix(total + 0.2, seed, lines))
    encode_stills(list(zip(pngs, lens)), wav, mp4)


def voice_clip(video, lang, hook, caps, end_line, seed, mp4, tmp):
    """Product clip: footage then the end card (END_S). Lines spread over the footage; hold the last frame if needed."""
    total = duration(video)
    end_at = total - END_S + FADE_S
    clips = [speak(spoken(t), lang) for t in [hook, *caps]]
    end_clip = speak(spoken(end_line), lang)
    lines, t = [], 0.3
    for k, clip in enumerate(clips):
        t = max(t, 0.3 + end_at * k / len(clips))
        lines.append((t, clip))
        t += len(clip) / SR + 0.5
    hold = max(0.0, t - end_at)  # footage lines ran past the end card: hold the frame before it
    end_start = end_at + hold + 0.3
    lines.append((end_start, end_clip))
    seconds = max(total + hold, end_start + len(end_clip) / SR + 0.5)
    wav = os.path.join(tmp, 'a.wav')
    write_wav(wav, mix(seconds + 0.2, seed, lines))
    pad = seconds - total
    vf = ['-vf', f'tpad=stop_mode=clone:stop_duration={pad:.2f}'] if pad > 0.05 else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', *vf,
                    *(['-c:v', 'libx264', '-preset', 'medium', '-crf', '19'] if vf else ['-c:v', 'copy']),
                    '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-t', f'{seconds:.2f}', '-movflags', '+faststart', mp4], check=True)


def add(job):
    meta_path, info, end_line = job
    m = json.load(open(meta_path))
    video = os.path.join(os.path.dirname(meta_path), m['video'])
    vid = os.path.basename(video)[5:-4]
    lang, hook, caps, kind, _ = info
    seed = sum(map(ord, vid))
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'out.mp4')
        if kind == 'clip':
            voice_clip(video, lang, hook, caps, end_line, seed, out, tmp)
        else:
            voice_stills(vid, kind, lang, hook, caps, end_line, seed, out, tmp)
        src = os.path.join(VIDEOS, vid + '.mp4')
        os.replace(out, video)
    if os.path.exists(src) and not os.path.samefile(src, video):
        os.remove(src)
        os.link(video, src)
    m['voice'] = True
    m['music'] = True
    with open(meta_path, 'w') as fh:
        json.dump(m, fh, indent=1, ensure_ascii=False)
    return vid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='start', required=True, metavar='YYYY-MM-DD')
    ap.add_argument('--skip-uploaded', metavar='LEDGER', help="the server's uploaded.json: leave those videos alone")
    ap.add_argument('--only', nargs='*', default=[])
    ap.add_argument('--limit', type=int)
    ap.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) // 2))
    a = ap.parse_args()
    done = set(json.load(open(a.skip_uploaded))) if a.skip_uploaded else set()
    known = texts()
    jobs, unknown = [], []
    for meta in sorted(glob.glob(os.path.join(BY_DATE, '*', '*.json'))):
        rel = os.path.relpath(meta, OUT)
        vid = os.path.basename(meta)[5:-5]
        if os.path.basename(os.path.dirname(meta)) < a.start or rel in done or vid.startswith('demo-'):
            continue
        if a.only and vid not in a.only:
            continue
        m = json.load(open(meta))
        if m.get('voice') or m.get('reel') is False or m.get('youtube') is False:
            continue
        if vid not in known:
            unknown.append(vid)
            continue
        lang = known[vid][0]
        jobs.append((meta, known[vid], known[f'_end-{lang}'][1]))
    if unknown:
        print(f'no script for {len(unknown)}: {", ".join(unknown[:8])}')
    jobs = jobs[:a.limit] if a.limit else jobs
    print(f'{len(jobs)} Shorts to voice', flush=True)
    failed = []
    with ThreadPoolExecutor(a.jobs) as ex:
        futures = {ex.submit(add, j): j for j in jobs}
        for n, f in enumerate(futures, 1):
            try:
                vid = f.result()
            except Exception as e:
                failed.append(os.path.basename(futures[f][0]))
                print('FAILED', os.path.basename(futures[f][0]), str(e)[:200], flush=True)
                continue
            if n % 25 == 0 or n == len(jobs):
                print(f'{n} done ({vid})', flush=True)
    if failed:
        print(f'{len(failed)} failed')


if __name__ == '__main__':
    main()
