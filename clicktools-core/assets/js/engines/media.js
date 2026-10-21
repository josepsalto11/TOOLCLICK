/*!
 * HerramientasClave — utilidades de vídeo y audio con las API del navegador (sin subir archivos).
 * Lo que requiere un motor como FFmpeg (convertir vídeo, MP3…) se ofrece aparte y solo
 * si el servidor lo tiene disponible.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;
	var VIDEO = 'video/*,.mp4,.webm,.mov,.mkv,.m4v,.ogv';
	var AUDIO = 'audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm';

	function mediaElement(file, kind) {
		return new Promise(function (resolve, reject) {
			var url = URL.createObjectURL(file);
			var el = document.createElement(kind);
			el.preload = 'metadata';
			el.muted = true;
			el.playsInline = true;
			el.onloadedmetadata = function () { resolve({ el: el, url: url }); };
			el.onerror = function () { URL.revokeObjectURL(url); reject(new Error(kind === 'video' ? __('Tu navegador no puede leer este vídeo (formato o códec no compatible). Prueba con MP4 (H.264) o WebM.') : __('Tu navegador no puede leer este audio. Prueba con MP3, WAV, OGG o M4A.'))); };
			el.src = url;
		});
	}
	function ratio(w, hh) { var g = function (a, b) { return b ? g(b, a % b) : a; }, k = g(w, hh); return (w / k) + ':' + (hh / k); }

	var tools = {};

	tools.videoinfo = function (el) {
		var result = h('div');
		var drop = ui.dropzone({ accept: VIDEO, hint: __('El vídeo se analiza en tu dispositivo; no se sube.'), maxMb: 8192, onFiles: function (fs) {
			var f = fs[0];
			result.innerHTML = '';
			Promise.all([mediaElement(f, 'video'), CT.readHead(f, 4100)]).then(function (res) {
				var v = res[0].el, sn = CT.sniff(res[1]);
				var d = v.duration;
				var rows = [[__('Archivo'), f.name], [__('Formato real'), sn ? sn.label : (f.type || __('desconocido'))], [__('Tamaño'), CT.fmt.bytes(f.size)], [__('Duración'), isFinite(d) ? CT.fmt.duration(d) + ' (' + N(d, 2) + ' s)' : __('desconocida')], [__('Resolución'), v.videoWidth ? v.videoWidth + ' × ' + v.videoHeight + ' px' : __('sin pista de vídeo')]];
				if (v.videoWidth) { rows.push([__('Relación de aspecto'), ratio(v.videoWidth, v.videoHeight) + ' (' + N(v.videoWidth / v.videoHeight, 3) + ')']); }
				if (isFinite(d) && d > 0) { rows.push([__('Bitrate medio aproximado'), N(f.size * 8 / d / 1000, 0) + ' kbit/s']); }
				var preview = h('video', { src: res[0].url, controls: true, playsinline: true, style: { maxWidth: '100%', maxHeight: '320px', borderRadius: '12px', background: '#000' } });
				var frameBtn = ui.button(__('Guardar fotograma actual (PNG)'), { icon: 'image', onClick: function () {
					var c = document.createElement('canvas'); c.width = preview.videoWidth; c.height = preview.videoHeight;
					c.getContext('2d').drawImage(preview, 0, 0);
					CT.canvasToBlob(c, 'image/png').then(function (b) { CT.download(b, CT.baseName(f.name) + '-' + N(preview.currentTime, 1).replace(',', '_') + 's.png'); });
				} });
				result.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, ui.table([__('Propiedad'), __('Valor')], rows, { wrap: true, caption: f.name }), h('div', null, preview, v.videoWidth ? ui.actions(frameBtn) : null)));
				result.appendChild(h('p', { class: 'ct-help', text: __('El navegador no expone el códec, los fotogramas por segundo ni el bitrate de cada pista; el bitrate mostrado es la media del archivo completo.') }));
				CT.track('done');
			}).catch(function (e) { result.appendChild(ui.alert('err', e.message)); });
		} });
		el.appendChild(drop.el);
		el.appendChild(result);
	};

	function decodeAudio(file) {
		if (file.size > 400 * 1024 * 1024) { return Promise.reject(new Error(__('El archivo es demasiado grande para decodificarlo en el navegador (máximo 400 MB).'))); }
		var Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) { return Promise.reject(new Error(__('Tu navegador no permite procesar audio.'))); }
		var ctx = new Ctx();
		return CT.readFile(file).then(function (buf) {
			return new Promise(function (resolve, reject) {
				var p = ctx.decodeAudioData(buf, resolve, function () { reject(new Error(__('No se ha podido decodificar el audio. Puede que el archivo no tenga pista de audio o que tu navegador no admita su códec.'))); });
				if (p && p.catch) { p.catch(function () { /* gestionado en el callback */ }); }
			});
		}).then(function (ab) { if (ctx.close) { ctx.close(); } return ab; });
	}
	CT.decodeAudio = decodeAudio;

	/** Codifica un AudioBuffer en WAV PCM de 16 bits. */
	function toWav(ab, opts) {
		opts = opts || {};
		var chans = opts.mono ? 1 : Math.min(2, ab.numberOfChannels);
		var start = Math.floor((opts.start || 0) * ab.sampleRate), end = Math.min(ab.length, opts.end ? Math.floor(opts.end * ab.sampleRate) : ab.length);
		var len = Math.max(0, end - start);
		var buf = new ArrayBuffer(44 + len * chans * 2), dv = new DataView(buf);
		var w = function (o, s) { for (var i = 0; i < s.length; i++) { dv.setUint8(o + i, s.charCodeAt(i)); } };
		w(0, 'RIFF'); dv.setUint32(4, 36 + len * chans * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
		dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, chans, true); dv.setUint32(24, ab.sampleRate, true);
		dv.setUint32(28, ab.sampleRate * chans * 2, true); dv.setUint16(32, chans * 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, len * chans * 2, true);
		var data = [];
		for (var c = 0; c < ab.numberOfChannels; c++) { data.push(ab.getChannelData(c)); }
		var off = 44;
		for (var i = start; i < end; i++) {
			for (var ch = 0; ch < chans; ch++) {
				var s;
				if (opts.mono) { s = 0; for (var k = 0; k < data.length; k++) { s += data[k][i]; } s /= data.length; } else { s = data[Math.min(ch, data.length - 1)][i]; }
				s = Math.max(-1, Math.min(1, s));
				dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
				off += 2;
			}
		}
		return new Blob([buf], { type: 'audio/wav' });
	}
	CT.toWav = toWav;
	function resample(ab, rate) {
		if (!rate || rate === ab.sampleRate) { return Promise.resolve(ab); }
		var Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
		var ctx = new Off(ab.numberOfChannels, Math.ceil(ab.duration * rate), rate);
		var src = ctx.createBufferSource(); src.buffer = ab; src.connect(ctx.destination); src.start();
		return ctx.startRendering();
	}

	tools.audioinfo = function (el) {
		var result = h('div');
		var drop = ui.dropzone({ accept: AUDIO, hint: __('El audio se analiza en tu dispositivo; no se sube.'), maxMb: 2048, onFiles: function (fs) {
			var f = fs[0];
			result.innerHTML = '';
			var progress = ui.progress(); result.appendChild(progress.el); progress.indeterminate(__('Analizando…'));
			Promise.all([CT.readHead(f, 4100), mediaElement(f, 'audio')]).then(function (res) {
				var sn = CT.sniff(res[0]), d = res[1].el.duration;
				var rows = [[__('Archivo'), f.name], [__('Formato real'), sn ? sn.label : (f.type || __('desconocido'))], [__('Tamaño'), CT.fmt.bytes(f.size)], [__('Duración'), isFinite(d) ? CT.fmt.duration(d) + ' (' + N(d, 2) + ' s)' : __('desconocida')]];
				if (isFinite(d) && d > 0) { rows.push([__('Bitrate medio aproximado'), N(f.size * 8 / d / 1000, 0) + ' kbit/s']); }
				var finish = function (extra) {
					progress.done();
					result.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, ui.table([__('Propiedad'), __('Valor')], rows.concat(extra || []), { wrap: true, caption: f.name }), h('audio', { src: res[1].url, controls: true, style: { width: '100%' } })));
					CT.track('done');
				};
				if (f.size <= 150 * 1024 * 1024) {
					decodeAudio(f).then(function (ab) {
						var peak = 0, sum = 0, n = 0;
						for (var c = 0; c < ab.numberOfChannels; c++) { var dta = ab.getChannelData(c); for (var i = 0; i < dta.length; i += 4) { var a = Math.abs(dta[i]); if (a > peak) { peak = a; } sum += dta[i] * dta[i]; n++; } }
						var db = function (x) { return x > 0 ? N(20 * Math.log10(x), 1) + ' dBFS' : '−∞'; };
						finish([[__('Frecuencia de muestreo (decodificada)'), N(ab.sampleRate) + ' Hz'], [__('Canales'), ab.numberOfChannels === 1 ? __('mono') : ab.numberOfChannels === 2 ? __('estéreo') : String(ab.numberOfChannels)], [__('Pico'), db(peak)], [__('Nivel medio (RMS)'), db(Math.sqrt(sum / n))]]);
					}).catch(function () { finish(); });
				} else { finish(); }
			}).catch(function (e) { progress.done(); result.appendChild(ui.alert('err', e.message)); });
		} });
		el.appendChild(drop.el);
		el.appendChild(result);
	};

	tools.wav = function (el, tool) {
		var fromVideo = tool.config && tool.config.video;
		var file = null, buffer = null;
		var start = ui.field({ label: __('Inicio (segundos)'), type: 'number', value: 0, min: 0 });
		var end = ui.field({ label: __('Fin (segundos, vacío = hasta el final)'), type: 'number', value: '', optional: true });
		var mono = ui.field({ type: 'checkbox', label: __('Convertir a mono (ocupa la mitad)'), value: false });
		var rate = ui.field({ label: __('Frecuencia de muestreo'), type: 'select', value: '', options: [{ value: '', label: __('Mantener') }, { value: '48000', label: '48 000 Hz' }, { value: '44100', label: __('44 100 Hz (CD)') }, { value: '22050', label: '22 050 Hz' }, { value: '16000', label: __('16 000 Hz (voz)') }] });
		var info = h('div');
		var progress = ui.progress();
		var result = ui.result();
		var drop = ui.dropzone({ accept: fromVideo ? VIDEO : AUDIO, maxMb: 400, hint: fromVideo ? __('MP4, WebM o MOV con pista de audio. Máximo 400 MB.') : __('MP3, OGG, M4A, FLAC, WAV u otros formatos que tu navegador pueda reproducir. Máximo 400 MB.'), onFiles: function (fs) {
			file = fs[0]; buffer = null; info.innerHTML = ''; result.clear();
			progress.indeterminate(__('Decodificando el audio…'));
			decodeAudio(file).then(function (ab) {
				buffer = ab; progress.done();
				var mins = ab.duration / 60;
				info.appendChild(ui.alert('info', CT.sprintf(__('%1$s · duración %2$s · %3$s Hz · %4$d canal(es). El WAV ocupará aprox. %5$s.'), file.name, CT.fmt.duration(ab.duration), N(ab.sampleRate), ab.numberOfChannels, CT.fmt.bytes(ab.duration * ab.sampleRate * Math.min(2, ab.numberOfChannels) * 2))));
				if (mins > 30) { info.appendChild(ui.alert('warn', __('Audio largo: el archivo WAV será muy grande. Puedes recortar un fragmento con inicio y fin.'))); }
				end.input.value = '';
			}).catch(function (e) { progress.done(); CT.fail(result, e); });
		} });
		var btn = ui.button(fromVideo ? __('Extraer audio (WAV)') : __('Convertir a WAV'), { variant: 'primary', icon: 'music', onClick: function () {
			if (!buffer) { result.error(__('Selecciona primero un archivo y espera a que se decodifique.')); return; }
			var s = start.get() || 0, e = end.input.value.trim() ? end.get() : 0;
			if (e && e <= s) { end.error(__('El fin debe ser posterior al inicio.')); return; }
			end.error('');
			if (s >= buffer.duration) { start.error(__('El inicio supera la duración.')); return; }
			start.error('');
			ui.busy(btn, true);
			progress.indeterminate(__('Creando el WAV…'));
			setTimeout(function () {
				resample(buffer, parseInt(rate.input.value, 10) || 0).then(function (ab) {
					var blob = toWav(ab, { mono: mono.input.checked, start: s, end: e });
					progress.done(); ui.busy(btn, false);
					CT.download(blob, CT.baseName(file.name) + '.wav');
					result.set(ui.alert('ok', CT.sprintf(__('WAV creado: %s.'), CT.fmt.bytes(blob.size))));
				}).catch(function (err) { progress.done(); ui.busy(btn, false); CT.fail(result, err); });
			}, 30);
		} });
		el.appendChild(drop.el);
		el.appendChild(info);
		el.appendChild(h('div', { class: 'ct-cols' }, start.el, end.el, rate.el));
		el.appendChild(mono.el);
		el.appendChild(ui.alert('info', __('El resultado es WAV sin compresión (máxima compatibilidad). Para obtener MP3 se necesita un codificador que este sitio solo ofrece si el servidor tiene FFmpeg.')));
		el.appendChild(ui.actions(btn));
		el.appendChild(progress.el);
		el.appendChild(result.el);
	};

	function seek(video, t) { return new Promise(function (resolve) { var done = function () { video.removeEventListener('seeked', done); resolve(); }; video.addEventListener('seeked', done); video.currentTime = t; }); }

	tools.gif = function (el) {
		var file = null, vid = null;
		var start = ui.field({ label: __('Inicio (s)'), type: 'number', value: 0, min: 0 });
		var dur = ui.field({ label: __('Duración (s)'), type: 'number', value: 3, min: 0.2, max: 15 });
		var fps = ui.field({ label: __('Fotogramas por segundo'), type: 'select', value: '10', options: [5, 8, 10, 12, 15].map(function (x) { return { value: String(x), label: String(x) }; }) });
		var width = ui.field({ label: __('Ancho'), type: 'select', value: '360', options: [240, 320, 360, 480].map(function (x) { return { value: String(x), label: x + ' px' }; }) });
		var preview = h('div');
		var progress = ui.progress();
		var result = ui.result();
		var drop = ui.dropzone({ accept: VIDEO, maxMb: 1024, hint: __('Vídeo MP4, WebM o MOV. El GIF admite hasta 15 segundos.'), onFiles: function (fs) {
			file = fs[0]; result.clear(); preview.innerHTML = '';
			mediaElement(file, 'video').then(function (r) {
				vid = r.el;
				if (!vid.videoWidth) { throw new Error(__('El archivo no tiene pista de vídeo.')); }
				preview.appendChild(h('p', { class: 'ct-help', text: CT.sprintf(__('%1$s · %2$s · %3$d × %4$d px'), file.name, CT.fmt.duration(vid.duration), vid.videoWidth, vid.videoHeight) }));
			}).catch(function (e) { CT.fail(result, e); });
		} });
		var btn = ui.button(__('Crear GIF'), { variant: 'primary', icon: 'film', onClick: function () {
			if (!vid) { result.error(__('Selecciona un vídeo.')); return; }
			var s = start.get() || 0, d = Math.min(15, dur.get() || 3), f = parseInt(fps.input.value, 10);
			if (s >= vid.duration) { start.error(__('El inicio supera la duración del vídeo.')); return; }
			start.error('');
			d = Math.min(d, vid.duration - s);
			var w = Math.min(parseInt(width.input.value, 10), vid.videoWidth), hh = Math.round(w * vid.videoHeight / vid.videoWidth / 2) * 2;
			var count = Math.max(1, Math.round(d * f));
			var c = document.createElement('canvas'); c.width = w; c.height = hh;
			var ctx = c.getContext('2d', { willReadFrequently: true });
			var frames = [];
			ui.busy(btn, true);
			var i = 0;
			var grab = function () {
				if (i >= count) { return Promise.resolve(); }
				progress.set(i / count * 0.6, CT.sprintf(__('Capturando fotograma %1$d de %2$d…'), i + 1, count));
				return seek(vid, s + i / f).then(function () { ctx.drawImage(vid, 0, 0, w, hh); frames.push(ctx.getImageData(0, 0, w, hh).data); i++; return grab(); });
			};
			grab().then(function () {
				progress.set(0.65, __('Calculando la paleta de colores…'));
				return new Promise(function (r) { setTimeout(r, 20); });
			}).then(function () {
				var sample = [], step = Math.max(1, Math.floor(frames.length * w * hh / 60000));
				frames.forEach(function (fr) { for (var p = 0; p < fr.length; p += 4 * step) { sample.push(fr[p], fr[p + 1], fr[p + 2], 255); } });
				var palette = CT.gif.quantize(sample, 256);
				var encoded = frames.map(function (fr, k) { progress.set(0.7 + 0.25 * k / frames.length, __('Codificando…')); return { indices: CT.gif.mapPixels(fr, palette), delay: 100 / f }; });
				var bytes = CT.gif.encode(w, hh, palette, encoded, 0);
				var blob = new Blob([bytes], { type: 'image/gif' });
				progress.done(); ui.busy(btn, false);
				var url = URL.createObjectURL(blob);
				result.set(ui.alert('ok', CT.sprintf(__('GIF de %1$d fotogramas, %2$d × %3$d px, %4$s.'), frames.length, w, hh, CT.fmt.bytes(blob.size))), h('div', { class: 'ct-preview' }, h('img', { src: url, alt: __('GIF generado') })), ui.actions(ui.button(__('Descargar GIF'), { variant: 'primary', icon: 'download', onClick: function () { CT.download(blob, CT.baseName(file.name) + '.gif'); } })));
				CT.track('done');
			}).catch(function (e) { progress.done(); ui.busy(btn, false); CT.fail(result, e); });
		} });
		el.appendChild(drop.el);
		el.appendChild(preview);
		el.appendChild(h('div', { class: 'ct-cols' }, start.el, dur.el, fps.el, width.el));
		el.appendChild(ui.actions(btn));
		el.appendChild(progress.el);
		el.appendChild(result.el);
	};

	tools.trim = function (el) {
		var file = null, url = null;
		var player = h('video', { controls: true, playsinline: true, style: { maxWidth: '100%', maxHeight: '320px', borderRadius: '12px', background: '#000' }, hidden: true });
		var start = ui.field({ label: __('Inicio (s)'), type: 'number', value: 0, min: 0 });
		var end = ui.field({ label: __('Fin (s)'), type: 'number', value: 10, min: 0 });
		var progress = ui.progress();
		var result = ui.result();
		var supported = typeof MediaRecorder !== 'undefined' && (HTMLMediaElement.prototype.captureStream || HTMLMediaElement.prototype.mozCaptureStream);
		var drop = ui.dropzone({ accept: VIDEO, maxMb: 2048, hint: __('MP4, WebM o MOV.'), onFiles: function (fs) {
			file = fs[0]; if (url) { URL.revokeObjectURL(url); }
			url = URL.createObjectURL(file); player.src = url; player.hidden = false;
			player.onloadedmetadata = function () { end.input.value = String(Math.min(10, Math.floor(player.duration))).replace('.', ','); };
		} });
		var setStart = ui.button(__('Usar posición actual como inicio'), { size: 'sm', variant: 'ghost', onClick: function () { start.input.value = N(player.currentTime, 2); } });
		var setEnd = ui.button(__('Usar posición actual como fin'), { size: 'sm', variant: 'ghost', onClick: function () { end.input.value = N(player.currentTime, 2); } });
		var btn = ui.button(__('Recortar (WebM)'), { variant: 'primary', icon: 'scissors', onClick: function () {
			if (!file) { result.error(__('Selecciona un vídeo.')); return; }
			var s = start.get() || 0, e = end.get();
			if (!(e > s)) { end.error(__('El fin debe ser posterior al inicio.')); return; }
			end.error('');
			e = Math.min(e, player.duration);
			var stream = (player.captureStream || player.mozCaptureStream).call(player);
			var mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
			if (!mime) { result.error(__('Tu navegador no puede grabar vídeo WebM.')); return; }
			var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5e6 });
			var chunks = [];
			rec.ondataavailable = function (ev) { if (ev.data.size) { chunks.push(ev.data); } };
			rec.onstop = function () {
				var blob = new Blob(chunks, { type: 'video/webm' });
				progress.done(); ui.busy(btn, false); player.controls = true;
				CT.download(blob, CT.baseName(file.name) + '-recorte.webm');
				result.set(ui.alert('ok', CT.sprintf(__('Fragmento grabado: %s.'), CT.fmt.bytes(blob.size))));
			};
			ui.busy(btn, true); player.controls = false;
			seek(player, s).then(function () {
				rec.start(500);
				player.play();
				var tick = setInterval(function () {
					progress.set((player.currentTime - s) / (e - s), CT.sprintf(__('Grabando en tiempo real: %1$s de %2$s'), CT.fmt.duration(player.currentTime - s), CT.fmt.duration(e - s)));
					if (player.currentTime >= e || player.ended) { clearInterval(tick); player.pause(); rec.stop(); }
				}, 100);
			});
		} });
		el.appendChild(drop.el);
		el.appendChild(h('div', { style: { textAlign: 'center' } }, player));
		el.appendChild(h('div', { class: 'ct-cols' }, start.el, end.el));
		el.appendChild(h('div', { class: 'ct-actions' }, setStart, setEnd));
		el.appendChild(supported ? ui.alert('info', __('Beta: el fragmento se reproduce y se graba en tiempo real dentro del navegador, por lo que tarda lo mismo que dura el recorte y se recodifica en WebM. Mantén la pestaña visible durante el proceso.')) : ui.alert('warn', __('Tu navegador no permite grabar vídeo desde la página (por ejemplo, Safari). Prueba con Chrome, Edge o Firefox.')));
		el.appendChild(ui.actions(btn));
		btn.disabled = !supported;
		el.appendChild(progress.el);
		el.appendChild(result.el);
	};

	CT.register('media', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
