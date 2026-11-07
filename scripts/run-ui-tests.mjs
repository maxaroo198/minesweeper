import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const port = process.env.TEST_PORT || '4182';
const url = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview',
  '--host', '127.0.0.1', '--port', port, '--strictPort',
], { stdio: ['ignore', 'inherit', 'inherit'] });

let startupError;
let serverExited = false;
let serverExitCode;
server.once('error', error => { startupError = error; });
server.once('exit', code => {
  serverExited = true;
  serverExitCode = code;
});

try {
  // Vite's logs may include ANSI colors or change formatting in CI.
  // Check that the built page is actually being served instead.
  const deadline = Date.now() + 60_000;
  let ready = false;
  let lastFailure = 'No HTTP response yet';
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (serverExited) throw new Error(`Preview exited before becoming ready (code ${serverExitCode})`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      const html = await response.text();
      if (response.ok && /<html[\s>]/i.test(html)) {
        ready = true;
        break;
      }
      lastFailure = `HTTP ${response.status}; expected an HTML page`;
    } catch (error) {
      lastFailure = error.message;
    }
    await delay(250);
  }
  if (!ready) throw new Error(`Preview did not become ready at ${url} within 60 seconds: ${lastFailure}`);
  if (startupError) throw startupError;
  if (serverExited) throw new Error(`Preview exited unexpectedly (code ${serverExitCode})`);
  console.log(`Preview ready: ${url}`);

  for (const script of ['scripts/test-browser.mjs', 'scripts/test-persistence.mjs', 'scripts/test-round6.mjs', 'scripts/test-round7.mjs', 'scripts/test-branch-expedition-ui.mjs']) {
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit', env: { ...process.env, TEST_PORT: port },
    });
    const [code, signal] = await once(child, 'exit');
    if (code !== 0) throw new Error(`${script} failed (code ${code}, signal ${signal ?? 'none'})`);
  }
} finally {
  if (!serverExited) {
    const stopped = once(server, 'exit').catch(() => {});
    server.kill('SIGTERM');
    const force = setTimeout(() => server.kill('SIGKILL'), 5_000);
    force.unref();
    await stopped;
    clearTimeout(force);
  }
}
