/*!
 * ClickTools — guías interactivas con lista de comprobación (el contenido viene de PHP, traducible).
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;

	CT.register('guide', {
		mount: function (el, tool) {
			var cfg = tool.config || {};
			var sections = cfg.sections || [];
			var inputs = [];
			var summary = h('div', { 'aria-live': 'polite' });
			var update = function () {
				var done = inputs.filter(function (i) { return i.checked; }).length;
				summary.innerHTML = '';
				var pct = inputs.length ? done / inputs.length : 0;
				var msg = cfg.result ? (pct === 1 ? cfg.result.all : pct >= 0.7 ? cfg.result.most : cfg.result.few) : '';
				summary.appendChild(h('div', { class: 'ct-result' }, h('p', { class: 'ct-result__label', text: __('Progreso') }), h('p', { class: 'ct-result__main', text: done + ' / ' + inputs.length }), h('div', { class: 'ct-meter' }, h('div', { class: 'ct-meter__bar', style: { width: Math.round(pct * 100) + '%', background: 'var(--ct-primary)' } })), msg ? h('p', { class: 'ct-help', style: { marginTop: '10px' }, text: msg }) : null));
			};
			if (cfg.intro) { el.appendChild(h('p', { text: cfg.intro })); }
			sections.forEach(function (s) {
				el.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px', fontSize: '1rem' }, text: s.title }));
				var ul = h('ul', { class: 'ct-guide-check' });
				s.items.forEach(function (it) {
					var id = CT.uid('g');
					var input = h('input', { type: 'checkbox', id: id });
					input.addEventListener('change', update);
					inputs.push(input);
					ul.appendChild(h('li', null, h('label', { class: 'ct-check', for: id }, input, h('span', null, h('strong', { text: it[0] }))), it[1] ? h('small', { text: it[1] }) : null));
				});
				el.appendChild(ul);
			});
			el.appendChild(h('div', { style: { marginTop: '16px' } }, summary));
			el.appendChild(ui.actions(ui.button(__('Reiniciar la lista'), { icon: 'refresh-ccw', variant: 'ghost', onClick: function () { inputs.forEach(function (i) { i.checked = false; }); update(); } }), ui.button(__('Imprimir'), { icon: 'printer', variant: 'ghost', onClick: function () { window.print(); } })));
			update();
		}
	});
})();
