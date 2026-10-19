const { test, open, upload, download, assert, btn, summary } = require('./lib');
const { execSync } = require('child_process');
const pdfPages = (file) => { const s = require('fs').readFileSync(file).toString('latin1'); return (s.match(/\/Type\s*\/Page[^s]/g) || []).length; };
async function pageCount(buf) {
  const { PDFDocument } = require(process.env.PDFLIB || 'pdf-lib');
  return (await PDFDocument.load(buf)).getPageCount();
}
(async () => {
  console.log('PDF');
  await test('Unir PDF + imagen produce 8 páginas', async p => {
    await open(p, '/pdf/unir-pdf/');
    await upload(p, ['cinco-paginas.pdf', 'dos-paginas.pdf', 'foto-gps.jpg']);
    await p.waitForFunction(() => document.querySelectorAll('.ct-file').length === 3);
    const d = await download(p, btn('Unir en un PDF'));
    assert(d.bytes.slice(0, 4).toString() === '%PDF', 'No es PDF');
    assert(await pageCount(d.bytes) === 8, 'Páginas: ' + await pageCount(d.bytes));
  });
  await test('Dividir PDF por rangos genera ZIP con 2 PDF', async p => {
    await open(p, '/pdf/dividir-pdf/');
    await upload(p, ['cinco-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    const d = await download(p, btn('Dividir PDF'));
    assert(d.name.endsWith('.zip') && d.bytes.slice(0, 2).toString() === 'PK', d.name);
    const n = (d.bytes.toString('latin1').match(/\.pdf/g) || []).length;
    assert(n >= 2, 'Archivos en ZIP: ' + n);
  });
  await test('Rango inválido muestra error comprensible', async p => {
    await open(p, '/pdf/dividir-pdf/');
    await upload(p, ['cinco-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    await p.fill('.ct-app .ct-panel input.ct-mono', '2-9');
    await p.click(btn('Dividir PDF'));
    await p.waitForSelector('.ct-alert--err');
    const t = await p.textContent('.ct-alert--err');
    assert(/5 páginas/.test(t), t);
  });
  await test('Extraer páginas 2 y 4 por rango', async p => {
    await open(p, '/pdf/extraer-paginas-pdf/');
    await upload(p, ['cinco-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    await p.fill('.ct-app .ct-panel input.ct-mono', '2,4');
    await p.press('.ct-app .ct-panel input.ct-mono', 'Tab');
    const d = await download(p, btn('Extraer páginas'));
    assert(await pageCount(d.bytes) === 2, 'Páginas: ' + await pageCount(d.bytes));
  });
  await test('Detectar páginas en blanco encuentra la página 3', async p => {
    await open(p, '/pdf/detectar-paginas-en-blanco/');
    await upload(p, ['cinco-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    await p.click(btn('Detectar páginas en blanco'));
    await p.waitForSelector('.ct-result-area .ct-alert');
    const t = await p.textContent('.ct-result-area');
    assert(/detectadas: 3\./.test(t), t);
    const d = await download(p, btn('Eliminar marcadas y descargar'));
    assert(await pageCount(d.bytes) === 4, 'Páginas: ' + await pageCount(d.bytes));
  });
  await test('Extraer texto obtiene el texto de cada página', async p => {
    await open(p, '/pdf/extraer-texto-pdf/');
    await upload(p, ['dos-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    await p.click(btn('Extraer texto'));
    await p.waitForSelector('.ct-result-area .ct-alert--ok');
    const v = await p.inputValue('.ct-output-box textarea');
    assert(v.includes('Página 2 del documento B'), v.slice(0, 200));
  });
  await test('Comparar PDF detecta la frase añadida', async p => {
    await open(p, '/pdf/comparar-pdf/');
    await upload(p, ['dos-paginas.pdf'], 0);
    await upload(p, ['dos-paginas-v2.pdf'], 1);
    await p.waitForSelector('.ct-diff ins', { timeout: 15000, state: 'attached' });
    const t = (await p.$$eval('.ct-diff ins', els => els.map(e => e.textContent))).join('');
    assert(/Frase añadida/.test(t), t);
  });
  await test('PDF dañado muestra un error claro', async p => {
    await open(p, '/pdf/girar-pdf/');
    await upload(p, ['danado.pdf']);
    await p.waitForSelector('.ct-toast');
    const t = await p.textContent('.ct-toast');
    assert(/dañado|no se ha podido/i.test(t), t);
  });
  await test('PDF protegido se detecta como protegido', async p => {
    await open(p, '/pdf/extraer-paginas-pdf/');
    await upload(p, ['protegido.pdf']);
    await p.waitForSelector('.ct-toast');
    const t = await p.textContent('.ct-toast');
    assert(/contraseña|protegido/i.test(t), t);
  });
  await test('Numerar, marca de agua y comprimir generan PDF', async p => {
    for (const [path, label] of [['/pdf/numerar-paginas-pdf/', 'Numerar páginas'], ['/pdf/marca-de-agua-pdf/', 'Añadir marca de agua']]) {
      await open(p, path);
      await upload(p, ['cinco-paginas.pdf']);
      await p.waitForSelector('.ct-thumb');
      const d = await download(p, btn(label));
      assert(await pageCount(d.bytes) === 5, path);
    }
    await open(p, '/pdf/comprimir-pdf/');
    await upload(p, ['cinco-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    await p.click(btn('Comprimir PDF'));
    await p.waitForSelector('.ct-result-area .ct-alert');
  });
  await test('Imágenes a PDF crea 2 páginas A4', async p => {
    await open(p, '/pdf/imagenes-a-pdf/');
    await upload(p, ['foto-gps.jpg', 'transparente.png']);
    await p.waitForFunction(() => document.querySelectorAll('.ct-file').length === 2);
    const d = await download(p, btn('Crear PDF'));
    assert(await pageCount(d.bytes) === 2, 'Páginas');
  });
  await test('PDF a imágenes convierte la página 1', async p => {
    await open(p, '/pdf/pdf-a-imagenes/');
    await upload(p, ['dos-paginas.pdf']);
    await p.waitForSelector('.ct-thumb');
    await p.fill('.ct-app input.ct-mono', '1');
    const d = await download(p, btn('Convertir a imágenes'));
    assert(d.bytes.slice(1, 4).toString() === 'PNG', d.name);
  });
  await test('Texto a PDF con tildes y aviso de emojis', async p => {
    await open(p, '/pdf/texto-a-pdf/');
    await p.fill('.ct-app textarea', 'Canción con ñ y € 😀');
    const d = await download(p, btn('Crear PDF'));
    assert(d.bytes.slice(0, 4).toString() === '%PDF', 'PDF');
    await p.waitForSelector('.ct-alert--warn');
  });
  await test('Metadatos: lee el título y los elimina', async p => {
    await open(p, '/pdf/metadatos-pdf/');
    await upload(p, ['dos-paginas.pdf']);
    await p.waitForSelector('.ct-app table');
    const v = await p.inputValue('.ct-app .ct-panel input');
    assert(v === 'Documento de prueba B', v);
    const d = await download(p, btn('Eliminar todos los metadatos'));
    assert(!d.bytes.toString('latin1').includes('Autor de prueba'), 'Sigue el autor');
  });
  summary();
})();
