/*!
 * HerramientasClave — componentes y utilidades compartidas por los motores de herramientas.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var __ = CT.__, sprintf = CT.sprintf;
	var cfg = CT.cfg;
	var LOCALE = 'es-ES';

	/* ---------- Constructor de DOM ---------- */
	function h(tag, attrs) {
		var el = document.createElement(tag);
		var a = attrs || {};
		Object.keys(a).forEach(function (k) {
			var v = a[k];
			if (v === null || v === undefined || v === false) { return; }
			if (k === 'class') { el.className = v; }
			else if (k === 'text') { el.textContent = v; }
			else if (k === 'html') { el.innerHTML = v; } // Solo con contenido generado por el propio código.
			else if (k === 'dataset') { Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; }); }
			else if (k.indexOf('on') === 0 && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); }
			else if (k === 'style' && typeof v === 'object') { Object.keys(v).forEach(function (s) { el.style[s] = v[s]; }); }
			else if (v === true) { el.setAttribute(k, ''); }
			else { el.setAttribute(k, v); }
		});
		for (var i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
		return el;
	}
	function append(el, child) {
		if (child === null || child === undefined || child === false) { return; }
		if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
		el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
	}
	CT.h = h;
	var uidN = 0;
	CT.uid = function (p) { uidN++; return (p || 'ct') + '-' + uidN; };
	CT.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 200); }; };
	CT.iconEl = function (name) { var s = h('span', { 'aria-hidden': 'true', class: 'ct-icon-wrap' }); s.innerHTML = CT.icon(name); s.style.display = 'inline-flex'; return s; };

	/* ---------- Números ---------- */
	/** Interpreta números escritos en formato español o internacional. */
	CT.parseNum = function (v) {
		if (typeof v === 'number') { return v; }
		var s = String(v == null ? '' : v).trim().replace(/\s| |€|%/g, '');
		if (!s) { return NaN; }
		var hasComma = s.indexOf(',') >= 0, hasDot = s.indexOf('.') >= 0;
		if (hasComma && hasDot) {
			if (s.lastIndexOf(',') > s.lastIndexOf('.')) { s = s.replace(/\./g, '').replace(',', '.'); }
			else { s = s.replace(/,/g, ''); }
		} else if (hasComma) {
			s = (s.match(/,/g).length > 1) ? s.replace(/,/g, '') : s.replace(',', '.');
		} else if (hasDot && s.match(/\./g).length > 1) {
			s = s.replace(/\./g, '');
		}
		if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) { return NaN; }
		return parseFloat(s);
	};
	/** Redondeo decimal sin errores típicos de coma flotante (1.005 → 1.01). */
	CT.round = function (n, d) {
		if (!isFinite(n)) { return n; }
		d = d === undefined ? 2 : d;
		var sign = n < 0 ? -1 : 1;
		return sign * Number(Math.round(Number(Math.abs(n) + 'e' + d)) + 'e-' + d);
	};
	/** Operaciones monetarias en céntimos enteros. */
	CT.money = {
		toCents: function (n) { return Math.round(CT.round(n, 2) * 100); },
		fromCents: function (c) { return c / 100; },
		mulRate: function (amount, pct) { return CT.round(CT.money.toCents(amount) * pct / 100, 0) / 100; }
	};
	var nfCache = {};
	// En español, la norma de Intl no agrupa los números de 4 cifras («3528,93»). Aquí se agrupan
	// siempre los miles («3.528,93»), como en el resto de cifras, para que toda la web sea coherente.
	var GROUP = (function () {
		try { var g = new Intl.NumberFormat(LOCALE).formatToParts(1234567).filter(function (p) { return p.type === 'group'; })[0]; return g ? g.value : '.'; } catch (e) { return '.'; }
	})();
	function groupAlways(parts) {
		var ints = parts.filter(function (p) { return p.type === 'integer'; });
		if (ints.length === 1 && ints[0].value.length > 3) {
			ints[0].value = ints[0].value.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
		}
		return parts.map(function (p) { return p.value; }).join('');
	}
	function nf(opts) {
		var key = JSON.stringify(opts);
		if (!nfCache[key]) {
			var f = new Intl.NumberFormat(LOCALE, opts);
			nfCache[key] = { format: f.formatToParts ? function (n) { return groupAlways(f.formatToParts(n)); } : function (n) { return f.format(n); } };
		}
		return nfCache[key];
	}
	CT.fmt = {
		number: function (n, maxDec, minDec) {
			if (!isFinite(n)) { return '—'; }
			return nf({ maximumFractionDigits: maxDec === undefined ? 4 : maxDec, minimumFractionDigits: minDec || 0 }).format(n);
		},
		money: function (n, currency) {
			if (!isFinite(n)) { return '—'; }
			return nf({ style: 'currency', currency: currency || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(CT.round(n, 2));
		},
		percent: function (n, dec) {
			if (!isFinite(n)) { return '—'; }
			return nf({ maximumFractionDigits: dec === undefined ? 2 : dec }).format(n) + ' %';
		},
		bytes: function (b, binary) {
			if (!isFinite(b)) { return '—'; }
			var base = binary ? 1024 : 1000;
			var units = binary ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
			var i = 0, v = Math.abs(b);
			while (v >= base && i < units.length - 1) { v /= base; i++; }
			return CT.fmt.number((b < 0 ? -1 : 1) * v, i ? 2 : 0) + ' ' + units[i];
		},
		duration: function (sec) {
			if (!isFinite(sec)) { return '—'; }
			sec = Math.max(0, Math.round(sec));
			var hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
			return (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
		},
		date: function (d, opts) { return new Intl.DateTimeFormat(LOCALE, opts || { dateStyle: 'long' }).format(d); }
	};

	/* ---------- Archivos ---------- */
	CT.fileExt = function (name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; };
	CT.baseName = function (name) { return String(name || 'archivo').replace(/\.[^.]+$/, ''); };
	CT.safeName = function (name) {
		return String(name || 'archivo').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 150) || 'archivo';
	};
	CT.readFile = function (file, as) {
		return new Promise(function (resolve, reject) {
			var r = new FileReader();
			r.onload = function () { resolve(r.result); };
			r.onerror = function () { reject(r.error || new Error('read')); };
			if (as === 'text') { r.readAsText(file); }
			else if (as === 'dataURL') { r.readAsDataURL(file); }
			else { r.readAsArrayBuffer(file); }
		});
	};
	CT.readHead = function (file, n) { return CT.readFile(file.slice(0, n || 4100)); };

	/** Identifica el tipo real por su firma (no por la extensión). */
	CT.sniff = function (buf) {
		var b = new Uint8Array(buf);
		var at = function (off, bytes) { for (var i = 0; i < bytes.length; i++) { if (b[off + i] !== bytes[i]) { return false; } } return true; };
		var str = function (off, len) { var s = ''; for (var i = off; i < off + len && i < b.length; i++) { s += String.fromCharCode(b[i]); } return s; };
		if (at(0, [0x25, 0x50, 0x44, 0x46])) { return { ext: 'pdf', mime: 'application/pdf', label: 'PDF' }; }
		if (at(0, [0x89, 0x50, 0x4E, 0x47])) { return { ext: 'png', mime: 'image/png', label: 'PNG' }; }
		if (at(0, [0xFF, 0xD8, 0xFF])) { return { ext: 'jpg', mime: 'image/jpeg', label: 'JPEG' }; }
		if (str(0, 4) === 'GIF8') { return { ext: 'gif', mime: 'image/gif', label: 'GIF' }; }
		if (str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') { return { ext: 'webp', mime: 'image/webp', label: 'WebP' }; }
		if (str(0, 4) === 'RIFF' && str(8, 4) === 'WAVE') { return { ext: 'wav', mime: 'audio/wav', label: 'WAV' }; }
		if (str(0, 4) === 'RIFF' && str(8, 4) === 'AVI ') { return { ext: 'avi', mime: 'video/x-msvideo', label: 'AVI' }; }
		if (str(0, 2) === 'BM') { return { ext: 'bmp', mime: 'image/bmp', label: 'BMP' }; }
		if (at(0, [0x49, 0x49, 0x2A, 0x00]) || at(0, [0x4D, 0x4D, 0x00, 0x2A])) { return { ext: 'tif', mime: 'image/tiff', label: 'TIFF' }; }
		if (at(0, [0x00, 0x00, 0x01, 0x00])) { return { ext: 'ico', mime: 'image/x-icon', label: 'ICO' }; }
		if (str(4, 4) === 'ftyp') {
			var brand = str(8, 4);
			if (/avif|avis/.test(brand)) { return { ext: 'avif', mime: 'image/avif', label: 'AVIF' }; }
			if (/heic|heix|hevc|mif1|msf1/.test(brand)) { return { ext: 'heic', mime: 'image/heic', label: 'HEIC/HEIF' }; }
			if (/qt/.test(brand)) { return { ext: 'mov', mime: 'video/quicktime', label: 'QuickTime (MOV)' }; }
			if (/M4A|M4B/.test(brand)) { return { ext: 'm4a', mime: 'audio/mp4', label: 'Audio MPEG-4 (M4A)' }; }
			if (/3gp/.test(brand)) { return { ext: '3gp', mime: 'video/3gpp', label: '3GP' }; }
			return { ext: 'mp4', mime: 'video/mp4', label: 'MPEG-4 (MP4)' };
		}
		if (at(0, [0x1A, 0x45, 0xDF, 0xA3])) { var doc = str(0, 64); return /webm/.test(doc) ? { ext: 'webm', mime: 'video/webm', label: 'WebM' } : { ext: 'mkv', mime: 'video/x-matroska', label: 'Matroska (MKV)' }; }
		if (str(0, 3) === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0 && (b[1] & 0x06) !== 0)) { return { ext: 'mp3', mime: 'audio/mpeg', label: 'MP3' }; }
		if (str(0, 4) === 'OggS') { return { ext: 'ogg', mime: 'audio/ogg', label: 'Ogg' }; }
		if (str(0, 4) === 'fLaC') { return { ext: 'flac', mime: 'audio/flac', label: 'FLAC' }; }
		if (at(0, [0x50, 0x4B, 0x03, 0x04]) || at(0, [0x50, 0x4B, 0x05, 0x06])) {
			var inner = str(30, 120);
			if (/^\[Content_Types\]\.xml|word\//.test(inner) || str(0, 2000).indexOf('word/') >= 0) { return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: __('Documento de Word (DOCX)') }; }
			if (str(0, 2000).indexOf('xl/') >= 0) { return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: __('Hoja de Excel (XLSX)') }; }
			if (str(0, 2000).indexOf('ppt/') >= 0) { return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: __('Presentación de PowerPoint (PPTX)') }; }
			if (/^mimetype/.test(inner)) {
				var mt = str(38, 80);
				if (mt.indexOf('epub') >= 0) { return { ext: 'epub', mime: 'application/epub+zip', label: 'EPUB' }; }
				if (mt.indexOf('opendocument.text') >= 0) { return { ext: 'odt', mime: 'application/vnd.oasis.opendocument.text', label: 'OpenDocument (ODT)' }; }
				if (mt.indexOf('opendocument.spreadsheet') >= 0) { return { ext: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', label: 'OpenDocument (ODS)' }; }
			}
			return { ext: 'zip', mime: 'application/zip', label: 'ZIP' };
		}
		if (str(0, 4) === 'Rar!') { return { ext: 'rar', mime: 'application/vnd.rar', label: 'RAR' }; }
		if (at(0, [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) { return { ext: '7z', mime: 'application/x-7z-compressed', label: '7-Zip' }; }
		if (at(0, [0x1F, 0x8B])) { return { ext: 'gz', mime: 'application/gzip', label: 'GZIP' }; }
		if (str(0, 3) === 'BZh') { return { ext: 'bz2', mime: 'application/x-bzip2', label: 'BZIP2' }; }
		if (at(0, [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) { return { ext: 'xz', mime: 'application/x-xz', label: 'XZ' }; }
		if (str(257, 5) === 'ustar') { return { ext: 'tar', mime: 'application/x-tar', label: 'TAR' }; }
		if (at(0, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) { return { ext: 'doc', mime: 'application/x-ole-storage', label: __('Documento Office antiguo (DOC/XLS/PPT)') }; }
		if (str(0, 2) === 'MZ') { return { ext: 'exe', mime: 'application/vnd.microsoft.portable-executable', label: __('Ejecutable de Windows (EXE/DLL)') }; }
		if (at(0, [0x7F, 0x45, 0x4C, 0x46])) { return { ext: 'elf', mime: 'application/x-elf', label: __('Ejecutable ELF (Linux)') }; }
		if (at(0, [0xCA, 0xFE, 0xBA, 0xBE])) { return { ext: 'class', mime: 'application/java-vm', label: __('Clase Java / binario universal de macOS') }; }
		if (at(0, [0x00, 0x61, 0x73, 0x6D])) { return { ext: 'wasm', mime: 'application/wasm', label: 'WebAssembly' }; }
		if (str(0, 15) === 'SQLite format 3') { return { ext: 'sqlite', mime: 'application/vnd.sqlite3', label: 'SQLite' }; }
		if (str(0, 4) === '8BPS') { return { ext: 'psd', mime: 'image/vnd.adobe.photoshop', label: 'Photoshop (PSD)' }; }
		if (str(0, 4) === 'wOFF') { return { ext: 'woff', mime: 'font/woff', label: 'WOFF' }; }
		if (str(0, 4) === 'wOF2') { return { ext: 'woff2', mime: 'font/woff2', label: 'WOFF2' }; }
		if (at(0, [0x00, 0x01, 0x00, 0x00, 0x00])) { return { ext: 'ttf', mime: 'font/ttf', label: 'TrueType (TTF)' }; }
		if (str(0, 4) === 'OTTO') { return { ext: 'otf', mime: 'font/otf', label: 'OpenType (OTF)' }; }
		if (str(0, 5) === '{\\rtf') { return { ext: 'rtf', mime: 'application/rtf', label: 'RTF' }; }
		// Texto: analiza si es UTF-8/ASCII legible.
		var sample = b.subarray(0, Math.min(b.length, 2048));
		var bin = 0;
		for (var i = 0; i < sample.length; i++) { var c = sample[i]; if (c === 0 || (c < 9) || (c > 13 && c < 32)) { bin++; } }
		if (sample.length && bin / sample.length < 0.02) {
			var head = new TextDecoder('utf-8', { fatal: false }).decode(sample).replace(/^﻿/, '').trim();
			if (/^<svg[\s>]|^<\?xml[^>]*>\s*(<!--[\s\S]*?-->\s*)*<svg/i.test(head)) { return { ext: 'svg', mime: 'image/svg+xml', label: 'SVG' }; }
			if (/^<!doctype html|^<html/i.test(head)) { return { ext: 'html', mime: 'text/html', label: 'HTML' }; }
			if (/^<\?xml/i.test(head)) { return { ext: 'xml', mime: 'application/xml', label: 'XML' }; }
			if (/^[\[{]/.test(head)) { return { ext: 'json', mime: 'application/json', label: __('JSON (probable)') }; }
			if (/^BEGIN:VCALENDAR/.test(head)) { return { ext: 'ics', mime: 'text/calendar', label: 'iCalendar' }; }
			if (/^BEGIN:VCARD/.test(head)) { return { ext: 'vcf', mime: 'text/vcard', label: 'vCard' }; }
			return { ext: 'txt', mime: 'text/plain', label: __('Texto plano') };
		}
		return null;
	};

	CT.download = function (data, filename, mime) {
		var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
		var url = URL.createObjectURL(blob);
		var a = h('a', { href: url, download: CT.safeName(filename) });
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
		CT.track('done');
	};

	/* ---------- Carga diferida de bibliotecas ---------- */
	var scripts = {};
	CT.loadScript = function (url) {
		if (!scripts[url]) {
			scripts[url] = new Promise(function (resolve, reject) {
				var s = h('script', { src: url, async: true });
				s.onload = resolve;
				s.onerror = function () { delete scripts[url]; reject(new Error(__('No se ha podido descargar un componente necesario. Comprueba tu conexión e inténtalo de nuevo.'))); };
				document.head.appendChild(s);
			});
		}
		return scripts[url];
	};
	CT.loadVendor = function (name) {
		var v = cfg.vendor || {};
		var map = {
			pdflib: function () { return window.PDFLib; },
			pdfjs: function () {
				if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = v.pdfjsWorker; }
				return window.pdfjsLib;
			},
			qrcode: function () { return window.qrcode; },
			beautify: function () { return window.beautifier; },
			wordlist: function () { return window.ClickToolsWordlistES; }
		};
		var got = map[name] && map[name]();
		if (got) { return Promise.resolve(got); }
		return CT.loadScript(v[name]).then(function () { return map[name](); });
	};

	/* ---------- Componentes ---------- */
	var ui = CT.ui = {};

	ui.button = function (label, opts) {
		opts = opts || {};
		var b = h('button', { type: opts.type || 'button', class: 'ct-btn ct-btn--' + (opts.variant || 'secondary') + (opts.size ? ' ct-btn--' + opts.size : '') + (opts.cls ? ' ' + opts.cls : ''), onclick: opts.onClick, disabled: opts.disabled, 'aria-label': opts.aria });
		if (opts.icon) { b.insertAdjacentHTML('beforeend', CT.icon(opts.icon)); }
		if (label) { b.appendChild(h('span', { text: label })); }
		return b;
	};
	ui.busy = function (btn, on) { btn.classList.toggle('is-busy', !!on); btn.disabled = !!on; btn.setAttribute('aria-busy', on ? 'true' : 'false'); };
	ui.actions = function () { return h('div', { class: 'ct-actions' }, [].slice.call(arguments)); };

	/**
	 * Campo de formulario accesible.
	 * opts: label, name, type, value, options, unit, help, min, max, step, placeholder, rows, mono, required, attrs, onInput
	 */
	ui.field = function (opts) {
		var id = CT.uid('f');
		var type = opts.type || 'text';
		var input;
		var describedby = [];
		var help = opts.help ? h('p', { class: 'ct-help', id: id + '-h', text: opts.help }) : null;
		var err = h('p', { class: 'ct-field__error', id: id + '-e', 'aria-live': 'polite' });
		if (help) { describedby.push(id + '-h'); }
		describedby.push(id + '-e');
		var common = { id: id, name: opts.name || id, 'aria-describedby': describedby.join(' ') };
		if (type === 'select') {
			input = h('select', Object.assign({ class: 'ct-input' }, common));
			(opts.options || []).forEach(function (o) {
				if (o.group) {
					var g = h('optgroup', { label: o.group });
					o.options.forEach(function (oo) { g.appendChild(h('option', { value: oo.value, text: oo.label })); });
					input.appendChild(g);
				} else {
					input.appendChild(h('option', { value: o.value, text: o.label }));
				}
			});
			if (opts.value !== undefined) { input.value = opts.value; }
		} else if (type === 'textarea') {
			input = h('textarea', Object.assign({ class: 'ct-input' + (opts.mono ? ' ct-mono' : ''), rows: opts.rows || 8, placeholder: opts.placeholder, spellcheck: opts.mono ? 'false' : null }, common));
			if (opts.value !== undefined) { input.value = opts.value; }
		} else if (type === 'checkbox') {
			input = h('input', Object.assign({ type: 'checkbox' }, common));
			input.checked = !!opts.value;
			var wrapC = h('div', { class: 'ct-field' }, h('label', { class: 'ct-check', for: id }, input, h('span', { text: opts.label })), help, err);
			return { el: wrapC, input: input, error: function (m) { err.textContent = m || ''; }, get: function () { return input.checked; } };
		} else {
			var isNum = type === 'number';
			input = h('input', Object.assign({
				class: 'ct-input' + (opts.mono ? ' ct-mono' : ''),
				type: isNum ? 'text' : type,
				inputmode: isNum ? (opts.integer ? 'numeric' : 'decimal') : (opts.inputmode || null),
				placeholder: opts.placeholder,
				min: isNum ? null : opts.min,
				max: isNum ? null : opts.max,
				step: isNum ? null : opts.step,
				autocomplete: opts.autocomplete || 'off',
				spellcheck: 'false'
			}, common));
			if (opts.value !== undefined && opts.value !== null) { input.value = isNum && typeof opts.value === 'number' ? String(opts.value).replace('.', ',') : opts.value; }
		}
		if (opts.attrs) { Object.keys(opts.attrs).forEach(function (k) { input.setAttribute(k, opts.attrs[k]); }); }
		if (opts.required) { input.setAttribute('aria-required', 'true'); }
		var control = opts.unit ? h('div', { class: 'ct-input-group' }, input, h('span', { class: 'ct-unit', text: opts.unit })) : input;
		var wrap = h('div', { class: 'ct-field' + (opts.cls ? ' ' + opts.cls : '') }, h('label', { for: id, text: opts.label }), control, help, err);
		if (opts.onInput) { input.addEventListener('input', opts.onInput); input.addEventListener('change', opts.onInput); }
		return {
			el: wrap,
			input: input,
			error: function (m) { err.textContent = m || ''; if (m) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); } },
			get: function () { return type === 'number' ? CT.parseNum(input.value) : input.value; },
			set: function (v) { input.value = type === 'number' && typeof v === 'number' ? String(v).replace('.', ',') : v; }
		};
	};

	/** Control segmentado (radios). */
	ui.seg = function (opts) {
		var name = opts.name || CT.uid('seg');
		var legend = opts.label ? h('legend', { text: opts.label }) : null;
		var seg = h('div', { class: 'ct-seg' + (opts.block ? ' ct-seg--block' : '') });
		opts.options.forEach(function (o) {
			var input = h('input', { type: 'radio', name: name, value: o.value });
			if (String(o.value) === String(opts.value)) { input.checked = true; }
			seg.appendChild(h('label', null, input, h('span', { html: (o.icon ? CT.icon(o.icon) : '') + CT.escape(o.label) })));
		});
		var fs = h('fieldset', { class: 'ct-fieldset' }, legend, seg);
		if (opts.onChange) { seg.addEventListener('change', function () { opts.onChange(api.get()); }); }
		var api = {
			el: fs,
			get: function () { var c = seg.querySelector('input:checked'); return c ? c.value : null; },
			set: function (v) { var i = seg.querySelector('input[value="' + v + '"]'); if (i) { i.checked = true; } }
		};
		return api;
	};

	ui.alert = function (type, message, extra) {
		var icon = { ok: 'circle-check', warn: 'triangle-alert', err: 'circle-x', info: 'info' }[type] || 'info';
		var el = h('div', { class: 'ct-alert ct-alert--' + type, role: type === 'err' ? 'alert' : 'status' });
		el.innerHTML = CT.icon(icon);
		var body = h('div', null, h('p', { text: message }));
		if (extra) { body.appendChild(h('p', { text: extra })); }
		el.appendChild(body);
		return el;
	};

	ui.stat = function (label, value, cls) {
		return h('div', { class: 'ct-stat' + (cls ? ' ct-stat--' + cls : '') }, h('span', { class: 'ct-stat__label', text: label }), h('span', { class: 'ct-stat__value', text: value }));
	};

	/** Zona de resultados con anuncio para lectores de pantalla. */
	ui.result = function () {
		var box = h('div', { class: 'ct-result-area', 'aria-live': 'polite' });
		return {
			el: box,
			set: function () { box.innerHTML = ''; [].slice.call(arguments).forEach(function (c) { append(box, c); }); },
			clear: function () { box.innerHTML = ''; },
			error: function (msg, hint) { box.innerHTML = ''; box.appendChild(ui.alert('err', msg, hint)); CT.track('error', 'input'); }
		};
	};

	/** Bloque de resultado principal + estadísticas. */
	ui.resultCard = function (opts) {
		var card = h('div', { class: 'ct-result' });
		if (opts.label) { card.appendChild(h('p', { class: 'ct-result__label', text: opts.label })); }
		if (opts.main !== undefined) {
			var main = h('p', { class: 'ct-result__main', text: opts.main });
			card.appendChild(main);
		}
		if (opts.stats && opts.stats.length) {
			card.appendChild(h('div', { class: 'ct-result__grid' }, opts.stats.map(function (s) { return ui.stat(s[0], s[1], s[2]); })));
		}
		if (opts.formula) { card.appendChild(h('div', { class: 'ct-formula', html: '<strong>' + CT.escape(__('Fórmula:')) + '</strong> ' + CT.escape(opts.formula) })); }
		if (opts.note) { card.appendChild(h('p', { class: 'ct-help', style: { marginTop: '10px' }, text: opts.note })); }
		if (opts.copy) {
			card.appendChild(h('div', { class: 'ct-actions', style: { marginBottom: 0 } }, ui.button(__('Copiar resultado'), { icon: 'copy', size: 'sm', onClick: function () { CT.copy(opts.copy); } })));
		}
		return card;
	};

	ui.table = function (headers, rows, opts) {
		opts = opts || {};
		var t = h('table', { class: 'ct-table' + (opts.wrap ? ' ct-table--wrap' : '') });
		if (opts.caption) { t.appendChild(h('caption', { class: 'ct-sr', text: opts.caption })); }
		var thead = h('thead', null, h('tr', null, headers.map(function (hd, i) { return h('th', { scope: 'col', class: opts.num && opts.num.indexOf(i) >= 0 ? 'num' : null, text: hd }); })));
		var tbody = h('tbody');
		rows.forEach(function (r) {
			tbody.appendChild(h('tr', null, r.map(function (c, i) {
				var td = h('td', { class: opts.num && opts.num.indexOf(i) >= 0 ? 'num' : null });
				append(td, c);
				return td;
			})));
		});
		t.appendChild(thead);
		t.appendChild(tbody);
		return h('div', { class: 'ct-table-wrap' + (opts.tall ? ' ct-table-wrap--tall' : ''), tabindex: '0', role: 'region', 'aria-label': opts.caption || __('Tabla de resultados') }, t);
	};

	ui.progress = function () {
		var bar = h('div', { class: 'ct-progress__bar' });
		var wrap = h('div', { class: 'ct-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, bar);
		var text = h('p', { class: 'ct-progress-text', 'aria-live': 'polite' });
		var el = h('div', { hidden: true }, wrap, text);
		return {
			el: el,
			set: function (frac, msg) {
				el.hidden = false;
				wrap.classList.remove('ct-progress--indeterminate');
				var pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
				bar.style.width = pct + '%';
				wrap.setAttribute('aria-valuenow', String(pct));
				if (msg !== undefined) { text.textContent = msg; }
			},
			indeterminate: function (msg) { el.hidden = false; wrap.classList.add('ct-progress--indeterminate'); wrap.removeAttribute('aria-valuenow'); text.textContent = msg || __('Procesando…'); },
			done: function () { el.hidden = true; }
		};
	};

	/**
	 * Zona para arrastrar y soltar o seleccionar archivos.
	 * opts: accept ('.pdf,image/*'), multiple, title, hint, onFiles(files), maxMb, directory
	 */
	ui.dropzone = function (opts) {
		var id = CT.uid('drop');
		var maxMb = opts.maxMb || cfg.maxMb || 200;
		var input = h('input', { type: 'file', id: id, accept: opts.accept || null, multiple: opts.multiple ? true : null, 'aria-describedby': id + '-hint' });
		if (opts.directory) { input.setAttribute('webkitdirectory', ''); input.setAttribute('directory', ''); }
		var iconBox = h('span', { class: 'ct-drop__icon', 'aria-hidden': 'true', html: CT.icon('upload') });
		var title = h('p', { class: 'ct-drop__title' }, h('label', { for: id, text: opts.title || (opts.multiple ? __('Arrastra tus archivos aquí o pulsa para seleccionarlos') : __('Arrastra tu archivo aquí o pulsa para seleccionarlo')) }));
		var hint = h('p', { class: 'ct-drop__hint', id: id + '-hint', text: opts.hint || '' });
		var zone = h('div', { class: 'ct-drop' + (opts.compact ? ' ct-drop--compact' : '') }, iconBox, title, hint, input);
		var acceptList = (opts.accept || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
		var accepts = function (file) {
			if (!acceptList.length) { return true; }
			var ext = '.' + CT.fileExt(file.name);
			var type = (file.type || '').toLowerCase();
			return acceptList.some(function (a) {
				if (a[0] === '.') { return a === ext; }
				if (a.slice(-2) === '/*') { return type.indexOf(a.slice(0, -1)) === 0; }
				return a === type;
			});
		};
		var handle = function (list) {
			var files = Array.prototype.slice.call(list || []);
			if (!files.length) { return; }
			var ok = [], rejected = [], big = [];
			files.forEach(function (f) {
				if (!accepts(f)) { rejected.push(f.name); }
				else if (f.size > maxMb * 1024 * 1024) { big.push(f.name); }
				else { ok.push(f); }
			});
			if (!opts.multiple && ok.length > 1) { ok = ok.slice(0, 1); }
			if (rejected.length) { CT.toast(sprintf(__('Formato no admitido: %s'), rejected.slice(0, 3).join(', ')), 'error'); }
			if (big.length) { CT.toast(sprintf(__('Supera el límite de %1$d MB: %2$s'), maxMb, big.slice(0, 3).join(', ')), 'error'); }
			if (ok.length) { opts.onFiles(ok); }
			input.value = '';
		};
		input.addEventListener('change', function () { handle(input.files); });
		['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
		['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); }); });
		zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) { handle(e.dataTransfer.files); } });
		return { el: zone, input: input, setHint: function (t) { hint.textContent = t; } };
	};

	/** Caja de texto de salida con copiar, descargar y limpiar. */
	ui.output = function (opts) {
		opts = opts || {};
		var f = ui.field({ label: opts.label || __('Resultado'), type: 'textarea', rows: opts.rows || 8, mono: opts.mono, value: '' });
		f.input.readOnly = !!opts.readonly;
		var bar = h('div', { class: 'ct-actions', style: { marginTop: '0' } },
			ui.button(__('Copiar'), { icon: 'copy', size: 'sm', onClick: function () { if (f.input.value) { CT.copy(f.input.value); CT.track('done'); } } }),
			opts.filename ? ui.button(__('Descargar'), { icon: 'download', size: 'sm', onClick: function () { if (f.input.value) { CT.download(f.input.value, opts.filename(), opts.mime || 'text/plain;charset=utf-8'); } } }) : null
		);
		var el = h('div', { class: 'ct-output-box' }, f.el, bar);
		return { el: el, input: f.input, set: function (v) { f.input.value = v; }, get: function () { return f.input.value; } };
	};

	/** Barra estándar para herramientas de texto: entrada + acciones. */
	ui.textInput = function (opts) {
		opts = opts || {};
		var original = '';
		var f = ui.field({ label: opts.label || __('Texto'), type: 'textarea', rows: opts.rows || 10, mono: opts.mono, placeholder: opts.placeholder, value: opts.value || '' });
		var fileIn = h('input', { type: 'file', accept: opts.accept || '.txt,.csv,.md,.json,.xml,.html,.css,.js,text/*', hidden: true });
		fileIn.addEventListener('change', function () {
			var file = fileIn.files[0];
			if (!file) { return; }
			if (file.size > 20 * 1024 * 1024) { CT.toast(__('El archivo de texto es demasiado grande (máximo 20 MB).'), 'error'); return; }
			CT.readFile(file, 'text').then(function (t) { f.input.value = t; f.input.dispatchEvent(new Event('input')); });
			fileIn.value = '';
		});
		var bar = h('div', { class: 'ct-actions', style: { marginTop: '0' } },
			ui.button(__('Abrir archivo'), { icon: 'file', size: 'sm', onClick: function () { fileIn.click(); } }),
			ui.button(__('Pegar'), { icon: 'copy', size: 'sm', onClick: function () {
				if (navigator.clipboard && navigator.clipboard.readText) {
					navigator.clipboard.readText().then(function (t) { f.input.value = t; f.input.dispatchEvent(new Event('input')); }, function () { CT.toast(__('Tu navegador no permite pegar desde aquí. Usa Ctrl+V.'), 'error'); });
				} else { CT.toast(__('Tu navegador no permite pegar desde aquí. Usa Ctrl+V.'), 'error'); }
			} }),
			ui.button(__('Limpiar'), { icon: 'trash-2', size: 'sm', variant: 'ghost', onClick: function () { original = f.input.value || original; f.input.value = ''; f.input.dispatchEvent(new Event('input')); f.input.focus(); } }),
			ui.button(__('Restaurar'), { icon: 'undo-2', size: 'sm', variant: 'ghost', onClick: function () { if (original) { f.input.value = original; f.input.dispatchEvent(new Event('input')); } } }),
			fileIn
		);
		return {
			el: h('div', null, f.el, bar),
			input: f.input,
			get: function () { return f.input.value; },
			set: function (v) { f.input.value = v; },
			remember: function () { original = f.input.value; }
		};
	};

	ui.tabs = function (items, onChange) {
		var bar = h('div', { class: 'ct-tabs', role: 'tablist' });
		var buttons = items.map(function (it, i) {
			var b = h('button', { type: 'button', class: 'ct-tab', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', text: it.label });
			b.addEventListener('click', function () { select(i); });
			b.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
					e.preventDefault();
					var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
					select(n); buttons[n].focus();
				}
			});
			bar.appendChild(b);
			return b;
		});
		function select(i) {
			buttons.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
			onChange(items[i].value, i);
		}
		return { el: bar, select: select };
	};

	/** Lista reordenable con arrastrar y soltar + alternativa con botones (accesible). */
	CT.sortable = function (container, itemSel, onChange) {
		var dragging = null;
		container.addEventListener('dragstart', function (e) {
			var it = e.target.closest(itemSel);
			if (!it) { return; }
			dragging = it;
			it.classList.add('is-dragging');
			e.dataTransfer.effectAllowed = 'move';
			try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* Firefox */ }
		});
		container.addEventListener('dragend', function () {
			if (dragging) { dragging.classList.remove('is-dragging'); }
			CT.$$('.is-drop-target', container).forEach(function (x) { x.classList.remove('is-drop-target'); });
			dragging = null;
		});
		container.addEventListener('dragover', function (e) {
			if (!dragging) { return; }
			e.preventDefault();
			var over = e.target.closest(itemSel);
			CT.$$('.is-drop-target', container).forEach(function (x) { x.classList.remove('is-drop-target'); });
			if (over && over !== dragging) { over.classList.add('is-drop-target'); }
		});
		container.addEventListener('drop', function (e) {
			if (!dragging) { return; }
			e.preventDefault();
			var over = e.target.closest(itemSel);
			if (over && over !== dragging) {
				var items = CT.$$(itemSel, container);
				var from = items.indexOf(dragging), to = items.indexOf(over);
				if (from < to) { over.after(dragging); } else { over.before(dragging); }
				onChange(from, to);
			}
		});
	};
	CT.moveItem = function (arr, from, to) { var x = arr.splice(from, 1)[0]; arr.splice(to, 0, x); return arr; };

	/** Persistencia opcional y transparente para herramientas de organización. */
	CT.persist = function (key, defaultOn) {
		var dataKey = 'ct-data-' + key;
		var flagKey = 'ct-data-on-' + key;
		var api = {
			enabled: function () { var f = CT.store.get(flagKey, null); return f === null ? !!defaultOn : !!f; },
			setEnabled: function (on) { CT.store.set(flagKey, !!on); if (!on) { CT.store.remove(dataKey); } },
			load: function (fallback) { return api.enabled() ? CT.store.get(dataKey, fallback) : fallback; },
			save: function (data) { if (api.enabled()) { CT.store.set(dataKey, data); } },
			clear: function () { CT.store.remove(dataKey); }
		};
		return api;
	};
	ui.persistToggle = function (persist, getData, onClear) {
		var id = CT.uid('persist');
		var input = h('input', { type: 'checkbox', id: id });
		input.checked = persist.enabled();
		input.addEventListener('change', function () {
			persist.setEnabled(input.checked);
			if (input.checked) { persist.save(getData()); }
			CT.toast(input.checked ? __('Se guardará en este navegador') : __('Ya no se guarda y se han borrado los datos guardados'));
		});
		return h('div', { class: 'ct-row ct-no-print', style: { justifyContent: 'space-between', marginBottom: '12px' } },
			h('label', { class: 'ct-switch', for: id }, input, h('span', { class: 'ct-switch__track', 'aria-hidden': 'true' }), h('span', { text: __('Guardar en este navegador') })),
			ui.button(__('Borrar todo'), { icon: 'trash-2', size: 'sm', variant: 'ghost', onClick: function () {
				if (window.confirm(__('¿Borrar todos los datos de esta herramienta?'))) { persist.clear(); onClear(); CT.toast(__('Datos borrados')); }
			} })
		);
	};

	/** Imagen a partir de un archivo. */
	CT.loadImage = function (file) {
		return new Promise(function (resolve, reject) {
			var url = URL.createObjectURL(file);
			var img = new Image();
			img.onload = function () { resolve({ img: img, url: url, width: img.naturalWidth, height: img.naturalHeight }); };
			img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(__('No se ha podido leer la imagen. Puede estar dañada o tener un formato que tu navegador no admite.'))); };
			img.src = url;
		});
	};
	CT.canvasToBlob = function (canvas, type, quality) {
		return new Promise(function (resolve, reject) {
			if (!canvas.toBlob) { reject(new Error('toBlob')); return; }
			canvas.toBlob(function (b) {
				if (!b) { reject(new Error(__('El navegador no ha podido generar la imagen. Prueba con dimensiones más pequeñas.'))); return; }
				resolve(b);
			}, type, quality);
		});
	};
	var avifSupport = null;
	CT.supportsType = function (type) {
		if (type !== 'image/avif' && type !== 'image/webp') { return Promise.resolve(true); }
		if (type === 'image/avif' && avifSupport !== null) { return Promise.resolve(avifSupport); }
		var c = document.createElement('canvas');
		c.width = c.height = 2;
		return new Promise(function (resolve) {
			c.toBlob(function (b) {
				var ok = !!b && b.type === type;
				if (type === 'image/avif') { avifSupport = ok; }
				resolve(ok);
			}, type, 0.8);
		});
	};

	/** Luminancia relativa y contraste WCAG entre dos colores HEX. */
	CT.luminance = function (hex) {
		var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) { return 1; }
		var n = parseInt(m[1], 16);
		return [n >> 16, (n >> 8) & 255, n & 255].map(function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }).reduce(function (a, c, i) { return a + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
	};
	CT.contrast = function (a, b) { var x = CT.luminance(a), y = CT.luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

	/** Imprimir solo una zona del documento. */
	CT.printArea = function (node) {
		var area = CT.h('div', { class: 'ct-print-area' });
		area.appendChild(node.cloneNode(true));
		document.body.classList.add('ct-printing-doc');
		var app = document.querySelector('.ct-app');
		app.appendChild(area);
		var cleanup = function () { area.remove(); document.body.classList.remove('ct-printing-doc'); window.removeEventListener('afterprint', cleanup); };
		window.addEventListener('afterprint', cleanup);
		window.print();
		setTimeout(cleanup, 1000);
	};

	/** Utilidad para errores con instrucciones. */
	/** Aviso sonoro breve (tres pitidos) con Web Audio. */
	CT.beep = function () {
		try {
			var Ctx = window.AudioContext || window.webkitAudioContext;
			var ctx = new Ctx();
			[0, 0.35, 0.7].forEach(function (t) {
				var o = ctx.createOscillator(), g = ctx.createGain();
				o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
				g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
				g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
				g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
				o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.32);
			});
		} catch (e) { /* sin audio */ }
	};
	CT.fail = function (target, err, hint) {
		var msg = (err && err.message) ? err.message : String(err || __('Se ha producido un error inesperado.'));
		if (/encrypt|password/i.test(msg)) { msg = __('El documento está protegido con contraseña.'); hint = hint || __('Desbloquéalo primero (con autorización) y vuelve a intentarlo.'); }
		if (/Invalid PDF|No PDF header|Failed to parse/i.test(msg)) { msg = __('El archivo no es un PDF válido o está dañado.'); hint = hint || __('Comprueba que se abre en un lector de PDF.'); }
		if (target && target.error) { target.error(msg, hint); }
		CT.track('error', (err && err.name) || 'error');
		if (window.console && err && err.stack) { console.warn(err); }
	};
})();
