"""Give the planned AviQR videos a soundtrack: synthesized background music in place of the silent track.

The Shorts (render.mjs, app.mjs) and the full demos (demos/tours.mjs) are rendered with a silent audio track.
This writes a music bed for each video in shorts/out/by-date/ from --from on, its length and its own seed, and
swaps it in (the video stream is copied, not re-encoded). The source copy in out/videos/ or youtube/out/final/
is replaced too, so a later replan keeps the music. Each JSON gets "music": true, so a rerun skips it.

The music is generated here (chords, bass and a pentatonic melody), so it is free to use with no licence.
Needs numpy and ffmpeg. Then copy the changed files to the server:
  python3 shorts/add-music.py --from 2026-10-24
  rsync -a --include='*/' --include='*.mp4' --include='*.json' --exclude='*' shorts/out/by-date/ aviqr:/opt/aviqr-shorts/out/by-date/
"""
import argparse, glob, json, os, random, subprocess, tempfile, wave
from concurrent.futures import ThreadPoolExecutor
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
BY_DATE = os.path.join(HERE, 'out', 'by-date')
SOURCES = [os.path.join(HERE, 'out', 'videos'), os.path.join(HERE, '..', 'youtube', 'out', 'final')]
SR = 44100
LEVEL = 0.75  # peak level: the videos have captions but no voice, so the music carries the sound
PROGRESSIONS = [
    [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
    [[5, 9, 12], [7, 11, 14], [0, 4, 7], [0, 4, 7]],
    [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]],
    [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
]


def freq(semi):
    return 261.63 * 2 ** (semi / 12)


def music(seconds, seed):
    """Upbeat, light bed: soft pad chords, bass on the bar, sparse plucked melody and a quiet hi-hat."""
    rng = random.Random(seed)
    n = int(seconds * SR)
    buf = np.zeros(n)
    bpm = rng.choice([104, 112, 118, 124])
    beat = 60 / bpm
    prog = PROGRESSIONS[seed % len(PROGRESSIONS)]
    pent = [0, 2, 4, 7, 9, 12, 14, 16]
    key = rng.choice([-3, -1, 0, 2])

    def tone(start, dur, f, amp, kind='sine', decay=4.0):
        s0 = int(start * SR)
        cnt = min(int(dur * SR), n - s0)
        if cnt <= 0:
            return
        t = np.arange(cnt) / SR
        env = np.minimum(1, t * 60) * np.exp(-decay * t)
        ph = 2 * np.pi * f * t
        v = np.sin(ph) if kind == 'sine' else (2 / np.pi) * np.arcsin(np.sin(ph))
        buf[s0:s0 + cnt] += amp * env * v

    noise = np.random.default_rng(seed).standard_normal(int(0.05 * SR))
    hat = noise * np.exp(-np.arange(len(noise)) / SR * 90) * 0.05
    t, bar = 0.0, 0
    while t < seconds:
        chord = [c + key for c in prog[bar % len(prog)]]
        tone(t, beat * 4, freq(chord[0] - 24), 0.18, 'tri', 1.0)
        for k in range(4):
            for c in chord:
                tone(t + k * beat, beat * 0.95, freq(c), 0.03, 'sine', 2.5)
            s0 = int((t + k * beat + beat / 2) * SR)
            if s0 + len(hat) < n:
                buf[s0:s0 + len(hat)] += hat
        for k in range(8):
            if rng.random() < 0.55:
                tone(t + k * beat / 2, beat * 0.5, freq(rng.choice(pent) + 12 + key), 0.06, 'tri', 8)
        t += beat * 4
        bar += 1
    fade_in, fade_out = int(0.4 * SR), int(min(1.5, seconds / 4) * SR)
    buf[:fade_in] *= np.linspace(0, 1, fade_in)
    buf[-fade_out:] *= np.linspace(1, 0, fade_out)
    return buf / max(1e-6, np.abs(buf).max()) * LEVEL


def duration(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True, check=True).stdout)


def source_for(stem):
    """out/videos/<id>.mp4 or youtube/out/final/<id>.mp4 for a by-date stem like 0930-w-26-branded-receipts-mr."""
    vid = stem.split('-', 1)[1]
    for folder in SOURCES:
        path = os.path.join(folder, vid + '.mp4')
        if os.path.exists(path):
            return path
    return None


def add(meta_path):
    m = json.load(open(meta_path))
    if m.get('music'):
        return None
    video = os.path.join(os.path.dirname(meta_path), m['video'])
    seconds = duration(video)
    seed = sum(map(ord, os.path.basename(video)))
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'm.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(music(seconds + 0.2, seed), -1, 1) * 32767).astype('<i2').tobytes())
        out = os.path.join(tmp, 'out.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-t', f'{seconds:.3f}', '-movflags', '+faststart', out],
                       check=True)
        src = source_for(os.path.basename(video)[:-4])
        os.replace(out, video)
    if src:  # keep the source in step (it was a hard link to the by-date copy)
        os.remove(src)
        os.link(video, src)
    m['music'] = True
    with open(meta_path, 'w') as fh:
        json.dump(m, fh, indent=1, ensure_ascii=False)
    return os.path.basename(video)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='start', required=True, metavar='YYYY-MM-DD')
    ap.add_argument('--jobs', type=int, default=6)
    a = ap.parse_args()
    metas = sorted(p for p in glob.glob(os.path.join(BY_DATE, '*', '*.json'))
                   if os.path.basename(os.path.dirname(p)) >= a.start)
    done = 0
    with ThreadPoolExecutor(a.jobs) as ex:
        for name in ex.map(add, metas):
            if name:
                done += 1
                if done % 50 == 0:
                    print(f'{done} done ({name})', flush=True)
    print(f'music added to {done} videos from {a.start}')


if __name__ == '__main__':
    main()
