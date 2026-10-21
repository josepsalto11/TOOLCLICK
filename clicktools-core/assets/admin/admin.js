/*!
 * HerramientasClave — utilidades del panel: confirmaciones, contadores de longitud SEO,
 * vista previa de iconos y validación en vivo de fórmulas de calculadoras propias.
 */
(function () {
	'use strict';
	var __ = window.wp && wp.i18n ? wp.i18n.__ : function (s) { return s; };

	// Confirmación antes de acciones destructivas.
	document.addEventListener('submit', function (e) {
		var msg = e.target.getAttribute && e.target.getAttribute('data-confirm');
		if (msg && !window.confirm(msg)) { e.preventDefault(); }
	}, true);

	// Contador de caracteres para título SEO (60) y metadescripción (160).
	document.querySelectorAll('[data-count]').forEach(function (el) {
		var max = parseInt(el.getAttribute('data-count'), 10);
		if (!max) { return; }
		var out = document.createElement('span');
		out.className = 'ct-count';
		out.setAttribute('aria-live', 'polite');
		el.insertAdjacentElement('afterend', out);
		var upd = function () {
			var n = (el.value || el.placeholder || '').length;
			out.textContent = n + ' / ' + max + (el.value ? '' : ' ' + __('(texto original)', 'clicktools'));
			out.classList.toggle('is-over', n > max);
		};
		el.addEventListener('input', upd);
		upd();
	});

	// Vista previa del icono elegido (SVG ya incluido en la página como opción actual).
	var iconSel = document.querySelector('.ct-icon-select');
	if (iconSel) {
		iconSel.addEventListener('change', function () {
			var prev = document.querySelector('.ct-admin-icon-preview');
			if (prev) { prev.textContent = '↻'; prev.title = __('Guarda para ver el nuevo icono', 'clicktools'); }
		});
	}

	// Validación de fórmulas con el mismo analizador que usa la web.
	var form = document.getElementById('ct-custom-form');
	var E = window.ClickTools && window.ClickTools.expr;
	if (!form || !E) { return; }
	var preview = document.getElementById('ct-custom-preview');
	var check = function () {
		var vars = [], scope = {};
		form.querySelectorAll('.ct-input-key').forEach(function (k) {
			var key = k.value.trim().toLowerCase();
			if (!key) { return; }
			vars.push(key);
			var row = k.closest('tr');
			var def = row.querySelector('input[name$="[default]"]').value.replace(',', '.');
			scope[key] = def === '' ? 1 : parseFloat(def);
		});
		var results = [];
		form.querySelectorAll('.ct-formula').forEach(function (f) {
			var msg = f.parentNode.querySelector('.ct-formula-msg');
			var src = f.value.trim();
			msg.className = 'ct-formula-msg';
			msg.textContent = '';
			if (!src) { return; }
			try {
				var ast = E.parse(src, { vars: vars });
				var val = E.tidy(E.evaluate(ast, scope, {}));
				msg.classList.add('is-ok');
				msg.textContent = '✓ ' + __('Fórmula válida', 'clicktools');
				var label = f.closest('tr').querySelector('input[name$="[label]"]').value || __('Resultado', 'clicktools');
				results.push(label + ' = ' + (isFinite(val) ? val.toLocaleString('es-ES', { maximumFractionDigits: 6 }) : '—'));
			} catch (err) {
				msg.classList.add('is-err');
				msg.textContent = '✗ ' + (err.message || __('Fórmula no válida', 'clicktools'));
			}
		});
		preview.textContent = results.length ? __('Con los valores iniciales:', 'clicktools') + ' ' + results.join(' · ') : '';
	};
	form.addEventListener('input', check);
	check();
})();
