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
