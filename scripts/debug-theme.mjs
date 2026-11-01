import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:4181', { waitUntil: 'networkidle' });
await page.locator('.boot-screen').waitFor({ state: 'detached', timeout: 6000 });
const inspect = async (label) => {
  const info = await page.evaluate(() => {
    const covered = document.querySelector('.tile.covered');
    const revealed = document.querySelector('.tile.revealed');
    const root = getComputedStyle(document.documentElement);
    const vars = ['--sf167', '--sf64'];
    // Find the vars used by the covered rule by scanning CSS rules.
    let coveredBgVar = null;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of Array.from(rules)) {
        if (rule.selectorText === '.tile.covered' && rule.style && rule.style.background) {
          coveredBgVar = rule.style.background;
        }
      }
    }
    return {
      theme: document.documentElement.dataset.theme,
      coveredBg: covered ? getComputedStyle(covered).backgroundColor : null,
      revealedBg: revealed ? getComputedStyle(revealed).backgroundColor : null,
      appBg: getComputedStyle(document.querySelector('.app')).backgroundColor,
      coveredRule: coveredBgVar,
      vars: vars.map(v => [v, root.getPropertyValue(v).trim()]),
    };
  });
  console.log(label, JSON.stringify(info, null, 2));
};
await inspect('LIGHT');
await page.locator('.theme-button').click();
await page.waitForTimeout(300);
await inspect('DARK');
await browser.close();
