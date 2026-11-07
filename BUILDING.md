# Current installer releases

**Start with [RELEASES.md](RELEASES.md)** for the GitHub Actions release pipeline,
Android signing secrets, Windows/Linux packages and per-device save behavior.
The current native app version is **1.2.0**. Node **24 LTS** is recommended.
The website now links to complete GitHub releases rather than embedding the old
APK. Run `npm run android:build` for a signed release APK (`--release --no-embed`);
the legacy embedding commands below remain available for local experimentation.
No Firestore rule or index changes are required for native releases.

---

# Build Minefield From Source

This is the editable source for Minefield v1.0.2: a React game inside a native
Android Java WebView shell. It includes the app-opening animation, reveal waves,
flag animations, synthesized audio, native haptics, and light/dark themes.

The project uses a Python build script with Android SDK tools, not Gradle.
You can edit the files in Android Studio or another editor, but there is no
Gradle project to import. Use the commands below to compile the APK.

## Requirements

- Node.js 22 LTS (or Node.js 20.19+), including npm.
- Python 3.9 or newer.
- JDK 17, including java, javac, and keytool.
- Android SDK Platform 35 and Android SDK Build-Tools 35.0.0.
- Internet access for the first dependency/SDK installation. The built game
  itself loads its game files offline.

Linux or WSL2 is the recommended build environment. macOS with the corresponding
SDK/JDK binaries is also supported by the build script. SDK binaries and installed
npm packages are intentionally not included in the source ZIP.

## Run the Web Game

From the extracted project directory:

```sh
npm ci
npm run dev
```

The terminal displays the local preview URL. To generate a single-file production
web build, run `npm run build`. The result is `dist/index.html`.

## Set Up the Android Tools

Install JDK 17 and Android Studio's SDK command-line tools. In SDK Manager install
**Android 15 / API 35** and **Build-Tools 35.0.0**. Alternatively, using sdkmanager:

```sh
sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
```

Set these environment variables to the actual locations on your machine:

```sh
export JAVA_HOME="/path/to/your/jdk-17"
export ANDROID_SDK_ROOT="/path/to/your/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
```

Typical SDK locations are `$HOME/Android/Sdk` on Linux and
`$HOME/Library/Android/sdk` on macOS. `ANDROID_HOME` is also accepted. The script
also supports the original `.android-tools/` layout if you already have it.

Verify the paths before compiling:

```sh
python3 scripts/build-android.py --check
```

## Build and Install an APK

```sh
npm ci
python3 scripts/build-android.py
npm run build
```

The Python script builds the web game, compiles `MainActivity.java`, converts it
to DEX, packages and aligns the APK, signs it, and embeds the signed installer in
`src/apkData.ts`. The final `npm run build` refreshes the website's download button.

- Installable Android package: `public/minefield.apk`.
- Deployable web build: `dist/index.html`.
- Native Java: `android/src/app/minefield/MainActivity.java`.
- Android app ID: `app.minefield`.
- Minimum Android version: 8.0 / API 26, with a current Android System WebView.

With a USB-debugging-enabled Android device connected:

```sh
adb install -r public/minefield.apk
adb shell am start -n app.minefield/.MainActivity
```

You can also copy the APK to the phone, open it, and approve installation from
your file manager. Android may warn that the independently signed app is unknown.

## Signing Keys

No signing key or production credential is included. By default the build script
generates your own development key at `android/minefield.keystore`, using the
documented development password `minefield-local-release`. This default is for
local testing, not for publishing a production release.

For your own release key, configure these environment variables before building:

- `MINEFIELD_KEYSTORE`: path to your keystore.
- `MINEFIELD_KEY_ALIAS`: key alias, defaults to `minefield`.
- `MINEFIELD_KEYSTORE_PASSWORD`: keystore password.
- `MINEFIELD_KEY_PASSWORD`: key password, defaults to the keystore password.

Keep and back up your private key. Future updates need the same certificate.
An APK built with a new key cannot update the earlier downloaded app in place.
Android will report a signature mismatch. Uninstalling the old app first allows a
fresh installation but deletes its local scores and preferences.

## Project Map

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Game UI, native shell detection, settings and interactions |
| `src/game.ts` | Minesweeper rules, boards, flags and flood-fill waves |
| `src/BootScreen.tsx` | Opening animation |
| `src/sensory.ts` | Web Audio effects and haptic bridge calls |
| `src/index.css` | Light/dark themes, native layouts and tile animations |
| `src/apkPackage.ts` | APK download URLs and XAPK packaging |
| `android/src/app/minefield/MainActivity.java` | Activity lifecycle, offline WebView, vibration and sharing |
| `android/AndroidManifest.xml` | App version, activity and permissions |
| `android/res/drawable/icon.xml` | Vector launcher icon |
| `scripts/build-android.py` | Web-to-APK compilation, signing and embedding |
| `scripts/package-source.py` | Source ZIP export and embedding |
| `SOURCE_CONTENTS.json` | SHA-256 inventory of exported source files |

## Tests

```sh
npx tsc --noEmit
node scripts/test-engine.mjs
```

The engine suite runs 240 randomized full games and checks first-click safety,
flags, win detection and reveal-wave data.

For the interaction test, first install Playwright Chromium and its runtime
dependencies, build the website, then start a preview on port 4181:

```sh
npx playwright install --with-deps chromium
npm run build
npm run preview -- --host 127.0.0.1 --port 4181
```

In another terminal, run `node scripts/test-sensory.mjs`. It covers the opening
animation, preferences, flag/reveal effects, native-shell UI and bridge calls.
Browser tests simulate native bridge calls; they do not verify real device audio
volume, vibration strength or Android lifecycle behavior. Test the installed APK
on your device before distributing it. Older exploratory tests are included as
development references, not a substitute for device testing.

## Recreate the Source Download

```sh
python3 scripts/package-source.py
npm run build
```

This creates `public/minefield-source-v1.0.2.zip` and embeds it in the website so
the source download also works in a single-file preview. The export includes empty
`src/apkData.ts` and `src/sourceData.ts` stubs instead of compiled binary payloads.
They are regenerated by the respective build/package commands. Signing keys,
environment files, SDK/JDK binaries, screenshots, dependencies and build outputs
are excluded.

After building, `node scripts/test-source.mjs` checks actual ZIP downloads from
the desktop menu, mobile menu, and download dialog. It serves only `index.html`
to verify that no external ZIP hosting is required. Playwright Chromium is needed.