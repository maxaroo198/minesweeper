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

- **Classic:** Perfect squares — Easy (9 × 9, 10 mines), Medium (11 × 11, 18 mines), and Hard (16 × 16, 42 mines). Optional challenges add objectives without replacing normal Classic.
- **Blitz:** A race against the clock, from 15 seconds to 5 minutes, on all three board sizes.
- **Branch:** One saved adventure tree: visual route → encounter → loot → next path. Crystal caches,
  optional minefield bounties, equipment combinations, events and phased bosses; no separate opt-in mode.
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
- **Classic challenges (formerly Contract):** Optional objectives from the existing pool, bonus badges,
  one-use rescue and seeded code replay. Toggle them inside Classic; these runs stay in local history,
  separate from normal Classic leaderboards. Old Contract history remains readable.
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

## Comfortable play and Custom freedom — v1.8.0

**Focus/fullscreen** now starts at **44px tiles**, not a shrunken whole-board overview. Use **+ / −**,
**Fit board**, **Comfort size**, directional pan buttons and the top **Flagging / Revealing** switch.
Swipe/scroll inside the board to reach every row and column. Normal view retains at least 24px tiles.
Dragging does not reveal or long-press flag a square; native touch context menus cannot double-toggle flags.

**Custom** has numeric width/height/mine fields with no fixed game size or mine-density cap. Positive
whole-number dimensions, zero or more mines and **at least one safe cell** are required. Counts must be
exactly representable by the browser. Actual memory/rendering limits still apply: huge boards can
freeze or exhaust device memory, and large requests ask for confirmation. High-density boards now
place the exact requested mine count while keeping the clicked opening safe, including one-safe-cell wins.

Every **Branch item** has a bundled vector icon. Branch node interaction uses native HTML hit targets,
not nested SVG paint hit-testing. Select a node to bring its actions into view or return to its saved
minefield. Existing loss/loot locks remain intentional. These interactions are regression tested with
Linux/Windows/Android browser profiles, not native installed-device tests.

Version **1.8.0 / Android code 14**. Logic stays removed. Existing local saves, signing keys and IDs remain.
**No Firestore rules, indexes, database changes or Firebase deployment required.**

## Windows build fix — v1.7.1

Renames the new-mode UI to `AdditionalModesPanel.tsx` to avoid Windows resolving `ExtraModes`
to the lowercase `extraModes.ts` engine. Both web and native-web builds now reject ambiguous
case-insensitive module names before compilation. Logic remains removed; Puzzle and Survival remain.
Use tag **v1.7.1** (Android code 13), leaving the failed v1.7.0 tag alone. Same app IDs and signing keys.
No Firestore rules, indexes, database changes or Firebase deployment required.

## Navigation and new modes — v1.7.0

Branch now keeps its map visible with a dedicated actions rail, clear **Inside limb / Full tree**
controls, and a collapsible actions sheet on mobile. New routes start at **nine stops**, with more
optional paths; existing saved routes stay their original size. Banks let you **enter a gold amount**
for deposits or withdrawals, choose quick amounts, or transfer everything.

Two additional playable modes appear directly below the existing mode bar:
- **Puzzle challenges:** six seeded 7×7 puzzles with distinct goals, saved completion and retries.
- **Survival:** three lives, progressively harder stages, visible mine hits and explicit Continue.

Their saves are separate from each other and from your existing game. Close and reopen to resume.
They show their own progress and do not submit public scores or write the old shared stats list.
All eight existing modes remain. No Firestore rules, indexes, database migration or Firebase deploy.
Android v1.7.0/code 12; build with the existing signing key and install over the old app to retain saves.

## Backpack and fresh routes — v1.6.0

Branch now has a **six-space backpack** (each individual stored item counts), separate **2 active / 3
passive** equipment slots, full-capacity equipment swaps, bank discards and explicit full-loot
replacement. Hover a tool/passive or tap its separate information button for its description.
Old excess items are preserved in legacy bank storage; nothing is silently deleted.

An unprotected **root failure resets the entire tree on Continue, even after deeper progress**.
Deeper failures retain the tree/fallback and regenerate the failed route on retry. Totems preserve the
board/route and protect coins. Remaining wallet, bank and kit survive either reset. Fresh routes earn
fresh one-time rewards; reloads do not reroll routes. Same-tree pouch recovery remains 10% once per
eligible return. Retired-root pouches cannot recover into a different tree.

