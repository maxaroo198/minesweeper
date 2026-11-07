## v1.2.1 — Branch progression, leaderboards and volume

- Branch re-clears reopen existing failed children instead of leaving a dead end. Transitions are immutable and tied to the moved board; one failed limb does not close its sibling. Older dead-end trees are repaired in place without wiping route IDs or saved progress. The hit mine still stays visible until Continue.
- Louder game audio with a saved 0–100% Preferences slider, defaulting to 50% on new and existing installs. Mute stays separate. The 50% default has about 2.4× the old signal amplitude; actual loudness depends on system output.
- Riptide hides zero labels only; numbered clues and anchored flagged mines are unchanged.
- Daily is Medium only, on every twist day.
- Local/public leaderboards are limited to Classic and Blitz; other modes keep their statistics.
- Public scores retain failed wins in a restart-safe retry queue, show server error details, use stable game IDs to prevent duplicate retries, and display the latest server-confirmed submission separately from the fastest 20. Sub-second wins meet the existing 1-second Firestore minimum.
- No new Firestore rules, indexes, or database migration required. No live Firebase verification performed; if the deployed project rejects a post, the game now shows the actual error and keeps the win to retry.
- Version 1.2.1 / Android code 6. Keep the existing app identifiers, signing key, and app data when updating. No shops or larger Branch expansion included.

# Round 6 — balance, compact modes and reliability (v1.2.0)

- Nightfall/Blackout: +5 percentage points every 2 seconds; caps 70% and 100%.
- Scan: six starting charges, 40% safe-tile uncertainty, mines always unknown, known=2 / unknown=1, final charge always unknown. No rescans, negative charges or repeat flag rewards.
- Riptide: anchor correctly flagged mines and display zero clues on open tiles. All rows/columns still shift every 8 seconds; mine count and open-tile safety preserved.
- Contract: 24 objectives, shorter time targets, harder combined goals, compatibility checks.
- Horizontal game-mode bar replaces the large cards column; daily details stay available.
- Branch: keep exploded mine/lost board until Continue; root failures reopen a playable root. Preserve existing trees.
- Daily streak dates migrate into independent persistent storage so other games cannot evict them. Previously discarded history cannot be recovered.
- Blitz public board: exact merged top 20 across per-difficulty indexed queries, visible errors/Retry and post-completion refresh. Existing Classic index reused; no rule/schema changes. Live project still needs user verification.
- Audio: recreate closed contexts, resume before tones, repeat gesture unlock and Test sound. Bundle AppImage media framework; explicit Debian runtime dependencies. Actual CachyOS sound remains to be verified in a rebuilt AppImage.
- Reduce timer-driven renders, coalesce resize measurements, remove tile-number movement and clear tide feedback after it plays.
- Native versions aligned at 1.2.0; Android versionCode 5. Keep existing signing key and package identities.

Nested Branch expeditions, shops, inventory/abilities, procedural events and 50+ phased boss twists remain the next project phase, not implemented here.

# Round 5 — native release pipeline

- GitHub Actions matrix: Android APK, Windows NSIS, Linux AppImage and Debian packages; verify tests, all-platform release gate, stable asset names and checksums.
- Persistent Android signing secrets required for release builds; no disposable CI key. Generated keys, env backups and native outputs are git-ignored.
- Repaired Tauri build entrypoints, generated icons, build.rs, explicit native detection and pinned Rust dependency lockfile.
- Native app versions aligned at 1.1.0; Android versionCode 4. Stable package IDs/origins retained for local saves.
- Download apps dialog links to published installers instead of stale embedded APK bytes. No recommendation to uninstall apps or disable platform security.
- Android keeps DOM storage, blocks external navigation inside the bridge-enabled WebView, and explicitly disables cloud backup (separate local saves requested).
- Persistence tests: actual Classic win and Branch reveals/flags survive full Chromium process restarts in browser, Android-bridge and Tauri-bridge simulations. Actual device installation/lifecycle testing is still required.
- No changes to Firestore rules or indexes. GitHub build variables carry the existing public Firebase web configuration.

# Round 4 — whole-board tides and replayable contracts

- Riptide now shifts every row, then every column, every eight seconds. Open squares stay safe; mine count stays fixed and clues update.
- Contract: twelve objectives, compatible main deals, two optional bonus badges, safe-tile rescue (one use, minus one final star), replay codes with deterministic boards (same difficulty and first click).
- Contract objectives stay inside the game panel in focus/fullscreen mode.
- Accuracy remembers wrong flags even after removal; mined corners can be secured by flagging them.
- Nightfall and Blackout allow adjacent hidden clues. Blackout grows to 100%, not the old two-thirds cap. Nightfall retains its 50% cap.
- Firebase setup now includes both indexes, deployment settings, troubleshooting and security caveats. Failed requests log useful console errors.

