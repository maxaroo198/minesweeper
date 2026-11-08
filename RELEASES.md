# Android, Windows and Linux releases

This round uses **separate local saves**, not cloud sync. No Firestore rules or
indexes need changing. The existing Classic/Blitz public leaderboard still uses
Firebase when online. Local stats and Branch progress survive normal app restarts;
uninstalling/clearing data can erase them. They do not move between devices, the
website, or separately installed Linux profiles.

## What is built

`.github/workflows/installers.yml` builds on GitHub's Windows and Linux runners:

- `minefield-android.apk`: Android 8+; package `app.minefield`, version 1.7.1/code 13.
- `minefield-windows-x64-setup.exe`: x64 NSIS installer, Tauri 2 / WebView2.
- `minefield-linux-x86_64.AppImage`: x86_64 AppImage, may need FUSE.
- `minefield-linux-amd64.deb`: Debian/Ubuntu-compatible package.
- `index.html`: web build; deploy it to an HTTPS static host.
- `SHA256SUMS.txt`: release integrity checksums.

The app's Download apps dialog links to those exact asset names on the repository's
latest GitHub release, instead of embedding an outdated APK. Links only work after
a complete release is published. Updating website code still requires redeploying
the website; publishing installers does not deploy a hosting service.

Windows and Linux are **not code-signed**. OS security warnings are possible. Do
not tell users to disable antivirus or Play Protect. Android has a persistent
private signing certificate, but is not a Google Play release. First desktop/phone
launch and in-place upgrade must still be tested on actual devices.

## 1. Push this patch

Apply the v1.7.0 navigation and modes patch to your clean `~/minefield-patched` checkout and push main.
No GitHub connector is available in this chat, so these actions run from your repo,
not from the assistant. You remain in control of secrets and publishing.

## 2. Configure Firebase build variables

GitHub repository → **Settings → Secrets and variables → Actions → Variables →
New repository variable**. Add:

| Name | Value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | The `apiKey` in your Firebase web app configuration |
| `VITE_FIREBASE_PROJECT_ID` | `minesweepermax` |
| `VITE_FIREBASE_APP_ID` | `1:878454097264:web:e9325292c8850e09af3bb5` |

These web-client values are not private service credentials. Never put an Admin
SDK/service-account private key in Vite variables. Your local `.env` is not pushed
and will not configure Actions. The workflow fails early rather than producing
installers with a silently disconnected public board.

## 3. Make and back up your Android release key (once)

You need `keytool` from a JDK installed on your Linux computer. Do not create a new
key for later releases. The helper below works from fish and asks for your password
without showing it. It creates the key outside the repository, refuses to overwrite
an existing key, and also prepares the temporary Base64 file for GitHub:

```fish
cd ~/minefield-patched
python3 scripts/setup-android-signing.py
```

Choose a strong password (at least 12 characters).
Store the password securely. PKCS12 uses the same password for the key and store.
Keep an encrypted backup of the keystore **and password** somewhere safe. Without
this key you cannot ship updates over existing installs without losing local data.
Never paste the private key or password into chat, source files, or Git commits.

The helper already creates Base64. If you used an existing key instead, convert it
to a one-line Base64 file (Base64 is encoding, NOT encryption):

```fish
python3 -c 'import base64,pathlib; p=pathlib.Path.home()/".config/minefield-signing"; out=p/"release.base64"; out.write_bytes(base64.b64encode((p/"release.keystore").read_bytes())); out.chmod(0o600)'
```

GitHub → **Settings → Secrets and variables → Actions → Secrets → New repository
secret**. Add:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Entire contents of `~/.config/minefield-signing/release.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Same password for this PKCS12 key |
| `ANDROID_KEY_ALIAS` | `minefield` |

To display Base64 locally for copying: `cat ~/.config/minefield-signing/release.base64`.
Do not paste it here. Delete the temporary Base64 file after setting the secret;
keep your encrypted backup of the actual keystore.

For local testing, `build-android.py` without `--release` can generate a development
key. **Do not distribute development-key APKs as releases.** The CI release command
requires the existing key and all four variables, never silently regenerating it.

## 4. Test the workflow without publishing

Repository → **Actions → Build installers → Run workflow → main → Run workflow**.

This builds and uploads downloadable Actions artifacts, but does NOT publish a
release or change the latest-release links. Download the artifacts from the run
summary, extract the ZIPs, and install on your devices. Each platform must pass.
Check stats and Branch progress after force-closing and reopening; try offline
play, sound and Android haptics, plus a Classic/Blitz public score while online.

If a job fails, open the red step and share the error (not signing secrets).

## 5. Publish v1.5.0 after testing

From your local project (fish compatible):

```fish
cd ~/minefield-patched
git push origin main
git tag v1.5.0
git push origin v1.5.0
```

The tag starts a fresh build. After **all** builds pass, the release job publishes
the four installers, web build and checksums together. See repository **Releases**.
The tag must exactly match `package.json`, Android versionName, Cargo.toml and
Tauri config. For future versions bump all four and increase Android versionCode.
Do not overwrite an existing tag to change a released APK; release a new version.

The same Android signing secrets and app ID must be retained forever for updates.
Tauri identifier `com.minefield.app` and Android asset origin are stable; changing
them can switch storage profiles and make old saves appear missing.

## Build locally (optional)

Node 24 LTS is used in CI to satisfy the installed Firebase SDK engine requirements.

Android: JDK 17, Android SDK API 35 + build-tools 35.0.0, and `npm ci`; see
BUILDING.md. Release command: `npm run android:build` with the four
`MINEFIELD_*` signing variables set (never commit them).

Desktop: Rust stable, platform prerequisites from Tauri 2, `npm ci`, then
`npm run desktop:icon` and `npm run desktop:build -- --bundles deb,appimage` on Linux,
or `npm run desktop:build -- --bundles nsis` on Windows. Build on the native OS.
The icons are generated from the checked-in SVG. No Flatpak is built in this round.

## CachyOS / Arch AppImage sound checks

Use a freshly built v1.5.0 AppImage, not the previously downloaded binary.
Preferences → Test sound enables sound and starts the audio engine. If the engine
reports running but remains silent, check the app output in the system volume
mixer. For diagnostics (no package changes), run:

```fish
gst-inspect-1.0 autoaudiosink
gst-inspect-1.0 pulsesink
wpctl status
```

Share missing-plugin or output-device errors, not signing credentials. The
AppImage now requests Tauri's GStreamer media bundling; this is not a claim that
every CachyOS audio configuration has been tested. Do not disable audio/security
sandboxing as a workaround. Windows and Android use different audio stacks.
