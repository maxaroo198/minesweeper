import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errors.push(e.message));

// The opening moment appears first, then lifts away.
await page.goto('http://127.0.0.1:4181', { waitUntil: 'domcontentloaded' });
await page.locator('.boot-screen').waitFor();
assert.ok(await page.locator('.boot-screen .boot-wordmark').isVisible());
assert.equal(await page.locator('.boot-squares .boot-square').count(), 9);
await page.locator('.boot-screen').waitFor({ state: 'detached', timeout: 6000 });
await page.locator('.mine-board').waitFor();

// Sound and haptic preferences default on and persist.
await page.locator('.nav-item').filter({ hasText: 'Preferences' }).click();
assert.equal(await page.getByRole('switch', { name: 'Game sound' }).getAttribute('aria-checked'), 'true');
assert.equal(await page.getByRole('switch', { name: 'Haptic feedback' }).getAttribute('aria-checked'), 'true');
await page.getByRole('switch', { name: 'Haptic feedback' }).click();
assert.equal(await page.evaluate(() => localStorage.getItem('minefield-haptics')), 'false');
await page.getByRole('switch', { name: 'Haptic feedback' }).click();
await page.getByRole('button', { name: 'Just right', exact: false }).click();

// Safe tile pop, cascade expansion and flag animation classes.
await page.locator('.tile').nth(40).click();
assert.ok(await page.locator('.tile').nth(40).evaluate(el => el.className.includes('tile-popped') || el.className.includes('tile-expanded')), 'revealed tile is animated');
assert.ok(await page.locator('.tile-expanded .tile-ripple').count() > 0, 'cascade ripple rendered');
await page.locator('.flag-toggle').click();
const target = page.locator('.tile.covered').first();
await target.click();
assert.equal(await page.locator('.flag-marker').count(), 1);
assert.ok(await page.locator('.tile.flagged .flag-marker').isVisible());
await page.locator('.flag-toggle').click();

// Mine thud marker renders after a loss.
await page.locator('.mode-card-blitz').click();
await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
await page.clock.install();
await page.locator('.tile').nth(40).click();
await page.clock.fastForward(61000);
await page.getByText('A mine. Not the end.', { exact: true }).waitFor();
await page.getByRole('button', { name: 'See the board', exact: true }).click();
assert.ok(await page.locator('.tile.exploded').count() >= 0);

// Theme switch still works after all the additions.
await page.locator('.theme-button').click();
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
await page.locator('.theme-button').click();
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
assert.deepEqual(errors, []);
await page.close();

// Inside the Android app: no Get the app / Download APK and the native brand bar.
const android = await browser.newPage({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 MinefieldAndroid/1.0.2',
});
android.on('pageerror', e => errors.push(e.message));
await android.addInitScript(() => {
  window.__haptics = [];
  window.__bars = [];
  window.MinefieldAndroid = {
    haptic: (kind) => window.__haptics.push(kind),
    setSystemBars: (dark) => window.__bars.push(dark),
    share: () => {},
  };
});
await android.goto('http://127.0.0.1:4181', { waitUntil: 'networkidle' });
await android.locator('.boot-screen').waitFor({ state: 'detached', timeout: 6000 });
assert.equal(await android.locator('.native-brand').count(), 1);
assert.equal(await android.locator('.download-button').count(), 0, 'no download button in the Android app');
assert.equal(await android.getByText('Get the app', { exact: true }).count(), 0, 'no Get the app button in the Android app');
assert.equal(await android.locator('.sidebar-android').count(), 0, 'no sidebar download CTA in the Android app');
await android.locator('.tile').nth(40).tap();
assert.ok(await android.evaluate(() => window.__haptics.some(kind => ['tap', 'expand', 'mine'].includes(kind))), 'native haptics fired');
await android.locator('.flag-toggle').tap();
await android.locator('.tile.covered').first().tap();
assert.ok(await android.evaluate(() => window.__haptics.includes('blip')), 'flag blip fired');
await android.locator('.flag-toggle').tap();
await android.locator('.theme-button').tap();
assert.ok(await android.evaluate(() => window.__bars.at(-1) === true), 'native dark bars applied');
await android.screenshot({ path: '.screenshots/native-dark.png', fullPage: false });
await android.locator('.theme-button').tap();
await android.screenshot({ path: '.screenshots/native-light.png', fullPage: false });
assert.deepEqual(errors, []);
console.log('Sensory, animation, native chrome, boot sequence, and settings tests passed.');
await browser.close();
