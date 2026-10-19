// Herramientas de servidor. Requiere activar «Procesamiento en servidor» y tener instalados
// LibreOffice, Ghostscript, qpdf y FFmpeg en la máquina de pruebas.
const { test, open, upload, download, assert, btn, summary } = require('./lib');
const { execFileSync } = require('child_process');
const fs = require('fs');

async function run(p, path, files, setup) {
  await open(p, path);
  await upload(p, files);
  if (setup) await setup(p);
  await p.check('.ct-app input[type=checkbox]');
  return download(p, btn('Procesar en el servidor'));
}
const pdfPages = f => parseInt(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString())[1], 10);

(async () => {
  console.log('Herramientas de servidor');
  await test('Word a PDF (LibreOffice) conserva el texto con acentos', async p => {
    const d = await run(p, '/pdf/docx-a-pdf/', ['carta.docx']);
    assert(d.bytes.slice(0, 5).toString() === '%PDF-', 'No es PDF');
    const txt = execFileSync('pdftotext', [d.file, '-']).toString();
    assert(txt.includes('pingüino') && txt.includes('España'), txt.slice(0, 200));
  });
  await test('PDF a Word (LibreOffice) genera un DOCX', async p => {
    const d = await run(p, '/pdf/pdf-a-docx/', ['dos-paginas.pdf']);
    assert(d.bytes.slice(0, 2).toString() === 'PK' && /\.docx$/.test(d.name), d.name);
  });
  await test('Proteger y desbloquear PDF (qpdf)', async p => {
    const d = await run(p, '/pdf/proteger-pdf/', ['dos-paginas.pdf'], async pg => {
      await pg.getByLabel('Contraseña para abrir el PDF').fill('Secreta-123');
      await pg.getByLabel('Repite la contraseña').fill('Secreta-123');
    });
    const info = execFileSync('qpdf', ['--show-encryption', '--password=Secreta-123', d.file]).toString();
    assert(/R = [456]/.test(info) || /AES/.test(info), info);
    let failed = false;
    try { execFileSync('qpdf', ['--check', d.file], { stdio: 'pipe' }); } catch (e) { failed = true; }
    assert(failed, 'Se abre sin contraseña');
    const u = await run(p, '/pdf/desbloquear-pdf/', [d.file], async pg => { await pg.getByLabel('Contraseña actual del PDF').fill('Secreta-123'); });
    assert(!execFileSync('qpdf', ['--show-encryption', u.file]).toString().includes('R ='), 'Sigue cifrado');
    assert(pdfPages(u.file) === 2, 'páginas');
  });
  await test('Desbloquear con contraseña incorrecta muestra un error claro', async p => {
    await open(p, '/pdf/desbloquear-pdf/');
    await upload(p, ['protegido.pdf']);
    await p.getByLabel('Contraseña actual del PDF').fill('mala');
    await p.check('.ct-app input[type=checkbox]');
    await p.click(btn('Procesar en el servidor'));
    await p.waitForSelector('.ct-app .ct-alert--err', { timeout: 30000 });
    const t = await p.textContent('.ct-app .ct-alert--err');
    assert(/contraseña/i.test(t), t);
  }, { allowHttpErrors: true });
  await test('Compresión avanzada de PDF (Ghostscript)', async p => {
    const d = await run(p, '/pdf/comprimir-pdf-avanzado/', ['cinco-paginas.pdf']);
    assert(d.bytes.slice(0, 5).toString() === '%PDF-' && pdfPages(d.file) === 5, 'PDF inválido');
  });
  await test('Convertir vídeo WebM a MP4 (FFmpeg)', async p => {
    const d = await run(p, '/video-audio/convertir-video/', ['video.webm']);
    const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', d.file]).toString();
    assert(/h264/.test(info) && /\.mp4$/.test(d.name), info + ' ' + d.name);
  });
  await test('Comprimir vídeo a 360p (FFmpeg)', async p => {
    const d = await run(p, '/video-audio/comprimir-video/', ['video.webm'], async pg => { await pg.getByLabel('Resolución máxima').selectOption('360'); });
    const h = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', d.file]).toString().trim();
    assert(parseInt(h, 10) <= 360, 'altura ' + h);
  });
  await test('Convertir audio OGG a MP3 (FFmpeg)', async p => {
    const d = await run(p, '/video-audio/convertir-audio/', ['audio.ogg']);
    const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', d.file]).toString();
    assert(/mp3/.test(info), info);
  });
  await test('Un archivo con contenido falso se rechaza (JPG renombrado a .docx)', async p => {
    const fake = require('path').join(require('os').tmpdir(), 'falso.docx');
    fs.copyFileSync(require('path').join(__dirname, '..', 'fixtures', 'foto-gps.jpg'), fake);
    await open(p, '/pdf/docx-a-pdf/');
    await upload(p, [fake]);
    await p.check('.ct-app input[type=checkbox]');
    await p.click(btn('Procesar en el servidor'));
    await p.waitForSelector('.ct-app .ct-alert--err', { timeout: 30000 });
    const t = await p.textContent('.ct-app .ct-alert--err');
    assert(/formato|tipo|contenido/i.test(t), t);
  }, { allowHttpErrors: true });
  await test('No quedan archivos temporales tras procesar', async () => {
    const dir = process.env.CT_TMP_DIR;
    if (!dir) return;
    const left = fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => !/^(\.htaccess|index\.php|web\.config)$/.test(n)) : [];
    assert(!left.length, 'Restos: ' + left.join(', '));
  });
  const s = summary();
  process.exit(s.failed ? 1 : 0);
})();
