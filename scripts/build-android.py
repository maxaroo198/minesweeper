#!/usr/bin/env python3
"""Build a signed, offline Android APK from Vite's single-file output,
and embed the signed APK as Base64 in src/apkData.ts so single-file web
deployments can download both .apk and .xapk directly in the browser.
"""
import argparse
import base64
import os
import pathlib
import re
import shutil
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / '.android-tools'
BUILD = ROOT / '.android-build'
DIST = ROOT / 'dist'
PUBLIC = ROOT / 'public'
APK_DATA_TS = ROOT / 'src' / 'apkData.ts'
SOURCE_DATA_TS = ROOT / 'src' / 'sourceData.ts'
KEYSTORE = pathlib.Path(os.environ.get('MINEFIELD_KEYSTORE', str(ROOT / 'android' / 'minefield.keystore'))).expanduser().resolve()


def toolchain():
    """Accept a normal Android SDK installation as well as the original local tool layout."""
    java_roots = []
    if os.environ.get('JAVA_HOME'):
        java_roots.append(pathlib.Path(os.environ['JAVA_HOME']).expanduser())
    if shutil.which('javac'):
        java_roots.append(pathlib.Path(shutil.which('javac')).resolve().parent.parent)
    java_roots.extend(sorted(TOOLS.glob('amazon-corretto-*')))
    java_suffix = '.exe' if os.name == 'nt' else ''
    java = next((path for path in java_roots if all(
        (path / 'bin' / (name + java_suffix)).is_file() for name in ('java', 'javac', 'keytool')
    )), None)

    sdk_roots = [pathlib.Path(os.environ[name]).expanduser() for name in ('ANDROID_SDK_ROOT', 'ANDROID_HOME') if os.environ.get(name)]
    sdk_roots.append(TOOLS)
    platform = next((path for sdk in sdk_roots for path in (
        sdk / 'platforms/android-35/android.jar', sdk / 'android-35/android.jar'
    ) if path.is_file()), None)
    executable_suffix = '.exe' if os.name == 'nt' else ''
    script_suffix = '.bat' if os.name == 'nt' else ''
    bt = next((path for sdk in sdk_roots for path in (
        sdk / 'build-tools/35.0.0', sdk / 'android-15', sdk / 'android-35'
    ) if all((path / name).is_file() for name in (
        'aapt2' + executable_suffix, 'zipalign' + executable_suffix,
        'd8' + script_suffix, 'apksigner' + script_suffix,
        'lib/d8.jar', 'lib/apksigner.jar',
    ))), None)
    if java is None or platform is None or bt is None:
        raise SystemExit(
            'Android build tools are missing. Install JDK 17, Android SDK Platform 35, '
            'and Build-Tools 35.0.0. Set JAVA_HOME and ANDROID_SDK_ROOT. '
            'See BUILDING.md for setup commands.'
        )
    return java, platform, bt


def run(*args):
    subprocess.run([str(a) for a in args], cwd=ROOT, check=True)


