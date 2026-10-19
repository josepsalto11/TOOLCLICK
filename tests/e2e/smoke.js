// Recorre todas las herramientas públicas del catálogo y las páginas principales.
// Comprueba: estado HTTP 200, montaje del motor (data-ready), sin errores de JS ni de consola.
// Uso: node tests/e2e/smoke.js [filtro-de-slug]
const { chromium } = require('playwright');
(async () => {
  const base = process.env.CT_BASE || 'http://localhost:8080';
  const filter = process.argv[2] || '';
  const res = await fetch(base + '/wp-json/clicktools/v1/catalog');
  const { tools } = await res.json();
  const pages = ['/', '/herramientas/', '/favoritos/', '/historial/', '/estado/', '/no-existe-esta-pagina/', '/pdf/', '/empresas/', '/productividad/', '/archivos/'];
  const urls = (filter ? [] : pages.map(p => ({ s: p, u: base + p, page: true }))).concat(tools.filter(t => t.s.includes(filter)).map(t => ({ s: t.s, u: t.u, server: t.p === 'server' })));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let fail = 0;
  for (const it of urls) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    let status = 0;
    try {
      const r = await page.goto(it.u, { waitUntil: 'load', timeout: 20000 });
      status = r.status();
      if (!it.page) {
        await page.waitForSelector('.ct-app[data-ready="1"]', { timeout: 8000 }).catch(() => errors.push('no data-ready'));
        // Ejemplos que muestran a propósito un resultado de error.
        const demoErrors = ['validador-json-schema'];
        const err = demoErrors.includes(it.s) ? null : await page.$('.ct-app .ct-alert--err');
        if (err) errors.push('alert: ' + (await err.innerText()).slice(0, 120));
      }
    } catch (e) { errors.push('goto: ' + e.message.split('\n')[0]); }
    const expected = it.s === '/no-existe-esta-pagina/' ? 404 : 200;
    // Un 404 provoca un error de consola del propio navegador: no cuenta como fallo.
    const real = errors.filter(e => !(expected === 404 && /404/.test(e)));
    if (status !== expected || real.length) { fail++; console.log('FAIL', it.s, status, real.join(' | ')); }
    await page.close();
  }
  console.log(`\n${urls.length - fail}/${urls.length} OK`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
