import { chromium } from '@playwright/test';
const PORT = process.env.TEST_PORT || 4173;
const BASE = `http://127.0.0.1:${PORT}`;
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const output = ts.transpileModule(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { freshGame, plantBoard, dailyBoard } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

mkdirSync('.screenshots', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(20000);
const errors = [];
// A constant random source makes mine placement identical in the browser and in
// this script, so tests can compute the exact board before clicking it. A constant
// is deliberately used instead of a seeded stream: however many values React or
// the game draw first, the Fisher-Yates shuffle lands in the same place.
await page.addInitScript(() => { Math.random = () => 0.5; });
const constantRandom = (fn) => { const real = Math.random; Math.random = () => 0.5; try { return fn(); } finally { Math.random = real; } };
page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: '.screenshots/desktop.png', fullPage: true });
assert.equal(await page.locator('.tile').count(), 81);
assert.ok(await page.locator('.tile.revealed').count() > 0, 'a welcoming board preview');
await page.locator('.tile').nth(40).click();
assert.ok(await page.locator('.game-panel .board-message').innerText().then(t => t.includes('safe squares found')));
assert.equal(await page.locator('.tile.exploded').count(), 0);
let covered = page.locator('.tile.covered').first();
await covered.click({ button: 'right' });
assert.equal(await page.locator('.tile.flagged').count(), 1);
await page.locator('.tile.flagged').click({ button: 'right' });
assert.equal(await page.locator('.tile.flagged').count(), 0);
await page.getByRole('button', { name: 'Medium', exact: true }).click();
await page.getByRole('dialog').waitFor();
await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
assert.equal(await page.locator('.tile').count(), 81);
await page.getByRole('button', { name: 'Medium', exact: true }).click();
await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
assert.equal(await page.locator('.tile').count(), 256);
await page.getByRole('button', { name: 'Hard', exact: true }).click();
assert.equal(await page.locator('.tile').count(), 900);
assert.equal(await page.locator('.board-dimensions').innerText().then(t => t.includes('30 × 30')), true, 'hard is a 30 x 30 square');
await page.locator('.mode-card-zen').click();
assert.equal(await page.locator('.tile').count(), 81);
await page.locator('.tile').nth(40).click();
assert.equal(await page.locator('.board-stat').first().locator('svg.lucide-infinity').count(), 1);
await page.locator('.mode-card-blitz').click();
await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
assert.ok((await page.locator('.board-stat').first().innerText()).includes('01:00'));
await page.clock.install();
await page.locator('.tile').nth(40).click();
await page.clock.fastForward(61000);
await page.getByText('A mine. Not the end.', { exact: true }).waitFor();
assert.equal(await page.locator('.tile.exploded').count(), 0);
await page.getByRole('button', { name: 'See the board', exact: true }).click();

// The daily is locked: Hard every day, or Medium + Hard when the twist runs on a clock.
await page.locator('.mode-card-daily').click();
await page.waitForTimeout(300);
const daily = await page.evaluate(() => ({
  enabled: [...document.querySelectorAll('.difficulty-tabs button')].filter(b => !b.disabled).map(b => b.textContent.trim()),
  selected: document.querySelector('.difficulty-tabs button.selected')?.textContent.trim(),
  tiles: document.querySelectorAll('.tile').length,
}));
assert.ok(['Hard', 'Medium'].includes(daily.selected), 'the daily starts on a locked size');
assert.deepEqual(daily.enabled, daily.selected === 'Medium' ? ['Medium', 'Hard'] : ['Hard'], 'the daily only offers its locked sizes');
assert.equal(daily.tiles, daily.selected === 'Medium' ? 256 : 900, 'the daily board matches its locked size');
assert.ok(await page.locator('.daily-hub-lock').innerText().then(t => /locked to hard|medium or hard/i.test(t)), 'the hub says which sizes are locked');

