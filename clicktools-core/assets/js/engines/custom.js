/*!
 * HerramientasClave — calculadoras personalizadas creadas desde el panel (fórmulas seguras, sin eval).
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;

	CT.register('custom', {
		mount: function (el, tool) {
			var cfg = tool.config || {};
			var inputs = cfg.inputs || [];
			var outputs = cfg.outputs || [];
			var names = inputs.map(function (i) { return i.key; });
			var compiled = [];
			try {
				compiled = outputs.map(function (o) { return CT.expr.parse(o.formula, { vars: names }); });
			} catch (e) {
				el.appendChild(ui.alert('err', __('La fórmula de esta calculadora no es válida. Revísala en el panel de administración.'), e.message));
				return;
			}
			var fields = inputs.map(function (i) {
				return ui.field({ label: i.label, type: 'number', unit: i.unit || null, value: i.default !== undefined && i.default !== '' ? Number(i.default) : '' });
			});
			var result = ui.result();
			var run = function () {
				var scope = {}, ok = true;
				fields.forEach(function (f, k) {
					var v = f.get();
					f.error('');
					if (!isFinite(v)) { ok = false; if (f.input.value.trim()) { f.error(__('Introduce un número válido.')); } }
					scope[inputs[k].key] = v;
				});
				if (!ok) { result.clear(); return; }
				try {
					var stats = outputs.map(function (o, k) {
						var r = CT.expr.evaluate(compiled[k], scope, {});
						var d = o.decimals !== undefined && o.decimals !== '' ? parseInt(o.decimals, 10) : 2;
						var txt = o.format === 'money' ? CT.fmt.money(r) : o.format === 'percent' ? CT.fmt.percent(r, d) : CT.fmt.number(CT.round(r, d), d);
						return [o.label, txt];
					});
					result.set(ui.resultCard({
						label: stats[0][0],
						main: stats[0][1],
						stats: stats.slice(1),
						formula: outputs.map(function (o) { return o.label + ' = ' + o.formula; }).join('; '),
						copy: stats.map(function (s) { return s[0] + ': ' + s[1]; }).join(' | ')
					}));
				} catch (e) {
					result.error(e.message || __('No se ha podido calcular.'));
				}
			};
			var grid = h('div', { class: 'ct-cols' }, fields.map(function (f) { f.input.addEventListener('input', CT.debounce(run, 150)); return f.el; }));
			el.appendChild(grid);
			el.appendChild(ui.actions(ui.button(__('Calcular'), { variant: 'primary', icon: 'calculator', onClick: function () { run(); CT.track('done'); } })));
			el.appendChild(result.el);
			run();
		}
	});
})();
