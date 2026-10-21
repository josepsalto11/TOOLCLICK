/*!
 * HerramientasClave — metadatos de imagen sin recomprimir: lectura EXIF básica, eliminación
 * de metadatos en JPEG/PNG/WebP, dimensiones desde la cabecera y ajuste de DPI.
 */
(function (root) {
	'use strict';

	function u8(buf) { return buf instanceof Uint8Array ? buf : new Uint8Array(buf); }
	function str(b, off, len) { var s = ''; for (var i = 0; i < len && off + i < b.length; i++) { s += String.fromCharCode(b[off + i]); } return s; }
	function concat(parts) {
		var len = parts.reduce(function (a, p) { return a + p.length; }, 0), out = new Uint8Array(len), o = 0;
		parts.forEach(function (p) { out.set(p, o); o += p.length; });
		return out;
	}
	function crc32(bytes) {
		if (root.ClickTools && root.ClickTools.zip) { return root.ClickTools.zip.crc32(bytes); }
		var c = 0xFFFFFFFF;
		for (var i = 0; i < bytes.length; i++) { c ^= bytes[i]; for (var k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; } }
		return (c ^ 0xFFFFFFFF) >>> 0;
	}
	function type(b) {
		if (b[0] === 0xFF && b[1] === 0xD8) { return 'jpeg'; }
		if (b[0] === 0x89 && str(b, 1, 3) === 'PNG') { return 'png'; }
		if (str(b, 0, 4) === 'RIFF' && str(b, 8, 4) === 'WEBP') { return 'webp'; }
		if (str(b, 0, 3) === 'GIF') { return 'gif'; }
		return null;
	}

	/* ---------- JPEG ---------- */
	function jpegSegments(b) {
		var segs = [], i = 2;
		while (i < b.length) {
			if (b[i] !== 0xFF) { throw new Error('JPEG dañado'); }
			var marker = b[i + 1];
			if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { segs.push({ marker: marker, start: i, end: i + 2 }); i += 2; continue; }
			if (marker === 0xFF) { i++; continue; }
			var len = (b[i + 2] << 8) | b[i + 3];
			segs.push({ marker: marker, start: i, end: i + 2 + len });
			if (marker === 0xDA) { segs.push({ marker: -1, start: i + 2 + len, end: b.length }); break; }
			i += 2 + len;
		}
		return segs;
	}
	function stripJpeg(b, keepIcc) {
		var segs = jpegSegments(b), parts = [b.subarray(0, 2)], removed = [];
		segs.forEach(function (s) {
			var m = s.marker;
			var isApp1 = m === 0xE1, isIptc = m === 0xED, isCom = m === 0xFE, isIcc = m === 0xE2 && str(b, s.start + 4, 11) === 'ICC_PROFILE';
			var otherApp = m >= 0xE3 && m <= 0xEF && m !== 0xEE;
			if (isApp1 || isIptc || isCom || otherApp || (m === 0xE2 && !isIcc) || (isIcc && !keepIcc)) { removed.push(m); return; }
			parts.push(b.subarray(s.start, s.end));
		});
		return { data: concat(parts), removed: removed.length };
	}

	/* ---------- PNG ---------- */
	function pngChunks(b) {
		var chunks = [], i = 8;
		while (i + 8 <= b.length) {
			var len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
			var t = str(b, i + 4, 4);
			chunks.push({ type: t, start: i, end: i + 12 + len, data: b.subarray(i + 8, i + 8 + len) });
			i += 12 + len;
			if (t === 'IEND') { break; }
		}
		return chunks;
	}
	var PNG_META = ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'];
	function stripPng(b) {
		var parts = [b.subarray(0, 8)], removed = 0;
		pngChunks(b).forEach(function (c) { if (PNG_META.indexOf(c.type) >= 0) { removed++; return; } parts.push(b.subarray(c.start, c.end)); });
		return { data: concat(parts), removed: removed };
	}
	function pngChunk(typeStr, data) {
		var out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
		dv.setUint32(0, data.length);
		for (var i = 0; i < 4; i++) { out[4 + i] = typeStr.charCodeAt(i); }
		out.set(data, 8);
		dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
		return out;
	}

	/* ---------- WebP ---------- */
	function stripWebp(b) {
		var parts = [], removed = 0, i = 12, vp8x = null;
		while (i + 8 <= b.length) {
			var t = str(b, i, 4), len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
			var end = i + 8 + len + (len & 1);
			if (t === 'EXIF' || t === 'XMP ') { removed++; } else {
				var chunk = b.slice(i, end);
				if (t === 'VP8X') { vp8x = chunk; }
				parts.push(chunk);
			}
			i = end;
		}
		if (vp8x) { vp8x[8] &= ~0x0C; }
		var body = concat(parts);
		var header = new Uint8Array(12);
		header.set(b.subarray(0, 12));
		new DataView(header.buffer).setUint32(4, body.length + 4, true);
		return { data: concat([header, body]), removed: removed };
	}

	function strip(buf, keepIcc) {
		var b = u8(buf), t = type(b);
		if (t === 'jpeg') { return stripJpeg(b, keepIcc); }
		if (t === 'png') { return stripPng(b); }
		if (t === 'webp') { return stripWebp(b); }
		return null;
	}

	/* ---------- EXIF (lectura básica) ---------- */
	function exifBlock(b) {
		var t = type(b);
		if (t === 'jpeg') {
			var segs = jpegSegments(b);
			for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (s.marker === 0xE1 && str(b, s.start + 4, 6) === 'Exif\0\0') { return b.subarray(s.start + 10, s.end); } }
		} else if (t === 'png') {
			var c = pngChunks(b).filter(function (x) { return x.type === 'eXIf'; })[0];
			if (c) { return c.data; }
		} else if (t === 'webp') {
			var j = 12;
			while (j + 8 <= b.length) {
				var tt = str(b, j, 4), len = b[j + 4] | (b[j + 5] << 8) | (b[j + 6] << 16) | (b[j + 7] << 24);
				if (tt === 'EXIF') { var d = b.subarray(j + 8, j + 8 + len); return str(d, 0, 6) === 'Exif\0\0' ? d.subarray(6) : d; }
				j += 8 + len + (len & 1);
			}
		}
		return null;
	}
	function readExif(buf) {
		var b = u8(buf), t = exifBlock(b);
		if (!t || t.length < 8) { return null; }
		var le = str(t, 0, 2) === 'II';
		var dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
		var g16 = function (o) { return dv.getUint16(o, le); }, g32 = function (o) { return dv.getUint32(o, le); };
		var out = {};
		var NAMES = { 0x010F: 'make', 0x0110: 'model', 0x0112: 'orientation', 0x0131: 'software', 0x0132: 'datetime', 0x013B: 'artist', 0x8298: 'copyright', 0x9003: 'taken', 0xA002: 'pixelX', 0xA003: 'pixelY', 0xA434: 'lens', 0x0002: 'lat', 0x0001: 'latRef', 0x0004: 'lng', 0x0003: 'lngRef' };
		var readVal = function (typ, count, valOff) {
			var size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[typ] || 1;
			var off = size * count > 4 ? g32(valOff) : valOff;
			if (off + size * count > t.length) { return null; }
			if (typ === 2) { return str(t, off, count).replace(/\0+$/, '').trim(); }
			if (typ === 3) { return g16(off); }
			if (typ === 4) { return g32(off); }
			if (typ === 5) { var arr = []; for (var i = 0; i < count; i++) { var den = g32(off + i * 8 + 4); arr.push(den ? g32(off + i * 8) / den : 0); } return arr; }
			return null;
		};
		var readIfd = function (off, gps, depth) {
			if (depth > 3 || off + 2 > t.length) { return; }
			var n = g16(off);
			for (var i = 0; i < n; i++) {
				var e = off + 2 + i * 12;
				if (e + 12 > t.length) { return; }
				var tag = g16(e), typ = g16(e + 2), count = g32(e + 4);
				if (!gps && tag === 0x8769) { readIfd(g32(e + 8), false, depth + 1); continue; }
				if (!gps && tag === 0x8825) { out.hasGps = true; readIfd(g32(e + 8), true, depth + 1); continue; }
				var name = NAMES[tag];
				if (!name || (gps !== (tag <= 4))) { continue; }
				out[name] = readVal(typ, count, e + 8);
			}
		};
		try { readIfd(g32(4), false, 0); } catch (e) { /* EXIF parcial */ }
		if (out.lat && out.lng && out.lat.length === 3) {
			var dms = function (a) { return a[0] + a[1] / 60 + a[2] / 3600; };
			out.gps = { lat: dms(out.lat) * (out.latRef === 'S' ? -1 : 1), lng: dms(out.lng) * (out.lngRef === 'W' ? -1 : 1) };
		}
		delete out.lat; delete out.lng; delete out.latRef; delete out.lngRef;
		return out;
	}

	/* ---------- Dimensiones desde cabecera ---------- */
	function dims(buf) {
		var b = u8(buf), t = type(b);
		try {
			if (t === 'png') { var dv = new DataView(b.buffer, b.byteOffset); return { w: dv.getUint32(16), h: dv.getUint32(20) }; }
			if (t === 'gif') { return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) }; }
			if (t === 'jpeg') {
				var segs = jpegSegments(b);
				for (var i = 0; i < segs.length; i++) { var m = segs[i].marker; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) { var o = segs[i].start; return { h: (b[o + 5] << 8) | b[o + 6], w: (b[o + 7] << 8) | b[o + 8] }; } }
			}
			if (t === 'webp') {
				var c = str(b, 12, 4);
				if (c === 'VP8X') { return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }; }
				if (c === 'VP8 ') { return { w: (b[26] | (b[27] << 8)) & 0x3FFF, h: (b[28] | (b[29] << 8)) & 0x3FFF }; }
				if (c === 'VP8L') { var bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (bits & 0x3FFF) + 1, h: ((bits >> 14) & 0x3FFF) + 1 }; }
			}
		} catch (e) { return null; }
		return null;
	}

	/* ---------- DPI ---------- */
	function readDpi(buf) {
		var b = u8(buf), t = type(b);
		if (t === 'jpeg') {
			var s = jpegSegments(b).filter(function (x) { return x.marker === 0xE0 && str(b, x.start + 4, 5) === 'JFIF\0'; })[0];
			if (s) { var o = s.start + 4; var unit = b[o + 7], x = (b[o + 8] << 8) | b[o + 9]; if (unit === 1) { return x; } if (unit === 2) { return Math.round(x * 2.54); } }
		} else if (t === 'png') {
			var p = pngChunks(b).filter(function (c) { return c.type === 'pHYs'; })[0];
			if (p && p.data[8] === 1) { return Math.round(new DataView(p.data.buffer, p.data.byteOffset).getUint32(0) * 0.0254); }
		}
		return null;
	}
	function setDpi(buf, dpi) {
		var b = u8(buf), t = type(b);
		dpi = Math.max(1, Math.min(65535, Math.round(dpi)));
		if (t === 'jpeg') {
			var segs = jpegSegments(b);
			var jfif = segs.filter(function (x) { return x.marker === 0xE0 && str(b, x.start + 4, 5) === 'JFIF\0'; })[0];
			var out;
			if (jfif) {
				out = b.slice();
				var o = jfif.start + 4;
				out[o + 7] = 1; out[o + 8] = dpi >> 8; out[o + 9] = dpi & 255; out[o + 10] = dpi >> 8; out[o + 11] = dpi & 255;
			} else {
				var app0 = new Uint8Array([0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x01, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0x00, 0x00]);
				out = concat([b.subarray(0, 2), app0, b.subarray(2)]);
			}
			// EXIF también puede llevar resolución; los lectores suelen priorizar JFIF o EXIF según el programa.
			return out;
		}
		if (t === 'png') {
			var ppm = Math.round(dpi / 0.0254);
			var data = new Uint8Array(9), dv = new DataView(data.buffer);
			dv.setUint32(0, ppm); dv.setUint32(4, ppm); data[8] = 1;
			var chunk = pngChunk('pHYs', data);
			var parts = [b.subarray(0, 8)];
			pngChunks(b).forEach(function (c) {
				if (c.type === 'pHYs') { return; }
				parts.push(b.subarray(c.start, c.end));
				if (c.type === 'IHDR') { parts.push(chunk); }
			});
			return concat(parts);
		}
		throw new Error('Formato no compatible para cambiar los DPI (solo JPEG y PNG).');
	}

	var api = { type: type, strip: strip, readExif: readExif, dims: dims, readDpi: readDpi, setDpi: setDpi, pngChunks: pngChunks };
	if (root.ClickTools) { root.ClickTools.imgmeta = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
