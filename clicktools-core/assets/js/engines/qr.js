/*!
 * HerramientasClave — generador de códigos QR estáticos (PNG y SVG), con colores, logotipo y lotes.
 * Usa la biblioteca qrcode-generator (MIT), cargada bajo demanda.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;

	/* ---------- Construcción del contenido (exportado para pruebas) ---------- */
	function escWifi(s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); }
	function escVcard(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
	var Q = CT.qrPayload = {
		url: function (v) { var u = v.url.trim(); if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) { u = 'https://' + u; } return u; },
		text: function (v) { return v.text; },
		wifi: function (v) { return 'WIFI:T:' + (v.enc === 'nopass' ? 'nopass' : v.enc) + ';S:' + escWifi(v.ssid) + ';' + (v.enc !== 'nopass' ? 'P:' + escWifi(v.pass) + ';' : '') + (v.hidden ? 'H:true;' : '') + ';'; },
		email: function (v) { var q = []; if (v.subject) { q.push('subject=' + encodeURIComponent(v.subject)); } if (v.body) { q.push('body=' + encodeURIComponent(v.body)); } return 'mailto:' + v.to.trim() + (q.length ? '?' + q.join('&') : ''); },
		phone: function (v) { return 'tel:' + v.phone.replace(/[^\d+]/g, ''); },
		sms: function (v) { return 'SMSTO:' + v.phone.replace(/[^\d+]/g, '') + ':' + v.msg; },
		vcard: function (v) {
			var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + escVcard(v.last) + ';' + escVcard(v.first) + ';;;', 'FN:' + escVcard((v.first + ' ' + v.last).trim())];
			if (v.org) { lines.push('ORG:' + escVcard(v.org)); }
			if (v.title) { lines.push('TITLE:' + escVcard(v.title)); }
			if (v.phone) { lines.push('TEL;TYPE=CELL:' + v.phone.replace(/[^\d+]/g, '')); }
			if (v.email) { lines.push('EMAIL:' + v.email.trim()); }
			if (v.web) { lines.push('URL:' + Q.url({ url: v.web })); }
			if (v.addr) { lines.push('ADR;TYPE=WORK:;;' + escVcard(v.addr) + ';;;;'); }
			lines.push('END:VCARD');
			return lines.join('\n');
		},
		geo: function (v) { return 'geo:' + v.lat + ',' + v.lng + (v.label ? '?q=' + v.lat + ',' + v.lng + '(' + encodeURIComponent(v.label) + ')' : ''); }
	};

	var luminance = CT.luminance, contrast = CT.contrast;

	function makeQr(lib, text, ecc) {
		lib.stringToBytes = lib.stringToBytesFuncs['UTF-8'];
		var qr = lib(0, ecc);
		qr.addData(text, 'Byte');
		qr.make();
		return qr;
	}
	function drawCanvas(qr, o) {
		var count = qr.getModuleCount();
		var total = count + o.margin * 2;
		var scale = Math.max(1, Math.floor(o.size / total));
		var px = total * scale;
		var c = document.createElement('canvas');
		c.width = c.height = px;
		var ctx = c.getContext('2d');
		if (!o.transparent) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, px, px); }
		ctx.fillStyle = o.fg;
		for (var r = 0; r < count; r++) { for (var col = 0; col < count; col++) { if (qr.isDark(r, col)) { ctx.fillRect((col + o.margin) * scale, (r + o.margin) * scale, scale, scale); } } }
		if (o.logo) {
			var lw = px * o.logoPct / 100, lh = lw * o.logo.height / o.logo.width;
			var x = (px - lw) / 2, y = (px - lh) / 2, pad = scale;
			ctx.fillStyle = o.transparent ? '#ffffff' : o.bg;
			ctx.fillRect(x - pad, y - pad, lw + pad * 2, lh + pad * 2);
			ctx.drawImage(o.logo, x, y, lw, lh);
		}
		return c;
	}
	function buildSvg(qr, o) {
		var count = qr.getModuleCount(), total = count + o.margin * 2, d = '';
		for (var r = 0; r < count; r++) {
			for (var col = 0; col < count; col++) {
				if (qr.isDark(r, col)) { d += 'M' + (col + o.margin) + ' ' + (r + o.margin) + 'h1v1h-1z'; }
			}
		}
		var svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + o.size + '" height="' + o.size + '" shape-rendering="crispEdges">';
		if (!o.transparent) { svg += '<rect width="100%" height="100%" fill="' + o.bg + '"/>'; }
		svg += '<path fill="' + o.fg + '" d="' + d + '"/>';
		if (o.logo && o.logoData) {
			var lw = total * o.logoPct / 100, lh = lw * o.logo.height / o.logo.width;
			var x = (total - lw) / 2, y = (total - lh) / 2;
			svg += '<rect x="' + (x - 1) + '" y="' + (y - 1) + '" width="' + (lw + 2) + '" height="' + (lh + 2) + '" fill="' + (o.transparent ? '#ffffff' : o.bg) + '"/>';
			svg += '<image href="' + o.logoData + '" x="' + x + '" y="' + y + '" width="' + lw + '" height="' + lh + '"/>';
		}
		return svg + '</svg>';
	}

	var TYPES = {
		url: { label: __('Enlace'), icon: 'link', fields: [['url', __('Dirección web'), 'url', (CT.cfg && CT.cfg.home) || 'https://example.com']] },
		text: { label: __('Texto'), icon: 'type', fields: [['text', __('Texto'), 'textarea', '']] },
		wifi: { label: 'Wi-Fi', icon: 'wifi', fields: [['ssid', __('Nombre de la red (SSID)'), 'text', ''], ['pass', __('Contraseña'), 'text', ''], ['enc', __('Seguridad'), 'select', 'WPA', [{ value: 'WPA', label: 'WPA/WPA2/WPA3' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: __('Sin contraseña') }]], ['hidden', __('Red oculta'), 'checkbox', false]] },
		email: { label: __('Correo'), icon: 'mail', fields: [['to', __('Destinatario'), 'email', ''], ['subject', __('Asunto'), 'text', ''], ['body', __('Mensaje'), 'textarea', '']] },
		phone: { label: __('Teléfono'), icon: 'phone', fields: [['phone', __('Número de teléfono'), 'tel', '+34 ']] },
		sms: { label: 'SMS', icon: 'message-square', fields: [['phone', __('Número de teléfono'), 'tel', '+34 '], ['msg', __('Mensaje'), 'textarea', '']] },
		vcard: { label: __('Contacto'), icon: 'contact', fields: [['first', __('Nombre'), 'text', ''], ['last', __('Apellidos'), 'text', ''], ['org', __('Empresa'), 'text', ''], ['title', __('Cargo'), 'text', ''], ['phone', __('Teléfono'), 'tel', ''], ['email', __('Correo'), 'email', ''], ['web', __('Web'), 'url', ''], ['addr', __('Dirección'), 'text', '']] },
		geo: { label: __('Ubicación'), icon: 'map-pin', fields: [['lat', __('Latitud'), 'text', '40.4168'], ['lng', __('Longitud'), 'text', '-3.7038'], ['label', __('Nombre del lugar (opcional)'), 'text', '']] }
	};

	function validate(type, v) {
		switch (type) {
			case 'url': if (!v.url.trim()) { return ['url', __('Escribe una dirección web.')]; } if (/\s/.test(v.url.trim())) { return ['url', __('La dirección no puede contener espacios.')]; } break;
			case 'text': if (!v.text) { return ['text', __('Escribe el texto.')]; } break;
			case 'wifi': if (!v.ssid) { return ['ssid', __('Indica el nombre de la red.')]; } if (v.enc !== 'nopass' && !v.pass) { return ['pass', __('Indica la contraseña o elige «Sin contraseña».')]; } break;
			case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.to.trim())) { return ['to', __('Escribe un correo válido.')]; } break;
			case 'phone': case 'sms': if (v.phone.replace(/[^\d]/g, '').length < 3) { return ['phone', __('Escribe un número de teléfono.')]; } break;
			case 'vcard': if (!v.first && !v.last) { return ['first', __('Indica al menos un nombre.')]; } break;
			case 'geo':
				var lat = parseFloat(String(v.lat).replace(',', '.')), lng = parseFloat(String(v.lng).replace(',', '.'));
				if (!isFinite(lat) || lat < -90 || lat > 90) { return ['lat', __('La latitud debe estar entre −90 y 90.')]; }
				if (!isFinite(lng) || lng < -180 || lng > 180) { return ['lng', __('La longitud debe estar entre −180 y 180.')]; }
				v.lat = lat; v.lng = lng;
				break;
		}
		return null;
	}

	function generator(el, tool) {
		var type = (tool.config && tool.config.type) || 'url';
		var fieldsBox = h('div', { class: 'ct-cols' });
		var fields = {};
		var typeSeg = ui.seg({ label: __('Tipo de código QR'), value: type, options: Object.keys(TYPES).map(function (k) { return { value: k, label: TYPES[k].label, icon: TYPES[k].icon }; }), onChange: function (v) { type = v; buildFields(); render(); } });
		var size = ui.field({ label: __('Tamaño'), type: 'select', value: '512', options: [256, 512, 768, 1024, 2048].map(function (s) { return { value: String(s), label: s + ' px' }; }) });
		var ecc = ui.field({ label: __('Corrección de errores'), type: 'select', value: 'M', options: [{ value: 'L', label: __('Baja (7 %)') }, { value: 'M', label: __('Media (15 %)') }, { value: 'Q', label: __('Alta (25 %)') }, { value: 'H', label: __('Máxima (30 %)') }] });
		var margin = ui.field({ label: __('Margen'), type: 'select', value: '4', options: [0, 1, 2, 4, 6, 8].map(function (s) { return { value: String(s), label: s + ' ' + __('módulos') }; }), help: __('Se recomiendan 4 módulos de margen.') });
		var fg = h('input', { type: 'color', class: 'ct-color', value: '#111111', 'aria-label': __('Color del código') });
		var bg = h('input', { type: 'color', class: 'ct-color', value: '#ffffff', 'aria-label': __('Color de fondo') });
		var transparent = ui.field({ type: 'checkbox', label: __('Fondo transparente'), value: false });
		var logoIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', hidden: true });
		var logoPct = ui.field({ label: __('Tamaño del logotipo'), type: 'select', value: '18', options: [{ value: '12', label: '12 %' }, { value: '15', label: '15 %' }, { value: '18', label: '18 %' }, { value: '22', label: __('22 % (máximo recomendado)') }] });
		var logo = null, logoData = null;
		var preview = h('div', { class: 'ct-qr-out', 'aria-live': 'polite' });
		var warnBox = h('div');
		var lib = null, last = null;

		var buildFields = function () {
			fieldsBox.innerHTML = '';
			fields = {};
			TYPES[type].fields.forEach(function (f) {
				var api = ui.field({ label: f[1], type: f[2] === 'textarea' ? 'textarea' : f[2] === 'select' ? 'select' : f[2] === 'checkbox' ? 'checkbox' : f[2], value: f[3], options: f[4], rows: 3 });
				api.input.addEventListener('input', CT.debounce(render, 200));
				api.input.addEventListener('change', render);
				fields[f[0]] = api;
				fieldsBox.appendChild(f[2] === 'textarea' ? h('div', { style: { gridColumn: '1 / -1' } }, api.el) : api.el);
			});
		};
		var values = function () { var v = {}; Object.keys(fields).forEach(function (k) { v[k] = fields[k].input.type === 'checkbox' ? fields[k].input.checked : fields[k].input.value; }); return v; };
		var opts = function () { return { size: parseInt(size.input.value, 10), margin: parseInt(margin.input.value, 10), fg: fg.value, bg: bg.value, transparent: transparent.input.checked, logo: logo, logoData: logoData, logoPct: parseInt(logoPct.input.value, 10) }; };

		var render = function () {
			Object.keys(fields).forEach(function (k) { if (fields[k].error) { fields[k].error(''); } });
			var v = values();
			var err = validate(type, v);
			preview.innerHTML = '';
			warnBox.innerHTML = '';
			last = null;
			if (err) { if (fields[err[0]]) { fields[err[0]].error(err[1]); } preview.appendChild(h('p', { class: 'ct-help', text: __('Completa los datos para ver el código.') })); return; }
			var text = Q[type](v);
			var level = logo && ecc.input.value !== 'H' ? 'H' : ecc.input.value;
			CT.loadVendor('qrcode').then(function (l) {
				lib = l;
				var qr;
				try { qr = makeQr(lib, text, level); } catch (e) { preview.appendChild(ui.alert('err', __('El contenido es demasiado largo para un código QR. Acórtalo o reduce la corrección de errores.'))); return; }
				var o = opts();
				var canvas = drawCanvas(qr, o);
				canvas.setAttribute('role', 'img');
				canvas.setAttribute('aria-label', __('Código QR generado'));
				preview.appendChild(canvas);
				last = { qr: qr, o: o, canvas: canvas, text: text };
				var c = o.transparent ? contrast(o.fg, '#ffffff') : contrast(o.fg, o.bg);
				if (c < 4) { warnBox.appendChild(ui.alert('warn', __('El contraste entre el código y el fondo es bajo: algunos móviles podrían no leerlo. Usa un color oscuro sobre fondo claro.'))); }
				else if (luminance(o.fg) > luminance(o.transparent ? '#ffffff' : o.bg)) { warnBox.appendChild(ui.alert('warn', __('Los códigos claros sobre fondo oscuro no son compatibles con todos los lectores.'))); }
				if (logo) { warnBox.appendChild(ui.alert('info', __('Con logotipo se usa la corrección de errores máxima. Prueba el código con varios móviles antes de imprimirlo.'))); }
				warnBox.appendChild(h('p', { class: 'ct-help', text: CT.sprintf(__('Versión %1$d (%2$d × %2$d módulos) · %3$d caracteres codificados.'), Math.round((qr.getModuleCount() - 17) / 4), qr.getModuleCount(), text.length) }));
			}).catch(function (e) { preview.appendChild(ui.alert('err', e.message)); });
		};

		logoIn.addEventListener('change', function () {
			var f = logoIn.files[0];
			if (!f) { return; }
			if (f.size > 2 * 1024 * 1024) { CT.toast(__('El logotipo debe ocupar menos de 2 MB.'), 'error'); return; }
			CT.readFile(f, 'dataURL').then(function (data) {
				var img = new Image();
				img.onload = function () { logo = img; logoData = data; render(); };
				img.onerror = function () { CT.toast(__('No se ha podido leer la imagen del logotipo.'), 'error'); };
				img.src = data;
			});
			logoIn.value = '';
		});

		var name = function (ext) { return 'codigo-qr-' + type + '.' + ext; };
		var dlPng = ui.button(__('Descargar PNG'), { variant: 'primary', icon: 'download', onClick: function () { if (!last) { return; } CT.canvasToBlob(last.canvas, 'image/png').then(function (b) { CT.download(b, name('png')); }); } });
		var dlSvg = ui.button(__('Descargar SVG'), { icon: 'download', onClick: function () { if (!last) { return; } CT.download(buildSvg(last.qr, last.o), name('svg'), 'image/svg+xml'); } });
		var copyTxt = ui.button(__('Copiar contenido'), { icon: 'copy', variant: 'ghost', onClick: function () { if (last) { CT.copy(last.text); } } });

		el.appendChild(typeSeg.el);
		el.appendChild(fieldsBox);
		var design = h('details', { class: 'ct-panel' }, h('summary', { class: 'ct-panel__title', style: { cursor: 'pointer', marginBottom: 0 }, text: __('Diseño: tamaño, colores y logotipo') }),
			h('div', { class: 'ct-cols', style: { marginTop: '12px' } }, size.el, ecc.el, margin.el),
			h('div', { class: 'ct-row' }, h('label', { class: 'ct-row' }, fg, h('span', { text: __('Color del código') })), h('label', { class: 'ct-row' }, bg, h('span', { text: __('Color de fondo') })), transparent.el),
			h('div', { class: 'ct-row', style: { marginTop: '12px', alignItems: 'flex-end' } }, logoPct.el,
				ui.button(__('Añadir logotipo'), { icon: 'image', size: 'sm', onClick: function () { logoIn.click(); } }),
				ui.button(__('Quitar logotipo'), { icon: 'x', size: 'sm', variant: 'ghost', onClick: function () { logo = null; logoData = null; render(); } }), logoIn));
		el.appendChild(design);
		[size.input, ecc.input, margin.input, fg, bg, transparent.input, logoPct.input].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, preview, h('div', null, warnBox, ui.actions(dlPng, dlSvg, copyTxt))));
		el.appendChild(h('p', { class: 'ct-help', text: __('Los códigos son estáticos: el contenido va dentro del propio código, no caducan y no pasan por nuestros servidores.') }));
		buildFields();
		render();
	}

	function batch(el) {
		var list = ui.field({ label: __('Una línea por código. Opcionalmente «nombre;contenido»'), type: 'textarea', rows: 8, mono: true, value: 'REF-001;https://tienda.ejemplo/producto/001\nREF-002;https://tienda.ejemplo/producto/002\nREF-003;https://tienda.ejemplo/producto/003' });
		var format = ui.seg({ label: __('Formato'), value: 'png', options: [{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG' }] });
		var size = ui.field({ label: __('Tamaño PNG'), type: 'select', value: '512', options: [256, 512, 1024].map(function (s) { return { value: String(s), label: s + ' px' }; }) });
		var label = ui.field({ type: 'checkbox', label: __('Usar el nombre como nombre de archivo'), value: true });
		var progress = ui.progress();
		var result = ui.result();
		var btn = ui.button(__('Generar ZIP'), { variant: 'primary', icon: 'download', onClick: function () {
			var rows = list.input.value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
			if (!rows.length) { list.error(__('Añade al menos una línea.')); return; }
			if (rows.length > 500) { list.error(__('El máximo es de 500 códigos por lote.')); return; }
			list.error('');
			ui.busy(btn, true);
			CT.loadVendor('qrcode').then(function (lib) {
				var files = [], i = 0;
				var o = { size: parseInt(size.input.value, 10), margin: 4, fg: '#000000', bg: '#ffffff' };
				var step = function () {
					if (i >= rows.length) {
						progress.indeterminate(__('Creando el ZIP…'));
						return CT.zip.create(files).then(function (z) { progress.done(); CT.download(z, 'codigos-qr.zip'); result.set(ui.alert('ok', CT.sprintf(__('%d códigos generados.'), files.length))); ui.busy(btn, false); });
					}
					var parts = rows[i].split(';');
					var nameStr = parts.length > 1 && label.input.checked ? parts[0] : 'qr-' + String(i + 1).padStart(3, '0');
					var content = parts.length > 1 ? parts.slice(1).join(';').trim() : rows[i];
					var qr = makeQr(lib, content, 'M');
					var fname = nameStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'qr-' + i;
					i++;
					progress.set(i / rows.length, CT.sprintf(__('Generando %1$d de %2$d…'), i, rows.length));
					if (format.get() === 'svg') { files.push({ name: fname + '.svg', data: buildSvg(qr, o) }); return Promise.resolve().then(step); }
					return CT.canvasToBlob(drawCanvas(qr, o), 'image/png').then(function (b) { files.push({ name: fname + '.png', data: b }); return step(); });
				};
				return step();
			}).catch(function (e) { ui.busy(btn, false); progress.done(); CT.fail(result, e); });
		} });
		el.appendChild(list.el);
		el.appendChild(h('div', { class: 'ct-row' }, format.el, size.el, label.el));
		el.appendChild(ui.actions(btn));
		el.appendChild(progress.el);
		el.appendChild(result.el);
	}

	CT.register('qr', {
		mount: function (el, tool) {
			if (tool.key === 'lotes') { batch(el); return; }
			generator(el, tool);
		}
	});
	CT.qr = { svg: buildSvg, make: makeQr };
})();
