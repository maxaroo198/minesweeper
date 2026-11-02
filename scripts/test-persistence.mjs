import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
const BASE = `http://127.0.0.1:${process.env.TEST_PORT || 4173}`;
const output = ts.transpileModule(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { freshGame, plantBoard } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const realRandom = Math.random;
Math.random = () => 0.5;
const board = plantBoard(freshGame('classic', 'easy'), 40);
Math.random = realRandom;

for (const shell of ['browser', 'android', 'desktop']) {
  const profile = mkdtempSync(join(tmpdir(), 'minefield-save-'));
  const open = async () => {
    const ctx = await chromium.launchPersistentContext(profile, { headless: true, args: ['--no-sandbox'], viewport: { width: 1200, height: 1000 } });
    await ctx.addInitScript(kind => {
      Math.random = () => 0.5;
      if (kind === 'android') window.MinefieldAndroid = { share() {}, haptic() {}, setSystemBars() {} };
      if (kind === 'desktop') window.__TAURI__ = {};
    }, shell);
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2700);
    return { ctx, page };
  };
  let context;
  try {
    let { ctx, page } = await open(); context = ctx;
    if (shell !== 'browser') assert.equal(await page.locator('.download-button').count(), 0, 'installed apps hide installer downloads');
    await page.locator('.tile').nth(40).click();
    for (let i = 0; i < board.cells.length; i++) {
      if (board.cells[i].mine) continue;
      const tile = page.locator('.tile').nth(i);
      if (!(await tile.getAttribute('class')).includes('revealed')) await tile.click();
    }
    await page.locator('.result-card').waitFor();
    const records = await page.evaluate(() => localStorage.getItem('minefield-games-v1'));
    assert.ok(JSON.parse(records).some(r => r.won && r.mode === 'classic'), 'actual win is saved');
    await page.getByRole('button', { name: 'See the board', exact: true }).click();
    await page.locator('.mode-card-zen').click();
    await page.locator('.tile').nth(40).click();
    const flagIndex = await page.locator('.tile').evaluateAll(tiles => tiles.findIndex(t => !t.classList.contains('revealed')));
    await page.locator('.tile').nth(flagIndex).click({ button: 'right' });
    await page.waitForTimeout(200);
    const saved = await page.evaluate(() => localStorage.getItem('minefield-zen-v1'));
    assert.ok(JSON.parse(saved).areas['0'].revealed.length > 0);
    assert.ok(JSON.parse(saved).areas['0'].flagged.length > 0);
    await ctx.close(); context = null;
    ({ ctx, page } = await open()); context = ctx;
    assert.equal(await page.evaluate(() => localStorage.getItem('minefield-games-v1')), records, 'stats survive full browser process restart');
    assert.equal(await page.evaluate(() => localStorage.getItem('minefield-zen-v1')), saved, 'Branch save survives full restart');
    await page.locator('.mode-card-zen').click();
    assert.ok((await page.locator('.tile').nth(flagIndex).getAttribute('class')).includes('flagged'), 'Branch flag restored into UI');
    assert.equal(await page.locator('.tile.revealed').count(), JSON.parse(saved).areas['0'].revealed.length, 'Branch reveals restored into UI');
    await ctx.close(); context = null;
    console.log(`Persistent saves passed: ${shell} shell simulation, actual win + Branch reveal/flag, process close/reopen.`);
  } finally {
    if (context) await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
}
console.log('These are browser storage tests with shell bridges simulated, not native device lifecycle tests.');
