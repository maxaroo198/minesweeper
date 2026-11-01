import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 MinefieldAndroid/1.0.2' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.MinefieldAndroid = { haptic: () => {}, setSystemBars: () => {}, share: () => {} };
});
await page.goto('http://127.0.0.1:4181', { waitUntil: 'domcontentloaded' });
await page.locator('.boot-screen').waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: '.screenshots/fresh-boot.png' });
await page.locator('.boot-screen').waitFor({ state: 'detached', timeout: 6000 });
await page.waitForTimeout(400);
await page.screenshot({ path: '.screenshots/fresh-native-light.png' });
await page.locator('.tile').nth(40).tap();
await page.waitForTimeout(900);
await page.screenshot({ path: '.screenshots/fresh-native-play.png' });
await page.locator('.theme-button').tap();
await page.waitForTimeout(500);
await page.screenshot({ path: '.screenshots/fresh-native-dark.png' });
console.log('captured');
await browser.close();
