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
	var V = function () { return CT.validate; };

	var KIND = {
		invoice: { title: __('Factura'), number: __('Nº de factura'), due: __('Vencimiento'), prefix: 'F', file: 'factura' },
		quote: { title: __('Presupuesto'), number: __('Nº de presupuesto'), due: __('Válido hasta'), prefix: 'P', file: 'presupuesto' },
		delivery: { title: __('Albarán'), number: __('Nº de albarán'), due: '', prefix: 'A', file: 'albaran' }
	};

	var LEGAL_FORMS = ['', 'S.L.', 'S.L.U.', 'S.A.', 'S.A.U.', 'S.L.L.', 'S.L.P.', 'S.Coop.', 'S.C.', 'C.B.'];
	var REGISTERS = [
		{ value: 'mercantil', label: __('Registro Mercantil') },
		{ value: 'cooperativas', label: __('Registro de Cooperativas') },
		{ value: 'otro', label: __('Otro registro') }
	];

	/** Menciones especiales de una factura (Real Decreto 1619/2012, art. 6). */
	var MENTIONS = {
		none: { label: __('Ninguna') },
		exenta: { label: __('Operación exenta de IVA'), text: function (ref) { return CT.sprintf(__('Operación exenta de IVA conforme al %s.'), ref || __('artículo 20 de la Ley 37/1992, del Impuesto sobre el Valor Añadido')); }, noVat: true, needsRef: true },
		isp: { label: __('Inversión del sujeto pasivo'), text: function () { return __('Inversión del sujeto pasivo.'); }, noVat: true },
		intracom: { label: __('Entrega intracomunitaria exenta'), text: function () { return __('Entrega intracomunitaria exenta del IVA (artículo 25 de la Ley 37/1992, del Impuesto sobre el Valor Añadido).'); }, noVat: true },
		caja: { label: __('Régimen especial del criterio de caja'), text: function () { return __('Régimen especial del criterio de caja.'); } },
		destinatario: { label: __('Facturación por el destinatario'), text: function () { return __('Facturación por el destinatario.'); } },
		otra: { label: __('Otra (texto libre)'), text: function (ref) { return ref || ''; }, needsRef: true }
	};

	/** Línea registral de una sociedad (Reglamento del Registro Mercantil, art. 24). */
	function registryLine(issuer) {
		if (issuer.type !== 'empresa') { return ''; }
		var r = issuer.register || {};
		var parts = [];
		var reg = r.name === 'cooperativas' ? __('Registro de Cooperativas') : r.name === 'otro' ? (r.other || __('el registro correspondiente')) : __('Registro Mercantil');
		var where = r.place ? reg + ' ' + __('de') + ' ' + r.place : reg;
		[[__('Tomo'), r.tomo], [__('Libro'), r.libro], [__('Folio'), r.folio], [__('Sección'), r.seccion], [__('Hoja'), r.hoja], [__('Inscripción'), r.inscripcion]].forEach(function (x) { if (x[1]) { parts.push(x[0] + ' ' + x[1]); } });
		var line = '';
		if (r.place || parts.length) { line = CT.sprintf(__('Inscrita en el %s'), where) + (parts.length ? ', ' + parts.join(', ') : '') + '.'; }
		if (issuer.capital) { line += (line ? ' ' : '') + __('Capital social:') + ' ' + M(num(issuer.capital)) + '.'; }
		return line;
	}

	/** Cláusula informativa de protección de datos (RGPD y LOPDGDD) para el pie del documento. */
	function defaultRgpd(issuer) {
		var who = [issuer.name, issuer.legalForm].filter(Boolean).join(', ') || __('El emisor');
		var where = issuer.contact || issuer.addr || __('la dirección indicada en este documento');
		return CT.sprintf(__('Protección de datos: %1$s es responsable del tratamiento de los datos personales que figuran en este documento. Se tratan para gestionar la relación comercial y cumplir las obligaciones legales, fiscales y contables, sobre la base de la ejecución del contrato y del cumplimiento de obligaciones legales (art. 6.1.b y 6.1.c del Reglamento (UE) 2016/679, RGPD). Se conservarán durante los plazos legalmente exigidos y no se cederán a terceros salvo obligación legal. Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a %2$s, y presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).'), who, where.replace(/\n/g, ', '));
	}

	/** Textos del pie legal (se repiten en cada página del PDF). */
	function legalFooter(doc) {
		var out = [];
		var reg = registryLine(doc.issuer);
		var idLine = [doc.issuer.name + (doc.issuer.legalForm && doc.issuer.name.indexOf(doc.issuer.legalForm) < 0 ? ', ' + doc.issuer.legalForm : ''), doc.issuer.nif ? __('NIF') + ' ' + doc.issuer.nif : ''].filter(Boolean).join(' · ');
		if (doc.issuer.type === 'empresa' && (reg || idLine)) { out.push([idLine, reg].filter(Boolean).join('. ').replace(/\.\./g, '.')); }
		if (doc.rgpd) { out.push(doc.rgpdText || defaultRgpd(doc.issuer)); }
		return out;
	}

	function mentionText(doc) {
		var m = MENTIONS[doc.mention];
		return doc.kind === 'invoice' && m && m.text ? m.text(doc.mentionRef) : '';
	}

	var withPrices = function (doc) { return doc.kind !== 'delivery' || doc.showPrices; };

	/** Vista HTML del documento (también se usa para imprimir). */
	function renderDoc(doc, t) {
		var k = KIND[doc.kind];
		var rect = doc.kind === 'invoice' && doc.invType === 'rectificativa';
		var party = function (label, p, isIssuer) {
			return h('div', { class: 'ct-doc__party' }, h('p', { class: 'ct-doc__label', text: label }),
				h('p', { class: 'ct-doc__name', text: [p.name || '—', isIssuer && p.legalForm && (p.name || '').indexOf(p.legalForm) < 0 ? p.legalForm : ''].filter(Boolean).join(', ') }),
				isIssuer && p.trade ? h('p', { text: __('Nombre comercial') + ': ' + p.trade }) : null,
				p.nif ? h('p', { text: __('NIF') + ': ' + p.nif }) : null,
				p.addr ? h('p', { class: 'ct-doc__pre', text: p.addr }) : null,
				p.contact ? h('p', { text: p.contact }) : null);
		};
		var meta = [[k.number, doc.number || '—'], [__('Fecha de expedición'), fmtDate(doc.date)]];
		if (doc.opDate && doc.opDate !== doc.date && doc.kind === 'invoice') { meta.push([__('Fecha de la operación'), fmtDate(doc.opDate)]); }
		if (doc.due && k.due) { meta.push([k.due, fmtDate(doc.due)]); }
		var priced = withPrices(doc);
		var heads = priced ? [__('Concepto'), __('Cant.'), __('Precio'), __('Dto.'), __('IVA'), __('Importe')] : [__('Concepto'), __('Cantidad')];
		var rows = t.lines.map(function (l) {
			return priced
				? h('tr', null, h('td', { text: l.desc }), h('td', { class: 'num', text: N(l.qty, 3) }), h('td', { class: 'num', text: M(l.price) }),
					h('td', { class: 'num', text: l.disc ? CT.fmt.percent(l.disc) : '—' }), h('td', { class: 'num', text: l.vat + ' %' }), h('td', { class: 'num', text: C2(l.net) }))
				: h('tr', null, h('td', { text: l.desc }), h('td', { class: 'num', text: N(l.qty, 3) }));
		});
		var sumRows = [[__('Base imponible'), C2(t.base)]];
		t.taxes.forEach(function (x) {
			sumRows.push([CT.sprintf(__('IVA %s %% sobre %s'), N(x.rate, 2), C2(x.base)), C2(x.vat)]);
			if (doc.re && x.re) { sumRows.push([CT.sprintf(__('Recargo de equivalencia %s %%'), N(x.reRate, 2)), C2(x.re)]); }
		});
		if (t.irpf) { sumRows.push([CT.sprintf(__('Retención IRPF %s %%'), N(num(doc.irpf), 2)), '−' + C2(t.irpf)]); }
		var brand = doc.issuer.logo
			? h('img', { class: 'ct-doc__logo', src: doc.issuer.logo, alt: CT.sprintf(__('Logotipo de %s'), doc.issuer.trade || doc.issuer.name || __('el emisor')) })
			: h('p', { class: 'ct-doc__brand', text: doc.issuer.trade || doc.issuer.name || '' });
		var mention = mentionText(doc);
		var footer = legalFooter(doc);
		return h('article', { class: 'ct-doc', 'aria-label': __('Vista previa del documento') },
			h('header', { class: 'ct-doc__head' },
				h('div', { class: 'ct-doc__brandbox' }, brand),
				h('div', { class: 'ct-doc__headright' },
					h('h2', { class: 'ct-doc__title', text: rect ? __('Factura rectificativa') : k.title }),
					h('dl', { class: 'ct-doc__meta' }, meta.map(function (m) { return [h('dt', { text: m[0] }), h('dd', { text: m[1] })]; })))),
			rect ? h('div', { class: 'ct-doc__box' }, h('p', null, h('strong', { text: __('Rectifica la factura') + ' ' + (doc.rect.number || '—') }), doc.rect.date ? ' ' + __('de fecha') + ' ' + fmtDate(doc.rect.date) : ''), doc.rect.reason ? h('p', { text: __('Motivo') + ': ' + doc.rect.reason }) : null) : null,
			h('div', { class: 'ct-doc__parties' }, party(__('Emisor'), doc.issuer, true), party(__('Cliente'), doc.client)),
			h('div', { class: 'ct-table-wrap' }, h('table', { class: 'ct-table ct-doc__lines' },
				h('thead', null, h('tr', null, heads.map(function (x, i) { return h('th', { scope: 'col', class: i ? 'num' : null, text: x }); }))),
				h('tbody', null, rows.length ? rows : h('tr', null, h('td', { colspan: String(heads.length), text: __('Añade al menos una línea.') }))))),
			priced ? h('table', { class: 'ct-doc__totals' }, h('tbody', null, sumRows.map(function (r) { return h('tr', null, h('th', { scope: 'row', text: r[0] }), h('td', { class: 'num', text: r[1] })); }),
				h('tr', { class: 'ct-doc__total' }, h('th', { scope: 'row', text: __('Total') }), h('td', { class: 'num', text: C2(t.total) })))) : null,
			mention ? h('p', { class: 'ct-doc__mention', text: mention }) : null,
			doc.payment || doc.iban ? h('div', { class: 'ct-doc__notes' }, h('p', { class: 'ct-doc__label', text: __('Forma de pago') }), doc.payment ? h('p', { class: 'ct-doc__pre', text: doc.payment }) : null, doc.iban ? h('p', { text: 'IBAN: ' + doc.iban }) : null) : null,
			doc.notes ? h('div', { class: 'ct-doc__notes' }, h('p', { class: 'ct-doc__label', text: __('Observaciones') }), h('p', { class: 'ct-doc__pre', text: doc.notes })) : null,
			doc.kind === 'delivery' ? h('div', { class: 'ct-doc__signs' },
				h('div', { class: 'ct-doc__sign' }, h('p', { text: __('Entregado por') })),
				h('div', { class: 'ct-doc__sign' }, h('p', { text: __('Recibí conforme (nombre, DNI y fecha)') }))) : null,
			footer.length ? h('footer', { class: 'ct-doc__legal' }, footer.map(function (f) { return h('p', { text: f }); })) : null
		);
	}

	/** Texto compatible con las fuentes estándar de PDF (WinAnsi). */
	function pdfSafe(s) {
		return String(s || '').replace(/[   ]/g, ' ').replace(/[−]/g, '-').replace(/[^\x20-\x7E¡-ÿ€\n•–—‘’“”…]/g, '?');
	}

	function dataUrlBytes(url) {
		var bin = atob(url.split(',')[1] || '');
		var out = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
		return out;
	}

	/** Genera un PDF A4 del documento con pdf-lib (texto seleccionable). */
	function buildPdf(doc, t) {
		var k = KIND[doc.kind];
		var rect = doc.kind === 'invoice' && doc.invType === 'rectificativa';
		var priced = withPrices(doc);
		return CT.loadVendor('pdflib').then(function () {
			var L = window.PDFLib;
			return L.PDFDocument.create().then(function (pdf) {
				var logoP = doc.issuer.logo ? pdf.embedPng(dataUrlBytes(doc.issuer.logo)).catch(function () { return null; }) : Promise.resolve(null);
				return Promise.all([pdf.embedFont(L.StandardFonts.Helvetica), pdf.embedFont(L.StandardFonts.HelveticaBold), logoP]).then(function (res) {
					var F = res[0], B = res[1], logo = res[2];
					var W = 595.28, H = 841.89, MG = 48;
					var page, y;
					var ink = L.rgb(0.1, 0.1, 0.15), soft = L.rgb(0.42, 0.42, 0.5), line = L.rgb(0.85, 0.85, 0.9), accent = L.rgb(0.36, 0.25, 0.85);
					var wrap = function (s, size, font, maxW) {
						var out = [];
						font = font || F;
						pdfSafe(s).split('\n').forEach(function (para) {
							var cur = '';
							para.split(/\s+/).forEach(function (w) {
								var test = cur ? cur + ' ' + w : w;
								if (font.widthOfTextAtSize(test, size) > maxW && cur) { out.push(cur); cur = w; }
								else { cur = test; }
								while (font.widthOfTextAtSize(cur, size) > maxW && cur.length > 1) {
									var c = cur.length;
									while (c > 1 && font.widthOfTextAtSize(cur.slice(0, c), size) > maxW) { c--; }
									out.push(cur.slice(0, c)); cur = cur.slice(c);
								}
							});
							out.push(cur);
						});
						return out;
					};
					// Pie legal: se reserva su altura en todas las páginas.
					var footerBlocks = legalFooter(doc).map(function (s) { return wrap(s, 7, F, W - MG * 2); });
					var footerH = footerBlocks.reduce(function (a, b) { return a + b.length * 9 + 4; }, 0) + (footerBlocks.length ? 10 : 0);
					var bottom = MG + 14 + footerH;
					var newPage = function () { page = pdf.addPage([W, H]); y = H - MG; };
					var text = function (s, x, size, font, color, opts) {
						s = pdfSafe(s);
						var w = (font || F).widthOfTextAtSize(s, size);
						page.drawText(s, { x: opts && opts.right ? x - w : x, y: y, size: size, font: font || F, color: color || ink });
						return w;
					};
					var ensure = function (need) { if (y - need < bottom) { newPage(); return true; } return false; };
					newPage();

					// Cabecera: logotipo (o nombre) a la izquierda; título y datos del documento a la derecha.
					var top = y, leftBottom = y;
					if (logo) {
						var sc = Math.min(160 / logo.width, 64 / logo.height, 1);
						var lw = logo.width * sc, lh = logo.height * sc;
						page.drawImage(logo, { x: MG, y: top - lh + 10, width: lw, height: lh });
						leftBottom = top - lh + 10;
					} else if (doc.issuer.trade || doc.issuer.name) {
						wrap(doc.issuer.trade || doc.issuer.name, 15, B, 240).slice(0, 2).forEach(function (s) { text(s, MG, 15, B, ink); y -= 18; });
						leftBottom = y + 8; y = top;
					}
					text(rect ? __('Factura rectificativa') : k.title, W - MG, rect ? 18 : 22, B, accent, { right: true });
					y -= 22;
					var meta = [[k.number, doc.number || '—'], [__('Fecha de expedición'), fmtDate(doc.date)]];
					if (doc.opDate && doc.opDate !== doc.date && doc.kind === 'invoice') { meta.push([__('Fecha de la operación'), fmtDate(doc.opDate)]); }
					if (doc.due && k.due) { meta.push([k.due, fmtDate(doc.due)]); }
					meta.forEach(function (m) { var vw = text(m[1], W - MG, 9.5, B, ink, { right: true }); text(m[0] + ':', W - MG - vw - 6, 9.5, F, soft, { right: true }); y -= 14; });
					y = Math.min(y, leftBottom) - 18;

					if (rect) {
						var rl = [__('Rectifica la factura') + ' ' + (doc.rect.number || '—') + (doc.rect.date ? ' ' + __('de fecha') + ' ' + fmtDate(doc.rect.date) : '')];
						if (doc.rect.reason) { rl = rl.concat(wrap(__('Motivo') + ': ' + doc.rect.reason, 9, F, W - MG * 2 - 16)); }
						var bh = rl.length * 12 + 10;
						page.drawRectangle({ x: MG, y: y - bh + 10, width: W - MG * 2, height: bh, borderColor: accent, borderWidth: 0.8 });
						rl.forEach(function (s, i) { text(s, MG + 8, 9, i ? F : B); y -= 12; });
						y -= 14;
					}

					var colW = (W - MG * 2 - 20) / 2;
					var partyLines = function (p, isIssuer) {
						var nm = [p.name || '—', isIssuer && p.legalForm && (p.name || '').indexOf(p.legalForm) < 0 ? p.legalForm : ''].filter(Boolean).join(', ');
						var l = wrap(nm, 9.5, B, colW).map(function (s) { return [s, B]; });
						if (isIssuer && p.trade) { l.push([__('Nombre comercial') + ': ' + p.trade, F]); }
						if (p.nif) { l.push([__('NIF') + ': ' + p.nif, F]); }
						wrap(p.addr || '', 9.5, F, colW).forEach(function (s) { if (s) { l.push([s, F]); } });
						if (p.contact) { wrap(p.contact, 9.5, F, colW).forEach(function (s) { l.push([s, F]); }); }
						return l;
					};
					var a = partyLines(doc.issuer, true), b = partyLines(doc.client), ptop = y;
					text(__('Emisor').toUpperCase(), MG, 8, B, soft); text(__('Cliente').toUpperCase(), MG + colW + 20, 8, B, soft);
					y -= 14;
					for (var i = 0; i < Math.max(a.length, b.length); i++) {
						if (a[i]) { text(a[i][0], MG, 9.5, a[i][1]); }
						if (b[i]) { text(b[i][0], MG + colW + 20, 9.5, b[i][1]); }
						y -= 13;
					}
					y = Math.min(y, ptop - 40) - 16;

					var cols = priced ? [MG, W - MG - 250, W - MG - 175, W - MG - 120, W - MG - 70, W - MG] : [MG, W - MG];
					var head = function () {
						page.drawRectangle({ x: MG, y: y - 5, width: W - MG * 2, height: 18, color: L.rgb(0.95, 0.94, 1) });
						text(__('Concepto'), MG + 4, 8.5, B, soft);
						if (priced) {
							[__('Cant.'), __('Precio'), __('Dto.'), __('IVA'), __('Importe')].forEach(function (lbl, j) { text(lbl, cols[j + 1] - (j === 4 ? 4 : 0), 8.5, B, soft, { right: true }); });
						} else {
							text(__('Cantidad'), W - MG - 4, 8.5, B, soft, { right: true });
						}
						y -= 20;
					};
					head();
					t.lines.forEach(function (l) {
						var dl = wrap(l.desc || '—', 9.5, F, (priced ? cols[1] - MG - 60 : W - MG * 2 - 90));
						if (ensure(dl.length * 12 + 8)) { head(); }
						var startY = y;
						dl.forEach(function (s, j) { text(s, MG + 4, 9.5); if (j < dl.length - 1) { y -= 12; } });
						var endY = y; y = startY;
						if (priced) {
							text(N(l.qty, 3), cols[1], 9.5, F, ink, { right: true });
							text(M(l.price), cols[2], 9.5, F, ink, { right: true });
							text(l.disc ? CT.fmt.percent(l.disc) : '—', cols[3], 9.5, F, ink, { right: true });
							text(l.vat + ' %', cols[4], 9.5, F, ink, { right: true });
							text(C2(l.net), cols[5] - 4, 9.5, F, ink, { right: true });
						} else {
							text(N(l.qty, 3), W - MG - 4, 9.5, F, ink, { right: true });
						}
						y = endY - 8;
						page.drawLine({ start: { x: MG, y: y + 3 }, end: { x: W - MG, y: y + 3 }, thickness: 0.5, color: line });
						y -= 8;
					});
					if (priced) {
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
					} else {
						y -= 10;
					}
					var mention = mentionText(doc);
					if (mention) {
						var ml = wrap(mention, 9.5, B, W - MG * 2);
						ensure(ml.length * 12 + 10);
						ml.forEach(function (s) { text(s, MG, 9.5, B); y -= 12; });
						y -= 10;
					}
					var pay = [doc.payment, doc.iban ? 'IBAN: ' + doc.iban : ''].filter(Boolean).join('\n');
					[[__('Forma de pago'), pay], [__('Observaciones'), doc.notes]].forEach(function (blk) {
						if (!blk[1]) { return; }
						var ls = wrap(blk[1], 9.5, F, W - MG * 2);
						ensure(20 + Math.min(ls.length, 3) * 12);
						text(blk[0].toUpperCase(), MG, 8, B, soft); y -= 13;
						ls.forEach(function (s) { ensure(12); text(s, MG, 9.5); y -= 12; });
						y -= 10;
					});
					if (doc.kind === 'delivery') {
						ensure(80);
						y -= 40;
						var sw = (W - MG * 2 - 40) / 2;
						[[MG, __('Entregado por')], [MG + sw + 40, __('Recibí conforme (nombre, DNI y fecha)')]].forEach(function (s) {
							page.drawLine({ start: { x: s[0], y: y }, end: { x: s[0] + sw, y: y }, thickness: 0.8, color: soft });
							page.drawText(pdfSafe(s[1]), { x: s[0], y: y - 12, size: 8.5, font: F, color: soft });
						});
					}
					var pages = pdf.getPages();
					pages.forEach(function (p, n) {
						var fy = MG - 10 + footerH;
						if (footerBlocks.length) {
							p.drawLine({ start: { x: MG, y: fy + 4 }, end: { x: W - MG, y: fy + 4 }, thickness: 0.5, color: line });
							fy -= 8;
							footerBlocks.forEach(function (blk) { blk.forEach(function (s) { p.drawText(s, { x: MG, y: fy, size: 7, font: F, color: soft }); fy -= 9; }); fy -= 4; });
						}
						if (pages.length > 1) { var s = pdfSafe(CT.sprintf(__('Página %d de %d'), n + 1, pages.length)); p.drawText(s, { x: W - MG - F.widthOfTextAtSize(s, 8), y: 24, size: 8, font: F, color: soft }); }
					});
					pdf.setTitle(pdfSafe((rect ? __('Factura rectificativa') : k.title) + ' ' + (doc.number || '')));
					if (doc.issuer.name) { pdf.setAuthor(pdfSafe(doc.issuer.name)); }
					pdf.setCreator('HerramientasClave');
					pdf.setProducer('HerramientasClave (pdf-lib)');
					return pdf.save();
				});
			});
		});
	}

	function partyFields(title, p, onInput, opts) {
		opts = opts || {};
		var f = {
			name: ui.field({ label: opts.issuer ? __('Nombre y apellidos o razón social') : __('Nombre o razón social'), value: p.name || '', autocomplete: 'organization', onInput: onInput }),
			nif: ui.field({ label: __('NIF / NIE / CIF'), value: p.nif || '', onInput: onInput }),
			addr: ui.field({ label: __('Domicilio (calle, número, código postal y población)'), type: 'textarea', rows: 2, value: p.addr || '', onInput: onInput }),
			contact: ui.field({ label: __('Email o teléfono (opcional)'), value: p.contact || '', onInput: onInput })
		};
		if (opts.issuer) { f.trade = ui.field({ label: __('Nombre comercial (opcional)'), value: p.trade || '', onInput: onInput }); }
		var read = function () { var o = {}; Object.keys(f).forEach(function (key) { o[key] = f[key].input.value.trim(); }); return o; };
		var set = function (v) { v = v || {}; Object.keys(f).forEach(function (key) { f[key].input.value = v[key] || ''; }); };
		var el = h('fieldset', { class: 'ct-fieldset ct-doc-form__party' }, h('legend', { text: title }), opts.before || null, h('div', { class: 'ct-cols' }, f.name.el, f.nif.el), f.trade ? f.trade.el : null, f.addr.el, f.contact.el, opts.after || null);
		return { el: el, read: read, set: set, fields: f };
	}

	/** Reduce el logotipo a PNG de como máximo 600×240 px para que el PDF y el guardado local sean ligeros. */
	function prepareLogo(file) {
		return CT.loadImage(file).then(function (im) {
			var sc = Math.min(600 / im.width, 240 / im.height, 1);
			var c = document.createElement('canvas');
			c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
			c.getContext('2d').drawImage(im.img, 0, 0, c.width, c.height);
			URL.revokeObjectURL(im.url);
			return c.toDataURL('image/png');
		});
	}

	/** Editor común de presupuestos, facturas y albaranes. */
	function docTool(el, kind) {
		var k = KIND[kind];
		var issuerStore = CT.persist('biz-issuer', false);
		var saved = issuerStore.load(null) || {};
		var doc = {
			kind: kind,
			issuer: Object.assign({ type: 'autonomo', register: {} }, saved.issuer || {}), client: {},
			number: saved[kind + 'Next'] || (k.prefix + new Date().getFullYear() + '-001'),
			date: today(), opDate: '', due: kind === 'delivery' ? '' : addDays(today(), kind === 'invoice' ? 30 : 15),
			invType: 'ordinaria', rect: {},
			lines: [{ desc: '', qty: '1', price: '', disc: '0', vat: '21' }],
			irpf: '0', re: false, mention: 'none', mentionRef: '',
			payment: saved.payment || '', iban: saved.iban || '', notes: '',
			rgpd: saved.rgpd !== undefined ? !!saved.rgpd : (saved.issuer && saved.issuer.type === 'empresa'),
			rgpdText: saved.rgpdText || '', showPrices: false
		};
		doc.issuer.register = doc.issuer.register || {};
		var preview = h('div', { class: 'ct-doc-preview' });
		var summary = h('div');
		var update;
		var changed = function () { update(); };

		// Emisor: tipo, logotipo y datos registrales.
		var type = ui.seg({ label: __('Tipo de emisor'), value: doc.issuer.type, options: [{ value: 'autonomo', label: __('Autónomo o particular') }, { value: 'empresa', label: __('Empresa (sociedad)') }], onChange: function () { toggleType(); changed(); } });
		var logoImg = h('img', { class: 'ct-doc-form__logo', alt: '' });
		var logoInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', hidden: true });
		var logoRemove = ui.button(__('Quitar logotipo'), { icon: 'trash-2', size: 'sm', variant: 'ghost', onClick: function () { doc.issuer.logo = ''; drawLogo(); changed(); } });
		var drawLogo = function () { logoImg.hidden = !doc.issuer.logo; logoRemove.hidden = !doc.issuer.logo; if (doc.issuer.logo) { logoImg.src = doc.issuer.logo; } else { logoImg.removeAttribute('src'); } };
		logoInput.addEventListener('change', function () {
			var file = logoInput.files[0]; logoInput.value = '';
			if (!file) { return; }
			if (file.size > 5 * 1024 * 1024) { CT.toast(__('El logotipo debe ocupar menos de 5 MB.'), 'error'); return; }
			prepareLogo(file).then(function (url) { doc.issuer.logo = url; drawLogo(); changed(); }).catch(function (e) { CT.toast(e.message, 'error'); });
		});
		var logoBox = h('div', { class: 'ct-field ct-doc-form__logobox' }, h('p', { class: 'ct-label', text: __('Logotipo (opcional)') }),
			h('div', { class: 'ct-row', style: { alignItems: 'center' } }, logoImg, ui.button(__('Subir logotipo'), { icon: 'image', size: 'sm', onClick: function () { logoInput.click(); } }), logoRemove),
			h('p', { class: 'ct-help', text: __('PNG, JPG, WebP o SVG. Aparece arriba a la izquierda del documento.') }), logoInput);

		var reg = doc.issuer.register;
		var rf = {
			legalForm: ui.field({ label: __('Forma jurídica'), type: 'select', value: doc.issuer.legalForm || '', options: LEGAL_FORMS.map(function (v) { return { value: v, label: v || __('— Elige —') }; }), onInput: changed }),
			regName: ui.field({ label: __('Registro'), type: 'select', value: reg.name || 'mercantil', options: REGISTERS, onInput: changed }),
			regOther: ui.field({ label: __('Nombre del registro'), value: reg.other || '', onInput: changed }),
			place: ui.field({ label: __('Provincia o lugar del registro'), value: reg.place || '', placeholder: __('Por ejemplo: Barcelona'), onInput: changed }),
			tomo: ui.field({ label: __('Tomo'), value: reg.tomo || '', onInput: changed }),
			libro: ui.field({ label: __('Libro (si consta)'), value: reg.libro || '', onInput: changed }),
			folio: ui.field({ label: __('Folio'), value: reg.folio || '', onInput: changed }),
			seccion: ui.field({ label: __('Sección (si consta)'), value: reg.seccion || '', onInput: changed }),
			hoja: ui.field({ label: __('Hoja'), value: reg.hoja || '', placeholder: 'B-123456', onInput: changed }),
			inscripcion: ui.field({ label: __('Inscripción'), value: reg.inscripcion || '', placeholder: '1.ª', onInput: changed }),
			capital: ui.field({ label: __('Capital social (opcional)'), type: 'number', unit: '€', value: doc.issuer.capital || '', onInput: changed })
		};
		var regBox = h('fieldset', { class: 'ct-fieldset ct-doc-form__registry' }, h('legend', { text: __('Datos registrales de la sociedad') }),
			h('p', { class: 'ct-help', text: __('Las sociedades inscritas deben indicar sus datos de inscripción en facturas y demás documentación (Reglamento del Registro Mercantil, art. 24). Los encontrarás en la escritura o en una nota simple del registro.') }),
			h('div', { class: 'ct-cols' }, rf.legalForm.el, rf.regName.el, rf.regOther.el, rf.place.el),
			h('div', { class: 'ct-cols' }, rf.tomo.el, rf.libro.el, rf.folio.el, rf.seccion.el, rf.hoja.el, rf.inscripcion.el),
			h('div', { class: 'ct-cols' }, rf.capital.el));
		var issuer = partyFields(__('Tus datos (emisor)'), doc.issuer, changed, { issuer: true, before: type.el, after: h('div', null, logoBox, regBox) });
		var toggleType = function () { var emp = type.get() === 'empresa'; regBox.hidden = !emp; rgpd.input.checked = rgpdTouched ? rgpd.input.checked : emp; };
		var client = partyFields(__('Datos del cliente'), doc.client, changed);

		// Datos del documento.
		var invType = ui.seg({ label: __('Tipo de factura'), value: 'ordinaria', options: [{ value: 'ordinaria', label: __('Ordinaria') }, { value: 'rectificativa', label: __('Rectificativa') }], onChange: function () { rectBox.hidden = invType.get() !== 'rectificativa'; changed(); } });
		var number = ui.field({ label: k.number, value: doc.number, help: kind === 'invoice' ? __('Numeración correlativa; si usas series, inclúyela (p. ej. A-2026-001). Las rectificativas suelen llevar su propia serie (R-…).') : null, onInput: changed });
		var date = ui.field({ label: __('Fecha de expedición'), type: 'date', value: doc.date, onInput: changed });
		var opDate = ui.field({ label: __('Fecha de la operación (si es distinta)'), type: 'date', value: '', onInput: changed });
		var due = ui.field({ label: k.due || __('Vencimiento'), type: 'date', value: doc.due, onInput: changed });
		var rf2 = {
			number: ui.field({ label: __('Nº de la factura rectificada'), value: '', onInput: changed }),
			date: ui.field({ label: __('Fecha de la factura rectificada'), type: 'date', value: '', onInput: changed }),
			reason: ui.field({ label: __('Motivo de la rectificación'), value: '', placeholder: __('Por ejemplo: devolución de mercancía, error en el precio…'), onInput: changed })
		};
		var rectBox = h('div', { class: 'ct-cols', hidden: true }, rf2.number.el, rf2.date.el, rf2.reason.el);

		var vatOpts = ['21', '10', '5', '4', '0'].map(function (v) { return { value: v, label: v + ' %' }; });
		var cols = [
			{ key: 'desc', label: __('Concepto'), placeholder: __('Descripción del producto o servicio') },
			{ key: 'qty', label: __('Cantidad'), type: 'number', default: '1', width: '90px' },
			{ key: 'price', label: kind === 'delivery' ? __('Precio unitario (opcional)') : __('Precio unitario (sin IVA)'), type: 'number', width: '130px' }
		];
		if (kind !== 'delivery') {
			cols.push({ key: 'disc', label: __('Dto. %'), type: 'number', default: '0', width: '80px' });
			cols.push({ key: 'vat', label: __('IVA'), type: 'select', options: vatOpts, default: '21', width: '90px' });
		}
		var table = CT.editTable(cols, doc.lines, changed, { addLabel: __('Añadir línea') });
		var irpf = ui.field({ label: __('Retención IRPF'), type: 'select', value: '0', options: [{ value: '0', label: __('Sin retención') }, { value: '1', label: '1 %' }, { value: '2', label: '2 %' }, { value: '7', label: '7 %' }, { value: '15', label: '15 %' }, { value: '19', label: '19 %' }], help: __('Habitual en profesionales que facturan a empresas o autónomos: 15 % general, 7 % en los primeros años de actividad. Comprueba tu caso.'), onInput: changed });
		var re = ui.field({ label: __('Aplicar recargo de equivalencia (cliente en ese régimen)'), type: 'checkbox', value: false, onInput: changed });
		re.input.addEventListener('change', changed);
		var mention = ui.field({ label: __('Mención especial obligatoria (si aplica)'), type: 'select', value: 'none', options: Object.keys(MENTIONS).map(function (key) { return { value: key, label: MENTIONS[key].label }; }), help: __('Las operaciones exentas, con inversión del sujeto pasivo, intracomunitarias o en criterio de caja deben indicarlo en la factura (Real Decreto 1619/2012, art. 6).'), onInput: function () { mentionRef.el.hidden = !(MENTIONS[mention.input.value] || {}).needsRef; changed(); } });
		var mentionRef = ui.field({ label: __('Precepto o texto de la mención'), value: '', placeholder: __('Por ejemplo: artículo 20.Uno.9º de la Ley 37/1992 (enseñanza)'), onInput: changed });
		mentionRef.el.hidden = true;
		var showPrices = ui.field({ label: __('Mostrar precios e importes en el albarán'), type: 'checkbox', value: false, onInput: changed });
		showPrices.input.addEventListener('change', changed);

		// Pago y pie legal.
		var payment = ui.field({ label: __('Forma de pago'), type: 'textarea', rows: 2, value: doc.payment, placeholder: __('Por ejemplo: transferencia bancaria a 30 días'), onInput: changed });
		var iban = ui.field({ label: __('IBAN para el pago (opcional)'), value: doc.iban, placeholder: 'ES00 0000 0000 0000 0000 0000', onInput: changed });
		iban.input.addEventListener('blur', function () { var r = V().iban(iban.input.value); if (r.valid) { iban.input.value = r.formatted; changed(); } });
		var notes = ui.field({ label: __('Observaciones'), type: 'textarea', rows: 2, value: '', placeholder: kind === 'quote' ? __('Condiciones, plazos de entrega, validez…') : __('Información adicional, si la necesitas'), onInput: changed });
		var rgpdTouched = saved.rgpd !== undefined;
		var rgpd = ui.field({ label: __('Incluir al pie la cláusula de protección de datos y derechos (RGPD)'), type: 'checkbox', value: doc.rgpd, onInput: function () { rgpdTouched = true; changed(); } });
		rgpd.input.addEventListener('change', function () { rgpdTouched = true; changed(); });
		var rgpdText = ui.field({ label: __('Texto de la cláusula'), type: 'textarea', rows: 5, value: doc.rgpdText, help: __('Se genera con tus datos. Si lo modificas, se usará tu texto; vacíalo para volver al generado.'), onInput: changed });
		var legalBox = h('fieldset', { class: 'ct-fieldset' }, h('legend', { text: __('Pie legal del documento') }),
			h('p', { class: 'ct-help', text: __('Se imprime al final de cada página. En las sociedades incluye la razón social, el NIF y los datos registrales.') }),
			rgpd.el, rgpdText.el);

		issuer.set(doc.issuer);
		drawLogo();
		toggleType();

		var read = function () {
			var logo = doc.issuer.logo;
			doc.issuer = Object.assign(issuer.read(), { type: type.get(), logo: logo, legalForm: rf.legalForm.input.value, capital: rf.capital.input.value.trim(),
				register: { name: rf.regName.input.value, other: rf.regOther.input.value.trim(), place: rf.place.input.value.trim(), tomo: rf.tomo.input.value.trim(), libro: rf.libro.input.value.trim(), folio: rf.folio.input.value.trim(), seccion: rf.seccion.input.value.trim(), hoja: rf.hoja.input.value.trim(), inscripcion: rf.inscripcion.input.value.trim() } });
			if (doc.issuer.type !== 'empresa') { doc.issuer.legalForm = ''; doc.issuer.capital = ''; }
			doc.client = client.read();
			doc.number = number.input.value.trim(); doc.date = date.input.value; doc.opDate = kind === 'invoice' ? opDate.input.value : ''; doc.due = due.input.value;
			doc.invType = kind === 'invoice' ? invType.get() : 'ordinaria';
			doc.rect = { number: rf2.number.input.value.trim(), date: rf2.date.input.value, reason: rf2.reason.input.value.trim() };
			doc.irpf = kind === 'invoice' ? irpf.input.value : '0'; doc.re = kind === 'invoice' && re.input.checked;
			doc.mention = kind === 'invoice' ? mention.input.value : 'none'; doc.mentionRef = mentionRef.input.value.trim();
			doc.payment = payment.input.value.trim(); doc.notes = notes.input.value.trim();
			var ib = V().iban(iban.input.value);
			doc.iban = iban.input.value.trim() ? (ib.valid ? ib.formatted : iban.input.value.trim()) : '';
			doc.rgpd = rgpd.input.checked; doc.rgpdText = rgpdText.input.value.trim();
			doc.showPrices = kind === 'delivery' && showPrices.input.checked;
			rgpdText.el.hidden = !doc.rgpd;
			if (!doc.rgpdText) { rgpdText.input.placeholder = defaultRgpd(doc.issuer); }
			return doc;
		};
		var saveIssuer = function () {
			var s = issuerStore.load(null) || {};
			s.issuer = doc.issuer; s.payment = doc.payment; s.iban = doc.iban; s.rgpd = doc.rgpd; s.rgpdText = doc.rgpdText;
			if (!issuerStore.enabled()) { return; }
			issuerStore.save(s);
			if (doc.issuer.logo && JSON.stringify(issuerStore.load({})).indexOf(doc.issuer.logo.slice(0, 64)) < 0) {
				CT.toast(__('El logotipo es demasiado grande para guardarlo en el navegador; se usará solo en esta sesión.'), 'error');
			}
		};
		var checks = function (t) {
			var w = [], vi = V();
			var ni = doc.issuer.nif ? vi.nif(doc.issuer.nif) : null;
			if (!doc.issuer.name || !doc.issuer.nif || !doc.issuer.addr) { w.push(__('Faltan tu nombre o razón social, tu NIF o tu domicilio.')); }
			if (ni && !ni.valid) { w.push(CT.sprintf(__('El NIF del emisor (%s) no supera la comprobación de su letra o dígito de control.'), doc.issuer.nif)); }
			if (ni && ni.valid && doc.issuer.type === 'empresa' && ni.type !== 'CIF') { w.push(__('Has elegido «Empresa», pero el NIF corresponde a una persona física. Las sociedades tienen un NIF que empieza por letra.')); }
			if (doc.issuer.type === 'empresa') {
				if (!doc.issuer.legalForm && !/\b(S\.?L\.?|S\.?A\.?)\b/i.test(doc.issuer.name)) { w.push(__('Indica la forma jurídica de la sociedad (S.L., S.A.…).')); }
				var r = doc.issuer.register;
				if (r.name !== 'otro' && (!r.place || !r.tomo || !r.folio || !r.hoja)) { w.push(__('Faltan datos registrales (registro, tomo, folio y hoja).')); }
			}
			if (doc.client.nif) { var nc = vi.nif(doc.client.nif); if (!nc.valid && !/^[A-Z]{2}[A-Z0-9]{2,}/.test(nc.value)) { w.push(CT.sprintf(__('El NIF del cliente (%s) no parece válido. Si es un cliente extranjero, indica su número de IVA con el prefijo del país.'), doc.client.nif)); } }
			if (doc.iban) { var ib = vi.iban(doc.iban); if (!ib.valid) { w.push(__('El IBAN no supera la comprobación de sus dígitos de control.')); } }
			if (kind === 'invoice') {
				if (!doc.client.name) { w.push(__('Falta el nombre del cliente.')); }
				else if (!doc.client.nif || !doc.client.addr) { w.push(__('Para una factura completa a una empresa o profesional, indica también su NIF y su domicilio.')); }
				if (!doc.number) { w.push(__('Falta el número de factura.')); }
				if (doc.invType === 'rectificativa' && !doc.rect.number) { w.push(__('Indica el número de la factura que se rectifica.')); }
				var m = MENTIONS[doc.mention];
				if (m && m.noVat && t.vat > 0) { w.push(__('Con la mención elegida las líneas no suelen llevar IVA: revisa los tipos aplicados.')); }
				if (m && m.needsRef && !doc.mentionRef && doc.mention === 'otra') { w.push(__('Escribe el texto de la mención especial.')); }
				if (doc.mention === 'intracom' && !/^[A-Z]{2}/.test((doc.client.nif || '').toUpperCase())) { w.push(__('En una entrega intracomunitaria indica el NIF-IVA del cliente con el prefijo de su país.')); }
			}
			if (doc.invType !== 'rectificativa' && t.lines.some(function (l) { return l.qty <= 0; })) { w.push(__('Hay líneas con cantidad 0 o negativa.')); }
			return w;
		};
		update = CT.debounce(function () {
			read();
			var t = totals(doc);
			summary.innerHTML = '';
			if (withPrices(doc)) {
				summary.appendChild(ui.resultCard({ label: __('Total del documento'), main: C2(t.total), stats: [[__('Base imponible'), C2(t.base)], [__('IVA'), C2(t.vat)]].concat(t.re ? [[__('Recargo'), C2(t.re)]] : []).concat(t.irpf ? [[__('Retención IRPF'), '−' + C2(t.irpf)]] : []) }));
			}
			var warns = checks(t);
			if (warns.length) {
				var box = ui.alert('warn', __('Revisa antes de emitir el documento:'));
				box.lastChild.appendChild(h('ul', { class: 'ct-doc-warns' }, warns.map(function (x) { return h('li', { text: x }); })));
				summary.appendChild(box);
			}
			preview.innerHTML = '';
			preview.appendChild(renderDoc(doc, t));
			saveIssuer();
		}, 150);

		var file = function (ext) { return k.file + (doc.invType === 'rectificativa' ? '-rectificativa' : '') + '-' + CT.safeName(doc.number || 'documento') + '.' + ext; };
		var bumpNumber = function () {
			var m = /^(.*?)(\d+)$/.exec(doc.number || '');
			if (!m || doc.invType === 'rectificativa') { return; }
			var next = m[1] + String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
			var s = issuerStore.load(null) || {}; s[kind + 'Next'] = next; issuerStore.save(s);
		};
		var picker = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
		var actions = ui.actions(
			ui.button(__('Descargar PDF'), { variant: 'primary', icon: 'file-down', onClick: function (e) {
				read(); var t = totals(doc);
				if (!t.lines.length) { CT.toast(__('Añade al menos una línea.'), 'error'); return; }
				var b = e.currentTarget; ui.busy(b, true);
				buildPdf(doc, t).then(function (bytes) { CT.download(new Blob([bytes], { type: 'application/pdf' }), file('pdf')); bumpNumber(); CT.track('done'); })
					.catch(function (err) { CT.fail(null, err); CT.toast(err.message || __('No se ha podido generar el PDF.'), 'error'); }).then(function () { ui.busy(b, false); });
			} }),
			ui.button(__('Imprimir'), { icon: 'printer', onClick: function () { read(); CT.printArea(renderDoc(doc, totals(doc))); } }),
			ui.button(__('Exportar datos (JSON)'), { icon: 'braces', variant: 'ghost', onClick: function () { read(); CT.download(JSON.stringify({ type: 'clicktools-' + kind, version: 2, doc: doc }, null, 2), file('json'), 'application/json'); } }),
			ui.button(__('Importar JSON'), { icon: 'upload', variant: 'ghost', onClick: function () { picker.click(); } })
		);
		picker.addEventListener('change', function () {
			var f = picker.files[0]; picker.value = '';
			if (!f) { return; }
			if (f.size > 3 * 1024 * 1024) { CT.toast(__('El archivo es demasiado grande.'), 'error'); return; }
			CT.readFile(f, 'text').then(function (txt) {
				var data = JSON.parse(txt);
				var d = data && data.doc;
				if (!d || !Array.isArray(d.lines)) { throw new Error(__('El archivo no contiene un documento de HerramientasClave.')); }
				var is = d.issuer || {}, r = is.register || {};
				issuer.set(is); client.set(d.client);
				type.set(is.type === 'empresa' ? 'empresa' : 'autonomo');
				doc.issuer.logo = typeof is.logo === 'string' && is.logo.indexOf('data:image/png;base64,') === 0 ? is.logo : '';
				rf.legalForm.input.value = is.legalForm || ''; rf.capital.input.value = is.capital || '';
				['place', 'tomo', 'libro', 'folio', 'seccion', 'hoja', 'inscripcion'].forEach(function (key) { rf[key].input.value = r[key] || ''; });
				rf.regName.input.value = r.name || 'mercantil'; rf.regOther.input.value = r.other || '';
				number.input.value = d.number || ''; date.input.value = d.date || today(); due.input.value = d.due || ''; opDate.input.value = d.opDate || '';
				payment.input.value = d.payment || ''; iban.input.value = d.iban || ''; notes.input.value = d.notes || '';
				irpf.input.value = String(d.irpf || '0'); re.input.checked = !!d.re;
				mention.input.value = MENTIONS[d.mention] ? d.mention : 'none'; mentionRef.input.value = d.mentionRef || ''; mentionRef.el.hidden = !(MENTIONS[mention.input.value] || {}).needsRef;
				rgpd.input.checked = !!d.rgpd; rgpdTouched = true; rgpdText.input.value = d.rgpdText || '';
				if (kind === 'invoice') {
					invType.set(d.invType === 'rectificativa' ? 'rectificativa' : 'ordinaria'); rectBox.hidden = invType.get() !== 'rectificativa';
					var rc = d.rect || {}; rf2.number.input.value = rc.number || ''; rf2.date.input.value = rc.date || ''; rf2.reason.input.value = rc.reason || '';
				}
				doc.lines.length = 0;
				d.lines.slice(0, 500).forEach(function (l) { doc.lines.push({ desc: String(l.desc || ''), qty: String(l.qty || ''), price: String(l.price || ''), disc: String(l.disc || '0'), vat: String(l.vat || '21') }); });
				drawLogo(); toggleType(); table.redraw(); update(); CT.toast(__('Documento importado'));
			}).catch(function (err) { CT.toast(err.message || __('No se ha podido leer el archivo.'), 'error'); });
		});

		el.appendChild(ui.persistToggle(issuerStore, function () { read(); return { issuer: doc.issuer, payment: doc.payment, iban: doc.iban, rgpd: doc.rgpd, rgpdText: doc.rgpdText }; }, function () { issuer.set({}); doc.issuer.logo = ''; drawLogo(); update(); }));
		el.appendChild(h('p', { class: 'ct-help ct-no-print', text: __('Si activas «Guardar en este navegador», se recuerdan tus datos de emisor (incluido el logotipo), la forma de pago y el siguiente número. Los datos del cliente no se guardan.') }));
		el.appendChild(h('div', { class: 'ct-doc-form' }, issuer.el, client.el));
		if (kind === 'invoice') { el.appendChild(invType.el); }
		el.appendChild(h('div', { class: 'ct-cols' }, number.el, date.el, kind === 'invoice' ? opDate.el : null, k.due ? due.el : null));
		if (kind === 'invoice') { el.appendChild(rectBox); }
		el.appendChild(h('h3', { class: 'ct-subtitle', text: __('Líneas') }));
		if (kind === 'delivery') { el.appendChild(showPrices.el); }
		el.appendChild(table.el);
		if (kind === 'invoice') {
			el.appendChild(h('div', { class: 'ct-cols' }, irpf.el, h('div', { class: 'ct-field', style: { alignSelf: 'center' } }, re.el)));
			el.appendChild(h('div', { class: 'ct-cols' }, mention.el, mentionRef.el));
		}
		el.appendChild(h('div', { class: 'ct-cols' }, payment.el, kind === 'delivery' ? null : iban.el, notes.el));
		el.appendChild(legalBox);
		el.appendChild(summary);
		el.appendChild(actions);
		el.appendChild(picker);
		el.appendChild(h('h3', { class: 'ct-subtitle', text: __('Vista previa') }));
		el.appendChild(preview);
		if (kind === 'invoice') {
			el.appendChild(ui.alert('info', __('Plantilla orientativa. El documento incluye los datos que exige el Reglamento de facturación (Real Decreto 1619/2012): número, fechas, datos y NIF de ambas partes, descripción, base, tipo y cuota de IVA, menciones especiales y, en sociedades, datos registrales. Tú eres responsable de su contenido y de su numeración correlativa. Comprueba si debes usar un programa de facturación que cumpla la normativa vigente o la factura electrónica. HerramientasClave no envía nada a Hacienda ni guarda tus facturas.')));
		}
		update();
	}

	tools.quote = function (el) { docTool(el, 'quote'); };
	tools.invoice = function (el) { docTool(el, 'invoice'); };
	tools.delivery = function (el) { docTool(el, 'delivery'); };

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

	/** Validador de NIF, NIE y CIF (uno o una lista). */
	tools.nif = function (el) {
		var input = ui.field({ label: __('NIF, NIE o CIF (uno por línea para comprobar varios)'), type: 'textarea', rows: 4, mono: true, value: '12345678Z' });
		var result = h('div');
		var DETAIL = { letra: __('La letra no corresponde al número.'), control: __('El carácter de control no corresponde.'), formato: __('El formato no es el de un NIF, NIE o CIF español.'), ceros: __('Válido; faltaban ceros a la izquierda.') };
		var run = function () {
			var items = input.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 1000);
			result.innerHTML = '';
			if (!items.length) { return; }
			var res = items.map(function (s) { return { input: s, r: V().nif(s) }; });
			if (res.length === 1) {
				var r = res[0].r;
				result.appendChild(ui.resultCard({ label: r.valid ? __('Formato y control correctos') : __('No válido'), main: r.valid ? '✓ ' + r.value : '✗ ' + (r.value || res[0].input),
					stats: [[__('Tipo'), r.type || '—']].concat(r.entity ? [[__('Tipo de entidad'), r.entity]] : []).concat(!r.valid && r.expected ? [[__('Con el control correcto sería'), r.expected]] : []) }));
				if (r.detail && DETAIL[r.detail]) { result.appendChild(ui.alert(r.valid ? 'info' : 'warn', DETAIL[r.detail])); }
			} else {
				var ok = res.filter(function (x) { return x.r.valid; }).length;
				result.appendChild(ui.resultCard({ label: __('Resultado'), main: CT.sprintf(__('%1$s válidos de %2$s'), N(ok), N(res.length)) }));
				result.appendChild(ui.table([__('Entrada'), __('Tipo'), __('Resultado'), __('Correcto sería')], res.map(function (x) { return [x.input, x.r.type || '—', x.r.valid ? '✓' : '✗ ' + (DETAIL[x.r.detail] || ''), x.r.valid ? '' : (x.r.expected || '—')]; }), { wrap: true }));
				result.appendChild(ui.actions(ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () { CT.download('﻿' + CT.csv.stringify([[__('Entrada'), __('Tipo'), __('Válido'), __('Correcto sería')]].concat(res.map(function (x) { return [x.input, x.r.type, x.r.valid ? 'sí' : 'no', x.r.valid ? '' : x.r.expected || '']; })), ';'), 'nif-validados.csv', 'text/csv;charset=utf-8'); } })));
			}
			CT.track('done');
		};
		input.input.addEventListener('input', CT.debounce(run, 200));
		el.appendChild(input.el);
		el.appendChild(result);
		el.appendChild(ui.alert('info', __('Solo se comprueban el formato y la letra o el dígito de control con el algoritmo oficial. No se consulta ningún registro: un NIF válido no garantiza que exista ni a nombre de quién está. Nada se envía a ningún servidor.')));
		run();
	};

	/** Validador de IBAN con dígitos de control y, para España, del código cuenta cliente. */
	tools.iban = function (el) {
		var input = ui.field({ label: __('IBAN (uno por línea para comprobar varios)'), type: 'textarea', rows: 4, mono: true, value: 'ES91 2100 0418 4502 0005 1332' });
		var result = h('div');
		var DETAIL = { formato: __('No tiene el formato de un IBAN (dos letras de país, dos dígitos de control y la cuenta).'), pais: __('El código de país no es de un país que use IBAN.'), longitud: __('La longitud no corresponde a ese país.'), control: __('Los dígitos de control del IBAN no son correctos.'), ccc: __('El IBAN es coherente, pero los dígitos de control de la cuenta española (CCC) no son correctos.') };
		var run = function () {
			var items = input.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 1000);
			result.innerHTML = '';
			if (!items.length) { return; }
			var res = items.map(function (s) { return { input: s, r: V().iban(s) }; });
			if (res.length === 1) {
				var r = res[0].r, stats = [[__('País'), r.country || '—']];
				if (r.ccc) { stats = stats.concat([[__('Entidad'), r.ccc.bank], [__('Oficina'), r.ccc.branch], [__('Dígitos de control'), r.ccc.dc], [__('Número de cuenta'), r.ccc.account]]); }
				if (r.expectedLength) { stats.push([__('Longitud esperada'), String(r.expectedLength)]); }
				result.appendChild(ui.resultCard({ label: r.valid ? __('IBAN válido') : __('IBAN no válido'), main: (r.valid ? '✓ ' : '✗ ') + r.formatted, stats: stats, copy: r.valid ? r.formatted : null }));
				if (!r.valid && DETAIL[r.detail]) { result.appendChild(ui.alert('warn', DETAIL[r.detail])); }
			} else {
				var ok = res.filter(function (x) { return x.r.valid; }).length;
				result.appendChild(ui.resultCard({ label: __('Resultado'), main: CT.sprintf(__('%1$s válidos de %2$s'), N(ok), N(res.length)) }));
				result.appendChild(ui.table([__('IBAN'), __('País'), __('Resultado')], res.map(function (x) { return [x.r.formatted || x.input, x.r.country, x.r.valid ? '✓' : '✗ ' + (DETAIL[x.r.detail] || '')]; }), { wrap: true }));
			}
			CT.track('done');
		};
		input.input.addEventListener('input', CT.debounce(run, 200));
		el.appendChild(input.el);
		el.appendChild(result);
		el.appendChild(ui.alert('info', __('Se comprueban la estructura y los dígitos de control (ISO 13616 y, en cuentas españolas, el CCC). No se consulta al banco: un IBAN válido puede no existir o estar cerrado. Nada se envía a ningún servidor.')));
		run();
	};

	CT.register('biz', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
