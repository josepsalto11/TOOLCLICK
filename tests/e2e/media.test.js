const { test, open, upload, download, assert, btn, summary } = require('./lib');
const { execFileSync } = require('child_process');
(async () => {
  console.log('Vídeo y audio');
  await test('Propiedades de vídeo: duración y resolución', async p => {
    await open(p, '/video-audio/propiedades-video/');
    await upload(p, ['video.webm']);
    await p.waitForSelector('.ct-app table');
    const t = await p.textContent('.ct-app table');
    assert(t.includes('320 × 240') && /0:03|3,0/.test(t), t.slice(0, 300));
  });
  await test('Extraer audio de vídeo genera WAV válido', async p => {
    await open(p, '/video-audio/extraer-audio/');
    await upload(p, ['video.webm']);
    await p.waitForSelector('.ct-app .ct-alert--info');
    const d = await download(p, btn('Extraer audio (WAV)'));
    assert(d.bytes.slice(0, 4).toString() === 'RIFF' && d.bytes.slice(8, 12).toString() === 'WAVE', 'No es WAV');
    const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', d.file]).toString();
    assert(Math.abs(parseFloat(info) - 3) < 0.2, 'Duración WAV ' + info);
  });
  await test('Vídeo a GIF genera un GIF animado decodificable', async p => {
    await open(p, '/video-audio/video-a-gif/');
    await upload(p, ['video.webm']);
    await p.waitForSelector('.ct-app .ct-help');
    await p.click(btn('Crear GIF'));
    await p.waitForSelector(btn('Descargar GIF'), { timeout: 30000 });
    const d = await download(p, btn('Descargar GIF'));
    assert(d.bytes.slice(0, 6).toString() === 'GIF89a', 'No es GIF');
    const frames = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,width', '-of', 'csv=p=0', d.file]).toString().trim();
    assert(/^320,30$|^30,320$|320.*30/.test(frames.replace(/\s/g, '')) || frames.includes('30'), 'Fotogramas: ' + frames);
  });
  await test('Convertir audio OGG a WAV', async p => {
    await open(p, '/video-audio/convertir-audio-wav/');
    await upload(p, ['audio.ogg']);
    await p.waitForSelector('.ct-app .ct-alert--info');
    await p.check('.ct-app input[type=checkbox]');
    const d = await download(p, btn('Convertir a WAV'));
    assert(d.bytes.readUInt16LE(22) === 1, 'No es mono');
  });
  await test('Calculadora de bitrate', async p => {
    await open(p, '/video-audio/calcular-bitrate/');
    const t = await p.textContent('.ct-result');
    assert(/4,15 Mbit\/s/.test(t), t.slice(0, 120));
  });
  summary();
})();
