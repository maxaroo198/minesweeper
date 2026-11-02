#!/usr/bin/env python3
"""Collect predictable release filenames and reject missing/invalid artifacts."""
import hashlib
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'release-assets'
OUT.mkdir(exist_ok=True)
FILES = {
    'android': [('public/minefield.apk', 'minefield-android.apk', b'PK')],
    'windows': [('desktop/target/release/bundle/nsis/*.exe', 'minefield-windows-x64-setup.exe', b'MZ')],
    'linux': [('desktop/target/release/bundle/appimage/*.AppImage', 'minefield-linux-x86_64.AppImage', b'\x7fELF'),
              ('desktop/target/release/bundle/deb/*.deb', 'minefield-linux-amd64.deb', b'!<arch>\n')],
}
mode = sys.argv[1] if len(sys.argv) == 2 else ''
if mode in FILES:
    for pattern, name, magic in FILES[mode]:
        matches = list(ROOT.glob(pattern))
        if len(matches) != 1:
            raise SystemExit(f'Expected one installer for {pattern}, found {len(matches)}')
        data = matches[0].read_bytes()
        if len(data) < 10_000 or not data.startswith(magic):
            raise SystemExit(f'Invalid installer: {matches[0]}')
        shutil.copy2(matches[0], OUT / name)
elif mode == 'web':
    import json
    version = json.loads((ROOT / 'package.json').read_text())['version']
    for path in (ROOT / 'dist/index.html', ROOT / f'public/minefield-source-v{version}.zip'):
        if not path.is_file():
            raise SystemExit(f'Missing web release file: {path}')
        shutil.copy2(path, OUT / path.name)
elif mode == 'verify':
    names = []
    for platform in FILES.values():
        for _, name, magic in platform:
            path = OUT / name
            if not path.is_file() or path.stat().st_size < 10_000 or not path.read_bytes().startswith(magic):
                raise SystemExit(f'Missing or invalid release asset: {name}')
            names.append(name)
    if not (OUT / 'index.html').is_file():
        raise SystemExit('Missing web build')
    names.append('index.html')
    sources = list(OUT.glob('minefield-source-v*.zip'))
    if len(sources) != 1 or not sources[0].read_bytes().startswith(b'PK'):
        raise SystemExit('Missing source archive')
    names.append(sources[0].name)
    (OUT / 'SHA256SUMS.txt').write_text(''.join(
        f'{hashlib.sha256((OUT / name).read_bytes()).hexdigest()}  {name}\n' for name in sorted(names)
    ))
else:
    raise SystemExit('Usage: collect-installers.py android|windows|linux|web|verify')
