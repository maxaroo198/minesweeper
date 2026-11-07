## Native installers (Android, Windows, Linux)

See **[RELEASES.md](RELEASES.md)** for setup and first release. GitHub Actions builds
signed Android APKs, unsigned Windows x64 installers, and Linux x86_64 AppImage/.deb
packages. A manual workflow run builds test artifacts; a matching version tag
publishes all completed installers together. Stats and Branch progress save locally
and separately on every device. Download links activate after the first published
installer release. Existing Firestore rules/indexes do not need changes.

# Minefield

## Source Code

The complete editable v1.0.2 project is included here: the React game, Android Java
shell, themes, opening/tile animations, sounds, haptics, icons and build scripts.
Start with **[BUILDING.md](BUILDING.md)** for tool setup and step-by-step APK builds.
No signing keys, SDK binaries, installed npm packages or generated APK payloads
are included in the source archive. Build your own installer with the scripts.

A calm, distinctive Minesweeper playground with an Arena-inspired, warm-minimal interface. Built with React, Vite, and Tailwind CSS.

## A little logic. A lot of possibility.

- **Classic:** Perfect squares — Easy (9 × 9, 10 mines), Medium (12 × 12, 24 mines), and Hard (20 × 20, 70 mines).
- **Blitz:** A race against the clock, from 15 seconds to 5 minutes, on all three board sizes.
- **Branch:** No pressure and no visible timer. Clear a 9 × 9 square to grow the limbs behind
  it — the tree forks wider the deeper you go, and your tree is saved on the device.
- **Daily:** A numbered, seeded puzzle refreshed at midnight UTC. All daily games use a shared seed
  with first-move protection, and each day carries a twist: Classic rules, Packed (+33% mines),
  Flag-free (no flags at all), or Sprint (two minutes on the clock). Streaks, a seven-day result
  strip and a spoiler-free share grid are built in. The daily is always Medium, including timed days; there is no Hard variant.
- **Nightfall:** A 12 × 12 board where opening a square has a chance of showing you nothing at all.
  The chance starts at one in ten, climbs 5% every two seconds and stops at 70%.
  Hidden tiles can touch. **Blackout** starts at one in three and keeps climbing to 100%.
- **Custom:** Pick any field from 5 to 40 squares a side and any mine count it can hold. The board
  size is remembered; results remain in your local statistics, not a leaderboard.
- **Riptide:** Every eight seconds the tide shifts every row and column, dragging the mines with
  it and rewriting the numbers on squares you have already opened. Correctly flagged mines stay anchored; numbered clues remain visible, while zero labels are blank.
- **Contract:** Three compatible objectives from a twenty-four-objective pool, plus two optional bonus
  badges, a one-use safe-tile rescue that costs a final star, and replayable contract codes. Use the
  same code, difficulty and first click to reproduce a board. Objectives stay visible in focus mode.
  Contract results retain their stars in local statistics; there is no Contract leaderboard.
- **Scan:** Start with six charges. Known safe clues cost two; unknowns cost one. Mines
  always return ?, safe tiles have a 40% unknown chance, and the final charge always returns ?.
  A scan cannot be rerolled. Flagging each real mine earns one charge only once.
- Safe opening: Your first square and its neighbors are mine-free.
- Reveal, chord, flag, and restart controls; right-click, touch, and long-press support.
- Boards are square by default and every grid — Custom's odd shapes included — scales to fit the window, so you never scroll mid-sweep.
- Flags are always the same orange — a flag never hints at what is underneath it.
- Hover **Let's play** in the sidebar for the mode switcher, which lists every mode with the daily underneath.
- Every Classic and Blitz win asks who to put on the leaderboard, and the Blitz board lists each
  entry's time and board size next to the name.
- Louder game audio with a saved 0–100% Preferences volume slider, starting at 50%. Mute is independent.
- Locally saved game history, personal bests, sound settings, and high-contrast/reduced-motion options.
- No accounts, advertising, or analytics. Public Classic/Blitz scores optionally use Firebase.
- Leaderboards exist only for Classic and Blitz. Failed submissions remain in a device-local retry queue; the public board shows the latest confirmed submission separately from the fastest 20.

## Branch expeditions — first playable pass (v1.3.0)

Open Branch → enter an open limb → **Begin expedition in this limb**. This is opt-in: the existing one-board tree is preserved and still playable. Each expedition is saved inside its own limb with choices, minefields, danger routes, a shop or event, banking and a phased boss. The starter kit includes Pathfinder and one Return Totem. Inventory is available throughout Branch, including while playing; two active and three passive slots are enforced. Routes grow longer with depth and boards get larger/denser; deeper bosses gain phases. No three-life system.

Unprotected failure drops a random **10–100% of all carried coins**, with an explicit **You dropped some money!** message. Banked coins are never touched. Every unrecovered pouch stays tied to its original limb: the next return after a failed attempt gets a **10%** recovery roll per pouch. Each pouch is checked once per attempt; reopening the map or restarting cannot reroll it. Totems absorb a mine hit without coin loss and preserve the board, but you still see the hit and choose Continue.

**Scope:** this pass implements 3 distinct bosses and 8 shop item types, not the agreed full 50+ twist roster. See **BRANCH-EXPEDITIONS.md** for exact mechanics, testing and remaining scope. No Firebase rules, indexes, or database-side changes are required; all expedition data is local to the existing saved tree.

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

The browser checks expect the Vite server at `http://127.0.0.1:4173` and Playwright Chromium. They cover safe openings, complete wins, flagging, all nine modes (Nightfall fog adjacency and escalation, Custom sizing, the Riptide countdown, Contract objectives, Scan charges), the daily lock, the leaderboard name prompt, Blitz timeout, local statistics, mobile controls, preferences, and APK downloading.

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

**[FIREBASE-SETUP.md](FIREBASE-SETUP.md)** walks through all of this with screenshots-worth of
detail; the short version:

1. Create a free project at https://console.firebase.google.com, add a **Web app**, and enable **Firestore** (start in production mode).
2. Copy `firestore.rules` into the Firestore rules editor and publish.
3. Copy `.env.example` to `.env` in the project root and fill in the web app config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...   (optional)
```

Wins post automatically to the public board on the Leaderboard page; without a config the game stays fully local.