**19 events** now include parcel delivery, tool tuning, cooldown repair, bank/route choices, supplied
clues, optional clear goals and temporary flag/chord/fog restrictions—not just renamed coin gambles.
There is always a free move-on choice. See **BRANCH-EXPEDITIONS.md** for exact effects and capacity rules.
This is not the full boss/item expansion: **3 bosses, 11 existing item types plus courier parcel**.
Android v1.6.0/code 11; all eight modes and the approved style retained. **No Firestore rules, indexes,
database migration or Firebase deployment required.** Actual native upgrade/device checks still needed.

## Approved dark redesign — v1.5.0

The approved familiar layout is now in the real app: charcoal panels, orange accents, compact counters,
crisp tiles, all eight modes visible on mobile, and the existing sidebar/navigation. New installs default
 to dark; an existing explicit light/dark preference is respected. The theme button and saved preferences remain.

Medium is **11×11 / 18 mines** and Hard **16×16 / 42 mines** across the standard difficulty modes.
Daily is Medium-only. Nightfall retains its specifically requested **12×12** shape, with easier Medium
(18 mines) and Hard (26 mines); fog timing/caps are unchanged. Custom sizes and saved Branch encounters
are not resized. Existing records and scores are retained, not erased.

Classic has optional challenges instead of a separate Contract button. Clear feedback now uses a crisp
staggered pulse; reduce-motion preferences still disable it. Branch nodes open focused encounter screens
with fades; completed minefields open route/loot UI automatically. Losses still require explicit Continue.
The active-tool dock stays beside the board in focus mode. Camp clues are labeled separately from active
Lantern scans, paid camp supplies do not reappear on retries, and active scans clear on mine-hit Continue
without consuming another charge. All shop item prices have increased; existing wallets/items are retained.

This release implements the approved design and these core changes, **not the larger content expansion**.
The roster remains **11 item types and 3 bosses**. No new Firestore rules, indexes or database-side changes.

## Unified Branch (v1.4.0 historical overview; v1.6 retry rules above supersede it)

Enter **Branch** to open its visual route map. Choose an encounter, play its minefield or make its decision, claim any milestone loot, then choose the next path. Finish the phased boss to grow harder limbs. The existing Branch map button reopens the same map; **Whole tree** lets you revisit open limbs. There is no separate “Begin adventure” switch or plain-board bypass.

Old tree IDs and progress remain. An unfinished legacy minefield is adopted with its mines, reveals and flags intact. New routes convert automatically. Your starter kit includes Pathfinder and a Return Totem; inventory stays available throughout Branch with **2 active + 3 passive** slots.

Ordinary minefields now include **Crystal seams** (safe cache bursts), **Survey camps** (supplied safe clues), **Bounty fields** (optional swift-clear/correct-flag bonuses), and rectangular **Long crossings**. Milestone clears offer items or coins. Treasure Magnet doubles cache coins; Crystal Dynamo turns caches into Lantern charges; Seam Breaker opens a safe patch. Pathfinder opens three safe cells and Survey marks five safe clues. Trails also offer shops, bank shelters and three event types with protection, recharge or risk/reward choices.

Unprotected failure drops **10–100% of carried coins**, never banked coins. Pouches retain the same once-per-attempt **10%** recovery chance in their original limb. You see the mine hit before explicitly continuing; that Continue remains available after **See the board** and after restarting. First-clear rewards and caches cannot be farmed on retries.

**Classic now offers optional challenges and smaller difficulties.** There are **3 phased bosses and 11 item types**; the previously discussed 50+ boss roster is still unfinished. See **BRANCH-EXPEDITIONS.md** for mechanics and limits. **No Firestore rules, indexes, or database-side changes are required.** All Branch data stays in the existing local save; do not uninstall or clear app data to update.

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

The browser checks expect the Vite server at `http://127.0.0.1:4173` and Playwright Chromium. They cover safe openings, complete wins, flagging, all eight modes (Nightfall fog adjacency and escalation, Custom sizing, the Riptide countdown, optional Classic objectives, Scan charges), the daily lock, the leaderboard name prompt, Blitz timeout, local statistics, mobile controls, preferences, and APK downloading.

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
