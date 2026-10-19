/*!
 * ClickTools — herramientas PDF en el navegador con pdf-lib (MIT) y pdf.js (Apache-2.0).
 * Los documentos no se suben a ningún servidor. Las bibliotecas se cargan bajo demanda.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;
	var PT_PER_MM = 72 / 25.4;
	var SIZES = { a4: [595.28, 841.89], a3: [841.89, 1190.55], a5: [419.53, 595.28], letter: [612, 792], legal: [612, 1008] };

	function libs() { return Promise.all([CT.loadVendor('pdflib'), CT.loadVendor('pdfjs')]); }
	function pdfLib() { return CT.loadVendor('pdflib'); }
	function pdfJs() { return CT.loadVendor('pdfjs'); }

	/* ---------- Utilidades ---------- */
	function readPdf(file) {
		return CT.readFile(file).then(function (buf) {
			var sn = CT.sniff(buf);
			if (!sn || sn.ext !== 'pdf') { throw new Error(CT.sprintf(__('«%s» no es un PDF válido (su contenido no corresponde a un PDF).'), file.name)); }
			return new Uint8Array(buf);
		});
	}
	function loadDoc(bytes, keepMeta) {
		return pdfLib().then(function (L) {
			return L.PDFDocument.load(bytes, { updateMetadata: !keepMeta }).catch(function (e) {
				if (/encrypt/i.test(e.message)) { throw new Error(__('El PDF está protegido con contraseña o cifrado. Desbloquéalo primero (si tienes autorización) y vuelve a intentarlo.')); }
				throw new Error(__('No se ha podido leer el PDF. Puede estar dañado o usar funciones no compatibles.'));
			});
		});
	}
	function newDoc(L) { return L.PDFDocument.create().then(function (d) { d.setProducer('ClickTools'); d.setCreator('ClickTools'); return d; }); }
	function save(doc) { return doc.save({ useObjectStreams: true }).then(function (b) { return new Blob([b], { type: 'application/pdf' }); }); }
	function jsDoc(bytes, password) {
		return pdfJs().then(function (lib) {
			return lib.getDocument({ data: bytes.slice(), password: password, isEvalSupported: false, disableFontFace: false }).promise.catch(function (e) {
				if (e && e.name === 'PasswordException') { throw new Error(__('El PDF está protegido con contraseña.')); }
				throw new Error(__('No se ha podido abrir el PDF. Puede estar dañado.'));
			});
		});
	}
	/** Interpreta rangos «1-3, 5, 8-» (base 1). */
	function parseRanges(text, total) {
		var out = [];
		String(text || '').split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (part) {
			var m = /^(\d+)?\s*[-–]\s*(\d+)?$/.exec(part), a, b;
			if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : total; }
			else if (/^\d+$/.test(part)) { a = b = +part; }
			else { throw new Error(CT.sprintf(__('No se entiende el rango «%s». Usa formatos como 1-3, 5, 8-.'), part)); }
			if (a < 1 || b > total || a > b) { throw new Error(CT.sprintf(__('El rango «%1$s» no es válido: el documento tiene %2$d páginas.'), part, total)); }
			out.push([a, b]);
		});
		if (!out.length) { throw new Error(__('Indica al menos una página o rango.')); }
		return out;
	}
	CT.parseRanges = parseRanges;
	function rangesToIndexes(ranges) { var idx = []; ranges.forEach(function (r) { for (var i = r[0]; i <= r[1]; i++) { idx.push(i - 1); } }); return idx; }
	function hexToRgb(L, hex) { var n = parseInt(hex.slice(1), 16); return L.rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
	function baseOf(file) { return CT.baseName(file && file.name ? file.name : 'documento'); }

	/** Sustituye caracteres que las fuentes estándar (WinAnsi) no pueden codificar. */
	function sanitizeFor(font, text) {
		var bad = {};
		var out = Array.from(text.replace(/\r/g, '').replace(/\t/g, '    ')).map(function (ch) {
			if (ch === '\n') { return ch; }
			try { font.encodeText(ch); return ch; } catch (e) { bad[ch] = 1; return '?'; }
		}).join('');
		return { text: out, bad: Object.keys(bad) };
	}

	/* ---------- Componente: un PDF con miniaturas ---------- */
	/**
	 * opts: { select: 'multi'|false, reorder: bool, rotate: bool, onLoad(info), thumbWidth }
	 * Devuelve un controlador con el estado de las páginas.
	 */
	function pdfPicker(el, opts) {
		opts = opts || {};
		var state = { file: null, bytes: null, pages: [], js: null };
		var drop = ui.dropzone({ accept: '.pdf,application/pdf', hint: opts.hint || __('Selecciona un PDF. Se procesa en tu navegador, sin subirlo.'), onFiles: function (fs) { loadFile(fs[0]); } });
		var info = h('div', { class: 'ct-row', style: { justifyContent: 'space-between' } });
		var grid = h('ul', { class: 'ct-thumbs', role: 'list' });
		var tools = h('div', { class: 'ct-actions' });
		var box = h('div', { hidden: true }, info, tools, grid);
		var progress = ui.progress();
		el.appendChild(drop.el);
		el.appendChild(progress.el);
		el.appendChild(box);

		var renderThumb = function (pg, canvas) {
			return state.js.getPage(pg.index + 1).then(function (page) {
				var vp = page.getViewport({ scale: 1 });
				var scale = (opts.thumbWidth || 140) / vp.width;
				var v = page.getViewport({ scale: scale });
				canvas.width = Math.ceil(v.width); canvas.height = Math.ceil(v.height);
				return page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
			});
		};
		var draw = function () {
			grid.innerHTML = '';
			state.pages.forEach(function (pg, pos) {
				var label = CT.sprintf(__('Página %d'), pg.index + 1);
				var li = h('li', { class: 'ct-thumb' + (pg.selected ? ' is-selected' : '') + (pg.removed ? ' is-removed' : ''), draggable: opts.reorder ? 'true' : null, 'data-pos': String(pos) });
				pg.canvas.style.transform = pg.rot ? 'rotate(' + pg.rot + 'deg)' : '';
				li.appendChild(pg.canvas);
				if (pg.selected && opts.select) { li.appendChild(h('span', { class: 'ct-thumb__badge', 'aria-hidden': 'true', text: '✓' })); }
				li.appendChild(h('span', { text: label + (pg.rot ? ' · ' + pg.rot + '°' : '') }));
				var t = h('span', { class: 'ct-thumb__tools' });
				if (opts.select) {
					var b = h('button', { type: 'button', class: 'ct-btn ct-btn--ghost ct-btn--sm', 'aria-pressed': pg.selected ? 'true' : 'false', 'aria-label': (opts.selectLabel || __('Seleccionar')) + ' ' + label, html: CT.icon('check') });
					b.addEventListener('click', function (e) { e.stopPropagation(); pg.selected = !pg.selected; draw(); emit(); });
					t.appendChild(b);
					li.addEventListener('click', function () { pg.selected = !pg.selected; draw(); emit(); });
				}
				if (opts.rotate) {
					t.appendChild(ui.button('', { icon: 'rotate-ccw', size: 'sm', variant: 'ghost', aria: __('Girar a la izquierda') + ' ' + label, onClick: function (e) { e.stopPropagation(); pg.rot = (pg.rot + 270) % 360; draw(); } }));
					t.appendChild(ui.button('', { icon: 'rotate-cw', size: 'sm', variant: 'ghost', aria: __('Girar a la derecha') + ' ' + label, onClick: function (e) { e.stopPropagation(); pg.rot = (pg.rot + 90) % 360; draw(); } }));
				}
				if (opts.reorder) {
					t.appendChild(ui.button('', { icon: 'chevron-left', size: 'sm', variant: 'ghost', aria: __('Mover antes') + ' ' + label, disabled: pos === 0, onClick: function (e) { e.stopPropagation(); CT.moveItem(state.pages, pos, pos - 1); draw(); } }));
					t.appendChild(ui.button('', { icon: 'chevron-right', size: 'sm', variant: 'ghost', aria: __('Mover después') + ' ' + label, disabled: pos === state.pages.length - 1, onClick: function (e) { e.stopPropagation(); CT.moveItem(state.pages, pos, pos + 1); draw(); } }));
				}
				li.appendChild(t);
				grid.appendChild(li);
			});
		};
		if (opts.reorder) { CT.sortable(grid, '.ct-thumb', function (from, to) { CT.moveItem(state.pages, from, to); draw(); }); }
		var emit = function () { if (opts.onChange) { opts.onChange(state); } };
		var loadFile = function (file) {
			progress.indeterminate(__('Abriendo el PDF…'));
			readPdf(file).then(function (bytes) {
				state.file = file; state.bytes = bytes;
				return jsDoc(bytes).then(function (js) {
					state.js = js;
					state.pages = [];
					for (var i = 0; i < js.numPages; i++) { state.pages.push({ index: i, selected: false, removed: false, rot: 0, canvas: h('canvas', { 'aria-hidden': 'true' }) }); }
					info.innerHTML = '';
					info.appendChild(h('p', { class: 'ct-file__name', text: file.name + ' · ' + CT.sprintf(CT._n('%d página', '%d páginas', js.numPages), js.numPages) + ' · ' + CT.fmt.bytes(file.size) }));
					info.appendChild(ui.button(__('Cambiar de archivo'), { icon: 'refresh-ccw', size: 'sm', variant: 'ghost', onClick: function () { box.hidden = true; drop.el.hidden = false; state.file = null; emit(); } }));
					box.hidden = false; drop.el.hidden = true;
					draw();
					progress.done();
					// Renderizado progresivo de miniaturas para no bloquear la interfaz.
					var limit = Math.min(js.numPages, opts.maxThumbs || 400);
					var k = 0;
					var nextThumb = function () { if (k >= limit || state.js !== js) { return; } renderThumb(state.pages.filter(function (p) { return p.index === k; })[0], state.pages.filter(function (p) { return p.index === k; })[0].canvas).then(function () { k++; nextThumb(); }, function () { k++; nextThumb(); }); };
					nextThumb();
					emit();
					if (opts.onLoad) { opts.onLoad(state); }
				});
			}).catch(function (e) { progress.done(); CT.toast(e.message, 'error'); CT.track('error', 'pdf_open'); });
		};
		state.tools = tools;
		state.redraw = draw;
		state.reset = function () { box.hidden = true; drop.el.hidden = false; state.file = null; };
		return state;
	}

	function runner(el) {
		var progress = ui.progress();
		var result = ui.result();
		el.appendChild(progress.el);
		el.appendChild(result.el);
		return {
			progress: progress, result: result,
			go: function (btn, fn) {
				ui.busy(btn, true);
				result.clear();
				progress.indeterminate(__('Procesando el documento…'));
				return Promise.resolve().then(fn).then(function (out) {
					progress.done(); ui.busy(btn, false);
					if (out && out.blob) {
						CT.download(out.blob, out.name);
						result.set(ui.alert('ok', out.message || CT.sprintf(__('Listo: %1$s (%2$s). La descarga ha comenzado.'), out.name, CT.fmt.bytes(out.blob.size))), out.extra || null,
							h('div', { class: 'ct-actions' }, ui.button(__('Descargar de nuevo'), { icon: 'download', onClick: function () { CT.download(out.blob, out.name); } })));
					}
				}).catch(function (e) { progress.done(); ui.busy(btn, false); CT.fail(result, e); });
			}
		};
	}

	/** Lista de archivos reordenable (PDF e imágenes). */
	function fileQueue(el, accept, hint) {
		var items = [];
		var list = h('ul', { class: 'ct-files' });
		var draw = function () {
			list.innerHTML = '';
			items.forEach(function (it, i) {
				var thumb = h('span', { class: 'ct-file__thumb', html: CT.icon(it.isPdf ? 'file-text' : 'image') });
				if (!it.isPdf) { thumb.innerHTML = ''; thumb.appendChild(h('img', { src: it.url, alt: '' })); }
				list.appendChild(h('li', { class: 'ct-file', draggable: 'true' },
					h('span', { class: 'ct-file__handle', 'aria-hidden': 'true', html: CT.icon('grip-vertical') }), thumb,
					h('span', { class: 'ct-file__body' }, h('span', { class: 'ct-file__name', text: (i + 1) + '. ' + it.file.name }), h('span', { class: 'ct-file__meta', text: CT.fmt.bytes(it.file.size) + (it.pages ? ' · ' + CT.sprintf(CT._n('%d página', '%d páginas', it.pages), it.pages) : '') })),
					h('span', { class: 'ct-file__actions' },
						ui.button('', { icon: 'arrow-up', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Subir') + ' ' + it.file.name, disabled: i === 0, onClick: function () { CT.moveItem(items, i, i - 1); draw(); } }),
						ui.button('', { icon: 'arrow-down', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Bajar') + ' ' + it.file.name, disabled: i === items.length - 1, onClick: function () { CT.moveItem(items, i, i + 1); draw(); } }),
						ui.button('', { icon: 'x', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Quitar') + ' ' + it.file.name, onClick: function () { items.splice(i, 1); draw(); } }))));
			});
			if (api.onChange) { api.onChange(); }
		};
		CT.sortable(list, '.ct-file', function (from, to) { CT.moveItem(items, from, to); draw(); });
		var drop = ui.dropzone({ accept: accept, multiple: true, hint: hint, onFiles: function (fs) {
			fs.forEach(function (f) {
				var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
				var it = { file: f, isPdf: isPdf, url: isPdf ? null : URL.createObjectURL(f) };
				items.push(it);
				if (isPdf) { readPdf(f).then(function (b) { return jsDoc(b); }).then(function (d) { it.pages = d.numPages; draw(); }).catch(function (e) { it.error = e.message; CT.toast(e.message, 'error'); }); }
			});
			draw();
		} });
		el.appendChild(drop.el);
		el.appendChild(list);
		var api = { items: function () { return items; }, sort: function (fn) { items.sort(fn); draw(); }, clear: function () { items = []; draw(); } };
		return api;
	}

	/** Inserta una imagen (cualquier formato del navegador) en un documento pdf-lib. */
	function embedImage(doc, file) {
		return CT.readFile(file).then(function (buf) {
			var sn = CT.sniff(buf);
			if (sn && sn.ext === 'jpg') { return doc.embedJpg(buf); }
			if (sn && sn.ext === 'png') { return doc.embedPng(buf); }
			return CT.loadImage(file).then(function (r) {
				var c = document.createElement('canvas'); c.width = r.width; c.height = r.height;
				c.getContext('2d').drawImage(r.img, 0, 0);
				URL.revokeObjectURL(r.url);
				return CT.canvasToBlob(c, 'image/png').then(function (b) { return b.arrayBuffer(); }).then(function (png) { return doc.embedPng(png); });
			});
		});
	}

	var tools = {};

	tools.merge = function (el) {
		var queue = fileQueue(el, '.pdf,application/pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', __('PDF e imágenes (JPG, PNG, WebP). Puedes ordenarlos arrastrando o con las flechas.'));
		var name = ui.field({ label: __('Nombre del archivo final'), value: 'documento-unido' });
		var r = runner(el);
		var btn = ui.button(__('Unir en un PDF'), { variant: 'primary', icon: 'combine', onClick: function () {
			var items = queue.items();
			if (items.length < 1) { CT.toast(__('Añade al menos dos archivos.'), 'error'); return; }
			r.go(btn, function () {
				return pdfLib().then(function (L) {
					return newDoc(L).then(function (out) {
						var chain = Promise.resolve();
						items.forEach(function (it, i) {
							chain = chain.then(function () {
								r.progress.set(i / items.length, CT.sprintf(__('Añadiendo %1$d de %2$d: %3$s'), i + 1, items.length, it.file.name));
								if (it.isPdf) {
									return readPdf(it.file).then(function (b) { return loadDoc(b); }).then(function (src) {
										return out.copyPages(src, src.getPageIndices()).then(function (pages) { pages.forEach(function (p) { out.addPage(p); }); });
									}).catch(function (e) { throw new Error(it.file.name + ': ' + e.message); });
								}
								return embedImage(out, it.file).then(function (img) {
									var w = img.width * 0.75, hh = img.height * 0.75;
									var page = out.addPage([w, hh]);
									page.drawImage(img, { x: 0, y: 0, width: w, height: hh });
								});
							});
						});
						return chain.then(function () { return save(out); }).then(function (blob) { return { blob: blob, name: CT.safeName(name.input.value || 'documento-unido') + '.pdf', message: CT.sprintf(__('Documento unido: %1$d páginas, %2$s.'), out.getPageCount(), CT.fmt.bytes(blob.size)) }; });
					});
				});
			});
		} });
		el.insertBefore(h('div', null, h('div', { class: 'ct-cols' }, name.el), ui.actions(btn, ui.button(__('Ordenar por nombre'), { icon: 'arrow-down-a-z', variant: 'ghost', onClick: function () { queue.sort(function (a, b) { return a.file.name.localeCompare(b.file.name, 'es', { numeric: true }); }); } }), ui.button(__('Vaciar'), { icon: 'trash-2', variant: 'ghost', onClick: queue.clear }))), r.progress.el);
	};

	tools.split = function (el) {
		var mode = ui.seg({ label: __('Cómo dividir'), value: 'ranges', options: [{ value: 'ranges', label: __('Por rangos') }, { value: 'each', label: __('Cada página por separado') }, { value: 'every', label: __('Cada N páginas') }] });
		var ranges = ui.field({ label: __('Rangos (cada rango será un PDF)'), value: '1-3, 4-', mono: true, help: __('Ejemplo: 1-3, 4-6, 7- (el último hasta el final).') });
		var every = ui.field({ label: __('Páginas por archivo'), type: 'number', integer: true, value: 2 });
		var picker = pdfPicker(el, {});
		var opts = h('div', { class: 'ct-panel' }, mode.el, h('div', { class: 'ct-cols' }, ranges.el, every.el));
		var r = runner(el);
		var upd = function () { ranges.el.hidden = mode.get() !== 'ranges'; every.el.hidden = mode.get() !== 'every'; };
		mode.el.addEventListener('change', upd); upd();
		var btn = ui.button(__('Dividir PDF'), { variant: 'primary', icon: 'scissors', onClick: function () {
			if (!picker.file) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			r.go(btn, function () {
				var total = picker.pages.length, groups = [];
				if (mode.get() === 'each') { for (var i = 1; i <= total; i++) { groups.push([i, i]); } }
				else if (mode.get() === 'every') {
					var n = every.get();
					if (!(n >= 1)) { throw new Error(__('Indica cuántas páginas debe tener cada archivo.')); }
					for (var j = 1; j <= total; j += n) { groups.push([j, Math.min(total, j + n - 1)]); }
				} else { groups = parseRanges(ranges.input.value, total); }
				return Promise.all([pdfLib(), loadDoc(picker.bytes, true)]).then(function (res) {
					var L = res[0], src = res[1], files = [];
					var chain = Promise.resolve();
					groups.forEach(function (g, gi) {
						chain = chain.then(function () {
							r.progress.set(gi / groups.length, CT.sprintf(__('Creando archivo %1$d de %2$d…'), gi + 1, groups.length));
							return newDoc(L).then(function (d) {
								var idx = []; for (var p = g[0]; p <= g[1]; p++) { idx.push(p - 1); }
								return d.copyPages(src, idx).then(function (pages) { pages.forEach(function (pg) { d.addPage(pg); }); return save(d); });
							}).then(function (blob) { files.push({ name: baseOf(picker.file) + '-' + (g[0] === g[1] ? 'p' + g[0] : 'p' + g[0] + '-' + g[1]) + '.pdf', data: blob }); });
						});
					});
					return chain.then(function () {
						if (files.length === 1) { return { blob: files[0].data, name: files[0].name }; }
						return CT.zip.create(files).then(function (z) { return { blob: z, name: baseOf(picker.file) + '-dividido.zip', message: CT.sprintf(__('%d archivos PDF creados y agrupados en un ZIP.'), files.length) }; });
					});
				});
			});
		} });
		el.insertBefore(opts, r.progress.el);
		el.insertBefore(ui.actions(btn), r.progress.el);
	};

	function selectionTool(el, cfg) {
		var picker = pdfPicker(el, { select: 'multi', reorder: cfg.reorder, rotate: cfg.rotate, selectLabel: cfg.selectLabel, onChange: function () { updCount(); } });
		var count = h('p', { class: 'ct-help', 'aria-live': 'polite' });
		var rangeF = ui.field({ label: __('O escribe las páginas'), value: '', mono: true, placeholder: '1-3, 5' });
		var updCount = function () { if (!picker.pages) { return; } var n = picker.pages.filter(function (p) { return p.selected; }).length; count.textContent = cfg.countText ? cfg.countText(n, picker.pages.length) : ''; };
		var r = runner(el);
		var extra = cfg.options ? cfg.options() : null;
		rangeF.input.addEventListener('change', function () {
			if (!picker.file || !rangeF.input.value.trim()) { return; }
			try {
				var idx = rangesToIndexes(parseRanges(rangeF.input.value, picker.pages.length));
				picker.pages.forEach(function (p) { p.selected = idx.indexOf(p.index) >= 0; });
				rangeF.error(''); picker.redraw(); updCount();
			} catch (e) { rangeF.error(e.message); }
		});
		var btn = ui.button(cfg.button, { variant: 'primary', icon: cfg.icon, onClick: function () {
			if (!picker.file) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			r.go(btn, function () { return cfg.run(picker, r); });
		} });
		var bar = h('div', { class: 'ct-panel' }, cfg.help ? h('p', { class: 'ct-help', text: cfg.help }) : null, cfg.extraButtons ? h('div', { class: 'ct-actions' }, cfg.extraButtons(picker)) : null, cfg.select === false ? null : h('div', { class: 'ct-cols' }, rangeF.el), count, extra,
			cfg.select === false ? null : h('div', { class: 'ct-actions' },
				ui.button(__('Seleccionar todas'), { size: 'sm', variant: 'ghost', onClick: function () { picker.pages.forEach(function (p) { p.selected = true; }); picker.redraw(); updCount(); } }),
				ui.button(__('Ninguna'), { size: 'sm', variant: 'ghost', onClick: function () { picker.pages.forEach(function (p) { p.selected = false; }); picker.redraw(); updCount(); } }),
				cfg.reorder ? ui.button(__('Invertir orden'), { size: 'sm', variant: 'ghost', onClick: function () { picker.pages.reverse(); picker.redraw(); } }) : null));
		el.insertBefore(bar, r.progress.el);
		el.insertBefore(ui.actions(btn), r.progress.el);
		return picker;
	}

	function copyOut(picker, indexes, rotations, suffix, message) {
		return Promise.all([pdfLib(), loadDoc(picker.bytes, true)]).then(function (res) {
			var L = res[0], src = res[1];
			return newDoc(L).then(function (d) {
				return d.copyPages(src, indexes).then(function (pages) {
					pages.forEach(function (pg, i) {
						if (rotations && rotations[i]) { pg.setRotation(L.degrees((pg.getRotation().angle + rotations[i]) % 360)); }
						d.addPage(pg);
					});
					return save(d);
				});
			}).then(function (blob) { return { blob: blob, name: baseOf(picker.file) + '-' + suffix + '.pdf', message: message ? message(indexes.length, blob) : null }; });
		});
	}

	tools.extract = function (el) {
		selectionTool(el, {
			button: __('Extraer páginas'), icon: 'file-output', selectLabel: __('Seleccionar'),
			countText: function (n, t) { return CT.sprintf(__('%1$d de %2$d páginas seleccionadas para extraer.'), n, t); },
			run: function (p) {
				var idx = p.pages.filter(function (x) { return x.selected; }).map(function (x) { return x.index; }).sort(function (a, b) { return a - b; });
				if (!idx.length) { throw new Error(__('Selecciona al menos una página.')); }
				return copyOut(p, idx, null, 'extracto');
			}
		});
	};

	tools['delete'] = function (el) {
		selectionTool(el, {
			button: __('Eliminar páginas seleccionadas'), icon: 'file-minus', selectLabel: __('Marcar para eliminar'),
			countText: function (n, t) { return CT.sprintf(__('%1$d páginas marcadas para eliminar. Quedarán %2$d.'), n, t - n); },
			run: function (p) {
				var keep = p.pages.filter(function (x) { return !x.selected; }).map(function (x) { return x.index; }).sort(function (a, b) { return a - b; });
				if (keep.length === p.pages.length) { throw new Error(__('Marca al menos una página para eliminar.')); }
				if (!keep.length) { throw new Error(__('No puedes eliminar todas las páginas.')); }
				return copyOut(p, keep, null, 'editado');
			}
		});
	};

	tools.reorder = function (el) {
		selectionTool(el, {
			button: __('Guardar nuevo orden'), icon: 'arrow-up-down', reorder: true, select: false,
			help: __('Arrastra las miniaturas o usa las flechas de cada página para cambiar el orden.'),
			run: function (p) { return copyOut(p, p.pages.map(function (x) { return x.index; }), null, 'ordenado'); }
		});
	};

	tools.rotate = function (el) {
		selectionTool(el, {
			button: __('Guardar PDF girado'), icon: 'rotate-cw', rotate: true, select: false,
			help: __('Gira cada página con sus botones o todas a la vez.'),
			extraButtons: function (p) {
				return [
					ui.button(__('Girar todas a la derecha'), { icon: 'rotate-cw', size: 'sm', onClick: function () { if (!p.file) { return; } p.pages.forEach(function (x) { x.rot = (x.rot + 90) % 360; }); p.redraw(); } }),
					ui.button(__('Girar todas a la izquierda'), { icon: 'rotate-ccw', size: 'sm', onClick: function () { if (!p.file) { return; } p.pages.forEach(function (x) { x.rot = (x.rot + 270) % 360; }); p.redraw(); } })
				];
			},
			run: function (pk) {
				var idx = pk.pages.map(function (x) { return x.index; });
				return copyOut(pk, idx, pk.pages.map(function (x) { return x.rot; }), 'girado');
			}
		});
	};

	function renderPage(js, n, scale) {
		return js.getPage(n).then(function (page) {
			var v = page.getViewport({ scale: scale });
			var c = document.createElement('canvas');
			c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
			var ctx = c.getContext('2d');
			ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
			return page.render({ canvasContext: ctx, viewport: v }).promise.then(function () { var base = page.getViewport({ scale: 1 }); page.cleanup(); return { canvas: c, w: base.width, h: base.height }; });
		});
	}

	tools.compress = function (el) {
		var mode = ui.seg({ label: __('Método'), value: 'optimize', options: [{ value: 'optimize', label: __('Optimizar estructura (sin pérdida)') }, { value: 'raster', label: __('Convertir páginas en imágenes (máxima reducción)') }] });
		var dpi = ui.field({ label: __('Resolución'), type: 'select', value: '120', options: [{ value: '72', label: __('72 ppp (pantalla, muy ligero)') }, { value: '100', label: '100 ppp' }, { value: '120', label: __('120 ppp (equilibrado)') }, { value: '150', label: __('150 ppp (buena lectura)') }, { value: '200', label: __('200 ppp (impresión)') }] });
		var q = ui.field({ label: __('Calidad JPEG'), type: 'select', value: '0.7', options: [{ value: '0.5', label: '50' }, { value: '0.6', label: '60' }, { value: '0.7', label: '70' }, { value: '0.8', label: '80' }, { value: '0.9', label: '90' }] });
		var gray = ui.field({ type: 'checkbox', label: __('Escala de grises (aún más ligero)'), value: false });
		var note = h('div');
		var picker = pdfPicker(el, { thumbWidth: 90, maxThumbs: 40 });
		var r = runner(el);
		var upd = function () {
			var ras = mode.get() === 'raster';
			dpi.el.hidden = q.el.hidden = gray.el.hidden = !ras;
			note.innerHTML = '';
			note.appendChild(ui.alert(ras ? 'warn' : 'info', ras ? __('Cada página se convierte en una imagen JPEG: reduce mucho los PDF escaneados o con fotos, pero el texto deja de ser seleccionable y buscable, y se pierden enlaces y formularios.') : __('Reorganiza la estructura interna y elimina objetos no utilizados conservando el texto, la calidad y los enlaces. La reducción depende del documento y puede ser pequeña.')));
		};
		mode.el.addEventListener('change', upd); upd();
		var btn = ui.button(__('Comprimir PDF'), { variant: 'primary', icon: 'minimize-2', onClick: function () {
			if (!picker.file) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			r.go(btn, function () {
				var original = picker.file.size;
				var finish = function (blob) {
					var diff = original - blob.size;
					if (diff <= 0) {
						return { blob: null, extra: null, warn: true, size: blob.size };
					}
					return { blob: blob, name: baseOf(picker.file) + '-comprimido.pdf', message: CT.sprintf(__('PDF comprimido: %1$s → %2$s (−%3$s %%).'), CT.fmt.bytes(original), CT.fmt.bytes(blob.size), N(diff / original * 100, 1)) };
				};
				var p;
				if (mode.get() === 'optimize') {
					p = loadDoc(picker.bytes, true).then(save);
				} else {
					var scale = parseInt(dpi.input.value, 10) / 72, quality = parseFloat(q.input.value), total = picker.pages.length;
					p = pdfLib().then(function (L) {
						return newDoc(L).then(function (out) {
							var chain = Promise.resolve();
							for (var i = 1; i <= total; i++) {
								(function (n) {
									chain = chain.then(function () {
										r.progress.set((n - 1) / total, CT.sprintf(__('Procesando página %1$d de %2$d…'), n, total));
										return renderPage(picker.js, n, scale).then(function (pg) {
											if (gray.input.checked) {
												var ctx = pg.canvas.getContext('2d'), id = ctx.getImageData(0, 0, pg.canvas.width, pg.canvas.height), d = id.data;
												for (var k = 0; k < d.length; k += 4) { var y = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; d[k] = d[k + 1] = d[k + 2] = y; }
												ctx.putImageData(id, 0, 0);
											}
											return CT.canvasToBlob(pg.canvas, 'image/jpeg', quality).then(function (b) { return b.arrayBuffer(); }).then(function (jpg) {
												return out.embedJpg(jpg).then(function (img) { var page = out.addPage([pg.w, pg.h]); page.drawImage(img, { x: 0, y: 0, width: pg.w, height: pg.h }); });
											});
										});
									});
								})(i);
							}
							return chain.then(function () { return save(out); });
						});
					});
				}
				return p.then(finish).then(function (res) {
					if (res.warn) {
						r.result.set(ui.alert('warn', CT.sprintf(__('El resultado (%1$s) no es más pequeño que el original (%2$s): este PDF ya estaba optimizado. Conserva el original o prueba el método de convertir páginas en imágenes con menor resolución.'), CT.fmt.bytes(res.size), CT.fmt.bytes(original))));
						return null;
					}
					return res;
				});
			});
		} });
		el.insertBefore(h('div', { class: 'ct-panel' }, mode.el, h('div', { class: 'ct-cols' }, dpi.el, q.el), gray.el, note), r.progress.el);
		el.insertBefore(ui.actions(btn), r.progress.el);
	};

	tools.img2pdf = function (el) {
		var queue = fileQueue(el, 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp', __('JPG, PNG, WebP, GIF o BMP. Cada imagen será una página; ordénalas como quieras.'));
		var size = ui.field({ label: __('Tamaño de página'), type: 'select', value: 'a4', options: [{ value: 'fit', label: __('Igual que cada imagen') }, { value: 'a4', label: 'A4' }, { value: 'letter', label: __('Carta (Letter)') }, { value: 'a5', label: 'A5' }, { value: 'a3', label: 'A3' }] });
		var orient = ui.field({ label: __('Orientación'), type: 'select', value: 'auto', options: [{ value: 'auto', label: __('Automática según la imagen') }, { value: 'portrait', label: __('Vertical') }, { value: 'landscape', label: __('Horizontal') }] });
		var margin = ui.field({ label: __('Margen'), type: 'select', value: '10', options: [0, 5, 10, 15, 20].map(function (m) { return { value: String(m), label: m + ' mm' }; }) });
		var name = ui.field({ label: __('Nombre del archivo'), value: 'imagenes' });
		var r = runner(el);
		var btn = ui.button(__('Crear PDF'), { variant: 'primary', icon: 'file-plus', onClick: function () {
			var items = queue.items();
			if (!items.length) { CT.toast(__('Añade al menos una imagen.'), 'error'); return; }
			r.go(btn, function () {
				return pdfLib().then(function (L) {
					return newDoc(L).then(function (out) {
						var chain = Promise.resolve();
						items.forEach(function (it, i) {
							chain = chain.then(function () {
								r.progress.set(i / items.length, CT.sprintf(__('Añadiendo imagen %1$d de %2$d…'), i + 1, items.length));
								return embedImage(out, it.file).then(function (img) {
									var iw = img.width * 0.75, ih = img.height * 0.75, pw, ph;
									if (size.input.value === 'fit') { pw = iw; ph = ih; }
									else {
										var s = SIZES[size.input.value];
										var land = orient.input.value === 'landscape' || (orient.input.value === 'auto' && iw > ih);
										pw = land ? s[1] : s[0]; ph = land ? s[0] : s[1];
									}
									var m = size.input.value === 'fit' ? 0 : parseInt(margin.input.value, 10) * PT_PER_MM;
									var k = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih, size.input.value === 'fit' ? 1 : Infinity);
									var page = out.addPage([pw, ph]);
									page.drawImage(img, { x: (pw - iw * k) / 2, y: (ph - ih * k) / 2, width: iw * k, height: ih * k });
								}).catch(function (e) { throw new Error(it.file.name + ': ' + (e.message || __('imagen no válida'))); });
							});
						});
						return chain.then(function () { return save(out); }).then(function (blob) { return { blob: blob, name: CT.safeName(name.input.value || 'imagenes') + '.pdf' }; });
					});
				});
			});
		} });
		el.insertBefore(h('div', null, h('div', { class: 'ct-cols' }, size.el, orient.el, margin.el, name.el), ui.actions(btn, ui.button(__('Vaciar'), { icon: 'trash-2', variant: 'ghost', onClick: queue.clear }))), r.progress.el);
	};

	tools.pdf2img = function (el) {
		var fmt = ui.field({ label: __('Formato'), type: 'select', value: 'png', options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }] });
		var dpi = ui.field({ label: __('Resolución'), type: 'select', value: '150', options: [72, 96, 150, 200, 300].map(function (d) { return { value: String(d), label: d + ' ppp' }; }) });
		var pages = ui.field({ label: __('Páginas (vacío = todas)'), value: '', mono: true, placeholder: '1-3, 5' });
		var picker = pdfPicker(el, { thumbWidth: 100, maxThumbs: 60 });
		var r = runner(el);
		var btn = ui.button(__('Convertir a imágenes'), { variant: 'primary', icon: 'image-down', onClick: function () {
			if (!picker.file) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			r.go(btn, function () {
				var total = picker.pages.length;
				var idx = pages.input.value.trim() ? rangesToIndexes(parseRanges(pages.input.value, total)) : picker.pages.map(function (x, i) { return i; });
				if (idx.length > 300) { throw new Error(__('Convierte como máximo 300 páginas a la vez.')); }
				var scale = parseInt(dpi.input.value, 10) / 72, files = [];
				var mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[fmt.input.value];
				var chain = Promise.resolve();
				idx.forEach(function (i, k) {
					chain = chain.then(function () {
						r.progress.set(k / idx.length, CT.sprintf(__('Convirtiendo página %1$d (%2$d de %3$d)…'), i + 1, k + 1, idx.length));
						return renderPage(picker.js, i + 1, scale).then(function (pg) {
							if (pg.canvas.width * pg.canvas.height > 50e6) { throw new Error(__('La página es demasiado grande para esa resolución. Elige menos ppp.')); }
							return CT.canvasToBlob(pg.canvas, mime, 0.9);
						}).then(function (b) { files.push({ name: baseOf(picker.file) + '-pagina-' + String(i + 1).padStart(3, '0') + '.' + fmt.input.value, data: b }); });
					});
				});
				return chain.then(function () {
					if (files.length === 1) { return { blob: files[0].data, name: files[0].name }; }
					return CT.zip.create(files).then(function (z) { return { blob: z, name: baseOf(picker.file) + '-imagenes.zip', message: CT.sprintf(__('%d imágenes creadas y agrupadas en un ZIP.'), files.length) }; });
				});
			});
		} });
		el.insertBefore(h('div', { class: 'ct-cols' }, fmt.el, dpi.el, pages.el), r.progress.el);
		el.insertBefore(ui.actions(btn), r.progress.el);
	};

	/** Herramientas que dibujan sobre las páginas de un PDF. */
	function stampTool(el, cfg) {
		var picker = pdfPicker(el, { thumbWidth: 90, maxThumbs: 30, onLoad: function (s) { if (cfg.onLoad) { cfg.onLoad(s); } } });
		var panel = h('div', { class: 'ct-panel' });
		var get = cfg.options(panel, picker);
		var r = runner(el);
		var btn = ui.button(cfg.button, { variant: 'primary', icon: cfg.icon, onClick: function () {
			if (!picker.file) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			var o = get();
			if (o === false) { return; }
			r.go(btn, function () {
				return Promise.all([pdfLib(), loadDoc(picker.bytes, true)]).then(function (res) {
					var L = res[0], doc = res[1];
					return Promise.resolve(cfg.apply(L, doc, o, picker)).then(function (msg) {
						return save(doc).then(function (blob) { return { blob: blob, name: baseOf(picker.file) + '-' + cfg.suffix + '.pdf', extra: msg ? ui.alert('warn', msg) : null }; });
					});
				});
			});
		} });
		el.insertBefore(panel, r.progress.el);
		el.insertBefore(ui.actions(btn), r.progress.el);
		return picker;
	}
	function pageBox(page) {
		var box = page.getCropBox ? page.getCropBox() : { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() };
		return box;
	}

	tools.pagenum = function (el) {
		stampTool(el, {
			button: __('Numerar páginas'), icon: 'list-ordered', suffix: 'numerado',
			options: function (panel) {
				var pos = ui.field({ label: __('Posición'), type: 'select', value: 'bc', options: [{ value: 'bc', label: __('Abajo, centrado') }, { value: 'br', label: __('Abajo, derecha') }, { value: 'bl', label: __('Abajo, izquierda') }, { value: 'tc', label: __('Arriba, centrado') }, { value: 'tr', label: __('Arriba, derecha') }, { value: 'tl', label: __('Arriba, izquierda') }] });
				var fmt = ui.field({ label: __('Formato'), type: 'select', value: 'n', options: [{ value: 'n', label: '1, 2, 3' }, { value: 'pn', label: __('Página 1') }, { value: 'pnt', label: __('Página 1 de 10') }, { value: 'nt', label: '1 / 10' }, { value: 'dash', label: '- 1 -' }] });
				var start = ui.field({ label: __('Empezar en el número'), type: 'number', integer: true, value: 1 });
				var from = ui.field({ label: __('Numerar desde la página'), type: 'number', integer: true, value: 1, help: __('Por ejemplo, 2 para no numerar la portada.') });
				var size = ui.field({ label: __('Tamaño de letra'), type: 'number', integer: true, unit: 'pt', value: 10 });
				var margin = ui.field({ label: __('Margen'), type: 'number', unit: 'mm', value: 10 });
				panel.appendChild(h('div', { class: 'ct-cols' }, pos.el, fmt.el, start.el, from.el, size.el, margin.el));
				return function () { return { pos: pos.input.value, fmt: fmt.input.value, start: start.get() || 1, from: from.get() || 1, size: size.get() || 10, margin: (margin.get() || 10) * PT_PER_MM }; };
			},
			apply: function (L, doc, o) {
				return doc.embedFont(L.StandardFonts.Helvetica).then(function (font) {
					var pages = doc.getPages(), total = pages.length - o.from + 1;
					pages.forEach(function (page, i) {
						if (i + 1 < o.from) { return; }
						var n = o.start + i - o.from + 1;
						var last = total + o.start - 1;
						var txt = { n: String(n), pn: CT.sprintf(__('Página %d'), n), pnt: CT.sprintf(__('Página %1$d de %2$d'), n, last), nt: n + ' / ' + last, dash: '- ' + n + ' -' }[o.fmt];
						var b = pageBox(page), w = font.widthOfTextAtSize(txt, o.size);
						var x = o.pos[1] === 'c' ? b.x + (b.width - w) / 2 : o.pos[1] === 'r' ? b.x + b.width - o.margin - w : b.x + o.margin;
						var y = o.pos[0] === 'b' ? b.y + o.margin : b.y + b.height - o.margin - o.size;
						page.drawText(txt, { x: x, y: y, size: o.size, font: font, color: L.rgb(0.2, 0.2, 0.2) });
					});
				});
			}
		});
	};

	tools.watermark = function (el) {
		stampTool(el, {
			button: __('Añadir marca de agua'), icon: 'stamp', suffix: 'marca-agua',
			options: function (panel) {
				var text = ui.field({ label: __('Texto de la marca de agua'), value: __('CONFIDENCIAL') });
				var size = ui.field({ label: __('Tamaño'), type: 'number', integer: true, unit: 'pt', value: 60 });
				var opacity = ui.field({ label: __('Opacidad'), type: 'select', value: '0.15', options: [0.08, 0.15, 0.25, 0.4, 0.6].map(function (x) { return { value: String(x), label: Math.round(x * 100) + ' %' }; }) });
				var angle = ui.field({ label: __('Ángulo'), type: 'select', value: '45', options: [0, 30, 45, 60, 90].map(function (x) { return { value: String(x), label: x + '°' }; }) });
				var layout = ui.field({ label: __('Distribución'), type: 'select', value: 'center', options: [{ value: 'center', label: __('Una vez, centrada') }, { value: 'tile', label: __('En mosaico') }] });
				var color = h('input', { type: 'color', class: 'ct-color', value: '#c22a37', 'aria-label': __('Color') });
				panel.appendChild(h('div', { class: 'ct-cols' }, text.el, size.el, opacity.el, angle.el, layout.el, h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', text: __('Color') }), color)));
				return function () {
					if (!text.input.value.trim()) { text.error(__('Escribe el texto.')); return false; }
					text.error('');
					return { text: text.input.value.trim(), size: size.get() || 60, opacity: parseFloat(opacity.input.value), angle: parseInt(angle.input.value, 10), tile: layout.input.value === 'tile', color: color.value };
				};
			},
			apply: function (L, doc, o) {
				return doc.embedFont(L.StandardFonts.HelveticaBold).then(function (font) {
					var s = sanitizeFor(font, o.text);
					var w = font.widthOfTextAtSize(s.text, o.size), rad = o.angle * Math.PI / 180;
					doc.getPages().forEach(function (page) {
						var b = pageBox(page);
						var drawAt = function (cx, cy) {
							var x = cx - (w / 2) * Math.cos(rad) + (o.size / 3) * Math.sin(rad), y = cy - (w / 2) * Math.sin(rad) - (o.size / 3) * Math.cos(rad);
							page.drawText(s.text, { x: x, y: y, size: o.size, font: font, color: hexToRgb(L, o.color), opacity: o.opacity, rotate: L.degrees(o.angle) });
						};
						if (o.tile) {
							var stepX = w * 1.1 + 40, stepY = o.size * 4;
							for (var yy = b.y; yy < b.y + b.height + stepY; yy += stepY) { for (var xx = b.x; xx < b.x + b.width + stepX; xx += stepX) { drawAt(xx, yy); } }
						} else { drawAt(b.x + b.width / 2, b.y + b.height / 2); }
					});
					return s.bad.length ? CT.sprintf(__('Algunos caracteres no son compatibles con la fuente estándar y se han sustituido por «?»: %s'), s.bad.join(' ')) : null;
				});
			}
		});
	};

	/** Vista previa en la que se pulsa para colocar un elemento. */
	function placer(picker, container) {
		var state = { page: 1, fx: 0.5, fy: 0.5 };
		var mark = h('span', { class: 'ct-placer__mark', 'aria-hidden': 'true' });
		var holder = h('div', { class: 'ct-placer', title: __('Pulsa para elegir la posición') });
		var pageF = ui.field({ label: __('Página'), type: 'number', integer: true, value: 1 });
		var posF = ui.field({ label: __('Posición rápida'), type: 'select', value: 'center', options: [{ value: 'center', label: __('Centro') }, { value: 'tl', label: __('Arriba izquierda') }, { value: 'tr', label: __('Arriba derecha') }, { value: 'bl', label: __('Abajo izquierda') }, { value: 'br', label: __('Abajo derecha') }, { value: 'custom', label: __('Donde pulse en la vista previa') }] });
		var draw = function () {
			if (!picker.js) { return; }
			var n = Math.max(1, Math.min(picker.pages.length, pageF.get() || 1));
			state.page = n;
			renderPage(picker.js, n, 1).then(function (pg) {
				holder.innerHTML = '';
				var c = pg.canvas; c.style.maxHeight = '420px'; c.style.width = 'auto';
				holder.appendChild(c); holder.appendChild(mark);
				var place = function () { mark.style.left = state.fx * 100 + '%'; mark.style.top = state.fy * 100 + '%'; };
				holder.onclick = function (e) { var rc = c.getBoundingClientRect(); state.fx = (e.clientX - rc.left) / rc.width; state.fy = (e.clientY - rc.top) / rc.height; posF.input.value = 'custom'; place(); };
				place();
			});
		};
		posF.input.addEventListener('change', function () {
			var p = { center: [0.5, 0.5], tl: [0.12, 0.08], tr: [0.88, 0.08], bl: [0.12, 0.92], br: [0.88, 0.92] }[posF.input.value];
			if (p) { state.fx = p[0]; state.fy = p[1]; mark.style.left = state.fx * 100 + '%'; mark.style.top = state.fy * 100 + '%'; }
		});
		pageF.input.addEventListener('change', draw);
		container.appendChild(h('div', { class: 'ct-cols' }, pageF.el, posF.el));
		container.appendChild(h('div', { style: { textAlign: 'center' } }, holder));
		state.redraw = draw;
		return state;
	}

	tools.addtext = function (el) {
		var pl;
		stampTool(el, {
			button: __('Añadir texto y descargar'), icon: 'type', suffix: 'con-texto',
			onLoad: function () { pl.redraw(); },
			options: function (panel, pk) {
				var text = ui.field({ label: __('Texto'), type: 'textarea', rows: 3, value: __('Firmado y conforme') });
				var size = ui.field({ label: __('Tamaño'), type: 'number', integer: true, unit: 'pt', value: 14 });
				var font = ui.field({ label: __('Fuente'), type: 'select', value: 'Helvetica', options: [{ value: 'Helvetica', label: 'Helvetica' }, { value: 'HelveticaBold', label: 'Helvetica Bold' }, { value: 'TimesRoman', label: 'Times' }, { value: 'Courier', label: 'Courier' }] });
				var color = h('input', { type: 'color', class: 'ct-color', value: '#111111', 'aria-label': __('Color') });
				var all = ui.field({ type: 'checkbox', label: __('Repetir en todas las páginas'), value: false });
				panel.appendChild(h('div', { class: 'ct-cols' }, text.el, size.el, font.el, h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', text: __('Color') }), color)));
				panel.appendChild(all.el);
				pl = placer(pk, panel);
				return function () {
					if (!text.input.value.trim()) { text.error(__('Escribe el texto.')); return false; }
					text.error('');
					return { text: text.input.value, size: size.get() || 14, font: font.input.value, color: color.value, all: all.input.checked };
				};
			},
			apply: function (L, doc, o) {
				return doc.embedFont(L.StandardFonts[o.font]).then(function (font) {
					var s = sanitizeFor(font, o.text);
					var lines = s.text.split('\n');
					var pages = o.all ? doc.getPages() : [doc.getPage(pl.page - 1)];
					pages.forEach(function (page) {
						var b = pageBox(page);
						var x = b.x + pl.fx * b.width, y = b.y + (1 - pl.fy) * b.height;
						lines.forEach(function (line, i) { page.drawText(line, { x: x, y: y - i * o.size * 1.25, size: o.size, font: font, color: hexToRgb(L, o.color) }); });
					});
					return s.bad.length ? CT.sprintf(__('Algunos caracteres no son compatibles con la fuente estándar y se han sustituido por «?»: %s'), s.bad.join(' ')) : null;
				});
			}
		});
	};

	tools.addimage = function (el) {
		var pl, imgFile = null;
		stampTool(el, {
			button: __('Insertar imagen y descargar'), icon: 'image', suffix: 'con-imagen',
			onLoad: function () { pl.redraw(); },
			options: function (panel, pk) {
				var imgDrop = ui.dropzone({ accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', compact: true, title: __('Imagen a insertar (firma, logotipo, sello…)'), hint: '', onFiles: function (fs) { imgFile = fs[0]; imgDrop.setHint(fs[0].name); } });
				var width = ui.field({ label: __('Ancho en la página'), type: 'select', value: '25', options: [10, 15, 20, 25, 35, 50, 75, 100].map(function (p) { return { value: String(p), label: p + ' %' }; }) });
				var opacity = ui.field({ label: __('Opacidad'), type: 'select', value: '1', options: [1, 0.8, 0.6, 0.4, 0.2].map(function (x) { return { value: String(x), label: Math.round(x * 100) + ' %' }; }) });
				var all = ui.field({ type: 'checkbox', label: __('Repetir en todas las páginas'), value: false });
				panel.appendChild(imgDrop.el);
				panel.appendChild(h('div', { class: 'ct-cols', style: { marginTop: '12px' } }, width.el, opacity.el));
				panel.appendChild(all.el);
				pl = placer(pk, panel);
				return function () { if (!imgFile) { CT.toast(__('Elige la imagen que quieres insertar.'), 'error'); return false; } return { w: parseInt(width.input.value, 10) / 100, op: parseFloat(opacity.input.value), all: all.input.checked }; };
			},
			apply: function (L, doc, o) {
				return embedImage(doc, imgFile).then(function (img) {
					var pages = o.all ? doc.getPages() : [doc.getPage(pl.page - 1)];
					pages.forEach(function (page) {
						var b = pageBox(page), w = b.width * o.w, hh = w * img.height / img.width;
						page.drawImage(img, { x: b.x + pl.fx * b.width - w / 2, y: b.y + (1 - pl.fy) * b.height - hh / 2, width: w, height: hh, opacity: o.op });
					});
				});
			}
		});
	};

	tools.metadata = function (el) {
		var fields = {};
		var defs = [['title', __('Título')], ['author', __('Autor')], ['subject', __('Asunto')], ['keywords', __('Palabras clave')], ['creator', __('Aplicación de origen')], ['producer', __('Productor PDF')]];
		var info = h('div');
		var form = h('div', { class: 'ct-cols' });
		defs.forEach(function (d) { fields[d[0]] = ui.field({ label: d[1], value: '' }); form.appendChild(fields[d[0]].el); });
		var editor = h('div', { class: 'ct-panel', hidden: true }, h('h3', { class: 'ct-panel__title', text: __('Editar metadatos') }), form);
		var loaded = null;
		var picker = pdfPicker(el, { thumbWidth: 80, maxThumbs: 12, onLoad: function (pk) {
			loadDoc(pk.bytes, true).then(function (doc) {
				loaded = doc;
				var get = function (fn) { try { return doc[fn]() || ''; } catch (e) { return ''; } };
				fields.title.input.value = get('getTitle'); fields.author.input.value = get('getAuthor'); fields.subject.input.value = get('getSubject');
				fields.keywords.input.value = get('getKeywords'); fields.creator.input.value = get('getCreator'); fields.producer.input.value = get('getProducer');
				var cd = get('getCreationDate'), md = get('getModificationDate');
				var first = doc.getPage(0);
				var bytesStr = new TextDecoder('latin1').decode(pk.bytes.subarray(0, 16));
				var ver = (/%PDF-(\d\.\d)/.exec(bytesStr) || [])[1] || '?';
				var hasXmp = !!doc.catalog.get(L_PDFName('Metadata'));
				info.innerHTML = '';
				info.appendChild(ui.table([__('Propiedad'), __('Valor')], [
					[__('Páginas'), String(doc.getPageCount())], [__('Versión de PDF'), ver], [__('Tamaño de la primera página'), N(first.getWidth() / PT_PER_MM, 0) + ' × ' + N(first.getHeight() / PT_PER_MM, 0) + ' mm'],
					[__('Creado'), cd ? CT.fmt.date(cd, { dateStyle: 'medium', timeStyle: 'short' }) : '—'], [__('Modificado'), md ? CT.fmt.date(md, { dateStyle: 'medium', timeStyle: 'short' }) : '—'],
					[__('Metadatos XMP'), hasXmp ? __('sí') : __('no')], [__('Formularios'), doc.getForm().getFields().length ? CT.sprintf(__('%d campos'), doc.getForm().getFields().length) : __('no')]
				], { wrap: true, caption: __('Información del PDF') }));
				editor.hidden = false;
			}).catch(function (e) { CT.fail(r.result, e); });
		} });
		var L_PDFName = function (n) { return window.PDFLib.PDFName.of(n); };
		var r = runner(el);
		var saveBtn = ui.button(__('Guardar cambios'), { variant: 'primary', icon: 'save', onClick: function () {
			if (!loaded) { return; }
			r.go(saveBtn, function () {
				loaded.setTitle(fields.title.input.value); loaded.setAuthor(fields.author.input.value); loaded.setSubject(fields.subject.input.value);
				loaded.setKeywords(fields.keywords.input.value.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean));
				loaded.setCreator(fields.creator.input.value); loaded.setProducer(fields.producer.input.value); loaded.setModificationDate(new Date());
				return save(loaded).then(function (b) { return { blob: b, name: baseOf(picker.file) + '-metadatos.pdf' }; });
			});
		} });
		var wipeBtn = ui.button(__('Eliminar todos los metadatos'), { icon: 'eraser', onClick: function () {
			if (!loaded) { return; }
			r.go(wipeBtn, function () {
				var P = window.PDFLib;
				var infoDict = loaded.getInfoDict();
				['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer', 'CreationDate', 'ModDate', 'Trapped'].forEach(function (k) { infoDict.delete(P.PDFName.of(k)); });
				loaded.catalog.delete(P.PDFName.of('Metadata'));
				return loaded.save({ useObjectStreams: true, updateFieldAppearances: false }).then(function (b) { return { blob: new Blob([b], { type: 'application/pdf' }), name: baseOf(picker.file) + '-sin-metadatos.pdf', message: __('Metadatos del documento (información y XMP) eliminados. Las imágenes incrustadas pueden conservar sus propios metadatos.') }; });
			});
		} });
		el.insertBefore(info, r.progress.el);
		el.insertBefore(editor, r.progress.el);
		el.insertBefore(ui.actions(saveBtn, wipeBtn), r.progress.el);
	};

	function pageText(js, n) {
		return js.getPage(n).then(function (page) {
			return page.getTextContent().then(function (tc) {
				var lines = [], last = null, line = '';
				tc.items.forEach(function (it) {
					if (!('str' in it)) { return; }
					var y = Math.round(it.transform[5]);
					if (last !== null && Math.abs(y - last) > 2) { lines.push(line); line = ''; }
					line += it.str;
					if (it.hasEOL) { lines.push(line); line = ''; last = null; return; }
					last = y;
				});
				if (line) { lines.push(line); }
				return lines.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
			});
		});
	}

	tools.text = function (el) {
		var out = ui.output({ label: __('Texto extraído'), rows: 14, filename: function () { return (picker.file ? baseOf(picker.file) : 'texto') + '.txt'; } });
		var sep = ui.field({ type: 'checkbox', label: __('Marcar el inicio de cada página'), value: true });
		var picker = pdfPicker(el, { thumbWidth: 70, maxThumbs: 20 });
		var r = runner(el);
		var btn = ui.button(__('Extraer texto'), { variant: 'primary', icon: 'file-search', onClick: function () {
			if (!picker.js) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			r.go(btn, function () {
				var total = picker.pages.length, parts = [], empty = [];
				var chain = Promise.resolve();
				for (var i = 1; i <= total; i++) {
					(function (n) {
						chain = chain.then(function () {
							r.progress.set((n - 1) / total, CT.sprintf(__('Leyendo página %1$d de %2$d…'), n, total));
							return pageText(picker.js, n).then(function (t) { if (!t) { empty.push(n); } parts.push((sep.input.checked ? '--- ' + CT.sprintf(__('Página %d'), n) + ' ---\n' : '') + t); });
						});
					})(i);
				}
				return chain.then(function () {
					out.set(parts.join('\n\n'));
					var msgs = [];
					if (empty.length === total) { msgs.push(ui.alert('warn', __('No se ha encontrado texto. El PDF parece escaneado (solo imágenes): haría falta reconocimiento óptico de caracteres (OCR), que esta herramienta no realiza.'))); }
					else if (empty.length) { msgs.push(ui.alert('info', CT.sprintf(__('Páginas sin capa de texto (posiblemente escaneadas): %s'), empty.join(', ')))); }
					else { msgs.push(ui.alert('ok', CT.sprintf(__('Texto extraído de %d páginas.'), total))); }
					r.result.set(msgs);
					CT.track('done');
				});
			});
		} });
		el.insertBefore(h('div', null, sep.el, ui.actions(btn)), r.progress.el);
		el.appendChild(out.el);
	};

	tools.blank = function (el) {
		var thr = ui.field({ label: __('Sensibilidad'), type: 'select', value: '0.003', options: [{ value: '0.0005', label: __('Estricta (solo páginas totalmente blancas)') }, { value: '0.003', label: __('Normal') }, { value: '0.01', label: __('Tolerante (admite manchas o ruido de escaneo)') }] });
		var picker = pdfPicker(el, { select: 'multi', selectLabel: __('Marcar para eliminar'), thumbWidth: 110 });
		var r = runner(el);
		var detectBtn = ui.button(__('Detectar páginas en blanco'), { variant: 'primary', icon: 'scan-line', onClick: function () {
			if (!picker.js) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			r.go(detectBtn, function () {
				var total = picker.pages.length, blanks = [], limit = parseFloat(thr.input.value);
				var chain = Promise.resolve();
				for (var i = 1; i <= total; i++) {
					(function (n) {
						chain = chain.then(function () {
							r.progress.set((n - 1) / total, CT.sprintf(__('Analizando página %1$d de %2$d…'), n, total));
							return renderPage(picker.js, n, 0.5).then(function (pg) {
								var d = pg.canvas.getContext('2d').getImageData(0, 0, pg.canvas.width, pg.canvas.height).data, ink = 0;
								for (var k = 0; k < d.length; k += 4) { if (d[k] + d[k + 1] + d[k + 2] < 690) { ink++; } }
								if (ink / (d.length / 4) <= limit) { blanks.push(n); }
							});
						});
					})(i);
				}
				return chain.then(function () {
					picker.pages.forEach(function (p) { p.selected = blanks.indexOf(p.index + 1) >= 0; });
					picker.redraw();
					r.result.set(blanks.length ? ui.alert('info', CT.sprintf(__('Páginas en blanco detectadas: %s. Están marcadas; revisa la selección y pulsa «Eliminar marcadas».'), blanks.join(', '))) : ui.alert('ok', __('No se han detectado páginas en blanco.')));
					CT.track('done');
				});
			});
		} });
		var removeBtn = ui.button(__('Eliminar marcadas y descargar'), { icon: 'file-minus', onClick: function () {
			if (!picker.js) { return; }
			r.go(removeBtn, function () {
				var keep = picker.pages.filter(function (p) { return !p.selected; }).map(function (p) { return p.index; });
				if (keep.length === picker.pages.length) { throw new Error(__('No hay páginas marcadas para eliminar.')); }
				if (!keep.length) { throw new Error(__('No puedes eliminar todas las páginas.')); }
				return copyOut(picker, keep, null, 'sin-blancas');
			});
		} });
		el.insertBefore(h('div', { class: 'ct-panel' }, thr.el), r.progress.el);
		el.insertBefore(ui.actions(detectBtn, removeBtn), r.progress.el);
	};

	tools.compare = function (el) {
		var docs = [null, null];
		var result = ui.result();
		var progress = ui.progress();
		var run = function () {
			if (!docs[0] || !docs[1]) { return; }
			progress.indeterminate(__('Comparando…'));
			var maxPages = Math.max(docs[0].js.numPages, docs[1].js.numPages);
			var texts = [[], []];
			var chain = Promise.resolve();
			[0, 1].forEach(function (k) { for (var i = 1; i <= docs[k].js.numPages && i <= 200; i++) { (function (n) { chain = chain.then(function () { return pageText(docs[k].js, n).then(function (t) { texts[k][n - 1] = t; }); }); })(i); } });
			chain.then(function () {
				progress.done();
				var nodes = [];
				nodes.push(ui.table([__('Dato'), __('Documento A'), __('Documento B')], [[__('Archivo'), docs[0].file.name, docs[1].file.name], [__('Páginas'), String(docs[0].js.numPages), String(docs[1].js.numPages)], [__('Tamaño'), CT.fmt.bytes(docs[0].file.size), CT.fmt.bytes(docs[1].file.size)]], { wrap: true }));
				var changed = [];
				for (var p = 0; p < maxPages && p < 200; p++) {
					var a = texts[0][p] || '', b = texts[1][p] || '';
					if (a === b) { continue; }
					changed.push(p + 1);
					var ops = CT.diff.diff(CT.diff.tokenize(a, 'words'), CT.diff.tokenize(b, 'words'));
					var box = h('div', { class: 'ct-diff' });
					ops.forEach(function (op) { box.appendChild(op.t === '=' ? document.createTextNode(op.v) : h(op.t === '+' ? 'ins' : 'del', { text: op.v })); });
					nodes.push(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px' }, text: CT.sprintf(__('Página %d'), p + 1) }), box);
				}
				nodes.splice(1, 0, changed.length ? ui.alert('info', CT.sprintf(__('Hay diferencias de texto en las páginas: %s. Abajo verás lo añadido (verde) y lo eliminado (rojo).'), changed.join(', '))) : ui.alert('ok', __('El texto de ambos documentos es idéntico. Puede haber diferencias visuales (imágenes, formato) que esta comparación no detecta.')));
				result.set(nodes);
				CT.track('done');
			}).catch(function (e) { progress.done(); CT.fail(result, e); });
		};
		var pick = function (k, label) {
			return ui.dropzone({ accept: '.pdf,application/pdf', compact: true, title: label, hint: '', onFiles: function (fs) {
				readPdf(fs[0]).then(function (b) { return jsDoc(b).then(function (js) { docs[k] = { file: fs[0], js: js }; this_.setHint(fs[0].name); run(); }); }).catch(function (e) { CT.toast(e.message, 'error'); });
				var this_ = k === 0 ? dA : dB;
			} });
		};
		var dA = pick(0, __('Documento A (original)')), dB = pick(1, __('Documento B (modificado)'));
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, dA.el, dB.el));
		el.appendChild(h('p', { class: 'ct-help', text: __('Se compara el texto de cada página. Los PDF escaneados (sin capa de texto) no pueden compararse así.') }));
		el.appendChild(progress.el);
		el.appendChild(result.el);
	};

	tools.crop = function (el) {
		var m = {};
		var preview = h('div', { style: { textAlign: 'center', position: 'relative' } });
		var picker = stampTool(el, {
			button: __('Recortar y descargar'), icon: 'crop', suffix: 'recortado',
			onLoad: function () { drawPreview(); },
			options: function (panel) {
				var grid = h('div', { class: 'ct-cols' });
				[['top', __('Superior')], ['right', __('Derecho')], ['bottom', __('Inferior')], ['left', __('Izquierdo')]].forEach(function (d) { m[d[0]] = ui.field({ label: CT.sprintf(__('Margen %s'), d[1]), type: 'number', unit: 'mm', value: 10 }); m[d[0]].input.addEventListener('input', CT.debounce(drawPreview, 200)); grid.appendChild(m[d[0]].el); });
				var scope = ui.field({ label: __('Aplicar a'), type: 'select', value: 'all', options: [{ value: 'all', label: __('Todas las páginas') }, { value: 'odd', label: __('Páginas impares') }, { value: 'even', label: __('Páginas pares') }] });
				grid.appendChild(scope.el);
				panel.appendChild(grid);
				panel.appendChild(preview);
				return function () { var o = { scope: scope.input.value }; Object.keys(m).forEach(function (k) { o[k] = Math.max(0, m[k].get() || 0) * PT_PER_MM; }); return o; };
			},
			apply: function (L, doc, o) {
				var bad = 0;
				doc.getPages().forEach(function (page, i) {
					if ((o.scope === 'odd' && i % 2) || (o.scope === 'even' && !(i % 2))) { return; }
					var b = pageBox(page);
					var w = b.width - o.left - o.right, hh = b.height - o.top - o.bottom;
					if (w < 20 || hh < 20) { bad++; return; }
					page.setCropBox(b.x + o.left, b.y + o.bottom, w, hh);
					page.setMediaBox(b.x + o.left, b.y + o.bottom, w, hh);
				});
				return bad ? CT.sprintf(__('%d páginas no se han recortado porque los márgenes eran mayores que la página.'), bad) : null;
			}
		});
		function drawPreview() {
			if (!picker.js) { return; }
			renderPage(picker.js, 1, 0.8).then(function (pg) {
				preview.innerHTML = '';
				var c = pg.canvas, ctx = c.getContext('2d'), s = c.width / pg.w;
				ctx.fillStyle = 'rgba(194, 42, 55, .25)';
				var t = (m.top.get() || 0) * PT_PER_MM * s, rr = (m.right.get() || 0) * PT_PER_MM * s, bb = (m.bottom.get() || 0) * PT_PER_MM * s, l = (m.left.get() || 0) * PT_PER_MM * s;
				ctx.fillRect(0, 0, c.width, t); ctx.fillRect(0, c.height - bb, c.width, bb); ctx.fillRect(0, t, l, c.height - t - bb); ctx.fillRect(c.width - rr, t, rr, c.height - t - bb);
				c.style.maxHeight = '380px'; c.style.border = '1px solid var(--ct-border)';
				preview.appendChild(h('p', { class: 'ct-help', text: __('Vista previa de la página 1: la zona roja se eliminará.') }));
				preview.appendChild(c);
			});
		}
	};

	/* ---------- Crear PDF desde texto ---------- */
	function textToPdf(L, opts) {
		return newDoc(L).then(function (doc) {
			var fontName = { helvetica: 'Helvetica', times: 'TimesRoman', courier: 'Courier' }[opts.font] || 'Helvetica';
			var boldName = { helvetica: 'HelveticaBold', times: 'TimesRomanBold', courier: 'CourierBold' }[opts.font] || 'HelveticaBold';
			return Promise.all([doc.embedFont(L.StandardFonts[fontName]), doc.embedFont(L.StandardFonts[boldName])]).then(function (fonts) {
				var font = fonts[0], bold = fonts[1];
				var size = SIZES[opts.page] || SIZES.a4, pw = size[0], ph = size[1];
				var m = opts.margin * PT_PER_MM, fs = opts.size, lh = fs * (opts.lineHeight || 1.4), maxW = pw - 2 * m;
				var s = sanitizeFor(font, opts.text);
				var page = doc.addPage([pw, ph]), y = ph - m;
				var newPage = function () { page = doc.addPage([pw, ph]); y = ph - m; };
				if (opts.title) {
					var ts = sanitizeFor(bold, opts.title).text;
					var tsz = fs * 1.6;
					wrap(ts, bold, tsz, maxW).forEach(function (line) { if (y - tsz < m) { newPage(); } page.drawText(line, { x: m, y: y - tsz, size: tsz, font: bold, color: L.rgb(0.1, 0.1, 0.12) }); y -= tsz * 1.3; });
					y -= fs;
				}
				s.text.split('\n').forEach(function (para) {
					var lines = para ? wrap(para, font, fs, maxW) : [''];
					lines.forEach(function (line) {
						if (y - lh < m) { newPage(); }
						if (line) { page.drawText(line, { x: m, y: y - fs, size: fs, font: font, color: L.rgb(0.1, 0.1, 0.12) }); }
						y -= lh;
					});
				});
				if (opts.pageNumbers) {
					var pages = doc.getPages();
					pages.forEach(function (p, i) { var t = (i + 1) + ' / ' + pages.length; p.drawText(t, { x: pw / 2 - font.widthOfTextAtSize(t, 9) / 2, y: m / 2, size: 9, font: font, color: L.rgb(0.45, 0.45, 0.5) }); });
				}
				if (opts.docTitle) { doc.setTitle(opts.docTitle); }
				return save(doc).then(function (blob) { return { blob: blob, bad: s.bad, pages: doc.getPageCount() }; });
			});
		});
	}
	function wrap(text, font, size, maxW) {
		var words = text.split(/(\s+)/), lines = [], line = '';
		words.forEach(function (w) {
			var test = line + w;
			if (font.widthOfTextAtSize(test.replace(/\s+$/, ''), size) <= maxW || !line.trim()) {
				if (font.widthOfTextAtSize(w, size) > maxW && !line.trim()) {
					// Palabra más larga que la línea: se parte por caracteres.
					var chunk = '';
					Array.from(w).forEach(function (ch) { if (font.widthOfTextAtSize(chunk + ch, size) > maxW) { lines.push(chunk); chunk = ''; } chunk += ch; });
					line = chunk;
				} else { line = test; }
			} else { lines.push(line.replace(/\s+$/, '')); line = w.replace(/^\s+/, ''); }
		});
		lines.push(line.replace(/\s+$/, ''));
		return lines;
	}
	CT.textToPdf = textToPdf;

	tools.text2pdf = function (el) {
		var title = ui.field({ label: __('Título (opcional)'), value: '' });
		var text = ui.textInput({ label: __('Texto del documento'), rows: 12, value: __('Escribe o pega aquí el texto que quieres convertir en PDF.') });
		var font = ui.field({ label: __('Fuente'), type: 'select', value: 'helvetica', options: [{ value: 'helvetica', label: __('Helvetica (sin serifa)') }, { value: 'times', label: __('Times (con serifa)') }, { value: 'courier', label: __('Courier (monoespaciada)') }] });
		var size = ui.field({ label: __('Tamaño de letra'), type: 'select', value: '11', options: [9, 10, 11, 12, 14, 16].map(function (s) { return { value: String(s), label: s + ' pt' }; }) });
		var page = ui.field({ label: __('Tamaño de página'), type: 'select', value: 'a4', options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: __('Carta') }, { value: 'a5', label: 'A5' }] });
		var margin = ui.field({ label: __('Márgenes'), type: 'select', value: '20', options: [10, 15, 20, 25, 30].map(function (s) { return { value: String(s), label: s + ' mm' }; }) });
		var nums = ui.field({ type: 'checkbox', label: __('Numerar páginas'), value: true });
		var name = ui.field({ label: __('Nombre del archivo'), value: 'documento' });
		var r = runner(el);
		var btn = ui.button(__('Crear PDF'), { variant: 'primary', icon: 'file-plus', onClick: function () {
			if (!text.get().trim()) { CT.toast(__('Escribe el texto del documento.'), 'error'); return; }
			r.go(btn, function () {
				return pdfLib().then(function (L) {
					return textToPdf(L, { title: title.input.value.trim(), docTitle: title.input.value.trim(), text: text.get(), font: font.input.value, size: parseInt(size.input.value, 10), page: page.input.value, margin: parseInt(margin.input.value, 10), pageNumbers: nums.input.checked });
				}).then(function (res) {
					return { blob: res.blob, name: CT.safeName(name.input.value || 'documento') + '.pdf', message: CT.sprintf(__('PDF creado con %d páginas.'), res.pages), extra: res.bad.length ? ui.alert('warn', CT.sprintf(__('Algunos caracteres (por ejemplo, emojis o alfabetos no latinos) no son compatibles con las fuentes estándar de PDF y se han sustituido por «?»: %s'), res.bad.join(' '))) : null };
				});
			});
		} });
		el.appendChild(title.el);
		el.appendChild(text.el);
		el.appendChild(h('div', { class: 'ct-cols' }, font.el, size.el, page.el, margin.el, name.el));
		el.appendChild(nums.el);
		el.appendChild(ui.actions(btn));
		el.appendChild(r.progress.el);
		el.appendChild(r.result.el);
	};

	var TEMPLATES = {
		carta: { label: __('Carta formal'), fields: [['remitente', __('Remitente (nombre y dirección)'), 'textarea'], ['destinatario', __('Destinatario (nombre y dirección)'), 'textarea'], ['lugar', __('Lugar y fecha'), 'text'], ['asunto', __('Asunto'), 'text'], ['cuerpo', __('Texto de la carta'), 'textarea'], ['firma', __('Nombre para la firma'), 'text']],
			build: function (v) { return { title: '', text: v.remitente + '\n\n' + v.destinatario + '\n\n' + v.lugar + '\n\n' + __('Asunto:') + ' ' + v.asunto + '\n\n' + __('Estimado/a señor/a:') + '\n\n' + v.cuerpo + '\n\n' + __('Atentamente,') + '\n\n\n\n' + v.firma }; } },
		solicitud: { label: __('Solicitud o instancia genérica'), fields: [['nombre', __('Nombre y apellidos'), 'text'], ['documento', __('Documento de identidad'), 'text'], ['domicilio', __('Domicilio'), 'text'], ['contacto', __('Teléfono o correo'), 'text'], ['destino', __('Dirigida a (organismo o empresa)'), 'text'], ['expone', __('Expone'), 'textarea'], ['solicita', __('Solicita'), 'textarea'], ['lugar', __('Lugar y fecha'), 'text']],
			build: function (v) { return { title: __('SOLICITUD'), text: v.nombre + (v.documento ? ', ' + __('con documento') + ' ' + v.documento : '') + (v.domicilio ? ', ' + __('con domicilio en') + ' ' + v.domicilio : '') + (v.contacto ? ' ' + __('y contacto') + ' ' + v.contacto : '') + ',\n\n' + __('EXPONE:') + '\n' + v.expone + '\n\n' + __('SOLICITA:') + '\n' + v.solicita + '\n\n' + v.lugar + '\n\n\n' + __('Firma:') + '\n\n\n' + (v.destino ? '\n' + v.destino.toUpperCase() : '') }; } },
		autorizacion: { label: __('Autorización genérica'), fields: [['autoriza', __('Persona que autoriza (nombre y documento)'), 'text'], ['autorizado', __('Persona autorizada (nombre y documento)'), 'text'], ['para', __('Para qué se autoriza'), 'textarea'], ['vigencia', __('Fecha o periodo de validez'), 'text'], ['lugar', __('Lugar y fecha'), 'text']],
			build: function (v) { return { title: __('AUTORIZACIÓN'), text: __('Yo,') + ' ' + v.autoriza + ',\n\n' + __('AUTORIZO a') + ' ' + v.autorizado + '\n\n' + __('para') + ' ' + v.para + '\n\n' + (v.vigencia ? __('Validez:') + ' ' + v.vigencia + '\n\n' : '') + v.lugar + '\n\n\n' + __('Firma de quien autoriza:') + '\n\n\n\n' + __('Firma de la persona autorizada:') }; } },
		recibi: { label: __('Recibí / justificante de entrega'), fields: [['recibe', __('Persona que recibe (nombre y documento)'), 'text'], ['entrega', __('Persona o empresa que entrega'), 'text'], ['concepto', __('Concepto (qué se entrega)'), 'textarea'], ['importe', __('Importe o cantidad (si procede)'), 'text'], ['lugar', __('Lugar y fecha'), 'text']],
			build: function (v) { return { title: __('RECIBÍ'), text: __('Yo,') + ' ' + v.recibe + ', ' + __('declaro haber recibido de') + ' ' + v.entrega + ':\n\n' + v.concepto + (v.importe ? '\n\n' + __('Importe / cantidad:') + ' ' + v.importe : '') + '\n\n' + v.lugar + '\n\n\n' + __('Firma:') }; } }
	};
	tools.templates = function (el) {
		var tpl = ui.field({ label: __('Plantilla'), type: 'select', value: 'carta', options: Object.keys(TEMPLATES).map(function (k) { return { value: k, label: TEMPLATES[k].label }; }) });
		var box = h('div', { class: 'ct-cols ct-cols--2' });
		var fields = {};
		var r = runner(el);
		var build = function () {
			box.innerHTML = ''; fields = {};
			TEMPLATES[tpl.input.value].fields.forEach(function (f) { fields[f[0]] = ui.field({ label: f[1], type: f[2], rows: 3, value: '' }); box.appendChild(fields[f[0]].el); });
		};
		var btn = ui.button(__('Generar PDF'), { variant: 'primary', icon: 'file-plus', onClick: function () {
			var v = {}; Object.keys(fields).forEach(function (k) { v[k] = fields[k].input.value.trim(); });
			r.go(btn, function () {
				var d = TEMPLATES[tpl.input.value].build(v);
				return pdfLib().then(function (L) { return textToPdf(L, { title: d.title, text: d.text, font: 'helvetica', size: 11, page: 'a4', margin: 25 }); })
					.then(function (res) { return { blob: res.blob, name: tpl.input.value + '.pdf' }; });
			});
		} });
		tpl.input.addEventListener('change', build);
		el.appendChild(ui.alert('warn', __('Plantillas orientativas y genéricas. No sustituyen a los modelos oficiales que exija un organismo ni al asesoramiento jurídico. Revisa el documento antes de usarlo.')));
		el.appendChild(tpl.el);
		el.appendChild(box);
		el.appendChild(ui.actions(btn));
		el.appendChild(r.progress.el);
		el.appendChild(r.result.el);
		build();
	};

	tools.splitsize = function (el) {
		var max = ui.field({ label: __('Tamaño máximo por archivo'), type: 'number', unit: 'MB', value: 5 });
		var picker = pdfPicker(el, { thumbWidth: 70, maxThumbs: 30 });
		var r = runner(el);
		var btn = ui.button(__('Dividir por tamaño'), { variant: 'primary', icon: 'scissors', onClick: function () {
			if (!picker.file) { CT.toast(__('Primero selecciona un PDF.'), 'error'); return; }
			var limit = max.get() * 1024 * 1024;
			if (!(limit > 50 * 1024)) { max.error(__('Indica un tamaño mayor de 0,05 MB.')); return; }
			max.error('');
			if (picker.pages.length > 500) { CT.toast(__('Esta herramienta admite hasta 500 páginas.'), 'error'); return; }
			r.go(btn, function () {
				return Promise.all([pdfLib(), loadDoc(picker.bytes, true)]).then(function (res) {
					var L = res[0], src = res[1], total = src.getPageCount(), files = [], start = 0, oversize = [];
					var build = function (from, to) { return newDoc(L).then(function (d) { var idx = []; for (var i = from; i < to; i++) { idx.push(i); } return d.copyPages(src, idx).then(function (pg) { pg.forEach(function (p) { d.addPage(p); }); return save(d); }); }); };
					var step = function () {
						if (start >= total) { return Promise.resolve(); }
						r.progress.set(start / total, CT.sprintf(__('Analizando desde la página %d…'), start + 1));
						// Búsqueda binaria del mayor bloque de páginas que cabe en el límite.
						var lo = start + 1, hi = total, best = null, bestBlob = null;
						var probe = function () {
							if (lo > hi) { return Promise.resolve(); }
							var mid = Math.floor((lo + hi) / 2);
							return build(start, mid).then(function (b) {
								if (b.size <= limit) { best = mid; bestBlob = b; lo = mid + 1; } else { hi = mid - 1; }
								return probe();
							});
						};
						return probe().then(function () {
							if (best === null) { return build(start, start + 1).then(function (b) { oversize.push(start + 1); best = start + 1; bestBlob = b; }); }
						}).then(function () {
							files.push({ name: baseOf(picker.file) + '-parte-' + (files.length + 1) + '-p' + (start + 1) + '-' + best + '.pdf', data: bestBlob });
							start = best;
							return step();
						});
					};
					return step().then(function () {
						var extra = oversize.length ? ui.alert('warn', CT.sprintf(__('Estas páginas ocupan más que el límite por sí solas y se han guardado en archivos individuales: %s'), oversize.join(', '))) : null;
						if (files.length === 1) { return { blob: files[0].data, name: files[0].name, message: __('El documento completo ya cabe en el límite indicado.'), extra: extra }; }
						return CT.zip.create(files).then(function (z) { return { blob: z, name: baseOf(picker.file) + '-por-tamano.zip', message: CT.sprintf(__('%d partes creadas.'), files.length), extra: extra }; });
					});
				});
			});
		} });
		el.insertBefore(h('div', { class: 'ct-cols' }, max.el), r.progress.el);
		el.insertBefore(ui.actions(btn), r.progress.el);
	};

	CT.register('pdf', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
	CT.pdf = { parseRanges: parseRanges, wrap: wrap };
})();
