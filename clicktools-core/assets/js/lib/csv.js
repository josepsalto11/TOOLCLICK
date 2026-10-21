/*!
 * HerramientasClave — CSV (RFC 4180) con detección de separador.
 */
(function (root) {
	'use strict';

	function detect(text) {
		var sample = text.slice(0, 5000);
		var counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
		var inQ = false, lines = 0;
		for (var i = 0; i < sample.length && lines < 10; i++) {
			var c = sample[i];
			if (c === '"') { inQ = !inQ; }
			else if (!inQ && counts[c] !== undefined) { counts[c]++; }
			else if (!inQ && c === '\n') { lines++; }
		}
		var best = ',', max = 0;
		Object.keys(counts).forEach(function (k) { if (counts[k] > max) { max = counts[k]; best = k; } });
		return best;
	}

	function parse(text, delimiter) {
		text = String(text || '').replace(/^﻿/, '');
		var d = delimiter || detect(text);
		var rows = [], row = [], field = '', inQ = false, i = 0, n = text.length;
		while (i < n) {
			var c = text[i];
			if (inQ) {
				if (c === '"') {
					if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
					inQ = false; i++; continue;
				}
				field += c; i++; continue;
			}
			if (c === '"' && field === '') { inQ = true; i++; continue; }
			if (c === d) { row.push(field); field = ''; i++; continue; }
			if (c === '\r') { i++; continue; }
			if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
			field += c; i++;
		}
		if (inQ) { throw new Error('Comillas sin cerrar en el CSV.'); }
		if (field !== '' || row.length) { row.push(field); rows.push(row); }
		return { rows: rows.filter(function (r) { return !(r.length === 1 && r[0] === ''); }), delimiter: d };
	}

	function cell(v, d, safe) {
		var s = v === null || v === undefined ? '' : String(v);
		if (s.indexOf(d) >= 0 || /["\r\n]/.test(s) || /^\s|\s$/.test(s)) { s = '"' + s.replace(/"/g, '""') + '"'; }
		// Evita la inyección de fórmulas al abrir el CSV en hojas de cálculo.
		if (safe && /^[=+\-@\t\r]/.test(s) && !/^[-+]?\d+([.,]\d+)?$/.test(s)) { s = "'" + s; }
		return s;
	}

	/** opts.formulaSafe (por defecto true): neutraliza celdas que una hoja de cálculo interpretaría como fórmula. */
	function stringify(rows, delimiter, opts) {
		var d = delimiter || ',';
		var safe = !(opts && opts.formulaSafe === false);
		return rows.map(function (r) { return r.map(function (v) { return cell(v, d, safe); }).join(d); }).join('\r\n');
	}

	var api = { parse: parse, stringify: stringify, detect: detect };
	if (root.ClickTools) { root.ClickTools.csv = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
