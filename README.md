# Minefield

## Source Code

The complete editable v1.0.2 project is included here: the React game, Android Java
shell, themes, opening/tile animations, sounds, haptics, icons and build scripts.
Start with **[BUILDING.md](BUILDING.md)** for tool setup and step-by-step APK builds.
No signing keys, SDK binaries, installed npm packages or generated APK payloads
are included in the source archive. Build your own installer with the scripts.

A calm, distinctive Minesweeper playground with an Arena-inspired, warm-minimal interface. Built with React, Vite, and Tailwind CSS.

## A little logic. A lot of possibility.

- **Classic:** Perfect squares — Easy (9 × 9, 10 mines), Medium (16 × 16, 40 mines), and Hard (30 × 30, 99 mines).
- **Blitz:** A race against the clock, from 15 seconds to 5 minutes, on all three board sizes.
- **Zen:** No pressure and no visible timer.
- **Daily:** A numbered, seeded puzzle refreshed at midnight UTC. All daily games use a shared seed
  with first-move protection, and each day carries a twist: Classic rules, Packed (+33% mines),
  Flag-free (no flags at all), or Sprint (two minutes on the clock). Streaks, a seven-day result
  strip and a spoiler-free share grid are built in.
- Safe opening: Your first square and its neighbors are mine-free.
- Reveal, chord, flag, and restart controls; right-click, touch, and long-press support.
- Every board is a perfect square that scales to fit the window, so you never scroll mid-sweep.
- Flags are always the same orange — a flag never hints at what is underneath it.
- Hover **Let's play** in the sidebar for the mode switcher (daily challenge included).
- Locally saved game history, personal bests, sound settings, and high-contrast/reduced-motion options.
- No accounts, advertising, analytics, or remote APIs.

## Web

```sh
npm install
npm run dev
```

Use `npm run build` to generate the production site in `dist/`.

## Android APK

The ready-to-install, independently signed APK is **`public/minefield.apk`**. It is a native Android application containing a WebView shell and the complete offline game. The web game and all fonts are bundled inside the APK, without requiring a network connection. The app requires Android 8.0 (API 26) or newer and a current Android System WebView.

After building the APK, open **Download APK** in the website to download it. To get the editable project instead, use **Source code (ZIP)** in the preview menu. On your phone, open the APK and approve installation for the browser or file manager if prompted. Since this is independently signed and not distributed by Google Play, Android may display an “unknown app” warning.

The native shell lives in `android/`; the build script is `scripts/build-android.py`. Run `npm ci`, `python3 scripts/build-android.py`, then `npm run build`. It needs Android Platform 35, Build-Tools 35.0.0 and JDK 17. Set `JAVA_HOME` and `ANDROID_SDK_ROOT` as described in `BUILDING.md`; the original `.android-tools/` layout is also accepted. The toolchain and private signing keys are intentionally excluded from the source ZIP. Your first build generates a new development signing key.

The browser and native app each keep their own local statistics. Deleting the app or clearing browser storage clears those records.

## Checks

```sh
npx tsc --noEmit
node scripts/test-engine.mjs
node scripts/test-browser.mjs
```

The browser checks expect the Vite server at `http://127.0.0.1:4173` and Playwright Chromium. They cover safe openings, complete wins, flagging, difficulties, modes, Blitz timeout, local statistics, mobile controls, preferences, and APK downloading.

## Keyboard controls

- **N:** New game
- **F:** Flag mode, or flag a focused tile
- **?:** How to play
- **Escape:** Close a dialog or leave focus mode
- **Tab / Enter / Space:** Standard navigation and tile activation

The initial Classic board is an illustrative preview. Your first move generates a fresh, safe board. No game or time is recorded until you actually start playing.

## Desktop (Windows & Linux)

The game is wrapped with [Tauri](https://tauri.app) in `desktop/`.

```sh
npm install
npm run desktop:icon        # generates tray/window icons from public/favicon.svg (run once)
npm run build               # web bundle into dist/
npm run desktop:build       # bundles installers
```

Outputs in `desktop/target/release/bundle/`:
- **Windows:** `nsis/` → a signed-setup `.exe` installer
- **Linux:** `appimage/` → `.AppImage`, and `deb/` → `.deb`
- **Flatpak:** build the bundled desktop binary, then
  `flatpak-builder --user --install --force-clean build-dir desktop/flatpak/com.minefield.app.yml`
  and `flatpak build-bundle` to get a `.flatpak` file.

Cross-building (e.g. the `.exe` from Linux) needs the target toolchain or CI — easiest via GitHub Actions on `windows-latest` / `ubuntu-latest`.

## Public leaderboard (Firebase)

1. Create a free project at https://console.firebase.google.com, add a **Web app**, and enable **Firestore** (start in production mode).
2. Copy `firestore.rules` into the Firestore rules editor and publish.
3. Create `.env` in the project root with the web app config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...   (optional)
```

Wins post automatically to the public board on the Leaderboard page; without a config the game stays fully local.