def write_apk_data(b64_payload: str):
    APK_DATA_TS.write_text(
        '// Auto-generated signed Android APK payload (populated by scripts/build-android.py).\n'
        f"export const APK_BASE64: string = '{b64_payload}';\n",
        encoding='utf-8',
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate tool paths without building or changing files.')
    parser.add_argument('--release', action='store_true', help='Require an existing private signing key; never generate a disposable release key.')
    parser.add_argument('--no-embed', action='store_true', help='Do not embed the APK into the website after building.')
    args = parser.parse_args()
    if args.release:
        required = ['MINEFIELD_KEYSTORE', 'MINEFIELD_KEY_ALIAS', 'MINEFIELD_KEYSTORE_PASSWORD', 'MINEFIELD_KEY_PASSWORD']
        missing = [name for name in required if not os.environ.get(name)]
        if missing or not KEYSTORE.is_file():
            raise SystemExit('Release signing requires an existing keystore and all signing variables. Missing: ' + ', '.join(missing))
    java, platform, bt = toolchain()
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if npm is None:
        raise SystemExit('npm was not found. Install Node.js 22 LTS and run npm ci first.')
    java_suffix = '.exe' if os.name == 'nt' else ''
    executable_suffix = '.exe' if os.name == 'nt' else ''
    script_suffix = '.bat' if os.name == 'nt' else ''
    print(f'JDK: {java}\nAndroid platform: {platform}\nBuild tools: {bt}', flush=True)
    if args.check:
        return

    # Build lean Android assets, preserving the current downloads if compilation fails.
    previous_apk_data = APK_DATA_TS.read_text(encoding='utf-8')
    previous_source_data = SOURCE_DATA_TS.read_text(encoding='utf-8') if SOURCE_DATA_TS.exists() else None
    try:
        write_apk_data('')
        if previous_source_data is not None:
            SOURCE_DATA_TS.write_text(re.sub(
                r"(export const SOURCE_ARCHIVE_BASE64: string = )'[^']*';",
                r"\1'';", previous_source_data,
            ), encoding='utf-8')
        run(npm, 'run', 'build')
    finally:
        APK_DATA_TS.write_text(previous_apk_data, encoding='utf-8')
        if previous_source_data is not None:
            SOURCE_DATA_TS.write_text(previous_source_data, encoding='utf-8')

    if not (DIST / 'index.html').exists():
        raise RuntimeError('dist/index.html missing after inner build.')

    shutil.rmtree(BUILD, ignore_errors=True)
    for folder in ['res', 'java', 'classes', 'assets']:
        (BUILD / folder).mkdir(parents=True, exist_ok=True)
    shutil.copytree(DIST, BUILD / 'assets', dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('*.apk', '*.xapk', '*.zip', '*.idsig'))

    resources = BUILD / 'resources.zip'
    run(bt / ('aapt2' + executable_suffix), 'compile', '--dir', ROOT / 'android/res', '-o', resources)
    run(bt / ('aapt2' + executable_suffix), 'link', '-o', BUILD / 'unsigned.apk', '-I', platform,
        '--manifest', ROOT / 'android/AndroidManifest.xml', '--java', BUILD / 'java',
        '--min-sdk-version', '26', '--target-sdk-version', '35', resources)

    sources = list((ROOT / 'android/src').rglob('*.java')) + list((BUILD / 'java').rglob('*.java'))
    run(java / 'bin' / ('javac' + java_suffix), '--release', '8', '-cp', platform,
        '-d', BUILD / 'classes', *sources)
    classfiles = list((BUILD / 'classes').rglob('*.class'))

    os.environ['JAVA_HOME'] = str(java)
    os.environ['PATH'] = str(java / 'bin') + os.pathsep + os.environ['PATH']
    run(bt / ('d8' + script_suffix), '--lib', platform,
        '--min-api', '26', '--output', BUILD, *classfiles)

    with zipfile.ZipFile(BUILD / 'unsigned.apk', 'a') as apk:
        # Store classes.dex uncompressed so ART can memory-map it directly after zipalign.
        apk.write(BUILD / 'classes.dex', 'classes.dex', compress_type=zipfile.ZIP_STORED)
        for asset in (BUILD / 'assets').rglob('*'):
            if asset.is_file():
                apk.write(
                    asset,
                    'assets/' + str(asset.relative_to(BUILD / 'assets')),
                    compress_type=zipfile.ZIP_DEFLATED,
                )

    run(bt / ('zipalign' + executable_suffix), '-p', '-f', '4', BUILD / 'unsigned.apk', BUILD / 'aligned.apk')
    alias = os.environ.get('MINEFIELD_KEY_ALIAS', 'minefield')
    store_password = os.environ.get('MINEFIELD_KEYSTORE_PASSWORD', 'minefield-local-release')
    key_password = os.environ.get('MINEFIELD_KEY_PASSWORD', store_password)
    os.environ['MINEFIELD_SIGN_STORE_PASS'] = store_password
    os.environ['MINEFIELD_SIGN_KEY_PASS'] = key_password
    if not KEYSTORE.exists():
        KEYSTORE.parent.mkdir(parents=True, exist_ok=True)
        run(java / 'bin' / ('keytool' + java_suffix), '-genkeypair', '-noprompt', '-keystore', KEYSTORE,
            '-alias', alias, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
            '-storepass:env', 'MINEFIELD_SIGN_STORE_PASS', '-keypass:env', 'MINEFIELD_SIGN_KEY_PASS',
            '-dname', 'CN=Minefield, OU=Independent Android Release, O=Minefield, L=Local, ST=Local, C=US')

    PUBLIC.mkdir(exist_ok=True)
    apk_out = PUBLIC / 'minefield.apk'
    run(bt / ('apksigner' + script_suffix), 'sign', '--ks', KEYSTORE,
        '--ks-key-alias', alias, '--ks-pass', 'env:MINEFIELD_SIGN_STORE_PASS',
        '--key-pass', 'env:MINEFIELD_SIGN_KEY_PASS', '--min-sdk-version', '26',
        '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
        '--out', apk_out, BUILD / 'aligned.apk')
    run(bt / ('apksigner' + script_suffix), 'verify', '--verbose', apk_out)
    (PUBLIC / 'minefield.apk.idsig').unlink(missing_ok=True)

    # Stage 2: Embed the signed APK bytes into src/apkData.ts so dist/index.html is 100% self-contained.
    apk_bytes = apk_out.read_bytes()
    b64_payload = base64.b64encode(apk_bytes).decode('ascii')
    if not args.no_embed:
        write_apk_data(b64_payload)
    print(f'\nMinefield APK ready: {apk_out} ({len(apk_bytes):,} bytes)')
    if not args.no_embed:
        print(f'Embedded Base64 payload written to {APK_DATA_TS} ({len(b64_payload):,} chars)')


if __name__ == '__main__':
    main()
