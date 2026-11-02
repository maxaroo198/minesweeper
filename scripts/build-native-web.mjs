// Build from the repository root even when Tauri invokes us inside desktop/.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, MINEFIELD_NATIVE_BUILD: '1' },
});
