/*!
 * ClickTools — creación de archivos ZIP sin compresión (método STORE) en el navegador.
 * Suficiente para agrupar descargas (imágenes y PDF ya están comprimidos).
 */
(function (root) {
	'use strict';

	var table = null;
	function crcTable() {
		if (table) { return table; }
		table = new Uint32Array(256);
		for (var n = 0; n < 256; n++) {
			var c = n;
			for (var k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; }
			table[n] = c >>> 0;
		}
		return table;
	}
	function crc32(bytes) {
		var t = crcTable(), c = 0xFFFFFFFF;
		for (var i = 0; i < bytes.length; i++) { c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); }
		return (c ^ 0xFFFFFFFF) >>> 0;
	}
	function toBytes(data) {
		if (data instanceof Uint8Array) { return Promise.resolve(data); }
		if (data instanceof ArrayBuffer) { return Promise.resolve(new Uint8Array(data)); }
		if (typeof data === 'string') { return Promise.resolve(new TextEncoder().encode(data)); }
		if (data && typeof data.arrayBuffer === 'function') { return data.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
		return Promise.reject(new Error('Tipo de datos no admitido en ZIP'));
	}
	function dosTime(d) {
		return {
			time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
			date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
		};
	}
	/** Evita nombres duplicados dentro del ZIP añadiendo (2), (3)… */
	function uniqueNames(files) {
		var used = {};
		return files.map(function (f) {
			var name = String(f.name).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\.(\/|$)/g, '');
			var base = name, i = 2;
			while (used[name.toLowerCase()]) { name = base.replace(/(\.[^./]+)?$/, ' (' + i++ + ')$1'); }
			used[name.toLowerCase()] = 1;
			return { name: name, data: f.data };
		});
	}

	function create(files) {
		files = uniqueNames(files);
		return Promise.all(files.map(function (f) { return toBytes(f.data); })).then(function (datas) {
			var enc = new TextEncoder();
			var now = dosTime(new Date());
			var parts = [], central = [], offset = 0;
			files.forEach(function (f, i) {
				var name = enc.encode(f.name);
				var data = datas[i];
				var crc = crc32(data);
				var local = new DataView(new ArrayBuffer(30));
				local.setUint32(0, 0x04034b50, true);
				local.setUint16(4, 20, true);
				local.setUint16(6, 0x0800, true); // nombres en UTF-8
				local.setUint16(8, 0, true);
				local.setUint16(10, now.time, true);
				local.setUint16(12, now.date, true);
				local.setUint32(14, crc, true);
				local.setUint32(18, data.length, true);
				local.setUint32(22, data.length, true);
				local.setUint16(26, name.length, true);
				local.setUint16(28, 0, true);
				parts.push(new Uint8Array(local.buffer), name, data);
				var cen = new DataView(new ArrayBuffer(46));
				cen.setUint32(0, 0x02014b50, true);
				cen.setUint16(4, 20, true);
				cen.setUint16(6, 20, true);
				cen.setUint16(8, 0x0800, true);
				cen.setUint16(10, 0, true);
				cen.setUint16(12, now.time, true);
				cen.setUint16(14, now.date, true);
				cen.setUint32(16, crc, true);
				cen.setUint32(20, data.length, true);
				cen.setUint32(24, data.length, true);
				cen.setUint16(28, name.length, true);
				cen.setUint32(42, offset, true);
				central.push(new Uint8Array(cen.buffer), name);
				offset += 30 + name.length + data.length;
			});
			var cenSize = central.reduce(function (a, p) { return a + p.length; }, 0);
			var end = new DataView(new ArrayBuffer(22));
			end.setUint32(0, 0x06054b50, true);
			end.setUint16(8, files.length, true);
			end.setUint16(10, files.length, true);
			end.setUint32(12, cenSize, true);
			end.setUint32(16, offset, true);
			return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
		});
	}

	var api = { create: create, crc32: crc32 };
	if (root.ClickTools) { root.ClickTools.zip = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
