/*!
 * HerramientasClave — calculadora básica y científica con teclado en pantalla y físico.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;

	function fmt(n) {
		if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0)) { return n.toExponential(8).replace('.', ','); }
		return CT.fmt.number(n, 10);
	}

	CT.register('calculator', {
		mount: function (el, tool) {
			var sci = tool.key === 'cientifica';
			var expr = '';
			var angle = 'deg';
			var lastAnswer = 0;
			var history = [];

			var exprEl = h('div', { class: 'ct-calculator__expr', 'aria-label': __('Expresión') });
			var valueEl = h('div', { class: 'ct-calculator__value', 'aria-live': 'polite', 'aria-atomic': 'true', text: '0' });
			var display = h('div', { class: 'ct-calculator__display' }, exprEl, valueEl);
			var input = h('input', { class: 'ct-input ct-mono', type: 'text', inputmode: 'none', autocomplete: 'off', spellcheck: 'false', 'aria-label': __('Escribe una operación y pulsa Intro') });
			var histList = h('ol', { class: 'ct-list-items', style: { marginTop: '8px' } });
			var histBox = h('div', { class: 'ct-panel', hidden: true, style: { marginTop: '16px' } }, h('h3', { class: 'ct-panel__title', text: __('Historial de esta sesión') }), histList);

			var preview = function () {
				exprEl.textContent = expr.replace(/\*/g, '×').replace(/\//g, '÷');
				input.value = expr;
				if (!expr) { valueEl.textContent = '0'; return; }
				try { valueEl.textContent = fmt(CT.expr.calc(expr, { angle: angle })); valueEl.classList.remove('ct-muted'); }
				catch (e) { valueEl.classList.add('ct-muted'); }
			};
			var equals = function () {
				if (!expr) { return; }
				try {
					var r = CT.expr.calc(expr, { angle: angle });
					history.unshift({ e: expr, r: r });
					history = history.slice(0, 20);
					lastAnswer = r;
					renderHistory();
					exprEl.textContent = expr.replace(/\*/g, '×').replace(/\//g, '÷') + ' =';
					valueEl.textContent = fmt(r);
					expr = String(r);
					input.value = expr;
					CT.track('done');
				} catch (e) {
					valueEl.textContent = e.message || __('Error');
					valueEl.classList.add('ct-muted');
				}
			};
			var renderHistory = function () {
				histBox.hidden = !history.length;
				histList.innerHTML = '';
				history.forEach(function (it) {
					var txt = it.e.replace(/\*/g, '×').replace(/\//g, '÷') + ' = ' + fmt(it.r);
					histList.appendChild(h('li', { class: 'ct-list-item' },
						h('span', { class: 'ct-list-item__text ct-mono', text: txt }),
						ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', aria: __('Copiar'), cls: 'ct-btn--icon', onClick: function () { CT.copy(String(it.r)); } }),
						ui.button(__('Usar'), { size: 'sm', variant: 'ghost', onClick: function () { expr = String(it.r); preview(); } })
					));
				});
			};
			var press = function (k) {
				switch (k) {
					case 'C': expr = ''; break;
					case '⌫': expr = expr.slice(0, -1); break;
					case '=': equals(); return;
					case '±': expr = expr ? '-(' + expr + ')' : '-'; break;
					case 'x²': expr += '^2'; break;
					case 'xʸ': expr += '^'; break;
					case '1/x': expr = '1/(' + (expr || '0') + ')'; break;
					case '√': expr += 'sqrt('; break;
					case 'ANS': expr += String(lastAnswer); break;
					case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan': case 'ln': case 'log': case 'exp': case 'abs':
						expr += k + '('; break;
					case 'π': expr += 'π'; break;
					default: expr += k;
				}
				preview();
			};

			var basic = [['C', 'fn'], ['⌫', 'fn'], ['%', 'op'], ['÷', 'op'], ['7'], ['8'], ['9'], ['×', 'op'], ['4'], ['5'], ['6'], ['−', 'op'], ['1'], ['2'], ['3'], ['+', 'op'], ['±', 'fn'], ['0'], [',', ''], ['=', 'eq']];
			var sciKeys = [['sin', 'fn'], ['cos', 'fn'], ['tan', 'fn'], ['(', 'fn'], [')', 'fn'], ['asin', 'fn'], ['acos', 'fn'], ['atan', 'fn'], ['x²', 'fn'], ['xʸ', 'fn'], ['ln', 'fn'], ['log', 'fn'], ['√', 'fn'], ['!', 'fn'], ['1/x', 'fn'], ['π', 'fn'], ['e', 'fn'], ['exp', 'fn'], ['abs', 'fn'], ['ANS', 'fn']];
			var mapKey = function (k) { return { '÷': '/', '×': '*', '−': '-', ',': '.' }[k] || k; };
			var makeKeys = function (keys, cls) {
				var grid = h('div', { class: 'ct-calculator__keys' + (cls ? ' ' + cls : ''), role: 'group', 'aria-label': cls ? __('Funciones científicas') : __('Teclado numérico') });
				keys.forEach(function (k) {
					var label = { '⌫': __('Borrar último'), 'C': __('Borrar todo'), '±': __('Cambiar signo'), '=': __('Igual'), '÷': __('Dividir'), '×': __('Multiplicar'), '−': __('Restar'), '+': __('Sumar'), '%': __('Porcentaje'), 'xʸ': __('Potencia'), 'x²': __('Al cuadrado'), '√': __('Raíz cuadrada'), '!': __('Factorial'), 'ANS': __('Último resultado') }[k[0]];
					grid.appendChild(h('button', { type: 'button', class: 'ct-key' + (k[1] ? ' ct-key--' + k[1] : ''), 'aria-label': label || k[0], text: k[0], onclick: function () { press(mapKey(k[0])); } }));
				});
				return grid;
			};

			input.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); expr = input.value; equals(); }
				else if (e.key === 'Escape') { e.preventDefault(); expr = ''; preview(); }
			});
			input.addEventListener('input', function () {
				expr = input.value.replace(/,/g, '.');
				preview();
			});

			var box = h('div', { class: 'ct-calculator' }, display);
			if (sci) {
				var angleSeg = ui.seg({ label: __('Unidad de ángulos'), value: 'deg', options: [{ value: 'deg', label: __('Grados') }, { value: 'rad', label: __('Radianes') }], onChange: function (v) { angle = v; preview(); } });
				box.appendChild(angleSeg.el);
				box.appendChild(makeKeys(sciKeys, 'ct-calculator__keys--sci'));
			}
			box.appendChild(makeKeys(basic));
			box.appendChild(h('div', { class: 'ct-field', style: { marginTop: '8px' } }, h('label', { class: 'ct-label', text: __('O escribe la operación (Intro para calcular)') }), input));
			box.appendChild(h('p', { class: 'ct-help', text: sci ? __('Ejemplos: 2^10, sqrt(2), sin(30), 5!, log(1000), 3π. El símbolo % divide entre 100.') : __('Puedes usar el teclado: números, + − * / ( ) y Intro. El símbolo % divide entre 100 (200*15% = 30).') }));
			el.appendChild(box);
			el.appendChild(histBox);
			preview();
		}
	});
})();
