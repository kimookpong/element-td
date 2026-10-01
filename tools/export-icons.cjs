/* สร้างไฟล์ public/icons/*.png จาก tools/icons.html (ต้องรัน `npm run dev` ไว้ก่อน)
 * ใช้: node tools/export-icons.cjs [url]   (ต้องมี playwright) */
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
(async () => {
  const url = process.argv[2] || 'http://localhost:5173/tools/icons.html';
  const opts = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')) opts.executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.ICONS_READY === true, null, { timeout: 120000 });
  const icons = await page.evaluate(() => window.ICONS);
  const dir = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(icons)) {
    if (name.startsWith('x_')) continue;
    fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  }
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
  console.log('wrote', Object.keys(icons).filter((n) => !n.startsWith('x_')).length, 'icons to', dir);
  await browser.close();
})();
