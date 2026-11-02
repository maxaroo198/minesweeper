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

# Still to come (your call)

* **Nightfall** — hidden numbers, escalating, 12 × 12, with a *Blackout* difficulty at 1-in-3.
* **New board sizes** — medium 12 × 12, hard 20 × 20 (also shrinks daily Hard to 400 tiles).
* **Custom** difficulty with its own leaderboard.
* **The other new mode** — waiting on your answers.
