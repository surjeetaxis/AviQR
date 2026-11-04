"""Render long "how to" videos for YouTube search (16:9): a question people type, answered step by step.

Each video: a title card that says what you will learn, then each step as a banner over its part of a demo recording in
youtube/out/final/ (already masked), narrated in Indian English (add-voice.py's voice and add-music.py's music), and
the "Try it free" end card. The steps become YouTube chapters in the description. The videos are reel:false, so
meta-upload.py posts them to Facebook as Page videos; render-trailers.py can make their Instagram trailers.

Usage (from social-content/): python3 shorts/render-howtos.py [--only qr-menu] [--lang en]
Output: shorts/out/howto/howto-<slug>-<lang>.{mp4,png,json}
"""
import argparse, importlib.util, json, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FINAL = os.path.join(HERE, '..', 'youtube', 'out', 'final')
OUT = os.path.join(HERE, 'out', 'howto')
W, H, FPS, SR = 1920, 1080, 30, 44100
BAND = 108  # the step banner above the footage
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
FONT_REG = '/System/Library/Fonts/Supplemental/Arial.ttf'
GREEN, GREEN2, WHITE, INK = (8, 74, 54), (14, 122, 88), (255, 255, 255), (12, 40, 30)
END_SECONDS = 4.5  # each demo ends with the "Try it free at aviqr.com" card

spec = importlib.util.spec_from_file_location('add_voice', os.path.join(HERE, 'add-voice.py'))
av = importlib.util.module_from_spec(spec)
spec.loader.exec_module(av)

