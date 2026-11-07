# v1.5.0 interface and active-tool update

Selecting a node opens a focused encounter screen with a fade. Use Route overview to inspect the map again.
Starting a minefield fades back to the grid. Clearing it opens the route/loot UI directly; a mine hit still
shows the result and requires explicit Continue. The map remains visual, with Whole tree travel intact.

Active abilities live in the prominent dock beside the board, including focus mode. They are not toggles
or automatic start-of-board effects. Survey camp clues now have a separate dashed marker and are saved
as camp metadata, not `scanned` cells. A camp supplies its clues only once per stop; no retry farming.
On a mine-hit Continue, the affected board's active scans are cleared. Charges remain spent; there is
no automatic new activation. Other unfinished limbs' boards are not altered by this cleanup.

All shop prices increased: Breaker 80, Magnet 60, Dynamo 70, Pathfinder 60, Lantern 30, Totem 60, Ration 20,
Purse 70, Boots 75, Charm 70, Pouch Upgrade 85. Trader Charm's 20% discount still applies. Existing items,
carried coins, bank, drops, rewards and tree IDs are unchanged.

This is the approved design/core-fix release, not the larger content expansion. Still 11 item types and
3 phased bosses. No Firestore rules, indexes, new account or database migration.

## Previous unified mechanics (still apply except where superseded above)

# Unified Branch — v1.4.0

## One mode and preserved progress

Entering Branch opens the illustrated route map, not a second optional mode. Every open limb automatically has a saved route. Select an encounter, play or decide, claim any milestone reward, then move on. Entering a minefield closes the map; the existing Branch map button reopens it. Whole tree is the travel view. Defeating the last boss phase grows the next limbs; the map offers **Grow the next limb**.

Old tree IDs, descendants, progress and all existing expedition money/items survive. An unfinished old single-board limb is adopted without replacing its mines, reveals or flags (including flags placed before the first reveal). The save still uses `minefield-zen-v1` and version 1 with optional new fields. Existing played expedition boards are not rerolled to add variants. Do not uninstall or clear app data.

## Minefields and builds

- **Crystal seams:** after the safe first opening, up to three covered safe caches are marked with diamonds. Open one for 6 coins and a burst revealing nearby safe cells. Bursts can collect other caches in the same move. Paid cache slots cannot pay or burst again on retries.
- **Survey camp:** the first opening supplies up to five covered safe clues.
- **Bounty field:** clear within 24 reveal actions for +12 coins; finish with at least three correctly flagged mines for another +8. Optional goals never cause a loss. Abilities count as one reveal action; flags and Survey do not.
- **Long crossing:** wider rectangular grid; +12 coins for a clear within 24 reveal actions, with no timer.
- The initial root board is Crystal seams; other ordinary encounters vary deterministically. Variant previews match actual encounters. Board size/density and route length still grow with depth; boss rules remain separate from these variants.
- Milestone first clears (first board, danger route, last boss phase) offer up to three items or carried coins. No new encounter can start before the outstanding choice. Rewards auto-equip into a free appropriate slot. If all equipment is owned, later drafts offer consumable/refill rewards instead. Claims are one-time and saved.
- **11 item types:** the previous eight plus **Seam Breaker** (safe 3×3 patch, 3-clear recharge), **Treasure Magnet** (double cache coins), **Crystal Dynamo** (+1 Lantern charge per new cache). Magnet and Dynamo combine. Pathfinder opens three safe cells plus cascades; Lantern marks five exact safe clues per charge. Rations reduce both rechargeable ability cooldowns by one clear.
- **2 active + 3 passive slots.** Inventory is available throughout Branch. Equipping does not reset cooldowns or charges. Replaying paid boards does not recharge abilities or award money; Lantern refills can still be purchased.
- Events include trailkeepers (Lantern refill or coins), shrines (10 coins for a totem or free full ability recharge), and chests (15 safe coins or a deterministic 65% chance of 60 coins, otherwise losing up to 15 carried coins). Event gifts cannot reroll or pay twice.
- Routes have `5 + floor(depth / 2)` stops. Completing every boss phase clears a limb and unlocks its children. There is no three-life limit. Completed boards are compacted; the current board, kit, wallet, bank, pouches and one-time ledger remain local.

## Money, loss and recovery

Money is shared across your Branch limbs on this device. Shop purchases use carried money. At a bank shelter you can deposit all carried money or withdraw all banked money. Withdrawing makes it vulnerable again; deposit/withdraw actions are unavailable elsewhere and while a loss is awaiting Continue.

An unprotected failure draws an integer percentage uniformly from **10 through 100 inclusive**. The loss is `ceil(carried * percentage / 100)` whole coins. The notice says **You dropped some money!**, shows the loss and penalty roll, and confirms that the bank was untouched. With no carried money, the game says there was nothing to drop.

Each loss creates a pouch tied to the exact limb. Each pouch gets a **10% recovery chance** on the next return after a failed attempt. A successful roll automatically picks up that pouch, restores its exact coin amount and shows **You found your dropped money!** Pouches cannot be claimed twice. A failed roll leaves the pouch eligible for a later return after another failed attempt on that limb. Reopening the map, leaving/reentering within the same attempt, or reloading does not reroll it. A restart on the mine-hit screen does not apply another loss or recovery roll. Banked money is never part of a dropped pouch.

## Implemented bosses (3, not 50+)

Every boss announces its identity and full rule theme before combat. Every phase requires an explicit Start action and announces its current restrictions. Each phase uses a fresh board.

1. **The Thorn Warden** — phase one permits flags; phase two seals flags; phase three and later also seal chording. Totem protection can still mark the mine that struck it.
2. **The Mist Shepherd** — newly opened numbered clues can be fogged at 25%, then 50%, then 60%. Previously visible numbers are not retroactively hidden.
3. **The Copper Locksmith** — chording is sealed throughout; from phase two, the live flag budget is half the mine count, rounded down.

All use the same safe-opening protection and require every safe tile to be revealed. No unannounced timer or mandatory flag objective is added.

## Remaining agreed scope

The full roster of at least 50 announced boss twists remains unfinished. This update adds real minefield variants, equipment combinations and events but does not claim they are additional bosses. Further content and balancing remain possible. Classic now has optional challenges and smaller standard difficulties; Branch board generation still grows independently with depth.

## Validation and limits

Engine tests cover real full-board and phased-boss completion, root/child progression, completed-ancestor replay, immutable state, both penalty endpoints, protected banking, totems, exact recovery threshold, no map/reload rerolls, shops, upgrades, equipment, first-clear/event anti-farming and persistence. Browser tests cover the actual route controls, buying/equipping/using Survey, banking, phase announcements, money-drop notice, visible hit, restart-safe pending loss, Continue, and mobile inventory.

Existing engine, mode, Daily, Riptide, Scan, public-score mock, volume, and browser persistence regressions are retained. Shell persistence checks simulate browser/Android/Tauri bridges; they are not native device lifecycle tests. New native installers and actual-device updates still require the installer workflow and device checks. Live Firebase and audible hardware output are not validated by these tests.
