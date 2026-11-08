## v1.7.1 — Windows module-resolution build fix

- Fixes the Windows native-web build failure: `ExtraModes.tsx` and `extraModes.ts` differed only by case in their extensionless module names. Windows resolved the UI import to the engine file, which has no default export. The UI is now `AdditionalModesPanel.tsx`; the engine remains `extraModes.ts`.
- Adds a dependency-free module-path regression check, including the exact failing filename pair, to web builds, Tauri's native-web prebuild and installer verification. It checks both filesystem and tracked paths so case-insensitive checkouts cannot hide collisions.
- No gameplay/UI changes: Logic stays removed. Puzzle, Survival and Branch changes remain. Native app identifiers and signing configuration are unchanged; the `.app` identifier warning is not the build failure.
- Version 1.7.1 / Android code 13, using a fresh release tag rather than moving v1.7.0. No Firestore rules, indexes, database changes or Firebase deployment required.
- Validated TypeScript, the module-name regression check, extra-mode/banking engine tests, normal Vite build and the actual Tauri native-web prebuild entry point on Linux. Windows Rust/NSIS compilation and device installation still require the GitHub workflow; they were not run in the sandbox.

## v1.7.0 — Branch navigation, amount banking and two new modes

- Keeps the dark charcoal/orange Branch map visible alongside a dedicated actions rail rather than replacing the map with encounter screens. Inside limb / Full tree navigation is explicit; both views expose the current kit/actions. Mobile uses a collapsible below-map actions sheet. Backpack, equipment, loot, shop and bank actions remain available; no systems removed.
- New routes start at nine stops, growing further with depth, with more optional minefield/danger/event/shop/bank pairs. Existing saved routes are not resized. Boss gate and the guaranteed bank shelter are retained, along with existing root/deeper failure and Totem behavior.
- Banks support positive whole-number amounts for deposits and withdrawals, quick 25/50/100/half/max selections, and all-balance actions. Invalid or over-balance requests move no gold. Banked gold remains safe.
- Adds Puzzle challenges: six fixed seeded 7×7 positions with flag-free, mark-all-mines, no-chording, 24-action, three-marker and final-clear goals. Each starting board is verified deduction-solvable. Includes progress, retries and explanatory hints.
- Adds Survival: three lives, rising mine counts/board sizes, explicit visible mine hit before Continue, stage progression and persistent current run. A failed stage costs one life and retries on a fresh board at that stage.
- All eight previous modes remain. The two new modes have independent local resumable saves and their own progress display; they do not write Classic/Blitz rankings or the older shared statistics. Existing Branch saves and equipment are preserved. Fixes mine-hit acknowledgement being covered by the sticky tool dock.
- v1.7.0 / Android code 12, same app IDs/signing configuration. No Firestore rules, indexes, database changes or Firebase deployment required. Native builds and real-device upgrade/lifecycle checks remain outside sandbox validation. The large future item/boss roster is not included.


## v1.6.0 — Six-space backpack, fresh retries and 19 trail events

- Adds an openable backpack with six **individual** physical item spaces, separate from two active and three passive equipment slots. Full-capacity equipment swaps work without temporarily needing a seventh space. Charges and permanent upgrades use no spaces.
- Hover active/passive abilities for descriptions, or tap their separate information button on mobile. Reading a description never activates a tool. Backpack descriptions stay readable alongside each item.
- At banks, permanently discard individual stored items after confirmation. Full loot, shop and event receipts can permanently replace explicitly selected backpack items anywhere. Transactions are all-or-nothing: invalid swaps or insufficient capacity spend no money, consume no event costs and retain outstanding loot. Old excess inventory is preserved in legacy bank storage, not deleted.
- Any unprotected root failure resets the entire tree on explicit Continue, **even after deeper progress**. Bank, remaining carried coins after the existing penalty, equipment, backpack and charges survive. Pouches on the retired tree cannot be recovered in a new tree.
- Unprotected deeper failures preserve the tree/fallback but regenerate that failed limb's route, choices, encounters and boss when it becomes playable and is retried. Reopened ancestor replays are fresh too. Generation is persisted; reopening/reloading cannot reroll it. Same-tree pouches retain once-per-return 10% recovery. One-time rewards are scoped to each generated route, not permanently to a limb.
- Return Totems still consume one totem, protect carried money, preserve the board/route/tree and flag the hit after explicit Continue. Previously spent active scans do not reappear; no tool is automatically reactivated.
- Expands trail events from 3 to 19 with courier parcels/delivery, supplied clues, flag/chord restrictions, optional action/flag/chord/tool-free clear goals, new-clue fog, targeted cooldown repair, ration-for-totem trade, supply purchases, tool tuning, a next-purchase voucher and an optional-route change. All event offers disclose effects/costs; a free move-on option prevents unaffordable offers from trapping a run. Boss gates and the guaranteed bank cannot be removed.
- Keeps the approved charcoal/orange interface, all eight modes and per-device local saves. Touch controls, nested-modal focus/Escape and mobile overflow have browser coverage. Android version 1.6.0/code 11, same package/signing configuration. Actual native builds and device upgrades remain untested here.
- No Firestore rules, indexes, database migrations or Firebase deployment required. No push or release by the assistant. This is the backpack/retry/event update, **not the full item/boss expansion**: 11 equipment/consumable/upgrade types plus the new courier parcel; 3 bosses remain.

## v1.5.0 — Approved dark UI, Classic challenges and explicit tools