# Each step: (banner, narration, [(source video in youtube/out/final, start, end), ...]).
HOWTOS = [
    {
        'slug': 'qr-menu',
        'title': 'How to make a QR code menu for your restaurant (free, step by step)',
        'card': 'How to make a QR code menu for your restaurant',
        'sub': 'Menu online, printed-menu scan, table QR codes and what customers see',
        'intro': 'Want a QR code menu for your restaurant? In the next few minutes you will see how to put your menu online, '
                 'turn a printed menu into a digital one, make a QR code for every table, and what your customers see when they scan.',
        'steps': [
            ('Add your dishes to the menu', 'Step one. Open the menu section and add your dishes: names, prices, photos, and veg or non-veg. '
             'Changes go live on every table straight away.', [('demo-owner-en.mp4', 55, 67)]),
            ('Already have a printed menu? Scan it', 'Step two. Already have a printed menu? Take a photo of it, and AviQR reads the dishes and prices '
             'for you, so you only check and edit.', [('demo-owner-en.mp4', 67, 79)]),
            ('Add sizes and add-ons', 'Step three. Add variants like half and full, or extras like cheese, so customers can choose without asking a waiter.',
             [('demo-owner-en.mp4', 79, 91)]),
            ('Make a QR code for every table', 'Step four. Create a QR code for each table and print it. The code never changes, '
             'even when you change the menu or the prices.', [('demo-owner-en.mp4', 114, 125)]),
            ('Free tool: a QR code for any link', 'Need a QR code for a link you already have? The free QR code generator on aviqr.com '
             'makes one in seconds: paste your link, pick a colour and download it. No sign-up.', [('04-free-qr-menu-code-generator.mp4', 8, 40)]),
            ('What your customers see', 'Step five. This is what customers see after they scan: your menu, in their own language, '
             'with categories, a one-tap veg filter and search.', [('demo-menu-en.mp4', 3, 29), ('demo-menu-en.mp4', 44, 57), ('demo-menu-en.mp4', 72, 83)]),
        ],
        'tags': ['qr code menu', 'qr menu for restaurant', 'how to make qr code menu', 'digital menu', 'restaurant qr code',
                 'free qr menu', 'contactless menu', 'restaurant software india'],
    },
    {
        'slug': 'qr-ordering',
        'title': 'How QR code table ordering works in a restaurant: from scan to kitchen to bill',
        'card': 'How QR table ordering works, start to finish',
        'sub': 'The customer orders from the table; the dashboard, kitchen and bill update live',
        'intro': 'How does QR code ordering actually work in a restaurant? Let us follow one real order, from the customer '
                 'scanning the table QR, to the kitchen, to the bill.',
        'steps': [
            ('The customer scans the table QR', 'Step one. The customer scans the QR code on their table with their phone camera. No app to download.',
             [('06-customer-order-flow.mp4', 3, 8)]),
            ('Browse the menu and add to cart', 'Step two. They browse the menu and add dishes to the cart, just like any food app.',
             [('06-customer-order-flow.mp4', 8, 18)]),
            ('Place the order', 'Step three. At checkout they place the order. It goes to the restaurant with the table number attached.',
             [('06-customer-order-flow.mp4', 18, 23), ('06-customer-order-flow.mp4', 63, 81)]),
            ('The order appears in your live list', 'Step four. On the owner dashboard the new order appears in the live orders list, '
             'with its table number.', [('demo-owner-en.mp4', 15, 28)]),
            ('The kitchen gets the KOT', 'Step five. The kitchen sees the order ticket on its own screen, with no paper and no running around.',
             [('demo-owner-en.mp4', 40, 55)]),
            ('Bill it, and sales update live', 'Step six. When the table is done, bill it in seconds, and your sales numbers update on the dashboard.',
             [('demo-owner-en.mp4', 28, 40), ('demo-owner-en.mp4', 3, 15)]),
        ],
        'tags': ['qr code ordering', 'qr table ordering system', 'restaurant qr ordering', 'how qr ordering works', 'scan and order',
                 'restaurant kot', 'contactless ordering', 'restaurant pos india'],
    },
    {
        'slug': 'restaurant-dashboard',
        'title': 'How to manage restaurant orders, KOT and billing from one dashboard',
        'card': 'Run orders, kitchen and billing from one screen',
        'sub': 'Orders, POS billing, kitchen display, shortcodes, stock and reports',
        'intro': 'Juggling orders, kitchen tickets and bills on different systems? Here is how to run all of it from one dashboard, '
                 'step by step.',
        'steps': [
            ('See your day at a glance', "Step one. The dashboard shows today's orders and sales at a glance.", [('demo-owner-en.mp4', 3, 15)]),
            ('Every order in one live list', 'Step two. Dine-in, takeaway and QR orders all land in one live list.', [('demo-owner-en.mp4', 15, 28)]),
            ('Bill a table in seconds', 'Step three. The billing screen lets your cashier pick dishes and print the bill in seconds.', [('demo-owner-en.mp4', 28, 40)]),
            ('Send orders to the kitchen', 'Step four. Orders go to the kitchen display as KOT tickets. Chefs mark them ready.', [('demo-owner-en.mp4', 40, 55)]),
            ('Shortcodes for fast billing', 'Step five. Give popular dishes short codes, so the counter can bill without searching.', [('demo-owner-en.mp4', 102, 114)]),
            ('Track stock and get alerts', 'Step six. Track stock levels and get an alert before you run out.', [('demo-owner-en.mp4', 125, 137)]),
            ('Check your sales reports', 'Step seven. At the end of the day, sales reports show what sold, when, and how much you made.', [('demo-owner-en.mp4', 183, 195)]),
        ],
        'tags': ['restaurant management software', 'restaurant pos', 'kot system', 'restaurant billing software', 'kitchen display system',
                 'restaurant dashboard', 'restaurant software india', 'how to manage restaurant orders'],
    },
    {
        'slug': 'hotel-guest-requests',
        'title': 'How to handle hotel guest requests and housekeeping with a QR code in every room',
        'card': 'Guest requests and housekeeping with room QR codes',
        'sub': 'Room QR codes, guest requests, housekeeping, maintenance and the front desk',
        'intro': 'Guests calling reception for towels, food or a fix? Here is how to put a QR code in every room, '
                 'and handle every request, housekeeping and maintenance from one screen.',
        'steps': [
            ('Your hotel at a glance', "Step one. The hotel dashboard shows your whole property at a glance.", [('demo-hotel-en.mp4', 3, 15)]),
            ('Put a QR code in every room', 'Step two. Create a QR code for each room and place it on the desk or the door.', [('demo-hotel-en.mp4', 375, 387)]),
            ('The guest sends a request', 'Step three. The guest scans it and asks for what they need, from room service to extra towels.', [('08-hotel-flow.mp4', 9, 27)]),
            ('See every request in one list', 'Step four. Every request lands in one list, so nothing gets lost between shifts.', [('demo-hotel-en.mp4', 111, 123)]),
            ('Run housekeeping from a board', 'Step five. The housekeeping board shows which rooms are clean, dirty or in progress.', [('demo-hotel-en.mp4', 135, 147)]),
            ('Log maintenance tickets', 'Step six. Broken AC or a leaking tap? Log a maintenance ticket and track it until it is fixed.', [('demo-hotel-en.mp4', 171, 183)]),
            ('Check in guests at the front desk', 'Step seven. The front desk screen handles check-ins and check-outs.', [('demo-hotel-en.mp4', 39, 51)]),
            ('Review your hotel reports', 'Step eight. Reports show occupancy, revenue and more, ready to share.', [('demo-hotel-en.mp4', 412, 423)]),
        ],
        'tags': ['hotel guest request system', 'hotel room qr code', 'hotel housekeeping software', 'hotel management software',
                 'hotel pms india', 'room service qr code', 'hotel maintenance tracking', 'front desk software'],
    },
    {
        'slug': 'staff-logins',
        'title': 'How to set up staff logins for your restaurant: cashier, kitchen, manager and waiter',
        'card': 'Set up staff logins: cashier, kitchen, manager, waiter',
        'sub': 'Give every person their own login that shows only what they need',
        'intro': 'Sharing one login with all your staff? Here is how to give the cashier, the kitchen, the manager and the waiters '
                 'their own logins, each showing only what they need.',
        'steps': [
            ('One restaurant, several logins', 'Step one. Add your staff and give each person their own login and role.', [('demo-owner-en.mp4', 172, 183)]),
            ('A cashier login for the counter', 'Step two. The cashier login is built for the counter: billing and payments.', [('demo-staff-en.mp4', 3, 18)]),
            ('A kitchen login with just the KOT', 'Step three. The kitchen login shows only the order tickets.', [('demo-staff-en.mp4', 18, 35)]),
            ('A manager login for daily operations', 'Step four. The manager login covers daily operations.', [('demo-staff-en.mp4', 35, 49)]),
            ('A menu editor login', 'Step five. A menu editor can keep dishes and prices up to date.', [('demo-staff-en.mp4', 49, 64)]),
            ('An order viewer login for waiters', 'Step six. Waiters can follow orders from their phones.', [('demo-staff-en.mp4', 64, 74)]),
        ],
        'tags': ['restaurant staff management', 'restaurant user roles', 'restaurant pos login', 'cashier login', 'kitchen display',
                 'restaurant software india', 'staff permissions', 'restaurant management software'],
    },
]
OUTRO = "That's it. You can start free at aviqr dot com, and be live in under ten minutes. Subscribe for more restaurant and hotel how-tos."


