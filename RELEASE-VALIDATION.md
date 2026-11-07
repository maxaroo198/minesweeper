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