// Win an easy classic board — that is what feeds the records and the local board.
await page.locator('.mode-card').first().click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Easy', exact: true }).click();
await page.waitForTimeout(150);
await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (d) [...d.querySelectorAll('button')].find(b => b.textContent.includes('Start fresh'))?.click(); });
await page.waitForTimeout(300);
await page.locator('.tile').nth(40).click();
const solved = constantRandom(() => plantBoard(freshGame('classic', 'easy'), 40));
for (let i = 0; i < solved.cells.length; i++) {
  if (!solved.cells[i].mine && !(await page.locator('.tile').nth(i).isDisabled())) {
    await page.locator('.tile').nth(i).click();
  }
}
await page.getByText('Beautifully swept.', { exact: true }).waitFor();
assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('minefield-games-v1')).some(r => r.won)), 'a win is recorded locally');

// Every classic win asks for a leaderboard name, connected or not.
assert.equal(await page.locator('#win-name').count(), 1, 'a classic win always asks for a name');
const nameInput = page.locator('#win-name');
await nameInput.click();
await nameInput.fill('');
await nameInput.pressSequentially('Square Fan');
assert.equal(await nameInput.inputValue(), 'Square Fan', 'the name field takes spaces');
await page.getByRole('button', { name: /Save name|Post/ }).click();
await page.waitForTimeout(250);
assert.equal(await page.evaluate(() => localStorage.getItem('minefield-player-name')), 'Square Fan', 'the name is remembered');

await page.getByRole('button', { name: 'See the board', exact: true }).click();
await page.locator('.nav-item').filter({ hasText: 'Leaderboard' }).click();
await page.locator('.leaderboard-filters').getByRole('button', { name: 'Classic', exact: true }).click();
await page.getByLabel('Leaderboard difficulty').selectOption('easy');
assert.equal(await page.locator('.score-table tbody tr').count(), 1);
assert.ok(await page.locator('.public-board.not-connected').count() === 1, 'without Firebase the public board explains itself');
await page.locator('.nav-item').filter({ hasText: 'Preferences' }).click();
await page.getByRole('switch', { name: 'Higher contrast' }).click();
assert.equal(await page.locator('.app.high-contrast').count(), 1);
await page.getByRole('button', { name: 'Just right', exact: false }).click();
await page.locator('.nav-item').filter({ hasText: 'How to play' }).click();
await page.getByRole('button', { name: 'Find your mode', exact: true }).click();
assert.equal(await page.locator('.mode-guide-card').count(), 4);

// Every board is a square grid that fits without scrolling inside the board box.
const layoutPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
layoutPage.on('pageerror', e => errors.push(e.message));
await layoutPage.goto(BASE, { waitUntil: 'networkidle' });
await layoutPage.waitForTimeout(400);
for (const [label, count, size] of [['Easy', 81, 9], ['Medium', 256, 16], ['Hard', 900, 30]]) {
  await layoutPage.locator('.difficulty-tabs button', { hasText: label }).first().click();
  await layoutPage.waitForTimeout(120);
  await layoutPage.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (d) [...d.querySelectorAll('button')].find(b => b.textContent.includes('Start fresh'))?.click(); });
  await layoutPage.waitForTimeout(350);
  const grid = await layoutPage.evaluate(() => {
    const board = document.querySelector('.mine-board');
    const scroll = document.querySelector('.board-scroll');
    const tile = board.querySelector('.tile').getBoundingClientRect();
    const rect = board.getBoundingClientRect();
    return {
      tiles: board.querySelectorAll('.tile').length,
      columns: getComputedStyle(board).gridTemplateColumns.split(' ').length,
      squareTile: Math.abs(tile.width - tile.height) < 0.6,
      squareBoard: Math.abs(rect.width - rect.height) < 2,
      innerScrollY: scroll.scrollHeight - scroll.clientHeight,
      innerScrollX: scroll.scrollWidth - scroll.clientWidth,
    };
  });
  assert.equal(grid.tiles, count, `${label} has ${count} tiles`);
  assert.equal(grid.columns, size, `${label} has ${size} columns`);
  assert.ok(grid.squareTile, `${label} tiles are square`);
  assert.ok(grid.squareBoard, `${label} board is square`);
  assert.ok(grid.innerScrollY <= 0 && grid.innerScrollX <= 0, `${label} board needs no scrolling`);
}

