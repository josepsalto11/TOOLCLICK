// Pruebas unitarias de las librerías puras (node --test tests/unit/).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const LIB = path.join(__dirname, '..', '..', 'clicktools-core', 'assets', 'js', 'lib');
const FIX = path.join(__dirname, '..', 'fixtures');
const csv = require(path.join(LIB, 'csv.js'));
const diff = require(path.join(LIB, 'diff.js'));
const expr = require(path.join(LIB, 'expr.js'));
const zip = require(path.join(LIB, 'zip.js'));
const gif = require(path.join(LIB, 'gif.js'));
const meta = require(path.join(LIB, 'imgmeta.js'));

test('CSV: comillas, saltos de línea y delimitador detectado', () => {
  const r = csv.parse('nombre;nota\n"Pérez; Ana";"dice ""hola""\nadiós"\n');
  assert.equal(r.delimiter, ';');
  assert.deepEqual(r.rows, [['nombre', 'nota'], ['Pérez; Ana', 'dice "hola"\nadiós']]);
  assert.throws(() => csv.parse('a,"b\n'), /Comillas/);
});

test('CSV: exportación segura frente a fórmulas, salvo números', () => {
  const out = csv.stringify([['=SUMA(A1)', '-5', '+34 600', '@x', 'normal']], ';');
  assert.equal(out, "'=SUMA(A1);-5;'+34 600;'@x;normal");
  assert.equal(csv.stringify([['=1+1']], ',', { formulaSafe: false }), '=1+1');
});

test('Diff: inserciones y borrados por líneas', () => {
  const a = diff.tokenize('uno\ndos\ntres', 'lines');
  const b = diff.tokenize('uno\ntres\ncuatro', 'lines');
  const ops = diff.diff(a, b);
  const flat = JSON.stringify(ops);
  assert.ok(flat.includes('dos') && flat.includes('cuatro'));
});

test('Expresiones: precedencia, funciones, porcentajes y errores', () => {
  assert.equal(expr.calc('2 + 3 * 4'), 14);
  assert.equal(expr.calc('2^3^2'), 512);
  assert.equal(expr.calc('0.1 + 0.2'), 0.3);
  assert.equal(expr.calc('sqrt(16) + max(1, 7, 3)'), 11);
  assert.equal(expr.calc('5!'), 120);
  assert.equal(expr.calc('a * b', { vars: ['a', 'b'], scope: { a: 3, b: 4 } }), 12);
  assert.throws(() => expr.parse('2 +'), /./);
  assert.throws(() => expr.parse('foo(2)'), /desconocido/);
  assert.throws(() => expr.parse('round(1, 2)', { vars: [] }), /argumento/);
  assert.throws(() => expr.parse('constructor', { vars: [] }), /desconocido/);
});

test('ZIP: archivo válido con nombres únicos y CRC correctos', async () => {
  const blob = await zip.create([
    { name: 'a.txt', data: new TextEncoder().encode('hola') },
    { name: 'a.txt', data: new TextEncoder().encode('otra') },
    { name: 'carpeta/ñ.txt', data: new TextEncoder().encode('ñandú') },
  ]);
  const file = path.join(os.tmpdir(), 'ct-unit.zip');
  fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
  const list = execFileSync('unzip', ['-Z1', file]).toString().trim().split('\n');
  assert.equal(list.length, 3);
  assert.notEqual(list[0], list[1]);
  execFileSync('unzip', ['-tq', file]);
  assert.equal(zip.crc32(new TextEncoder().encode('123456789')) >>> 0, 0xCBF43926);
});

test('GIF: cuantización y codificación decodificable', () => {
  const w = 16, h = 8, rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = (i % w) * 16; rgba[i * 4 + 1] = 100; rgba[i * 4 + 2] = 200; rgba[i * 4 + 3] = 255; }
  const pal = gif.quantize(rgba, 16);
  assert.ok(pal.length <= 16 && pal.length > 1);
  const bytes = gif.encode(w, h, pal, [{ indices: gif.mapPixels(rgba, pal), delay: 10 }, { indices: gif.mapPixels(rgba, pal), delay: 10 }], 0);
  assert.equal(Buffer.from(bytes.slice(0, 6)).toString(), 'GIF89a');
  const file = path.join(os.tmpdir(), 'ct-unit.gif');
  fs.writeFileSync(file, bytes);
  const probe = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'csv=p=0', file]).toString().trim();
  assert.equal(probe, '16,8,2');
});

test('Metadatos: lee GPS del JPEG y lo elimina sin recomprimir la imagen', () => {
  const buf = new Uint8Array(fs.readFileSync(path.join(FIX, 'foto-gps.jpg'))).buffer;
  assert.equal(meta.type(new Uint8Array(buf)), 'jpeg');
  const exif = meta.readExif(buf);
  assert.ok(exif && exif.gps, 'debería tener GPS');
  const clean = meta.strip(buf);
  assert.ok(clean.removed > 0);
  const cleanExif = meta.readExif(clean.data);
  assert.ok(!cleanExif || !cleanExif.gps, 'el GPS debería desaparecer');
  const d1 = meta.dims(buf), d2 = meta.dims(clean.data);
  assert.deepEqual(d1, d2);
});

test('Metadatos: identifica PNG con extensión falsa', () => {
  const b = new Uint8Array(fs.readFileSync(path.join(FIX, 'engano.jpg')));
  assert.equal(meta.type(b), 'png');
});

const validate = require(path.join(LIB, 'validate.js'));
test('NIF: DNI, NIE, CIF y errores de control', () => {
  assert.equal(validate.nif('12345678Z').valid, true);
  assert.equal(validate.nif('12345678A').expected, '12345678Z');
  assert.equal(validate.nif('x-1234567-l').type, 'NIE');
  assert.equal(validate.nif('X1234567L').valid, true);
  assert.equal(validate.nif('Q2826000H').valid, true);   // Agencia Tributaria
  assert.equal(validate.nif('A58818501').valid, true);
  assert.equal(validate.nif('A5881850J').valid, false); // A exige dígito de control
  assert.equal(validate.nif('B12345674').entity, 'Sociedad de responsabilidad limitada');
  assert.equal(validate.nif('1234567L').value, '01234567L');
  assert.equal(validate.nif('hola').detail, 'formato');
});
test('IBAN: control ISO 13616 y CCC español', () => {
  assert.equal(validate.iban('ES91 2100 0418 4502 0005 1332').valid, true);
  assert.equal(validate.iban('ES9121000418450200051333').detail, 'control');
  assert.equal(validate.iban('DE89370400440532013000').valid, true);
  assert.equal(validate.iban('GB82WEST12345698765432').formatted, 'GB82 WEST 1234 5698 7654 32');
  assert.equal(validate.iban('ES912100041845020005133').detail, 'longitud');
  // IBAN con control internacional correcto pero CCC español incorrecto.
  const fix = (98 - Number(BigInt(('2100041810' + '0200051332' + '142800').replace(/\s/g, '')) % 97n)).toString().padStart(2, '0');
  assert.equal(validate.iban('ES' + fix + '21000418100200051332').detail, 'ccc');
});
