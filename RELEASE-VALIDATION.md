# Unified Branch (v1.4.0)

Automated coverage exercises automatic/idempotent migration, preservation of old grid mines/reveals/flags, pre-opening flags, safe crystal chains with both cache passives, one-time loot and auto-equip, optional bounty payouts, supplied clues, rectangular grids, stronger abilities, saved varied events and anti-farming. The original engine economy/failure suite remains, with a neutral fixture for its original fixed-payout assertions.

The unified browser flow covers map-first entry with no Begin switch, actual minefield clears, loot choice, shop/equipment/charged skill, bank, phased boss, saved visible loss, Continue after See the board/restart, no-farm replay, automatic child routes and mobile inventory. The map video regression still continues to an open sibling and plays its automatically created encounter. Legacy UI setup now enters an encounter instead of a removed standalone board; unrelated mode/public-score checks remain.

TypeScript, production build, randomized game-engine tests, service/audio mocks, browser/mobile and simulated shell-persistence suites, and embedded source-download tests are run before packaging. Classic mechanics are untouched (`src/game.ts` unchanged). Three phased bosses remain, not 50+. No Firestore rules, indexes or database-side changes.

Native installer builds, real phone/desktop upgrade and lifecycle tests, audible hardware output and live Firebase are not verified in the sandbox. Run the release workflow and test artifacts with the same signing key/app IDs. Do not uninstall or clear saves.

## Historical validation (earlier releases)

# Visual Branch atlas (v1.3.1)

The recorded failure flow is reproduced with a cleared root, a failed expedition child, and an open non-expedition sibling. Browser coverage dismisses the result using See the board, verifies the persistent recovery button, opens the map and continues, selects the open sibling in Whole tree, and actually reveals tiles there. No resets of currency, inventory or tree are needed. Map coverage also checks custom icon nodes/edges, rejected future-node clicks, keyboard node selection, zoom, focus restoration, mobile overflow and Escape. The prior expedition UI suite now navigates through the actual visual map for shop, event, bank and boss phase controls.

All existing engine, service/volume mock, browser/mobile, restart-persistence and source-download checks are retained. Native installer builds and device tests still require a fresh workflow. No live Firebase or audible-device verification is claimed. No Firestore/database-side changes required. The full 50+ boss roster is still outside this map/failure fix.

# Branch expedition foundation (v1.3.0)

TypeScript, production web build, existing 240-game randomized engine suite, service/audio/volume mocks and old browser/mobile/persistence regressions are retained. New pure engine tests run real route and multi-phase boss clears, verify child unlocking and completed-ancestor replay, both 10–100% penalty endpoints, untouched bank funds, totem preservation, exact 10% recovery boundary, once-per-attempt recovery checks, equipment, shop pricing, upgrades and anti-farming. New browser tests exercise the actual route UI, purchases, equipment, charged abilities, banking, phase announcements, visible money drop/mine hit, reload during pending loss, explicit Continue and mobile inventory. The new engine and UI suites are included in CI.

This is explicitly an opt-in first pass: 3 implemented phased bosses, not the full 50+ agreed twist roster. The existing tree is not automatically converted. Expedition saves extend the existing world key and preserve old area IDs, devices, signing and origins. No Firestore rules, indexes or database-side changes required.

New native packages, actual phone/desktop update lifecycles, live Firebase and audible device output are not verified by these web/mocked checks. Run a fresh installer workflow on the updated commit and check its artifacts on the real devices. Do not uninstall or clear app data.

# Round 7 validation (v1.2.1)

TypeScript and production web builds, 240 randomized engine games plus rule regressions, mocked Firebase/audio services, browser/mobile UI suites, browser-process restart/persistence with shell bridges simulated, and new Round 7 regressions pass in the sandbox. Branch coverage includes two separate child failures, root fallback and replay, reopening existing children, deeper growth, immutable/repeatable calculations, board-specific synchronization, and old dead-end save repair without wiping the tree. UI checks cover blank Riptide zero labels with numbered clues retained, Medium-only Daily, only Classic/Blitz leaderboard tabs, and submission queue persistence. Firebase mocks cover idempotent posting, zero-second minimum compatibility, explicit permission errors, latest-confirmed receipts, and unchanged indexed Blitz top-20 merging.

Node 24.22.2 / npm 12.2.2 `npm ci --ignore-scripts` passed with the repaired WASI entry intact. npm audit still reports 6 dependency advisories (1 low, 5 high); no force upgrade or unrelated dependency change was attempted. The embedded source ZIP download also passes desktop/mobile/Android-dialog browser tests.

Volume regressions cover the louder 50% default, zero/full gain, input clamping, slider changes, persistence after reload, independent mute and an explicit zero-volume Test sound message. Actual speaker loudness still needs verification on the target device.

**Not validated live:** the user's Firebase database/rules, actual CachyOS speaker output, new Windows/Linux/Android binaries, or an actual phone update. Run the installer workflow and test those artifacts on the real devices. No signing keys, app identities, or existing storage keys changed. Firestore source rules and query indexes are unchanged; no database deployment is needed for this patch itself. Do not claim that the user's exact missing-score cause is verified until a real post succeeds or its server error is observed.

# Round 6 validation notes

TypeScript, production web build, randomized engine suite, mocked Firebase/audio tests, browser interaction tests, restart-persistence tests and Round 6 regression tests are run for this update. Regressions cover compact mode navigation, visible Branch death, playable root fallback, Scan costs/no-reroll and daily streaks without rolling history.

Firebase tests use mocks; they do not verify the maintainer's live scores/rules/index status. Audio tests verify scheduling after context resume, not audible speaker output. AppImage media configuration is validated against Tauri's schema but the new native packages still need GitHub builds and real-device testing. Version 1.2.0 has not been published by the assistant.

# Round 5 validation

Validated in the sandbox, before handoff:

- TypeScript and production web build passed.
- 240 randomized engine games plus mode invariants passed.
- Browser interaction suite passed, including all nine modes and the four release links.
- Browser-process restart tests passed for actual win stats and Branch reveals/flags in browser, Android bridge and Tauri bridge simulations.
- Android APK compiled, aligned and passed apksigner verification (v2/v3). This was a temporary development-key build, not the maintainer's distributable release key. No actual phone/emulator test was performed.
- Linux Tauri executable, Debian package and AppImage built successfully. Debian dependencies include libwebkit2gtk-4.1-0 and libgtk-3-0.
- Actual Linux executable launched under Xvfb. Completed a Branch root by native mouse input; root clear, unlocked children and win stats persisted after shutting down and relaunching the native process.
- Actions workflow passed actionlint 1.7.7; source archive contains native build/workflow files and excludes signing credentials and private .env files.

Limits: Windows has not been built here. Its first build must run on GitHub's Windows runner. Android needs actual-device install/lifecycle testing. AppImage was packaged, not run via FUSE. Linux sandbox uses Debian 13; published Linux binaries will instead be built on Ubuntu 22.04 for wider compatibility. Local Linux validation used single-job/no-LTO environment overrides to fit sandbox memory; the checked-in release profile is unchanged.

No public release was created from this sandbox. The maintainer must set GitHub repository variables and Android signing secrets, run a manual test build, test the artifacts, and push the matching version tag to publish. No Firestore changes are required for this round.
