// Utilidades comunes para las pruebas de navegador (Playwright).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.CT_BASE || 'http://localhost:8080';
const FIX = path.join(__dirname, '..', 'fixtures');
const OUT = process.env.CT_OUT || path.join(require('os').tmpdir(), 'ct-e2e');
fs.mkdirSync(OUT, { recursive: true });

let passed = 0, failed = 0;
const results = [];
async function withPage(fn, opts = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1280, height: 900 }, ...(opts.context || {}) });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
  try { await fn(page, errors); } finally { await browser.close(); }
}
async function test(name, fn, opts) {
  try {
    await withPage(async (page, errors) => {
      await fn(page);
      // allowHttpErrors: la prueba provoca a propósito una respuesta 4xx que el navegador anota en consola.
      const real = opts && opts.allowHttpErrors ? errors.filter(e => !/Failed to load resource/.test(e)) : errors;
      if (real.length) throw new Error('Errores JS: ' + real.join(' | '));
    }, opts);
    passed++; results.push(['OK', name]); console.log('  ✓ ' + name);
  } catch (e) {
    failed++; results.push(['FALLO', name, e.message.split('\n')[0]]); console.log('  ✗ ' + name + '\n      ' + e.message.split('\n')[0]);
  }
}
async function open(page, p) { const r = await page.goto(BASE + p, { waitUntil: 'networkidle' }); if (r.status() !== 200) throw new Error('HTTP ' + r.status()); await page.waitForSelector('.ct-app[data-ready]', { timeout: 8000 }); }
async function upload(page, files, nth = 0) { const inputs = await page.$$('.ct-app input[type=file]'); await inputs[nth].setInputFiles(files.map(f => path.isAbsolute(f) ? f : path.join(FIX, f))); }
async function download(page, clickSelectorOrFn) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), typeof clickSelectorOrFn === 'function' ? clickSelectorOrFn() : page.click(clickSelectorOrFn)]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  return { name: dl.suggestedFilename(), file, bytes: fs.readFileSync(file) };
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function btn(text) { return `.ct-app button:has-text("${text}")`; }
function summary() { console.log(`\n${passed} correctas, ${failed} con fallos`); return { passed, failed, results }; }
module.exports = { test, open, upload, download, assert, btn, summary, FIX, OUT, BASE };
