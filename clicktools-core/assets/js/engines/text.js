/*!
 * HerramientasClave — herramientas de texto. Todo el procesamiento es local.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;

	/* ---------- Funciones puras (exportadas para pruebas) ---------- */
	var segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
	var T = CT.text = {
		graphemes: function (s) { return segmenter ? Array.from(segmenter.segment(s), function (x) { return x.segment; }) : Array.from(s); },
		words: function (s) { return s.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu) || []; },
		stats: function (s) {
			var words = T.words(s);
			var chars = T.graphemes(s).length;
			var noSpaces = T.graphemes(s.replace(/\s+/g, '')).length;
			var lines = s ? s.split(/\r\n|\r|\n/).length : 0;
			var paragraphs = s.split(/(?:\r?\n\s*){2,}/).filter(function (p) { return p.trim(); }).length;
			var sentences = (s.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).filter(function (x) { return /[\p{L}\p{N}]/u.test(x); }).length;
			return { words: words.length, chars: chars, noSpaces: noSpaces, lines: lines, paragraphs: paragraphs, sentences: sentences, wordList: words };
		},
		sentenceCase: function (s) {
			return s.toLocaleLowerCase('es').replace(/(^\s*|[.!?¡¿…]\s+|\n\s*)(\p{L})/gu, function (m, p, c) { return p + c.toLocaleUpperCase('es'); });
		},
		titleCase: function (s, style) {
			var small = style === 'en' ? /^(a|an|the|and|but|or|nor|for|so|yet|at|by|in|of|on|to|up|as|vs?\.?)$/i : /^(a|al|de|del|el|la|las|lo|los|y|e|o|u|ni|en|con|por|para|sin|sobre|un|una|unos|unas)$/i;
			if (style === 'es') { return T.sentenceCase(s); }
			var i = 0;
			return s.toLocaleLowerCase('es').replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, function (w) {
				var first = i++ === 0;
				if (style !== 'all' && !first && small.test(w)) { return w; }
				return w.charAt(0).toLocaleUpperCase('es') + w.slice(1);
			});
		},
		slug: function (s, sep, maxLen, stop) {
			sep = sep === undefined ? '-' : sep;
			var STOP = /^(el|la|los|las|un|una|unos|unas|de|del|al|y|e|o|u|en|con|por|para|a|que|se|su|sus|lo)$/;
			var parts = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
			if (stop) { var f = parts.filter(function (w) { return !STOP.test(w); }); if (f.length) { parts = f; } }
			var out = parts.join(sep);
			if (maxLen && out.length > maxLen) { out = out.slice(0, maxLen).replace(new RegExp('\\' + (sep || ' ') + '[^\\' + (sep || ' ') + ']*$'), ''); }
			return out;
		},
		removeAccents: function (s, keepN) {
			var out = s.normalize('NFD');
			if (keepN) { out = out.replace(/ñ/g, '\u0000').replace(/Ñ/g, '\u0001'); }
			out = out.replace(/[̀-ͯ]/g, '');
			if (keepN) { out = out.replace(/\u0000/g, 'ñ').replace(/\u0001/g, 'Ñ'); }
			return out.normalize('NFC');
		},
		utf8ToB64: function (s, urlSafe) {
			var bytes = new TextEncoder().encode(s), bin = '';
			for (var i = 0; i < bytes.length; i += 0x8000) { bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); }
			var b = btoa(bin);
			return urlSafe ? b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b;
		},
		b64ToBytes: function (s) {
			var clean = s.replace(/^data:[^,]*,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
			if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) { throw new Error(__('El texto contiene caracteres que no son Base64.')); }
			while (clean.length % 4) { clean += '='; }
			var bin = atob(clean), out = new Uint8Array(bin.length);
			for (var i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
			return out;
		},
		b64ToUtf8: function (s) { return new TextDecoder('utf-8', { fatal: true }).decode(T.b64ToBytes(s)); },
		toHex: function (s, sep) { return Array.from(new TextEncoder().encode(s), function (b) { return b.toString(16).padStart(2, '0'); }).join(sep); },
		fromHex: function (s) {
			var clean = s.replace(/0x/gi, '').replace(/[\s,:;\-\\x]+/g, '');
			if (!/^[0-9a-f]*$/i.test(clean) || clean.length % 2) { throw new Error(__('El texto hexadecimal no es válido: debe contener pares de dígitos 0-9 y A-F.')); }
			var bytes = new Uint8Array(clean.length / 2);
			for (var i = 0; i < bytes.length; i++) { bytes[i] = parseInt(clean.substr(i * 2, 2), 16); }
			return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		},
		escapeHtml: function (s, all) {
			var out = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
			if (all) { out = out.replace(/[^\x00-\x7F]/g, function (c) { return '&#' + c.codePointAt(0) + ';'; }).replace(/[\uD800-\uDFFF]/g, ''); }
			return out;
		},
		unescapeHtml: function (s) {
			var doc = new DOMParser().parseFromString('<!doctype html><body><textarea>' + s.replace(/<\/textarea/gi, '&lt;/textarea') + '</textarea>', 'text/html');
			return doc.querySelector('textarea').value;
		},
		extractEmails: function (s) { return s.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g) || []; },
		extractUrls: function (s) { return (s.match(/\b(?:https?:\/\/|www\.)[^\s<>"'()]+[^\s<>"'().,;:!?]/gi) || []); },
		unique: function (arr, ci) { var seen = {}; return arr.filter(function (x) { var k = ci ? x.toLowerCase() : x; if (seen[k]) { return false; } seen[k] = 1; return true; }); },
		shuffle: function (arr) {
			var a = arr.slice();
			for (var i = a.length - 1; i > 0; i--) { var r = new Uint32Array(1); crypto.getRandomValues(r); var j = r[0] % (i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
			return a;
		}
	};

	/* ---------- Plantilla común ---------- */
	function textTool(el, opts) {
		var input = ui.textInput({ label: opts.inputLabel || __('Texto de entrada'), rows: opts.rows || 9, mono: opts.mono, placeholder: opts.placeholder, value: opts.sample || '' });
		var options = h('div', { class: 'ct-panel' + (opts.noOptions ? ' ct-sr' : '') });
		var output = opts.noOutput ? null : ui.output({ label: opts.outputLabel || __('Resultado'), rows: opts.outRows || 9, mono: opts.mono, filename: function () { return opts.filename || 'resultado.txt'; } });
		var info = h('div', { 'aria-live': 'polite' });
		el.appendChild(input.el);
		if (!opts.noOptions) { options.appendChild(h('h3', { class: 'ct-panel__title', text: __('Opciones') })); el.appendChild(options); }
		var api = { input: input, options: options, output: output, info: info, el: el };
		var run = function () {
			try {
				var r = opts.run(input.get(), api);
				if (output && r !== undefined) { output.set(r); }
			} catch (e) {
				info.innerHTML = '';
				info.appendChild(ui.alert('err', e.message));
				if (output) { output.set(''); }
			}
		};
		api.run = run;
		var debounced = CT.debounce(run, 120);
		input.input.addEventListener('input', debounced);
		options.addEventListener('input', debounced);
		options.addEventListener('change', run);
		if (opts.buttons) { el.appendChild(ui.actions.apply(null, opts.buttons(api))); }
		el.appendChild(info);
		if (output) { el.appendChild(output.el); }
		if (opts.setup) { opts.setup(api); }
		run();
		return api;
	}
	function addOpt(api, field) { api.options.appendChild(field.el); return field; }
	function check(api, label, value) { return addOpt(api, ui.field({ type: 'checkbox', label: label, value: !!value })); }
	function select(api, label, options, value) { return addOpt(api, ui.field({ type: 'select', label: label, options: options, value: value })); }
	function lines(s) { return s.split(/\r\n|\r|\n/); }
	function setInfo(api, text) { api.info.innerHTML = ''; if (text) { api.info.appendChild(h('p', { class: 'ct-help', text: text })); } }

	var tools = {};

	tools.counter = function (el, tool) {
		var mode = (tool.config && tool.config.mode) || 'words';
		var grid = h('div', { class: 'ct-counter-grid' });
		var extra = h('div');
		var wpm, limit;
		var api = textTool(el, {
			noOutput: true,
			placeholder: __('Escribe o pega aquí tu texto…'),
			run: function (s) {
				var st = T.stats(s);
				var w = wpm ? CT.parseNum(wpm.input.value) || 200 : 200;
				var stat = function (label, value, main) { return ui.stat(label, value, main ? 'good' : ''); };
				grid.innerHTML = '';
				[
					[__('Palabras'), N(st.words), mode === 'words'],
					[__('Caracteres'), N(st.chars), mode === 'chars'],
					[__('Sin espacios'), N(st.noSpaces), mode === 'chars'],
					[__('Líneas'), N(st.lines), mode === 'lines'],
					[__('Párrafos'), N(st.paragraphs), mode === 'lines'],
					[__('Frases'), N(st.sentences)],
					[__('Lectura'), CT.fmt.duration(st.words / w * 60), mode === 'reading'],
					[__('En voz alta'), CT.fmt.duration(st.words / 140 * 60)]
				].forEach(function (x) { grid.appendChild(stat(x[0], x[1], x[2])); });
				extra.innerHTML = '';
				if (limit) {
					var max = CT.parseNum(limit.input.value);
					if (isFinite(max) && max > 0) {
						var left = max - st.chars;
						extra.appendChild(ui.alert(left >= 0 ? 'ok' : 'err', left >= 0 ? CT.sprintf(__('Te quedan %s caracteres.'), N(left)) : CT.sprintf(__('Te pasas en %s caracteres.'), N(-left))));
					}
				}
				if (mode === 'words' && st.words) {
					var freq = {};
					st.wordList.forEach(function (x) { var k = x.toLocaleLowerCase('es'); if (k.length > 3) { freq[k] = (freq[k] || 0) + 1; } });
					var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 10);
					if (top.length) { extra.appendChild(h('div', null, h('h3', { class: 'ct-panel__title', text: __('Palabras más repetidas (más de 3 letras)') }), ui.table([__('Palabra'), __('Veces'), __('Densidad')], top.map(function (k) { return [k, String(freq[k]), CT.fmt.percent(freq[k] / st.words * 100, 1)]; }), { num: [1, 2] }))); }
				}
			},
			setup: function (a) {
				if (mode === 'reading') { wpm = addOpt(a, ui.field({ label: __('Velocidad de lectura'), type: 'number', unit: __('palabras/min'), value: 200, help: __('Un adulto lee en silencio entre 200 y 250 palabras por minuto aproximadamente.') })); }
				if (mode === 'chars') { limit = addOpt(a, ui.field({ label: __('Límite de caracteres (opcional)'), type: 'number', value: '', placeholder: '160', help: __('Útil para títulos, metadescripciones, SMS o publicaciones con límite.') })); }
				if (!wpm && !limit) { a.options.hidden = true; }
				el.insertBefore(grid, a.info);
				el.insertBefore(extra, a.info);
				a.run();
			}
		});
		return api;
	};

	tools['case'] = function (el) {
		var mode = 'upper';
		var api = textTool(el, {
			sample: __('Escribe aquí tu texto para cambiar mayúsculas y minúsculas.'),
			noOptions: true,
			run: function (s) {
				switch (mode) {
					case 'lower': return s.toLocaleLowerCase('es');
					case 'sentence': return T.sentenceCase(s);
					case 'title': return T.titleCase(s, 'all');
					case 'alt': var i = 0; return s.replace(/\p{L}/gu, function (c) { return i++ % 2 ? c.toLocaleUpperCase('es') : c.toLocaleLowerCase('es'); });
					case 'invert': return s.replace(/\p{L}/gu, function (c) { var u = c.toLocaleUpperCase('es'); return c === u ? c.toLocaleLowerCase('es') : u; });
					default: return s.toLocaleUpperCase('es');
				}
			},
			buttons: function (a) {
				return [['upper', __('MAYÚSCULAS')], ['lower', __('minúsculas')], ['sentence', __('Tipo oración')], ['title', __('Cada Palabra')], ['alt', __('aLtErNaDo')], ['invert', __('iNVERTIR')]].map(function (m) {
					return ui.button(m[1], { variant: m[0] === 'upper' ? 'primary' : 'secondary', size: 'sm', onClick: function (e) { mode = m[0]; CT.$$('button', e.currentTarget.parentNode).forEach(function (b) { b.className = b.className.replace('ct-btn--primary', 'ct-btn--secondary'); }); e.currentTarget.className = e.currentTarget.className.replace('ct-btn--secondary', 'ct-btn--primary'); a.run(); } });
				});
			}
		});
		return api;
	};

	tools.title = function (el) {
		var style;
		textTool(el, {
			sample: 'el señor de los anillos: la comunidad del anillo',
			rows: 4, outRows: 4,
			run: function (s) { return lines(s).map(function (l) { return T.titleCase(l, style.input.value); }).join('\n'); },
			setup: function (a) {
				style = select(a, __('Estilo'), [{ value: 'es', label: __('Español (RAE): solo la primera palabra') }, { value: 'smart', label: __('Cada palabra salvo artículos y preposiciones') }, { value: 'all', label: __('Cada Palabra En Mayúscula') }, { value: 'en', label: __('Inglés (Title Case)') }], 'es');
				a.options.appendChild(h('p', { class: 'ct-help', text: __('En español, la norma general es escribir en mayúscula solo la primera palabra del título y los nombres propios. Revisa los nombres propios tras la conversión.') }));
			}
		});
	};

	tools.trim = function (el) {
		var o = {};
		textTool(el, {
			sample: '  Texto   con    espacios\tde más.  \n\n   Otra línea   ',
			run: function (s, a) {
				var r = s;
				if (o.nbsp.input.checked) { r = r.replace(/[   ​]/g, ' '); }
				if (o.tabs.input.checked) { r = r.replace(/\t/g, ' '); }
				if (o.multi.input.checked) { r = r.replace(/[ \t]{2,}/g, ' '); }
				if (o.lines.input.checked) { r = lines(r).map(function (l) { return l.trim(); }).join('\n'); }
				if (o.all.input.checked) { r = r.trim(); }
				setInfo(a, '');
				return r;
			},
			setup: function (a) {
				o.multi = check(a, __('Reducir espacios múltiples a uno'), true);
				o.lines = check(a, __('Quitar espacios al principio y final de cada línea'), true);
				o.all = check(a, __('Quitar espacios al principio y final del texto'), true);
				o.tabs = check(a, __('Convertir tabuladores en espacios'), true);
				o.nbsp = check(a, __('Convertir espacios especiales (no separables, de ancho cero) en normales'), true);
				a.run();
			}
		});
	};

	tools.emptylines = function (el) {
		var keep;
		textTool(el, {
			sample: 'Primera línea\n\n\nSegunda línea\n   \nTercera línea',
			run: function (s, a) {
				var ls = lines(s), out = [], removed = 0;
				ls.forEach(function (l) {
					var empty = !l.trim();
					if (!empty) { out.push(l); return; }
					if (keep && keep.input.checked && out.length && out[out.length - 1].trim()) { out.push(''); return; }
					removed++;
				});
				setInfo(a, CT.sprintf(__('Líneas vacías eliminadas: %d'), removed));
				return out.join('\n');
			},
			setup: function (a) { keep = check(a, __('Conservar una línea vacía entre párrafos'), false); a.run(); }
		});
	};

	tools.duplines = function (el) {
		var ci, tr, empty;
		textTool(el, {
			sample: 'manzana\npera\nManzana\nuva\npera',
			run: function (s, a) {
				var seen = {}, out = [], removed = 0;
				lines(s).forEach(function (l) {
					if (!l.trim() && empty && empty.input.checked) { out.push(l); return; }
					var k = l;
					if (tr && tr.input.checked) { k = k.trim(); }
					if (ci && ci.input.checked) { k = k.toLocaleLowerCase('es'); }
					if (seen[k]) { removed++; return; }
					seen[k] = 1; out.push(l);
				});
				setInfo(a, CT.sprintf(__('Duplicados eliminados: %1$d · Líneas resultantes: %2$d'), removed, out.length));
				return out.join('\n');
			},
			setup: function (a) {
				ci = check(a, __('Ignorar mayúsculas y minúsculas'), true);
				tr = check(a, __('Ignorar espacios al principio y al final'), true);
				empty = check(a, __('Conservar líneas vacías'), false);
				a.run();
			}
		});
	};

	tools.sort = function (el) {
		var order, uniq, ci;
		var collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
		textTool(el, {
			sample: 'Zaragoza\nÁvila\nbadajoz\nCáceres\nalmería\n10 Bilbao\n2 Burgos',
			run: function (s, a) {
				var ls = lines(s).filter(function (l) { return l.trim(); });
				if (uniq.input.checked) { ls = T.unique(ls, ci.input.checked); }
				var o = order.input.value;
				var cmp = ci.input.checked ? collator.compare : new Intl.Collator('es', { numeric: true, sensitivity: 'variant', caseFirst: 'upper' }).compare;
				if (o === 'az') { ls.sort(cmp); } else if (o === 'za') { ls.sort(cmp).reverse(); } else if (o === 'len') { ls.sort(function (x, y) { return x.length - y.length || cmp(x, y); }); } else if (o === 'lend') { ls.sort(function (x, y) { return y.length - x.length || cmp(x, y); }); } else if (o === 'rev') { ls.reverse(); } else if (o === 'rand') { ls = T.shuffle(ls); }
				setInfo(a, CT.sprintf(__('%d líneas ordenadas'), ls.length));
				return ls.join('\n');
			},
			setup: function (a) {
				order = select(a, __('Orden'), [{ value: 'az', label: __('Alfabético A → Z') }, { value: 'za', label: __('Alfabético Z → A') }, { value: 'len', label: __('Por longitud (corta → larga)') }, { value: 'lend', label: __('Por longitud (larga → corta)') }, { value: 'rev', label: __('Invertir el orden actual') }, { value: 'rand', label: __('Aleatorio') }], 'az');
				ci = check(a, __('Ignorar mayúsculas y tildes'), true);
				uniq = check(a, __('Eliminar duplicados'), false);
				a.options.appendChild(h('p', { class: 'ct-help', text: __('La ordenación sigue las reglas del español (la ñ va tras la n) y ordena los números de forma natural (2 antes que 10).') }));
				a.run();
			},
			buttons: function (a) { return [ui.button(__('Volver a ordenar'), { icon: 'shuffle', size: 'sm', onClick: a.run })]; }
		});
	};

	tools.reverse = function (el) {
		var mode;
		textTool(el, {
			sample: 'Dábale arroz a la zorra el abad',
			run: function (s) {
				var m = mode.get();
				if (m === 'words') { return lines(s).map(function (l) { return l.split(/(\s+)/).reverse().join(''); }).join('\n'); }
				if (m === 'lines') { return lines(s).reverse().join('\n'); }
				return T.graphemes(s).reverse().join('');
			},
			setup: function (a) { mode = ui.seg({ label: __('Invertir'), value: 'chars', options: [{ value: 'chars', label: __('Caracteres') }, { value: 'words', label: __('Palabras') }, { value: 'lines', label: __('Líneas') }] }); a.options.appendChild(mode.el); a.run(); }
		});
	};

	tools.replace = function (el) {
		var pairs = h('div'), regex, cs, whole;
		var addPair = function (f, r) {
			var row = h('div', { class: 'ct-cols' });
			var fi = ui.field({ label: __('Buscar'), value: f || '' }), ri = ui.field({ label: __('Reemplazar por'), value: r || '' });
			row.appendChild(fi.el); row.appendChild(ri.el);
			row._f = fi.input; row._r = ri.input;
			pairs.appendChild(row);
		};
		var api = textTool(el, {
			sample: 'El cliente pagó en efectivo. El cliente volvió al día siguiente.',
			run: function (s, a) {
				var out = s, total = 0;
				CT.$$('.ct-cols', pairs).forEach(function (row) {
					var f = row._f.value;
					if (!f) { return; }
					var src = regex.input.checked ? f : f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					if (whole.input.checked) { src = '(?<![\\p{L}\\p{N}_])(?:' + src + ')(?![\\p{L}\\p{N}_])'; }
					var re;
					try { re = new RegExp(src, 'gu' + (cs.input.checked ? '' : 'i')); } catch (e) { throw new Error(__('La expresión regular no es válida:') + ' ' + e.message); }
					total += (out.match(re) || []).length;
					var rep = row._r.value;
					out = regex.input.checked ? out.replace(re, rep) : out.replace(re, function () { return rep; });
				});
				setInfo(a, CT.sprintf(__('Reemplazos realizados: %d'), total));
				return out;
			},
			setup: function (a) {
				a.options.appendChild(pairs);
				addPair('cliente', 'comprador');
				a.options.appendChild(ui.button(__('Añadir otra pareja'), { icon: 'plus', size: 'sm', onClick: function () { addPair(); } }));
				cs = check(a, __('Distinguir mayúsculas y minúsculas'), false);
				whole = check(a, __('Solo palabras completas'), false);
				regex = check(a, __('Usar expresiones regulares (permite $1, $2…)'), false);
				a.run();
			}
		});
		return api;
	};

	function diffView(a, b, mode, opts) {
		var norm = function (x) { var v = x; if (opts.ci) { v = v.toLocaleLowerCase('es'); } if (opts.ws) { v = v.replace(/\s+/g, ' ').trim(); } return v; };
		var ta = CT.diff.tokenize(a, mode), tb = CT.diff.tokenize(b, mode);
		var ops = CT.diff.diff(ta, tb, function (x, y) { return norm(x) === norm(y); });
		var box = h('div', { class: 'ct-diff', role: 'region', 'aria-label': __('Diferencias'), tabindex: '0' });
		var add = 0, del = 0;
		if (mode === 'lines') {
			ops.forEach(function (op) {
				var cls = op.t === '+' ? ' ct-diff__line--add' : op.t === '-' ? ' ct-diff__line--del' : '';
				if (op.t === '+') { add++; } else if (op.t === '-') { del++; }
				box.appendChild(h('span', { class: 'ct-diff__line' + cls, 'data-sign': op.t === '=' ? ' ' : op.t, text: op.v || ' ' }));
			});
		} else {
			ops.forEach(function (op) {
				if (op.t === '=') { box.appendChild(document.createTextNode(op.v)); }
				else { if (op.t === '+') { add++; } else { del++; } box.appendChild(h(op.t === '+' ? 'ins' : 'del', { text: op.v })); }
			});
		}
		return { el: box, add: add, del: del, same: !add && !del };
	}
	CT.diffView = diffView;

	tools.diff = function (el, tool) {
		var mono = tool.config && tool.config.code;
		var a = ui.field({ label: mono ? __('Código original') : __('Texto original'), type: 'textarea', rows: 10, mono: true, value: mono ? 'function suma(a, b) {\n  return a + b;\n}' : 'El veloz murciélago hindú comía feliz cardillo y kiwi.\nLa cigüeña tocaba el saxofón.' });
		var b = ui.field({ label: mono ? __('Código modificado') : __('Texto modificado'), type: 'textarea', rows: 10, mono: true, value: mono ? 'function suma(a, b, c = 0) {\n  return a + b + c;\n}' : 'El veloz murciélago hindú comía feliz cardillo y kiwi.\nLa cigüeña tocaba el saxofón detrás del palenque.' });
		var mode = ui.seg({ label: __('Comparar por'), value: mono ? 'lines' : 'words', options: [{ value: 'lines', label: __('Líneas') }, { value: 'words', label: __('Palabras') }, { value: 'chars', label: __('Caracteres') }] });
		var ci = ui.field({ type: 'checkbox', label: __('Ignorar mayúsculas y minúsculas'), value: false });
		var ws = ui.field({ type: 'checkbox', label: __('Ignorar diferencias de espacios'), value: false });
		var result = ui.result();
		var run = function () {
			try {
				var v = diffView(a.input.value, b.input.value, mode.get(), { ci: ci.input.checked, ws: ws.input.checked });
				var summary = v.same ? ui.alert('ok', __('Los textos son idénticos con las opciones elegidas.')) : ui.alert('info', CT.sprintf(__('%1$d fragmentos añadidos y %2$d eliminados.'), v.add, v.del));
				result.set(summary, v.el);
			} catch (e) { result.error(e.message); }
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, a.el, b.el));
		el.appendChild(h('div', { class: 'ct-row' }, mode.el, ci.el, ws.el));
		el.appendChild(ui.actions(ui.button(__('Comparar'), { variant: 'primary', icon: 'git-compare', onClick: function () { run(); CT.track('done'); } }), ui.button(__('Intercambiar'), { icon: 'arrow-left-right', onClick: function () { var t = a.input.value; a.input.value = b.input.value; b.input.value = t; run(); } })));
		el.appendChild(result.el);
		[a.input, b.input].forEach(function (i) { i.addEventListener('input', CT.debounce(run, 300)); });
		[mode.el, ci.input, ws.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	var LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
	var ES = 'casa mundo tiempo vida forma parte ciudad camino agua luz trabajo historia proyecto idea equipo cliente mercado servicio sistema proceso modelo diseño valor calidad cambio resultado momento lugar persona grupo nivel objetivo información desarrollo programa sector empresa producto usuario plan medio año día semana texto página sección ejemplo prueba contenido nuevo gran mejor claro simple rápido útil abierto común general real posible propio principal social digital local actual final importante necesario sencillo práctico moderno ofrece permite incluye presenta muestra mejora crea define organiza revisa comparte facilita describe propone ayuda utiliza cuenta sigue'.split(' ');
	function rand(n) { var r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; }
	function sentence(words, min, max) { var len = min + rand(max - min + 1), out = []; for (var i = 0; i < len; i++) { out.push(words[rand(words.length)]); } var s = out.join(' '); if (len > 7) { var c = 3 + rand(len - 5); var parts = s.split(' '); parts[c] += ','; s = parts.join(' '); } return s.charAt(0).toUpperCase() + s.slice(1) + '.'; }
	CT.lorem = function (kind, unit, count, classic) {
		var words = kind === 'es' ? ES : LOREM, out;
		if (unit === 'words') { out = []; for (var i = 0; i < count; i++) { out.push(words[rand(words.length)]); } out = out.join(' '); out = out.charAt(0).toUpperCase() + out.slice(1) + '.'; }
		else if (unit === 'sentences') { out = []; for (var j = 0; j < count; j++) { out.push(sentence(words, 6, 14)); } out = out.join(' '); }
		else { var ps = []; for (var p = 0; p < count; p++) { var sn = []; for (var k = 0, n = 4 + rand(4); k < n; k++) { sn.push(sentence(words, 6, 14)); } ps.push(sn.join(' ')); } out = ps.join('\n\n'); }
		if (classic && kind !== 'es') { out = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + out.replace(/^[^.]*\.\s*/, ''); }
		return out;
	};

	tools.lorem = function (el, tool) {
		var kind = ui.seg({ label: __('Tipo de texto'), value: (tool.config && tool.config.kind) || 'lorem', options: [{ value: 'lorem', label: 'Lorem ipsum' }, { value: 'es', label: __('Texto de prueba en español') }] });
		var unit = ui.field({ label: __('Generar'), type: 'select', value: 'paragraphs', options: [{ value: 'paragraphs', label: __('Párrafos') }, { value: 'sentences', label: __('Frases') }, { value: 'words', label: __('Palabras') }] });
		var count = ui.field({ label: __('Cantidad'), type: 'number', integer: true, value: 3 });
		var classic = ui.field({ type: 'checkbox', label: __('Empezar por «Lorem ipsum dolor sit amet…»'), value: true });
		var html = ui.field({ type: 'checkbox', label: __('Envolver párrafos en etiquetas <p>'), value: false });
		var out = ui.output({ label: __('Texto generado'), rows: 10, filename: function () { return 'texto-de-prueba.txt'; } });
		var run = function () {
			var n = count.get();
			if (!isFinite(n) || n < 1 || n > 500) { count.error(__('Introduce un número entre 1 y 500.')); return; }
			count.error('');
			var t = CT.lorem(kind.get(), unit.input.value, n, classic.input.checked);
			if (html.input.checked) { t = t.split('\n\n').map(function (p) { return '<p>' + p + '</p>'; }).join('\n'); }
			out.set(t);
		};
		el.appendChild(kind.el);
		el.appendChild(h('div', { class: 'ct-cols' }, unit.el, count.el));
		el.appendChild(classic.el); el.appendChild(html.el);
		el.appendChild(ui.actions(ui.button(__('Generar'), { variant: 'primary', icon: 'sparkles', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(out.el);
		[kind.el, unit.input, count.input, classic.input, html.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	tools.slug = function (el) {
		var sep, max, stop;
		textTool(el, {
			sample: '¿Cómo calcular el IVA de una factura en España?',
			rows: 3, outRows: 3,
			run: function (s) { return lines(s).map(function (l) { return T.slug(l, sep.input.value, CT.parseNum(max.input.value) || 0, stop.input.checked); }).join('\n'); },
			setup: function (a) {
				sep = select(a, __('Separador'), [{ value: '-', label: __('Guion (-)') }, { value: '_', label: __('Guion bajo (_)') }, { value: '', label: __('Sin separador') }], '-');
				max = addOpt(a, ui.field({ label: __('Longitud máxima (opcional)'), type: 'number', integer: true, value: '' }));
				stop = check(a, __('Quitar palabras vacías (de, la, el, y…)'), false);
				a.run();
			}
		});
	};

	tools.url = function (el) {
		var mode, full;
		textTool(el, {
			sample: 'https://ejemplo.com/búsqueda?q=café con leche&orden=precio',
			rows: 5, outRows: 5,
			run: function (s, a) {
				setInfo(a, '');
				if (mode.get() === 'decode') {
					try { return full.input.checked ? decodeURI(s) : decodeURIComponent(s.replace(/\+/g, '%20')); } catch (e) { throw new Error(__('El texto contiene secuencias % que no son válidas.')); }
				}
				return full.input.checked ? encodeURI(s) : encodeURIComponent(s);
			},
			setup: function (a) {
				mode = ui.seg({ label: __('Operación'), value: 'encode', options: [{ value: 'encode', label: __('Codificar') }, { value: 'decode', label: __('Decodificar') }] });
				a.options.appendChild(mode.el);
				full = check(a, __('Tratar como URL completa (conserva : / ? & =)'), false);
				a.run();
			}
		});
	};

	tools.base64 = function (el) {
		var mode, safe;
		var api = textTool(el, {
			sample: 'Hola, HerramientasClave ✓',
			rows: 6, outRows: 6, mono: true,
			run: function (s, a) {
				setInfo(a, '');
				if (!s) { return ''; }
				if (mode.get() === 'decode') {
					try { return T.b64ToUtf8(s.trim()); } catch (e) { throw new Error(e.message && e.message.indexOf('Base64') >= 0 ? e.message : __('No es texto UTF-8 válido. Si el Base64 corresponde a un archivo, usa «Descargar como archivo».')); }
				}
				return T.utf8ToB64(s, safe.input.checked);
			},
			setup: function (a) {
				mode = ui.seg({ label: __('Operación'), value: 'encode', options: [{ value: 'encode', label: __('Codificar') }, { value: 'decode', label: __('Decodificar') }] });
				a.options.appendChild(mode.el);
				safe = check(a, __('Variante segura para URL (sin + / =)'), false);
				var fileIn = h('input', { type: 'file', hidden: true });
				fileIn.addEventListener('change', function () {
					var f = fileIn.files[0]; if (!f) { return; }
					if (f.size > 25 * 1024 * 1024) { CT.toast(__('Archivo demasiado grande (máximo 25 MB).'), 'error'); return; }
					CT.readFile(f, 'dataURL').then(function (d) { a.output.set(d); setInfo(a, CT.sprintf(__('%1$s convertido a Data URL (%2$s).'), f.name, CT.fmt.bytes(d.length))); });
					fileIn.value = '';
				});
				a.options.appendChild(h('div', { class: 'ct-actions' }, ui.button(__('Convertir un archivo a Base64'), { icon: 'upload', size: 'sm', onClick: function () { fileIn.click(); } }),
					ui.button(__('Descargar Base64 como archivo'), { icon: 'download', size: 'sm', onClick: function () {
						try {
							var raw = a.input.get().trim();
							var m = /^data:([^;,]+)/.exec(raw);
							var bytes = T.b64ToBytes(raw);
							var type = m ? m[1] : 'application/octet-stream';
							var sn = CT.sniff(bytes.buffer);
							CT.download(new Blob([bytes], { type: type }), 'archivo.' + (sn ? sn.ext : 'bin'));
						} catch (e) { CT.toast(e.message, 'error'); }
					} }), fileIn));
				a.run();
			}
		});
		return api;
	};

	tools.hex = function (el) {
		var mode, sep, upper;
		textTool(el, {
			sample: 'Hola ñ',
			rows: 5, outRows: 5, mono: true,
			run: function (s, a) {
				setInfo(a, '');
				if (mode.get() === 'decode') { try { return T.fromHex(s); } catch (e) { throw new Error(e.message.indexOf('hexadecimal') >= 0 ? e.message : __('Los bytes no forman texto UTF-8 válido.')); } }
				var r = T.toHex(s, sep.input.value);
				return upper.input.checked ? r.toUpperCase() : r;
			},
			setup: function (a) {
				mode = ui.seg({ label: __('Operación'), value: 'encode', options: [{ value: 'encode', label: __('Texto → hexadecimal') }, { value: 'decode', label: __('Hexadecimal → texto') }] });
				a.options.appendChild(mode.el);
				sep = select(a, __('Separador'), [{ value: ' ', label: __('Espacio') }, { value: '', label: __('Ninguno') }, { value: ':', label: __('Dos puntos') }, { value: ',', label: __('Coma') }], ' ');
				upper = check(a, __('Letras en mayúscula'), false);
				a.run();
			}
		});
	};

	tools.html = function (el) {
		var mode, all;
		textTool(el, {
			sample: '<a href="?a=1&b=2">Café "especial"</a>',
			rows: 6, outRows: 6, mono: true,
			run: function (s) { return mode.get() === 'decode' ? T.unescapeHtml(s) : T.escapeHtml(s, all.input.checked); },
			setup: function (a) {
				mode = ui.seg({ label: __('Operación'), value: 'encode', options: [{ value: 'encode', label: __('Escapar') }, { value: 'decode', label: __('Desescapar') }] });
				a.options.appendChild(mode.el);
				all = check(a, __('Convertir también los caracteres no ASCII (á, ñ, €…) en entidades numéricas'), false);
				a.run();
			}
		});
	};

	tools.newlines = function (el) {
		var mode, sep;
		textTool(el, {
			sample: 'uno\ndos\ntres',
			rows: 6, outRows: 6,
			run: function (s) {
				var m = mode.input.value;
				var custom = sep.input.value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
				if (m === 'lf') { return s.replace(/\r\n|\r/g, '\n'); }
				if (m === 'crlf') { return s.replace(/\r\n|\r|\n/g, '\r\n'); }
				if (m === 'join') { return lines(s).join(custom); }
				if (m === 'split') { return custom ? s.split(custom).join('\n') : s; }
				return s.replace(/\r\n|\r|\n/g, ' ');
			},
			setup: function (a) {
				mode = select(a, __('Operación'), [{ value: 'join', label: __('Unir líneas con un separador') }, { value: 'split', label: __('Dividir en líneas por un separador') }, { value: 'space', label: __('Sustituir saltos de línea por espacios') }, { value: 'lf', label: __('Convertir a saltos Unix (LF)') }, { value: 'crlf', label: __('Convertir a saltos Windows (CRLF)') }], 'join');
				sep = addOpt(a, ui.field({ label: __('Separador (usa \\n para salto y \\t para tabulador)'), value: ', ' }));
				a.run();
			}
		});
	};

	tools.numbered = function (el) {
		var fmt, start, skip;
		var toAlpha = function (n) { var s = ''; while (n > 0) { n--; s = String.fromCharCode(97 + n % 26) + s; n = Math.floor(n / 26); } return s; };
		textTool(el, {
			sample: 'Comprar pan\nLlamar al banco\nEnviar presupuesto',
			run: function (s) {
				var n = CT.parseNum(start.input.value) || 1, i = 0;
				return lines(s).map(function (l) {
					if (!l.trim() && skip.input.checked) { return l; }
					var k = n + i++;
					var label = { dot: k + '. ', paren: k + ') ', alpha: toAlpha(k) + ') ', roman: (CT.roman ? CT.roman.to(k) : k) + '. ', dash: '- ', bullet: '• ', check: '☐ ' }[fmt.input.value];
					return label + l.replace(/^\s*(?:\d+[.)]|[-•☐]|[a-z]\))\s*/i, '');
				}).join('\n');
			},
			setup: function (a) {
				fmt = select(a, __('Formato'), [{ value: 'dot', label: '1. 2. 3.' }, { value: 'paren', label: '1) 2) 3)' }, { value: 'alpha', label: 'a) b) c)' }, { value: 'roman', label: 'I. II. III.' }, { value: 'dash', label: __('Guiones') }, { value: 'bullet', label: __('Viñetas •') }, { value: 'check', label: __('Casillas ☐') }], 'dot');
				start = addOpt(a, ui.field({ label: __('Empezar en'), type: 'number', integer: true, value: 1 }));
				skip = check(a, __('No numerar líneas vacías'), true);
				a.run();
			}
		});
	};

	tools.dupwords = function (el) {
		var mode;
		textTool(el, {
			sample: 'Esto es es un texto con con palabras repetidas repetidas.',
			run: function (s, a) {
				var removed = 0, out;
				if (mode.get() === 'consecutive') {
					out = s.replace(/(^|[^\p{L}\p{N}])([\p{L}\p{N}]+)(\s+\2)+(?=[^\p{L}\p{N}]|$)/giu, function (m, pre, w) { removed += (m.match(/\s+/g) || []).length; return pre + w; });
				} else {
					var seen = {};
					out = s.replace(/[\p{L}\p{N}]+/gu, function (w) { var k = w.toLocaleLowerCase('es'); if (seen[k]) { removed++; return ''; } seen[k] = 1; return w; }).replace(/[ \t]{2,}/g, ' ').replace(/ ([,.;:!?])/g, '$1');
				}
				setInfo(a, CT.sprintf(__('Palabras eliminadas: %d'), removed));
				return out;
			},
			setup: function (a) {
				mode = ui.seg({ label: __('Qué eliminar'), value: 'consecutive', options: [{ value: 'consecutive', label: __('Repeticiones seguidas (es es)') }, { value: 'all', label: __('Toda palabra repetida') }] });
				a.options.appendChild(mode.el);
				a.run();
			}
		});
	};

	tools.accents = function (el) {
		var keep;
		textTool(el, {
			sample: 'Canción, pingüino, acción y España',
			run: function (s) { return T.removeAccents(s, keep.input.checked); },
			setup: function (a) { keep = check(a, __('Conservar la ñ'), true); a.run(); }
		});
	};

	tools.editor = function (el) {
		var persist = CT.persist('editor', false);
		var area = ui.field({ label: __('Editor de texto'), type: 'textarea', rows: 18, value: persist.load('') });
		var stats = h('p', { class: 'ct-help', 'aria-live': 'polite' });
		var name = ui.field({ label: __('Nombre del archivo'), value: 'notas.txt' });
		var fileIn = h('input', { type: 'file', accept: '.txt,.md,.csv,text/*', hidden: true });
		var update = CT.debounce(function () {
			var st = T.stats(area.input.value);
			stats.textContent = CT.sprintf(__('%1$s palabras · %2$s caracteres · %3$s líneas'), N(st.words), N(st.chars), N(st.lines));
			persist.save(area.input.value);
		}, 200);
		fileIn.addEventListener('change', function () { var f = fileIn.files[0]; if (!f) { return; } CT.readFile(f, 'text').then(function (t) { area.input.value = t; name.input.value = f.name; update(); }); fileIn.value = ''; });
		area.input.addEventListener('input', update);
		el.appendChild(ui.persistToggle(persist, function () { return area.input.value; }, function () { area.input.value = ''; update(); }));
		el.appendChild(area.el);
		el.appendChild(stats);
		el.appendChild(h('div', { class: 'ct-cols' }, name.el));
		el.appendChild(ui.actions(
			ui.button(__('Descargar .txt'), { variant: 'primary', icon: 'download', onClick: function () { CT.download(area.input.value, name.input.value || 'notas.txt', 'text/plain;charset=utf-8'); } }),
			ui.button(__('Abrir archivo'), { icon: 'file', onClick: function () { fileIn.click(); } }),
			ui.button(__('Copiar todo'), { icon: 'copy', onClick: function () { CT.copy(area.input.value); } }),
			fileIn
		));
		update();
	};

	tools.listcompare = function (el, tool) {
		var files = tool.config && tool.config.files;
		var a = ui.field({ label: files ? __('Lista A (por ejemplo, archivos de la carpeta original)') : __('Lista A'), type: 'textarea', rows: 9, value: files ? 'foto-001.jpg\nfoto-002.jpg\ninforme.pdf\nnotas.txt' : 'manzana\npera\nuva\nkiwi' });
		var b = ui.field({ label: files ? __('Lista B (por ejemplo, archivos de la copia)') : __('Lista B'), type: 'textarea', rows: 9, value: files ? 'foto-001.jpg\ninforme.pdf\npresupuesto.xlsx' : 'pera\nkiwi\nmelón' });
		var ci = ui.field({ type: 'checkbox', label: __('Ignorar mayúsculas y minúsculas'), value: !files });
		var tr = ui.field({ type: 'checkbox', label: __('Ignorar espacios al inicio y final'), value: true });
		var result = h('div', { class: 'ct-cols ct-cols--2' });
		var run = function () {
			var key = function (x) { var k = tr.input.checked ? x.trim() : x; return ci.input.checked ? k.toLocaleLowerCase('es') : k; };
			var la = lines(a.input.value).filter(function (x) { return x.trim(); }), lb = lines(b.input.value).filter(function (x) { return x.trim(); });
			var ka = {}, kb = {};
			la.forEach(function (x) { ka[key(x)] = x; }); lb.forEach(function (x) { kb[key(x)] = x; });
			var onlyA = Object.keys(ka).filter(function (k) { return !(k in kb); }).map(function (k) { return ka[k]; });
			var onlyB = Object.keys(kb).filter(function (k) { return !(k in ka); }).map(function (k) { return kb[k]; });
			var both = Object.keys(ka).filter(function (k) { return k in kb; }).map(function (k) { return ka[k]; });
			var union = T.unique(la.concat(lb), ci.input.checked);
			result.innerHTML = '';
			[[__('Solo en A'), onlyA], [__('Solo en B'), onlyB], [__('En ambas (intersección)'), both], [__('Unión sin duplicados'), union]].forEach(function (g) {
				var o = ui.output({ label: g[0] + ' (' + g[1].length + ')', rows: 6, filename: function () { return CT.text.slug(g[0]) + '.txt'; } });
				o.set(g[1].join('\n'));
				result.appendChild(o.el);
			});
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, a.el, b.el));
		el.appendChild(h('div', { class: 'ct-row' }, ci.el, tr.el));
		el.appendChild(ui.actions(ui.button(__('Comparar listas'), { variant: 'primary', icon: 'git-compare', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(result);
		[a.input, b.input].forEach(function (i) { i.addEventListener('input', CT.debounce(run, 250)); });
		[ci.input, tr.input].forEach(function (i) { i.addEventListener('change', run); });
		run();
	};

	function extractor(kind) {
		return function (el) {
			var uniq, sort, sepSel;
			textTool(el, {
				sample: kind === 'emails' ? 'Escribe a ana@ejemplo.com o a soporte@empresa.es. Copia: Ana@Ejemplo.com' : 'Más info en https://ejemplo.com/guia y en www.ejemplo.es/precios. Repetido: https://ejemplo.com/guia',
				run: function (s, a) {
					var found = kind === 'emails' ? T.extractEmails(s) : T.extractUrls(s);
					if (uniq.input.checked) { found = T.unique(found, kind === 'emails'); }
					if (sort.input.checked) { found.sort(new Intl.Collator('es').compare); }
					setInfo(a, CT.sprintf(kind === 'emails' ? __('Direcciones encontradas: %d') : __('Enlaces encontrados: %d'), found.length));
					return found.join(sepSel.input.value === 'nl' ? '\n' : sepSel.input.value);
				},
				setup: function (a) {
					uniq = check(a, __('Eliminar duplicados'), true);
					sort = check(a, __('Ordenar alfabéticamente'), false);
					sepSel = select(a, __('Separar resultados con'), [{ value: 'nl', label: __('Saltos de línea') }, { value: ', ', label: __('Comas') }, { value: '; ', label: __('Punto y coma') }], 'nl');
					a.info.appendChild(h('p', { class: 'ct-help', text: __('La extracción se hace en tu navegador. Usa los datos personales que encuentres de forma responsable y conforme a la normativa de protección de datos.') }));
					a.run();
				}
			});
		};
	}
	tools.emails = extractor('emails');
	tools.urls = extractor('urls');

	tools.csvtable = function (el) {
		var header;
		var preview = h('div');
		var api = textTool(el, {
			inputLabel: __('Datos CSV'),
			sample: 'Producto;Precio;Unidades\nCafé;3,50;12\n"Té, verde";2,10;30',
			mono: true, outputLabel: __('Tabla en Markdown'),
			run: function (s, a) {
				preview.innerHTML = '';
				setInfo(a, '');
				if (!s.trim()) { return ''; }
				var parsed = CT.csv.parse(s);
				var rows = parsed.rows;
				var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
				rows = rows.map(function (r) { while (r.length < width) { r.push(''); } return r; });
				var head = header.input.checked ? rows[0] : rows[0].map(function (_, i) { return __('Columna') + ' ' + (i + 1); });
				var body = header.input.checked ? rows.slice(1) : rows;
				preview.appendChild(ui.table(head, body.slice(0, 500), { caption: __('Vista previa'), wrap: true }));
				setInfo(a, CT.sprintf(__('%1$d filas · %2$d columnas · separador detectado: «%3$s»'), body.length, width, parsed.delimiter === '\t' ? 'TAB' : parsed.delimiter));
				var esc = function (c) { return String(c).replace(/\|/g, '\\|').replace(/\n/g, ' '); };
				return ['| ' + head.map(esc).join(' | ') + ' |', '| ' + head.map(function () { return '---'; }).join(' | ') + ' |'].concat(body.map(function (r) { return '| ' + r.map(esc).join(' | ') + ' |'; })).join('\n');
			},
			setup: function (a) {
				header = check(a, __('La primera fila contiene los encabezados'), true);
				el.insertBefore(preview, a.info);
				a.options.appendChild(h('div', { class: 'ct-actions' },
					ui.button(__('Copiar como HTML'), { icon: 'code', size: 'sm', onClick: function () { var t = preview.querySelector('table'); if (t) { var c = t.cloneNode(true); c.removeAttribute('class'); CT.copy(c.outerHTML); } } }),
					ui.button(__('Descargar como JSON'), { icon: 'download', size: 'sm', onClick: function () {
						var rows = CT.csv.parse(a.input.get()).rows; if (!rows.length) { return; }
						var head = rows[0];
						var data = header.input.checked ? rows.slice(1).map(function (r) { var o = {}; head.forEach(function (k, i) { o[k] = r[i] === undefined ? '' : r[i]; }); return o; }) : rows;
						CT.download(JSON.stringify(data, null, 2), 'datos.json', 'application/json');
					} })));
				a.run();
			}
		});
		return api;
	};

	tools.text2csv = function (el) {
		var split, delim, trim;
		textTool(el, {
			sample: 'Ana García 34 Madrid\nLuis Pérez 28 Sevilla',
			mono: true, outputLabel: __('CSV'), filename: 'datos.csv',
			run: function (s, a) {
				var sp = split.input.value;
				var re = sp === 'space' ? /\s+/ : sp === 'tab' ? /\t/ : sp === 'multi' ? /\s{2,}|\t/ : new RegExp(sp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
				var rows = lines(s).filter(function (l) { return l.trim(); }).map(function (l) { var cells = (trim.input.checked ? l.trim() : l).split(re); return trim.input.checked ? cells.map(function (c) { return c.trim(); }) : cells; });
				setInfo(a, CT.sprintf(__('%d filas convertidas'), rows.length));
				return CT.csv.stringify(rows, delim.input.value === 'tab' ? '\t' : delim.input.value);
			},
			setup: function (a) {
				split = select(a, __('Separar columnas por'), [{ value: 'multi', label: __('Dos o más espacios o tabulador') }, { value: 'space', label: __('Cualquier espacio') }, { value: 'tab', label: __('Tabulador') }, { value: ',', label: __('Coma') }, { value: ';', label: __('Punto y coma') }, { value: '|', label: __('Barra vertical') }], 'space');
				delim = select(a, __('Separador del CSV'), [{ value: ';', label: __('Punto y coma (Excel en español)') }, { value: ',', label: __('Coma') }, { value: 'tab', label: __('Tabulador') }], ';');
				trim = check(a, __('Quitar espacios sobrantes de cada celda'), true);
				a.run();
			}
		});
	};

	CT.register('text', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
