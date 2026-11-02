import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const version = JSON.parse(read('package.json')).version;
assert.equal(JSON.parse(read('desktop/tauri.conf.json')).version, version, 'desktop version mismatch');
assert.ok(read('desktop/Cargo.toml').includes(`version = "${version}"`), 'Rust version mismatch');
assert.ok(read('android/AndroidManifest.xml').includes(`android:versionName="${version}"`), 'Android version mismatch');
if (process.env.GITHUB_REF_TYPE === 'tag') assert.equal(process.env.GITHUB_REF_NAME, `v${version}`, 'Tag must match app version');
for (const name of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']) {
  assert.ok(process.env[name]?.trim(), `Set repository Actions variable ${name} first (Settings → Secrets and variables → Actions → Variables)`);
}
console.log(`Release ${version}: version and Firebase configuration checks passed.`);
