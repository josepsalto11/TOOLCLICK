/*!
 * HerramientasClave — conversores de unidades. Factores exactos por definición siempre que existen.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__;

	var CATS = {
		length: { units: [['mm', __('milímetros'), 0.001], ['cm', __('centímetros'), 0.01], ['m', __('metros'), 1], ['km', __('kilómetros'), 1000], ['um', __('micrómetros (µm)'), 1e-6], ['in', __('pulgadas'), 0.0254], ['ft', __('pies'), 0.3048], ['yd', __('yardas'), 0.9144], ['mi', __('millas'), 1609.344], ['nmi', __('millas náuticas'), 1852]] },
		mass: { units: [['mg', __('miligramos'), 1e-6], ['g', __('gramos'), 0.001], ['kg', __('kilogramos'), 1], ['t', __('toneladas'), 1000], ['oz', __('onzas'), 0.028349523125], ['lb', __('libras'), 0.45359237], ['st', __('stones'), 6.35029318], ['ust', __('toneladas cortas (EE. UU.)'), 907.18474], ['ukt', __('toneladas largas (R. Unido)'), 1016.0469088], ['ct', __('quilates'), 0.0002]] },
		area: { units: [['mm2', 'mm²', 1e-6], ['cm2', 'cm²', 1e-4], ['m2', 'm²', 1], ['a', __('áreas'), 100], ['ha', __('hectáreas'), 1e4], ['km2', 'km²', 1e6], ['in2', __('pulgadas²'), 0.00064516], ['ft2', __('pies²'), 0.09290304], ['yd2', __('yardas²'), 0.83612736], ['ac', __('acres'), 4046.8564224], ['mi2', __('millas²'), 2589988.110336]] },
		volume: { units: [['ml', __('mililitros'), 0.001], ['cl', __('centilitros'), 0.01], ['dl', __('decilitros'), 0.1], ['l', __('litros'), 1], ['m3', 'm³', 1000], ['cm3', 'cm³', 0.001], ['galus', __('galones (EE. UU.)'), 3.785411784], ['galuk', __('galones (R. Unido)'), 4.54609], ['qtus', __('cuartos (EE. UU.)'), 0.946352946], ['ptus', __('pintas (EE. UU.)'), 0.473176473], ['ptuk', __('pintas (R. Unido)'), 0.56826125], ['flozus', __('onzas líquidas (EE. UU.)'), 0.0295735295625], ['flozuk', __('onzas líquidas (R. Unido)'), 0.0284130625], ['ft3', __('pies³'), 28.316846592], ['in3', __('pulgadas³'), 0.016387064]] },
		speed: { units: [['ms', 'm/s', 1], ['kmh', 'km/h', 1 / 3.6], ['mph', __('millas/hora'), 0.44704], ['kn', __('nudos'), 1852 / 3600], ['fts', __('pies/segundo'), 0.3048]] },
		time: { units: [['ms', __('milisegundos'), 0.001], ['s', __('segundos'), 1], ['min', __('minutos'), 60], ['h', __('horas'), 3600], ['d', __('días'), 86400], ['wk', __('semanas'), 604800], ['mo', __('meses (promedio)'), 2629746], ['y', __('años (365,2425 días)'), 31556952], ['dec', __('décadas'), 315569520], ['c', __('siglos'), 3155695200]] },
		energy: { units: [['j', __('julios (J)'), 1], ['kj', __('kilojulios'), 1000], ['mj', __('megajulios'), 1e6], ['wh', __('vatios hora'), 3600], ['kwh', __('kilovatios hora'), 3.6e6], ['cal', __('calorías (termoquímicas)'), 4.184], ['kcal', __('kilocalorías'), 4184], ['btu', 'BTU (IT)', 1055.05585262], ['ev', __('electronvoltios'), 1.602176634e-19]] },
		power: { units: [['w', __('vatios (W)'), 1], ['kw', __('kilovatios'), 1000], ['mw', __('megavatios'), 1e6], ['cv', __('caballos de vapor (CV)'), 735.49875], ['hp', __('caballos de potencia mecánicos (hp)'), 745.69987158227], ['btuh', 'BTU/h', 0.29307107017], ['kcalh', 'kcal/h', 1.163]] },
		pressure: { units: [['pa', __('pascales'), 1], ['hpa', __('hectopascales'), 100], ['kpa', __('kilopascales'), 1000], ['mpa', __('megapascales'), 1e6], ['bar', __('bares'), 1e5], ['mbar', __('milibares'), 100], ['atm', __('atmósferas'), 101325], ['psi', 'psi', 6894.757293168], ['mmhg', 'mmHg', 133.322387415], ['inhg', 'inHg', 3386.389], ['kgfcm2', 'kgf/cm²', 98066.5]] },
		data: { units: [['bit', 'bits', 0.125], ['kbit', __('kilobits (kbit)'), 125], ['mbit', __('megabits (Mbit)'), 125000], ['gbit', __('gigabits (Gbit)'), 1.25e8], ['b', __('bytes (B)'), 1], ['kb', __('kilobytes (KB)'), 1e3], ['mb', __('megabytes (MB)'), 1e6], ['gb', __('gigabytes (GB)'), 1e9], ['tb', __('terabytes (TB)'), 1e12], ['pb', __('petabytes (PB)'), 1e15], ['kib', __('kibibytes (KiB)'), 1024], ['mib', __('mebibytes (MiB)'), 1048576], ['gib', __('gibibytes (GiB)'), 1073741824], ['tib', __('tebibytes (TiB)'), 1099511627776]] },
		frequency: { units: [['hz', __('hercios (Hz)'), 1], ['khz', 'kHz', 1e3], ['mhz', 'MHz', 1e6], ['ghz', 'GHz', 1e9], ['rpm', __('revoluciones por minuto'), 1 / 60]] },
		angle: { units: [['deg', __('grados'), Math.PI / 180], ['rad', __('radianes'), 1], ['grad', __('gradianes'), Math.PI / 200], ['arcmin', __('minutos de arco'), Math.PI / 10800], ['arcsec', __('segundos de arco'), Math.PI / 648000], ['turn', __('vueltas'), 2 * Math.PI]] },
		cooking: { units: [['ml', __('mililitros'), 1], ['l', __('litros'), 1000], ['tsp', __('cucharaditas (5 ml)'), 5], ['tbsp', __('cucharadas (15 ml)'), 15], ['cup', __('tazas métricas (250 ml)'), 250], ['cupus', __('tazas EE. UU. (236,6 ml)'), 236.5882365], ['flozus', __('onzas líquidas EE. UU.'), 29.5735295625], ['ptus', __('pintas EE. UU.'), 473.176473]] },
		temperature: { special: 'temp', units: [['c', __('grados Celsius (°C)')], ['f', __('grados Fahrenheit (°F)')], ['k', __('kelvin (K)')], ['r', __('grados Rankine (°R)')]] },
		fuel: { special: 'fuel', units: [['l100', 'L/100 km'], ['kml', 'km/L'], ['mpgus', __('mpg (EE. UU.)')], ['mpguk', __('mpg (R. Unido)')]] }
	};

	var TEMP = {
		toK: { c: function (x) { return x + 273.15; }, f: function (x) { return (x - 32) * 5 / 9 + 273.15; }, k: function (x) { return x; }, r: function (x) { return x * 5 / 9; } },
		fromK: { c: function (x) { return x - 273.15; }, f: function (x) { return (x - 273.15) * 9 / 5 + 32; }, k: function (x) { return x; }, r: function (x) { return x * 9 / 5; } }
	};
	var FUEL = {
		to: { l100: function (x) { return x; }, kml: function (x) { return 100 / x; }, mpgus: function (x) { return 235.214583 / x; }, mpguk: function (x) { return 282.480936 / x; } }
	};
	FUEL.from = FUEL.to; // Las cuatro relaciones son recíprocas y simétricas.

	function convert(cat, value, from, to) {
		var c = CATS[cat];
		if (c.special === 'temp') { return TEMP.fromK[to](TEMP.toK[from](value)); }
		if (c.special === 'fuel') { if (value === 0) { return NaN; } return FUEL.from[to](FUEL.to[from](value)); }
		var f = {}, i;
		for (i = 0; i < c.units.length; i++) { f[c.units[i][0]] = c.units[i][2]; }
		return value * f[from] / f[to];
	}
	function nice(n) {
		if (!isFinite(n)) { return '—'; }
		if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6)) { return n.toExponential(6).replace('.', ','); }
		return CT.fmt.number(parseFloat(n.toPrecision(12)), 10);
	}
	CT.units = { convert: convert, cats: CATS };

	var INGREDIENTS = [[__('Agua o leche'), 1], [__('Harina de trigo'), 0.53], [__('Azúcar blanco'), 0.85], [__('Mantequilla'), 0.91], [__('Aceite'), 0.92], [__('Arroz crudo'), 0.85], [__('Miel'), 1.42]];

	function converter(el, tool) {
		var cfg = tool.config || {};
		var cat = cfg.cat || tool.key;
		var c = CATS[cat];
		if (!c) { el.appendChild(ui.alert('err', __('Conversor no encontrado.'))); return; }
		var opts = c.units.map(function (u) { return { value: u[0], label: u[1] + (u[0].length < 7 && u[1].indexOf('(') < 0 ? ' (' + u[0].replace(/2$/, '²').replace(/3$/, '³') + ')' : '') }; });
		var valueF = ui.field({ label: __('Valor'), type: 'number', value: cfg.value !== undefined ? cfg.value : 1 });
		var fromF = ui.field({ label: __('De'), type: 'select', options: opts, value: cfg.from || c.units[0][0] });
		var toF = ui.field({ label: __('A'), type: 'select', options: opts, value: cfg.to || c.units[1][0] });
		var swap = ui.button(__('Intercambiar'), { icon: 'arrow-left-right', variant: 'ghost', onClick: function () { var a = fromF.input.value; fromF.input.value = toF.input.value; toF.input.value = a; run(); } });
		var result = ui.result();
		var run = function () {
			var v = valueF.get();
			valueF.error('');
			if (!valueF.input.value.trim()) { result.clear(); return; }
			if (!isFinite(v)) { valueF.error(__('Introduce un número válido (puedes usar coma decimal).')); result.clear(); return; }
			if (c.special === 'temp' && TEMP.toK[fromF.input.value](v) < 0) { valueF.error(__('Esa temperatura está por debajo del cero absoluto.')); result.clear(); return; }
			if (c.special === 'fuel' && v <= 0) { valueF.error(__('El consumo debe ser mayor que cero.')); result.clear(); return; }
			var out = convert(cat, v, fromF.input.value, toF.input.value);
			var fromLabel = fromF.input.selectedOptions[0].textContent, toLabel = toF.input.selectedOptions[0].textContent;
			var rows = c.units.map(function (u) { return [u[1], nice(convert(cat, v, fromF.input.value, u[0]))]; });
			var nodes = [ui.resultCard({ label: nice(v) + ' ' + fromLabel + ' =', main: nice(out) + ' ' + toLabel, copy: nice(out) })];
			nodes.push(h('div', { style: { marginTop: '16px' } }, h('h3', { class: 'ct-panel__title', text: __('Equivalencias en todas las unidades') }), ui.table([__('Unidad'), __('Valor')], rows, { num: [1] })));
			if (cat === 'cooking') {
				var ml = convert('cooking', v, fromF.input.value, 'ml');
				nodes.push(h('div', { style: { marginTop: '16px' } }, h('h3', { class: 'ct-panel__title', text: __('Peso aproximado según el ingrediente') }),
					ui.table([__('Ingrediente'), __('Gramos aprox.')], INGREDIENTS.map(function (i) { return [i[0], CT.fmt.number(ml * i[1], 0) + ' g']; }), { num: [1] }),
					h('p', { class: 'ct-help', text: __('Las densidades son aproximadas y varían según cómo se llene el recipiente. Para repostería precisa, usa una báscula.') })));
			}
			if (cat === 'data') {
				nodes.push(h('p', { class: 'ct-help', text: __('KB, MB, GB y TB son unidades decimales (potencias de 1000). KiB, MiB, GiB y TiB son binarias (potencias de 1024). 1 byte = 8 bits.') }));
			}
			result.set(nodes);
		};
		[valueF, fromF, toF].forEach(function (f) { f.input.addEventListener('input', run); f.input.addEventListener('change', run); });
		el.appendChild(h('div', { class: 'ct-cols' }, valueF.el, fromF.el, toF.el));
		el.appendChild(ui.actions(ui.button(__('Convertir'), { variant: 'primary', icon: 'arrow-left-right', onClick: function () { run(); CT.track('done'); } }), swap));
		el.appendChild(result.el);
		run();
	}

	/* ---------- Tamaños de papel ---------- */
	var PAPER = [];
	(function () {
		var series = { A: [841, 1189], B: [1000, 1414], C: [917, 1297] };
		Object.keys(series).forEach(function (s) {
			var w = series[s][0], hh = series[s][1];
			for (var i = 0; i <= 8; i++) {
				PAPER.push([s + i, w, hh]);
				var nw = Math.floor(hh / 2); hh = w; w = nw;
			}
		});
		PAPER.push(['Carta (Letter)', 215.9, 279.4], ['Legal', 215.9, 355.6], ['Tabloide (Ledger)', 279.4, 431.8], ['Executive', 184.15, 266.7], ['DL (sobre)', 110, 220], ['Folio español', 215, 315], ['Cuartilla (A5)', 148, 210]);
	})();
	function paper(el) {
		var dpi = ui.field({ label: __('Resolución para calcular píxeles'), type: 'select', value: '300', options: [{ value: '72', label: '72 ppp' }, { value: '96', label: '96 ppp' }, { value: '150', label: '150 ppp' }, { value: '300', label: __('300 ppp (imprenta)') }, { value: '600', label: '600 ppp' }] });
		var filter = ui.field({ label: __('Filtrar'), placeholder: 'A4, B5, Letter…', value: '' });
		var box = h('div');
		var run = function () {
			var d = parseInt(dpi.input.value, 10);
			var q = filter.input.value.trim().toLowerCase();
			var rows = PAPER.filter(function (p) { return !q || p[0].toLowerCase().indexOf(q) >= 0; }).map(function (p) {
				return [p[0], CT.fmt.number(p[1], 1) + ' × ' + CT.fmt.number(p[2], 1) + ' mm', CT.fmt.number(p[1] / 25.4, 2) + ' × ' + CT.fmt.number(p[2] / 25.4, 2) + ' in', Math.round(p[1] / 25.4 * d) + ' × ' + Math.round(p[2] / 25.4 * d) + ' px'];
			});
			box.innerHTML = '';
			box.appendChild(ui.table([__('Formato'), __('Milímetros'), __('Pulgadas'), CT.sprintf(__('Píxeles a %d ppp'), d)], rows, { caption: __('Tamaños de papel') }));
		};
		dpi.input.addEventListener('change', run);
		filter.input.addEventListener('input', run);
		el.appendChild(h('div', { class: 'ct-cols' }, filter.el, dpi.el));
		el.appendChild(box);
		el.appendChild(h('p', { class: 'ct-help', text: __('Medidas ISO 216 (series A y B), ISO 269 (sobres C) y formatos norteamericanos. Ancho × alto en vertical.') }));
		run();
	}

	/* ---------- Números romanos ---------- */
	var ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
	function toRoman(n) { var out = ''; ROMAN.forEach(function (r) { while (n >= r[0]) { out += r[1]; n -= r[0]; } }); return out; }
	function fromRoman(s) {
		s = s.toUpperCase().trim();
		if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(s) || !s) { return NaN; }
		var map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }, total = 0;
		for (var i = 0; i < s.length; i++) { var v = map[s[i]], nx = map[s[i + 1]] || 0; total += v < nx ? -v : v; }
		return total;
	}
	CT.roman = { to: toRoman, from: fromRoman };
	function roman(el) {
		var f = ui.field({ label: __('Número (1 a 3.999) o número romano'), value: '2026', placeholder: 'MMXXVI' });
		var result = ui.result();
		var run = function () {
			var raw = f.input.value.trim();
			f.error('');
			if (!raw) { result.clear(); return; }
			if (/^\d+$/.test(raw)) {
				var n = parseInt(raw, 10);
				if (n < 1 || n > 3999) { f.error(__('Los números romanos clásicos van del 1 al 3.999.')); result.clear(); return; }
				result.set(ui.resultCard({ label: raw + ' =', main: toRoman(n), copy: toRoman(n) }));
			} else {
				var r = fromRoman(raw);
				if (!isFinite(r)) { f.error(__('No es un número romano válido. Usa I, V, X, L, C, D y M en notación estándar.')); result.clear(); return; }
				result.set(ui.resultCard({ label: raw.toUpperCase() + ' =', main: String(r), copy: String(r) }));
			}
		};
		f.input.addEventListener('input', run);
		el.appendChild(f.el);
		el.appendChild(result.el);
		run();
	}

	CT.register('units', {
		mount: function (el, tool) {
			if (tool.key === 'papel') { paper(el); return; }
			if (tool.key === 'romanos') { roman(el); return; }
			converter(el, tool);
		}
	});
})();
