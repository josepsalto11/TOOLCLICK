// Uso: node tests/e2e/quick.js <ruta> [selector a esperar] [captura.png]
const { chromium } = require('playwright');
(async () => {
  const base = process.env.CT_BASE || 'http://localhost:8080';
  const [path = '/', waitFor, shot] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const res = await page.goto(base + path, { waitUntil: 'networkidle' });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 5000 }).catch(e => errors.push('wait: ' + e.message));
  const text = await page.evaluate(() => (document.querySelector('.ct-app') || document.body).innerText.slice(0, 1500));
  console.log('STATUS', res.status());
  console.log(text);
  if (shot) await page.screenshot({ path: shot, fullPage: true });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
