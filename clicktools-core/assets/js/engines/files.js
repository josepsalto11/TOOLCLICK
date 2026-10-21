/*!
 * HerramientasClave — herramientas de archivos: identificación, renombrado masivo, inventarios
 * y comparación de carpetas. Solo se leen los archivos que el usuario selecciona.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;

	var RISKY = ['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'js', 'jse', 'ps1', 'jar', 'apk', 'dmg', 'app', 'sh', 'lnk', 'hta', 'iso'];

	var tools = {};

	tools.identify = function (el) {
		var result = h('div');
		var drop = ui.dropzone({ multiple: true, maxMb: 100000, hint: __('Solo se leen los primeros bytes de cada archivo para reconocer su firma. Nada se sube.'), onFiles: function (fs) {
			result.innerHTML = '';
			fs.forEach(function (f) {
				CT.readHead(f, 4100).then(function (buf) {
					var sn = CT.sniff(buf), ext = CT.fileExt(f.name);
					var rows = [[__('Nombre'), f.name], [__('Extensión'), ext ? '.' + ext : __('sin extensión')], [__('Tipo MIME declarado'), f.type || __('no informado por el sistema')], [__('Formato real (firma)'), sn ? sn.label + ' · ' + sn.mime : __('no reconocido')], [__('Tamaño'), CT.fmt.bytes(f.size) + ' (' + N(f.size) + ' bytes)'], [__('Última modificación'), f.lastModified ? CT.fmt.date(new Date(f.lastModified), { dateStyle: 'medium', timeStyle: 'short' }) : '—']];
					var alerts = [];
					var same = sn && (sn.ext === ext || (sn.ext === 'jpg' && ext === 'jpeg') || (sn.ext === 'tif' && ext === 'tiff') || (sn.ext === 'zip' && ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'epub', 'jar', 'apk'].indexOf(ext) >= 0) || (sn.ext === 'doc' && ['xls', 'ppt', 'msg'].indexOf(ext) >= 0) || (sn.ext === 'txt' && ['csv', 'md', 'log', 'ini', 'css', 'js', 'srt'].indexOf(ext) >= 0) || (sn.ext === 'mp4' && ['m4v', 'm4a'].indexOf(ext) >= 0));
					if (sn && ext && !same) { alerts.push(ui.alert('warn', CT.sprintf(__('La extensión .%1$s no coincide con el contenido real (%2$s). Puede tratarse de un error o de un archivo disfrazado.'), ext, sn.label))); }
					if (RISKY.indexOf(ext) >= 0 || (sn && ['exe', 'elf'].indexOf(sn.ext) >= 0)) { alerts.push(ui.alert('warn', __('Es un archivo ejecutable o un script: ábrelo solo si confías plenamente en su origen.'))); }
					result.appendChild(h('div', { class: 'ct-panel' }, alerts, ui.table([__('Dato'), __('Valor')], rows, { wrap: true, caption: f.name })));
				});
			});
			result.appendChild(h('p', { class: 'ct-help', text: __('Esta herramienta identifica el formato por su firma; no analiza si un archivo contiene virus o malware.') }));
			CT.track('done');
		} });
		el.appendChild(drop.el);
		el.appendChild(result);
	};

	tools.rename = function (el) {
		var files = [];
		var pattern = ui.field({ label: __('Patrón del nuevo nombre'), value: '{nombre}', mono: true, help: __('Comodines: {nombre} (nombre original), {n} (número), {fecha} (de modificación AAAA-MM-DD), {hoy}, {ext}.') });
		var find = ui.field({ label: __('Buscar (opcional)'), value: '' });
		var repl = ui.field({ label: __('Reemplazar por'), value: '' });
		var start = ui.field({ label: __('Número inicial'), type: 'number', integer: true, value: 1 });
		var pad = ui.field({ label: __('Dígitos'), type: 'select', value: '3', options: [1, 2, 3, 4, 5].map(function (n) { return { value: String(n), label: String(n) }; }) });
		var style = ui.field({ label: __('Formato del nombre'), type: 'select', value: 'keep', options: [{ value: 'keep', label: __('Sin cambios') }, { value: 'lower', label: __('minúsculas') }, { value: 'upper', label: __('MAYÚSCULAS') }, { value: 'slug', label: __('sin-tildes-ni-espacios') }] });
		var order = ui.field({ label: __('Orden para numerar'), type: 'select', value: 'name', options: [{ value: 'name', label: __('Por nombre') }, { value: 'date', label: __('Por fecha de modificación') }, { value: 'added', label: __('Orden de selección') }] });
		var preview = h('div');
		var progress = ui.progress();
		var result = ui.result();
		var slug = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/gi, 'n').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); };
		var names = function () {
			var list = files.slice();
			if (order.input.value === 'name') { list.sort(function (a, b) { return a.name.localeCompare(b.name, 'es', { numeric: true }); }); }
			if (order.input.value === 'date') { list.sort(function (a, b) { return a.lastModified - b.lastModified; }); }
			var today = new Date().toISOString().slice(0, 10), used = {};
			return list.map(function (f, i) {
				var base = CT.baseName(f.name), ext = CT.fileExt(f.name);
				if (find.input.value) { base = base.split(find.input.value).join(repl.input.value); }
				var d = new Date(f.lastModified || Date.now());
				var n = String((start.get() || 0) + i).padStart(parseInt(pad.input.value, 10), '0');
				var name = pattern.input.value.replace(/\{nombre\}/g, base).replace(/\{n\}/g, n).replace(/\{fecha\}/g, d.toISOString().slice(0, 10)).replace(/\{hoy\}/g, today).replace(/\{ext\}/g, ext);
				if (style.input.value === 'lower') { name = name.toLowerCase(); } else if (style.input.value === 'upper') { name = name.toUpperCase(); } else if (style.input.value === 'slug') { name = slug(name); }
				var full = CT.safeName(name || 'archivo') + (ext ? '.' + (style.input.value === 'upper' ? ext.toUpperCase() : style.input.value === 'keep' ? ext : ext.toLowerCase()) : '');
				var k = full.toLowerCase(), j = 2;
				while (used[k]) { full = full.replace(/(\.[^.]+)?$/, '-' + j++ + '$1'); k = full.toLowerCase(); }
				used[k] = 1;
				return { file: f, name: full };
			});
		};
		var draw = function () {
			preview.innerHTML = '';
			if (!files.length) { return; }
			preview.appendChild(ui.table([__('Nombre actual'), __('Nombre nuevo')], names().map(function (r) { return [r.file.name, r.name]; }), { wrap: true, tall: files.length > 14, caption: __('Vista previa') }));
		};
		var drop = ui.dropzone({ multiple: true, maxMb: 2048, hint: __('Selecciona los archivos que quieres renombrar.'), onFiles: function (fs) { files = files.concat(fs); draw(); } });
		var btn = ui.button(__('Descargar renombrados (ZIP)'), { variant: 'primary', icon: 'download', onClick: function () {
			if (!files.length) { result.error(__('Añade archivos.')); return; }
			var total = files.reduce(function (a, f) { return a + f.size; }, 0);
			if (total > 1024 * 1024 * 1024) { result.error(__('El total supera 1 GB: divide los archivos en varios lotes.')); return; }
			ui.busy(btn, true); progress.indeterminate(__('Creando el ZIP…'));
			CT.zip.create(names().map(function (r) { return { name: r.name, data: r.file }; })).then(function (z) {
				progress.done(); ui.busy(btn, false);
				CT.download(z, 'archivos-renombrados.zip');
				result.set(ui.alert('ok', CT.sprintf(__('%d archivos renombrados dentro del ZIP.'), files.length)));
			}).catch(function (e) { progress.done(); ui.busy(btn, false); CT.fail(result, e); });
		} });
		var exportBtn = ui.button(__('Copiar lista de cambios'), { icon: 'copy', onClick: function () { CT.copy(names().map(function (r) { return r.file.name + ' → ' + r.name; }).join('\n')); } });
		el.appendChild(drop.el);
		el.appendChild(h('div', { class: 'ct-panel' }, h('div', { class: 'ct-cols' }, pattern.el, find.el, repl.el, start.el, pad.el, style.el, order.el)));
		el.appendChild(ui.alert('info', __('Por seguridad, el navegador no puede cambiar el nombre de los archivos de tu equipo: obtendrás una copia con los nuevos nombres dentro de un ZIP.')));
		el.appendChild(ui.actions(btn, exportBtn, ui.button(__('Vaciar'), { icon: 'trash-2', variant: 'ghost', onClick: function () { files = []; draw(); result.clear(); } })));
		el.appendChild(progress.el);
		el.appendChild(result.el);
		el.appendChild(preview);
		[pattern, find, repl, start, pad, style, order].forEach(function (f) { f.input.addEventListener('input', CT.debounce(draw, 150)); f.input.addEventListener('change', draw); });
	};

	function relPath(f) { return f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(1).join('/') : f.name; }

	tools.inventory = function (el) {
		var files = [];
		var result = h('div');
		var draw = function () {
			result.innerHTML = '';
			if (!files.length) { return; }
			var total = 0, byExt = {};
			files.forEach(function (f) { total += f.size; var e = CT.fileExt(f.name) || __('(sin extensión)'); byExt[e] = byExt[e] || [0, 0]; byExt[e][0]++; byExt[e][1] += f.size; });
			result.appendChild(ui.resultCard({ label: __('Inventario'), main: CT.sprintf(CT._n('%d archivo', '%d archivos', files.length), files.length) + ' · ' + CT.fmt.bytes(total) }));
			result.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px' }, text: __('Por tipo de archivo') }));
			result.appendChild(ui.table([__('Extensión'), __('Archivos'), __('Tamaño'), '%'], Object.keys(byExt).sort(function (a, b) { return byExt[b][1] - byExt[a][1]; }).map(function (e) { return [e, N(byExt[e][0]), CT.fmt.bytes(byExt[e][1]), CT.fmt.percent(total ? byExt[e][1] / total * 100 : 0, 1)]; }), { num: [1, 2, 3] }));
			result.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px' }, text: __('Detalle') }));
			result.appendChild(ui.table([__('Ruta'), __('Tamaño'), __('Modificado')], files.slice(0, 1000).map(function (f) { return [relPath(f), CT.fmt.bytes(f.size), f.lastModified ? new Date(f.lastModified).toLocaleString('es-ES') : '—']; }), { wrap: true, tall: true, num: [1] }));
			if (files.length > 1000) { result.appendChild(h('p', { class: 'ct-help', text: __('Se muestran los primeros 1000; el CSV incluye todos.') })); }
		};
		var csv = function () {
			return '﻿' + CT.csv.stringify([[__('Ruta'), __('Nombre'), __('Extensión'), __('Tamaño (bytes)'), __('Modificado'), __('Tipo')]].concat(files.map(function (f) { return [relPath(f), f.name, CT.fileExt(f.name), f.size, f.lastModified ? new Date(f.lastModified).toISOString() : '', f.type]; })), ';');
		};
		var pickFiles = ui.dropzone({ multiple: true, maxMb: 1e6, compact: true, title: __('Seleccionar archivos'), hint: '', onFiles: function (fs) { files = files.concat(fs); draw(); CT.track('done'); } });
		var pickDir = ui.dropzone({ multiple: true, maxMb: 1e6, compact: true, directory: true, title: __('Seleccionar una carpeta completa'), hint: '', onFiles: function (fs) { files = files.concat(fs); draw(); CT.track('done'); } });
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, pickFiles.el, pickDir.el));
		el.appendChild(h('p', { class: 'ct-help', text: __('Solo se leen nombres, tamaños y fechas, no el contenido. Al elegir una carpeta, tu navegador puede pedirte confirmación.') }));
		el.appendChild(ui.actions(ui.button(__('Descargar CSV'), { variant: 'primary', icon: 'download', onClick: function () { if (files.length) { CT.download(csv(), 'inventario-archivos.csv', 'text/csv;charset=utf-8'); } } }), ui.button(__('Vaciar'), { icon: 'trash-2', variant: 'ghost', onClick: function () { files = []; draw(); } })));
		el.appendChild(result);
	};

	tools.folders = function (el) {
		var sets = [[], []];
		var hashOpt = ui.field({ type: 'checkbox', label: __('Comparar también el contenido (huella SHA-256) de los archivos con el mismo tamaño — más lento'), value: false });
		var progress = ui.progress();
		var result = h('div');
		var digest = function (f) { return CT.readFile(f).then(function (b) { return crypto.subtle.digest('SHA-256', b); }).then(function (d) { return Array.from(new Uint8Array(d)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }); };
		var run = function () {
			if (!sets[0].length || !sets[1].length) { return; }
			var a = {}, b = {};
			sets[0].forEach(function (f) { a[relPath(f)] = f; }); sets[1].forEach(function (f) { b[relPath(f)] = f; });
			var onlyA = Object.keys(a).filter(function (k) { return !b[k]; }), onlyB = Object.keys(b).filter(function (k) { return !a[k]; });
			var both = Object.keys(a).filter(function (k) { return b[k]; });
			var diffSize = both.filter(function (k) { return a[k].size !== b[k].size; });
			var sameSize = both.filter(function (k) { return a[k].size === b[k].size; });
			var finish = function (diffContent) {
				progress.done();
				result.innerHTML = '';
				var rows = [];
				onlyA.forEach(function (k) { rows.push([k, __('Solo en A'), CT.fmt.bytes(a[k].size), '—']); });
				onlyB.forEach(function (k) { rows.push([k, __('Solo en B'), '—', CT.fmt.bytes(b[k].size)]); });
				diffSize.forEach(function (k) { rows.push([k, __('Tamaño distinto'), CT.fmt.bytes(a[k].size), CT.fmt.bytes(b[k].size)]); });
				(diffContent || []).forEach(function (k) { rows.push([k, __('Mismo tamaño, contenido distinto'), CT.fmt.bytes(a[k].size), CT.fmt.bytes(b[k].size)]); });
				var identical = sameSize.length - (diffContent ? diffContent.length : 0);
				result.appendChild(ui.resultCard({ label: __('Resultado de la comparación'), stats: [[__('Solo en A'), N(onlyA.length)], [__('Solo en B'), N(onlyB.length)], [__('Tamaño distinto'), N(diffSize.length)], [hashOpt.input.checked ? __('Idénticos') : __('Mismo tamaño'), N(identical)]] }));
				if (rows.length) {
					result.appendChild(ui.table([__('Ruta'), __('Diferencia'), __('Tamaño en A'), __('Tamaño en B')], rows, { wrap: true, tall: rows.length > 14 }));
					result.appendChild(ui.actions(ui.button(__('Descargar informe CSV'), { icon: 'download', onClick: function () { CT.download('﻿' + CT.csv.stringify([[__('Ruta'), __('Diferencia'), 'A', 'B']].concat(rows), ';'), 'comparacion-carpetas.csv', 'text/csv;charset=utf-8'); } })));
				} else { result.appendChild(ui.alert('ok', __('No hay diferencias en nombres ni tamaños.'))); }
				CT.track('done');
			};
			if (!hashOpt.input.checked || !sameSize.length) { finish(null); return; }
			var diffs = [], i = 0;
			var next = function () {
				if (i >= sameSize.length) { finish(diffs); return; }
				var k = sameSize[i++];
				progress.set(i / sameSize.length, CT.sprintf(__('Comparando contenido %1$d de %2$d…'), i, sameSize.length));
				Promise.all([digest(a[k]), digest(b[k])]).then(function (r) { if (r[0] !== r[1]) { diffs.push(k); } next(); }).catch(function () { diffs.push(k); next(); });
			};
			next();
		};
		var pick = function (k, label) { return ui.dropzone({ multiple: true, directory: true, compact: true, maxMb: 1e6, title: label, hint: '', onFiles: function (fs) { sets[k] = fs; this_[k].setHint(CT.sprintf(CT._n('%d archivo', '%d archivos', fs.length), fs.length)); run(); } }); };
		var this_ = [];
		this_[0] = pick(0, __('Carpeta A (original)')); this_[1] = pick(1, __('Carpeta B (copia)'));
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, this_[0].el, this_[1].el));
		el.appendChild(hashOpt.el);
		el.appendChild(h('p', { class: 'ct-help', text: __('Útil para comprobar que una copia de seguridad está completa. Se comparan rutas relativas, tamaños y, opcionalmente, el contenido.') }));
		el.appendChild(progress.el);
		el.appendChild(result);
		hashOpt.input.addEventListener('change', run);
	};

	tools.sizes = function (el) {
		var input = ui.field({ label: __('Una línea por elemento: nombre y tamaño con unidad'), type: 'textarea', rows: 8, mono: true, value: 'Fotos 2025  48 GB\nVídeos  1,2 TB\nDocumentos  850 MB\nMúsica  64 GB' });
		var result = ui.result();
		var mult = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1048576, gib: 1073741824, tib: 1099511627776 };
		var run = function () {
			var items = [], bad = [];
			input.input.value.split('\n').forEach(function (l, i) {
				if (!l.trim()) { return; }
				var m = /^(.*?)[\s;:]+(-?[\d.,]+)\s*([kmgt]i?b|b)\s*$/i.exec(l.trim());
				if (!m) { bad.push(i + 1); return; }
				items.push({ name: m[1].trim() || '#' + (i + 1), bytes: CT.parseNum(m[2]) * mult[m[3].toLowerCase()] });
			});
			input.error(bad.length ? CT.sprintf(__('No se entienden las líneas: %s (formato: «Nombre 12 GB»).'), bad.join(', ')) : '');
			if (!items.length) { result.clear(); return; }
			var total = items.reduce(function (a, x) { return a + x.bytes; }, 0);
			items.sort(function (a, b) { return b.bytes - a.bytes; });
			var max = items[0].bytes;
			result.set(ui.resultCard({ label: __('Total'), main: CT.fmt.bytes(total), stats: [[__('En binario'), CT.fmt.bytes(total, true)], [__('Mayor'), items[0].name], [__('Elementos'), N(items.length)]] }),
				ui.table([__('Elemento'), __('Tamaño'), __('% del total'), __('Comparado con el mayor')], items.map(function (x) { return [x.name, CT.fmt.bytes(x.bytes), CT.fmt.percent(x.bytes / total * 100, 1), h('span', { class: 'ct-meter', style: { display: 'block', minWidth: '120px' } }, h('span', { class: 'ct-meter__bar', style: { display: 'block', width: (x.bytes / max * 100) + '%', background: 'var(--ct-primary)' } }))]; }), { num: [1, 2] }));
		};
		el.appendChild(input.el);
		el.appendChild(result.el);
		input.input.addEventListener('input', CT.debounce(run, 200));
		run();
	};

	CT.register('files', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
