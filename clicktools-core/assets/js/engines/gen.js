/*!
 * HerramientasClave — generadores. Usan crypto.getRandomValues (aleatoriedad criptográfica)
 * y nunca envían ni guardan los resultados.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;

	/* ---------- Aleatoriedad segura (exportada) ---------- */
	var R = CT.rand = {
		/** Entero uniforme en [0, n) con muestreo por rechazo (sin sesgo de módulo). */
		int: function (n) {
			if (n <= 0) { return 0; }
			var max = Math.floor(0x100000000 / n) * n, buf = new Uint32Array(1);
			do { crypto.getRandomValues(buf); } while (buf[0] >= max);
			return buf[0] % n;
		},
		range: function (min, max) { return min + R.int(max - min + 1); },
		pick: function (arr) { return arr[R.int(arr.length)]; },
		shuffle: function (arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = R.int(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
		bytes: function (n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
	};
	var SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%&*()-_=+[]{};:,.<>/?~^' };
	var AMBIG = /[Il1O0o|`'"]/g;
	CT.password = function (len, opts) {
		var pools = [];
		['lower', 'upper', 'digits', 'symbols'].forEach(function (k) {
			if (opts[k]) {
				var p = SETS[k];
				if (opts.noAmbiguous) { p = p.replace(AMBIG, ''); }
				if (opts.exclude) { p = p.split('').filter(function (c) { return opts.exclude.indexOf(c) < 0; }).join(''); }
				if (p) { pools.push(p); }
			}
		});
		if (!pools.length) { throw new Error(__('Elige al menos un tipo de carácter.')); }
		if (len < pools.length) { throw new Error(__('La longitud es menor que el número de tipos de carácter elegidos.')); }
		var all = pools.join('');
		var chars = pools.map(function (p) { return p[R.int(p.length)]; });
		while (chars.length < len) { chars.push(all[R.int(all.length)]); }
		return { value: R.shuffle(chars).join(''), poolSize: all.length };
	};
	CT.entropy = function (poolSize, len) { return len * Math.log2(poolSize); };
	CT.strengthLabel = function (bits) {
		if (bits < 40) { return [__('Muy débil'), 0]; }
		if (bits < 60) { return [__('Débil'), 1]; }
		if (bits < 80) { return [__('Aceptable'), 2]; }
		if (bits < 100) { return [__('Fuerte'), 3]; }
		return [__('Muy fuerte'), 4];
	};
	var METER_COLORS = ['#d23a47', '#e07b26', '#c9a227', '#3aa76d', '#1f8a5b'];
	CT.meter = function (bits) {
		var s = CT.strengthLabel(bits);
		return h('div', null, h('div', { class: 'ct-meter', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '128', 'aria-valuenow': String(Math.round(bits)), 'aria-label': __('Fortaleza') }, h('div', { class: 'ct-meter__bar', style: { width: Math.min(100, bits / 1.28) + '%', background: METER_COLORS[s[1]] } })), h('p', { class: 'ct-help', text: s[0] + ' · ' + CT.sprintf(__('%s bits de entropía aproximada'), N(bits, 0)) }));
	};

	function listOutput(el, items, filename) {
		var out = ui.output({ label: __('Resultado'), rows: Math.min(14, Math.max(4, items.length)), mono: true, filename: function () { return filename; } });
		out.set(items.join('\n'));
		return out;
	}

	var tools = {};

	tools.password = function (el) {
		var len = ui.field({ label: __('Longitud'), type: 'range', value: 20, min: 4, max: 128, step: 1 });
		var lenOut = h('output', { class: 'ct-chip ct-chip--primary', text: '20' });
		var opts = {};
		[['lower', __('Minúsculas (a-z)')], ['upper', __('Mayúsculas (A-Z)')], ['digits', __('Números (0-9)')], ['symbols', __('Símbolos (!@#…)')], ['noAmbiguous', __('Evitar caracteres ambiguos (l, 1, O, 0…)')]].forEach(function (o) {
			opts[o[0]] = ui.field({ type: 'checkbox', label: o[1], value: o[0] !== 'noAmbiguous' });
		});
		var exclude = ui.field({ label: __('Excluir estos caracteres (opcional)'), value: '' });
		var count = ui.field({ label: __('Cantidad'), type: 'select', value: '1', options: [1, 5, 10, 20, 50].map(function (n) { return { value: String(n), label: String(n) }; }) });
		len.input.classList.add('ct-range');
		var result = ui.result();
		var run = function () {
			lenOut.textContent = len.input.value;
			var o = { exclude: exclude.input.value };
			Object.keys(opts).forEach(function (k) { o[k] = opts[k].input.checked; });
			try {
				var list = [], pool = 0;
				for (var i = 0; i < parseInt(count.input.value, 10); i++) { var p = CT.password(parseInt(len.input.value, 10), o); list.push(p.value); pool = p.poolSize; }
				var bits = CT.entropy(pool, parseInt(len.input.value, 10));
				var nodes = [];
				if (list.length === 1) {
					var big = h('p', { class: 'ct-result__main ct-mono', style: { fontSize: 'clamp(1.1rem, .9rem + 1.2vw, 1.6rem)', wordBreak: 'break-all' }, text: list[0] });
					nodes.push(h('div', { class: 'ct-result' }, h('p', { class: 'ct-result__label', text: __('Tu contraseña') }), big, CT.meter(bits), ui.actions(ui.button(__('Copiar'), { variant: 'primary', icon: 'copy', onClick: function () { CT.copy(list[0]); CT.track('done'); } }), ui.button(__('Generar otra'), { icon: 'refresh-ccw', onClick: run }))));
				} else {
					nodes.push(CT.meter(bits), listOutput(el, list, 'contrasenas.txt').el);
				}
				result.set(nodes);
			} catch (e) { result.error(e.message); }
		};
		el.appendChild(h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', for: len.input.id }, __('Longitud') + ' ', lenOut), len.input));
		var grid = h('div', { class: 'ct-cols' });
		Object.keys(opts).forEach(function (k) { grid.appendChild(opts[k].el); });
		el.appendChild(grid);
		el.appendChild(h('div', { class: 'ct-cols' }, exclude.el, count.el));
		el.appendChild(ui.actions(ui.button(__('Generar contraseña'), { variant: 'primary', icon: 'key-round', onClick: run })));
		el.appendChild(result.el);
		[len.input, exclude.input, count.input].concat(Object.keys(opts).map(function (k) { return opts[k].input; })).forEach(function (i) { i.addEventListener('input', run); i.addEventListener('change', run); });
		run();
	};

	tools.passphrase = function (el) {
		var words = ui.field({ label: __('Número de palabras'), type: 'select', value: '5', options: [3, 4, 5, 6, 7, 8, 10, 12].map(function (n) { return { value: String(n), label: String(n) }; }) });
		var sep = ui.field({ label: __('Separador'), type: 'select', value: '-', options: [{ value: '-', label: __('Guion') }, { value: ' ', label: __('Espacio') }, { value: '.', label: __('Punto') }, { value: '_', label: __('Guion bajo') }, { value: '', label: __('Ninguno') }] });
		var cap = ui.field({ type: 'checkbox', label: __('Primera letra en mayúscula'), value: true });
		var num = ui.field({ type: 'checkbox', label: __('Añadir un número de 2 cifras'), value: true });
		var noAcc = ui.field({ type: 'checkbox', label: __('Sin tildes (más fácil de teclear)'), value: true });
		var result = ui.result();
		var run = function () {
			CT.loadVendor('wordlist').then(function (list) {
				var wl = list;
				if (noAcc.input.checked) { var seen = {}; wl = list.map(function (w) { return w.normalize('NFD').replace(/[̀-ͯ]/g, ''); }).filter(function (w) { if (seen[w]) { return false; } seen[w] = 1; return true; }); }
				var n = parseInt(words.input.value, 10), parts = [];
				for (var i = 0; i < n; i++) { var w = R.pick(wl); parts.push(cap.input.checked ? w.charAt(0).toUpperCase() + w.slice(1) : w); }
				if (num.input.checked) { parts.push(String(R.range(10, 99))); }
				var phrase = parts.join(sep.input.value);
				var bits = n * Math.log2(wl.length) + (num.input.checked ? Math.log2(90) : 0);
				result.set(h('div', { class: 'ct-result' }, h('p', { class: 'ct-result__label', text: __('Frase de contraseña') }), h('p', { class: 'ct-result__main ct-mono', style: { fontSize: 'clamp(1.1rem, .9rem + 1.2vw, 1.6rem)', wordBreak: 'break-word' }, text: phrase }), CT.meter(bits),
					h('p', { class: 'ct-help', text: CT.sprintf(__('Elegidas al azar de una lista de %s palabras en español (BIP-39). La seguridad depende del azar, no de que la frase sea secreta en su forma.'), N(wl.length)) }),
					ui.actions(ui.button(__('Copiar'), { variant: 'primary', icon: 'copy', onClick: function () { CT.copy(phrase); CT.track('done'); } }), ui.button(__('Generar otra'), { icon: 'refresh-ccw', onClick: run }))));
			}).catch(function (e) { result.error(e.message); });
		};
		el.appendChild(h('div', { class: 'ct-cols' }, words.el, sep.el));
		el.appendChild(h('div', { class: 'ct-cols' }, cap.el, num.el, noAcc.el));
		el.appendChild(ui.actions(ui.button(__('Generar frase'), { variant: 'primary', icon: 'key-round', onClick: run })));
		el.appendChild(result.el);
		[words.input, sep.input, cap.input, num.input, noAcc.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	CT.uuid = {
		v4: function () {
			if (crypto.randomUUID) { return crypto.randomUUID(); }
			var b = R.bytes(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
			return fmtUuid(b);
		},
		v7: function () {
			var b = R.bytes(16), ms = Date.now();
			for (var i = 5; i >= 0; i--) { b[i] = ms % 256; ms = Math.floor(ms / 256); }
			b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
			return fmtUuid(b);
		}
	};
	function fmtUuid(b) { var x = Array.from(b, function (v) { return v.toString(16).padStart(2, '0'); }).join(''); return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20); }

	tools.uuid = function (el) {
		var ver = ui.seg({ label: __('Versión'), value: 'v4', options: [{ value: 'v4', label: __('v4 (aleatorio)') }, { value: 'v7', label: __('v7 (ordenado por tiempo)') }] });
		var count = ui.field({ label: __('Cantidad'), type: 'number', integer: true, value: 5 });
		var upper = ui.field({ type: 'checkbox', label: __('Mayúsculas'), value: false });
		var hyph = ui.field({ type: 'checkbox', label: __('Sin guiones'), value: false });
		var braces = ui.field({ type: 'checkbox', label: __('Entre llaves {}'), value: false });
		var box = h('div');
		var run = function () {
			var n = count.get();
			if (!isFinite(n) || n < 1 || n > 1000) { count.error(__('Entre 1 y 1000.')); return; }
			count.error('');
			var list = [];
			for (var i = 0; i < n; i++) {
				var u = CT.uuid[ver.get()]();
				if (hyph.input.checked) { u = u.replace(/-/g, ''); }
				if (upper.input.checked) { u = u.toUpperCase(); }
				if (braces.input.checked) { u = '{' + u + '}'; }
				list.push(u);
			}
			box.innerHTML = '';
			box.appendChild(listOutput(el, list, 'uuids.txt').el);
		};
		el.appendChild(ver.el);
		el.appendChild(h('div', { class: 'ct-cols' }, count.el, upper.el, hyph.el, braces.el));
		el.appendChild(ui.actions(ui.button(__('Generar'), { variant: 'primary', icon: 'refresh-ccw', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(box);
		[count.input, upper.input, hyph.input, braces.input].forEach(function (i) { i.addEventListener('change', run); });
		ver.el.addEventListener('change', run);
		run();
	};

	tools.numbers = function (el) {
		var min = ui.field({ label: __('Mínimo'), type: 'number', value: 1 });
		var max = ui.field({ label: __('Máximo'), type: 'number', value: 100 });
		var count = ui.field({ label: __('Cantidad'), type: 'number', integer: true, value: 1 });
		var dec = ui.field({ label: __('Decimales'), type: 'select', value: '0', options: [0, 1, 2, 3, 4].map(function (n) { return { value: String(n), label: String(n) }; }) });
		var unique = ui.field({ type: 'checkbox', label: __('Sin repetir'), value: true });
		var sort = ui.field({ type: 'checkbox', label: __('Ordenar de menor a mayor'), value: false });
		var result = ui.result();
		var run = function () {
			var a = min.get(), b = max.get(), n = count.get(), d = parseInt(dec.input.value, 10);
			[min, max, count].forEach(function (f) { f.error(''); });
			if (!isFinite(a)) { min.error(__('Introduce un número.')); return; }
			if (!isFinite(b) || b < a) { max.error(__('Debe ser mayor o igual que el mínimo.')); return; }
			if (!isFinite(n) || n < 1 || n > 10000) { count.error(__('Entre 1 y 10 000.')); return; }
			var f = Math.pow(10, d), lo = Math.ceil(a * f), hi = Math.floor(b * f), span = hi - lo + 1;
			if (span <= 0) { max.error(__('No hay valores posibles con esos decimales.')); return; }
			if (span > 4294967296) { max.error(__('El rango es demasiado grande.')); return; }
			if (unique.input.checked && n > span) { count.error(CT.sprintf(__('Solo hay %s valores distintos en el rango.'), N(span))); return; }
			var out = [], seen = {};
			while (out.length < n) {
				var v = lo + R.int(span);
				if (unique.input.checked) { if (seen[v]) { continue; } seen[v] = 1; }
				out.push(v);
			}
			if (sort.input.checked) { out.sort(function (x, y) { return x - y; }); }
			var txt = out.map(function (v) { return (v / f).toFixed(d).replace('.', ','); });
			result.set(n === 1 ? ui.resultCard({ label: __('Número aleatorio'), main: txt[0], copy: txt[0] }) : listOutput(el, txt, 'numeros.txt').el);
		};
		el.appendChild(h('div', { class: 'ct-cols' }, min.el, max.el, count.el, dec.el));
		el.appendChild(h('div', { class: 'ct-row' }, unique.el, sort.el));
		el.appendChild(ui.actions(ui.button(__('Generar'), { variant: 'primary', icon: 'dices', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(result.el);
		run();
	};

	CT.codePattern = function (pattern) {
		var L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', D = '0123456789', X = L + '23456789';
		return pattern.replace(/[A9X#a]/g, function (c) { return c === 'A' ? R.pick(L) : c === 'a' ? R.pick(L).toLowerCase() : c === '9' || c === '#' ? R.pick(D) : R.pick(X); });
	};
	tools.codes = function (el) {
		var pat = ui.field({ label: __('Patrón'), value: 'PRUEBA-XXXX-9999', mono: true, help: __('A = letra, a = letra minúscula, 9 = dígito, X = letra o dígito. El resto se copia tal cual.') });
		var count = ui.field({ label: __('Cantidad'), type: 'number', integer: true, value: 10 });
		var box = h('div');
		var run = function () {
			var n = count.get();
			if (!isFinite(n) || n < 1 || n > 10000) { count.error(__('Entre 1 y 10 000.')); return; }
			count.error('');
			if (!/[A9X#a]/.test(pat.input.value)) { pat.error(__('El patrón debe contener al menos un comodín (A, a, 9 o X).')); return; }
			pat.error('');
			var seen = {}, out = [], tries = 0;
			while (out.length < n && tries++ < n * 50) { var c = CT.codePattern(pat.input.value); if (!seen[c]) { seen[c] = 1; out.push(c); } }
			box.innerHTML = '';
			if (out.length < n) { box.appendChild(ui.alert('warn', __('El patrón no permite tantos códigos distintos.'))); }
			box.appendChild(listOutput(el, out, 'codigos.txt').el);
		};
		el.appendChild(h('div', { class: 'ct-cols' }, pat.el, count.el));
		el.appendChild(ui.alert('info', __('Códigos aleatorios para pruebas, maquetas o sorteos internos. No son válidos en ningún sistema real ni sustituyen a códigos oficiales.')));
		el.appendChild(ui.actions(ui.button(__('Generar'), { variant: 'primary', icon: 'ticket-check', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(box);
		[pat.input, count.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	var FIRST_F = 'María Carmen Ana Laura Isabel Lucía Marta Cristina Paula Elena Sara Raquel Andrea Sofía Julia Patricia Beatriz Silvia Nuria Irene Rosa Alba Claudia Teresa Pilar Lorena Natalia Rocío Eva Noelia Inés Celia Carla Daniela Alicia Miriam Martina Valeria Aitana Ainhoa'.split(' ');
	var FIRST_M = 'Antonio José Manuel Francisco David Juan Javier Daniel Carlos Jesús Alejandro Miguel Rafael Pablo Sergio Fernando Jorge Luis Alberto Álvaro Diego Adrián Raúl Rubén Iván Óscar Andrés Joaquín Hugo Mario Marcos Enrique Víctor Ignacio Martín Lucas Mateo Leo Nicolás Gonzalo'.split(' ');
	var LAST = 'García Rodríguez González Fernández López Martínez Sánchez Pérez Gómez Martín Jiménez Hernández Ruiz Díaz Moreno Muñoz Álvarez Romero Gutiérrez Alonso Navarro Torres Domínguez Ramos Vázquez Ramírez Gil Serrano Molina Blanco Castro Morales Suárez Ortega Delgado Ortiz Marín Rubio Núñez Medina Sanz Castillo Iglesias Cortés Garrido Santos Guerrero Lozano Cano Prieto Méndez Cruz Calvo Gallego Vidal León Márquez Herrera Peña Flores Cabrera Campos Vega Fuentes Carrasco Diez Aguilar Caballero Nieto Reyes Pascual Herrero Santana Lorenzo Hidalgo Montero Ibáñez Giménez Ferrer Durán Vicente Benítez Mora Santiago Arias Vargas Carmona Crespo Román Pastor Soto Sáez Velasco Moya Soler Parra Esteban Bravo Gallardo Rojas'.split(' ');
	var CITIES = 'Madrid Barcelona Valencia Sevilla Zaragoza Málaga Murcia Palma Bilbao Alicante Córdoba Valladolid Vigo Gijón Granada Oviedo Pamplona Santander Burgos Salamanca Logroño Cáceres Badajoz Toledo Almería Huelva Cádiz León Tarragona Lleida Girona Castellón Albacete Ourense Lugo Huesca Teruel Soria Segovia Ávila Zamora Palencia Cuenca Guadalajara Jaén Ciudad Real Pontevedra A Coruña Vitoria San Sebastián'.split(' ');
	CT.names = { female: FIRST_F, male: FIRST_M, last: LAST, cities: CITIES };

	tools.names = function (el) {
		var gender = ui.seg({ label: __('Nombres'), value: 'any', options: [{ value: 'any', label: __('Mixtos') }, { value: 'f', label: __('Femeninos') }, { value: 'm', label: __('Masculinos') }] });
		var format = ui.field({ label: __('Formato'), type: 'select', value: 'full', options: [{ value: 'full', label: __('Nombre y dos apellidos') }, { value: 'one', label: __('Nombre y un apellido') }, { value: 'first', label: __('Solo nombre') }, { value: 'last', label: __('Solo apellidos') }] });
		var count = ui.field({ label: __('Cantidad'), type: 'number', integer: true, value: 10 });
		var box = h('div');
		var run = function () {
			var n = count.get();
			if (!isFinite(n) || n < 1 || n > 1000) { count.error(__('Entre 1 y 1000.')); return; }
			count.error('');
			var out = [];
			for (var i = 0; i < n; i++) {
				var g = gender.get() === 'any' ? (R.int(2) ? 'f' : 'm') : gender.get();
				var first = R.pick(g === 'f' ? FIRST_F : FIRST_M), l1 = R.pick(LAST), l2 = R.pick(LAST);
				out.push({ full: first + ' ' + l1 + ' ' + l2, one: first + ' ' + l1, first: first, last: l1 + ' ' + l2 }[format.input.value]);
			}
			box.innerHTML = '';
			box.appendChild(listOutput(el, out, 'nombres.txt').el);
		};
		el.appendChild(gender.el);
		el.appendChild(h('div', { class: 'ct-cols' }, format.el, count.el));
		el.appendChild(ui.actions(ui.button(__('Generar nombres'), { variant: 'primary', icon: 'user-round', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(h('p', { class: 'ct-help', text: __('Combinaciones aleatorias de nombres y apellidos frecuentes en España, útiles para pruebas y ejemplos. No corresponden a personas concretas.') }));
		el.appendChild(box);
		[format.input, count.input].forEach(function (i) { i.addEventListener('change', run); });
		gender.el.addEventListener('change', run);
		run();
	};

	/* ---------- Colores ---------- */
	var Col = CT.color = {
		hexToRgb: function (hex) {
			var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
			if (!m) { return null; }
			var s = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
			var n = parseInt(s, 16);
			return [n >> 16, (n >> 8) & 255, n & 255];
		},
		rgbToHex: function (r, g, b) { return '#' + [r, g, b].map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); },
		rgbToHsl: function (r, g, b) {
			r /= 255; g /= 255; b /= 255;
			var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, hh = 0, s = 0;
			if (max !== min) {
				var d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
				hh *= 60;
			}
			return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
		},
		hslToRgb: function (hh, s, l) {
			s /= 100; l /= 100;
			var k = function (n) { return (n + hh / 30) % 12; }, a = s * Math.min(l, 1 - l);
			var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
			return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
		},
		parse: function (str) {
			str = String(str).trim();
			var rgb = Col.hexToRgb(str);
			if (rgb) { return rgb; }
			var m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(str);
			if (m) { return [+m[1], +m[2], +m[3]].map(function (v) { return Math.min(255, v); }); }
			m = /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(str);
			if (m) { return Col.hslToRgb(((+m[1] % 360) + 360) % 360, Math.min(100, +m[2]), Math.min(100, +m[3])); }
			return null;
		}
	};
	function swatch(hex) {
		var rgb = Col.hexToRgb(hex), hsl = Col.rgbToHsl(rgb[0], rgb[1], rgb[2]);
		var txt = CT.contrast(hex, '#000000') > CT.contrast(hex, '#ffffff') ? '#000' : '#fff';
		return h('div', { class: 'ct-swatch' }, h('div', { class: 'ct-swatch__color', style: { background: hex, color: txt, display: 'grid', placeItems: 'center', fontWeight: '700' }, text: hex.toUpperCase() }),
			h('div', { class: 'ct-swatch__info' }, h('span', { text: 'hsl(' + hsl.join(', ').replace(/, (\d+), (\d+)$/, ', $1%, $2%') + ')' }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar') + ' ' + hex, onClick: function () { CT.copy(hex.toUpperCase()); } })));
	}
	CT.swatch = swatch;

	tools.palette = function (el) {
		var base = h('input', { type: 'color', class: 'ct-color', value: '#5b3df5', 'aria-label': __('Color base') });
		var scheme = ui.field({ label: __('Armonía'), type: 'select', value: 'analog', options: [{ value: 'mono', label: __('Monocromática') }, { value: 'analog', label: __('Análoga') }, { value: 'comp', label: __('Complementaria') }, { value: 'split', label: __('Complementaria dividida') }, { value: 'triad', label: __('Triádica') }, { value: 'tetrad', label: __('Tetrádica') }, { value: 'shades', label: __('Tonos (claro → oscuro)') }] });
		var grid = h('div', { class: 'ct-swatches' });
		var code = ui.output({ label: __('Variables CSS'), rows: 6, mono: true, filename: function () { return 'paleta.css'; } });
		var current = [];
		var build = function () {
			var rgb = Col.hexToRgb(base.value), hsl = Col.rgbToHsl(rgb[0], rgb[1], rgb[2]);
			var hh = hsl[0], s = hsl[1], l = hsl[2];
			var mk = function (dh, ds, dl) { var c = Col.hslToRgb(((hh + dh) % 360 + 360) % 360, Math.max(0, Math.min(100, s + (ds || 0))), Math.max(4, Math.min(96, l + (dl || 0)))); return Col.rgbToHex(c[0], c[1], c[2]); };
			var sets = {
				mono: [mk(0, 0, -30), mk(0, 0, -15), mk(0, 0, 0), mk(0, -10, 15), mk(0, -20, 30)],
				analog: [mk(-40), mk(-20), mk(0), mk(20), mk(40)],
				comp: [mk(0, 0, -15), mk(0), mk(0, -20, 25), mk(180, 0, -10), mk(180)],
				split: [mk(0), mk(0, 0, 20), mk(150), mk(210), mk(210, 0, -15)],
				triad: [mk(0), mk(120), mk(240), mk(0, -20, 30), mk(120, -20, 30)],
				tetrad: [mk(0), mk(90), mk(180), mk(270), mk(0, -30, 35)],
				shades: [mk(0, 0, 40), mk(0, 0, 25), mk(0, 0, 10), mk(0, 0, -5), mk(0, 0, -20), mk(0, 0, -35)]
			};
			current = sets[scheme.input.value];
			grid.innerHTML = '';
			current.forEach(function (c) { grid.appendChild(swatch(c)); });
			code.set(':root {\n' + current.map(function (c, i) { return '  --color-' + (i + 1) + ': ' + c.toUpperCase() + ';'; }).join('\n') + '\n}');
		};
		el.appendChild(h('div', { class: 'ct-row', style: { alignItems: 'flex-end' } }, h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', text: __('Color base') }), base), scheme.el,
			h('div', { class: 'ct-field' }, ui.button(__('Color aleatorio'), { icon: 'shuffle', onClick: function () { base.value = Col.rgbToHex(R.int(256), R.int(256), R.int(256)); build(); } }))));
		el.appendChild(grid);
		el.appendChild(h('div', { style: { marginTop: '16px' } }, code.el));
		base.addEventListener('input', build);
		scheme.input.addEventListener('change', build);
		build();
	};

	tools.color = function (el) {
		var picker = h('input', { type: 'color', class: 'ct-color', value: '#5b3df5', 'aria-label': __('Selector de color') });
		var text = ui.field({ label: __('Color (HEX, RGB o HSL)'), value: '#5B3DF5', mono: true });
		var bg = ui.field({ label: __('Comparar contraste con'), value: '#FFFFFF', mono: true });
		var result = ui.result();
		var run = function () {
			var rgb = Col.parse(text.input.value);
			text.error(rgb ? '' : __('Formato no reconocido. Ejemplos: #5B3DF5, rgb(91, 61, 245), hsl(250, 90%, 60%).'));
			if (!rgb) { result.clear(); return; }
			var hex = Col.rgbToHex(rgb[0], rgb[1], rgb[2]), hsl = Col.rgbToHsl(rgb[0], rgb[1], rgb[2]);
			picker.value = hex;
			var other = Col.parse(bg.input.value);
			bg.error(other ? '' : __('Color no válido.'));
			var rows = [['HEX', hex.toUpperCase()], ['RGB', 'rgb(' + rgb.join(', ') + ')'], ['HSL', 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)'], [__('CSS con transparencia'), 'rgb(' + rgb.join(' ') + ' / 50%)']];
			var nodes = [h('div', { class: 'ct-row' }, h('div', { style: { width: '96px', height: '96px', borderRadius: '16px', background: hex, border: '1px solid var(--ct-border)' } }),
				ui.table([__('Formato'), __('Valor')], rows.map(function (r) { return [r[0], h('span', { class: 'ct-row' }, h('code', { text: r[1] }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar'), onClick: function () { CT.copy(r[1]); } }))]; })))];
			if (other) {
				var ohex = Col.rgbToHex(other[0], other[1], other[2]);
				var c = CT.contrast(hex, ohex);
				var ok = function (v, t) { return v >= t ? '✓ ' + __('cumple') : '✗ ' + __('no cumple'); };
				nodes.push(h('div', { class: 'ct-result' }, h('p', { class: 'ct-result__label', text: __('Contraste WCAG') }), h('p', { class: 'ct-result__main', text: N(c, 2) + ' : 1' }),
					h('div', { style: { padding: '12px 16px', borderRadius: '10px', background: ohex, color: hex, fontWeight: '600', marginBottom: '12px' }, text: __('Texto de ejemplo con estos colores') }),
					h('div', { class: 'ct-result__grid' }, ui.stat(__('AA texto normal (4,5)'), ok(c, 4.5), c >= 4.5 ? 'good' : 'bad'), ui.stat(__('AA texto grande (3)'), ok(c, 3), c >= 3 ? 'good' : 'bad'), ui.stat(__('AAA texto normal (7)'), ok(c, 7), c >= 7 ? 'good' : 'bad'), ui.stat(__('Componentes gráficos (3)'), ok(c, 3), c >= 3 ? 'good' : 'bad'))));
			}
			result.set(nodes);
		};
		picker.addEventListener('input', function () { text.input.value = picker.value.toUpperCase(); run(); });
		el.appendChild(h('div', { class: 'ct-row', style: { alignItems: 'flex-end' } }, h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', text: __('Elegir') }), picker), text.el, bg.el));
		el.appendChild(result.el);
		[text.input, bg.input].forEach(function (i) { i.addEventListener('input', CT.debounce(run, 150)); });
		run();
	};

	tools.gradient = function (el) {
		var c1 = h('input', { type: 'color', class: 'ct-color', value: '#5b3df5', 'aria-label': __('Color 1') });
		var c2 = h('input', { type: 'color', class: 'ct-color', value: '#22c1c3', 'aria-label': __('Color 2') });
		var c3 = h('input', { type: 'color', class: 'ct-color', value: '#fdbb2d', 'aria-label': __('Color 3') });
		var use3 = ui.field({ type: 'checkbox', label: __('Usar tercer color'), value: false });
		var type = ui.field({ label: __('Tipo'), type: 'select', value: 'linear', options: [{ value: 'linear', label: __('Lineal') }, { value: 'radial', label: __('Radial') }, { value: 'conic', label: __('Cónico') }] });
		var angle = ui.field({ label: __('Ángulo'), type: 'range', value: 135, min: 0, max: 360, step: 5 });
		angle.input.classList.add('ct-range');
		var preview = h('div', { style: { height: '200px', borderRadius: '16px', border: '1px solid var(--ct-border)' } });
		var code = ui.output({ label: 'CSS', rows: 3, mono: true });
		var css = '';
		var run = function () {
			var cols = [c1.value, c2.value].concat(use3.input.checked ? [c3.value] : []).join(', ');
			css = type.input.value === 'linear' ? 'linear-gradient(' + angle.input.value + 'deg, ' + cols + ')' : type.input.value === 'radial' ? 'radial-gradient(circle, ' + cols + ')' : 'conic-gradient(from ' + angle.input.value + 'deg, ' + cols + ')';
			preview.style.background = css;
			code.set('background: ' + c1.value + ';\nbackground: ' + css + ';');
		};
		el.appendChild(h('div', { class: 'ct-row', style: { alignItems: 'center' } }, c1, c2, c3, use3.el));
		el.appendChild(h('div', { class: 'ct-cols' }, type.el, angle.el));
		el.appendChild(preview);
		el.appendChild(h('div', { style: { marginTop: '12px' } }, code.el));
		el.appendChild(ui.actions(ui.button(__('Descargar imagen PNG (1920 × 1080)'), { icon: 'download', onClick: function () {
			var c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
			var ctx = c.getContext('2d'), g;
			var stops = [c1.value, c2.value].concat(use3.input.checked ? [c3.value] : []);
			if (type.input.value === 'radial') { g = ctx.createRadialGradient(960, 540, 0, 960, 540, 1101); }
			else if (type.input.value === 'conic' && ctx.createConicGradient) { g = ctx.createConicGradient((angle.input.value - 90) * Math.PI / 180, 960, 540); }
			else { var a = (angle.input.value - 90) * Math.PI / 180, r = 1101; g = ctx.createLinearGradient(960 - Math.cos(a) * r, 540 - Math.sin(a) * r, 960 + Math.cos(a) * r, 540 + Math.sin(a) * r); }
			stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); });
			ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
			CT.canvasToBlob(c, 'image/png').then(function (b) { CT.download(b, 'degradado.png'); });
		} })));
		[c1, c2, c3, use3.input, type.input, angle.input].forEach(function (i) { i.addEventListener('input', run); i.addEventListener('change', run); });
		run();
	};

	tools.sampledata = function (el) {
		var COLS = [['nombre', __('Nombre')], ['apellidos', __('Apellidos')], ['email', __('Correo (example.com)')], ['telefono', __('Teléfono ficticio')], ['ciudad', __('Ciudad')], ['cp', __('Código postal')], ['fecha', __('Fecha')], ['edad', __('Edad')], ['importe', __('Importe')], ['activo', __('Booleano')], ['id', __('Identificador UUID')]];
		var checks = COLS.map(function (c, i) { var f = ui.field({ type: 'checkbox', label: c[1], value: i < 5 || c[0] === 'importe' }); f.key = c[0]; return f; });
		var rows = ui.field({ label: __('Filas'), type: 'number', integer: true, value: 20 });
		var fmt = ui.seg({ label: __('Formato'), value: 'csv', options: [{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }, { value: 'sql', label: 'SQL' }] });
		var out = ui.output({ label: __('Datos generados'), rows: 12, mono: true, filename: function () { return 'datos-ejemplo.' + fmt.get(); } });
		var gen = function () {
			var n = rows.get();
			if (!isFinite(n) || n < 1 || n > 5000) { rows.error(__('Entre 1 y 5000 filas.')); return; }
			rows.error('');
			var keys = checks.filter(function (c) { return c.input.checked; }).map(function (c) { return c.key; });
			if (!keys.length) { out.set(''); return; }
			var data = [];
			for (var i = 0; i < n; i++) {
				var first = R.pick(R.int(2) ? FIRST_F : FIRST_M), l1 = R.pick(LAST), l2 = R.pick(LAST);
				var slug = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, ''); };
				var rec = {
					nombre: first, apellidos: l1 + ' ' + l2,
					email: slug(first) + '.' + slug(l1) + R.range(1, 999) + '@example.com',
					telefono: '+34 6' + R.range(10, 99) + ' ' + String(R.range(0, 999)).padStart(3, '0') + ' ' + String(R.range(0, 999)).padStart(3, '0'),
					ciudad: R.pick(CITIES), cp: String(R.range(1, 52)).padStart(2, '0') + String(R.range(0, 999)).padStart(3, '0'),
					fecha: new Date(Date.UTC(R.range(2020, 2026), R.int(12), R.range(1, 28))).toISOString().slice(0, 10),
					edad: R.range(18, 85), importe: R.range(100, 99999) / 100, activo: R.int(2) === 1, id: CT.uuid.v4()
				};
				var row = {}; keys.forEach(function (k) { row[k] = rec[k]; });
				data.push(row);
			}
			if (fmt.get() === 'json') { out.set(JSON.stringify(data, null, 2)); }
			else if (fmt.get() === 'sql') { out.set(data.map(function (r) { return 'INSERT INTO ejemplo (' + keys.join(', ') + ') VALUES (' + keys.map(function (k) { var v = r[k]; return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : "'" + String(v).replace(/'/g, "''") + "'"; }).join(', ') + ');'; }).join('\n')); }
			else { out.set(CT.csv.stringify([keys].concat(data.map(function (r) { return keys.map(function (k) { return typeof r[k] === 'number' ? String(r[k]).replace('.', ',') : String(r[k]); }); })), ';')); }
		};
		var grid = h('div', { class: 'ct-cols' }); checks.forEach(function (c) { grid.appendChild(c.el); });
		el.appendChild(grid);
		el.appendChild(h('div', { class: 'ct-row' }, rows.el, fmt.el));
		el.appendChild(ui.alert('info', __('Datos ficticios para pruebas. Los correos usan el dominio reservado example.com; los teléfonos son aleatorios y podrían coincidir con números reales: no los uses para contactar.')));
		el.appendChild(ui.actions(ui.button(__('Generar datos'), { variant: 'primary', icon: 'database', onClick: function () { gen(); CT.track('done'); } })));
		el.appendChild(out.el);
		checks.forEach(function (c) { c.input.addEventListener('change', gen); });
		fmt.el.addEventListener('change', gen);
		gen();
	};

	tools.filenames = function (el) {
		var base = ui.field({ label: __('Texto base'), value: 'Informe de ventas' });
		var pattern = ui.field({ label: __('Patrón'), value: '{fecha}_{texto}_{n}', mono: true, help: __('Comodines: {texto}, {fecha} (AAAA-MM-DD), {hora} (hhmm), {n} (número), {aleatorio} (4 caracteres).') });
		var ext = ui.field({ label: __('Extensión'), value: 'pdf' });
		var count = ui.field({ label: __('Cantidad'), type: 'number', integer: true, value: 5 });
		var start = ui.field({ label: __('Número inicial'), type: 'number', integer: true, value: 1 });
		var pad = ui.field({ label: __('Dígitos del número'), type: 'select', value: '3', options: [1, 2, 3, 4, 5].map(function (n) { return { value: String(n), label: String(n) }; }) });
		var style = ui.field({ label: __('Estilo del texto'), type: 'select', value: 'kebab', options: [{ value: 'kebab', label: 'informe-de-ventas' }, { value: 'snake', label: 'informe_de_ventas' }, { value: 'camel', label: 'InformeDeVentas' }, { value: 'keep', label: __('Sin cambios') }] });
		var box = h('div');
		var run = function () {
			var n = count.get(), s = start.get();
			if (!isFinite(n) || n < 1 || n > 5000) { count.error(__('Entre 1 y 5000.')); return; }
			count.error('');
			var words = base.input.value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
			var t = { kebab: words.join('-').toLowerCase(), snake: words.join('_').toLowerCase(), camel: words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(''), keep: CT.safeName(base.input.value) }[style.input.value];
			var d = new Date(), date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), time = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
			var e = ext.input.value.replace(/^\.+/, '').replace(/[^A-Za-z0-9]/g, '');
			var list = [];
			for (var i = 0; i < n; i++) {
				var name = pattern.input.value.replace(/\{texto\}/g, t).replace(/\{fecha\}/g, date).replace(/\{hora\}/g, time).replace(/\{n\}/g, String((isFinite(s) ? s : 1) + i).padStart(parseInt(pad.input.value, 10), '0')).replace(/\{aleatorio\}/g, function () { return CT.codePattern('xxxx').toLowerCase(); });
				list.push(CT.safeName(name) + (e ? '.' + e : ''));
			}
			box.innerHTML = '';
			box.appendChild(listOutput(el, list, 'nombres-de-archivo.txt').el);
		};
		el.appendChild(h('div', { class: 'ct-cols' }, base.el, pattern.el, ext.el, style.el, count.el, start.el, pad.el));
		el.appendChild(ui.actions(ui.button(__('Generar nombres'), { variant: 'primary', icon: 'file-type', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(box);
		[base.input, pattern.input, ext.input, count.input, start.input, pad.input, style.input].forEach(function (i) { i.addEventListener('input', CT.debounce(run, 150)); i.addEventListener('change', run); });
		run();
	};

	CT.register('gen', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