// A flag looks identical whether or not a mine sits under it.
await layoutPage.locator('.difficulty-tabs button', { hasText: 'Easy' }).first().click();
await layoutPage.waitForTimeout(120);
await layoutPage.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (d) [...d.querySelectorAll('button')].find(b => b.textContent.includes('Start fresh'))?.click(); });
await layoutPage.waitForTimeout(350);
await layoutPage.locator('.tile').nth(40).click();
for (let i = 0; i < 81; i++) {
  const tile = layoutPage.locator(".tile").nth(i);
  if ((await tile.getAttribute('class')).includes('covered')) await tile.click({ button: 'right' });
}
const flagStyles = await layoutPage.evaluate(() => [...document.querySelectorAll('.tile.flagged')].map(t => {
  const marker = getComputedStyle(t.querySelector('.flag-marker')).color;
  return `${marker}|${getComputedStyle(t).backgroundColor}`;
}));
assert.ok(flagStyles.length > 5, 'several flags planted');
assert.equal(new Set(flagStyles).size, 1, 'every flag is the same colour, mine or not');
assert.deepEqual([...new Set(flagStyles.map(s => s.split('|')[0]))], ['rgb(233, 120, 72)'], 'flags are the brand orange');

// Blitz reaches 15 seconds.
await layoutPage.locator('.mode-card-blitz').click();
await layoutPage.waitForTimeout(120);
await layoutPage.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (d) [...d.querySelectorAll('button')].find(b => b.textContent.includes('Start fresh'))?.click(); });
await layoutPage.waitForTimeout(250);
const blitzOptions = await layoutPage.locator('.blitz-time option').evaluateAll(opts => opts.map(o => o.value));
assert.ok(blitzOptions.includes('15'), 'blitz offers a 15 second limit');
await layoutPage.locator('.blitz-time').selectOption('15');
await layoutPage.waitForTimeout(250);
assert.ok((await layoutPage.locator('.board-stat').first().innerText()).includes('00:15'), 'blitz timer starts at 15 seconds');

// Hovering "Let's play" on desktop reveals the modes with the daily underneath.
await layoutPage.hover('.nav-flyout');
await layoutPage.waitForTimeout(250);
assert.equal(await layoutPage.locator('.nav-flyout-panel').evaluate(el => getComputedStyle(el).visibility), 'visible', 'mode flyout opens on hover');
assert.equal(await layoutPage.locator('.nav-flyout-item').count(), 4, 'flyout lists three modes plus the daily');
assert.ok(await layoutPage.locator('.nav-flyout-item.daily').innerText().then(t => t.includes('Daily challenge')), 'daily sits under the modes in the flyout');
await layoutPage.close();
await page.locator('.download-button').click();
await page.locator('.android-download').waitFor();
const apk = await page.request.get(`${BASE}/minefield.apk`);
assert.equal(apk.status(), 200);
assert.ok((await apk.body()).length > 100000);
await page.screenshot({ path: '.screenshots/android-dialog.png', fullPage: false });
await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
// Dark mode: toggle, persistence, contrast, and the native status-bar bridge.
const darkPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
darkPage.on('pageerror', e => errors.push(e.message));
await darkPage.addInitScript(() => {
  window.__bars = [];
  window.MinefieldAndroid = { share: () => {}, setSystemBars: dark => window.__bars.push(dark) };
});
await darkPage.goto(BASE, { waitUntil: 'networkidle' });
const luminance = (selector, prop = 'background-color') => darkPage.evaluate(([sel, key]) => {
  const value = getComputedStyle(document.querySelector(sel)).getPropertyValue(key);
  const [r, g, b] = value.match(/[\d.]+/g).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}, [selector, prop]);