# What changed

Five things, all driven by the screencast and the request list.

## 1. Flags are always orange

**The bug:** every tile carries its number class (`number-1` … `number-8`) whether or not it is
covered, and each of those classes sets `color: … !important`. A flag on a safe square therefore
inherited the colour of the number underneath it (blue for 1, grey for 2, …), while a flag on a
real mine — mines have `adjacent: 0`, so no colour class — stayed brand orange. Every flag was
quietly announcing whether it was right.

**The fix:** the flag colour is now pinned on the tile *and* the marker in `src/index.css`, so all
flags render `var(--orange)` (`#e97848` light, `#f0885a` dark) on the same warm tile. Verified by
flagging a whole easy board and asserting every flag reports the identical computed colour and
background — 10 flags, 1 unique style, on mines and safe squares alike.

## 2. Blitz goes down to 15 seconds

`BLITZ_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 300]` now feeds the timer picker, with `blitzLabel()`
for the 15s / 45s / 1.5 min wording. The timeout, the progress bar and the "time's up" copy all read
the chosen limit instead of the old `BLITZ_SECONDS` constant.

## 3. Perfect squares, and no more scrolling

* `DIFFICULTIES.hard` is now 30 × 30 (was 16 × 30), so the boards are 9 × 9, 16 × 16 and 30 × 30.
* The old board pinned tiles at 25px and scrolled inside a 430px window — that is the scrolling in
  the screencast. `useBoardFit()` now measures the space the board actually has (width *and* the
  space left below it, measured against the document so scrolling never resizes the grid) and sizes
  square tiles to fit. Hard caps at 46px, floors at 10px, and falls back to 17px tiles rather than
  an untappable 9px grid if a 30 × 30 genuinely cannot fit a short window.
* Focus mode (the ⤢ button) now hides the page heading too, so a 30 × 30 board fills the window.

Measured at 1440 × 900: easy 376px, medium 375px, hard 637px — every grid perfectly square, zero
inner scrolling (`scrollHeight - clientHeight === 0`).

## 4. Sidebar mode switcher on hover

