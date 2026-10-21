/*!
 * HerramientasClave — herramientas de imagen con Canvas. Las imágenes no salen del dispositivo.
 * Nota: JPG, WebP y AVIF comprimen con pérdida; PNG no pierde calidad.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;
	var MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
	var ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';
	var MAX_PIXELS = 50e6;

	function extOf(file) { var e = CT.fileExt(file.name); return e === 'jpeg' ? 'jpg' : e; }
	function canvasFor(w, hh) {
		if (w * hh > MAX_PIXELS) { throw new Error(CT.sprintf(__('La imagen resultante es demasiado grande (%s megapíxeles). El máximo es de 50 megapíxeles.'), N(w * hh / 1e6, 1))); }
		var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); return c;
	}
	function encode(canvas, fmt, quality) {
		var type = MIME[fmt] || 'image/png';
		return CT.canvasToBlob(canvas, type, quality).then(function (b) {
			if (b.type !== type) { throw new Error(CT.sprintf(__('Tu navegador no puede crear imágenes %s. Prueba con otro formato o con un navegador actualizado.'), fmt.toUpperCase())); }
			return b;
		});
	}
	/** Dibuja la imagen en un lienzo de w×h con fondo opcional (necesario para JPG). */
	function render(img, w, hh, opts) {
		opts = opts || {};
		var c = canvasFor(w, hh), ctx = c.getContext('2d');
		if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, c.width, c.height); }
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		if (opts.draw) { opts.draw(ctx, c); } else { ctx.drawImage(img, 0, 0, c.width, c.height); }
		return c;
	}
	/** Reducción en varios pasos para conservar nitidez al encoger mucho. */
	function downscale(img, w, hh, bg) {
		var sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
		var src = img;
		while (sw / 2 > w && sh / 2 > hh) {
			sw = Math.round(sw / 2); sh = Math.round(sh / 2);
			var tmp = canvasFor(sw, sh); var tctx = tmp.getContext('2d'); tctx.imageSmoothingQuality = 'high'; tctx.drawImage(src, 0, 0, sw, sh); src = tmp;
		}
		return render(src, w, hh, { bg: bg });
	}
	function outName(file, suffix, fmt) { return CT.baseName(file.name) + (suffix ? '-' + suffix : '') + '.' + (fmt === 'jpg' ? 'jpg' : fmt); }
	function needsBg(fmt) { return fmt === 'jpg'; }
	function load(file) {
		return CT.loadImage(file).then(function (r) {
			if (r.width * r.height > MAX_PIXELS) { URL.revokeObjectURL(r.url); throw new Error(__('La imagen supera los 50 megapíxeles y no puede procesarse con seguridad en el navegador.')); }
			return r;
		}).catch(function (e) {
			if (/\.(heic|heif)$/i.test(file.name)) { throw new Error(__('Tu navegador no puede abrir imágenes HEIC. En el iPhone puedes elegir «Más compatible» en Ajustes > Cámara > Formatos, o exportar la foto como JPG.')); }
			throw e;
		});
	}

	/* ---------- Lista de archivos y resultados ---------- */
	function fileRow(file, thumbUrl) {
		var thumb = h('span', { class: 'ct-file__thumb' });
		if (thumbUrl) { thumb.appendChild(h('img', { src: thumbUrl, alt: '' })); } else { thumb.innerHTML = CT.icon('file'); }
		var meta = h('span', { class: 'ct-file__meta', text: CT.fmt.bytes(file.size) });
		var actions = h('span', { class: 'ct-file__actions' });
		var row = h('li', { class: 'ct-file' }, thumb, h('span', { class: 'ct-file__body' }, h('span', { class: 'ct-file__name', text: file.name }), meta), actions);
		return { el: row, meta: meta, actions: actions, thumb: thumb };
	}

	/**
	 * Plantilla para herramientas por lotes.
	 * opts.options(panel) -> getter; opts.process(file, img, o) -> Promise<{blob, name, w, h, note}>
	 */
	function batchTool(el, opts) {
		var files = [];
		var list = h('ul', { class: 'ct-files' });
		var panel = h('div', { class: 'ct-panel' }, h('h3', { class: 'ct-panel__title', text: __('Opciones') }));
		var getOpts = opts.options ? opts.options(panel) : function () { return {}; };
		var progress = ui.progress();
		var result = ui.result();
		var outputs = [];
		var runBtn = ui.button(opts.button || __('Procesar'), { variant: 'primary', icon: opts.icon || 'wand-sparkles', disabled: true });
		var zipBtn = ui.button(__('Descargar todo (ZIP)'), { icon: 'download', disabled: true });
		var clearBtn = ui.button(__('Limpiar'), { icon: 'trash-2', variant: 'ghost', onClick: function () { files.forEach(function (f) { URL.revokeObjectURL(f.url); }); files = []; outputs = []; list.innerHTML = ''; result.clear(); update(); } });
		var drop = ui.dropzone({ accept: opts.accept || ACCEPT, multiple: opts.single ? false : true, hint: opts.hint || __('JPG, PNG, WebP, GIF o BMP. Las imágenes se procesan en tu dispositivo.'), onFiles: function (fs) {
			if (opts.single) { clearBtn.click(); }
			fs.forEach(function (f) {
				var url = URL.createObjectURL(f);
				var row = fileRow(f, url);
				var item = { file: f, url: url, row: row };
				row.actions.appendChild(ui.button('', { icon: 'x', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Quitar') + ' ' + f.name, onClick: function () { files.splice(files.indexOf(item), 1); row.el.remove(); URL.revokeObjectURL(url); update(); } }));
				files.push(item);
				list.appendChild(row.el);
			});
			update();
			if (opts.auto) { run(); }
		} });
		var update = function () { runBtn.disabled = !files.length; zipBtn.disabled = outputs.length < 2; drop.el.hidden = !!(opts.single && files.length); };
		var run = function () {
			if (!files.length) { return; }
			var o = getOpts();
			if (o === false) { return; }
			ui.busy(runBtn, true);
			outputs = [];
			result.clear();
			var i = 0, totalIn = 0, totalOut = 0, errors = 0;
			var next = function () {
				if (i >= files.length) {
					progress.done(); ui.busy(runBtn, false); update();
					var msgs = [];
					if (outputs.length) {
						var saved = totalIn - totalOut;
						msgs.push(ui.alert('ok', CT.sprintf(_n('%d imagen procesada.', '%d imágenes procesadas.', outputs.length), outputs.length) + (opts.showSavings ? ' ' + CT.sprintf(__('Tamaño total: %1$s → %2$s (%3$s).'), CT.fmt.bytes(totalIn), CT.fmt.bytes(totalOut), (saved >= 0 ? '−' : '+') + N(Math.abs(saved) / totalIn * 100, 1) + ' %') : '')));
					}
					if (errors) { msgs.push(ui.alert('err', CT.sprintf(__('%d archivo(s) no se han podido procesar. Revisa los mensajes de cada archivo.'), errors))); }
					if (opts.after) { var extra = opts.after(outputs); if (extra) { msgs.push(extra); } }
					result.set(msgs);
					if (outputs.length) { CT.track('done'); CT.track('size', totalIn < 1e6 ? '<1mb' : totalIn < 1e7 ? '1-10mb' : '>10mb'); }
					return;
				}
				var item = files[i++];
				progress.set((i - 1) / files.length, CT.sprintf(__('Procesando %1$d de %2$d: %3$s'), i, files.length, item.file.name));
				item.row.actions.querySelectorAll('.ct-dl').forEach(function (b) { b.remove(); });
				load(item.file).then(function (img) {
					return Promise.resolve(opts.process(item.file, img.img, o, img)).then(function (out) {
						URL.revokeObjectURL(img.url);
						return out;
					});
				}).then(function (out) {
					var outs = Array.isArray(out) ? out : [out];
					outs.forEach(function (r) {
						outputs.push(r);
						totalIn += item.file.size / outs.length; totalOut += r.blob.size;
						var dl = ui.button(outs.length > 1 ? r.label || __('Descargar') : __('Descargar'), { icon: 'download', size: 'sm', variant: 'secondary', cls: 'ct-dl', onClick: function () { CT.download(r.blob, r.name); } });
						item.row.actions.insertBefore(dl, item.row.actions.firstChild);
					});
					var r0 = outs[0];
					var diff = r0.blob.size - item.file.size;
					item.row.meta.textContent = CT.fmt.bytes(item.file.size) + ' → ' + CT.fmt.bytes(r0.blob.size) + (opts.showSavings ? ' (' + (diff <= 0 ? '−' : '+') + N(Math.abs(diff) / item.file.size * 100, 1) + ' %)' : '') + (r0.w ? ' · ' + r0.w + '×' + r0.h + ' px' : '') + (r0.note ? ' · ' + r0.note : '');
				}).catch(function (e) {
					errors++;
					item.row.meta.textContent = '';
					item.row.meta.appendChild(h('span', { style: { color: 'var(--ct-danger)' }, text: e.message || __('Error al procesar') }));
					CT.track('error', 'image');
				}).then(next);
			};
			next();
		};
		runBtn.addEventListener('click', run);
		zipBtn.addEventListener('click', function () {
			ui.busy(zipBtn, true);
			CT.zip.create(outputs.map(function (o) { return { name: o.name, data: o.blob }; })).then(function (z) { CT.download(z, (opts.zipName || 'imagenes') + '.zip'); ui.busy(zipBtn, false); });
		});
		el.appendChild(drop.el);
		el.appendChild(list);
		if (opts.options) { el.appendChild(panel); }
		el.appendChild(ui.actions(runBtn, zipBtn, clearBtn));
		el.appendChild(progress.el);
		el.appendChild(result.el);
		return { run: run, files: function () { return files; }, outputs: function () { return outputs; } };
	}
	var _n = CT._n;

	function qualityField(panel, value) {
		var f = ui.field({ label: __('Calidad'), type: 'range', value: value || 82, min: 10, max: 100, step: 1 });
		f.input.classList.add('ct-range');
		var out = h('output', { class: 'ct-chip ct-chip--primary', text: f.input.value });
		f.input.addEventListener('input', function () { out.textContent = f.input.value; });
		f.el.querySelector('label').appendChild(document.createTextNode(' '));
		f.el.querySelector('label').appendChild(out);
		panel.appendChild(f.el);
		return function () { return parseInt(f.input.value, 10) / 100; };
	}
	function formatField(panel, value, withSame, label) {
		var opts = [];
		if (withSame) { opts.push({ value: 'same', label: __('Mantener el formato original') }); }
		opts.push({ value: 'jpg', label: 'JPG' }, { value: 'png', label: __('PNG (sin pérdida)') }, { value: 'webp', label: 'WebP' }, { value: 'avif', label: __('AVIF (si tu navegador lo admite)') });
		var f = ui.field({ label: label || __('Formato de salida'), type: 'select', value: value, options: opts });
		panel.appendChild(f.el);
		return f;
	}
	function bgField(panel) {
		var c = h('input', { type: 'color', class: 'ct-color', value: '#ffffff', 'aria-label': __('Color de fondo para zonas transparentes') });
		panel.appendChild(h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', text: __('Fondo para transparencias (JPG)') }), c));
		return function () { return c.value; };
	}
	function resolveFormat(fmt, file) {
		if (fmt !== 'same') { return fmt; }
		var e = extOf(file);
		return MIME[e] ? e : 'png';
	}
	function fitSize(w, hh, maxW, maxH) {
		var r = Math.min(maxW ? maxW / w : Infinity, maxH ? maxH / hh : Infinity, 1);
		return { w: Math.round(w * r), h: Math.round(hh * r) };
	}

	var tools = {};

	tools.convert = function (el, tool) {
		var cfg = tool.config || {};
		var to = cfg.to || 'png';
		var fmtF, q, bg;
		batchTool(el, {
			button: __('Convertir'), icon: 'arrow-left-right', zipName: 'imagenes-convertidas', showSavings: true,
			accept: cfg.from === 'jpg' ? '.jpg,.jpeg,image/jpeg' : cfg.from === 'png' ? '.png,image/png' : cfg.from === 'webp' ? '.webp,image/webp' : ACCEPT,
			hint: cfg.from ? CT.sprintf(__('Selecciona una o varias imágenes %s.'), cfg.from.toUpperCase()) : undefined,
			options: function (panel) {
				fmtF = formatField(panel, to, false);
				if (cfg.to) { fmtF.el.hidden = true; }
				q = qualityField(panel, 90);
				bg = bgField(panel);
				var note = h('p', { class: 'ct-help' });
				panel.appendChild(note);
				var upd = function () {
					var f = fmtF.input.value;
					panel.querySelectorAll('.ct-range').forEach(function (r) { r.closest('.ct-field').hidden = f === 'png'; });
					note.textContent = f === 'png' ? __('PNG conserva la calidad exacta y la transparencia, pero suele ocupar más en fotografías.') : f === 'jpg' ? __('JPG no admite transparencia: las zonas transparentes se rellenan con el color de fondo elegido.') : f === 'avif' ? __('AVIF ofrece archivos muy ligeros, pero no todos los navegadores pueden crearlo ni abrirlo.') : __('WebP es compatible con los navegadores actuales y suele ocupar mucho menos que JPG y PNG.');
				};
				fmtF.input.addEventListener('change', upd);
				upd();
				return function () { return { fmt: fmtF.input.value, q: q(), bg: bg() }; };
			},
			process: function (file, img, o) {
				return CT.supportsType(MIME[o.fmt]).then(function (ok) {
					if (!ok) { throw new Error(CT.sprintf(__('Tu navegador no puede crear imágenes %s.'), o.fmt.toUpperCase())); }
					var c = render(img, img.naturalWidth, img.naturalHeight, { bg: needsBg(o.fmt) ? o.bg : null });
					return encode(c, o.fmt, o.q).then(function (b) { return { blob: b, name: outName(file, '', o.fmt), w: c.width, h: c.height }; });
				});
			}
		});
	};

	function compareSlider(beforeUrl, afterUrl, labels) {
		var after = h('div', { class: 'ct-compare__after' }, h('img', { src: afterUrl, alt: labels[1] }));
		var line = h('div', { class: 'ct-compare__line' });
		var range = h('input', { type: 'range', class: 'ct-compare__range', min: '0', max: '100', value: '50', 'aria-label': __('Posición del comparador') });
		var box = h('div', { class: 'ct-compare' }, h('img', { src: beforeUrl, alt: labels[0] }), after, line, h('span', { class: 'ct-compare__tag', style: { left: '8px' }, text: labels[0] }), h('span', { class: 'ct-compare__tag', style: { right: '8px' }, text: labels[1] }), range);
		range.addEventListener('input', function () { after.style.clipPath = 'inset(0 0 0 ' + range.value + '%)'; line.style.left = range.value + '%'; });
		return box;
	}
	CT.compareSlider = compareSlider;

	tools.compress = function (el, tool) {
		var preset = tool.config || {};
		var q, fmtF, maxW, keepBig;
		var preview = h('div');
		batchTool(el, {
			button: preset.web ? __('Optimizar') : __('Comprimir'), icon: 'minimize-2', zipName: preset.web ? 'imagenes-web' : 'imagenes-comprimidas', showSavings: true,
			options: function (panel) {
				var grid = h('div', { class: 'ct-cols' }); panel.appendChild(grid);
				fmtF = formatField(grid, preset.web ? 'webp' : 'same', true);
				maxW = ui.field({ label: __('Ancho máximo (opcional)'), type: 'select', value: preset.web ? '1920' : '', options: [{ value: '', label: __('Sin cambiar dimensiones') }, { value: '3840', label: '3840 px' }, { value: '2560', label: '2560 px' }, { value: '1920', label: '1920 px' }, { value: '1600', label: '1600 px' }, { value: '1280', label: '1280 px' }, { value: '1024', label: '1024 px' }, { value: '800', label: '800 px' }] });
				grid.appendChild(maxW.el);
				q = qualityField(panel, preset.web ? 80 : 75);
				keepBig = ui.field({ type: 'checkbox', label: __('Si el resultado ocupa más que el original, conservar el original'), value: true });
				panel.appendChild(keepBig.el);
				panel.appendChild(h('p', { class: 'ct-help', text: __('La compresión con pérdida reduce mucho el tamaño pero descarta detalles; con calidades entre 70 y 85 la diferencia suele ser difícil de apreciar. Los PNG se comprimen mejor convirtiéndolos a WebP o JPG.') }));
				return function () { return { fmt: fmtF.input.value, q: q(), maxW: parseInt(maxW.input.value, 10) || 0, keep: keepBig.input.checked }; };
			},
			process: function (file, img, o) {
				var fmt = resolveFormat(o.fmt, file);
				if (fmt === 'png' && o.fmt === 'same' && !o.maxW) { fmt = 'png'; }
				var size = fitSize(img.naturalWidth, img.naturalHeight, o.maxW, 0);
				return CT.supportsType(MIME[fmt]).then(function (ok) {
					if (!ok) { throw new Error(CT.sprintf(__('Tu navegador no puede crear imágenes %s.'), fmt.toUpperCase())); }
					var c = downscale(img, size.w, size.h, needsBg(fmt) ? '#ffffff' : null);
					return encode(c, fmt, o.q).then(function (b) {
						if (o.keep && b.size >= file.size && size.w === img.naturalWidth && fmt === resolveFormat('same', file)) {
							return { blob: file, name: file.name, w: img.naturalWidth, h: img.naturalHeight, note: __('ya estaba optimizada: se conserva el original') };
						}
						return { blob: b, name: outName(file, preset.web ? 'web' : 'comprimida', fmt), w: c.width, h: c.height, src: URL.createObjectURL(file) };
					});
				});
			},
			after: function (outs) {
				preview.innerHTML = '';
				if (outs.length !== 1 || !outs[0].src) { return null; }
				var url = URL.createObjectURL(outs[0].blob);
				preview.appendChild(h('h3', { class: 'ct-panel__title', text: __('Compara el antes y el después') }));
				preview.appendChild(compareSlider(outs[0].src, url, [__('Original'), __('Resultado')]));
				return preview;
			}
		});
	};

	tools.resize = function (el) {
		var mode, w, hgt, pct, keep, fmtF, q;
		batchTool(el, {
			button: __('Redimensionar'), icon: 'maximize', zipName: 'imagenes-redimensionadas',
			options: function (panel) {
				mode = ui.seg({ label: __('Cómo indicar el tamaño'), value: 'px', options: [{ value: 'px', label: __('Píxeles') }, { value: 'pct', label: __('Porcentaje') }] });
				panel.appendChild(mode.el);
				var grid = h('div', { class: 'ct-cols' }); panel.appendChild(grid);
				w = ui.field({ label: __('Ancho'), type: 'number', integer: true, unit: 'px', value: 1200 });
				hgt = ui.field({ label: __('Alto'), type: 'number', integer: true, unit: 'px', value: '' , placeholder: __('automático') });
				pct = ui.field({ label: __('Porcentaje'), type: 'number', unit: '%', value: 50 });
				[w, hgt, pct].forEach(function (f) { grid.appendChild(f.el); });
				keep = ui.field({ type: 'checkbox', label: __('Mantener la proporción (encajar dentro del ancho y alto)'), value: true });
				panel.appendChild(keep.el);
				var g2 = h('div', { class: 'ct-cols' }); panel.appendChild(g2);
				fmtF = formatField(g2, 'same', true);
				q = qualityField(panel, 90);
				var upd = function () { var p = mode.get() === 'pct'; w.el.hidden = hgt.el.hidden = keep.el.hidden = p; pct.el.hidden = !p; };
				mode.el.addEventListener('change', upd); upd();
				return function () {
					var o = { mode: mode.get(), w: w.get(), h: hgt.get(), pct: pct.get(), keep: keep.input.checked, fmt: fmtF.input.value, q: q() };
					[w, hgt, pct].forEach(function (f) { f.error(''); });
					if (o.mode === 'pct' && !(o.pct > 0 && o.pct <= 1000)) { pct.error(__('Entre 1 y 1000 %.')); return false; }
					if (o.mode === 'px' && !(o.w > 0) && !(o.h > 0)) { w.error(__('Indica al menos el ancho o el alto.')); return false; }
					return o;
				};
			},
			process: function (file, img, o) {
				var W = img.naturalWidth, H = img.naturalHeight, tw, th;
				if (o.mode === 'pct') { tw = W * o.pct / 100; th = H * o.pct / 100; }
				else if (o.keep || !(o.w > 0 && o.h > 0)) {
					var r = Math.min(o.w > 0 ? o.w / W : Infinity, o.h > 0 ? o.h / H : Infinity);
					tw = W * r; th = H * r;
				} else { tw = o.w; th = o.h; }
				var fmt = resolveFormat(o.fmt, file);
				var c = tw < W ? downscale(img, Math.round(tw), Math.round(th), needsBg(fmt) ? '#ffffff' : null) : render(img, tw, th, { bg: needsBg(fmt) ? '#ffffff' : null });
				return encode(c, fmt, o.q).then(function (b) { return { blob: b, name: outName(file, c.width + 'x' + c.height, fmt), w: c.width, h: c.height }; });
			}
		});
	};

	tools.rotate = function (el) {
		var angle = 0, flipH = false, flipV = false;
		var info = h('p', { class: 'ct-help' });
		var updInfo = function () { info.textContent = CT.sprintf(__('Giro: %1$d° · Volteo horizontal: %2$s · Volteo vertical: %3$s'), angle, flipH ? __('sí') : __('no'), flipV ? __('sí') : __('no')); CT.$$('.ct-file__thumb img', el).forEach(function (i) { i.style.transform = 'rotate(' + angle + 'deg) scale(' + (flipH ? -1 : 1) + ',' + (flipV ? -1 : 1) + ')'; }); };
		var fmtF, q;
		batchTool(el, {
			button: __('Aplicar y guardar'), icon: 'rotate-cw', zipName: 'imagenes-giradas',
			options: function (panel) {
				panel.appendChild(h('div', { class: 'ct-actions' },
					ui.button(__('Girar a la izquierda'), { icon: 'rotate-ccw', onClick: function () { angle = (angle + 270) % 360; updInfo(); } }),
					ui.button(__('Girar a la derecha'), { icon: 'rotate-cw', onClick: function () { angle = (angle + 90) % 360; updInfo(); } }),
					ui.button(__('Voltear horizontal'), { icon: 'flip-horizontal-2', onClick: function () { flipH = !flipH; updInfo(); } }),
					ui.button(__('Voltear vertical'), { icon: 'flip-vertical-2', onClick: function () { flipV = !flipV; updInfo(); } })));
				panel.appendChild(info);
				var g = h('div', { class: 'ct-cols' }); panel.appendChild(g);
				fmtF = formatField(g, 'same', true);
				q = qualityField(panel, 92);
				updInfo();
				return function () { return { fmt: fmtF.input.value, q: q() }; };
			},
			process: function (file, img, o) {
				var W = img.naturalWidth, H = img.naturalHeight, swap = angle % 180 !== 0;
				var fmt = resolveFormat(o.fmt, file);
				var c = render(img, swap ? H : W, swap ? W : H, { bg: needsBg(fmt) ? '#ffffff' : null, draw: function (ctx, cv) {
					ctx.translate(cv.width / 2, cv.height / 2);
					ctx.rotate(angle * Math.PI / 180);
					ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
					ctx.drawImage(img, -W / 2, -H / 2);
				} });
				return encode(c, fmt, o.q).then(function (b) { return { blob: b, name: outName(file, 'girada', fmt), w: c.width, h: c.height }; });
			}
		});
	};

	tools.crop = function (el) {
		var file = null, img = null;
		var stage = h('div', { class: 'ct-crop' });
		var canvas = h('canvas');
		var box = h('div', { class: 'ct-crop__box', tabindex: '0', role: 'group', 'aria-label': __('Área de recorte. Usa las flechas para moverla y Mayús + flechas para cambiar su tamaño.') });
		['nw', 'ne', 'sw', 'se'].forEach(function (k) { var hd = h('span', { class: 'ct-crop__handle ct-crop__handle--' + k }); hd.dataset.h = k; box.appendChild(hd); });
		stage.appendChild(canvas); stage.appendChild(box);
		var sel = { x: 0, y: 0, w: 0, h: 0 }, scale = 1, ratio = 0;
		var fx = ui.field({ label: 'X', type: 'number', integer: true, unit: 'px', value: 0 }), fy = ui.field({ label: 'Y', type: 'number', integer: true, unit: 'px', value: 0 });
		var fw = ui.field({ label: __('Ancho'), type: 'number', integer: true, unit: 'px', value: 0 }), fh = ui.field({ label: __('Alto'), type: 'number', integer: true, unit: 'px', value: 0 });
		var aspect = ui.field({ label: __('Proporción'), type: 'select', value: '0', options: [{ value: '0', label: __('Libre') }, { value: '1', label: '1:1' }, { value: '1.3333', label: '4:3' }, { value: '1.7778', label: '16:9' }, { value: '1.5', label: '3:2' }, { value: '0.8', label: '4:5' }, { value: '0.5625', label: '9:16' }] });
		var fmtF = ui.field({ label: __('Formato'), type: 'select', value: 'same', options: [{ value: 'same', label: __('Original') }, { value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }] });
		var editor = h('div', { hidden: true });
		var clamp = function () {
			var W = img.naturalWidth, H = img.naturalHeight;
			sel.w = Math.max(1, Math.min(sel.w, W)); sel.h = Math.max(1, Math.min(sel.h, H));
			if (ratio) { if (sel.w / sel.h > ratio) { sel.w = Math.round(sel.h * ratio); } else { sel.h = Math.round(sel.w / ratio); } }
			sel.x = Math.max(0, Math.min(sel.x, W - sel.w)); sel.y = Math.max(0, Math.min(sel.y, H - sel.h));
			sel.x = Math.round(sel.x); sel.y = Math.round(sel.y); sel.w = Math.round(sel.w); sel.h = Math.round(sel.h);
		};
		var paint = function (fromFields) {
			if (!img) { return; }
			if (!fromFields) { fx.input.value = sel.x; fy.input.value = sel.y; fw.input.value = sel.w; fh.input.value = sel.h; }
			scale = canvas.getBoundingClientRect().width / img.naturalWidth || 1;
			box.style.left = sel.x * scale + 'px'; box.style.top = sel.y * scale + 'px'; box.style.width = sel.w * scale + 'px'; box.style.height = sel.h * scale + 'px';
		};
		var drag = null;
		box.addEventListener('pointerdown', function (e) { e.preventDefault(); box.setPointerCapture(e.pointerId); drag = { h: e.target.dataset.h || 'move', x: e.clientX, y: e.clientY, s: Object.assign({}, sel) }; });
		box.addEventListener('pointermove', function (e) {
			if (!drag) { return; }
			var dx = (e.clientX - drag.x) / scale, dy = (e.clientY - drag.y) / scale, s = drag.s;
			if (drag.h === 'move') { sel.x = s.x + dx; sel.y = s.y + dy; }
			else {
				var x1 = s.x, y1 = s.y, x2 = s.x + s.w, y2 = s.y + s.h;
				if (drag.h.indexOf('w') >= 0) { x1 = Math.min(x2 - 10, s.x + dx); } else { x2 = Math.max(x1 + 10, x2 + dx); }
				if (drag.h.indexOf('n') >= 0) { y1 = Math.min(y2 - 10, s.y + dy); } else { y2 = Math.max(y1 + 10, y2 + dy); }
				sel.x = Math.max(0, x1); sel.y = Math.max(0, y1); sel.w = x2 - sel.x; sel.h = y2 - sel.y;
			}
			clamp(); paint();
		});
		box.addEventListener('pointerup', function () { drag = null; });
		box.addEventListener('keydown', function (e) {
			var step = e.altKey ? 1 : 10, k = e.key;
			if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(k) < 0) { return; }
			e.preventDefault();
			var dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
			if (e.shiftKey) { sel.w += dx; sel.h += dy; } else { sel.x += dx; sel.y += dy; }
			clamp(); paint();
		});
		[fx, fy, fw, fh].forEach(function (f) { f.input.addEventListener('change', function () { sel = { x: fx.get() || 0, y: fy.get() || 0, w: fw.get() || 1, h: fh.get() || 1 }; clamp(); paint(); }); });
		aspect.input.addEventListener('change', function () { ratio = parseFloat(aspect.input.value); clamp(); paint(); });
		window.addEventListener('resize', function () { paint(); });
		var result = ui.result();
		var drop = ui.dropzone({ accept: ACCEPT, hint: __('Selecciona la imagen que quieres recortar.'), onFiles: function (fs) {
			file = fs[0];
			load(file).then(function (r) {
				img = r.img;
				canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
				canvas.getContext('2d').drawImage(img, 0, 0);
				editor.hidden = false; drop.el.hidden = true;
				sel = { x: Math.round(img.naturalWidth * 0.1), y: Math.round(img.naturalHeight * 0.1), w: Math.round(img.naturalWidth * 0.8), h: Math.round(img.naturalHeight * 0.8) };
				requestAnimationFrame(function () { clamp(); paint(); });
			}).catch(function (e) { CT.fail(result, e); });
		} });
		var cropBtn = ui.button(__('Recortar y descargar'), { variant: 'primary', icon: 'crop', onClick: function () {
			if (!img) { return; }
			var fmt = resolveFormat(fmtF.input.value, file);
			var c = render(img, sel.w, sel.h, { bg: needsBg(fmt) ? '#ffffff' : null, draw: function (ctx) { ctx.drawImage(img, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h); } });
			encode(c, fmt, 0.92).then(function (b) { CT.download(b, outName(file, 'recorte', fmt)); result.set(ui.alert('ok', CT.sprintf(__('Recorte de %1$d × %2$d px descargado (%3$s).'), sel.w, sel.h, CT.fmt.bytes(b.size)))); }).catch(function (e) { CT.fail(result, e); });
		} });
		editor.appendChild(h('div', { style: { textAlign: 'center', marginBottom: '12px', background: 'var(--ct-surface-2)', borderRadius: '12px', padding: '8px' } }, stage));
		editor.appendChild(h('div', { class: 'ct-cols' }, aspect.el, fx.el, fy.el, fw.el, fh.el, fmtF.el));
		editor.appendChild(ui.actions(cropBtn, ui.button(__('Otra imagen'), { icon: 'refresh-ccw', variant: 'ghost', onClick: function () { img = null; editor.hidden = true; drop.el.hidden = false; result.clear(); } })));
		el.appendChild(drop.el);
		el.appendChild(editor);
		el.appendChild(result.el);
	};

	tools.dpi = function (el) {
		var dpiF;
		batchTool(el, {
			button: __('Cambiar DPI'), icon: 'printer', zipName: 'imagenes-dpi', accept: '.jpg,.jpeg,.png,image/jpeg,image/png', hint: __('Solo JPG y PNG. La imagen no se recomprime: solo se cambia el dato de resolución.'),
			options: function (panel) {
				dpiF = ui.field({ label: __('Resolución'), type: 'select', value: '300', options: [72, 96, 150, 200, 240, 300, 350, 600].map(function (d) { return { value: String(d), label: d + ' ppp' }; }) });
				panel.appendChild(dpiF.el);
				panel.appendChild(h('p', { class: 'ct-help', text: __('Los DPI solo indican a qué tamaño se imprimirá la imagen: no añaden detalle ni cambian los píxeles. Para más calidad de impresión se necesita una imagen con más píxeles.') }));
				return function () { return { dpi: parseInt(dpiF.input.value, 10) }; };
			},
			process: function (file, img, o) {
				return CT.readFile(file).then(function (buf) {
					var before = CT.imgmeta.readDpi(buf);
					var out = CT.imgmeta.setDpi(buf, o.dpi);
					var wcm = img.naturalWidth / o.dpi * 2.54, hcm = img.naturalHeight / o.dpi * 2.54;
					return { blob: new Blob([out], { type: file.type || MIME[extOf(file)] }), name: outName(file, o.dpi + 'ppp', extOf(file) === 'png' ? 'png' : 'jpg'), w: img.naturalWidth, h: img.naturalHeight, note: CT.sprintf(__('antes: %1$s · impresión: %2$s × %3$s cm'), before ? before + ' ppp' : __('sin dato'), N(wcm, 1), N(hcm, 1)) };
				});
			}
		});
	};

	tools.compare = function (el) {
		var a = null, b = null;
		var view = h('div');
		var update = function () {
			view.innerHTML = '';
			if (!a || !b) { return; }
			view.appendChild(compareSlider(a.url, b.url, [__('Imagen A'), __('Imagen B')]));
			var stats = [[__('Imagen A'), a.w + ' × ' + a.h + ' px · ' + CT.fmt.bytes(a.size)], [__('Imagen B'), b.w + ' × ' + b.h + ' px · ' + CT.fmt.bytes(b.size)]];
			if (a.w === b.w && a.h === b.h && a.w * a.h <= 25e6) {
				var ca = render(a.img, a.w, a.h), cb = render(b.img, b.w, b.h);
				var da = ca.getContext('2d').getImageData(0, 0, a.w, a.h).data, db = cb.getContext('2d').getImageData(0, 0, b.w, b.h).data;
				var changed = 0, sum = 0;
				for (var i = 0; i < da.length; i += 4) {
					var d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) + Math.abs(da[i + 3] - db[i + 3]);
					sum += d; if (d > 12) { changed++; }
				}
				stats.push([__('Píxeles con diferencias apreciables'), N(changed / (a.w * a.h) * 100, 2) + ' %'], [__('Diferencia media por canal'), N(sum / (a.w * a.h * 4), 2) + ' / 255']);
			} else {
				stats.push([__('Diferencia de píxeles'), __('Solo se calcula si las dos imágenes tienen las mismas dimensiones.')]);
			}
			view.appendChild(ui.resultCard({ label: __('Comparación'), stats: stats }));
			CT.track('done');
		};
		var pick = function (label, set) {
			return ui.dropzone({ accept: ACCEPT, compact: true, title: label, hint: '', onFiles: function (fs) { load(fs[0]).then(function (r) { set({ img: r.img, url: r.url, w: r.width, h: r.height, size: fs[0].size }); update(); }).catch(function (e) { CT.toast(e.message, 'error'); }); } });
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, pick(__('Imagen A (antes)'), function (v) { a = v; }).el, pick(__('Imagen B (después)'), function (v) { b = v; }).el));
		el.appendChild(h('div', { style: { marginTop: '16px' } }, view));
	};

	function metaSummary(ex) {
		if (!ex) { return __('sin EXIF'); }
		var parts = [];
		if (ex.make || ex.model) { parts.push(((ex.make || '') + ' ' + (ex.model || '')).trim()); }
		if (ex.taken || ex.datetime) { parts.push(ex.taken || ex.datetime); }
		if (ex.gps) { parts.push('GPS ' + N(ex.gps.lat, 5) + ', ' + N(ex.gps.lng, 5)); }
		else if (ex.hasGps) { parts.push(__('contiene datos GPS')); }
		return parts.join(' · ') || __('EXIF sin datos destacados');
	}

	tools.exif = function (el) {
		var keepIcc;
		batchTool(el, {
			button: __('Eliminar metadatos'), icon: 'eraser', zipName: 'imagenes-sin-metadatos', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', hint: __('JPG, PNG o WebP. Se eliminan los metadatos sin recomprimir la imagen.'),
			options: function (panel) {
				keepIcc = ui.field({ type: 'checkbox', label: __('Conservar el perfil de color (ICC) para no alterar los colores'), value: true });
				panel.appendChild(keepIcc.el);
				panel.appendChild(h('p', { class: 'ct-help', text: __('Se eliminan EXIF (cámara, fecha, ubicación GPS), XMP, IPTC y comentarios. La orientación EXIF también se elimina: si la foto aparece girada, gírala después con la herramienta de girar imágenes.') }));
				return function () { return { icc: keepIcc.input.checked }; };
			},
			process: function (file, img, o) {
				return CT.readFile(file).then(function (buf) {
					var ex = CT.imgmeta.readExif(buf);
					var r = CT.imgmeta.strip(buf, o.icc);
					if (!r) { throw new Error(__('Formato no compatible.')); }
					return { blob: new Blob([r.data], { type: file.type || 'image/jpeg' }), name: outName(file, 'sin-metadatos', extOf(file)), w: img.naturalWidth, h: img.naturalHeight, note: CT.sprintf(__('%1$d bloques eliminados · antes: %2$s'), r.removed, metaSummary(ex)) };
				});
			}
		});
	};

	tools.info = function (el) {
		var result = h('div');
		var drop = ui.dropzone({ accept: ACCEPT, multiple: true, hint: __('Consulta dimensiones, peso, formato real y metadatos sin subir la imagen.'), onFiles: function (fs) {
			result.innerHTML = '';
			fs.forEach(function (f) {
				CT.readFile(f).then(function (buf) {
					var sn = CT.sniff(buf), d = CT.imgmeta.dims(buf), ex = null, dpi = null;
					try { ex = CT.imgmeta.readExif(buf); dpi = CT.imgmeta.readDpi(buf); } catch (e) { /* sin metadatos legibles */ }
					var show = function (w, hh) {
						var g = function (a, b) { return b ? g(b, a % b) : a; }, k = g(w, hh);
						var rows = [[__('Archivo'), f.name], [__('Tamaño'), CT.fmt.bytes(f.size) + ' (' + N(f.size) + ' bytes)'], [__('Formato real'), sn ? sn.label + ' (' + sn.mime + ')' : __('desconocido')], [__('Extensión'), '.' + CT.fileExt(f.name)]];
						if (sn && CT.fileExt(f.name) && sn.ext !== extOf(f) && !(sn.ext === 'jpg' && extOf(f) === 'jpg')) { rows.push([__('Aviso'), __('La extensión no coincide con el contenido real del archivo.')]); }
						if (w) { rows.push([__('Dimensiones'), w + ' × ' + hh + ' px'], [__('Megapíxeles'), N(w * hh / 1e6, 2) + ' MP'], [__('Proporción'), (w / k) + ':' + (hh / k) + ' (' + N(w / hh, 3) + ')']); }
						rows.push([__('Resolución (DPI)'), dpi ? dpi + ' ppp' + (w ? ' · ' + CT.sprintf(__('impresión: %1$s × %2$s cm'), N(w / dpi * 2.54, 1), N(hh / dpi * 2.54, 1)) : '') : __('no indicada')]);
						if (ex) {
							if (ex.make || ex.model) { rows.push([__('Cámara'), ((ex.make || '') + ' ' + (ex.model || '')).trim()]); }
							if (ex.taken || ex.datetime) { rows.push([__('Fecha'), ex.taken || ex.datetime]); }
							if (ex.software) { rows.push([__('Software'), ex.software]); }
							if (ex.gps) { rows.push([__('Ubicación GPS'), N(ex.gps.lat, 6) + ', ' + N(ex.gps.lng, 6) + ' ⚠ ' + __('la foto revela dónde se tomó')]); }
							else if (ex.hasGps) { rows.push([__('Ubicación GPS'), __('contiene un bloque GPS')]); }
						}
						result.appendChild(h('div', { class: 'ct-panel' }, ui.table([__('Dato'), __('Valor')], rows, { wrap: true, caption: f.name })));
					};
					if (d) { show(d.w, d.h); } else { load(f).then(function (r) { show(r.width, r.height); URL.revokeObjectURL(r.url); }).catch(function () { show(0, 0); }); }
					CT.track('done');
				});
			});
		} });
		el.appendChild(drop.el);
		el.appendChild(result);
	};

	tools.thumbs = function (el) {
		var sizes, square, fmtF;
		batchTool(el, {
			button: __('Crear miniaturas'), icon: 'layers', zipName: 'miniaturas',
			options: function (panel) {
				sizes = ui.field({ label: __('Anchos (separados por comas)'), value: '150, 300, 600', help: __('Se crea una miniatura por cada tamaño.') });
				square = ui.field({ type: 'checkbox', label: __('Recortar en cuadrado (centrado)'), value: false });
				var g = h('div', { class: 'ct-cols' }, sizes.el); panel.appendChild(g);
				fmtF = formatField(g, 'webp', true);
				panel.appendChild(square.el);
				return function () {
					var list = sizes.input.value.split(/[,;\s]+/).map(function (s) { return parseInt(s, 10); }).filter(function (n) { return n > 0 && n <= 4000; });
					if (!list.length) { sizes.error(__('Indica al menos un ancho válido.')); return false; }
					sizes.error('');
					return { sizes: list.slice(0, 10), square: square.input.checked, fmt: fmtF.input.value };
				};
			},
			process: function (file, img, o) {
				var fmt = resolveFormat(o.fmt, file);
				return Promise.all(o.sizes.map(function (s) {
					var W = img.naturalWidth, H = img.naturalHeight, c;
					if (o.square) {
						var side = Math.min(W, H);
						c = render(img, s, s, { bg: needsBg(fmt) ? '#ffffff' : null, draw: function (ctx) { ctx.drawImage(img, (W - side) / 2, (H - side) / 2, side, side, 0, 0, s, s); } });
					} else { c = downscale(img, Math.min(s, W), Math.round(Math.min(s, W) * H / W), needsBg(fmt) ? '#ffffff' : null); }
					return encode(c, fmt, 0.85).then(function (b) { return { blob: b, name: outName(file, c.width + 'x' + c.height, fmt), w: c.width, h: c.height, label: c.width + ' px' }; });
				}));
			}
		});
	};

	function pixelTool(el, opts) {
		var fmtF, sliders = {};
		var previewImg = h('img', { alt: __('Vista previa'), style: { maxHeight: '360px' } });
		var preview = h('div', { class: 'ct-preview', hidden: true }, previewImg);
		var lastFile = null, lastImg = null;
		var drawPreview = CT.debounce(function () {
			if (!lastImg) { return; }
			var s = fitSize(lastImg.naturalWidth, lastImg.naturalHeight, 900, 600);
			var c = render(lastImg, s.w, s.h);
			opts.apply(c.getContext('2d').getImageData(0, 0, c.width, c.height), vals(), c);
			previewImg.src = c.toDataURL('image/jpeg', 0.85);
			preview.hidden = false;
		}, 80);
		var vals = function () { var v = {}; Object.keys(sliders).forEach(function (k) { v[k] = parseFloat(sliders[k].value); }); return v; };
		var tool = batchTool(el, {
			button: opts.button, icon: opts.icon, zipName: opts.zip,
			options: function (panel) {
				(opts.sliders || []).forEach(function (sd) {
					var f = ui.field({ label: sd.label, type: 'range', value: sd.value, min: sd.min, max: sd.max, step: sd.step || 1 });
					f.input.classList.add('ct-range');
					var out = h('output', { class: 'ct-chip', text: f.input.value });
					f.el.querySelector('label').append(' ', out);
					f.input.addEventListener('input', function () { out.textContent = f.input.value; drawPreview(); });
					sliders[sd.key] = f.input;
					panel.appendChild(f.el);
				});
				var g = h('div', { class: 'ct-cols' }); panel.appendChild(g);
				fmtF = formatField(g, 'same', true);
				panel.appendChild(preview);
				return function () { return { fmt: fmtF.input.value, v: vals() }; };
			},
			process: function (file, img, o) {
				var fmt = resolveFormat(o.fmt, file);
				var c = render(img, img.naturalWidth, img.naturalHeight, { bg: needsBg(fmt) ? '#ffffff' : null });
				opts.apply(c.getContext('2d').getImageData(0, 0, c.width, c.height), o.v, c);
				return encode(c, fmt, 0.92).then(function (b) { return { blob: b, name: outName(file, opts.suffix, fmt), w: c.width, h: c.height }; });
			}
		});
		// Vista previa con la primera imagen añadida.
		var input = el.querySelector('input[type="file"]');
		var onPick = function () {
			setTimeout(function () {
				var fs = tool.files();
				if (fs.length && fs[0].file !== lastFile) { lastFile = fs[0].file; load(lastFile).then(function (r) { lastImg = r.img; drawPreview(); }).catch(function () {}); }
			}, 50);
		};
		input.addEventListener('change', onPick);
		el.querySelector('.ct-drop').addEventListener('drop', onPick);
	}
	function putBack(id, c) { c.getContext('2d').putImageData(id, 0, 0); }

	tools.grayscale = function (el) {
		pixelTool(el, {
			button: __('Convertir a blanco y negro'), icon: 'contrast', zip: 'imagenes-grises', suffix: 'grises',
			sliders: [{ key: 'sepia', label: __('Tono sepia'), value: 0, min: 0, max: 100 }],
			apply: function (id, v, c) {
				var d = id.data, s = (v.sepia || 0) / 100;
				for (var i = 0; i < d.length; i += 4) {
					var y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
					d[i] = Math.min(255, y + s * 40); d[i + 1] = Math.min(255, y + s * 20); d[i + 2] = Math.max(0, y - s * 20);
				}
				putBack(id, c);
			}
		});
	};

	tools.adjust = function (el) {
		pixelTool(el, {
			button: __('Aplicar ajustes'), icon: 'sliders-horizontal', zip: 'imagenes-ajustadas', suffix: 'ajustada',
			sliders: [{ key: 'b', label: __('Brillo'), value: 0, min: -100, max: 100 }, { key: 'c', label: __('Contraste'), value: 0, min: -100, max: 100 }, { key: 's', label: __('Saturación'), value: 0, min: -100, max: 100 }],
			apply: function (id, v, c) {
				var d = id.data, b = v.b * 2.55, ct = v.c * 2.55, f = (259 * (ct + 255)) / (255 * (259 - ct)), sat = 1 + v.s / 100;
				for (var i = 0; i < d.length; i += 4) {
					for (var k = 0; k < 3; k++) { d[i + k] = f * (d[i + k] + b - 128) + 128; }
					var y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
					for (var j = 0; j < 3; j++) { d[i + j] = Math.max(0, Math.min(255, y + (d[i + j] - y) * sat)); }
				}
				putBack(id, c);
			}
		});
	};

	var SOCIAL = [
		{ value: '1080x1080', label: __('Publicación cuadrada · 1080 × 1080') }, { value: '1080x1350', label: __('Publicación vertical 4:5 · 1080 × 1350') },
		{ value: '1080x1920', label: __('Historias y reels 9:16 · 1080 × 1920') }, { value: '1200x630', label: __('Imagen para compartir enlaces · 1200 × 630') },
		{ value: '1500x500', label: __('Cabecera 3:1 · 1500 × 500') }, { value: '1584x396', label: __('Banner 4:1 · 1584 × 396') },
		{ value: '1280x720', label: __('Miniatura de vídeo 16:9 · 1280 × 720') }, { value: '400x400', label: __('Foto de perfil · 400 × 400') }
	];
	tools.social = function (el, tool) {
		var preset, fit, bgc, fmtF, pad;
		var catalog = tool.config && tool.config.catalog;
		batchTool(el, {
			button: catalog ? __('Preparar para catálogo') : __('Adaptar'), icon: catalog ? 'package' : 'share-2', zipName: catalog ? 'imagenes-catalogo' : 'imagenes-redes',
			options: function (panel) {
				var g = h('div', { class: 'ct-cols' }); panel.appendChild(g);
				preset = ui.field({ label: __('Tamaño'), type: 'select', value: catalog ? '1200x1200' : '1080x1080', options: catalog ? [{ value: '800x800', label: '800 × 800' }, { value: '1000x1000', label: '1000 × 1000' }, { value: '1200x1200', label: '1200 × 1200' }, { value: '1500x1500', label: '1500 × 1500' }, { value: '2000x2000', label: '2000 × 2000' }] : SOCIAL });
				fit = ui.field({ label: __('Ajuste'), type: 'select', value: catalog ? 'contain' : 'cover', options: [{ value: 'cover', label: __('Rellenar (recorta lo que sobra)') }, { value: 'contain', label: __('Encajar completa (añade fondo)') }] });
				pad = ui.field({ label: __('Margen interior'), type: 'select', value: catalog ? '6' : '0', options: [0, 3, 6, 10, 15].map(function (p) { return { value: String(p), label: p + ' %' }; }) });
				fmtF = formatField(g, 'jpg', false);
				[preset, fit, pad].forEach(function (f) { g.appendChild(f.el); });
				var c = h('input', { type: 'color', class: 'ct-color', value: '#ffffff', 'aria-label': __('Color de fondo') });
				panel.appendChild(h('div', { class: 'ct-field' }, h('label', { class: 'ct-label', text: __('Color de fondo') }), c));
				bgc = function () { return c.value; };
				if (!catalog) { panel.appendChild(h('p', { class: 'ct-help', text: __('Tamaños de referencia habituales; cada red social puede cambiar sus recomendaciones. Comprueba las indicaciones actuales de la plataforma.') })); }
				return function () { var p = preset.input.value.split('x'); return { w: +p[0], h: +p[1], fit: fit.input.value, bg: bgc(), pad: parseInt(pad.input.value, 10) / 100, fmt: fmtF.input.value }; };
			},
			process: function (file, img, o) {
				var W = img.naturalWidth, H = img.naturalHeight;
				var c = render(img, o.w, o.h, { bg: o.bg, draw: function (ctx) {
					var px = o.w * o.pad, py = o.h * o.pad, aw = o.w - px * 2, ah = o.h - py * 2;
					var r = o.fit === 'cover' ? Math.max(aw / W, ah / H) : Math.min(aw / W, ah / H);
					var dw = W * r, dh = H * r;
					ctx.save(); ctx.beginPath(); ctx.rect(px, py, aw, ah); ctx.clip();
					ctx.drawImage(img, px + (aw - dw) / 2, py + (ah - dh) / 2, dw, dh);
					ctx.restore();
				} });
				return encode(c, o.fmt, 0.88).then(function (b) { return { blob: b, name: outName(file, o.w + 'x' + o.h, o.fmt), w: o.w, h: o.h }; });
			}
		});
	};

	tools.blank = function (el) {
		var w = ui.field({ label: __('Ancho'), type: 'number', integer: true, unit: 'px', value: 1200 });
		var hh = ui.field({ label: __('Alto'), type: 'number', integer: true, unit: 'px', value: 630 });
		var bg = h('input', { type: 'color', class: 'ct-color', value: '#5b3df5', 'aria-label': __('Color de fondo') });
		var transparent = ui.field({ type: 'checkbox', label: __('Fondo transparente (PNG o WebP)'), value: false });
		var text = ui.field({ label: __('Texto (opcional)'), value: '1200 × 630' });
		var tc = h('input', { type: 'color', class: 'ct-color', value: '#ffffff', 'aria-label': __('Color del texto') });
		var size = ui.field({ label: __('Tamaño del texto'), type: 'number', integer: true, unit: 'px', value: 64 });
		var fmtF = ui.field({ label: __('Formato'), type: 'select', value: 'png', options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }] });
		var preview = h('div', { class: 'ct-preview' });
		var canvas = null;
		var draw = function () {
			var W = w.get(), H = hh.get();
			w.error(W >= 1 && W <= 8000 ? '' : __('Entre 1 y 8000 px.')); hh.error(H >= 1 && H <= 8000 ? '' : __('Entre 1 y 8000 px.'));
			if (!(W >= 1 && W <= 8000 && H >= 1 && H <= 8000)) { return; }
			canvas = canvasFor(W, H);
			var ctx = canvas.getContext('2d');
			if (!transparent.input.checked || fmtF.input.value === 'jpg') { ctx.fillStyle = bg.value; ctx.fillRect(0, 0, W, H); }
			if (text.input.value) {
				ctx.fillStyle = tc.value; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
				ctx.font = '700 ' + (size.get() || 48) + 'px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
				ctx.fillText(text.input.value, W / 2, H / 2, W * 0.92);
			}
			preview.innerHTML = '';
			var p = h('canvas'); p.width = canvas.width; p.height = canvas.height; p.getContext('2d').drawImage(canvas, 0, 0); p.style.maxWidth = '100%';
			preview.appendChild(p);
		};
		el.appendChild(h('div', { class: 'ct-cols' }, w.el, hh.el, fmtF.el, text.el, size.el));
		el.appendChild(h('div', { class: 'ct-row' }, h('label', { class: 'ct-row' }, bg, h('span', { text: __('Fondo') })), h('label', { class: 'ct-row' }, tc, h('span', { text: __('Texto') })), transparent.el));
		el.appendChild(ui.actions(ui.button(__('Descargar imagen'), { variant: 'primary', icon: 'download', onClick: function () { if (!canvas) { return; } encode(canvas, fmtF.input.value, 0.92).then(function (b) { CT.download(b, 'imagen-' + canvas.width + 'x' + canvas.height + '.' + fmtF.input.value); }); } })));
		el.appendChild(preview);
		[w.input, hh.input, bg, transparent.input, text.input, tc, size.input, fmtF.input].forEach(function (i) { i.addEventListener('input', CT.debounce(draw, 120)); i.addEventListener('change', draw); });
		draw();
	};

	tools.dimcheck = function (el) {
		var f = {};
		var defs = [['minW', __('Ancho mínimo (px)'), 800], ['maxW', __('Ancho máximo (px)'), ''], ['minH', __('Alto mínimo (px)'), 600], ['maxH', __('Alto máximo (px)'), ''], ['ratio', __('Proporción exigida (p. ej. 16:9)'), ''], ['maxKb', __('Peso máximo (KB)'), 2048]];
		var grid = h('div', { class: 'ct-cols' });
		defs.forEach(function (d) { f[d[0]] = ui.field({ label: d[1], type: d[0] === 'ratio' ? 'text' : 'number', value: d[2] }); grid.appendChild(f[d[0]].el); });
		var formats = ui.field({ label: __('Formatos permitidos'), value: 'jpg, png, webp' });
		grid.appendChild(formats.el);
		var result = h('div');
		var rows = [];
		var render2 = function () {
			result.innerHTML = '';
			if (!rows.length) { return; }
			var ok = rows.filter(function (r) { return !r.issues.length; }).length;
			result.appendChild(ui.alert(ok === rows.length ? 'ok' : 'warn', CT.sprintf(__('%1$d de %2$d imágenes cumplen los requisitos.'), ok, rows.length)));
			result.appendChild(ui.table([__('Archivo'), __('Dimensiones'), __('Peso'), __('Resultado')], rows.map(function (r) { return [r.name, r.w + ' × ' + r.h, CT.fmt.bytes(r.size), r.issues.length ? '✗ ' + r.issues.join('; ') : '✓ ' + __('Cumple')]; }), { wrap: true }));
		};
		var check = function (r) {
			var g = function (k) { var v = CT.parseNum(f[k].input.value); return isFinite(v) ? v : null; };
			var issues = [];
			if (g('minW') !== null && r.w < g('minW')) { issues.push(CT.sprintf(__('ancho menor de %d px'), g('minW'))); }
			if (g('maxW') !== null && r.w > g('maxW')) { issues.push(CT.sprintf(__('ancho mayor de %d px'), g('maxW'))); }
			if (g('minH') !== null && r.h < g('minH')) { issues.push(CT.sprintf(__('alto menor de %d px'), g('minH'))); }
			if (g('maxH') !== null && r.h > g('maxH')) { issues.push(CT.sprintf(__('alto mayor de %d px'), g('maxH'))); }
			if (g('maxKb') !== null && r.size > g('maxKb') * 1024) { issues.push(CT.sprintf(__('pesa más de %d KB'), g('maxKb'))); }
			var m = /^(\d+(?:[.,]\d+)?)\s*[:x×\/]\s*(\d+(?:[.,]\d+)?)$/.exec(f.ratio.input.value.trim());
			if (m) { var want = CT.parseNum(m[1]) / CT.parseNum(m[2]); if (Math.abs(r.w / r.h - want) / want > 0.01) { issues.push(CT.sprintf(__('proporción distinta de %s'), f.ratio.input.value.trim())); } }
			var allowed = formats.input.value.toLowerCase().split(/[,\s]+/).filter(Boolean).map(function (x) { return x === 'jpeg' ? 'jpg' : x; });
			if (allowed.length && allowed.indexOf(r.fmt) < 0) { issues.push(CT.sprintf(__('formato %s no permitido'), r.fmt.toUpperCase())); }
			r.issues = issues;
		};
		var drop = ui.dropzone({ accept: ACCEPT, multiple: true, hint: __('Añade las imágenes que quieres validar.'), onFiles: function (fs) {
			Promise.all(fs.map(function (file) {
				return CT.readFile(file).then(function (buf) {
					var sn = CT.sniff(buf), d = CT.imgmeta.dims(buf);
					var fin = function (w, hh2) { var r = { name: file.name, w: w, h: hh2, size: file.size, fmt: sn ? sn.ext : CT.fileExt(file.name) }; check(r); rows.push(r); };
					if (d) { fin(d.w, d.h); return null; }
					return load(file).then(function (r) { fin(r.width, r.height); URL.revokeObjectURL(r.url); }).catch(function () { fin(0, 0); });
				});
			})).then(function () { render2(); CT.track('done'); });
		} });
		el.appendChild(h('div', { class: 'ct-panel' }, h('h3', { class: 'ct-panel__title', text: __('Requisitos (deja en blanco los que no apliquen)') }), grid));
		el.appendChild(drop.el);
		el.appendChild(ui.actions(ui.button(__('Volver a comprobar'), { icon: 'refresh-ccw', onClick: function () { rows.forEach(check); render2(); } }), ui.button(__('Vaciar'), { icon: 'trash-2', variant: 'ghost', onClick: function () { rows = []; render2(); } })));
		el.appendChild(result);
	};

	CT.register('image', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
	CT.imageTools = { render: render, encode: encode, load: load, fitSize: fitSize, downscale: downscale };
})();
