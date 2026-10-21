/*!
 * HerramientasClave — diferencias entre secuencias (algoritmo de Myers, O(ND)).
 */
(function (root) {
	'use strict';

	/**
	 * Devuelve una lista de operaciones {t: '=', '+', '-', v: valor}.
	 * a, b: arrays de tokens; eq: función de igualdad opcional.
	 */
	function diff(a, b, eq) {
		eq = eq || function (x, y) { return x === y; };
		var n = a.length, m = b.length;
		// Recorta prefijo y sufijo comunes para acelerar.
		var start = 0;
		while (start < n && start < m && eq(a[start], b[start])) { start++; }
		var endA = n, endB = m;
		while (endA > start && endB > start && eq(a[endA - 1], b[endB - 1])) { endA--; endB--; }
		var A = a.slice(start, endA), B = b.slice(start, endB);
		var core = myers(A, B, eq);
		var out = [];
		for (var i = 0; i < start; i++) { out.push({ t: '=', v: a[i] }); }
		out = out.concat(core);
		for (var j = endA; j < n; j++) { out.push({ t: '=', v: a[j] }); }
		return out;
	}

	function myers(a, b, eq) {
		var n = a.length, m = b.length;
		if (!n) { return b.map(function (v) { return { t: '+', v: v }; }); }
		if (!m) { return a.map(function (v) { return { t: '-', v: v }; }); }
		var max = n + m, offset = max;
		var v = new Int32Array(2 * max + 2);
		var trace = [];
		var limit = 6e7; // Evita bloquear el navegador con entradas enormes.
		var work = 0;
		for (var d = 0; d <= max; d++) {
			if ((d + 1) * v.length > 4e7) { throw new Error('Los textos son demasiado largos o diferentes para compararlos en el navegador.'); }
			trace.push(v.slice());
			for (var k = -d; k <= d; k += 2) {
				var x;
				if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) { x = v[offset + k + 1]; }
				else { x = v[offset + k - 1] + 1; }
				var y = x - k;
				while (x < n && y < m && eq(a[x], b[y])) { x++; y++; work++; }
				v[offset + k] = x;
				if (x >= n && y >= m) { return backtrack(trace, a, b, offset, d); }
				work++;
			}
			if (work > limit) { throw new Error('Los textos son demasiado largos o diferentes para compararlos en el navegador.'); }
		}
		return [];
	}

	function backtrack(trace, a, b, offset, dEnd) {
		var x = a.length, y = b.length, ops = [];
		for (var d = dEnd; d > 0; d--) {
			var v = trace[d];
			var k = x - y;
			var prevK = (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) ? k + 1 : k - 1;
			var prevX = v[offset + prevK], prevY = prevX - prevK;
			while (x > prevX && y > prevY) { ops.push({ t: '=', v: a[x - 1] }); x--; y--; }
			if (x === prevX) { ops.push({ t: '+', v: b[y - 1] }); y--; }
			else { ops.push({ t: '-', v: a[x - 1] }); x--; }
		}
		while (x > 0 && y > 0) { ops.push({ t: '=', v: a[x - 1] }); x--; y--; }
		return ops.reverse();
	}

	function tokenize(text, mode) {
		if (mode === 'chars') { return Array.from(text); }
		if (mode === 'words') { return text.match(/\s+|[^\s\w]|\w+/gu) || []; }
		return text.split(/\r?\n/);
	}

	var api = { diff: diff, tokenize: tokenize };
	if (root.ClickTools) { root.ClickTools.diff = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
