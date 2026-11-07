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

## v1.2.0 balance and reliability update

- Compact horizontal game-mode bar instead of the large mode-card sidebar.
- Nightfall/Blackout gain 5 percentage points every 2 seconds; caps 70%/100%.
- Scan starts with 6 charges. Known clues cost 2; unknowns cost 1. Mines always read ?, safe tiles have 40% unknown chance, and the final charge always returns ?. Scans cannot be rerolled and charge rewards cannot be farmed by flag toggling.
- Riptide anchors correctly flagged mines, preserves open tiles, and displays explicit zero clues after tides.
- Contract expands to 24 objectives with tighter deadlines and harder combinations.
- Branch shows the hit mine and waits for Continue before fallback. Existing progress is retained.
- Daily completion dates persist independently of the latest-200 game history.
- Blitz public query reuses Classic's per-difficulty index; visible errors and Retry replace silent empty results.
- Audio waits for context startup; Linux AppImage bundles GStreamer media support. Test sound in Preferences. CachyOS audible output still needs verification on the actual machine.

The nested Branch expeditions, shops, active/passive items and 50 boss twists are planned separately; they are NOT part of this update.

Nine game modes, offline play, orange flags, and local stats and Branch progress.

- Android: `minefield-android.apk` — Android 8+, independently signed, not a Play Store app.
- Windows: `minefield-windows-x64-setup.exe` — 64-bit Windows 10/11; unsigned publisher, WebView2 required (installer can download the runtime).
- Linux: `.AppImage` (mark executable; may need FUSE) or `.deb` (Debian/Ubuntu-compatible x86_64).
- Web: `index.html` — deploy to an HTTPS static host for browser play.
- Source: `minefield-source-v1.2.0.zip` (also available through GitHub’s source archives).
- Checksums: `SHA256SUMS.txt`.

Stats, settings, and Branch progress save **separately per device/app profile**. No account or cloud sync. Browser saves do not transfer into the installed apps. Do not uninstall or clear app data when updating. Android updates require the same package ID and signing certificate. Use the same Linux package type/profile when updating. The public leaderboard needs internet; gameplay does not.

Keep platform security protections enabled. Install only if you trust the release. Windows and Linux binaries are not code-signed; Android uses the maintainer's private signing certificate. Verify checksums to detect download corruption (checksums alone do not prove publisher identity).