assert.equal(await darkPage.evaluate(() => document.documentElement.dataset.theme), 'light');
await darkPage.locator('.theme-button').click();
assert.equal(await darkPage.evaluate(() => document.documentElement.dataset.theme), 'dark');
await darkPage.waitForTimeout(300); // let tile background transitions settle
assert.equal(await darkPage.evaluate(() => document.querySelector('meta[name="theme-color"]').getAttribute('content')), '#14160f');
assert.equal(await darkPage.evaluate(() => window.__bars.at(-1)), true, 'Android app is told to use dark system bars');
assert.ok(await luminance('.app') < 0.2, 'dark page background');
assert.ok(await luminance('.game-panel') < 0.2, 'dark panel background');
assert.ok(await luminance('.tile.covered') < 0.25, 'dark covered tiles');
assert.ok(await luminance('.page-heading h1', 'color') > 0.6, 'light heading text in dark mode');
assert.ok(await darkPage.locator('.theme-button svg.lucide-sun').isVisible(), 'sun icon shown in dark mode');
await darkPage.screenshot({ path: '.screenshots/desktop-dark.png', fullPage: true });
await darkPage.reload({ waitUntil: 'networkidle' });
assert.equal(await darkPage.evaluate(() => document.documentElement.dataset.theme), 'dark', 'theme persists across reloads');
await darkPage.locator('.theme-button').click();
assert.equal(await darkPage.evaluate(() => document.documentElement.dataset.theme), 'light');
assert.equal(await darkPage.evaluate(() => window.__bars.at(-1)), false, 'Android app restores light system bars');
assert.ok(await luminance('.app') > 0.9, 'light mode restored');
await darkPage.locator('.nav-item').filter({ hasText: 'Preferences' }).click();
await darkPage.getByRole('switch', { name: 'Night mode' }).click();
assert.equal(await darkPage.evaluate(() => document.documentElement.dataset.theme), 'dark');
await darkPage.getByRole('button', { name: 'Just right', exact: false }).click();
assert.equal(await darkPage.evaluate(() => localStorage.getItem('minefield-theme')), 'dark');
await darkPage.close();

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(BASE, { waitUntil: 'networkidle' });
await phone.evaluate(() => document.fonts.ready);
await phone.screenshot({ path: '.screenshots/mobile.png', fullPage: false });
assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'no horizontal page overflow');
await phone.locator('.tile').nth(40).tap();
await phone.locator('.flag-toggle').tap();
const target = phone.locator('.tile.covered').first();
await target.tap();
assert.equal(await phone.locator('.tile.flagged').count(), 1);
await phone.locator('.flag-toggle').tap();
await phone.locator('.mobile-bottom-nav').getByRole('button', { name: 'My stats', exact: true }).tap();
assert.equal(await phone.locator('.stat-card').count(), 4);
await phone.locator('.mobile-bottom-nav').getByRole('button', { name: 'How to play', exact: true }).tap();
assert.equal(await phone.locator('.help-step').count(), 3);
await phone.reload({ waitUntil: 'networkidle' });
assert.equal(await phone.locator('.tile').count(), 81);
assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'no horizontal page overflow on mobile');
await phone.locator('.theme-button').tap();
assert.equal(await phone.evaluate(() => document.documentElement.dataset.theme), 'dark');
await phone.locator('.tile').nth(40).tap();
assert.ok(await phone.evaluate(() => getComputedStyle(document.querySelector('.game-panel')).backgroundColor.match(/[\d.]+/g).slice(0, 3).every(v => Number(v) < 60)), 'mobile dark panel');
await phone.screenshot({ path: '.screenshots/mobile-dark.png', fullPage: false });
await phone.locator('.theme-button').tap();
assert.deepEqual(errors, [], 'no browser runtime errors');
console.log('Browser tests passed: desktop, mobile, flags, difficulties, modes, timeout, winning game, records, preferences, guide, and APK download.');
await browser.close();
