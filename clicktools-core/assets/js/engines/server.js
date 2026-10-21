/*!
 * HerramientasClave — interfaz común de herramientas que procesan el archivo en el servidor.
 * Solo se publican si el administrador las activa y el motor existe en el alojamiento.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;

	function options(key, panel) {
		var f = {};
		if (key === 'pdf-protect' || key === 'pdf-unlock') {
			f.password = ui.field({ label: key === 'pdf-protect' ? __('Contraseña para abrir el PDF') : __('Contraseña actual del PDF'), type: 'password', value: '' });
			f.password.input.setAttribute('autocomplete', 'new-password');
			panel.appendChild(f.password.el);
			if (key === 'pdf-protect') {
				f.repeat = ui.field({ label: __('Repite la contraseña'), type: 'password', value: '' });
				f.repeat.input.setAttribute('autocomplete', 'new-password');
				panel.appendChild(f.repeat.el);
			} else {
				panel.appendChild(ui.alert('warn', __('Usa esta herramienta solo con documentos que tengas derecho a desbloquear. No recupera contraseñas olvidadas.')));
			}
		}
		if (key === 'pdf-compress') {
			f.level = ui.field({ label: __('Nivel'), type: 'select', value: 'ebook', options: [{ value: 'screen', label: __('Máxima compresión (pantalla, 72 ppp)') }, { value: 'ebook', label: __('Equilibrado (150 ppp)') }, { value: 'printer', label: __('Alta calidad (300 ppp)') }] });
			panel.appendChild(f.level.el);
		}
		if (key === 'video-convert' || key === 'video-compress') {
			f.format = ui.field({ label: __('Formato de salida'), type: 'select', value: 'mp4', options: [{ value: 'mp4', label: 'MP4 (H.264)' }, { value: 'webm', label: 'WebM (VP9)' }] });
			panel.appendChild(f.format.el);
			if (key === 'video-compress') {
				f.crf = ui.field({ label: __('Compresión'), type: 'select', value: '28', options: [{ value: '23', label: __('Ligera (más calidad)') }, { value: '28', label: __('Media') }, { value: '32', label: __('Fuerte (menos peso)') }] });
				f.height = ui.field({ label: __('Resolución máxima'), type: 'select', value: '', options: [{ value: '', label: __('Mantener') }, { value: '1080', label: '1080p' }, { value: '720', label: '720p' }, { value: '480', label: '480p' }, { value: '360', label: '360p' }] });
				panel.appendChild(f.crf.el); panel.appendChild(f.height.el);
			}
		}
		if (key === 'audio-convert') {
			f.format = ui.field({ label: __('Formato de salida'), type: 'select', value: 'mp3', options: [{ value: 'mp3', label: 'MP3' }, { value: 'm4a', label: 'M4A (AAC)' }, { value: 'ogg', label: 'OGG (Vorbis)' }, { value: 'wav', label: 'WAV' }] });
			panel.appendChild(f.format.el);
		}
		return f;
	}

	CT.register('server', {
		mount: function (el, tool) {
			var info = tool.server || {};
			if (!info.available) { el.appendChild(ui.alert('warn', __('Esta herramienta no está disponible en este momento.'))); return; }
			var file = null;
			var panel = h('div', { class: 'ct-panel' });
			var f = options(tool.key, panel);
			var consent = ui.field({ type: 'checkbox', label: CT.sprintf(__('Entiendo que el archivo se enviará al servidor de %s para procesarlo y que se eliminará al terminar.'), CT.cfg.brand || 'HerramientasClave'), value: false });
			var progress = ui.progress();
			var result = ui.result();
			var drop = ui.dropzone({ accept: info.accept, maxMb: info.maxMb, hint: CT.sprintf(__('Formatos: %1$s · Máximo %2$d MB.'), info.accept, info.maxMb), onFiles: function (fs) { file = fs[0]; drop.setHint(file.name + ' · ' + CT.fmt.bytes(file.size)); } });
			var btn = ui.button(__('Procesar en el servidor'), { variant: 'primary', icon: 'upload', onClick: function () {
				result.clear();
				if (!file) { result.error(__('Selecciona un archivo.')); return; }
				if (!consent.input.checked) { consent.error(__('Debes aceptar el envío del archivo para continuar.')); return; }
				consent.error('');
				if (f.password) {
					f.password.error('');
					if (!f.password.input.value) { f.password.error(__('Escribe la contraseña.')); return; }
					if (f.repeat && f.repeat.input.value !== f.password.input.value) { f.repeat.error(__('Las contraseñas no coinciden.')); return; }
					if (f.repeat) { f.repeat.error(''); }
				}
				ui.busy(btn, true);
				progress.indeterminate(__('Enviando y procesando… puede tardar unos minutos.'));
				var started = Date.now();
				CT.token('process').then(function (token) {
					var fd = new FormData();
					fd.append('file', file);
					fd.append('token', token);
					fd.append('name', file.name);
					Object.keys(f).forEach(function (k) { if (k !== 'repeat') { fd.append(k, f[k].input.value); } });
					return fetch(info.endpoint, { method: 'POST', body: fd, credentials: 'same-origin' });
				}).then(function (res) {
					var type = res.headers.get('Content-Type') || '';
					if (!res.ok || type.indexOf('application/json') >= 0) {
						return res.json().catch(function () { return {}; }).then(function (j) { throw new Error((j && j.message) || __('El servidor no ha podido procesar el archivo.')); });
					}
					var disp = res.headers.get('Content-Disposition') || '';
					var m = /filename\*=UTF-8''([^;]+)/.exec(disp);
					var name = m ? decodeURIComponent(m[1]) : file.name;
					return res.blob().then(function (b) {
						progress.done(); ui.busy(btn, false);
						CT.download(b, name);
						CT.track('time', (Date.now() - started) < 5000 ? '<5s' : (Date.now() - started) < 30000 ? '5-30s' : '>30s');
						result.set(ui.alert('ok', CT.sprintf(__('Listo: %1$s (%2$s). El archivo ya se ha eliminado del servidor.'), name, CT.fmt.bytes(b.size))), ui.actions(ui.button(__('Descargar de nuevo'), { icon: 'download', onClick: function () { CT.download(b, name); } })));
					});
				}).catch(function (e) { progress.done(); ui.busy(btn, false); CT.fail(result, e); });
			} });
			el.appendChild(drop.el);
			if (panel.childNodes.length) { el.appendChild(panel); }
			el.appendChild(consent.el);
			el.appendChild(ui.actions(btn));
			el.appendChild(progress.el);
			el.appendChild(result.el);
		}
	});
})();
