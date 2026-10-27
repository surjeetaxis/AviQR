# AviQR Shorts

Vertical (1080×1920) feature Shorts for YouTube Shorts, Instagram Reels and Facebook Reels, one a day.

- **Website Shorts (01–30):** phone-size screenshots of public aviqr.com pages and the public Spice Route demo menu, with a hook card, captions quoted from the site, and a "Start free" end card. No login, nothing written to production, no rupee pricing.
- **Product clips (31–47):** cut from the logged-in demo recordings in `../youtube/out/final` (owner dashboard, kitchen, POS codes, hotel, food court, multi-outlet, staff roles, customer ordering), shown on a blurred backdrop with the hook above.

## Render

```sh
cd social-content
npm install
node shorts/render.mjs --start 2026-10-19            # everything, then the posting plan
node shorts/render.mjs --only 05 31                  # re-render some
node shorts/render.mjs --plan-only --start 2026-11-01  # re-plan without rendering
```

Needs Chrome and ffmpeg. Output (git-ignored): `shorts/out/videos/` and `shorts/out/by-date/<date>/1200-<id>.{mp4,png,json}`, alternating website Shorts and product clips. Default posting time is 12:00 IST (`--time`).

**Sound:** the Shorts and demos are rendered with a silent track. After planning, `python3 shorts/add-music.py --from <first date>` replaces it with generated background music (needs numpy; the video is copied, not re-encoded) and marks each JSON `"music": true`. Then rsync `by-date/` to the server again.

**Voice:** `add-voice.py --from <date> --skip-uploaded <server uploaded.json>` gives every planned Short a narrator in its own language (Google Cloud Text-to-Speech, Chirp 3 HD voice `Kore`, `<lang>-IN`): the hook, each caption and the end line ("Start free at aviqr.com. Follow for a new feature every day", from `i18n/<lang>.json` `_end`), over the generated music, which ducks under the voice. Screen Shorts are re-encoded from their screenshots so each screen stays up until its line ends; product clips keep their footage. Lines are cached in `~/.cache/aviqr-voice/`. It uses Application Default Credentials on the `aviqr-uploader-512005` project (which has billing): `gcloud auth application-default login` as surjeetcse, then `gcloud auth application-default set-quota-project aviqr-uploader-512005`. Each JSON gets `"voice": true`.

**Trailers:** `render-trailers.py --from <date>` makes a vertical trailer (first 55 s plus the spoken end card) of each planned full demo and links it into `by-date/` as `1700-trailer-<demo>` with `youtube: false`, so it only goes to Instagram and Facebook, with the demo's YouTube link in the caption. `--plan-only` relinks after a replan.

## Publish (AviQR server)

`youtube-upload.py` and `meta-upload.py` are the FirstWords uploaders, pointed at `shorts/out/` and their own config folders (`~/.config/aviqr-youtube`, `~/.config/aviqr-meta`). On the server they live in `/opt/aviqr-shorts/` with a `.venv` (`google-api-python-client google-auth-oauthlib requests`) and the rendered `out/by-date/` copied up with rsync.

- YouTube: channel on aviqradmin@gmail.com. Its own Google Cloud project (the FirstWords project's quota is used up by FirstWords). `--auth` once on a machine with a browser, then copy `token.json` up. Cron daily, `--ahead 2`.
- Full demos (`reel: false`) go to Facebook only, as normal Page videos sent in chunks; `youtube: false` entries (the trailers) are skipped by the YouTube uploader.
- Instagram @aviqr and the Aviqr Facebook Page (ID 1306724499192298): `meta-upload.py --setup --app-id <id> --page-id 1306724499192298` on the server. Cron every 30 minutes.

The server's `uploaded.json` and `meta-uploaded.json` are the source of truth; never copy them back over.
