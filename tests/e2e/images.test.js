const { test, open, upload, download, assert, btn, summary } = require('./lib');
const sig = b => b.slice(0, 4).toString('hex');
(async () => {
  console.log('Imágenes');
  await test('JPG a PNG convierte y descarga un PNG válido', async p => {
    await open(p, '/imagenes/jpg-a-png/');
    await upload(p, ['foto-gps.jpg']);
    await p.click(btn('Convertir'));
    await p.waitForSelector('.ct-dl');
    const d = await download(p, '.ct-dl');
    assert(sig(d.bytes) === '89504e47', 'No es PNG: ' + d.name);
    assert(d.name === 'foto-gps.png', 'Nombre inesperado ' + d.name);
  });
  await test('PNG a JPG rellena la transparencia y genera JPEG', async p => {
    await open(p, '/imagenes/png-a-jpg/');
    await upload(p, ['transparente.png']);
    await p.click(btn('Convertir'));
    await p.waitForSelector('.ct-dl');
    const d = await download(p, '.ct-dl');
    assert(sig(d.bytes).startsWith('ffd8ff'), 'No es JPEG');
  });
  await test('Comprimir imagen reduce el peso y muestra comparación', async p => {
    await open(p, '/imagenes/comprimir-imagen/');
    await upload(p, ['foto-gps.jpg']);
    await p.click(btn('Comprimir'));
    await p.waitForSelector('.ct-compare');
    const d = await download(p, '.ct-dl');
    assert(d.bytes.length < 130217, 'No se ha reducido: ' + d.bytes.length);
  });
  await test('Redimensionar a 400 px de ancho mantiene la proporción', async p => {
    await open(p, '/imagenes/redimensionar-imagen/');
    await upload(p, ['foto-gps.jpg']);
    await p.fill('.ct-app .ct-panel input[inputmode]', '400');
    await p.click(btn('Redimensionar'));
    await p.waitForSelector('.ct-dl');
    const meta = await p.textContent('.ct-file__meta');
    assert(meta.includes('400×300'), 'Dimensiones: ' + meta);
  });
  await test('Eliminar metadatos quita el EXIF y el GPS', async p => {
    await open(p, '/imagenes/eliminar-metadatos-imagen/');
    await upload(p, ['foto-gps.jpg']);
    await p.click(btn('Eliminar metadatos'));
    await p.waitForSelector('.ct-dl');
    const meta = await p.textContent('.ct-file__meta');
    assert(/GPS 40,41667, -3,7/.test(meta), 'No detecta GPS: ' + meta);
    const d = await download(p, '.ct-dl');
    assert(!d.bytes.includes(Buffer.from('Exif')), 'Sigue teniendo EXIF');
    assert(!d.bytes.includes(Buffer.from('ClickTestCam')), 'Sigue teniendo la cámara');
  });
  await test('Información de imagen detecta extensión engañosa', async p => {
    await open(p, '/imagenes/informacion-imagen/');
    await upload(p, ['engano.jpg']);
    await p.waitForSelector('.ct-app table');
    const t = await p.textContent('.ct-app table');
    assert(t.includes('PNG') && t.includes('no coincide'), 'No avisa: ' + t.slice(0, 200));
  });
  await test('Cambiar DPI a 300 escribe la densidad JFIF', async p => {
    await open(p, '/imagenes/cambiar-dpi/');
    await upload(p, ['foto-gps.jpg']);
    await p.click(btn('Cambiar DPI'));
    await p.waitForSelector('.ct-dl');
    const d = await download(p, '.ct-dl');
    const i = d.bytes.indexOf(Buffer.from('JFIF\0'));
    assert(i > 0 && d.bytes[i + 7] === 1 && d.bytes.readUInt16BE(i + 8) === 300, 'DPI no aplicado');
  });
  await test('WebP a JPG y archivo no admitido rechazado', async p => {
    await open(p, '/imagenes/webp-a-jpg/');
    await upload(p, ['transparente.png']);
    await p.waitForSelector('.ct-toast');
    const t = await p.textContent('.ct-toast');
    assert(/no admitido/i.test(t), 'No rechaza el formato: ' + t);
    await upload(p, ['imagen.webp']);
    await p.click(btn('Convertir'));
    await p.waitForSelector('.ct-dl');
  });
  await test('Imágenes para redes sociales genera 1080×1080', async p => {
    await open(p, '/imagenes/imagenes-redes-sociales/');
    await upload(p, ['foto-gps.jpg', 'transparente.png']);
    await p.click(btn('Adaptar'));
    await p.waitForSelector('.ct-result-area .ct-alert--ok');
    const metas = await p.$$eval('.ct-file__meta', els => els.map(e => e.textContent));
    assert(metas.every(m => m.includes('1080×1080')), metas.join(' | '));
    const d = await download(p, btn('Descargar todo (ZIP)'));
    assert(sig(d.bytes) === '504b0304', 'ZIP no válido');
  });
  await test('Recortar imagen descarga el recorte', async p => {
    await open(p, '/imagenes/recortar-imagen/');
    await upload(p, ['foto-gps.jpg']);
    await p.waitForSelector('.ct-crop__box');
    const d = await download(p, btn('Recortar y descargar'));
    assert(sig(d.bytes).startsWith('ffd8ff'), 'No es JPEG');
  });
  summary();
})();
