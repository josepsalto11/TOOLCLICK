/*!
 * HerramientasClave — documentos para negocio: presupuestos, facturas, recibos y
 * conversión de listas de productos. Todo se calcula en céntimos y en el
 * navegador; los datos del emisor solo se guardan si el usuario lo activa.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number, M = CT.fmt.money;
	var tools = {};

	var num = function (v) { var n = CT.parseNum(v); return isFinite(n) ? n : 0; };
	var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
	var addDays = function (iso, days) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
	var fmtDate = function (iso) { if (!iso) { return ''; } var d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('es-ES'); };

	/** Recargo de equivalencia asociado a cada tipo de IVA. */
	var RE = { '21': 5.2, '10': 1.4, '5': 0.62, '4': 0.5, '0': 0 };

	/** Importe en letras (español), p. ej. «ciento veintiún euros con cinco céntimos». */
	function words(n) {
		var U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
		var T = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
		var C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
		var lt1000 = function (x) {
			if (x === 100) { return 'cien'; }
			var c = Math.floor(x / 100), r = x % 100, out = [];
			if (c) { out.push(C[c]); }
			if (r) { out.push(r < 30 ? U[r] : T[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '')); }
			return out.join(' ');
		};
		var full = function (x) {
			if (x === 0) { return 'cero'; }
			var parts = [];
			var mill = Math.floor(x / 1e6), th = Math.floor(x / 1000) % 1000, rest = x % 1000;
			if (mill) { parts.push(mill === 1 ? 'un millón' : apocope(full(mill)) + ' millones'); }
			if (th) { parts.push(th === 1 ? 'mil' : apocope(lt1000(th)) + ' mil'); }
			if (rest) { parts.push(lt1000(rest)); }
			return parts.join(' ');
		};
		return full(n);
	}
	function apocope(s) { return s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un'); }
	function amountInWords(cents) {
		var e = Math.floor(cents / 100), c = cents % 100;
		var out = e === 1 ? 'un euro' : apocope(words(e)) + (e >= 1e6 && e % 1e6 === 0 ? ' de euros' : ' euros');
		if (c) { out += ' con ' + (c === 1 ? 'un céntimo' : apocope(words(c)) + ' céntimos'); }
		return out;
	}
	CT.amountInWords = amountInWords;

	/** Totales de un documento. Devuelve importes en céntimos. */
	function totals(doc) {
		var groups = {}, base = 0;
		var lines = doc.lines.filter(function (l) { return String(l.desc || '').trim() || num(l.price); }).map(function (l) {
			var gross = Math.round(num(l.qty) * num(l.price) * 100);
			var disc = Math.round(gross * Math.min(100, Math.max(0, num(l.disc))) / 100);
			var net = gross - disc;
			var rate = String(l.vat || '0');
			groups[rate] = (groups[rate] || 0) + net;
			base += net;
			return { desc: String(l.desc || '').trim(), qty: num(l.qty), price: num(l.price), disc: num(l.disc), vat: rate, net: net };
		});
		var taxes = Object.keys(groups).sort(function (a, b) { return b - a; }).map(function (r) {
			var b = groups[r];
			return { rate: num(r), base: b, vat: Math.round(b * num(r) / 100), re: doc.re ? Math.round(b * (RE[r] || 0) / 100) : 0, reRate: RE[r] || 0 };
		});
		var vat = taxes.reduce(function (a, t) { return a + t.vat; }, 0);
		var re = taxes.reduce(function (a, t) { return a + t.re; }, 0);
		var irpf = Math.round(base * num(doc.irpf) / 100);
		return { lines: lines, taxes: taxes, base: base, vat: vat, re: re, irpf: irpf, total: base + vat + re - irpf };
	}
	CT.bizTotals = totals;

	var C2 = function (c) { return M(c / 100); };

	/** Vista HTML del documento (también se usa para imprimir). */
	function renderDoc(kind, doc, t) {
		var titles = { quote: __('Presupuesto'), invoice: __('Factura') };
		var party = function (label, p) {
			return h('div', { class: 'ct-doc__party' }, h('p', { class: 'ct-doc__label', text: label }),
				h('p', { class: 'ct-doc__name', text: p.name || '—' }),
				p.nif ? h('p', { text: __('NIF') + ': ' + p.nif }) : null,
				p.addr ? h('p', { class: 'ct-doc__pre', text: p.addr }) : null,
				p.contact ? h('p', { text: p.contact }) : null);
		};
		var meta = [[kind === 'invoice' ? __('Nº de factura') : __('Nº de presupuesto'), doc.number || '—'], [__('Fecha'), fmtDate(doc.date)]];
		if (doc.due) { meta.push([kind === 'invoice' ? __('Vencimiento') : __('Válido hasta'), fmtDate(doc.due)]); }
		var rows = t.lines.map(function (l) {
			return h('tr', null, h('td', { text: l.desc }), h('td', { class: 'num', text: N(l.qty, 3) }), h('td', { class: 'num', text: M(l.price) }),
				h('td', { class: 'num', text: l.disc ? CT.fmt.percent(l.disc) : '—' }), h('td', { class: 'num', text: l.vat + ' %' }), h('td', { class: 'num', text: C2(l.net) }));
		});
		var sumRows = [[__('Base imponible'), C2(t.base)]];
		t.taxes.forEach(function (x) {
			sumRows.push([CT.sprintf(__('IVA %s %% sobre %s'), N(x.rate, 2), C2(x.base)), C2(x.vat)]);
			if (doc.re && x.re) { sumRows.push([CT.sprintf(__('Recargo de equivalencia %s %%'), N(x.reRate, 2)), C2(x.re)]); }
		});
		if (t.irpf) { sumRows.push([CT.sprintf(__('Retención IRPF %s %%'), N(num(doc.irpf), 2)), '−' + C2(t.irpf)]); }
		return h('article', { class: 'ct-doc', 'aria-label': __('Vista previa del documento') },
			h('header', { class: 'ct-doc__head' }, h('h2', { class: 'ct-doc__title', text: titles[kind] }),
				h('dl', { class: 'ct-doc__meta' }, meta.map(function (m) { return [h('dt', { text: m[0] }), h('dd', { text: m[1] })]; }))),
			h('div', { class: 'ct-doc__parties' }, party(__('Emisor'), doc.issuer), party(__('Cliente'), doc.client)),
			h('div', { class: 'ct-table-wrap' }, h('table', { class: 'ct-table ct-doc__lines' },
				h('thead', null, h('tr', null, [__('Concepto'), __('Cant.'), __('Precio'), __('Dto.'), __('IVA'), __('Importe')].map(function (x, i) { return h('th', { scope: 'col', class: i ? 'num' : null, text: x }); }))),
				h('tbody', null, rows.length ? rows : h('tr', null, h('td', { colspan: '6', text: __('Añade al menos una línea.') }))))),
			h('table', { class: 'ct-doc__totals' }, h('tbody', null, sumRows.map(function (r) { return h('tr', null, h('th', { scope: 'row', text: r[0] }), h('td', { class: 'num', text: r[1] })); }),
				h('tr', { class: 'ct-doc__total' }, h('th', { scope: 'row', text: __('Total') }), h('td', { class: 'num', text: C2(t.total) })))),
			doc.payment ? h('div', { class: 'ct-doc__notes' }, h('p', { class: 'ct-doc__label', text: __('Forma de pago') }), h('p', { class: 'ct-doc__pre', text: doc.payment })) : null,
			doc.notes ? h('div', { class: 'ct-doc__notes' }, h('p', { class: 'ct-doc__label', text: __('Observaciones') }), h('p', { class: 'ct-doc__pre', text: doc.notes })) : null
		);
	}

	/** Texto compatible con las fuentes estándar de PDF (WinAnsi). */
	function pdfSafe(s) {
		return String(s || '').replace(/[   ]/g, ' ').replace(/[−]/g, '-').replace(/[^\x20-\x7E¡-ÿ€\n•–—‘’“”…]/g, '?');
	}

	/** Genera un PDF A4 del documento con pdf-lib (texto seleccionable). */
	function buildPdf(kind, doc, t) {
		return CT.loadVendor('pdflib').then(function () {
			var L = window.PDFLib;
			return L.PDFDocument.create().then(function (pdf) {
				return Promise.all([pdf.embedFont(L.StandardFonts.Helvetica), pdf.embedFont(L.StandardFonts.HelveticaBold)]).then(function (fonts) {
					var F = fonts[0], B = fonts[1];
					var W = 595.28, H = 841.89, MG = 48;
					var page, y;
					var ink = L.rgb(0.1, 0.1, 0.15), soft = L.rgb(0.42, 0.42, 0.5), line = L.rgb(0.85, 0.85, 0.9), accent = L.rgb(0.36, 0.25, 0.85);
					var newPage = function () { page = pdf.addPage([W, H]); y = H - MG; };
					var text = function (s, x, size, font, color, opts) {
						s = pdfSafe(s);
						var w = (font || F).widthOfTextAtSize(s, size);
						var xx = opts && opts.right ? x - w : x;
						page.drawText(s, { x: xx, y: y, size: size, font: font || F, color: color || ink });
						return w;
					};
					var wrap = function (s, size, font, maxW) {
						var out = [];
						pdfSafe(s).split('\n').forEach(function (para) {
							var cur = '';
							para.split(/\s+/).forEach(function (w) {
								var test = cur ? cur + ' ' + w : w;
								if ((font || F).widthOfTextAtSize(test, size) > maxW && cur) { out.push(cur); cur = w; }
								else { cur = test; }
								while ((font || F).widthOfTextAtSize(cur, size) > maxW && cur.length > 1) {
									var k = cur.length;
									while (k > 1 && (font || F).widthOfTextAtSize(cur.slice(0, k), size) > maxW) { k--; }
									out.push(cur.slice(0, k)); cur = cur.slice(k);
								}
							});
							out.push(cur);
						});
						return out;
					};
					var ensure = function (need) { if (y - need < MG + 20) { newPage(); } };
					newPage();
					text(kind === 'invoice' ? __('Factura') : __('Presupuesto'), MG, 22, B, accent);
					var meta = [[kind === 'invoice' ? __('Nº de factura') : __('Nº de presupuesto'), doc.number || '—'], [__('Fecha'), fmtDate(doc.date)]];
					if (doc.due) { meta.push([kind === 'invoice' ? __('Vencimiento') : __('Válido hasta'), fmtDate(doc.due)]); }
					var my = y;
					meta.forEach(function (m) { text(m[0] + ': ', W - MG - 150, 9.5, F, soft); text(m[1], W - MG, 9.5, B, ink, { right: true }); y -= 14; });
					y = Math.min(y, my - 30) - 10;
					var colW = (W - MG * 2 - 20) / 2;
					var partyLines = function (p) { var l = [[p.name || '—', B]]; if (p.nif) { l.push([__('NIF') + ': ' + p.nif, F]); } wrap(p.addr || '', 9.5, F, colW).forEach(function (s) { if (s) { l.push([s, F]); } }); if (p.contact) { wrap(p.contact, 9.5, F, colW).forEach(function (s) { l.push([s, F]); }); } return l; };
					var a = partyLines(doc.issuer), b = partyLines(doc.client), top = y;
					text(__('Emisor').toUpperCase(), MG, 8, B, soft); text(__('Cliente').toUpperCase(), MG + colW + 20, 8, B, soft);
					y -= 14;
					for (var i = 0; i < Math.max(a.length, b.length); i++) {
						if (a[i]) { text(a[i][0], MG, 9.5, a[i][1]); }
						if (b[i]) { text(b[i][0], MG + colW + 20, 9.5, b[i][1]); }
						y -= 13;
					}
					y = Math.min(y, top - 40) - 16;
					var cols = [MG, W - MG - 250, W - MG - 175, W - MG - 120, W - MG - 70, W - MG];
					var head = function () {
						page.drawRectangle({ x: MG, y: y - 5, width: W - MG * 2, height: 18, color: L.rgb(0.95, 0.94, 1) });
						y += 0;
						text(__('Concepto'), MG + 4, 8.5, B, soft);
						[__('Cant.'), __('Precio'), __('Dto.'), __('IVA'), __('Importe')].forEach(function (lbl, k) { text(lbl, cols[k + 1] - (k === 4 ? 4 : 0), 8.5, B, soft, { right: true }); });
						y -= 20;
					};
					head();
					t.lines.forEach(function (l) {
						var dl = wrap(l.desc || '—', 9.5, F, cols[1] - MG - 60);
						ensure(dl.length * 12 + 8);
						if (y > H - MG - 5) { head(); }
						var startY = y;
						dl.forEach(function (s, k) { text(s, MG + 4, 9.5); if (k < dl.length - 1) { y -= 12; } });
						var endY = y; y = startY;
						text(N(l.qty, 3), cols[1], 9.5, F, ink, { right: true });
						text(M(l.price), cols[2], 9.5, F, ink, { right: true });
						text(l.disc ? CT.fmt.percent(l.disc) : '—', cols[3], 9.5, F, ink, { right: true });
						text(l.vat + ' %', cols[4], 9.5, F, ink, { right: true });
						text(C2(l.net), cols[5] - 4, 9.5, F, ink, { right: true });
						y = endY - 8;
						page.drawLine({ start: { x: MG, y: y + 3 }, end: { x: W - MG, y: y + 3 }, thickness: 0.5, color: line });
						y -= 8;
					});
					var sums = [[__('Base imponible'), C2(t.base)]];
					t.taxes.forEach(function (x) {
						sums.push([CT.sprintf(__('IVA %s %% sobre %s'), N(x.rate, 2), C2(x.base)), C2(x.vat)]);
						if (doc.re && x.re) { sums.push([CT.sprintf(__('Recargo de equivalencia %s %%'), N(x.reRate, 2)), C2(x.re)]); }
					});
					if (t.irpf) { sums.push([CT.sprintf(__('Retención IRPF %s %%'), N(num(doc.irpf), 2)), '-' + C2(t.irpf)]); }
					ensure(sums.length * 15 + 40);
					y -= 6;
					sums.forEach(function (s) { text(s[0], W - MG - 120, 9.5, F, soft, { right: true }); text(s[1], W - MG - 4, 9.5, F, ink, { right: true }); y -= 15; });
					page.drawLine({ start: { x: W - MG - 260, y: y + 10 }, end: { x: W - MG, y: y + 10 }, thickness: 1, color: accent });
					y -= 6;
					text(__('Total'), W - MG - 120, 13, B, ink, { right: true }); text(C2(t.total), W - MG - 4, 13, B, accent, { right: true });
					y -= 30;
					[[__('Forma de pago'), doc.payment], [__('Observaciones'), doc.notes]].forEach(function (blk) {
						if (!blk[1]) { return; }
						var ls = wrap(blk[1], 9.5, F, W - MG * 2);
						ensure(20 + ls.length * 12);
						text(blk[0].toUpperCase(), MG, 8, B, soft); y -= 13;
						ls.forEach(function (s) { ensure(12); text(s, MG, 9.5); y -= 12; });
						y -= 10;
					});
					var pages = pdf.getPages();
					pages.forEach(function (p, k) {
						if (pages.length > 1) { var s = pdfSafe(CT.sprintf(__('Página %d de %d'), k + 1, pages.length)); p.drawText(s, { x: W - MG - F.widthOfTextAtSize(s, 8), y: 24, size: 8, font: F, color: soft }); }
					});
					pdf.setTitle(pdfSafe((kind === 'invoice' ? __('Factura') : __('Presupuesto')) + ' ' + (doc.number || '')));
					pdf.setCreator('HerramientasClave');
					pdf.setProducer('HerramientasClave (pdf-lib)');
					return pdf.save();
				});
			});
		});
	}

	function partyFields(title, p, onInput) {
		var f = {
			name: ui.field({ label: __('Nombre o razón social'), value: p.name || '', autocomplete: 'organization', onInput: onInput }),
			nif: ui.field({ label: __('NIF / CIF'), value: p.nif || '', onInput: onInput }),
			addr: ui.field({ label: __('Dirección'), type: 'textarea', rows: 2, value: p.addr || '', onInput: onInput }),
			contact: ui.field({ label: __('Email o teléfono (opcional)'), value: p.contact || '', onInput: onInput })
		};
		var read = function () { return { name: f.name.input.value.trim(), nif: f.nif.input.value.trim(), addr: f.addr.input.value.trim(), contact: f.contact.input.value.trim() }; };
		var set = function (v) { v = v || {}; f.name.input.value = v.name || ''; f.nif.input.value = v.nif || ''; f.addr.input.value = v.addr || ''; f.contact.input.value = v.contact || ''; };
		var el = h('fieldset', { class: 'ct-fieldset ct-doc-form__party' }, h('legend', { text: title }), h('div', { class: 'ct-cols' }, f.name.el, f.nif.el), f.addr.el, f.contact.el);
		return { el: el, read: read, set: set };
	}

	/** Editor común de presupuestos y facturas. */
	function docTool(el, kind) {
		var issuerStore = CT.persist('biz-issuer', false);
		var saved = issuerStore.load(null) || {};
		var prefix = kind === 'invoice' ? 'F' : 'P';
		var doc = {
			issuer: saved.issuer || {}, client: {},
			number: saved[kind + 'Next'] || (prefix + new Date().getFullYear() + '-001'),
			date: today(), due: addDays(today(), kind === 'invoice' ? 30 : 15),
			lines: [{ desc: '', qty: '1', price: '', disc: '0', vat: '21' }],
			irpf: '0', re: false, payment: saved.payment || '', notes: ''
		};
		var preview = h('div', { class: 'ct-doc-preview' });
		var summary = h('div');
		var update;
		var issuer = partyFields(__('Tus datos (emisor)'), doc.issuer, function () { update(); });
		var client = partyFields(__('Datos del cliente'), doc.client, function () { update(); });
		var number = ui.field({ label: kind === 'invoice' ? __('Nº de factura') : __('Nº de presupuesto'), value: doc.number, onInput: function () { update(); } });
		var date = ui.field({ label: __('Fecha'), type: 'date', value: doc.date, onInput: function () { update(); } });
		var due = ui.field({ label: kind === 'invoice' ? __('Vencimiento') : __('Válido hasta'), type: 'date', value: doc.due, onInput: function () { update(); } });
		var vatOpts = ['21', '10', '5', '4', '0'].map(function (v) { return { value: v, label: v + ' %' }; });
		var table = CT.editTable([
			{ key: 'desc', label: __('Concepto'), placeholder: __('Descripción del producto o servicio') },
			{ key: 'qty', label: __('Cantidad'), type: 'number', default: '1', width: '90px' },
			{ key: 'price', label: __('Precio unitario (sin IVA)'), type: 'number', width: '130px' },
			{ key: 'disc', label: __('Dto. %'), type: 'number', default: '0', width: '80px' },
			{ key: 'vat', label: __('IVA'), type: 'select', options: vatOpts, default: '21', width: '90px' }
		], doc.lines, function () { update(); }, { addLabel: __('Añadir línea') });
		var irpf = ui.field({ label: __('Retención IRPF'), type: 'select', value: '0', options: [{ value: '0', label: __('Sin retención') }, { value: '7', label: '7 %' }, { value: '15', label: '15 %' }, { value: '19', label: '19 %' }], help: __('Solo aplica si facturas como profesional a empresas o autónomos.'), onInput: function () { update(); } });
		var re = ui.field({ label: __('Aplicar recargo de equivalencia (cliente en ese régimen)'), type: 'checkbox', value: false, onInput: function () { update(); } });
		re.input.addEventListener('change', function () { update(); });
		var payment = ui.field({ label: __('Forma de pago'), type: 'textarea', rows: 2, value: doc.payment, placeholder: __('Por ejemplo: transferencia a la cuenta ES00 0000 0000 0000 0000 0000'), onInput: function () { update(); } });
		var notes = ui.field({ label: __('Observaciones'), type: 'textarea', rows: 2, value: '', placeholder: kind === 'quote' ? __('Condiciones, plazos de entrega, validez…') : __('Información adicional, si la necesitas'), onInput: function () { update(); } });
		issuer.set(doc.issuer);

		var read = function () {
			doc.issuer = issuer.read(); doc.client = client.read();
			doc.number = number.input.value.trim(); doc.date = date.input.value; doc.due = due.input.value;
			doc.irpf = kind === 'invoice' ? irpf.input.value : '0'; doc.re = kind === 'invoice' && re.input.checked;
			doc.payment = payment.input.value.trim(); doc.notes = notes.input.value.trim();
			return doc;
		};
		var saveIssuer = function () {
			var s = issuerStore.load(null) || {};
			s.issuer = doc.issuer; s.payment = doc.payment;
			issuerStore.save(s);
		};
		update = CT.debounce(function () {
			read();
			var t = totals(doc);
			summary.innerHTML = '';
			var warns = [];
			if (kind === 'invoice') {
				if (!doc.issuer.name || !doc.issuer.nif) { warns.push(__('Faltan tu nombre o tu NIF.')); }
				if (!doc.client.name) { warns.push(__('Falta el nombre del cliente.')); }
				if (!doc.number) { warns.push(__('Falta el número de factura.')); }
			}
			if (t.lines.some(function (l) { return l.qty <= 0; })) { warns.push(__('Hay líneas con cantidad 0 o negativa.')); }
			summary.appendChild(ui.resultCard({ label: __('Total del documento'), main: C2(t.total), stats: [[__('Base imponible'), C2(t.base)], [__('IVA'), C2(t.vat)]].concat(t.re ? [[__('Recargo'), C2(t.re)]] : []).concat(t.irpf ? [[__('Retención IRPF'), '−' + C2(t.irpf)]] : []) }));
			if (warns.length) { summary.appendChild(ui.alert('warn', warns.join(' '))); }
			preview.innerHTML = '';
			preview.appendChild(renderDoc(kind, doc, t));
			saveIssuer();
		}, 150);

		var file = function (ext) { return (kind === 'invoice' ? 'factura' : 'presupuesto') + '-' + CT.safeName(doc.number || 'documento') + '.' + ext; };
		var bumpNumber = function () {
			var m = /^(.*?)(\d+)$/.exec(doc.number || '');
			if (!m) { return; }
			var next = m[1] + String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
			var s = issuerStore.load(null) || {}; s[kind + 'Next'] = next; issuerStore.save(s);
		};
		var actions = ui.actions(
			ui.button(__('Descargar PDF'), { variant: 'primary', icon: 'file-down', onClick: function (e) {
				read(); var t = totals(doc);
				if (!t.lines.length) { CT.toast(__('Añade al menos una línea.'), 'error'); return; }
				var b = e.currentTarget; ui.busy(b, true);
				buildPdf(kind, doc, t).then(function (bytes) { CT.download(new Blob([bytes], { type: 'application/pdf' }), file('pdf')); bumpNumber(); CT.track('done'); })
					.catch(function (err) { CT.fail(null, err); CT.toast(err.message || __('No se ha podido generar el PDF.'), 'error'); }).then(function () { ui.busy(b, false); });
			} }),
			ui.button(__('Imprimir'), { icon: 'printer', onClick: function () { update.flush ? update.flush() : null; read(); CT.printArea(renderDoc(kind, doc, totals(doc))); } }),
			ui.button(__('Exportar datos (JSON)'), { icon: 'braces', variant: 'ghost', onClick: function () { read(); CT.download(JSON.stringify({ type: 'clicktools-' + kind, version: 1, doc: doc }, null, 2), file('json'), 'application/json'); } }),
			ui.button(__('Importar JSON'), { icon: 'upload', variant: 'ghost', onClick: function () { picker.click(); } })
		);
		var picker = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
		picker.addEventListener('change', function () {
			var f = picker.files[0]; picker.value = '';
			if (!f) { return; }
			if (f.size > 1024 * 1024) { CT.toast(__('El archivo es demasiado grande.'), 'error'); return; }
			CT.readFile(f, 'text').then(function (txt) {
				var data = JSON.parse(txt);
				var d = data && data.doc;
				if (!d || !Array.isArray(d.lines)) { throw new Error(__('El archivo no contiene un documento de HerramientasClave.')); }
				issuer.set(d.issuer); client.set(d.client);
				number.input.value = d.number || ''; date.input.value = d.date || today(); due.input.value = d.due || '';
				payment.input.value = d.payment || ''; notes.input.value = d.notes || ''; irpf.input.value = String(d.irpf || '0'); re.input.checked = !!d.re;
				doc.lines.length = 0;
				d.lines.slice(0, 500).forEach(function (l) { doc.lines.push({ desc: String(l.desc || ''), qty: String(l.qty || ''), price: String(l.price || ''), disc: String(l.disc || '0'), vat: String(l.vat || '21') }); });
				table.redraw(); update(); CT.toast(__('Documento importado'));
			}).catch(function (err) { CT.toast(err.message || __('No se ha podido leer el archivo.'), 'error'); });
		});

		el.appendChild(ui.persistToggle(issuerStore, function () { read(); return { issuer: doc.issuer, payment: doc.payment }; }, function () { issuer.set({}); update(); }));
		el.appendChild(h('p', { class: 'ct-help ct-no-print', text: __('Si activas «Guardar en este navegador», solo se recuerdan tus datos de emisor, la forma de pago y el siguiente número. Los datos del cliente no se guardan.') }));
		el.appendChild(h('div', { class: 'ct-doc-form' }, issuer.el, client.el));
		el.appendChild(h('div', { class: 'ct-cols' }, number.el, date.el, due.el));
		el.appendChild(h('h3', { class: 'ct-subtitle', text: __('Líneas') }));
		el.appendChild(table.el);
		if (kind === 'invoice') { el.appendChild(h('div', { class: 'ct-cols' }, irpf.el, h('div', { class: 'ct-field', style: { alignSelf: 'center' } }, re.el))); }
		el.appendChild(h('div', { class: 'ct-cols' }, payment.el, notes.el));
		el.appendChild(summary);
		el.appendChild(actions);
		el.appendChild(picker);
		el.appendChild(h('h3', { class: 'ct-subtitle', text: __('Vista previa') }));
		el.appendChild(preview);
		if (kind === 'invoice') {
			el.appendChild(ui.alert('info', __('Plantilla orientativa. Revisa que la factura incluya los datos obligatorios de tu caso (número correlativo, fechas, NIF y domicilio de ambas partes, desglose de impuestos, menciones especiales si hay exención) y comprueba si estás obligado a usar un programa de facturación que cumpla la normativa vigente o la factura electrónica. HerramientasClave no envía nada a Hacienda ni guarda tus facturas.')));
		}
		update();
	}

	tools.quote = function (el) { docTool(el, 'quote'); };
	tools.invoice = function (el) { docTool(el, 'invoice'); };

	tools.receipt = function (el) {
		var f = {
			number: ui.field({ label: __('Nº de recibo (opcional)'), value: '' }),
			date: ui.field({ label: __('Fecha'), type: 'date', value: today() }),
			place: ui.field({ label: __('Lugar (opcional)'), value: '' }),
			amount: ui.field({ label: __('Importe recibido'), type: 'number', unit: '€', value: '' }),
			payer: ui.field({ label: __('Recibí de (quien paga)'), value: '' }),
			payerNif: ui.field({ label: __('NIF de quien paga (opcional)'), value: '' }),
			receiver: ui.field({ label: __('Quien cobra'), value: '' }),
			receiverNif: ui.field({ label: __('NIF de quien cobra (opcional)'), value: '' }),
			concept: ui.field({ label: __('Concepto'), type: 'textarea', rows: 2, value: '' }),
			method: ui.field({ label: __('Forma de pago'), type: 'select', value: 'efectivo', options: [{ value: 'efectivo', label: __('Efectivo') }, { value: 'transferencia', label: __('Transferencia') }, { value: 'tarjeta', label: __('Tarjeta') }, { value: 'bizum', label: 'Bizum' }, { value: 'otro', label: __('Otro') }] })
		};
		var copies = ui.field({ label: __('Incluir copia para quien cobra (dos recibos por hoja)'), type: 'checkbox', value: true });
		var preview = h('div', { class: 'ct-doc-preview' });
		var build = function () {
			var cents = Math.round(num(f.amount.input.value) * 100);
			var v = function (k) { return f[k].input.value.trim(); };
			var one = function (label) {
				return h('article', { class: 'ct-doc ct-doc--receipt' },
					h('header', { class: 'ct-doc__head' }, h('h2', { class: 'ct-doc__title', text: __('Recibo') + (v('number') ? ' nº ' + v('number') : '') }), h('p', { class: 'ct-doc__amount', text: cents > 0 ? C2(cents) : '—' })),
					label ? h('p', { class: 'ct-doc__label', text: label }) : null,
					h('p', null, __('Recibí de') + ' ', h('strong', { text: v('payer') || '…………………………' }), v('payerNif') ? ' (' + __('NIF') + ' ' + v('payerNif') + ')' : '',
						', ' + __('la cantidad de') + ' ', h('strong', { text: cents > 0 ? amountInWords(cents) : '…………………………' }), cents > 0 ? ' (' + C2(cents) + ')' : '',
						', ' + __('en concepto de') + ' ', h('strong', { text: v('concept') || '…………………………' }), '.'),
					h('p', { text: __('Forma de pago') + ': ' + f.method.input.options[f.method.input.selectedIndex].text }),
					h('p', { text: (v('place') ? v('place') + ', ' : '') + fmtDate(f.date.input.value) }),
					h('div', { class: 'ct-doc__sign' }, h('p', { text: __('Firma de quien cobra') }), h('p', { class: 'ct-doc__name', text: v('receiver') + (v('receiverNif') ? ' · ' + __('NIF') + ' ' + v('receiverNif') : '') })));
			};
			var wrap = h('div', { class: 'ct-doc-stack' }, one(copies.input.checked ? __('Ejemplar para quien paga') : ''));
			if (copies.input.checked) { wrap.appendChild(one(__('Ejemplar para quien cobra'))); }
			return { node: wrap, cents: cents };
		};
		var update = CT.debounce(function () { preview.innerHTML = ''; preview.appendChild(build().node); }, 120);
		Object.keys(f).forEach(function (k) { f[k].input.addEventListener('input', update); f[k].input.addEventListener('change', update); });
		copies.input.addEventListener('change', update);
		el.appendChild(h('div', { class: 'ct-cols' }, f.number.el, f.date.el, f.place.el));
		el.appendChild(h('div', { class: 'ct-cols' }, f.amount.el, f.method.el));
		el.appendChild(h('div', { class: 'ct-cols' }, f.payer.el, f.payerNif.el));
		el.appendChild(h('div', { class: 'ct-cols' }, f.receiver.el, f.receiverNif.el));
		el.appendChild(f.concept.el);
		el.appendChild(copies.el);
		el.appendChild(ui.actions(ui.button(__('Imprimir o guardar como PDF'), { variant: 'primary', icon: 'printer', onClick: function () {
			var b = build();
			if (!(b.cents > 0)) { f.amount.error(__('Indica un importe mayor que 0.')); f.amount.input.focus(); return; }
			f.amount.error('');
			CT.printArea(b.node); CT.track('done');
		} })));
		el.appendChild(h('h3', { class: 'ct-subtitle', text: __('Vista previa') }));
		el.appendChild(preview);
		update();
	};

	/** Conversor de listas de productos: precios con o sin IVA, subidas, redondeos y formatos. */
	tools.products = function (el) {
		var input = ui.field({ label: __('Pega tu lista (CSV, columnas de Excel o «nombre; precio» por línea)'), type: 'textarea', rows: 8, mono: true, placeholder: 'Producto;Precio\nCamiseta básica;12,50\nTaza cerámica;8,90' });
		var drop = ui.dropzone({ accept: '.csv,.tsv,.txt,text/csv,text/plain', compact: true, title: __('O arrastra un archivo CSV o TXT'), maxMb: 5, onFiles: function (files) { CT.readFile(files[0], 'text').then(function (t) { input.input.value = t; parse(); }).catch(function (err) { CT.toast(err.message, 'error'); }); } });
		var header = ui.field({ label: __('La primera fila son encabezados'), type: 'checkbox', value: true });
		var nameCol = ui.field({ label: __('Columna del nombre'), type: 'select', options: [] });
		var priceCol = ui.field({ label: __('Columna del precio'), type: 'select', options: [] });
		var op = ui.field({ label: __('Operación sobre el precio'), type: 'select', value: 'none', options: [
			{ value: 'none', label: __('Ninguna') }, { value: 'addvat', label: __('Añadir IVA') }, { value: 'rmvat', label: __('Quitar IVA') },
			{ value: 'up', label: __('Subir un porcentaje') }, { value: 'down', label: __('Bajar un porcentaje') }] });
		var pct = ui.field({ label: __('Porcentaje'), type: 'number', unit: '%', value: 21 });
		var rounding = ui.field({ label: __('Redondeo'), type: 'select', value: 'c', options: [
			{ value: 'c', label: __('Al céntimo') }, { value: '99', label: __('Terminar en ,99') }, { value: '95', label: __('Terminar en ,95') },
			{ value: '50', label: __('Al 0,50 más cercano') }, { value: 'int', label: __('Al euro más cercano') }] });
		var format = ui.field({ label: __('Formato de salida'), type: 'select', value: 'csv', options: [
			{ value: 'csv', label: 'CSV (;)' }, { value: 'csvc', label: 'CSV (,)' }, { value: 'json', label: 'JSON' }, { value: 'md', label: 'Markdown' },
			{ value: 'html', label: __('Tabla HTML') }, { value: 'list', label: __('Lista de texto') }] });
		var out = ui.output({ label: __('Resultado'), rows: 10, mono: true, readonly: true, filename: function () { var f = format.input.value; return 'productos.' + ({ csv: 'csv', csvc: 'csv', json: 'json', md: 'md', html: 'html', list: 'txt' }[f]); } });
		var info = h('div');
		var rows = [], heads = [];

		var setOptions = function (sel, list, pref) {
			var cur = sel.input.value;
			sel.input.innerHTML = '';
			list.forEach(function (lbl, i) { sel.input.appendChild(h('option', { value: String(i), text: lbl })); });
			sel.input.value = cur && +cur < list.length ? cur : String(pref);
		};
		var parse = function () {
			var txt = input.input.value;
			rows = []; heads = [];
			if (!txt.trim()) { info.innerHTML = ''; out.set(''); return; }
			try { rows = CT.csv.parse(txt).rows; } catch (e) { info.innerHTML = ''; info.appendChild(ui.alert('err', e.message)); return; }
			var width = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 0);
			if (header.input.checked && rows.length) { heads = rows.shift(); }
			var labels = [];
			for (var i = 0; i < width; i++) { labels.push((heads[i] || '').trim() || CT.sprintf(__('Columna %d'), i + 1)); }
			// Elige como precio la primera columna que parece numérica.
			var guess = labels.findIndex(function (l, i) { return rows.length && rows.slice(0, 20).every(function (r) { return r[i] === undefined || r[i].trim() === '' || isFinite(CT.parseNum(String(r[i]).replace(/[€$\s]/g, ''))); }); });
			setOptions(nameCol, labels, guess === 0 && width > 1 ? 1 : 0);
			setOptions(priceCol, labels, guess >= 0 ? guess : Math.min(1, width - 1));
			convert();
		};
		var roundPrice = function (v) {
			var c = Math.round(v * 100);
			switch (rounding.input.value) {
				case '99': return c <= 0 ? 0 : (Math.ceil((c + 1) / 100) * 100 - 1) / 100;
				case '95': return c <= 0 ? 0 : (Math.ceil((c + 5) / 100) * 100 - 5) / 100;
				case '50': return Math.round(c / 50) * 50 / 100;
				case 'int': return Math.round(c / 100);
				default: return c / 100;
			}
		};
		var convert = function () {
			info.innerHTML = '';
			if (!rows.length) { out.set(''); return; }
			var ni = +nameCol.input.value, pi = +priceCol.input.value, p = num(pct.input.value), mode = op.input.value;
			pct.el.hidden = mode === 'none';
			var bad = 0;
			var items = rows.map(function (r) {
				var raw = String(r[pi] === undefined ? '' : r[pi]).replace(/[€$\s]/g, '');
				var v = CT.parseNum(raw);
				if (!isFinite(v)) { bad++; return { name: String(r[ni] || '').trim(), price: null, before: raw }; }
				var nv = v;
				if (mode === 'addvat' || mode === 'up') { nv = v * (1 + p / 100); }
				else if (mode === 'rmvat') { nv = v / (1 + p / 100); }
				else if (mode === 'down') { nv = v * (1 - p / 100); }
				return { name: String(r[ni] || '').trim(), price: roundPrice(nv), before: v };
			});
			var priceTxt = function (x) { return x.price === null ? '' : x.price.toFixed(2).replace('.', ','); };
			var label = heads[pi] && heads[pi].trim() ? heads[pi].trim() : __('Precio');
			var nameLabel = heads[ni] && heads[ni].trim() ? heads[ni].trim() : __('Producto');
			var res;
			switch (format.input.value) {
				case 'csv': res = CT.csv.stringify([[nameLabel, label]].concat(items.map(function (x) { return [x.name, priceTxt(x)]; })), ';'); break;
				case 'csvc': res = CT.csv.stringify([[nameLabel, label]].concat(items.map(function (x) { return [x.name, x.price === null ? '' : x.price.toFixed(2)]; })), ','); break;
				case 'json': res = JSON.stringify(items.map(function (x) { return { name: x.name, price: x.price }; }), null, 2); break;
				case 'md': res = '| ' + nameLabel.replace(/\|/g, '\\|') + ' | ' + label.replace(/\|/g, '\\|') + ' |\n| --- | ---: |\n' + items.map(function (x) { return '| ' + x.name.replace(/\|/g, '\\|') + ' | ' + (x.price === null ? '' : M(x.price)) + ' |'; }).join('\n'); break;
				case 'html': res = '<table>\n  <thead><tr><th>' + CT.escape(nameLabel) + '</th><th>' + CT.escape(label) + '</th></tr></thead>\n  <tbody>\n' + items.map(function (x) { return '    <tr><td>' + CT.escape(x.name) + '</td><td>' + (x.price === null ? '' : CT.escape(M(x.price))) + '</td></tr>'; }).join('\n') + '\n  </tbody>\n</table>'; break;
				default: res = items.map(function (x) { return x.name + ' — ' + (x.price === null ? '?' : M(x.price)); }).join('\n');
			}
			out.set(res);
			var withPrice = items.filter(function (x) { return x.price !== null; });
			var sum = withPrice.reduce(function (a, x) { return a + Math.round(x.price * 100); }, 0);
			info.appendChild(ui.resultCard({ label: __('Productos convertidos'), main: N(items.length), stats: [[__('Precio medio'), withPrice.length ? C2(Math.round(sum / withPrice.length)) : '—'], [__('Sin precio válido'), N(bad)]] }));
			if (bad) { info.appendChild(ui.alert('warn', CT.sprintf(__('%d filas no tienen un precio numérico en la columna elegida y se han dejado vacías.'), bad))); }
			CT.track('done');
		};
		input.input.addEventListener('input', CT.debounce(parse, 250));
		header.input.addEventListener('change', parse);
		[nameCol, priceCol, op, pct, rounding, format].forEach(function (x) { x.input.addEventListener('input', convert); x.input.addEventListener('change', convert); });
		el.appendChild(input.el);
		el.appendChild(drop.el);
		el.appendChild(header.el);
		el.appendChild(h('div', { class: 'ct-cols' }, nameCol.el, priceCol.el));
		el.appendChild(h('div', { class: 'ct-cols' }, op.el, pct.el, rounding.el, format.el));
		el.appendChild(info);
		el.appendChild(out.el);
		pct.el.hidden = true;
	};

	CT.register('biz', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