def font(size, bold=True):
    return ImageFont.truetype(FONT if bold else FONT_REG, size)


def wrap(text, f, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if f.getlength(trial) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def gradient(w, h):
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(GREEN[i] + (GREEN2[i] - GREEN[i]) * t) for i in range(3)))
    return img


def badge(d, cx, cy, size=46):
    f = font(size)
    tw = f.getlength('AviQR')
    d.rounded_rectangle([cx - tw / 2 - 26, cy - size * 0.75, cx + tw / 2 + 26, cy + size * 0.75], 14, fill=WHITE)
    d.text((cx - tw / 2, cy - size * 0.62), 'AviQR', font=f, fill=GREEN)


def title_card(h, path, size=(W, H), scale=1.0):
    w, hh = size
    img = gradient(w, hh)
    d = ImageDraw.Draw(img)
    badge(d, w / 2, hh * 0.22, int(46 * scale))
    f, fs = font(int(84 * scale)), font(int(40 * scale), bold=False)
    lines = wrap(h['card'], f, w * 0.82)
    y = hh * 0.36
    for ln in lines:
        d.text(((w - f.getlength(ln)) / 2, y), ln, font=f, fill=WHITE)
        y += 100 * scale
    y += 20 * scale
    for ln in wrap(h['sub'], fs, w * 0.8):
        d.text(((w - fs.getlength(ln)) / 2, y), ln, font=fs, fill=(210, 240, 225))
        y += 52 * scale
    tag = 'STEP-BY-STEP GUIDE  |  AVIQR.COM'
    ft = font(int(30 * scale))
    d.text(((w - ft.getlength(tag)) / 2, hh * 0.86), tag, font=ft, fill=(190, 230, 210))
    img.save(path)


def step_frame(n, total, text, path):
    """The canvas behind a step's footage: a green band with the step on top, footage area below."""
    img = gradient(W, H)
    d = ImageDraw.Draw(img)
    f, fn = font(46), font(34)
    label = f'STEP {n} OF {total}'
    d.rounded_rectangle([40, 26, 40 + fn.getlength(label) + 40, 82], 28, fill=WHITE)
    d.text((60, 32), label, font=fn, fill=GREEN)
    d.text((40 + fn.getlength(label) + 70, 28), text, font=f, fill=WHITE)
    img.save(path)


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def still(png, seconds, out):
    run(['ffmpeg', '-y', '-loop', '1', '-i', png, '-t', f'{seconds:.3f}', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium',
         '-crf', '20', '-pix_fmt', 'yuv420p', '-an', out])


