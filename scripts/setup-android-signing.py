#!/usr/bin/env python3
"""Create a private persistent Android signing key locally, never in the repo."""
import base64
import getpass
import os
from pathlib import Path
import shutil
import subprocess

keytool = shutil.which('keytool')
if not keytool:
    raise SystemExit('Install a JDK (17 or newer) first: keytool is missing. See RELEASES.md.')
folder = Path.home() / '.config' / 'minefield-signing'
folder.mkdir(parents=True, exist_ok=True, mode=0o700)
folder.chmod(0o700)
key = folder / 'release.keystore'
encoded = folder / 'release.base64'
if key.exists() or encoded.exists():
    raise SystemExit(f'A signing key already exists at {key}. Do not replace it. Use your existing key/password; see RELEASES.md for Base64 conversion.')
password = getpass.getpass('New release-key password (at least 12 characters): ')
if len(password) < 12:
    raise SystemExit('Use at least 12 characters. No key was created.')
if password != getpass.getpass('Repeat password: '):
    raise SystemExit('Passwords do not match. No key was created.')
env = {**os.environ, 'MINEFIELD_NEW_KEY_PASSWORD': password}
subprocess.run([
    keytool, '-genkeypair', '-noprompt', '-storetype', 'PKCS12',
    '-keystore', str(key), '-alias', 'minefield', '-keyalg', 'RSA',
    '-keysize', '3072', '-validity', '10000',
    '-storepass:env', 'MINEFIELD_NEW_KEY_PASSWORD',
    '-keypass:env', 'MINEFIELD_NEW_KEY_PASSWORD',
    '-dname', 'CN=Minefield, O=Minefield, C=US',
], env=env, check=True)
key.chmod(0o600)
fd = os.open(encoded, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'wb') as output:
    output.write(base64.b64encode(key.read_bytes()))
print(f'Private keystore: {key}\nTemporary Base64 file: {encoded}')
print('Back up the keystore and password securely. Never paste them into chat or commit them.')
print('GitHub Actions repository secrets to set:')
print('  ANDROID_KEYSTORE_BASE64 = the entire contents of the Base64 file')
print('  ANDROID_KEYSTORE_PASSWORD = the password you just chose')
print('  ANDROID_KEY_PASSWORD = the same password')
print('  ANDROID_KEY_ALIAS = minefield')
print('After saving the secret, delete the temporary Base64 file. Keep the original key and encrypted backup.')
