/*!
 * ClickTools — seguridad y privacidad. Todo se calcula en el navegador: nada se envía.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;

	function randBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
	function randInt(n) { var max = Math.floor(0x100000000 / n) * n, b = new Uint32Array(1); do { crypto.getRandomValues(b); } while (b[0] >= max); return b[0] % n; }
	function toHex(bytes) { return Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
	function toB64(bytes, url) { var s = ''; bytes.forEach(function (b) { s += String.fromCharCode(b); }); var r = btoa(s); return url ? r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : r; }

	/* ---------- Análisis local de contraseñas (exportado para pruebas) ---------- */
	var COMMON = ('123456 123456789 12345678 password 12345 qwerty 1234567 111111 123123 abc123 1234567890 000000 iloveyou 1234 qwerty123 password1 654321 666666 987654321 123321 7777777 1q2w3e4r 1qaz2wsx ' +
		'123qwe zxcvbnm asdfghjkl qwertyuiop superman dragon football monkey letmein welcome admin administrador contraseña contrasena clave secreto hola hola123 tequiero teamo ' +
		'barcelona realmadrid madrid espana españa futbol princesa mariposa estrella corazon amor amorcito sol gatito perro chocolate familia dios jesus maria angel carlos daniel alejandro ' +
		'javier david pablo sergio laura lucia andrea paula 147258369 159753 789456123 112233 121212 abcdef abcd1234 passw0rd p@ssw0rd changeme default root toor test prueba usuario').split(' ');
	var SEQS = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjklñ', 'zxcvbnm', '1qaz2wsx3edc', 'qazwsxedc'];
	CT.pwCheck = function (pw) {
		var issues = [], tips = [];
		var lower = pw.toLowerCase();
		var pool = 0;
		if (/[a-zñáéíóúü]/.test(pw)) { pool += 27; }
		if (/[A-ZÑÁÉÍÓÚÜ]/.test(pw)) { pool += 27; }
		if (/\d/.test(pw)) { pool += 10; }
		if (/[^a-zA-Z0-9ñÑáéíóúüÁÉÍÓÚÜ]/.test(pw)) { pool += 33; }
		var len = Array.from(pw).length;
		var bits = len * Math.log2(Math.max(pool, 1));
		var penalty = 0;
		var stripped = lower.replace(/[^a-zñ0-9]/g, '');
		var leet = lower.replace(/@/g, 'a').replace(/0/g, 'o').replace(/3/g, 'e').replace(/1/g, 'i').replace(/\$/g, 's').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
		if (COMMON.indexOf(lower) >= 0 || COMMON.indexOf(stripped) >= 0 || COMMON.indexOf(leet) >= 0) { issues.push(__('Es una de las contraseñas más utilizadas y aparece en todas las listas de ataque.')); bits = Math.min(bits, 10); }
		else {
			COMMON.forEach(function (w) { if (w.length >= 5 && (lower.indexOf(w) >= 0 || leet.indexOf(w) >= 0)) { penalty = Math.max(penalty, w.length * 3); issues.push(CT.sprintf(__('Contiene una palabra o secuencia muy común («%s»).'), w)); } });
		}
		SEQS.forEach(function (s) {
			for (var i = 0; i + 4 <= s.length; i++) {
				var chunk = s.substr(i, 4);
				if (lower.indexOf(chunk) >= 0 || lower.indexOf(chunk.split('').reverse().join('')) >= 0) { penalty = Math.max(penalty, 14); issues.push(__('Incluye una secuencia de teclado o alfabética (abcd, 1234, qwer…).')); return; }
			}
		});
		if (/(.)\1{2,}/.test(pw)) { penalty += 8; issues.push(__('Repite el mismo carácter varias veces seguidas.')); }
		if (/(19[4-9]\d|20[0-4]\d)/.test(pw)) { penalty += 8; issues.push(__('Parece contener un año, fácil de adivinar si está relacionado contigo.')); }
		if (/^[A-ZÑ][a-zñ]+\d{1,4}[!.]?$/.test(pw)) { penalty += 10; issues.push(__('Sigue el patrón típico «Palabra + números», que los atacantes prueban primero.')); }
		issues = issues.filter(function (x, i) { return issues.indexOf(x) === i; });
		bits = Math.max(0, bits - penalty);
		if (len < 12) { tips.push(__('Usa al menos 12 caracteres; mejor 16 o más.')); }
		if (pool < 60) { tips.push(__('Combina mayúsculas, minúsculas, números y símbolos, o usa una frase de varias palabras al azar.')); }
		tips.push(__('No reutilices la misma contraseña en varios servicios y usa un gestor de contraseñas.'));
		tips.push(__('Activa la verificación en dos pasos siempre que esté disponible.'));
		return { bits: bits, length: len, pool: pool, issues: issues, tips: tips };
	};
	CT.crackTime = function (bits, guessesPerSecond) {
		var seconds = Math.pow(2, bits) / 2 / guessesPerSecond;
		var units = [[31557600 * 1e9, __('miles de millones de años')], [31557600 * 1e6, __('millones de años')], [31557600 * 1000, __('miles de años')], [31557600, __('años')], [2629800, __('meses')], [86400, __('días')], [3600, __('horas')], [60, __('minutos')], [1, __('segundos')]];
		if (seconds < 1) { return __('menos de un segundo'); }
		for (var i = 0; i < units.length; i++) { if (seconds >= units[i][0]) { return N(seconds / units[i][0], seconds / units[i][0] < 10 ? 1 : 0) + ' ' + units[i][1]; } }
		return __('menos de un segundo');
	};

	var tools = {};

	tools.strength = function (el) {
		var f = ui.field({ label: __('Contraseña a comprobar'), type: 'password', autocomplete: 'off' });
		f.input.setAttribute('autocomplete', 'new-password');
		var show = ui.field({ type: 'checkbox', label: __('Mostrar la contraseña'), value: false });
		var result = ui.result();
		show.input.addEventListener('change', function () { f.input.type = show.input.checked ? 'text' : 'password'; });
		var run = function () {
			var pw = f.input.value;
			if (!pw) { result.set(ui.alert('info', __('Escribe una contraseña para analizarla. El análisis se hace en tu dispositivo: no se envía ni se guarda.'))); return; }
			var r = CT.pwCheck(pw);
			var nodes = [CT.meter ? CT.meter(r.bits) : null];
			var card = h('div', { class: 'ct-result' }, h('p', { class: 'ct-result__label', text: __('Tiempo estimado para adivinarla') }),
				h('div', { class: 'ct-result__grid' },
					ui.stat(__('Ataque sin conexión, equipo potente (10¹⁰ intentos/s)'), CT.crackTime(r.bits, 1e10)),
					ui.stat(__('Ataque en línea con límites (10 intentos/s)'), CT.crackTime(r.bits, 10)),
					ui.stat(__('Longitud'), N(r.length) + ' ' + __('caracteres')),
					ui.stat(__('Entropía estimada'), N(r.bits, 0) + ' bits')));
			nodes.push(card);
			if (r.issues.length) { nodes.push(h('div', { class: 'ct-alert ct-alert--warn', role: 'status' }, h('div', null, h('p', null, h('strong', { text: __('Puntos débiles detectados:') })), h('ul', null, r.issues.map(function (i) { return h('li', { text: i }); }))))); }
			nodes.push(h('div', { class: 'ct-panel' }, h('h3', { class: 'ct-panel__title', text: __('Recomendaciones') }), h('ul', null, r.tips.map(function (t) { return h('li', { text: t }); }))));
			nodes.push(h('p', { class: 'ct-help', text: __('Estimación orientativa basada en la longitud, los tipos de caracteres y patrones conocidos. No comprueba si la contraseña ha aparecido en filtraciones (eso requeriría enviarla a un servicio externo).') }));
			result.set(nodes);
		};
		el.appendChild(f.el);
		el.appendChild(show.el);
		el.appendChild(result.el);
		f.input.addEventListener('input', CT.debounce(run, 100));
		run();
	};
	// El medidor visual se comparte con el generador (gen.js) si está cargado.
	if (!CT.meter) {
		CT.meter = function (bits) {
			var colors = ['#d23a47', '#e07b26', '#c9a227', '#3aa76d', '#1f8a5b'];
			var lvl = bits < 40 ? 0 : bits < 60 ? 1 : bits < 80 ? 2 : bits < 100 ? 3 : 4;
			var label = [__('Muy débil'), __('Débil'), __('Aceptable'), __('Fuerte'), __('Muy fuerte')][lvl];
			return h('div', null, h('div', { class: 'ct-meter', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '128', 'aria-valuenow': String(Math.round(bits)), 'aria-label': __('Fortaleza') }, h('div', { class: 'ct-meter__bar', style: { width: Math.min(100, bits / 1.28) + '%', background: colors[lvl] } })), h('p', { class: 'ct-help', text: label + ' · ' + CT.sprintf(__('%s bits de entropía aproximada'), N(bits, 0)) }));
		};
	}

	tools.entropy = function (el) {
		var mode = ui.seg({ label: __('Tipo'), value: 'chars', options: [{ value: 'chars', label: __('Contraseña de caracteres') }, { value: 'words', label: __('Frase de palabras') }] });
		var pool = ui.field({ label: __('Tamaño del conjunto de caracteres'), type: 'select', value: '94', options: [{ value: '10', label: __('Solo números (10)') }, { value: '26', label: __('Minúsculas (26)') }, { value: '36', label: __('Minúsculas y números (36)') }, { value: '52', label: __('Mayúsculas y minúsculas (52)') }, { value: '62', label: __('Letras y números (62)') }, { value: '94', label: __('ASCII imprimible completo (94)') }] });
		var len = ui.field({ label: __('Longitud (caracteres o palabras)'), type: 'number', integer: true, value: 16 });
		var wl = ui.field({ label: __('Palabras en la lista'), type: 'number', integer: true, value: 7776, help: __('Diceware usa 7776 palabras; BIP-39, 2048.') });
		var gps = ui.field({ label: __('Intentos por segundo del atacante'), type: 'select', value: '1e10', options: [{ value: '10', label: __('10 (en línea, con límites)') }, { value: '1e4', label: '10⁴' }, { value: '1e10', label: __('10¹⁰ (sin conexión, GPU)') }, { value: '1e12', label: __('10¹² (granja de GPU)') }] });
		var result = ui.result();
		var run = function () {
			var isW = mode.get() === 'words';
			pool.el.hidden = isW; wl.el.hidden = !isW;
			var n = len.get(), size = isW ? wl.get() : parseInt(pool.input.value, 10);
			if (!isFinite(n) || n < 1 || n > 1000) { len.error(__('Entre 1 y 1000.')); result.clear(); return; }
			len.error('');
			if (!isFinite(size) || size < 2) { wl.error(__('Introduce un número mayor que 1.')); result.clear(); return; }
			wl.error('');
			var bits = n * Math.log2(size);
			result.set(ui.resultCard({ label: __('Entropía'), main: N(bits, 1) + ' bits', stats: [[__('Combinaciones posibles'), '2^' + N(bits, 1)], [__('Tiempo medio de fuerza bruta'), CT.crackTime(bits, parseFloat(gps.input.value))]], formula: 'H = L × log₂(N)', note: __('Solo es válida si cada carácter o palabra se elige completamente al azar. Las contraseñas inventadas por personas tienen mucha menos entropía real.') }));
		};
		el.appendChild(mode.el);
		el.appendChild(h('div', { class: 'ct-cols' }, pool.el, wl.el, len.el, gps.el));
		el.appendChild(result.el);
		[pool.input, len.input, wl.input, gps.input].forEach(function (i) { i.addEventListener('input', run); i.addEventListener('change', run); });
		mode.el.addEventListener('change', run);
		run();
	};

	/* ---------- MD5 (solo para verificar integridad; no es seguro criptográficamente) ---------- */
	function md5(bytes) {
		var K = new Int32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
		for (var i = 0; i < 64; i++) { K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0; }
		var len = bytes.length, padLen = ((len + 8) >>> 6) + 1 << 6;
		var buf = new Uint8Array(padLen); buf.set(bytes); buf[len] = 0x80;
		var dv = new DataView(buf.buffer);
		dv.setUint32(padLen - 8, (len * 8) >>> 0, true);
		dv.setUint32(padLen - 4, Math.floor(len / 0x20000000), true);
		var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
		var M = new Int32Array(16);
		for (var off = 0; off < padLen; off += 64) {
			for (var j = 0; j < 16; j++) { M[j] = dv.getInt32(off + j * 4, true); }
			var A = a0, B = b0, C = c0, D = d0;
			for (var k = 0; k < 64; k++) {
				var F, g, r = k >> 4;
				if (r === 0) { F = (B & C) | (~B & D); g = k; }
				else if (r === 1) { F = (D & B) | (~D & C); g = (5 * k + 1) & 15; }
				else if (r === 2) { F = B ^ C ^ D; g = (3 * k + 5) & 15; }
				else { F = C ^ (B | ~D); g = (7 * k) & 15; }
				var tmp = D; D = C; C = B;
				var x = (A + F + K[k] + M[g]) | 0, s = S[(r << 2) + (k & 3)];
				B = (B + ((x << s) | (x >>> (32 - s)))) | 0;
				A = tmp;
			}
			a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
		}
		var out = new Uint8Array(16), odv = new DataView(out.buffer);
		[a0, b0, c0, d0].forEach(function (v, i2) { odv.setInt32(i2 * 4, v, true); });
		return toHex(out);
	}
	CT.md5 = md5;
	CT.digest = function (algo, buf) {
		if (algo === 'MD5') { return Promise.resolve(md5(new Uint8Array(buf))); }
		if (!window.crypto || !crypto.subtle) { return Promise.reject(new Error(__('Tu navegador no permite calcular hashes SHA en esta página (se necesita una conexión segura HTTPS).'))); }
		return crypto.subtle.digest(algo, buf).then(function (d) { return toHex(new Uint8Array(d)); });
	};

	tools.filehash = function (el, tool) {
		var textMode = tool.config && tool.config.text;
		var algos = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
		var expected = ui.field({ label: __('Hash esperado para comparar (opcional)'), mono: true, value: '' });
		var result = ui.result();
		var progress = ui.progress();
		var show = function (name, buf, size) {
			progress.indeterminate(__('Calculando…'));
			Promise.all(algos.map(function (a) { return CT.digest(a, buf); })).then(function (hashes) {
				progress.done();
				var exp = expected.input.value.trim().toLowerCase().replace(/\s+/g, '');
				var match = exp ? hashes.indexOf(exp) : -2;
				var nodes = [];
				if (exp) { nodes.push(match >= 0 ? ui.alert('ok', CT.sprintf(__('Coincide con el hash %s esperado: el archivo es idéntico.'), algos[match])) : ui.alert('err', __('No coincide con ningún hash calculado. El archivo puede ser distinto, estar dañado o el hash esperado puede ser de otro algoritmo.'))); }
				nodes.push(ui.table([__('Algoritmo'), __('Hash')], hashes.map(function (hs, i) {
					return [algos[i] + (algos[i] === 'MD5' || algos[i] === 'SHA-1' ? ' *' : ''), h('span', { class: 'ct-row', style: { flexWrap: 'nowrap' } }, h('code', { text: hs, style: { wordBreak: 'break-all', whiteSpace: 'normal' } }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar'), onClick: function () { CT.copy(hs); } }))];
				}), { wrap: true, caption: name }));
				nodes.push(h('p', { class: 'ct-help', text: (name ? name + ' · ' + CT.fmt.bytes(size) + ' · ' : '') + __('* MD5 y SHA-1 ya no son seguros frente a ataques deliberados; úsalos solo para comprobar descargas cuando el proveedor no ofrezca SHA-256.') }));
				result.set(nodes);
				CT.track('done');
			}).catch(function (e) { progress.done(); CT.fail(result, e); });
		};
		if (textMode) {
			var t = ui.field({ label: __('Texto'), type: 'textarea', rows: 6, mono: true, value: 'ClickTools' });
			var run = CT.debounce(function () { show('', new TextEncoder().encode(t.input.value).buffer, 0); }, 200);
			t.input.addEventListener('input', run);
			expected.input.addEventListener('input', run);
			el.appendChild(t.el);
			el.appendChild(expected.el);
			el.appendChild(result.el);
			run();
			return;
		}
		var drop = ui.dropzone({ hint: __('Cualquier tipo de archivo. Se lee en tu dispositivo; no se sube.'), maxMb: 2048, onFiles: function (files) {
			var f = files[0];
			if (f.size > 1024 * 1024 * 1024) { result.error(__('Para calcular el hash en el navegador el archivo debe ocupar menos de 1 GB.')); return; }
			progress.indeterminate(__('Leyendo el archivo…'));
			CT.readFile(f).then(function (buf) { show(f.name, buf, f.size); }).catch(function (e) { progress.done(); CT.fail(result, e); });
		} });
		el.appendChild(drop.el);
		el.appendChild(expected.el);
		el.appendChild(progress.el);
		el.appendChild(result.el);
	};

	tools.keys = function (el) {
		var bits = ui.field({ label: __('Tamaño'), type: 'select', value: '32', options: [{ value: '16', label: '128 bits (16 bytes)' }, { value: '24', label: '192 bits (24 bytes)' }, { value: '32', label: '256 bits (32 bytes)' }, { value: '64', label: '512 bits (64 bytes)' }] });
		var enc = ui.field({ label: __('Formato'), type: 'select', value: 'hex', options: [{ value: 'hex', label: __('Hexadecimal') }, { value: 'b64', label: 'Base64' }, { value: 'b64url', label: 'Base64 URL' }] });
		var count = ui.field({ label: __('Cantidad'), type: 'select', value: '1', options: [1, 5, 10, 20].map(function (n) { return { value: String(n), label: String(n) }; }) });
		var out = ui.output({ label: __('Claves generadas'), rows: 5, mono: true });
		var run = function () {
			var list = [];
			for (var i = 0; i < parseInt(count.input.value, 10); i++) {
				var b = randBytes(parseInt(bits.input.value, 10));
				list.push(enc.input.value === 'hex' ? toHex(b) : toB64(b, enc.input.value === 'b64url'));
			}
			out.set(list.join('\n'));
		};
		el.appendChild(h('div', { class: 'ct-cols' }, bits.el, enc.el, count.el));
		el.appendChild(ui.alert('warn', __('Claves aleatorias para desarrollo y pruebas (secretos de sesión, tokens de ejemplo…). No sustituyen a una infraestructura de gestión de claves: en producción, genera y guarda los secretos en el propio servidor o en un gestor de secretos.')));
		el.appendChild(ui.actions(ui.button(__('Generar'), { variant: 'primary', icon: 'key', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(out.el);
		[bits.input, enc.input, count.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	tools.recovery = function (el) {
		var count = ui.field({ label: __('Número de códigos'), type: 'select', value: '10', options: [8, 10, 12, 16].map(function (n) { return { value: String(n), label: String(n) }; }) });
		var groups = ui.field({ label: __('Formato'), type: 'select', value: '4-4', options: [{ value: '4-4', label: 'XXXX-XXXX' }, { value: '5-5', label: 'XXXXX-XXXXX' }, { value: '4-4-4', label: 'XXXX-XXXX-XXXX' }] });
		var out = ui.output({ label: __('Códigos de demostración'), rows: 10, mono: true, filename: function () { return 'codigos-demo.txt'; } });
		var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		var run = function () {
			var list = [];
			for (var i = 0; i < parseInt(count.input.value, 10); i++) {
				list.push(groups.input.value.split('-').map(function (g) { var s = ''; for (var k = 0; k < parseInt(g, 10); k++) { s += A[randInt(A.length)]; } return s; }).join('-'));
			}
			out.set(list.join('\n'));
		};
		el.appendChild(ui.alert('warn', __('Estos códigos son solo una demostración para maquetas, pruebas o formación. No sirven para recuperar ninguna cuenta real: los códigos válidos los genera cada servicio (Google, Microsoft, tu banco…) desde su configuración de seguridad.')));
		el.appendChild(h('div', { class: 'ct-cols' }, count.el, groups.el));
		el.appendChild(ui.actions(ui.button(__('Generar'), { variant: 'primary', icon: 'refresh-ccw', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(out.el);
		[count.input, groups.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy'];
	tools.urlcheck = function (el) {
		var f = ui.field({ label: __('Enlace que quieres revisar'), value: 'https://www.ejemplo-banco.com.verificacion-cuenta.net/login?id=123', mono: true, help: __('Pega el enlace sin abrirlo. No lo visitamos ni lo enviamos a ningún sitio: solo analizamos su texto.') });
		var result = ui.result();
		var run = function () {
			var raw = f.input.value.trim();
			if (!raw) { result.clear(); return; }
			var u;
			try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : 'http://' + raw); } catch (e) { result.error(__('No parece un enlace con formato válido.')); return; }
			var host = u.hostname;
			var parts = host.split('.');
			var signs = [];
			var add = function (cond, text) { if (cond) { signs.push(text); } };
			add(u.protocol === 'http:', __('Usa http y no https: la conexión no estaría cifrada. Nunca introduzcas contraseñas ni datos de pago.'));
			add(/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.indexOf(':') >= 0, __('El destino es una dirección IP en lugar de un nombre de dominio.'));
			add(raw.indexOf('@') >= 0 && raw.indexOf('@') < raw.indexOf(host) + host.length, __('Contiene «@» antes del dominio: lo que aparece antes de la arroba se ignora y puede engañar.'));
			add(/xn--/.test(host), __('El dominio usa caracteres internacionales (punycode, «xn--»): podría imitar visualmente a otro dominio.'));
			add(/[^\x00-\x7F]/.test(raw) && !/xn--/.test(host), __('Contiene caracteres no latinos o especiales que pueden parecerse a letras normales.'));
			add(parts.length > 4, __('Tiene muchos subdominios: fíjate en el dominio real, que es la parte justo antes de la extensión final.'));
			add((host.match(/-/g) || []).length >= 3, __('El dominio contiene muchos guiones, algo habitual en dominios de suplantación.'));
			add(SHORTENERS.indexOf(host.replace(/^www\./, '')) >= 0, __('Es un acortador de enlaces: no se ve el destino real hasta abrirlo.'));
			add(/(login|verif|secure|account|cuenta|banco|update|confirm|password|contrase)/i.test(host), __('El dominio incluye palabras como «login», «verificación» o «cuenta», típicas de enlaces de suplantación.'));
			add(raw.length > 120, __('Es un enlace muy largo, lo que puede ocultar el destino real.'));
			add(/\.(zip|mov|exe|scr|js|apk)$/i.test(u.pathname), __('El enlace apunta directamente a un archivo ejecutable o comprimido.'));
			var registrable = parts.slice(-2).join('.');
			result.set([
				ui.table([__('Parte'), __('Valor')], [[__('Protocolo'), u.protocol.replace(':', '')], [__('Dominio completo'), host], [__('Dominio principal (aprox.)'), registrable], [__('Ruta'), u.pathname || '/'], [__('Parámetros'), u.search || '—']], { wrap: true, caption: __('Partes del enlace') }),
				signs.length ? h('div', { class: 'ct-alert ct-alert--warn' }, h('div', null, h('p', null, h('strong', { text: CT.sprintf(__('%d señales a revisar con atención:'), signs.length) })), h('ul', null, signs.map(function (s) { return h('li', { text: s }); })))) : ui.alert('info', __('No se han detectado señales típicas en el texto del enlace. Esto no significa que sea seguro.')),
				h('p', { class: 'ct-help', text: __('Este análisis solo revisa la apariencia del enlace y no puede determinar si es seguro o peligroso. Ante la duda, no lo abras: escribe tú mismo la dirección oficial del servicio o contacta por un canal conocido.') })
			]);
			CT.track('done');
		};
		el.appendChild(f.el);
		el.appendChild(ui.actions(ui.button(__('Analizar enlace'), { variant: 'primary', icon: 'search', onClick: run })));
		el.appendChild(result.el);
		f.input.addEventListener('input', CT.debounce(run, 300));
		run();
	};

	CT.register('security', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
