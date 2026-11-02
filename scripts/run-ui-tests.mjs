import { spawn } from 'node:child_process';
import { once } from 'node:events';
const port = process.env.TEST_PORT || '4182';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', port, '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview did not start within 30 seconds')), 30_000);
    let logs = '';
    server.stdout.on('data', chunk => {
      process.stdout.write(chunk);
      logs += chunk;
      if (logs.includes('Local:')) { clearTimeout(timer); resolve(); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited: ${code}`)); });
  });
  for (const script of ['scripts/test-browser.mjs', 'scripts/test-persistence.mjs']) {
    const child = spawn(process.execPath, [script], { stdio: 'inherit', env: { ...process.env, TEST_PORT: port } });
    const [code] = await once(child, 'exit');
    if (code !== 0) throw new Error(`${script} failed (${code})`);
  }
} finally {
  server.kill('SIGTERM');
}
