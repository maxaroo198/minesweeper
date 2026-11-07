# Branch expeditions — first playable pass, v1.3.0

## Status and entry

This is a playable foundation, not the complete agreed Branch expansion. Enter Branch and an open limb, then choose **Begin expedition in this limb**. Existing trees and old one-board limbs are not automatically converted. Converting an unfinished one-board limb asks for confirmation. Converting does not remove the area, its IDs, or any descendants.

Finished encounters discard full cell snapshots; completed routes keep a compact boss-board trophy to reduce save growth. The current board, route, carried coins, bank, equipment, charges, cooldown, boss phases, dropped pouches and one-time reward ledger are saved inside the existing `minefield-zen-v1` world. No account, transfer, cloud sync, Firestore changes, or new storage origin is used. Legacy worlds without expedition data remain valid. Do not uninstall or clear app data to update.

## What this pass implements

- A saved mini-adventure per opted-in limb. Route length is `5 + floor(depth / 2)` stops. Routes offer boards, danger paths, shops, events, a bank shelter and a boss gate. Choices are retained on retry.
- Board width and height grow from 9 toward 20 with depth; density increases toward 26%, with additional danger and boss-phase modifiers. Bosses gain another phase every four depths, so progression does not stop at the maximum board size.
- Completing every boss phase clears the limb and unlocks its children on the existing endless tree. Children can each become their own expedition. No generic three-life system.
- A visible mine hit and explicit Continue, including after a restart. A Return Totem consumes one item, preserves money and the pre-hit board, and flags the mine. Without protection the limb locks, and the existing earlier-area fallback remains. A completed expedition ancestor reopened by exhausted children becomes replayable, retaining its reward ledger.
- Eight item types: Pathfinder, Survey Lantern, Return Totem, Trail Ration, Lucky Purse, Trail Boots, Trader Charm and Reward Pouch Upgrade. Shops mix active abilities, consumables, passives and a permanent three-level upgrade. A trailkeeper event can grant Survey Lantern and charges instead of coins.
- Inventory throughout Branch, including mid-board and at non-combat stops. Two active slots and three passive slots. Equipping never resets charges or cooldowns.
- Pathfinder reveals one safe square, recharging after two first-clear boards (one with equipped Boots). Survey uses limited charges to mark three covered safe clues, without revealing squares. Rations reduce Pathfinder cooldown. Shop prices and first-clear payouts respond to equipped passives and permanent upgrades.
- Only first clears of each board/phase give coins and cooldown progress. Replaying already-paid boards or events cannot farm either. Charged items can still be bought again at their full current price.

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

The full roster of at least 50 announced boss twists, richer encounter/event variety, more equipment and consumables, and further route/boss balancing remain unfinished. This pass does not claim to implement that roster using renamed parameter variants. Opt-in entry is deliberate while this foundation is tested with existing saves.

## Validation and limits

Engine tests cover real full-board and phased-boss completion, root/child progression, completed-ancestor replay, immutable state, both penalty endpoints, protected banking, totems, exact recovery threshold, no map/reload rerolls, shops, upgrades, equipment, first-clear/event anti-farming and persistence. Browser tests cover the actual route controls, buying/equipping/using Survey, banking, phase announcements, money-drop notice, visible hit, restart-safe pending loss, Continue, and mobile inventory.

Existing engine, mode, Daily, Riptide, Scan, public-score mock, volume, and browser persistence regressions are retained. Shell persistence checks simulate browser/Android/Tauri bridges; they are not native device lifecycle tests. New native installers and actual-device updates still require the installer workflow and device checks. Live Firebase and audible hardware output are not validated by these tests.
