/*!
 * ClickTools — motor genérico de calculadoras declarativas.
 * Cada calculadora define sus campos, su función de cálculo y su fórmula visible.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;
	var defs = {};

	/** Error de validación ligado a un campo. */
	function CalcError(field, message) { this.field = field; this.message = message; }

	var calc = CT.calc = {
		defs: defs,
		define: function (key, def) { defs[key] = def; },
		err: function (field, message) { return new CalcError(field, message); },
		money: CT.fmt.money,
		num: CT.fmt.number,
		pct: CT.fmt.percent,
		/** Lista de números a partir de texto (separados por líneas, espacios o punto y coma). */
		numbers: function (text) {
			return String(text || '').split(/[\n;\t]+|\s{2,}|\s(?=[-+]?\d)/).map(function (s) { return CT.parseNum(s.trim()); }).filter(function (n) { return isFinite(n); });
		}
	};

	function buildField(f, values, onInput) {
		var value = values[f.name] !== undefined ? values[f.name] : f.value;
		var api;
		if (f.type === 'seg') {
			api = ui.seg({ label: f.label, options: f.options, value: value, onChange: onInput, block: f.block });
			api.kind = 'seg';
		} else if (f.type === 'checkbox') {
			api = ui.field({ label: f.label, type: 'checkbox', value: value, help: f.help });
			api.input.addEventListener('change', onInput);
			api.kind = 'checkbox';
		} else {
			api = ui.field({
				label: f.label,
				type: f.type || 'number',
				name: f.name,
				value: value,
				options: f.options,
				unit: f.unit,
				help: f.help,
				placeholder: f.placeholder,
				rows: f.rows,
				integer: f.integer,
				mono: f.mono,
				min: f.min,
				max: f.max,
				step: f.step,
				onInput: onInput
			});
			api.kind = f.type || 'number';
		}
		api.def = f;
		return api;
	}

	function readValues(fields) {
		var v = {};
		fields.forEach(function (f) {
			if (f.kind === 'seg') { v[f.def.name] = f.get(); }
			else if (f.kind === 'checkbox') { v[f.def.name] = f.input.checked; }
			else if (f.kind === 'number') { v[f.def.name] = CT.parseNum(f.input.value); }
			else { v[f.def.name] = f.input.value; }
		});
		return v;
	}

	function validate(fields, v) {
		var ok = true;
		fields.forEach(function (f) {
			var d = f.def;
			if (f.kind !== 'number' || (f.el && f.el.hidden)) { if (f.error) { f.error(''); } return; }
			var n = v[d.name];
			var raw = f.input.value.trim();
			var msg = '';
			if (!raw) {
				if (!d.optional) { msg = __('Introduce un valor.'); }
			} else if (!isFinite(n)) {
				msg = __('Introduce un número válido (puedes usar coma decimal).');
			} else if (d.integer && Math.round(n) !== n) {
				msg = __('Debe ser un número entero.');
			} else if (d.min !== undefined && n < d.min) {
				msg = CT.sprintf(__('El valor mínimo es %s.'), CT.fmt.number(d.min));
			} else if (d.max !== undefined && n > d.max) {
				msg = CT.sprintf(__('El valor máximo es %s.'), CT.fmt.number(d.max));
			} else if (d.positive && n <= 0) {
				msg = __('Debe ser mayor que cero.');
			}
			f.error(msg);
			if (msg) { ok = false; }
		});
		return ok;
	}

	function renderResult(res) {
		var nodes = [];
		if (res.warn) { nodes.push(ui.alert('warn', res.warn)); }
		var copyText = res.copy || (res.main ? res.main.label + ': ' + res.main.value : '');
		nodes.push(ui.resultCard({
			label: res.main ? res.main.label : '',
			main: res.main ? res.main.value : undefined,
			stats: res.stats,
			formula: res.formula,
			note: res.note,
			copy: copyText
		}));
		if (res.table) {
			var t = res.table;
			nodes.push(h('div', { style: { marginTop: '16px' } },
				t.title ? h('h3', { class: 'ct-panel__title', text: t.title }) : null,
				ui.table(t.headers, t.rows, { num: t.num, caption: t.title, tall: t.rows.length > 14 }),
				t.csv ? h('div', { class: 'ct-actions' }, ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () {
					CT.download('﻿' + CT.csv.stringify([t.headers].concat(t.csv), ';'), (t.filename || 'tabla') + '.csv', 'text/csv;charset=utf-8');
				} })) : null
			));
		}
		if (res.extra) { nodes.push(res.extra); }
		return nodes;
	}

	CT.register('calc', {
		mount: function (el, tool) {
			var def = defs[tool.key];
			if (!def) { el.appendChild(ui.alert('err', __('Calculadora no encontrada.'))); return; }
			var preset = (tool.config && tool.config.values) || {};
			var fields = [];
			var result = ui.result();
			var compute;
			var onInput = CT.debounce(function () { compute(false); }, 180);

			var form = h('form', { class: 'ct-calc', novalidate: true });
			var grid = h('div', { class: 'ct-cols' });
			(def.fields || []).forEach(function (f) {
				var api = buildField(f, preset, onInput);
				fields.push(api);
				var wrap = f.full ? h('div', { style: { gridColumn: '1 / -1' } }, api.el) : api.el;
				api.wrap = wrap;
				grid.appendChild(wrap);
			});
			form.appendChild(grid);
			if (def.intro) { form.insertBefore(h('p', { class: 'ct-help', style: { marginBottom: '12px' }, text: def.intro }), grid); }

			var calcBtn = ui.button(def.button || __('Calcular'), { variant: 'primary', type: 'submit', icon: 'calculator' });
			var resetBtn = ui.button(__('Restablecer'), { variant: 'ghost', icon: 'refresh-ccw', onClick: function () {
				fields.forEach(function (f) {
					var d = f.def;
					var v = preset[d.name] !== undefined ? preset[d.name] : d.value;
					if (f.kind === 'seg') { f.set(v); }
					else if (f.kind === 'checkbox') { f.input.checked = !!v; }
					else if (f.set) { f.set(v === undefined ? '' : v); }
					if (f.error) { f.error(''); }
				});
				compute(false);
			} });
			form.appendChild(ui.actions(calcBtn, resetBtn));
			form.appendChild(result.el);
			el.appendChild(form);

			var toggleVisibility = function (v) {
				fields.forEach(function (f) {
					if (typeof f.def.showIf === 'function') {
						var show = !!f.def.showIf(v);
						f.wrap.hidden = !show;
						f.el.hidden = !show;
					}
				});
			};

			compute = function (explicit) {
				var v = readValues(fields);
				toggleVisibility(v);
				if (!validate(fields, v)) {
					if (explicit) { result.error(__('Revisa los campos marcados para ver el resultado.')); }
					else { result.clear(); }
					return;
				}
				try {
					var res = def.compute(v);
					if (!res) { result.clear(); return; }
					result.set(renderResult(res));
					if (explicit) { CT.track('done'); }
				} catch (e) {
					if (e instanceof CalcError) {
						var target = fields.filter(function (f) { return f.def.name === e.field; })[0];
						if (target && target.error) { target.error(e.message); }
						result.error(e.message);
					} else {
						CT.fail(result, e);
					}
				}
			};
			form.addEventListener('submit', function (e) { e.preventDefault(); compute(true); });
			compute(false);
		}
	});
})();