def footage(frame_png, clips, seconds, out, tmp):
    """The clips one after another below the banner, the last frame held until `seconds`."""
    fw, fh = W - 2 * 96, H - BAND
    parts = []
    for k, (src, a, b) in enumerate(clips):
        part = os.path.join(tmp, f'{os.path.basename(out)}.{k}.mp4')
        run(['ffmpeg', '-y', '-ss', str(a), '-to', str(b), '-i', os.path.join(FINAL, src), '-an', '-vf',
             f'scale={fw}:{fh}:force_original_aspect_ratio=decrease,pad={fw}:{fh}:(ow-iw)/2:(oh-ih)/2,fps={FPS}',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', part])
        parts.append(part)
    lst = os.path.join(tmp, os.path.basename(out) + '.txt')
    with open(lst, 'w') as fh_:
        fh_.writelines(f"file '{p}'\n" for p in parts)
    run(['ffmpeg', '-y', '-loop', '1', '-i', frame_png, '-f', 'concat', '-safe', '0', '-i', lst, '-filter_complex',
         f'[1:v]tpad=stop_mode=clone:stop_duration=600[f];[0:v][f]overlay=96:{BAND}:shortest=1,fps={FPS}',
         '-t', f'{seconds:.3f}', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', out])


def length(clips):
    return sum(b - a for _, a, b in clips)


def stamp(t):
    t = int(t)
    return f'{t // 60}:{t % 60:02d}'


def render(h, lang):
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f"howto-{h['slug']}-{lang}")
    speak = lambda text: av.speak(av.spoken(text), lang)  # noqa: E731
    with tempfile.TemporaryDirectory() as tmp:
        segs, lines, chapters, t = [], [], [], 0.0
        card = os.path.join(tmp, 'title.png')
        title_card(h, card)
        intro = speak(h['intro'])
        dur = max(5.0, len(intro) / SR + 1.2)
        seg = os.path.join(tmp, 'seg-00.mp4')
        still(card, dur, seg)
        segs.append(seg)
        lines.append((0.5, intro))
        chapters.append((0, 'What you will learn'))
        t += dur
        for n, (banner, narration, clips) in enumerate(h['steps'], 1):
            clip = speak(narration)
            dur = max(length(clips), len(clip) / SR + 1.0)
            frame = os.path.join(tmp, f'step-{n}.png')
            step_frame(n, len(h['steps']), banner, frame)
            seg = os.path.join(tmp, f'seg-{n:02d}.mp4')
            footage(frame, clips, dur, seg, tmp)
            segs.append(seg)
            lines.append((t + 0.4, clip))
            chapters.append((t, banner))
            t += dur
        end_src = os.path.join(FINAL, 'demo-owner-en.mp4')
        outro = speak(OUTRO)
        dur = max(END_SECONDS, len(outro) / SR + 1.0)
        seg = os.path.join(tmp, 'seg-end.mp4')
        total_src = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', end_src],
                                         capture_output=True, text=True).stdout)
        end_png = os.path.join(tmp, 'end.png')  # a frame from the middle of the demo's end card (its last second fades out)
        run(['ffmpeg', '-y', '-ss', f'{total_src - END_SECONDS / 2:.2f}', '-i', end_src, '-frames:v', '1', '-vf', f'scale={W}:{H}', end_png])
        still(end_png, dur, seg)
        segs.append(seg)
        lines.append((t + 0.3, outro))
        chapters.append((t, 'Start free'))
        t += dur
        lst = os.path.join(tmp, 'all.txt')
        with open(lst, 'w') as fh:
            fh.writelines(f"file '{s}'\n" for s in segs)
        wav = os.path.join(tmp, 'mix.wav')
        av.write_wav(wav, av.mix(t, sum(map(ord, h['slug'])), lines))
        run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
             '-c:a', 'aac', '-b:a', '160k', '-t', f'{t:.3f}', '-movflags', '+faststart', out + '.part.mp4'])
        os.replace(out + '.part.mp4', out + '.mp4')
    title_card(h, out + '.png', size=(1280, 720), scale=0.68)
    steps = '\n'.join(f'{k}. {s[0]}' for k, s in enumerate(h['steps'], 1))
    description = '\n'.join([
        h['intro'], '', 'Steps:', steps, '',
        'Start free at https://aviqr.com (no credit card, live in under 10 minutes).', '',
        'Chapters:', *[f'{stamp(at)} {name}' for at, name in chapters], '',
        '#restaurant #hotel #qrcode #restaurantsoftware #aviqr',
    ])
    meta = {'title': h['title'], 'description': description, 'tags': h['tags'] + ['AviQR'], 'made_for_kids': False,
            'short': False, 'reel': False, 'howto': True, 'lang': lang, 'chapters': [{'at': round(a, 1), 'title': n} for a, n in chapters]}
    with open(out + '.json', 'w') as fh:
        json.dump(meta, fh, indent=1, ensure_ascii=False)
    return out, t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', nargs='*', default=[])
    ap.add_argument('--lang', default='en')
    a = ap.parse_args()
    for h in HOWTOS:
        if a.only and h['slug'] not in a.only:
            continue
        out, seconds = render(h, a.lang)
        print(f'{os.path.basename(out)}: {seconds / 60:.1f} min', flush=True)


if __name__ == '__main__':
    main()
