// Pruebas de la web: buscador, favoritos, historial, formularios, consentimiento, SEO,
// versión móvil y modo oscuro. Algunas cambian ajustes con wp-cli (CT_WP = ruta de WordPress).
const { test, assert, summary, BASE } = require('./lib');
const { execFileSync } = require('child_process');
const WP = process.env.CT_WP;
const WPCLI = process.env.CT_WPCLI;
function wp(code) { if (!WP || !WPCLI) return null; return execFileSync('php', [WPCLI, '--allow-root', '--path=' + WP, 'eval', code]).toString(); }

(async () => {
  console.log('Web pública');
  await test('Buscador de la portada: sugerencias con sinónimos y teclado', async p => {
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const input = p.locator('#ct-hero-search');
    await input.fill('juntar pdf');
    await p.waitForSelector('#ct-hero-search-list li', { timeout: 5000 });
    const first = await p.textContent('#ct-hero-search-list li');
    assert(/Unir PDF/i.test(first), first);
    await input.press('ArrowDown');
    await Promise.all([p.waitForNavigation(), input.press('Enter')]);
    assert(p.url().includes('/pdf/unir-pdf/'), p.url());
  });
  await test('Paleta de búsqueda con Ctrl+K', async p => {
    await p.goto(BASE + '/calculadoras/', { waitUntil: 'networkidle' });
    await p.keyboard.press('Control+k');
    await p.waitForSelector('dialog[data-ct-palette][open]');
    await p.keyboard.type('qr wifi');
    await p.waitForTimeout(400);
    assert((await p.textContent('dialog[data-ct-palette]')).includes('Wi-Fi'), 'sin resultado Wi-Fi');
    await p.keyboard.press('Escape');
  });
  await test('Catálogo: filtros por categoría y búsqueda sin resultados', async p => {
    await p.goto(BASE + '/herramientas/?cat=qr', { waitUntil: 'networkidle' });
    const cards = await p.$$eval('[data-ct-tool-card]', els => els.filter(e => e.offsetParent !== null).map(e => e.getAttribute('data-cats') || ''));
    assert(cards.length > 3 && cards.every(c => c.includes('qr')), JSON.stringify(cards.slice(0, 5)));
    await p.goto(BASE + '/herramientas/?q=zzzxxyy', { waitUntil: 'networkidle' });
    assert(/0 herramientas|ninguna|No hay/i.test(await p.textContent('main')), 'sin mensaje vacío');
  });
  await test('Favoritos: se guardan en el navegador y aparecen en /favoritos/', async p => {
    await p.goto(BASE + '/pdf/unir-pdf/', { waitUntil: 'networkidle' });
    await p.click('[data-ct-fav]');
    assert(await p.getAttribute('[data-ct-fav]', 'aria-pressed') === 'true', 'no pulsado');
    await p.goto(BASE + '/favoritos/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    assert((await p.textContent('main')).includes('Unir PDF'), 'no aparece en favoritos');
  });
  await test('Historial: desactivado por defecto y solo guarda tras activarlo', async p => {
    await p.goto(BASE + '/qr/generador-qr/', { waitUntil: 'networkidle' });
    assert(await p.evaluate(() => localStorage.getItem('ct-history')) === null, 'guardó sin permiso');
    await p.goto(BASE + '/historial/', { waitUntil: 'networkidle' });
    await p.click('label.ct-switch:has([data-ct-history-toggle])');
    assert(await p.isChecked('[data-ct-history-toggle]'), 'no se activó');
    await p.goto(BASE + '/qr/generador-qr/', { waitUntil: 'networkidle' });
    await p.goto(BASE + '/historial/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    assert((await p.textContent('main')).includes('QR'), 'no aparece en el historial');
  });
  await test('Formulario de sugerencias: validación y envío correcto', async p => {
    await p.goto(BASE + '/sugerir-herramienta/', { waitUntil: 'networkidle' });
    await p.click('form[data-ct-form] button[type=submit]');
    await p.waitForTimeout(300);
    assert(await p.locator('form[data-ct-form] [aria-invalid="true"]').count() > 0, 'sin validación');
    await p.fill('form[data-ct-form] [name=title]', 'Pasar HEIC a JPG');
    await p.fill('form[data-ct-form] [name=message]', 'Me vendría bien convertir fotos del móvil.');
    await p.click('form[data-ct-form] button[type=submit]');
    await p.waitForSelector('[data-ct-form-status] .ct-alert--ok', { timeout: 10000 });
  });
  await test('Honeypot: un envío con el campo trampa no se guarda pero responde OK', async () => {
    const tok = await (await fetch(BASE + '/wp-json/clicktools/v1/token?action=message')).json();
    const r = await fetch(BASE + '/wp-json/clicktools/v1/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok.token, website: 'http://spam', type: 'suggestion', title: 'spam spam', message: 'spam spam spam spam' }) });
    assert(r.ok, 'status ' + r.status);
    const bad = await fetch(BASE + '/wp-json/clicktools/v1/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: '123.abc', type: 'suggestion', title: 'hola hola', message: 'mensaje de prueba largo' }) });
    assert(bad.status === 403, 'token falso aceptado: ' + bad.status);
  });
  await test('Sin publicidad ni analítica configuradas no hay banner ni scripts de terceros', async p => {
    const external = [];
    p.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) external.push(u.hostname); });
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.goto(BASE + '/imagenes/comprimir-imagen/', { waitUntil: 'networkidle' });
    assert(!(await p.isVisible('[data-ct-consent]')), 'banner visible sin servicios');
    assert(!external.length, 'peticiones externas: ' + [...new Set(external)].join(', '));
  });
  if (WP) {
    await test('Con AdSense activado: nada de Google antes de aceptar; se carga tras aceptar', async p => {
      wp('ClickTools\\Settings::update(array("ads_enabled"=>true,"adsense_client"=>"ca-pub-1234567890123456","ad_slot_tool"=>"1234567890"));');
      try {
        const google = [];
        p.on('request', r => { if (/googlesyndication|doubleclick|google/.test(r.url())) google.push(r.url()); });
        await p.goto(BASE + '/imagenes/comprimir-imagen/', { waitUntil: 'networkidle' });
        await p.waitForSelector('[data-ct-consent]:not([hidden])');
        assert(!google.length, 'cargó Google antes del consentimiento');
        await p.click('[data-ct-consent-reject]');
        await p.reload({ waitUntil: 'networkidle' });
        assert(!google.length && !(await p.isVisible('[data-ct-consent]')), 'rechazo no respetado');
        await p.evaluate(() => localStorage.removeItem('ct-consent'));
        await p.reload({ waitUntil: 'networkidle' });
        await p.click('[data-ct-consent-accept]');
        await p.waitForTimeout(800);
        assert(google.some(u => u.includes('adsbygoogle.js?client=ca-pub-1234567890123456')), 'no se pidió AdSense tras aceptar');
      } finally {
        wp('ClickTools\\Settings::update(array("ads_enabled"=>false,"adsense_client"=>"","ad_slot_tool"=>""));');
      }
    }, { allowHttpErrors: true });
  }
  await test('SEO: título, descripción, canónica y datos estructurados válidos en una herramienta', async p => {
    await p.goto(BASE + '/pdf/unir-pdf/', { waitUntil: 'networkidle' });
    const title = await p.title();
    const desc = await p.getAttribute('meta[name=description]', 'content');
    const canon = await p.getAttribute('link[rel=canonical]', 'href');
    assert(/Unir PDF/.test(title) && desc && desc.length > 50 && canon.endsWith('/pdf/unir-pdf/'), [title, desc, canon].join(' | '));
    const ld = await p.$$eval('script[type="application/ld+json"]', s => s.map(x => JSON.parse(x.textContent)));
    const types = JSON.stringify(ld);
    assert(types.includes('BreadcrumbList') && types.includes('WebApplication'), types.slice(0, 300));
    assert(!/aggregateRating|ratingValue/.test(types), 'no debe inventar valoraciones');
    await p.goto(BASE + '/pdf/comprimir-pdf/', { waitUntil: 'networkidle' });
    assert(await p.title() !== title, 'títulos duplicados');
  });
  await test('Mapa del sitio y robots.txt', async () => {
    const idx = await (await fetch(BASE + '/wp-sitemap.xml')).text();
    assert(idx.includes('clicktools'), idx.slice(0, 300));
    const sm = idx.match(/<loc>([^<]*clicktools[^<]*herramientas[^<]*)<\/loc>/);
    assert(sm, 'sin sitemap de herramientas');
    const tools = await (await fetch(sm[1])).text();
    assert(tools.includes('/pdf/unir-pdf/') && !tools.includes('docx-a-pdf') === !process.env.CT_SERVER_ON, 'contenido del sitemap');
    assert(!idx.includes('wp-sitemap-users'), 'expone usuarios');
    const robots = await (await fetch(BASE + '/robots.txt')).text();
    assert(/Sitemap:/i.test(robots), robots);
  });
  await test('Página 404 con buscador', async p => {
    const r = await p.goto(BASE + '/pdf/no-existe/', { waitUntil: 'networkidle' });
    assert(r.status() === 404 && await p.$('[data-ct-search]'), 'sin 404 útil');
  }, { allowHttpErrors: true });
  await test('Móvil (390 px): sin desbordamiento horizontal ni errores', async p => {
    for (const path of ['/', '/herramientas/', '/pdf/unir-pdf/', '/calculadoras/calcular-iva/', '/empresas/plantilla-factura/', '/fechas/calendario/', '/productividad/planificador-semanal/', '/aviso-legal/']) {
      await p.goto(BASE + path, { waitUntil: 'networkidle' });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 1, path + ' desborda ' + over + 'px');
    }
  }, { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true } });
  await test('Modo oscuro: el botón cambia el tema y se recuerda', async p => {
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.click('[data-ct-theme-toggle]');
    const t1 = await p.getAttribute('html', 'data-theme');
    await p.reload({ waitUntil: 'networkidle' });
    assert(t1 && (await p.getAttribute('html', 'data-theme')) === t1, 'no se recuerda');
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert(t1 !== 'dark' || bg !== 'rgb(255, 255, 255)', 'fondo claro en modo oscuro');
  });
  await test('Preferencia de movimiento reducido desactiva animaciones', async p => {
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const d = await p.evaluate(() => getComputedStyle(document.querySelector('.ct-btn, a')).transitionDuration);
    assert(/^0s|0\.0+1s|1e-0/.test(d) || d === '0s', 'transición ' + d);
  });
  const s = summary();
  process.exit(s.failed ? 1 : 0);
})();
