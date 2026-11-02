Nine game modes, offline play, orange flags, and local stats and Branch progress.

- Android: `minefield-android.apk` — Android 8+, independently signed, not a Play Store app.
- Windows: `minefield-windows-x64-setup.exe` — 64-bit Windows 10/11; unsigned publisher, WebView2 required (installer can download the runtime).
- Linux: `.AppImage` (mark executable; may need FUSE) or `.deb` (Debian/Ubuntu-compatible x86_64).
- Web: `index.html` — deploy to an HTTPS static host for browser play.
- Source: `minefield-source-v1.1.0.zip` (also available through GitHub’s source archives).
- Checksums: `SHA256SUMS.txt`.

Stats, settings, and Branch progress save **separately per device/app profile**. No account or cloud sync. Browser saves do not transfer into the installed apps. Do not uninstall or clear app data when updating. Android updates require the same package ID and signing certificate. Use the same Linux package type/profile when updating. The public leaderboard needs internet; gameplay does not.

Keep platform security protections enabled. Install only if you trust the release. Windows and Linux binaries are not code-signed; Android uses the maintainer's private signing certificate. Verify checksums to detect download corruption (checksums alone do not prove publisher identity).
