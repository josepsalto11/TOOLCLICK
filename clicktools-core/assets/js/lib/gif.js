/*!
 * HerramientasClave — codificador GIF89a (paleta global de hasta 256 colores, LZW) y
 * cuantización por corte de la mediana.
 */
(function (root) {
	'use strict';

	/** Paleta de hasta maxColors colores a partir de muestras RGBA. */
	function quantize(samples, maxColors) {
		var pts = [];
		for (var i = 0; i < samples.length; i += 4) { pts.push([samples[i], samples[i + 1], samples[i + 2]]); }
		if (!pts.length) { return [[0, 0, 0]]; }
		var boxes = [pts];
		while (boxes.length < maxColors) {
			var bi = -1, bestRange = -1, bestCh = 0;
			boxes.forEach(function (b, idx) {
				if (b.length < 2) { return; }
				for (var ch = 0; ch < 3; ch++) {
					var mn = 255, mx = 0;
					for (var k = 0; k < b.length; k++) { var v = b[k][ch]; if (v < mn) { mn = v; } if (v > mx) { mx = v; } }
					if (mx - mn > bestRange) { bestRange = mx - mn; bi = idx; bestCh = ch; }
				}
			});
			if (bi < 0 || bestRange <= 0) { break; }
			var box = boxes[bi];
			box.sort(function (a, b) { return a[bestCh] - b[bestCh]; });
			var mid = box.length >> 1;
			boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
		}
		return boxes.map(function (b) {
			var r = 0, g = 0, bl = 0;
			b.forEach(function (p) { r += p[0]; g += p[1]; bl += p[2]; });
			return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
		});
	}

	/** Asigna cada píxel al color más cercano (con caché RGB555). */
	function mapPixels(rgba, palette) {
		var out = new Uint8Array(rgba.length / 4), cache = new Int16Array(32768).fill(-1);
		for (var i = 0, j = 0; i < rgba.length; i += 4, j++) {
			var r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
			var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
			var idx = cache[key];
			if (idx < 0) {
				var best = 0, bd = Infinity;
				for (var p = 0; p < palette.length; p++) {
					var dr = r - palette[p][0], dg = g - palette[p][1], db = b - palette[p][2];
					var d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
					if (d < bd) { bd = d; best = p; }
				}
				idx = cache[key] = best;
			}
			out[j] = idx;
		}
		return out;
	}

	function ByteOut() { this.data = []; }
	ByteOut.prototype.byte = function (b) { this.data.push(b & 255); };
	ByteOut.prototype.word = function (w) { this.byte(w); this.byte(w >> 8); };
	ByteOut.prototype.str = function (s) { for (var i = 0; i < s.length; i++) { this.byte(s.charCodeAt(i)); } };

	function lzw(indices, minCode, out) {
		var clear = 1 << minCode, eoi = clear + 1;
		var codeSize = minCode + 1, next = eoi + 1;
		var dict = new Map();
		var bitBuf = 0, bitCount = 0, block = [];
		var emit = function (code) {
			bitBuf |= code << bitCount; bitCount += codeSize;
			while (bitCount >= 8) { block.push(bitBuf & 255); bitBuf >>= 8; bitCount -= 8; if (block.length === 255) { out.byte(255); block.forEach(function (b) { out.byte(b); }); block = []; } }
		};
		out.byte(minCode);
		emit(clear);
		var prefix = indices[0];
		for (var i = 1; i < indices.length; i++) {
			var k = indices[i], key = prefix * 4096 + k;
			var found = dict.get(key);
			if (found !== undefined) { prefix = found; continue; }
			emit(prefix);
			if (next < 4096) {
				dict.set(key, next++);
				if (next > (1 << codeSize) && codeSize < 12) { codeSize++; }
			} else {
				emit(clear); dict.clear(); codeSize = minCode + 1; next = eoi + 1;
			}
			prefix = k;
		}
		emit(prefix);
		emit(eoi);
		if (bitCount > 0) { block.push(bitBuf & 255); }
		if (block.length) { out.byte(block.length); block.forEach(function (b) { out.byte(b); }); }
		out.byte(0);
	}

	/** frames: [{ indices: Uint8Array, delay: centésimas }] */
	function encode(width, height, palette, frames, loop) {
		var out = new ByteOut();
		var size = 2;
		while (size < palette.length) { size <<= 1; }
		var bits = Math.log2(size);
		out.str('GIF89a');
		out.word(width); out.word(height);
		out.byte(0x80 | ((bits - 1) << 4) | (bits - 1));
		out.byte(0); out.byte(0);
		for (var i = 0; i < size; i++) { var c = palette[i] || [0, 0, 0]; out.byte(c[0]); out.byte(c[1]); out.byte(c[2]); }
		out.byte(0x21); out.byte(0xFF); out.byte(11); out.str('NETSCAPE2.0'); out.byte(3); out.byte(1); out.word(loop || 0); out.byte(0);
		frames.forEach(function (f) {
			out.byte(0x21); out.byte(0xF9); out.byte(4); out.byte(0); out.word(Math.max(2, Math.round(f.delay))); out.byte(0); out.byte(0);
			out.byte(0x2C); out.word(0); out.word(0); out.word(width); out.word(height); out.byte(0);
			lzw(f.indices, Math.max(2, bits), out);
		});
		out.byte(0x3B);
		return new Uint8Array(out.data);
	}

	var api = { quantize: quantize, mapPixels: mapPixels, encode: encode };
	if (root.ClickTools) { root.ClickTools.gif = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
