# AviQR Mobile — Setup & Run (read this first)

## 0. Be in the right folder

Your project is at:  ~/workspace/surjeet-projects/AviQR/aviqr-mobile-expo
(or wherever you unzipped it). Run `ls` first — you should see `app/`,
`package.json`, and `src/`. If `cd aviqr-mobile-expo` says "No such file or
directory", you're one level off. Use the full path:

    cd ~/workspace/surjeet-projects/AviQR/aviqr-mobile-expo

## 1. Install (definitive sequence)

    npm install

Then — IMPORTANT — let Expo align every native package to your exact SDK.
This single command fixes any version mismatch automatically (it's how Expo
projects are meant to be kept consistent):

    npx expo install --fix

This is more reliable than hand-pinned versions: it reads your installed Expo
SDK and pins every expo-* and react-native-* package to the matching version.
Run it any time you see "cannot be found" or "unexpected version" errors.

If npm install itself conflicts on peer deps:

    npm install --legacy-peer-deps
    npx expo install --fix

## 2. Run the logic tests (no backend, no emulator)

    npm run test:logic

Expected: 7 suites, 45 tests passing in ~1s.

## 3. Start the app

    npx expo start

Then press:  a = Android emulator,  i = iOS simulator,  w = web browser.

IMPORTANT: use `npx expo start`, NOT the old global `expo start`. The global
expo-cli is deprecated and fails on Node 17+. The `npx` form uses the correct
local CLI bundled in the project.

## 4. Connect to your backend

Backend must be running first:  (from the backend folder) `./aviqr.sh start`

Then in `src/api/index.js` set DEV_URL for your device:
    Android emulator   → http://10.0.2.2:8080   (default)
    iOS simulator      → http://localhost:8080
    Real phone (WiFi)  → http://<your-PC-IP>:8080

Log in:  sujeet@spiceroute.in  /  Test@1234

## Troubleshooting

**"Failed to resolve plugin for module expo-notifications"** — fixed in this
build. The app.json referenced a notifications plugin that wasn't installed and
wasn't used by any code. It has been removed. If you re-add push notifications
later, run `npx expo install expo-notifications` FIRST, then add it back to the
plugins array in app.json.

**"The required package expo-asset cannot be found"** (or any expo-* package) —
run `npx expo install --fix`. This pulls in any expo core package that a fresh
install missed and aligns all versions to your SDK. This build now lists the
core packages explicitly, but `--fix` is the catch-all if anything is off.

**"Support for the experimental syntax 'jsx' isn't currently enabled"** — fixed
in this build. The babel.config.js now correctly uses `babel-preset-expo`
(which includes JSX + reanimated support). The test runner uses its own
separate babel.logic.config.js so the two never collide. If you see this again,
confirm babel.config.js contains `presets: ['babel-preset-expo']`.
