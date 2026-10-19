const { test, open, download, assert, btn, summary } = require('./lib');
const { execFileSync } = require('child_process');
(async () => {
  console.log('Empresa, productividad y archivos');
  await test('Factura: totales con descuento, IVA e IRPF y PDF con el total', async p => {
    await open(p, '/empresas/plantilla-factura/');
    const name = p.getByLabel('Nombre o razón social');
    await name.nth(0).fill('Estudio Ejemplo SL');
    await p.getByLabel('NIF / CIF').nth(0).fill('B00000000');
    await name.nth(1).fill('Cliente Prueba');
    await p.getByLabel('Concepto 1').fill('Diseño de logotipo «básico»');
    await p.getByLabel('Cantidad 1').fill('2');
    await p.getByLabel('Precio unitario (sin IVA) 1').fill('100');
    await p.getByLabel('Dto. % 1').fill('10');
    await p.getByLabel('Retención IRPF').selectOption('15');
    await p.waitForTimeout(400);
    const t = await p.textContent('.ct-app .ct-doc');
    // 2 × 100 − 10 % = 180; IVA 21 % = 37,80; IRPF 15 % = 27; total 190,80.
    assert(t.includes('180,00') && t.includes('37,80') && t.includes('27,00') && t.includes('190,80'), t.slice(0, 400));
    const d = await download(p, btn('Descargar PDF'));
    assert(d.bytes.slice(0, 5).toString() === '%PDF-', 'No es PDF');
    const txt = execFileSync('pdftotext', ['-layout', d.file, '-']).toString();
    assert(txt.includes('190,80') && txt.includes('Estudio Ejemplo SL') && txt.includes('logotipo'), txt.slice(0, 500));
    assert(/factura-F\d{4}-001\.pdf/.test(d.name), d.name);
  });
  await test('Factura: recargo de equivalencia y varios tipos de IVA', async p => {
    await open(p, '/empresas/plantilla-factura/');
    await p.getByLabel('Concepto 1').fill('Producto A');
    await p.getByLabel('Precio unitario (sin IVA) 1').fill('100');
    await p.click(btn('Añadir línea'));
    await p.getByLabel('Concepto 2').fill('Producto B');
    await p.getByLabel('Precio unitario (sin IVA) 2').fill('50');
    await p.getByLabel('IVA 2').selectOption('10');
    await p.getByLabel('Aplicar recargo de equivalencia (cliente en ese régimen)').check();
    await p.waitForTimeout(400);
    const t = await p.textContent('.ct-app .ct-doc');
    // 100 × 21 % = 21; RE 5,2 % = 5,20; 50 × 10 % = 5; RE 1,4 % = 0,70; total 181,90.
    assert(t.includes('21,00') && t.includes('5,20') && t.includes('5,00') && t.includes('0,70') && t.includes('181,90'), t.slice(0, 600));
  });
  await test('Presupuesto: exportar e importar JSON conserva las líneas', async p => {
    await open(p, '/empresas/generador-presupuestos/');
    await p.getByLabel('Concepto 1').fill('Reforma de baño');
    await p.getByLabel('Precio unitario (sin IVA) 1').fill('2500');
    await p.getByLabel('IVA 1').selectOption('10');
    await p.waitForTimeout(300);
    const d = await download(p, btn('Exportar datos (JSON)'));
    const json = JSON.parse(d.bytes.toString());
    assert(json.doc.lines[0].desc === 'Reforma de baño', JSON.stringify(json).slice(0, 200));
    await open(p, '/empresas/plantilla-factura/');
    const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click(btn('Importar JSON'))]);
    await chooser.setFiles(d.file);
    await p.waitForTimeout(500);
    assert(await p.getByLabel('Concepto 1').inputValue() === 'Reforma de baño', 'No se importó la línea');
    const t = await p.textContent('.ct-app .ct-doc');
    assert(t.includes('2750,00') || t.includes('2.750,00'), t.slice(0, 400));
  });
  await test('Recibo: importe en letras', async p => {
    await open(p, '/empresas/generador-recibos/');
    await p.getByLabel('Importe recibido').fill('121,05');
    await p.getByLabel('Recibí de (quien paga)').fill('Ana');
    await p.waitForTimeout(300);
    const t = await p.textContent('.ct-app .ct-doc');
    assert(t.includes('ciento veintiún euros con cinco céntimos'), t.slice(0, 300));
    await p.getByLabel('Importe recibido').fill('1000000');
    await p.waitForTimeout(300);
    assert((await p.textContent('.ct-app .ct-doc')).includes('un millón de euros'), 'millón');
    await p.getByLabel('Importe recibido').fill('21001');
    await p.waitForTimeout(300);
    assert((await p.textContent('.ct-app .ct-doc')).includes('veintiún mil un euros'), 'veintiún mil');
  });
  await test('Conversor de productos: IVA y redondeo a ,99', async p => {
    await open(p, '/empresas/conversor-lista-productos/');
    await p.fill('.ct-app textarea >> nth=0', 'Producto;Precio\nCamiseta;12,50\nTaza;8,90\nSin precio;—');
    await p.getByLabel('Operación sobre el precio').selectOption('addvat');
    await p.getByLabel('Redondeo').selectOption('99');
    await p.waitForTimeout(500);
    const out = await p.inputValue('.ct-app .ct-output-box textarea');
    assert(out.includes('Camiseta;15,99') && out.includes('Taza;10,99'), out);
    assert((await p.textContent('.ct-app')).includes('1 filas no tienen'), 'aviso de fila sin precio');
  });
  await test('Calculadora de factura (IVA + IRPF)', async p => {
    await open(p, '/empresas/calculadora-factura/');
    const t = await p.textContent('.ct-app');
    assert(/Total a cobrar/.test(t), t.slice(0, 300));
  });
  await test('Repartir gastos: pagos mínimos', async p => {
    await open(p, '/calculadoras/reparto-gastos/');
    await p.waitForSelector('.ct-app .ct-result');
    const t = await p.textContent('.ct-app');
    assert(/paga a/.test(t) || /saldadas/.test(t), t.slice(0, 400));
  });
  await test('Contador de tiempo: iniciar y pausar', async p => {
    await open(p, '/productividad/tiempo-tareas/');
    await p.getByLabel('Tarea o proyecto').fill('Cliente A');
    await p.click(btn('Añadir tarea'));
    await p.click('.ct-app button[aria-label="Iniciar Cliente A"]');
    await p.waitForSelector('.ct-app button[aria-label="Pausar Cliente A"]');
    await p.click('.ct-app button[aria-label="Pausar Cliente A"]');
    await p.waitForSelector('.ct-app button[aria-label="Iniciar Cliente A"]');
  });
  await test('Lista de tareas: añadir, completar y contar', async p => {
    await open(p, '/productividad/lista-tareas/');
    await p.getByLabel('Nueva tarea').fill('Enviar presupuesto');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(200);
    const t = await p.textContent('.ct-app');
    assert(t.includes('Enviar presupuesto'), t.slice(0, 300));
  });
  await test('Identificar archivo: PNG con extensión .jpg', async p => {
    await open(p, '/archivos/identificar-archivo/');
    const inputs = await p.$$('.ct-app input[type=file]');
    await inputs[0].setInputFiles(require('path').join(__dirname, '..', 'fixtures', 'engano.jpg'));
    await p.waitForSelector('.ct-app table');
    const t = await p.textContent('.ct-app');
    assert(/PNG/.test(t), t.slice(0, 400));
  });
  await test('Renombrar archivos: ZIP con nombres numerados', async p => {
    await open(p, '/archivos/renombrar-archivos/');
    const fx = n => require('path').join(__dirname, '..', 'fixtures', n);
    await (await p.$$('.ct-app input[type=file]'))[0].setInputFiles([fx('foto-gps.jpg'), fx('transparente.png')]);
    await p.getByLabel('Patrón del nuevo nombre').fill('viaje-{n}');
    await p.waitForTimeout(300);
    const btns = await p.$$('.ct-app button');
    let label = null;
    for (const b of btns) { const tx = (await b.innerText()).trim(); if (/ZIP/.test(tx)) { label = tx; break; } }
    assert(label, 'sin botón ZIP');
    const d = await download(p, btn(label));
    const list = execFileSync('unzip', ['-Z1', d.file]).toString();
    assert(list.includes('viaje-001.jpg') && list.includes('viaje-002.png'), list);
  });
  const s = summary();
  process.exit(s.failed ? 1 : 0);
})();
