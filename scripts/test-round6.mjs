import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const BASE = `http://127.0.0.1:${process.env.TEST_PORT || 4182}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { Math.random = () => .5; });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2700);
  assert.equal(await p.locator('.mode-bar .mode-card').count(), 8);
  assert.equal(await p.locator('.mode-column .mode-card').count(), 0);
  await p.locator('.mode-card-zen').click();
  await p.getByRole('button',{name:'Minefield · stop 1 · available',exact:true}).click();
  await p.getByRole('button',{name:'Enter minefield',exact:true}).click();
  await p.getByRole('button',{name:/Inventory ·/}).click();
  await p.getByRole('checkbox',{name:/Use a Return Totem/}).uncheck();
  await p.getByRole('button',{name:'Close inventory',exact:true}).click();
  await p.locator('.tile').nth(40).click();
  const mine = await p.evaluate(() => JSON.parse(localStorage.getItem('minefield-zen-v1')).expeditions.routes['0'].stops[0].board.cells.findIndex(c=>c.mine));
  await p.locator('.tile').nth(mine).click();
  await p.locator('.result-card').waitFor();
  assert.equal(await p.locator('.tile.exploded.mine-visible').count(), 1, 'hit mine stays on the lost board');
  assert.ok(await p.locator('.expedition-hud').getByRole('button', { name: 'Continue after the mine hit' }).isVisible());
  await p.getByRole('button', { name: 'See the board', exact: true }).click();
  assert.equal(await p.locator('.tile.exploded').count(), 1, 'viewing loss does not auto-teleport');
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(2700);
  await p.locator('.mode-card-zen').click();
  assert.equal(await p.locator('.tile.exploded').count(), 1, 'mine-hit acknowledgement persists after reload');
  await p.locator('.expedition-hud').getByRole('button',{name:'Continue after the mine hit',exact:true}).click();
  await p.getByRole('button',{name:'Close map',exact:true}).click();
  await p.locator('.mode-card-scan').click();
  // Root is ready, so switching needs no confirmation.
  await p.locator('.scan-toggle').click();
  await p.locator('.tile').nth(40).click();
  assert.equal(await p.locator('.scan-toggle b').innerText(), '4');
  await p.locator('.scan-toggle').click();
  await p.locator('.tile').nth(40).click();
  assert.equal(await p.locator('.tile.revealed').count(), 0, 'retrying a scan does not reveal or reroll it');
  assert.equal(await p.locator('.scan-toggle b').innerText(), '4');
  await p.locator('.tile').nth(41).click();
  assert.equal(await p.locator('.scan-toggle b').innerText(), '2');
  await p.locator('.scan-toggle').click();
  await p.locator('.tile').nth(42).click();
  const left = Number(await p.locator('.scan-toggle b').innerText());
  assert.ok(left === 0 || left === 1);
  if (left === 1) {
    await p.locator('.scan-toggle').click(); await p.locator('.tile').nth(43).click();
    assert.ok((await p.locator('.tile').nth(43).innerText()).includes('?'));
    assert.equal(await p.locator('.scan-toggle b').innerText(), '0');
  }
  // Separate daily history survives reload without a daily record in the rolling list.
  await p.evaluate(() => {
    const today = new Date();
    const keys = [0,1,2].map(n => { const d = new Date(today); d.setUTCDate(d.getUTCDate()-n); return d.toISOString().slice(0,10); });
    localStorage.setItem('minefield-daily-wins-v1', JSON.stringify(keys));
    localStorage.setItem('minefield-games-v1','[]');
  });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2700);
  await p.locator('.mode-card-daily').click();
  assert.equal(await p.locator('.daily-records > span').first().locator('b').innerText(), '3');
  assert.equal(await p.locator('.daily-day.won').count(), 3);
  assert.deepEqual(errors, []);
  console.log('Round 6 UI passed: compact bar, visible Branch mine loss, playable root fallback, Scan costs/no-reroll, independent daily streak.');
} finally { await browser.close(); }