- Ships the approved modern/familiar Minesweeper style across the real app. Retains sidebar, orange flags and compact mode bar; all eight mode buttons fit mobile screens. Dark is the default when no theme is saved; existing preferences remain valid.
- Moves Contract's optional objectives, bonus badges, rescue and seeded code replay into Classic. Challenge runs retain stars in local history and are excluded from standard local/public leaderboards. Old Contract records remain readable.
- Medium becomes 11×11/18 and Hard 16×16/42 in standard difficulty modes. Daily follows Medium only. Nightfall stays 12×12 as previously required, with Medium 18 and Hard 26 mines. Custom choices and existing Branch board snapshots are not resized.
- Adds a readable clear pulse/cascade respecting reduced motion. Branch nodes fade into focused shop/event/encounter views; clears reopen the route or loot UI automatically. Visible mine hits and explicit Continue remain unchanged.
- Moves active tools into a prominent board-side dock, sticky in focus mode. Separates one-time camp supplies from Lantern scan rendering. Protected and unprotected mine-hit Continue/restarts do not silently restore active scans or spend charges.
- Raises all 11 shop prices; no reset of wallet, bank, inventory, tree or dropped money. Seam Breaker 80, Magnet 60, Dynamo 70, Pathfinder 60, Lantern 30, Totem 60, Ration 20, Purse 70, Boots 75, Charm 70, Pouch Upgrade 85 (before discounts).
- v1.5.0 / Android code 10; same signing and app identifiers. No Firestore rules, indexes or database-side changes. Native workflow and real-device checks still required.
- Scope: approved design/core fixes, not the larger item/boss expansion. Still 11 item types and 3 phased bosses; 50+ boss roster not complete.

## v1.4.0 — One Branch, builds and livelier minefields

- Unifies ordinary Branch and expeditions into one map → encounter → loot → next path flow. Removes opt-in/Begin and the legacy plain-board bypass. All open limbs use routes automatically; unfinished legacy grids retain mines, reveals, flags, IDs and descendants.
- Adds crystal-cache safe bursts, supplied-clue camps, optional clear/flag bounties and rectangular crossings, with previews and live optional-goal progress.
- Adds one-time milestone loot drafts with auto-equipping into free slots, plus Seam Breaker, Treasure Magnet and Crystal Dynamo. Strengthens Pathfinder to three safe cells and Survey to five clues. Preserves two active/three passive slots and saved cooldowns/charges.
- Adds protection/recharge shrine and deterministic risky-chest events alongside trailkeepers. Cache, board, event and loot ledgers prevent retry farming.
- Retains visible mine-hit acknowledgement, restart-safe Continue, earlier-limb fallback, safe banking, 10–100% carried-money loss and once-per-attempt 10% pouch recovery.
- Classic and all other modes are unchanged. Three existing phased bosses retained; the 50+ boss roster remains unfinished.
- v1.4.0 / Android code 9. No Firestore rules, indexes or database-side changes. Build new native packages with the existing signing key and app IDs; do not uninstall/clear saves.

## v1.3.1 — Visual Branch atlas and post-failure travel fix

- Replaces the text route strip with an original illustrated node map, opened by the existing Branch map icon. Hexagonal custom vector icons, connected dashed paths, highlighted reachable nodes, saved choices and completed paths; future nodes cannot skip progression.
- Shops, events, banking, boss announcements and route selection live in the map. The board keeps a compact wallet, inventory and ability HUD. Whole tree view remains available from the same map.
- Fixes the Drive video’s failure flow: choosing See the board no longer hides the only Continue action. A persistent button remains above the board, and the map has its own explicit recovery action. After acknowledging the hit, the saved open sibling/fallback is playable.
- Keyboard node selection, focus return, modal focus containment, zoom and mobile scroll support. Original inline vector art; no external assets or fonts required for icons.
- Existing saved routes, tree IDs, inventory, bank, dropped pouches and reward ledgers are preserved. No Firestore rules, indexes or database changes required. The 50+ boss roster remains unfinished (3 implemented bosses retained).
- v1.3.1 / Android code 8. Build new native packages; keep the same signing key, identifiers and app data.

## v1.3.0 — Branch expeditions, first playable pass

- Optional saved mini-adventures inside open Branch limbs. Choose **Begin expedition in this limb**; existing trees and one-board limbs remain intact.
- Routes grow with depth and include minefields, danger choices, shops, events, bank shelters and phased bosses. Boss completion opens the next limbs.
- Shared carried money and a protected bank. Unprotected failure drops a random 10–100% of carried coins with a visible money-drop message. Returning after a failed attempt has a 10% chance per pouch to recover its money; no reload/map rerolls.
- Starter Pathfinder and Return Totem; 8 item types spanning consumables, active/passive abilities and upgrades. Inventory anytime in Branch; 2 active and 3 passive slots. Abilities mix first-clear cooldowns and limited charges. Events can grant abilities.
- Totems preserve the board and money after a visible mine hit. No generic three-life system. First-clear/event reward tracking prevents replay farming.
- **Only 3 implemented bosses in this pass.** The agreed 50+ announced twist roster remains for a later expansion; this foundation does not claim it is finished.
- Preserves Round 7 fixes and the louder saved volume slider. No Firestore rules, indexes or database changes required.
- v1.3.0 / Android code 7. Keep the same app identities, signing key and device data when updating. Native binaries require rebuilding and real-device testing.

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
