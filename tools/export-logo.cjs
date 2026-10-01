/* สร้าง public/logo.png (1024), logo-640.png และ logo-256.png จาก tools/logo.html (ต้องรัน `npm run dev` ไว้ก่อน)
 * ใช้: node tools/export-logo.cjs [url] [screenshot] */
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
(async () => {
  const url = process.argv[2] || 'http://localhost:5173/tools/logo.html';
  const opts = {};
  if (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')) opts.executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.LOGO_READY === true, null, { timeout: 60000 });
  const [big, med, small] = await page.evaluate(() => [window.LOGO, window.LOGO_MED, window.LOGO_SMALL]);
  const dir = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(dir, 'logo.png'), Buffer.from(big.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dir, 'logo-640.png'), Buffer.from(med.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dir, 'logo-256.png'), Buffer.from(small.split(',')[1], 'base64'));
  if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
  console.log('wrote public/logo.png, logo-640.png, logo-256.png');
  await browser.close();
})();
