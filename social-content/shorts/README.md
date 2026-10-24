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

## Publish (AviQR server)

`youtube-upload.py` and `meta-upload.py` are the FirstWords uploaders, pointed at `shorts/out/` and their own config folders (`~/.config/aviqr-youtube`, `~/.config/aviqr-meta`). On the server they live in `/opt/aviqr-shorts/` with a `.venv` (`google-api-python-client google-auth-oauthlib requests`) and the rendered `out/by-date/` copied up with rsync.

- YouTube: channel on aviqradmin@gmail.com. Its own Google Cloud project (the FirstWords project's quota is used up by FirstWords). `--auth` once on a machine with a browser, then copy `token.json` up. Cron daily, `--ahead 2`.
- Instagram @aviqr and the Aviqr Facebook Page (ID 1306724499192298): `meta-upload.py --setup --app-id <id> --page-id 1306724499192298` on the server. Cron every 30 minutes.

The server's `uploaded.json` and `meta-uploaded.json` are the source of truth; never copy them back over.
