// Análisis automático de accesibilidad con axe-core (WCAG 2.1 A/AA).
// Uso: AXE=/ruta/a/axe.min.js node tests/e2e/a11y.js
// Un análisis automático no sustituye a una revisión manual con lector de pantalla.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.CT_BASE || 'http://localhost:8080';
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const pages = ['/', '/herramientas/', '/pdf/', '/pdf/unir-pdf/', '/calculadoras/calcular-iva/', '/imagenes/comprimir-imagen/', '/texto/contador-palabras/', '/qr/generador-qr/', '/fechas/calendario/', '/empresas/plantilla-factura/', '/productividad/lista-tareas/', '/favoritos/', '/historial/', '/estado/', '/sugerir-herramienta/', '/aviso-legal/', '/no-existe/'];
(async () => {
  const browser = await chromium.launch();
  let total = 0;
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: theme });
    for (const path of pages) {
      const p = await ctx.newPage();
      await p.goto(BASE + path, { waitUntil: 'networkidle' });
      await p.addScriptTag({ content: AXE });
      const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes.slice(0, 3).map(x => x.target.join(' ')).join(' ; '), summary: v.nodes[0].failureSummary.split('\n').slice(1, 2).join('') })));
      if (res.length) { total += res.length; console.log(`${theme} ${path}`); res.forEach(v => console.log(`   [${v.impact}] ${v.id} ×${v.n}: ${v.target} — ${v.summary}`)); }
      await p.close();
    }
    await ctx.close();
  }
  console.log(total ? `\n${total} incidencias` : 'Sin incidencias automáticas WCAG A/AA');
  await browser.close();
  process.exit(total ? 1 : 0);
})();
