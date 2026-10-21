/*!
 * HerramientasClave — utilidades de desarrollo web. El código introducido nunca se ejecuta
 * ni se envía: solo se analiza como texto. Las expresiones regulares se prueban en un
 * Web Worker con tiempo límite para evitar bloqueos.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;

	function lineCol(text, pos) { var before = text.slice(0, pos).split('\n'); return { line: before.length, col: before[before.length - 1].length + 1 }; }
	/** Error de JSON con línea y columna aproximadas. */
	function jsonError(text, e) {
		var m = /position (\d+)/i.exec(e.message), lc;
		if (m) { lc = lineCol(text, +m[1]); }
		var m2 = /line (\d+) column (\d+)/i.exec(e.message);
		if (m2) { lc = { line: +m2[1], col: +m2[2] }; }
		var hint = '';
		if (/'/.test(text) && /Unexpected token '|Expected property name/.test(e.message)) { hint = __('JSON exige comillas dobles en claves y textos.'); }
		else if (/,\s*[}\]]/.test(text)) { hint = __('Revisa si hay una coma final antes de } o ].'); }
		var msg = lc ? CT.sprintf(__('JSON no válido en la línea %1$d, columna %2$d.'), lc.line, lc.col) : __('JSON no válido.');
		var snippet = lc ? text.split('\n')[lc.line - 1] : '';
		return { msg: msg, detail: e.message, hint: hint, snippet: snippet, lc: lc };
	}
	function sortKeys(v) {
		if (Array.isArray(v)) { return v.map(sortKeys); }
		if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
		return v;
	}
	function flatten(obj, prefix, out) {
		out = out || {};
		Object.keys(obj).forEach(function (k) {
			var v = obj[k], key = prefix ? prefix + '.' + k : k;
			if (v && typeof v === 'object' && !Array.isArray(v)) { flatten(v, key, out); }
			else if (Array.isArray(v)) { out[key] = v.every(function (x) { return x === null || typeof x !== 'object'; }) ? v.join('|') : JSON.stringify(v); }
			else { out[key] = v; }
		});
		return out;
	}
	CT.dev = { flatten: flatten, sortKeys: sortKeys };

	var tools = {};

	tools.json = function (el, tool) {
		var mode = (tool.config && tool.config.mode) || 'format';
		var input = ui.textInput({ label: __('JSON de entrada'), mono: true, rows: 12, value: '{"nombre":"HerramientasClave","herramientas":120,"gratis":true,"categorias":["pdf","imagenes","texto"],"autor":{"pais":"España"}}', accept: '.json,application/json,text/plain' });
		var indent = ui.field({ label: __('Sangría'), type: 'select', value: '2', options: [{ value: '2', label: __('2 espacios') }, { value: '4', label: __('4 espacios') }, { value: 'tab', label: __('Tabulador') }] });
		var sort = ui.field({ type: 'checkbox', label: __('Ordenar las claves alfabéticamente'), value: false });
		var status = h('div', { 'aria-live': 'polite' });
		var out = ui.output({ label: __('Resultado'), rows: 12, mono: true, filename: function () { return 'datos.json'; }, mime: 'application/json' });
		var run = function (m) {
			var text = input.get();
			status.innerHTML = '';
			if (!text.trim()) { out.set(''); return; }
			var data;
			try { data = JSON.parse(text); } catch (e) {
				var je = jsonError(text, e);
				var box = h('div', { class: 'ct-alert ct-alert--err', role: 'alert' }, h('div', null, h('p', null, h('strong', { text: je.msg })), je.snippet ? h('pre', { class: 'ct-mono', style: { margin: '6px 0', whiteSpace: 'pre-wrap' }, text: je.snippet + '\n' + ' '.repeat(Math.max(0, je.lc.col - 1)) + '^' }) : null, je.hint ? h('p', { text: je.hint }) : null, h('p', { class: 'ct-help', text: je.detail })));
				status.appendChild(box);
				out.set('');
				CT.track('error', 'json');
				return;
			}
			if (sort.input.checked) { data = sortKeys(data); }
			var ind = indent.input.value === 'tab' ? '\t' : parseInt(indent.input.value, 10);
			var res = (m || mode) === 'minify' ? JSON.stringify(data) : JSON.stringify(data, null, ind);
			var type = Array.isArray(data) ? CT.sprintf(__('array con %d elementos'), data.length) : data && typeof data === 'object' ? CT.sprintf(__('objeto con %d claves'), Object.keys(data).length) : typeof data;
			status.appendChild(ui.alert('ok', __('JSON válido') + ' · ' + type + ' · ' + CT.fmt.bytes(new Blob([text]).size) + ' → ' + CT.fmt.bytes(new Blob([res]).size)));
			out.set(mode === 'validate' && !m ? JSON.stringify(data, null, ind) : res);
		};
		el.appendChild(input.el);
		el.appendChild(h('div', { class: 'ct-row' }, indent.el, sort.el));
		el.appendChild(ui.actions(
			ui.button(mode === 'validate' ? __('Validar') : __('Formatear'), { variant: mode !== 'minify' ? 'primary' : 'secondary', icon: 'braces', onClick: function () { run('format'); CT.track('done'); } }),
			ui.button(__('Minificar'), { variant: mode === 'minify' ? 'primary' : 'secondary', icon: 'minimize-2', onClick: function () { run('minify'); CT.track('done'); } })));
		el.appendChild(status);
		el.appendChild(out.el);
		input.input.addEventListener('input', CT.debounce(function () { run(); }, 300));
		[indent.input, sort.input].forEach(function (i) { i.addEventListener('change', function () { run(); }); });
		run();
	};

	tools.json2csv = function (el) {
		var input = ui.textInput({ label: __('JSON (lista de objetos)'), mono: true, rows: 10, value: '[{"id":1,"nombre":"Ana","ciudad":{"nombre":"Madrid"}},{"id":2,"nombre":"Luis","etiquetas":["a","b"]}]', accept: '.json,application/json' });
		var delim = ui.field({ label: __('Separador'), type: 'select', value: ';', options: [{ value: ';', label: __('Punto y coma (Excel en español)') }, { value: ',', label: __('Coma') }, { value: 'tab', label: __('Tabulador') }] });
		var safe = ui.field({ type: 'checkbox', label: __('Proteger contra fórmulas al abrir en Excel (añade un apóstrofo a celdas que empiezan por =, +, - o @)'), value: true });
		var bom = ui.field({ type: 'checkbox', label: __('Incluir BOM UTF-8 (para que Excel muestre bien las tildes)'), value: true });
		var status = h('div');
		var out = ui.output({ label: 'CSV', rows: 10, mono: true });
		var run = function () {
			status.innerHTML = '';
			var text = input.get().trim();
			if (!text) { out.set(''); return; }
			var data;
			try { data = JSON.parse(text); } catch (e) { status.appendChild(ui.alert('err', jsonError(text, e).msg)); out.set(''); return; }
			if (!Array.isArray(data)) { data = [data]; }
			if (!data.length || data.some(function (x) { return !x || typeof x !== 'object' || Array.isArray(x); })) { status.appendChild(ui.alert('err', __('Se necesita una lista de objetos, por ejemplo [{"a":1},{"a":2}].'))); out.set(''); return; }
			var rows = data.map(function (o) { return flatten(o); });
			var cols = [];
			rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) { cols.push(k); } }); });
			var csv = CT.csv.stringify([cols].concat(rows.map(function (r) { return cols.map(function (c) { return r[c] === undefined || r[c] === null ? '' : r[c]; }); })), delim.input.value === 'tab' ? '\t' : delim.input.value, { formulaSafe: safe.input.checked });
			status.appendChild(ui.alert('ok', CT.sprintf(__('%1$d filas y %2$d columnas. Los objetos anidados se aplanan con puntos (ciudad.nombre).'), rows.length, cols.length)));
			out.set(csv);
		};
		el.appendChild(input.el);
		el.appendChild(h('div', { class: 'ct-cols' }, delim.el));
		el.appendChild(safe.el);
		el.appendChild(bom.el);
		el.appendChild(ui.actions(ui.button(__('Convertir a CSV'), { variant: 'primary', icon: 'table', onClick: run }), ui.button(__('Descargar .csv'), { icon: 'download', onClick: function () { run(); if (out.get()) { CT.download((bom.input.checked ? '﻿' : '') + out.get(), 'datos.csv', 'text/csv;charset=utf-8'); } } })));
		el.appendChild(status);
		el.appendChild(out.el);
		input.input.addEventListener('input', CT.debounce(run, 300));
		[delim.input, safe.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	tools.csv2json = function (el) {
		var input = ui.textInput({ label: 'CSV', mono: true, rows: 10, value: 'id;nombre;precio;activo\n1;Café;3,50;true\n2;"Té, verde";2.10;false', accept: '.csv,text/csv,text/plain' });
		var header = ui.field({ type: 'checkbox', label: __('La primera fila contiene los nombres de las columnas'), value: true });
		var types = ui.field({ type: 'checkbox', label: __('Detectar números y valores verdadero/falso'), value: true });
		var status = h('div');
		var out = ui.output({ label: 'JSON', rows: 12, mono: true, filename: function () { return 'datos.json'; }, mime: 'application/json' });
		var conv = function (v) {
			if (!types.input.checked) { return v; }
			if (/^(true|false)$/i.test(v)) { return v.toLowerCase() === 'true'; }
			if (/^-?\d+([.,]\d+)?$/.test(v.trim()) && !/^0\d/.test(v.trim())) { return parseFloat(v.replace(',', '.')); }
			if (v === '') { return null; }
			return v;
		};
		var run = function () {
			status.innerHTML = '';
			if (!input.get().trim()) { out.set(''); return; }
			try {
				var p = CT.csv.parse(input.get());
				var rows = p.rows, data;
				if (header.input.checked) {
					var head = rows[0];
					data = rows.slice(1).map(function (r) { var o = {}; head.forEach(function (k, i) { o[k || 'columna' + (i + 1)] = conv(r[i] === undefined ? '' : r[i]); }); return o; });
				} else { data = rows.map(function (r) { return r.map(conv); }); }
				out.set(JSON.stringify(data, null, 2));
				status.appendChild(ui.alert('ok', CT.sprintf(__('%1$d registros convertidos (separador detectado: «%2$s»).'), data.length, p.delimiter === '\t' ? 'TAB' : p.delimiter)));
			} catch (e) { status.appendChild(ui.alert('err', e.message)); out.set(''); }
		};
		el.appendChild(input.el);
		el.appendChild(h('div', { class: 'ct-row' }, header.el, types.el));
		el.appendChild(ui.actions(ui.button(__('Convertir a JSON'), { variant: 'primary', icon: 'braces', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(status);
		el.appendChild(out.el);
		input.input.addEventListener('input', CT.debounce(run, 300));
		[header.input, types.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	function xmlToObj(node) {
		var obj = {};
		if (node.attributes) { for (var i = 0; i < node.attributes.length; i++) { obj['@' + node.attributes[i].name] = node.attributes[i].value; } }
		var text = '';
		var children = Array.prototype.filter.call(node.childNodes, function (c) {
			if (c.nodeType === 3 || c.nodeType === 4) { text += c.nodeValue; return false; }
			return c.nodeType === 1;
		});
		children.forEach(function (c) {
			var v = xmlToObj(c);
			if (obj[c.nodeName] !== undefined) { if (!Array.isArray(obj[c.nodeName])) { obj[c.nodeName] = [obj[c.nodeName]]; } obj[c.nodeName].push(v); }
			else { obj[c.nodeName] = v; }
		});
		text = text.trim();
		if (!children.length && !(node.attributes && node.attributes.length)) { return text; }
		if (text) { obj['#text'] = text; }
		return obj;
	}
	tools.xml2json = function (el) {
		var input = ui.textInput({ label: 'XML', mono: true, rows: 10, value: '<catalogo>\n  <producto id="1" moneda="EUR">\n    <nombre>Café</nombre>\n    <precio>3.50</precio>\n  </producto>\n  <producto id="2">\n    <nombre>Té</nombre>\n  </producto>\n</catalogo>', accept: '.xml,application/xml,text/xml' });
		var status = h('div');
		var out = ui.output({ label: 'JSON', rows: 12, mono: true, filename: function () { return 'datos.json'; } });
		var run = function () {
			status.innerHTML = '';
			if (!input.get().trim()) { out.set(''); return; }
			var doc = new DOMParser().parseFromString(input.get(), 'application/xml');
			var err = doc.getElementsByTagName('parsererror')[0];
			if (err) { status.appendChild(ui.alert('err', __('El XML no es válido.'), err.textContent.split('\n').slice(0, 2).join(' '))); out.set(''); return; }
			var root = doc.documentElement, o = {};
			o[root.nodeName] = xmlToObj(root);
			out.set(JSON.stringify(o, null, 2));
			status.appendChild(ui.alert('ok', __('Conversión correcta. Los atributos se indican con @ y el texto mixto con #text.')));
		};
		el.appendChild(input.el);
		el.appendChild(ui.actions(ui.button(__('Convertir a JSON'), { variant: 'primary', icon: 'braces', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(status);
		el.appendChild(out.el);
		input.input.addEventListener('input', CT.debounce(run, 300));
		run();
	};

	var SAMPLES = {
		html: '<div class="tarjeta"><h2>Hola</h2><p>Texto de <strong>ejemplo</strong></p><ul><li>Uno</li><li>Dos</li></ul></div>',
		css: '.tarjeta{padding:16px;border-radius:12px}.tarjeta h2{margin:0;color:#5b3df5}@media (max-width:600px){.tarjeta{padding:8px}}',
		js: 'function saludar(nombre){if(!nombre){return "Hola";}const partes=["Hola",nombre];return partes.join(", ")+"!";}'
	};
	tools.beautify = function (el, tool) {
		var lang = (tool.config && tool.config.lang) || 'html';
		var input = ui.textInput({ label: __('Código de entrada'), mono: true, rows: 12, value: SAMPLES[lang], accept: '.' + lang + ',text/plain' });
		var indent = ui.field({ label: __('Sangría'), type: 'select', value: '2', options: [{ value: '2', label: __('2 espacios') }, { value: '4', label: __('4 espacios') }, { value: 'tab', label: __('Tabulador') }] });
		var status = h('div');
		var out = ui.output({ label: __('Código formateado'), rows: 14, mono: true, filename: function () { return 'codigo.' + lang; } });
		var run = function (minify) {
			status.innerHTML = '';
			if (minify && lang === 'css') {
				out.set(input.get().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim());
				status.appendChild(ui.alert('ok', __('CSS minificado.')));
				return;
			}
			CT.loadVendor('beautify').then(function (b) {
				var opts = { indent_size: indent.input.value === 'tab' ? 1 : parseInt(indent.input.value, 10), indent_char: indent.input.value === 'tab' ? '\t' : ' ', end_with_newline: true, preserve_newlines: true, max_preserve_newlines: 2 };
				out.set(b[lang](input.get(), opts));
				CT.track('done');
			}).catch(function (e) { status.appendChild(ui.alert('err', e.message)); });
		};
		el.appendChild(input.el);
		el.appendChild(h('div', { class: 'ct-cols' }, indent.el));
		el.appendChild(ui.actions(ui.button(__('Formatear'), { variant: 'primary', icon: 'code', onClick: function () { run(false); } }), lang === 'css' ? ui.button(__('Minificar'), { icon: 'minimize-2', onClick: function () { run(true); } }) : null));
		el.appendChild(h('p', { class: 'ct-help', text: __('El código se reorganiza como texto: no se ejecuta ni se valida su funcionamiento.') }));
		el.appendChild(status);
		el.appendChild(out.el);
		run(false);
	};

	tools.timestamp = function (el) {
		var now = h('p', { class: 'ct-result__main ct-mono', style: { margin: 0 } });
		var nowBox = h('div', { class: 'ct-result' }, h('p', { class: 'ct-result__label', text: __('Marca de tiempo Unix actual (segundos)') }), now, ui.button(__('Copiar'), { icon: 'copy', size: 'sm', onClick: function () { CT.copy(now.textContent); } }));
		var ts = ui.field({ label: __('Marca de tiempo (segundos o milisegundos)'), mono: true, value: String(Math.floor(Date.now() / 1000)) });
		var dt = ui.field({ label: __('O una fecha y hora local'), type: 'datetime-local', value: '' });
		var result = ui.result();
		var show = function (d, src) {
			if (isNaN(d)) { result.error(__('Fecha no válida.')); return; }
			var rows = [[__('Segundos Unix'), String(Math.floor(d.getTime() / 1000))], [__('Milisegundos'), String(d.getTime())], ['ISO 8601 (UTC)', d.toISOString()], [__('Hora local'), new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'medium' }).format(d)], ['UTC', d.toUTCString()], [__('Hace / dentro de'), rel(d)]];
			result.set(ui.table([__('Formato'), __('Valor')], rows.map(function (r) { return [r[0], h('code', { text: r[1] })]; }), { wrap: true, caption: src }));
		};
		var rel = function (d) {
			var s = Math.round((d - Date.now()) / 1000), a = Math.abs(s);
			var u = a < 60 ? [s, 'second'] : a < 3600 ? [Math.round(s / 60), 'minute'] : a < 86400 ? [Math.round(s / 3600), 'hour'] : a < 2592000 ? [Math.round(s / 86400), 'day'] : a < 31536000 ? [Math.round(s / 2592000), 'month'] : [Math.round(s / 31536000), 'year'];
			return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(u[0], u[1]);
		};
		ts.input.addEventListener('input', function () {
			var v = ts.input.value.trim();
			if (!/^-?\d+(\.\d+)?$/.test(v)) { ts.error(v ? __('Introduce solo dígitos.') : ''); return; }
			ts.error('');
			var n = parseFloat(v);
			var ms = Math.abs(n) > 1e11 ? n : n * 1000;
			show(new Date(ms), Math.abs(n) > 1e11 ? __('Interpretado como milisegundos') : __('Interpretado como segundos'));
		});
		dt.input.addEventListener('input', function () { if (dt.input.value) { var d = new Date(dt.input.value); ts.input.value = String(Math.floor(d.getTime() / 1000)); show(d, __('Fecha local')); } });
		el.appendChild(nowBox);
		el.appendChild(h('div', { class: 'ct-cols', style: { marginTop: '16px' } }, ts.el, dt.el));
		el.appendChild(result.el);
		var tick = function () { now.textContent = String(Math.floor(Date.now() / 1000)); };
		tick(); var int = setInterval(tick, 1000); window.addEventListener('pagehide', function () { clearInterval(int); });
		ts.input.dispatchEvent(new Event('input'));
	};

	/* ---------- Expresiones regulares (en un Worker con límite de tiempo) ---------- */
	var WORKER_SRC = 'onmessage=function(e){var d=e.data,out={matches:[],error:null,replaced:null};try{var re=new RegExp(d.p,d.f);if(re.global||re.sticky){var m,c=0;re.lastIndex=0;while((m=re.exec(d.t))!==null&&c<5000){out.matches.push({i:m.index,v:m[0],g:m.slice(1),n:m.groups||null});c++;if(m[0]==="")re.lastIndex++;}}else{var m1=re.exec(d.t);if(m1)out.matches.push({i:m1.index,v:m1[0],g:m1.slice(1),n:m1.groups||null});}if(d.r!==null)out.replaced=d.t.replace(new RegExp(d.p,d.f),d.r);}catch(err){out.error=err.message;}postMessage(out);};';
	var workerUrl = null;
	function runRegex(p, f, t, r) {
		return new Promise(function (resolve) {
			if (!workerUrl) { workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })); }
			var w = new Worker(workerUrl);
			var timer = setTimeout(function () { w.terminate(); resolve({ error: __('La expresión tarda demasiado (más de 1 segundo). Puede tener un retroceso catastrófico, por ejemplo (a+)+ .'), matches: [] }); }, 1000);
			w.onmessage = function (e) { clearTimeout(timer); w.terminate(); resolve(e.data); };
			w.onerror = function (e) { clearTimeout(timer); w.terminate(); resolve({ error: e.message, matches: [] }); };
			w.postMessage({ p: p, f: f, t: t, r: r });
		});
	}
	var LIBRARY = [
		[__('Correo electrónico (validación sencilla)'), '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$', 'ana@ejemplo.com'],
		[__('URL http o https'), '^https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+[\\w\\-._~:/?#[\\]@!$&\'()*+,;=%]*$', 'https://example.com/pdf/unir-pdf/'],
		[__('Código postal de España'), '^(?:0[1-9]|[1-4]\\d|5[0-2])\\d{3}$', '28013'],
		[__('Teléfono de España (formato)'), '^(?:\\+34\\s?)?[6789]\\d{2}\\s?\\d{3}\\s?\\d{3}$', '+34 612 345 678'],
		[__('DNI (formato, sin comprobar la letra)'), '^\\d{8}[A-HJ-NP-TV-Z]$', '12345678Z'],
		[__('NIE (formato)'), '^[XYZ]\\d{7}[A-HJ-NP-TV-Z]$', 'X1234567L'],
		[__('IBAN español (formato)'), '^ES\\d{2}\\s?(?:\\d{4}\\s?){5}$', 'ES91 2100 0418 4502 0005 1332'],
		[__('Fecha DD/MM/AAAA'), '^(0[1-9]|[12]\\d|3[01])\\/(0[1-9]|1[0-2])\\/\\d{4}$', '19/10/2026'],
		[__('Hora HH:MM (24 h)'), '^([01]\\d|2[0-3]):[0-5]\\d$', '23:45'],
		[__('Color hexadecimal'), '^#(?:[0-9a-fA-F]{3}){1,2}$', '#5B3DF5'],
		[__('Dirección IPv4'), '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$', '192.168.1.10'],
		[__('Slug de URL'), '^[a-z0-9]+(?:-[a-z0-9]+)*$', 'unir-pdf'],
		[__('Contraseña: 12+ caracteres con mayúscula, minúscula y número'), '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{12,}$', 'ClaveSegura2026'],
		[__('Número decimal con coma o punto'), '^-?\\d+(?:[.,]\\d+)?$', '-12,75'],
		[__('Etiquetas HTML (para buscar)'), '<\\/?[a-z][a-z0-9]*[^>]*>', '<p class="x">Hola</p>']
	];
	tools.regex = function (el, tool) {
		var pattern = ui.field({ label: __('Expresión regular'), mono: true, value: '(\\d{2})\\/(\\d{2})\\/(\\d{4})' });
		var flagsBox = h('div', { class: 'ct-row' });
		var flags = {};
		[['g', __('global')], ['i', __('ignorar mayúsculas')], ['m', __('multilínea')], ['s', __('punto incluye saltos')], ['u', 'Unicode']].forEach(function (f) { flags[f[0]] = ui.field({ type: 'checkbox', label: f[0] + ' · ' + f[1], value: f[0] === 'g' || f[0] === 'u' }); flagsBox.appendChild(flags[f[0]].el); });
		var text = ui.field({ label: __('Texto de prueba'), type: 'textarea', rows: 6, mono: true, value: 'Facturas: 01/10/2026, 15/10/2026 y 31/12/2026.' });
		var repl = ui.field({ label: __('Reemplazo (opcional, admite $1, $2…)'), mono: true, value: '$3-$2-$1' });
		var view = h('div', { class: 'ct-diff', 'aria-live': 'polite' });
		var result = ui.result();
		var seq = 0;
		var run = function () {
			var my = ++seq;
			var f = Object.keys(flags).filter(function (k) { return flags[k].input.checked; }).join('');
			if (!pattern.input.value) { view.textContent = text.input.value; result.clear(); return; }
			runRegex(pattern.input.value, f, text.input.value, repl.input.value ? repl.input.value : null).then(function (r) {
				if (my !== seq) { return; }
				if (r.error) { pattern.error(r.error); view.textContent = text.input.value; result.clear(); return; }
				pattern.error('');
				view.innerHTML = '';
				var t = text.input.value, pos = 0;
				r.matches.forEach(function (m) { if (m.i < pos) { return; } view.appendChild(document.createTextNode(t.slice(pos, m.i))); view.appendChild(h('ins', { text: m.v || '∅' })); pos = m.i + m.v.length; });
				view.appendChild(document.createTextNode(t.slice(pos)));
				var nodes = [ui.alert(r.matches.length ? 'ok' : 'info', CT.sprintf(CT._n('%d coincidencia', '%d coincidencias', r.matches.length), r.matches.length))];
				if (r.matches.length) {
					var maxG = Math.max.apply(null, r.matches.map(function (m) { return m.g.length; }));
					var headers = ['#', __('Posición'), __('Coincidencia')];
					for (var g = 1; g <= maxG; g++) { headers.push(__('Grupo') + ' ' + g); }
					nodes.push(ui.table(headers, r.matches.slice(0, 200).map(function (m, i) { var row = [String(i + 1), String(m.i), m.v]; for (var g2 = 0; g2 < maxG; g2++) { row.push(m.g[g2] === undefined ? '—' : m.g[g2]); } return row; }), { caption: __('Coincidencias') }));
				}
				if (r.replaced !== null && r.replaced !== undefined) { var o = ui.output({ label: __('Resultado del reemplazo'), rows: 4, mono: true }); o.set(r.replaced); nodes.push(o.el); }
				result.set(nodes);
			});
		};
		if (tool.config && tool.config.library) {
			el.appendChild(h('h3', { class: 'ct-panel__title', text: __('Biblioteca de expresiones de ejemplo') }));
			el.appendChild(ui.table([__('Uso'), __('Expresión'), ''], LIBRARY.map(function (l) {
				return [l[0], h('code', { text: l[1], style: { wordBreak: 'break-all', whiteSpace: 'normal' } }), h('span', { class: 'ct-row', style: { flexWrap: 'nowrap' } }, ui.button(__('Probar'), { size: 'sm', onClick: function () { pattern.input.value = l[1]; text.input.value = l[2]; flags.g.input.checked = false; flags.m.input.checked = false; repl.input.value = ''; run(); pattern.input.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar'), onClick: function () { CT.copy(l[1]); } }))];
			}), { wrap: true, caption: __('Biblioteca de expresiones') }));
			el.appendChild(h('p', { class: 'ct-help', text: __('Los patrones validan el formato, no la existencia real (por ejemplo, no comprueban si un DNI o un IBAN son válidos).') }));
			el.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '20px' }, text: __('Probador') }));
		}
		el.appendChild(pattern.el);
		el.appendChild(flagsBox);
		el.appendChild(text.el);
		el.appendChild(repl.el);
		el.appendChild(h('h3', { class: 'ct-panel__title', text: __('Coincidencias resaltadas') }));
		el.appendChild(view);
		el.appendChild(result.el);
		[pattern.input, text.input, repl.input].forEach(function (i) { i.addEventListener('input', CT.debounce(run, 250)); });
		Object.keys(flags).forEach(function (k) { flags[k].input.addEventListener('change', run); });
		run();
	};

	tools.unicode = function (el) {
		var input = ui.field({ label: __('Texto a inspeccionar'), type: 'textarea', rows: 4, value: 'Café​ ñ € 😀 ﬁ' });
		var result = h('div');
		var cat = function (c) {
			var tests = [[/\p{L}/u, __('Letra')], [/\p{N}/u, __('Número')], [/\p{P}/u, __('Puntuación')], [/\p{Sc}/u, __('Símbolo de moneda')], [/\p{Extended_Pictographic}/u, __('Emoji / pictograma')], [/\p{S}/u, __('Símbolo')], [/\p{Zs}/u, __('Espacio')], [/\p{M}/u, __('Marca diacrítica')], [/\p{Cf}/u, __('Formato (invisible)')], [/\p{Cc}/u, __('Control')]];
			for (var i = 0; i < tests.length; i++) { if (tests[i][0].test(c)) { return tests[i][1]; } }
			return __('Otro');
		};
		var run = function () {
			var chars = Array.from(input.input.value).slice(0, 500);
			var invisible = 0;
			var rows = chars.map(function (c) {
				var cp = c.codePointAt(0);
				var utf8 = Array.from(new TextEncoder().encode(c), function (b) { return b.toString(16).toUpperCase().padStart(2, '0'); }).join(' ');
				var k = cat(c);
				var inv = /\p{Cf}|\p{Cc}|\p{Zs}/u.test(c) && c !== ' ';
				if (inv) { invisible++; }
				return [inv ? '⟨' + __('invisible') + '⟩' : c === ' ' ? '␠' : c, 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'), String(cp), utf8, '&#' + cp + ';', k];
			});
			result.innerHTML = '';
			if (invisible) { result.appendChild(ui.alert('warn', CT.sprintf(__('Se han encontrado %d caracteres invisibles o espacios especiales (marcados como «invisible»). Pueden causar errores al copiar contraseñas, código o URL.'), invisible))); }
			result.appendChild(ui.table([__('Carácter'), __('Código'), __('Decimal'), 'UTF-8', 'HTML', __('Tipo')], rows, { caption: __('Caracteres'), tall: rows.length > 14 }));
		};
		el.appendChild(input.el);
		el.appendChild(result);
		input.input.addEventListener('input', CT.debounce(run, 200));
		run();
	};

	tools.bases = function (el) {
		var value = ui.field({ label: __('Número'), mono: true, value: '255' });
		var base = ui.field({ label: __('Base del número'), type: 'select', value: '10', options: [{ value: '2', label: __('Binario (2)') }, { value: '8', label: __('Octal (8)') }, { value: '10', label: __('Decimal (10)') }, { value: '16', label: __('Hexadecimal (16)') }, { value: '36', label: __('Base 36') }] });
		var result = ui.result();
		var parse = function (s, b) {
			s = s.trim().toLowerCase().replace(/[_\s]/g, '').replace(/^0[xob]/, '');
			var neg = s[0] === '-'; if (neg) { s = s.slice(1); }
			var digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, b);
			if (!s || s.split('').some(function (c) { return digits.indexOf(c) < 0; })) { return null; }
			var n = 0n, B = BigInt(b);
			for (var i = 0; i < s.length; i++) { n = n * B + BigInt(digits.indexOf(s[i])); }
			return neg ? -n : n;
		};
		var run = function () {
			var n = parse(value.input.value, parseInt(base.input.value, 10));
			if (n === null) { value.error(value.input.value.trim() ? __('El número contiene dígitos no válidos para esa base.') : ''); result.clear(); return; }
			value.error('');
			var abs = n < 0n ? -n : n, sign = n < 0n ? '-' : '';
			var bin = abs.toString(2);
			var rows = [[__('Decimal'), sign + abs.toString(10)], [__('Binario'), sign + bin.replace(/\B(?=(\d{4})+(?!\d))/g, ' ')], [__('Octal'), sign + abs.toString(8)], [__('Hexadecimal'), sign + abs.toString(16).toUpperCase()], [__('Base 36'), sign + abs.toString(36).toUpperCase()], [__('Bits necesarios'), String(bin.length)]];
			result.set(ui.table([__('Base'), __('Valor')], rows.map(function (r) { return [r[0], h('span', { class: 'ct-row', style: { flexWrap: 'nowrap' } }, h('code', { text: r[1], style: { wordBreak: 'break-all', whiteSpace: 'normal' } }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar'), onClick: function () { CT.copy(r[1].replace(/ /g, '')); } }))]; }), { wrap: true }));
		};
		el.appendChild(h('div', { class: 'ct-cols' }, value.el, base.el));
		el.appendChild(h('p', { class: 'ct-help', text: __('Admite números enteros de cualquier tamaño (BigInt).') }));
		el.appendChild(result.el);
		[value.input, base.input].forEach(function (i) { i.addEventListener('input', run); i.addEventListener('change', run); });
		run();
	};

	/* ---------- Validador JSON Schema (subconjunto) ---------- */
	function typeOf(v) { if (v === null) { return 'null'; } if (Array.isArray(v)) { return 'array'; } if (typeof v === 'number') { return Number.isInteger(v) ? 'integer' : 'number'; } return typeof v; }
	function validate(schema, data, path, errors) {
		if (schema === true || schema === undefined) { return; }
		if (schema === false) { errors.push([path, __('no se permite ningún valor')]); return; }
		var t = typeOf(data);
		if (schema.type) {
			var types = Array.isArray(schema.type) ? schema.type : [schema.type];
			var ok = types.some(function (ty) { return ty === t || (ty === 'number' && t === 'integer'); });
			if (!ok) { errors.push([path, CT.sprintf(__('debe ser de tipo %1$s y es %2$s'), types.join(' o '), t)]); return; }
		}
		if (schema.enum && !schema.enum.some(function (e) { return JSON.stringify(e) === JSON.stringify(data); })) { errors.push([path, CT.sprintf(__('debe ser uno de: %s'), JSON.stringify(schema.enum))]); }
		if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(data)) { errors.push([path, CT.sprintf(__('debe ser %s'), JSON.stringify(schema.const))]); }
		if (t === 'string') {
			if (schema.minLength !== undefined && data.length < schema.minLength) { errors.push([path, CT.sprintf(__('mínimo %d caracteres'), schema.minLength)]); }
			if (schema.maxLength !== undefined && data.length > schema.maxLength) { errors.push([path, CT.sprintf(__('máximo %d caracteres'), schema.maxLength)]); }
			if (schema.pattern) { try { if (!new RegExp(schema.pattern, 'u').test(data)) { errors.push([path, CT.sprintf(__('no cumple el patrón %s'), schema.pattern)]); } } catch (e) { errors.push([path, __('patrón no válido en el esquema')]); } }
			if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) { errors.push([path, __('no es un correo válido')]); }
			if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(data)) { errors.push([path, __('no es una fecha AAAA-MM-DD')]); }
			if (schema.format === 'date-time' && isNaN(Date.parse(data))) { errors.push([path, __('no es una fecha y hora válida')]); }
			if (schema.format === 'uri' && !/^[a-z][a-z0-9+.-]*:/i.test(data)) { errors.push([path, __('no es una URI válida')]); }
		}
		if (t === 'number' || t === 'integer') {
			if (schema.minimum !== undefined && data < schema.minimum) { errors.push([path, CT.sprintf(__('debe ser ≥ %s'), schema.minimum)]); }
			if (schema.maximum !== undefined && data > schema.maximum) { errors.push([path, CT.sprintf(__('debe ser ≤ %s'), schema.maximum)]); }
			if (typeof schema.exclusiveMinimum === 'number' && data <= schema.exclusiveMinimum) { errors.push([path, CT.sprintf(__('debe ser > %s'), schema.exclusiveMinimum)]); }
			if (typeof schema.exclusiveMaximum === 'number' && data >= schema.exclusiveMaximum) { errors.push([path, CT.sprintf(__('debe ser < %s'), schema.exclusiveMaximum)]); }
			if (schema.multipleOf && Math.abs(data / schema.multipleOf - Math.round(data / schema.multipleOf)) > 1e-9) { errors.push([path, CT.sprintf(__('debe ser múltiplo de %s'), schema.multipleOf)]); }
		}
		if (t === 'array') {
			if (schema.minItems !== undefined && data.length < schema.minItems) { errors.push([path, CT.sprintf(__('mínimo %d elementos'), schema.minItems)]); }
			if (schema.maxItems !== undefined && data.length > schema.maxItems) { errors.push([path, CT.sprintf(__('máximo %d elementos'), schema.maxItems)]); }
			if (schema.uniqueItems) { var seen = {}; data.forEach(function (x, i) { var k = JSON.stringify(x); if (seen[k]) { errors.push([path + '[' + i + ']', __('elemento duplicado')]); } seen[k] = 1; }); }
			if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) { data.forEach(function (x, i) { validate(schema.items, x, path + '[' + i + ']', errors); }); }
		}
		if (t === 'object') {
			(schema.required || []).forEach(function (k) { if (!(k in data)) { errors.push([path, CT.sprintf(__('falta la propiedad obligatoria «%s»'), k)]); } });
			var props = schema.properties || {};
			Object.keys(data).forEach(function (k) {
				if (props[k] !== undefined) { validate(props[k], data[k], path + '.' + k, errors); }
				else if (schema.additionalProperties === false) { errors.push([path + '.' + k, __('propiedad no permitida')]); }
				else if (typeof schema.additionalProperties === 'object') { validate(schema.additionalProperties, data[k], path + '.' + k, errors); }
			});
		}
		if (schema.allOf) { schema.allOf.forEach(function (s) { validate(s, data, path, errors); }); }
		if (schema.anyOf && !schema.anyOf.some(function (s) { var e = []; validate(s, data, path, e); return !e.length; })) { errors.push([path, __('no cumple ninguna de las opciones de anyOf')]); }
		if (schema.oneOf) { var c = schema.oneOf.filter(function (s) { var e = []; validate(s, data, path, e); return !e.length; }).length; if (c !== 1) { errors.push([path, CT.sprintf(__('debe cumplir exactamente una opción de oneOf (cumple %d)'), c)]); } }
		if (schema.not) { var e2 = []; validate(schema.not, data, path, e2); if (!e2.length) { errors.push([path, __('no debe cumplir el esquema de «not»')]); } }
	}
	CT.jsonSchemaValidate = function (schema, data) { var e = []; validate(schema, data, '$', e); return e; };

	tools.schema = function (el) {
		var schema = ui.field({ label: __('Esquema (JSON Schema)'), type: 'textarea', rows: 12, mono: true, value: JSON.stringify({ type: 'object', required: ['nombre', 'email', 'edad'], properties: { nombre: { type: 'string', minLength: 2 }, email: { type: 'string', format: 'email' }, edad: { type: 'integer', minimum: 18 }, etiquetas: { type: 'array', items: { type: 'string' }, uniqueItems: true } }, additionalProperties: false }, null, 2) });
		var data = ui.field({ label: __('Datos JSON a validar'), type: 'textarea', rows: 12, mono: true, value: JSON.stringify({ nombre: 'A', email: 'ana@ejemplo', edad: 17.5, etiquetas: ['x', 'x'], extra: true }, null, 2) });
		var result = ui.result();
		var run = function () {
			var s, d;
			try { s = JSON.parse(schema.input.value); schema.error(''); } catch (e) { schema.error(jsonError(schema.input.value, e).msg); result.clear(); return; }
			try { d = JSON.parse(data.input.value); data.error(''); } catch (e) { data.error(jsonError(data.input.value, e).msg); result.clear(); return; }
			var errors = CT.jsonSchemaValidate(s, d);
			var warn = JSON.stringify(s).indexOf('"$ref"') >= 0 ? ui.alert('warn', __('Este validador no resuelve referencias $ref; esas partes del esquema se ignoran.')) : null;
			result.set(warn, errors.length ? [ui.alert('err', CT.sprintf(CT._n('%d error encontrado', '%d errores encontrados', errors.length), errors.length)), ui.table([__('Ruta'), __('Problema')], errors.map(function (e) { return [h('code', { text: e[0] }), e[1]]; }), { wrap: true })] : ui.alert('ok', __('Los datos cumplen el esquema.')));
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, schema.el, data.el));
		el.appendChild(ui.actions(ui.button(__('Validar'), { variant: 'primary', icon: 'check', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(h('p', { class: 'ct-help', text: __('Compatible con las palabras clave más habituales de JSON Schema (type, required, properties, items, enum, const, mínimos y máximos, pattern, format, allOf, anyOf, oneOf, not). No resuelve $ref.') }));
		el.appendChild(result.el);
		[schema.input, data.input].forEach(function (i) { i.addEventListener('input', CT.debounce(run, 400)); });
		run();
	};

	tools.meta = function (el) {
		var f = {};
		[['title', __('Título de la página'), 'Calcular IVA online: añadir y quitar IVA | HerramientasClave', 60], ['desc', __('Descripción'), 'Calculadora de IVA gratis: suma o quita el IVA de un precio con los tipos 21 %, 10 % y 4 %.', 155], ['url', __('URL canónica'), 'https://example.com/calculadoras/calcular-iva/'], ['image', __('Imagen para redes (URL)'), 'https://example.com/imagen-social.png'], ['site', __('Nombre del sitio'), 'HerramientasClave']].forEach(function (d) {
			f[d[0]] = ui.field({ label: d[1], type: d[0] === 'desc' ? 'textarea' : 'text', rows: 3, value: d[2] });
			if (d[3]) { var c = h('span', { class: 'ct-chip' }); f[d[0]].el.querySelector('label').append(' ', c); f[d[0]].counter = c; f[d[0]].limit = d[3]; }
		});
		var out = ui.output({ label: __('Etiquetas HTML'), rows: 12, mono: true });
		var preview = h('div', { class: 'ct-panel' });
		var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
		var run = function () {
			Object.keys(f).forEach(function (k) { if (f[k].counter) { var n = f[k].input.value.length; f[k].counter.textContent = n + ' / ' + f[k].limit; f[k].counter.className = 'ct-chip ' + (n > f[k].limit ? 'ct-chip--warn' : 'ct-chip--ok'); } });
			var v = {}; Object.keys(f).forEach(function (k) { v[k] = f[k].input.value.trim(); });
			out.set(['<title>' + esc(v.title) + '</title>', '<meta name="description" content="' + esc(v.desc) + '">', v.url ? '<link rel="canonical" href="' + esc(v.url) + '">' : '', '<meta property="og:type" content="website">', '<meta property="og:title" content="' + esc(v.title) + '">', '<meta property="og:description" content="' + esc(v.desc) + '">', v.url ? '<meta property="og:url" content="' + esc(v.url) + '">' : '', v.image ? '<meta property="og:image" content="' + esc(v.image) + '">' : '', v.site ? '<meta property="og:site_name" content="' + esc(v.site) + '">' : '', '<meta name="twitter:card" content="' + (v.image ? 'summary_large_image' : 'summary') + '">'].filter(Boolean).join('\n'));
			preview.innerHTML = '';
			preview.appendChild(h('p', { class: 'ct-help', text: __('Vista previa aproximada en resultados de búsqueda') }));
			preview.appendChild(h('p', { style: { color: '#1a0dab', fontSize: '1.15rem', margin: '0 0 2px' }, text: v.title.length > 60 ? v.title.slice(0, 60) + '…' : v.title }));
			preview.appendChild(h('p', { style: { color: '#006621', fontSize: '.85rem', margin: '0 0 2px' }, text: v.url }));
			preview.appendChild(h('p', { style: { fontSize: '.9rem', margin: 0 }, text: v.desc.length > 155 ? v.desc.slice(0, 155) + '…' : v.desc }));
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, h('div', null, f.title.el, f.desc.el, f.url.el, f.image.el, f.site.el), h('div', null, preview, out.el)));
		el.appendChild(h('p', { class: 'ct-help', text: __('Las longitudes recomendadas son orientativas: los buscadores recortan por anchura en píxeles y pueden reescribir títulos y descripciones.') }));
		Object.keys(f).forEach(function (k) { f[k].input.addEventListener('input', CT.debounce(run, 150)); });
		run();
	};

	var CSS_COLORS = 'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkkhaki:bdb76b darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b darkslategray:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32'.split(' ').map(function (x) { var p = x.split(':'); return [p[0], '#' + p[1]]; });
	tools.csscolors = function (el) {
		var q = ui.field({ label: __('Buscar color'), value: '', placeholder: 'blue, #ff…' });
		var grid = h('div', { class: 'ct-swatches' });
		var run = function () {
			var s = q.input.value.trim().toLowerCase();
			grid.innerHTML = '';
			CSS_COLORS.filter(function (c) { return !s || c[0].indexOf(s) >= 0 || c[1].indexOf(s) >= 0; }).forEach(function (c) {
				var txt = CT.contrast(c[1], '#000000') > CT.contrast(c[1], '#ffffff') ? '#000' : '#fff';
				grid.appendChild(h('div', { class: 'ct-swatch' }, h('div', { class: 'ct-swatch__color', style: { background: c[1], color: txt, display: 'grid', placeItems: 'center', fontSize: '.8rem', fontWeight: 600 }, text: c[0] }),
					h('div', { class: 'ct-swatch__info' }, h('span', { text: c[1].toUpperCase() }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar') + ' ' + c[0], onClick: function () { CT.copy(c[0]); } }))));
			});
		};
		el.appendChild(q.el);
		el.appendChild(h('p', { class: 'ct-help', text: CT.sprintf(__('%d colores con nombre definidos en CSS. Pulsa el icono para copiar el nombre.'), CSS_COLORS.length) }));
		el.appendChild(grid);
		q.input.addEventListener('input', CT.debounce(run, 120));
		run();
	};

	CT.register('dev', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
