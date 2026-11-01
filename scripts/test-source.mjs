import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

// Deliberately serve only index.html: the ZIP must work without a public file route.
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const sourceData = readFileSync(new URL('../src/sourceData.ts', import.meta.url), 'utf8');
const filename = sourceData.match(/SOURCE_ARCHIVE_FILENAME: string = ["']([^"']+)/)?.[1];
assert.ok(filename, 'Generate the archive with python3 scripts/package-source.py first.');
const expected = readFileSync(new URL(`../public/${filename}`, import.meta.url));
const server = createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('No external files are hosted by this test.');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];

  async function verifyDownload(page, selector) {
    const promise = page.waitForEvent('download');
    await page.locator(selector).click();
    const download = await promise;
    assert.equal(download.suggestedFilename(), filename);
    assert.equal(await download.failure(), null);
    const bytes = readFileSync(await download.path());
    assert.ok(bytes.equals(expected), 'The saved source ZIP must exactly match the verified archive.');
    assert.equal(bytes.readUInt32LE(0), 0x04034b50, 'Download is a ZIP, not an HTML error page.');
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto(url);
  await desktop.locator('.boot-screen').waitFor({ state: 'detached', timeout: 10000 });
  await verifyDownload(desktop, '.source-download');
  await desktop.locator('.sidebar-android').click();
  await verifyDownload(desktop, '.source-download-inline');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(url);
  await mobile.locator('.boot-screen').waitFor({ state: 'detached', timeout: 10000 });
  await mobile.getByRole('button', { name: 'Open navigation', exact: true }).tap();
  await verifyDownload(mobile, '.source-download');
  assert.deepEqual(errors, []);
  console.log(`Source ZIP downloads verified on desktop, mobile, and in the Android dialog: ${filename}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}