/*!
 * HerramientasClave — calculadoras cotidianas: porcentajes, regla de tres, propinas,
 * estadística, medidas, superficies, volúmenes y materiales.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var __ = CT.__, C = CT.calc, N = C.num, M = C.money, P = C.pct, R = CT.round;
	var def = C.define;

	/* ---------- Porcentajes ---------- */
	def('porcentaje', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('¿Qué quieres calcular?'), value: 'of', full: true, options: [
				{ value: 'of', label: __('X % de una cantidad') },
				{ value: 'what', label: __('Qué % representa') },
				{ value: 'add', label: __('Sumar un %') },
				{ value: 'sub', label: __('Restar un %') }
			] },
			{ name: 'pct', label: __('Porcentaje'), unit: '%', value: 15, showIf: function (v) { return v.mode !== 'what'; } },
			{ name: 'part', label: __('Parte'), value: 30, showIf: function (v) { return v.mode === 'what'; } },
			{ name: 'base', label: __('Cantidad total'), value: 200 }
		],
		compute: function (v) {
			if (v.mode === 'what') {
				if (v.base === 0) { throw C.err('base', __('La cantidad total no puede ser cero.')); }
				var p = v.part / v.base * 100;
				return { main: { label: CT.sprintf(__('Porcentaje que representa %1$s sobre %2$s'), N(v.part), N(v.base)), value: P(p, 4) }, formula: '% = parte / total × 100 = ' + N(v.part) + ' / ' + N(v.base) + ' × 100' };
			}
			var amount = v.base * v.pct / 100;
			if (v.mode === 'of') {
				return { main: { label: CT.sprintf(__('El %1$s %% de %2$s es'), N(v.pct), N(v.base)), value: N(R(amount, 6), 6) }, formula: __('Resultado') + ' = ' + N(v.base) + ' × ' + N(v.pct) + ' / 100' };
			}
			var total = v.mode === 'add' ? v.base + amount : v.base - amount;
			return {
				main: { label: v.mode === 'add' ? __('Resultado tras sumar el porcentaje') : __('Resultado tras restar el porcentaje'), value: N(R(total, 6), 6) },
				stats: [[__('Variación'), (v.mode === 'add' ? '+' : '−') + N(R(amount, 6), 6)]],
				formula: N(v.base) + (v.mode === 'add' ? ' × (1 + ' : ' × (1 − ') + N(v.pct) + ' / 100)'
			};
		}
	});

	def('incremento', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Operación'), value: 'between', full: true, options: [
				{ value: 'between', label: __('Variación entre dos valores') },
				{ value: 'apply', label: __('Aplicar un incremento') }
			] },
			{ name: 'a', label: __('Valor inicial'), value: 80 },
			{ name: 'b', label: __('Valor final'), value: 100, showIf: function (v) { return v.mode === 'between'; } },
			{ name: 'pct', label: __('Incremento (negativo para disminuir)'), unit: '%', value: 10, showIf: function (v) { return v.mode === 'apply'; } }
		],
		compute: function (v) {
			if (v.mode === 'apply') {
				var r = v.a * (1 + v.pct / 100);
				return { main: { label: __('Valor final'), value: N(R(r, 6), 6) }, stats: [[__('Diferencia'), N(R(r - v.a, 6), 6)]], formula: N(v.a) + ' × (1 + ' + N(v.pct) + ' / 100)' };
			}
			if (v.a === 0) { throw C.err('a', __('El valor inicial no puede ser cero para calcular una variación porcentual.')); }
			var pct = (v.b - v.a) / Math.abs(v.a) * 100;
			return {
				main: { label: pct >= 0 ? __('Incremento porcentual') : __('Disminución porcentual'), value: (pct > 0 ? '+' : '') + P(pct, 4) },
				stats: [[__('Diferencia absoluta'), N(R(v.b - v.a, 6), 6)], [__('Factor'), '× ' + N(v.b / v.a, 6)]],
				formula: '(' + N(v.b) + ' − ' + N(v.a) + ') / |' + N(v.a) + '| × 100'
			};
		}
	});

	def('descuento', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('¿Qué conoces?'), value: 'price', full: true, options: [
				{ value: 'price', label: __('Precio y descuento') },
				{ value: 'final', label: __('Precio final y descuento') },
				{ value: 'both', label: __('Precio original y final') }
			] },
			{ name: 'price', label: __('Precio original'), unit: '€', value: 80, min: 0, showIf: function (v) { return v.mode !== 'final'; } },
			{ name: 'final', label: __('Precio final'), unit: '€', value: 60, min: 0, showIf: function (v) { return v.mode !== 'price'; } },
			{ name: 'pct', label: __('Descuento'), unit: '%', value: 25, min: 0, max: 100, showIf: function (v) { return v.mode !== 'both'; } }
		],
		compute: function (v) {
			if (v.mode === 'price') {
				var saving = CT.money.mulRate(v.price, v.pct);
				return { main: { label: __('Precio con descuento'), value: M(v.price - saving) }, stats: [[__('Ahorro'), M(saving)], [__('Pagas'), P(100 - v.pct)]], formula: N(v.price) + ' − ' + N(v.price) + ' × ' + N(v.pct) + ' / 100' };
			}
			if (v.mode === 'final') {
				if (v.pct >= 100) { throw C.err('pct', __('Con un descuento del 100 % no se puede calcular el precio original.')); }
				var orig = v.final / (1 - v.pct / 100);
				return { main: { label: __('Precio original'), value: M(orig) }, stats: [[__('Ahorro'), M(orig - v.final)]], formula: N(v.final) + ' / (1 − ' + N(v.pct) + ' / 100)' };
			}
			if (v.price === 0) { throw C.err('price', __('El precio original no puede ser cero.')); }
			var d = (v.price - v.final) / v.price * 100;
			return { main: { label: d >= 0 ? __('Descuento aplicado') : __('Incremento aplicado'), value: P(Math.abs(d)) }, stats: [[__('Diferencia'), M(v.price - v.final)]], formula: '(' + N(v.price) + ' − ' + N(v.final) + ') / ' + N(v.price) + ' × 100' };
		}
	});

	def('diferencia-porcentual', {
		fields: [
			{ name: 'a', label: __('Valor A'), value: 120 },
			{ name: 'b', label: __('Valor B'), value: 150 }
		],
		compute: function (v) {
			var mean = (v.a + v.b) / 2;
			if (mean === 0) { throw C.err('b', __('La media de los dos valores no puede ser cero.')); }
			var sym = Math.abs(v.a - v.b) / Math.abs(mean) * 100;
			var stats = [[__('Diferencia absoluta'), N(Math.abs(v.a - v.b), 6)]];
			if (v.a !== 0) { stats.push([__('Cambio de A a B'), (v.b >= v.a ? '+' : '') + P((v.b - v.a) / Math.abs(v.a) * 100)]); }
			if (v.b !== 0) { stats.push([__('Cambio de B a A'), (v.a >= v.b ? '+' : '') + P((v.a - v.b) / Math.abs(v.b) * 100)]); }
			return {
				main: { label: __('Diferencia porcentual (respecto a la media)'), value: P(sym) },
				stats: stats,
				formula: '|A − B| / ((A + B) / 2) × 100',
				note: __('La diferencia porcentual es simétrica: no depende del orden. El «cambio porcentual» sí depende del valor de referencia.')
			};
		}
	});

	def('regla-tres', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Tipo de proporción'), value: 'direct', full: true, options: [
				{ value: 'direct', label: __('Directa') },
				{ value: 'inverse', label: __('Inversa') }
			] },
			{ name: 'a', label: __('Si A es'), value: 3 },
			{ name: 'b', label: __('le corresponde B'), value: 6 },
			{ name: 'c', label: __('entonces C'), value: 5 }
		],
		compute: function (v) {
			var x;
			if (v.mode === 'direct') {
				if (v.a === 0) { throw C.err('a', __('A no puede ser cero.')); }
				x = v.b * v.c / v.a;
				return { main: { label: __('le corresponde X'), value: N(R(x, 8), 8) }, formula: 'X = B × C / A = ' + N(v.b) + ' × ' + N(v.c) + ' / ' + N(v.a), note: __('Directa: si una magnitud aumenta, la otra aumenta en la misma proporción (más kilos, más precio).') };
			}
			if (v.c === 0) { throw C.err('c', __('C no puede ser cero.')); }
			x = v.a * v.b / v.c;
			return { main: { label: __('le corresponde X'), value: N(R(x, 8), 8) }, formula: 'X = A × B / C = ' + N(v.a) + ' × ' + N(v.b) + ' / ' + N(v.c), note: __('Inversa: si una magnitud aumenta, la otra disminuye (más trabajadores, menos días).') };
		}
	});

	/* ---------- Cuentas y propinas ---------- */
	def('propina', {
		fields: [
			{ name: 'amount', label: __('Importe de la cuenta'), unit: '€', value: 64.5, min: 0 },
			{ name: 'pct', label: __('Propina'), unit: '%', value: 10, min: 0, max: 100 },
			{ name: 'people', label: __('Personas'), value: 2, integer: true, min: 1 },
			{ name: 'round', type: 'checkbox', label: __('Redondear el total por persona hacia arriba al euro'), value: false }
		],
		compute: function (v) {
			var tip = CT.money.mulRate(v.amount, v.pct);
			var total = R(v.amount + tip, 2);
			var per = total / v.people;
			if (v.round) { per = Math.ceil(per); }
			var paid = R(per * v.people, 2);
			return {
				main: { label: __('Cada persona paga'), value: M(per) },
				stats: [[__('Propina'), M(tip + (v.round ? paid - total : 0))], [__('Total'), M(v.round ? paid : total)], [__('Propina por persona'), M((tip + (v.round ? paid - total : 0)) / v.people)]],
				formula: __('Propina') + ' = ' + N(v.amount) + ' × ' + N(v.pct) + ' / 100; ' + __('por persona') + ' = (' + __('importe + propina') + ') / ' + v.people
			};
		}
	});

	def('dividir-cuenta', {
		fields: [
			{ name: 'total', label: __('Total a pagar'), unit: '€', value: 127.4, min: 0 },
			{ name: 'people', label: __('Número de personas'), value: 4, integer: true, min: 1 },
			{ name: 'extra', label: __('Propina o extra (opcional)'), unit: '%', value: 0, min: 0, optional: true },
			{ name: 'round', type: 'select', label: __('Redondeo'), value: '0.01', options: [
				{ value: '0.01', label: __('Al céntimo') }, { value: '0.5', label: __('A 50 céntimos') }, { value: '1', label: __('Al euro') }
			] }
		],
		compute: function (v) {
			var extra = isFinite(v.extra) ? CT.money.mulRate(v.total, v.extra) : 0;
			var totalC = CT.money.toCents(v.total + extra);
			var step = Math.round(parseFloat(v.round) * 100);
			var baseC = Math.floor(totalC / v.people);
			var per = step === 1 ? baseC : Math.ceil(totalC / v.people / step) * step;
			var collected = per * v.people;
			var stats = [[__('Total con extra'), M(totalC / 100)], [__('Se recauda'), M(collected / 100)]];
			var note = '';
			if (step === 1) {
				var rem = totalC - baseC * v.people;
				if (rem > 0) {
					stats = [[__('Total con extra'), M(totalC / 100)]];
					note = CT.sprintf(__('Para cuadrar al céntimo: %1$d personas pagan %2$s y %3$d pagan %4$s.'), v.people - rem, M(baseC / 100), rem, M((baseC + 1) / 100));
					per = baseC;
				}
			} else if (collected > totalC) {
				note = CT.sprintf(__('Con el redondeo sobran %s (puede quedar como propina o devolverse).'), M((collected - totalC) / 100));
			}
			return { main: { label: __('Cada persona paga'), value: M(per / 100) }, stats: stats, note: note, formula: '(' + __('total') + ' + ' + __('extra') + ') / ' + v.people };
		}
	});

	/* ---------- Estadística ---------- */
	def('estadistica', {
		fields: [
			{ name: 'list', type: 'textarea', label: __('Números (uno por línea o separados por punto y coma)'), value: '7\n8,5\n6\n9\n7', rows: 7, full: true }
		],
		compute: function (v) {
			var xs = C.numbers(v.list);
			if (!xs.length) { throw C.err('list', __('Introduce al menos un número.')); }
			var n = xs.length;
			var sum = xs.reduce(function (a, b) { return a + b; }, 0);
			var mean = sum / n;
			var sorted = xs.slice().sort(function (a, b) { return a - b; });
			var median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
			var freq = {}, maxF = 0;
			xs.forEach(function (x) { freq[x] = (freq[x] || 0) + 1; if (freq[x] > maxF) { maxF = freq[x]; } });
			var modes = Object.keys(freq).filter(function (k) { return freq[k] === maxF; }).map(Number);
			var ss = xs.reduce(function (a, x) { return a + (x - mean) * (x - mean); }, 0);
			var stats = [
				[__('Cantidad de datos'), N(n)], [__('Suma'), N(R(sum, 8), 8)], [__('Mediana'), N(median, 6)],
				[__('Moda'), maxF > 1 ? modes.map(function (m) { return N(m, 6); }).join('; ') : __('Sin moda (todos distintos)')],
				[__('Mínimo'), N(sorted[0], 6)], [__('Máximo'), N(sorted[n - 1], 6)], [__('Rango'), N(R(sorted[n - 1] - sorted[0], 8), 8)],
				[__('Desviación típica (población)'), N(Math.sqrt(ss / n), 6)]
			];
			if (n > 1) { stats.push([__('Desviación típica (muestra)'), N(Math.sqrt(ss / (n - 1)), 6)]); stats.push([__('Varianza (muestra)'), N(ss / (n - 1), 6)]); }
			return { main: { label: __('Media aritmética'), value: N(R(mean, 6), 6) }, stats: stats, formula: __('Media') + ' = Σx / n; ' + __('desviación') + ' = √(Σ(x − media)² / n)' };
		}
	});

	def('media-ponderada', {
		intro: __('Escribe en cada línea la nota y su peso (porcentaje, créditos o coeficiente), separados por un espacio o punto y coma. Ejemplo: «7,5 40».'),
		fields: [
			{ name: 'rows', type: 'textarea', label: __('Nota y peso por línea'), value: '6,5 30\n8 50\n9,25 20', rows: 7, full: true },
			{ name: 'scale', label: __('Nota máxima'), value: 10, positive: true }
		],
		compute: function (v) {
			var items = [];
			v.rows.split(/\n+/).forEach(function (line, i) {
				var parts = line.trim().split(/[;\t]|\s+/).filter(Boolean);
				if (!parts.length) { return; }
				if (parts.length < 2) { throw C.err('rows', CT.sprintf(__('Falta el peso en la línea %d.'), i + 1)); }
				var g = CT.parseNum(parts[0]), w = CT.parseNum(parts[1]);
				if (!isFinite(g) || !isFinite(w) || w < 0) { throw C.err('rows', CT.sprintf(__('La línea %d no tiene una nota y un peso válidos.'), i + 1)); }
				items.push([g, w]);
			});
			if (!items.length) { throw C.err('rows', __('Introduce al menos una nota con su peso.')); }
			var sw = 0, sgw = 0;
			items.forEach(function (it) { sw += it[1]; sgw += it[0] * it[1]; });
			if (sw === 0) { throw C.err('rows', __('La suma de los pesos no puede ser cero.')); }
			var avg = sgw / sw;
			return {
				main: { label: __('Media ponderada'), value: N(R(avg, 3), 3) + ' / ' + N(v.scale) },
				stats: [[__('Suma de pesos'), N(sw, 4)], [__('Media simple'), N(R(items.reduce(function (a, it) { return a + it[0]; }, 0) / items.length, 3), 3)], [__('Sobre 100'), P(avg / v.scale * 100)]],
				formula: 'Σ(nota × peso) / Σ(peso)'
			};
		}
	});

	/* ---------- Medidas ---------- */
	var RATIOS = [
		{ value: '16:9', label: '16:9' }, { value: '16:10', label: '16:10' }, { value: '4:3', label: '4:3' },
		{ value: '21:9', label: '21:9 (64:27)' }, { value: '3:2', label: '3:2' }, { value: '19.5:9', label: '19,5:9 (' + __('móviles') + ')' }, { value: '1:1', label: '1:1' }
	];
	def('tamano-pantalla', {
		fields: [
			{ name: 'diag', label: __('Diagonal'), unit: __('pulgadas'), value: 27, positive: true },
			{ name: 'ratio', type: 'select', label: __('Relación de aspecto'), value: '16:9', options: RATIOS },
			{ name: 'rw', label: __('Resolución horizontal (opcional)'), unit: 'px', value: 2560, optional: true, integer: true, min: 1 },
			{ name: 'rh', label: __('Resolución vertical (opcional)'), unit: 'px', value: 1440, optional: true, integer: true, min: 1 }
		],
		compute: function (v) {
			var parts = v.ratio === '21:9' ? [64, 27] : v.ratio.split(':').map(Number);
			var k = v.diag / Math.sqrt(parts[0] * parts[0] + parts[1] * parts[1]);
			var w = parts[0] * k, hgt = parts[1] * k;
			var stats = [
				[__('Ancho'), N(w * 2.54, 1) + ' cm (' + N(w, 2) + '″)'],
				[__('Alto'), N(hgt * 2.54, 1) + ' cm (' + N(hgt, 2) + '″)'],
				[__('Superficie'), N(w * hgt * 6.4516, 0) + ' cm²'],
				[__('Diagonal'), N(v.diag * 2.54, 1) + ' cm']
			];
			if (isFinite(v.rw) && isFinite(v.rh)) {
				var ppi = Math.sqrt(v.rw * v.rw + v.rh * v.rh) / v.diag;
				stats.push([__('Densidad'), N(ppi, 1) + ' ppp (PPI)']);
				stats.push([__('Tamaño de píxel'), N(25.4 / ppi, 3) + ' mm']);
			}
			return { main: { label: __('Dimensiones del panel'), value: N(w * 2.54, 1) + ' × ' + N(hgt * 2.54, 1) + ' cm' }, stats: stats, formula: __('ancho') + ' = d × a / √(a² + b²); ' + __('alto') + ' = d × b / √(a² + b²); 1″ = 2,54 cm', note: __('Medidas del área visible aproximada; el marco no está incluido.') };
		}
	});

	var LEN_UNITS = [{ value: 'm', label: __('metros (m)') }, { value: 'cm', label: __('centímetros (cm)') }, { value: 'mm', label: __('milímetros (mm)') }, { value: 'ft', label: __('pies (ft)') }, { value: 'in', label: __('pulgadas (in)') }];
	var TO_M = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 };
	def('superficie', {
		fields: [
			{ name: 'shape', type: 'select', label: __('Figura'), value: 'rect', options: [
				{ value: 'rect', label: __('Rectángulo / cuadrado') }, { value: 'tri', label: __('Triángulo (base y altura)') },
				{ value: 'circle', label: __('Círculo') }, { value: 'trap', label: __('Trapecio') }, { value: 'ellipse', label: __('Elipse') }
			] },
			{ name: 'unit', type: 'select', label: __('Unidad de las medidas'), value: 'm', options: LEN_UNITS },
			{ name: 'a', label: __('Largo / base / radio / base mayor'), value: 5, positive: true },
			{ name: 'b', label: __('Ancho / altura / base menor / semieje'), value: 4, positive: true, showIf: function (v) { return v.shape !== 'circle'; } },
			{ name: 'c', label: __('Altura del trapecio'), value: 3, positive: true, showIf: function (v) { return v.shape === 'trap'; } }
		],
		compute: function (v) {
			var area, f;
			switch (v.shape) {
				case 'tri': area = v.a * v.b / 2; f = 'A = b × h / 2'; break;
				case 'circle': area = Math.PI * v.a * v.a; f = 'A = π × r²'; break;
				case 'trap': area = (v.a + v.b) / 2 * v.c; f = 'A = (B + b) / 2 × h'; break;
				case 'ellipse': area = Math.PI * v.a * v.b; f = 'A = π × a × b'; break;
				default: area = v.a * v.b; f = 'A = ' + __('largo') + ' × ' + __('ancho');
			}
			var m2 = area * TO_M[v.unit] * TO_M[v.unit];
			var stats = [[__('En metros cuadrados'), N(m2, 4) + ' m²'], [__('En centímetros cuadrados'), N(m2 * 10000, 2) + ' cm²'], [__('En pies cuadrados'), N(m2 * 10.7639104, 3) + ' ft²']];
			if (v.shape === 'circle') { stats.push([__('Perímetro'), N(2 * Math.PI * v.a, 4) + ' ' + v.unit]); }
			if (v.shape === 'rect') { stats.push([__('Perímetro'), N(2 * (v.a + v.b), 4) + ' ' + v.unit]); }
			return { main: { label: __('Superficie'), value: N(area, 4) + ' ' + v.unit + '²' }, stats: stats, formula: f };
		}
	});

	def('volumen', {
		fields: [
			{ name: 'shape', type: 'select', label: __('Cuerpo'), value: 'box', options: [
				{ value: 'box', label: __('Ortoedro (caja, piscina)') }, { value: 'cyl', label: __('Cilindro') }, { value: 'sphere', label: __('Esfera') },
				{ value: 'cone', label: __('Cono') }, { value: 'pyr', label: __('Pirámide de base rectangular') }
			] },
			{ name: 'unit', type: 'select', label: __('Unidad de las medidas'), value: 'cm', options: LEN_UNITS },
			{ name: 'a', label: __('Largo / radio'), value: 40, positive: true },
			{ name: 'b', label: __('Ancho / altura'), value: 30, positive: true, showIf: function (v) { return v.shape !== 'sphere'; } },
			{ name: 'c', label: __('Alto'), value: 20, positive: true, showIf: function (v) { return v.shape === 'box' || v.shape === 'pyr'; } }
		],
		compute: function (v) {
			var vol, f;
			switch (v.shape) {
				case 'cyl': vol = Math.PI * v.a * v.a * v.b; f = 'V = π × r² × h'; break;
				case 'sphere': vol = 4 / 3 * Math.PI * Math.pow(v.a, 3); f = 'V = 4/3 × π × r³'; break;
				case 'cone': vol = Math.PI * v.a * v.a * v.b / 3; f = 'V = π × r² × h / 3'; break;
				case 'pyr': vol = v.a * v.b * v.c / 3; f = 'V = l × a × h / 3'; break;
				default: vol = v.a * v.b * v.c; f = 'V = l × a × h';
			}
			var m3 = vol * Math.pow(TO_M[v.unit], 3);
			return {
				main: { label: __('Volumen'), value: N(vol, 4) + ' ' + v.unit + '³' },
				stats: [[__('Litros'), N(m3 * 1000, 3) + ' L'], [__('Metros cúbicos'), N(m3, 6) + ' m³'], [__('Galones (EE. UU.)'), N(m3 * 264.172052, 3) + ' gal']],
				formula: f + '; 1 m³ = 1.000 L'
			};
		}
	});

	def('pintura', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Cómo indicas la superficie'), value: 'walls', full: true, options: [{ value: 'walls', label: __('Perímetro y altura') }, { value: 'area', label: __('Superficie directa') }] },
			{ name: 'perim', label: __('Perímetro de las paredes'), unit: 'm', value: 16, positive: true, showIf: function (v) { return v.mode === 'walls'; } },
			{ name: 'height', label: __('Altura'), unit: 'm', value: 2.5, positive: true, showIf: function (v) { return v.mode === 'walls'; } },
			{ name: 'area', label: __('Superficie a pintar'), unit: 'm²', value: 40, positive: true, showIf: function (v) { return v.mode === 'area'; } },
			{ name: 'openings', label: __('Puertas y ventanas a descontar'), unit: 'm²', value: 4, min: 0, optional: true },
			{ name: 'coats', label: __('Número de manos'), value: 2, integer: true, min: 1, max: 10 },
			{ name: 'yield', label: __('Rendimiento de la pintura'), unit: 'm²/L', value: 10, positive: true, help: __('Consulta el envase: suele indicarse en m² por litro y mano.') },
			{ name: 'can', label: __('Tamaño del envase'), unit: 'L', value: 4, positive: true },
			{ name: 'margin', label: __('Margen de seguridad'), unit: '%', value: 10, min: 0, max: 100 }
		],
		compute: function (v) {
			var area = (v.mode === 'walls' ? v.perim * v.height : v.area) - (isFinite(v.openings) ? v.openings : 0);
			if (area <= 0) { throw C.err('openings', __('Las aberturas no pueden ser mayores que la superficie.')); }
			var liters = area * v.coats / v.yield * (1 + v.margin / 100);
			return {
				main: { label: __('Pintura necesaria'), value: N(liters, 2) + ' L' },
				stats: [[__('Superficie neta'), N(area, 2) + ' m²'], [__('Envases necesarios'), N(Math.ceil(liters / v.can)) + ' × ' + N(v.can) + ' L'], [__('Superficie total pintada'), N(area * v.coats, 2) + ' m²']],
				formula: 'L = ' + __('superficie') + ' × ' + __('manos') + ' / ' + __('rendimiento') + ' × (1 + ' + __('margen') + ')',
				note: __('Las superficies porosas o los cambios fuertes de color pueden requerir más pintura.')
			};
		}
	});

	def('suelo', {
		fields: [
			{ name: 'len', label: __('Largo de la estancia'), unit: 'm', value: 5, positive: true },
			{ name: 'wid', label: __('Ancho de la estancia'), unit: 'm', value: 3.6, positive: true },
			{ name: 'waste', label: __('Margen por cortes y roturas'), unit: '%', value: 10, min: 0, max: 50, help: __('Habitualmente entre un 5 % y un 15 %, según el patrón de colocación.') },
			{ name: 'box', label: __('Superficie que cubre cada caja'), unit: 'm²', value: 1.44, positive: true },
			{ name: 'price', label: __('Precio por caja (opcional)'), unit: '€', value: 0, optional: true, min: 0 }
		],
		compute: function (v) {
			var area = v.len * v.wid;
			var need = area * (1 + v.waste / 100);
			var boxes = Math.ceil(need / v.box - 1e-9);
			var stats = [[__('Superficie de la estancia'), N(area, 2) + ' m²'], [__('Con margen'), N(need, 2) + ' m²'], [__('Superficie comprada'), N(boxes * v.box, 2) + ' m²']];
			if (isFinite(v.price) && v.price > 0) { stats.push([__('Coste estimado'), M(boxes * v.price)]); }
			return { main: { label: __('Cajas necesarias'), value: N(boxes) }, stats: stats, formula: __('cajas') + ' = ⌈' + __('superficie') + ' × (1 + ' + __('margen') + ') / ' + __('m² por caja') + '⌉' };
		}
	});

	def('productividad-horas', {
		fields: [
			{ name: 'units', label: __('Unidades producidas o tareas completadas'), value: 120, min: 0 },
			{ name: 'hours', label: __('Horas trabajadas'), unit: 'h', value: 8, positive: true },
			{ name: 'target', label: __('Objetivo por hora (opcional)'), value: 18, optional: true, min: 0 },
			{ name: 'cost', label: __('Coste por hora (opcional)'), unit: '€/h', value: 0, optional: true, min: 0 }
		],
		compute: function (v) {
			var rate = v.units / v.hours;
			var stats = [[__('Minutos por unidad'), v.units ? N(v.hours * 60 / v.units, 2) + ' min' : '—']];
			if (isFinite(v.target) && v.target > 0) { stats.push([__('Cumplimiento del objetivo'), P(rate / v.target * 100, 1)]); }
			if (isFinite(v.cost) && v.cost > 0 && v.units > 0) { stats.push([__('Coste por unidad'), M(v.cost * v.hours / v.units)]); }
			return { main: { label: __('Productividad'), value: N(rate, 2) + ' ' + __('por hora') }, stats: stats, formula: __('productividad') + ' = ' + __('unidades') + ' / ' + __('horas') };
		}
	});

	CT.register('calc-basic', CT.engines.calc);
})();