Hovering **Let's play** on desktop opens a flyout with Classic, Blitz, Zen, then a divider and
**Daily challenge** underneath (with today's puzzle number and twist). Keyboard users get it via
`:focus-within`; it is hidden entirely below 960px and in the native Android shell.

## 5. The daily challenge, spiced up

* **Numbered puzzles** — "Daily #671" instead of a raw date.
* **A rotating twist**, seeded by the day and identical for every player:
  1. **Classic rules** — a clean, honest board
  2. **Packed** — +33% mines
  3. **Flag-free** — flags are switched off entirely (the toggle is replaced with "No flags today")
  4. **Sprint** — two minutes on the clock, using the same timer path as Blitz
* **A daily hub** in the side column: puzzle number seal, today's twist and what it means, a live
  countdown to the next puzzle (midnight UTC), a seven-day win/loss strip, and day streak / best
  daily / total solved.
* **A spoiler-free share grid** — `🟧🟧🟧🟧🟧🟧🟧🟧⬜⬜ 82%`, puzzle number, twist, time and streak.
* **Any board size** — the difficulty tabs now work on the daily too; each size is its own seeded
  puzzle, so nobody can compare an easy and a hard. It defaults to 16 × 16.

## Verification

```sh
npx tsc --noEmit
node scripts/test-engine.mjs     # 240 randomized games (on 900-tile hard boards now) + twist checks
node scripts/test-browser.mjs    # needs the preview server on :4173
npm run build
```

`scripts/test-engine.mjs` gained daily-twist coverage (mine scaling, determinism, the four-day
rotation). `scripts/test-browser.mjs` gained: square boards at all three sizes, no inner scrolling,
byte-identical flag colours, a 15-second Blitz option, and the hover flyout — and its hard-board
count moved from 480 to 900.

`scripts/test-offline.mjs`, `test-sensory.mjs` and `test-source.mjs` still need build artifacts that
are not in this checkout (`.android-build/`, a server on :4181, `public/minefield-source-v1.0.2.zip`).

## Not touched

`src/apkData.ts` and `src/sourceData.ts` embed the released v1.0.2 APK and source ZIP as base64, and
`android/src/app/minefield/MainActivity.java` wraps an asset copy of the built site. Those are
prebuilt artifacts — regenerating them needs the Android SDK via `scripts/build-android.py`. Until
then the "Download APK" button still ships the old build, and the version string stays 1.0.2 on
purpose so the download does not misreport itself.


---

# Round 2

## Public leaderboard, actually usable

* **`FIREBASE-SETUP.md`** — a step-by-step console walkthrough (project → Firestore → web app →
  rules → `.env` → verify), including the composite index Firestore asks for and what each console
  error means.
* **`.env.example`** — copy to `.env`, fill three values.
* `firestore.rules` updated for the new modes and difficulties so you only publish once.
* The Leaderboard page now always shows the public section: when Firebase is missing it explains
  itself and points at the setup guide instead of silently vanishing.

## A name on every win

Every **Classic** and **Blitz** win now opens a name field in the win card (Enter also saves).
With Firebase configured, **Post** sends the score; without it, **Save name** stores it on the
device and says so. The name is remembered and pre-filled next time.

## Blitz board: time and difficulty together

The public Blitz board queries every difficulty at once and shows a **DIFFICULTY** column beside
each player's time, with a `YOU` marker on your own rows.

## Zen → Branch

Renamed everywhere the player can see it: mode card, nav flyout, leaderboard tabs, stat rows,
page copy, the branch-map dialog ("BRANCH · YOUR TREE SO FAR"), and each notification
("Square cleared — the branch grows. New limbs unlocked."). The module is now `src/branch.ts` with
`BranchWorld` / `BranchArea` types and the map component is `BranchMap`.

Two identifiers were deliberately left alone so existing saves keep working: the `Mode` value is
still `'zen'` in stored records, and the world is still saved under `minefield-zen-v1`.

## Daily challenge locks

The daily is **locked to Hard** every day. On twist days that run on a clock (**Sprint**) the tabs
unlock **Medium or Hard** — Medium becomes the default, because a 30 × 30 board against a timer is
not a puzzle, it's a panic. The hub states the lock, and disabled tabs explain themselves on hover.

## Tests

The browser suite now covers the daily lock (which tabs are enabled, and that the board matches),
the name prompt on a win, the remembered name, the local board, and the un-configured public board.
Mine placement in the suite is now reproducible from Node via a constant `Math.random`, so a
classic board can be solved move-by-move in CI without guessing.

---

# Round 3

## New board sizes

Medium is now **12 × 12 with 24 mines** and Hard is **20 × 20 with 70 mines**, chosen so density
still climbs gently with the size (12% → 17% → 18%) instead of turning Hard into a wall of mines.
Daily Hard follows along at 400 tiles.

## Nightfall (and Blackout)

A 12 × 12 board where the numbers are not guaranteed.

* Base chance a freshly opened square shows nothing: **1 in 10**, rising **5% every five seconds**,
  capped at a coin flip.
* **Two fogged squares never touch.** The mist skips any square with a fogged neighbour, so there is
  always honest information on screen.
* Numbers you have already earned never come back, and a fogged square cannot be chorded — chording
  is a promise you know what the number says.
* Empty squares are never fogged; they show nothing anyway, and fogging them would stall the board.
* **Blackout** sits beside Easy/Medium/Hard in Nightfall's difficulty row: same 12 × 12 board, base
  chance **1 in 3**, capped at two in three.
* The board header shows the live hiding percentage so you can feel it climbing.

## Custom

A size picker instead of fixed difficulties: width, height and mine count with sliders from 5 to 40
squares a side, three presets (Tiny, Wide, Monster), and a running summary of squares, density and
tiles left to clear. The size is remembered on the device, custom boards are never square by
accident, and every result lands on one shared Custom leaderboard that shows each board's dimensions.

## Three more modes

* **Riptide** — every fifteen seconds the tide slides one row and one column, carrying the mines with
  it and recounting every number. Mines only ever move among covered squares, so an opened square can
  never become a mine; your deductions, however, have a shelf life. The header counts down to the
  next tide and the squares that moved flash.
* **Contract** — three objectives dealt per board from a pool of five (beat a time limit, win with no
  flags, win without chording, never flag a safe square, open all four corners). Each kept objective
  is a star, shown live in the side panel and in the header, and the Contract leaderboard sorts by
  stars before time.
* **Scan** — three charges to start. Arm Scan, tap a covered square, and it shows the true mine count
  around that square without opening it. Flag a real mine and you earn a charge back; wrong flags
  earn nothing. Untimed.

## Under the hood

* `Cell` gained `hidden` and `scanned`; `BoardState` gained `chords`, `flagsPlaced`, `charges`, `scans`,
  `objectives` and an optional `custom` size — all saved with the record where it matters.
* New modules: `src/contract.ts` (objective pool, dealing, live rating, stars) and `src/riptide.ts`
  (the drift, which provably preserves the mine count and never mines an open square).
* `MODE_DIFFICULTIES` now decides which rungs a mode offers, so Blackout exists inside Nightfall and
  nowhere else.
* The engine suite covers fog adjacency and escalation, tide invariants (25 tides), scan charges,
  contract dealing and stars, custom clamping, and the new sizes. The browser suite plays all nine
  modes, including a fog-only page that verifies no two fogged squares touch and that the hiding
  chance rises on the clock.
* Reveal ripples are now cleared after they play, so no stale outline is left on the board.
