// Medición orientativa de rendimiento en laboratorio: LCP, CLS y peso transferido, con emulación
// móvil, CPU 4× más lenta y red limitada (~10 Mbit/s, 40 ms). NO sustituye a medir en producción
// (PageSpeed Insights / CrUX), que es donde se comprueban los objetivos LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1.
const { chromium, devices } = require('playwright');
const BASE = process.env.CT_BASE || 'http://localhost:8080';
const pages = ['/', '/herramientas/', '/pdf/unir-pdf/', '/imagenes/comprimir-imagen/', '/calculadoras/calcular-iva/', '/texto/contador-palabras/', '/aviso-legal/'];
(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const path of pages) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0, js = 0;
    cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; });
    cdp.on('Network.responseReceived', e => { if (e.type === 'Script') js++; });
    await p.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls, ttfb: performance.getEntriesByType('navigation')[0].responseStart }));
    rows.push({ página: path, 'TTFB ms': Math.round(m.ttfb), 'LCP ms': Math.round(m.lcp), CLS: m.cls.toFixed(3), 'KB transferidos': Math.round(bytes / 1024), scripts: js });
    await ctx.close();
  }
  console.table(rows);
  await browser.close();
})();
