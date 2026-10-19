/*!
 * ClickTools — calculadoras financieras y de negocio.
 * Los importes se redondean al céntimo con aritmética decimal segura (CT.round / CT.money).
 * Los tipos de interés, impuestos y comisiones los introduce siempre el usuario.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var __ = CT.__, C = CT.calc, N = C.num, M = C.money, P = C.pct, R = CT.round;
	var def = C.define;
	var cents = CT.money.toCents;

	var IVA_OPTIONS = [
		{ value: '21', label: __('21 % (tipo general)') },
		{ value: '10', label: __('10 % (tipo reducido)') },
		{ value: '4', label: __('4 % (tipo superreducido)') },
		{ value: '0', label: __('0 % (exento)') },
		{ value: 'custom', label: __('Otro tipo…') }
	];
	function rateOf(v) { return v.rate === 'custom' ? v.custom : parseFloat(v.rate); }
	var IVA_NOTE = __('Comprueba el tipo aplicable a tu producto o servicio en la Agencia Tributaria. En Canarias se aplica el IGIC y en Ceuta y Melilla el IPSI: usa «Otro tipo…».');

	/* ---------- IVA ---------- */
	def('iva', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Operación'), value: 'add', full: true, options: [
				{ value: 'add', label: __('Añadir IVA a una base') },
				{ value: 'remove', label: __('Quitar IVA de un total') }
			] },
			{ name: 'amount', label: __('Importe'), unit: '€', value: 100, min: 0 },
			{ name: 'rate', type: 'select', label: __('Tipo de IVA'), value: '21', options: IVA_OPTIONS },
			{ name: 'custom', label: __('Tipo personalizado'), unit: '%', value: 7, min: 0, max: 100, showIf: function (v) { return v.rate === 'custom'; } }
		],
		compute: function (v) {
			var r = rateOf(v);
			var base, quota, total;
			if (v.mode === 'add') {
				base = cents(v.amount);
				quota = Math.round(base * r / 100);
				total = base + quota;
			} else {
				total = cents(v.amount);
				base = Math.round(total / (1 + r / 100));
				quota = total - base;
			}
			return {
				main: { label: v.mode === 'add' ? __('Total con IVA') : __('Base imponible (sin IVA)'), value: M((v.mode === 'add' ? total : base) / 100) },
				stats: [[__('Base imponible'), M(base / 100)], [CT.sprintf(__('Cuota de IVA (%s)'), P(r)), M(quota / 100)], [__('Total'), M(total / 100)]],
				formula: v.mode === 'add' ? __('Cuota') + ' = ' + __('base') + ' × ' + N(r) + ' / 100; ' + __('total') + ' = ' + __('base') + ' + ' + __('cuota') : __('Base') + ' = ' + __('total') + ' / (1 + ' + N(r) + ' / 100)',
				note: IVA_NOTE,
				copy: __('Base') + ': ' + M(base / 100) + ' | IVA: ' + M(quota / 100) + ' | Total: ' + M(total / 100)
			};
		}
	});

	def('factura', {
		fields: [
			{ name: 'base', label: __('Base imponible'), unit: '€', value: 1000, min: 0 },
			{ name: 'rate', type: 'select', label: __('Tipo de IVA'), value: '21', options: IVA_OPTIONS },
			{ name: 'custom', label: __('Tipo personalizado'), unit: '%', value: 7, min: 0, max: 100, showIf: function (v) { return v.rate === 'custom'; } },
			{ name: 'irpf', label: __('Retención de IRPF'), unit: '%', value: 15, min: 0, max: 100, help: __('Introduce el porcentaje que te corresponda (0 si no aplicas retención).') },
			{ name: 're', label: __('Recargo de equivalencia (opcional)'), unit: '%', value: 0, min: 0, max: 100, optional: true }
		],
		compute: function (v) {
			var r = rateOf(v);
			var base = cents(v.base);
			var iva = Math.round(base * r / 100);
			var ret = Math.round(base * v.irpf / 100);
			var re = isFinite(v.re) ? Math.round(base * v.re / 100) : 0;
			var total = base + iva + re - ret;
			var stats = [[__('Base imponible'), M(base / 100)], [CT.sprintf(__('IVA (%s)'), P(r)), '+ ' + M(iva / 100)]];
			if (re) { stats.push([CT.sprintf(__('Recargo de equivalencia (%s)'), P(v.re)), '+ ' + M(re / 100)]); }
			stats.push([CT.sprintf(__('Retención IRPF (%s)'), P(v.irpf)), '− ' + M(ret / 100)]);
			return {
				main: { label: __('Total a cobrar'), value: M(total / 100) },
				stats: stats,
				formula: __('Total') + ' = ' + __('base') + ' + IVA' + (re ? ' + RE' : '') + ' − ' + __('retención'),
				note: __('Cálculo orientativo. Confirma con tu asesoría los tipos de IVA y retención que te corresponden.'),
				copy: __('Base') + ' ' + M(base / 100) + ' + IVA ' + M(iva / 100) + (re ? ' + RE ' + M(re / 100) : '') + ' − IRPF ' + M(ret / 100) + ' = ' + M(total / 100)
			};
		}
	});

	/* ---------- Márgenes y precios ---------- */
	def('margen', {
		fields: [
			{ name: 'cost', label: __('Coste del producto'), unit: '€', value: 40, min: 0 },
			{ name: 'price', label: __('Precio de venta (sin IVA)'), unit: '€', value: 65, positive: true }
		],
		compute: function (v) {
			var profit = v.price - v.cost;
			return {
				main: { label: __('Margen comercial sobre el precio'), value: P(profit / v.price * 100) },
				stats: [[__('Beneficio bruto por unidad'), M(profit)], [__('Markup (sobre el coste)'), v.cost ? P(profit / v.cost * 100) : '—'], [__('Coeficiente multiplicador'), v.cost ? '× ' + N(v.price / v.cost, 4) : '—']],
				formula: __('Margen') + ' = (' + __('precio') + ' − ' + __('coste') + ') / ' + __('precio') + ' × 100; ' + __('markup') + ' = (' + __('precio') + ' − ' + __('coste') + ') / ' + __('coste') + ' × 100',
				warn: profit < 0 ? __('Estás vendiendo por debajo del coste.') : ''
			};
		}
	});

	def('precio-venta', {
		fields: [
			{ name: 'cost', label: __('Coste por unidad'), unit: '€', value: 40, min: 0 },
			{ name: 'mode', type: 'seg', label: __('Objetivo'), value: 'margin', options: [{ value: 'margin', label: __('Margen sobre precio') }, { value: 'markup', label: __('Markup sobre coste') }] },
			{ name: 'pct', label: __('Porcentaje deseado'), unit: '%', value: 35, min: 0 },
			{ name: 'vat', label: __('IVA a añadir (opcional)'), unit: '%', value: 21, min: 0, optional: true }
		],
		compute: function (v) {
			var price;
			if (v.mode === 'margin') {
				if (v.pct >= 100) { throw C.err('pct', __('Un margen sobre el precio debe ser inferior al 100 %.')); }
				price = v.cost / (1 - v.pct / 100);
			} else {
				price = v.cost * (1 + v.pct / 100);
			}
			var stats = [[__('Beneficio por unidad'), M(price - v.cost)]];
			if (isFinite(v.vat) && v.vat > 0) { stats.push([CT.sprintf(__('Precio con IVA (%s)'), P(v.vat)), M(price * (1 + v.vat / 100))]); }
			stats.push([v.mode === 'margin' ? __('Equivale a un markup de') : __('Equivale a un margen de'), v.mode === 'margin' ? (v.cost ? P((price - v.cost) / v.cost * 100) : '—') : P((price - v.cost) / price * 100)]);
			return {
				main: { label: __('Precio de venta necesario (sin IVA)'), value: M(price) },
				stats: stats,
				formula: v.mode === 'margin' ? __('Precio') + ' = ' + __('coste') + ' / (1 − ' + __('margen') + ')' : __('Precio') + ' = ' + __('coste') + ' × (1 + ' + __('markup') + ')'
			};
		}
	});

	def('markup', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Convertir'), value: 'markup', full: true, options: [{ value: 'markup', label: __('Markup → margen') }, { value: 'margin', label: __('Margen → markup') }] },
			{ name: 'pct', label: __('Porcentaje'), unit: '%', value: 50, min: 0 },
			{ name: 'cost', label: __('Coste de ejemplo (opcional)'), unit: '€', value: 100, min: 0, optional: true }
		],
		compute: function (v) {
			var other, price;
			if (v.mode === 'markup') {
				other = v.pct / (100 + v.pct) * 100;
				price = isFinite(v.cost) ? v.cost * (1 + v.pct / 100) : NaN;
			} else {
				if (v.pct >= 100) { throw C.err('pct', __('El margen sobre el precio debe ser inferior al 100 %.')); }
				other = v.pct / (100 - v.pct) * 100;
				price = isFinite(v.cost) ? v.cost / (1 - v.pct / 100) : NaN;
			}
			var stats = [];
			if (isFinite(price)) { stats.push([__('Precio de venta para ese coste'), M(price)]); stats.push([__('Beneficio'), M(price - v.cost)]); }
			return {
				main: { label: v.mode === 'markup' ? __('Margen equivalente') : __('Markup equivalente'), value: P(other) },
				stats: stats,
				formula: v.mode === 'markup' ? __('margen') + ' = markup / (100 + markup) × 100' : 'markup = ' + __('margen') + ' / (100 − ' + __('margen') + ') × 100'
			};
		}
	});

	def('beneficio-neto', {
		fields: [
			{ name: 'revenue', label: __('Ingresos (sin IVA)'), unit: '€', value: 120000, min: 0 },
			{ name: 'cogs', label: __('Coste de ventas'), unit: '€', value: 55000, min: 0 },
			{ name: 'opex', label: __('Gastos operativos'), unit: '€', value: 38000, min: 0 },
			{ name: 'other', label: __('Otros gastos (intereses, amortizaciones…)'), unit: '€', value: 4000, min: 0, optional: true },
			{ name: 'tax', label: __('Tipo impositivo estimado'), unit: '%', value: 25, min: 0, max: 100, help: __('Introduce el tipo que te corresponda; el cálculo no aplica deducciones ni bonificaciones.') }
		],
		compute: function (v) {
			var gross = v.revenue - v.cogs;
			var ebt = gross - v.opex - (isFinite(v.other) ? v.other : 0);
			var taxes = ebt > 0 ? ebt * v.tax / 100 : 0;
			var net = ebt - taxes;
			return {
				main: { label: __('Beneficio neto estimado'), value: M(net) },
				stats: [[__('Beneficio bruto'), M(gross)], [__('Beneficio antes de impuestos'), M(ebt)], [__('Impuestos estimados'), M(taxes)], [__('Margen neto'), v.revenue ? P(net / v.revenue * 100) : '—']],
				formula: __('Neto') + ' = (' + __('ingresos') + ' − ' + __('coste de ventas') + ' − ' + __('gastos') + ') × (1 − ' + __('tipo') + ')',
				note: __('Estimación simplificada. No sustituye la contabilidad ni el asesoramiento fiscal.')
			};
		}
	});

	def('punto-equilibrio', {
		fields: [
			{ name: 'fixed', label: __('Costes fijos del periodo'), unit: '€', value: 6000, min: 0 },
			{ name: 'price', label: __('Precio de venta por unidad (sin IVA)'), unit: '€', value: 45, positive: true },
			{ name: 'variable', label: __('Coste variable por unidad'), unit: '€', value: 20, min: 0 },
			{ name: 'target', label: __('Beneficio objetivo (opcional)'), unit: '€', value: 0, min: 0, optional: true }
		],
		compute: function (v) {
			var cm = v.price - v.variable;
			if (cm <= 0) { throw C.err('variable', __('El coste variable debe ser menor que el precio: cada venta no cubre su propio coste.')); }
			var units = v.fixed / cm;
			var stats = [[__('Ingresos en el punto de equilibrio'), M(Math.ceil(units) * v.price)], [__('Margen de contribución por unidad'), M(cm)], [__('Ratio de contribución'), P(cm / v.price * 100)]];
			if (isFinite(v.target) && v.target > 0) { stats.push([CT.sprintf(__('Unidades para ganar %s'), M(v.target)), N(Math.ceil((v.fixed + v.target) / cm))]); }
			return { main: { label: __('Unidades necesarias para cubrir costes'), value: N(Math.ceil(units)) }, stats: stats, formula: __('Unidades') + ' = ' + __('costes fijos') + ' / (' + __('precio') + ' − ' + __('coste variable') + ') = ' + N(units, 2) };
		}
	});

	def('costes-fijos-variables', {
		fields: [
			{ name: 'fixed', label: __('Costes fijos mensuales'), unit: '€', value: 3500, min: 0 },
			{ name: 'variable', label: __('Coste variable por unidad'), unit: '€', value: 7.5, min: 0 },
			{ name: 'units', label: __('Unidades al mes'), value: 600, min: 0, integer: true },
			{ name: 'price', label: __('Precio de venta por unidad (opcional)'), unit: '€', value: 15, min: 0, optional: true }
		],
		compute: function (v) {
			var varTotal = v.variable * v.units;
			var total = v.fixed + varTotal;
			var stats = [[__('Costes variables totales'), M(varTotal)], [__('Coste por unidad'), v.units ? M(total / v.units) : '—'], [__('Peso de los costes fijos'), total ? P(v.fixed / total * 100) : '—']];
			if (isFinite(v.price) && v.price > 0) {
				var rev = v.price * v.units;
				stats.push([__('Ingresos'), M(rev)]);
				stats.push([__('Resultado'), M(rev - total), rev - total >= 0 ? 'good' : 'bad']);
			}
			return { main: { label: __('Coste total mensual'), value: M(total) }, stats: stats, formula: __('Coste total') + ' = ' + __('fijos') + ' + ' + __('variable unitario') + ' × ' + __('unidades') };
		}
	});

	def('beneficio-producto', {
		fields: [
			{ name: 'price', label: __('Precio de venta (sin IVA)'), unit: '€', value: 29.9, positive: true },
			{ name: 'cost', label: __('Coste de compra o fabricación'), unit: '€', value: 11, min: 0 },
			{ name: 'ship', label: __('Envío y embalaje por unidad'), unit: '€', value: 3.2, min: 0, optional: true },
			{ name: 'fee', label: __('Comisiones sobre el precio'), unit: '%', value: 6, min: 0, max: 100, optional: true },
			{ name: 'otherc', label: __('Otros costes por unidad'), unit: '€', value: 0.8, min: 0, optional: true },
			{ name: 'units', label: __('Unidades vendidas'), value: 250, min: 0, integer: true }
		],
		compute: function (v) {
			var z = function (x) { return isFinite(x) ? x : 0; };
			var unitCost = v.cost + z(v.ship) + z(v.otherc) + v.price * z(v.fee) / 100;
			var profit = v.price - unitCost;
			return {
				main: { label: __('Beneficio por unidad'), value: M(profit) },
				stats: [[__('Coste total por unidad'), M(unitCost)], [__('Margen'), P(profit / v.price * 100)], [__('Beneficio total'), M(profit * v.units), profit >= 0 ? 'good' : 'bad']],
				formula: __('Beneficio') + ' = ' + __('precio') + ' − (' + __('coste') + ' + ' + __('envío') + ' + ' + __('otros') + ' + ' + __('precio') + ' × ' + __('comisión') + ')'
			};
		}
	});

	def('rentabilidad-pedido', {
		fields: [
			{ name: 'total', label: __('Importe del pedido (con IVA)'), unit: '€', value: 60.5, positive: true },
			{ name: 'vat', label: __('IVA incluido en el importe'), unit: '%', value: 21, min: 0, max: 100 },
			{ name: 'cogs', label: __('Coste de los productos'), unit: '€', value: 22, min: 0 },
			{ name: 'ship', label: __('Coste de envío y embalaje'), unit: '€', value: 5.5, min: 0, optional: true },
			{ name: 'payPct', label: __('Comisión de la pasarela de pago'), unit: '%', value: 1.5, min: 0, optional: true },
			{ name: 'payFix', label: __('Comisión fija de pago'), unit: '€', value: 0.25, min: 0, optional: true },
			{ name: 'cpa', label: __('Coste de captación por pedido (publicidad)'), unit: '€', value: 6, min: 0, optional: true },
			{ name: 'returns', label: __('Tasa de devoluciones esperada'), unit: '%', value: 5, min: 0, max: 100, optional: true }
		],
		compute: function (v) {
			var z = function (x) { return isFinite(x) ? x : 0; };
			var net = v.total / (1 + v.vat / 100);
			var costs = v.cogs + z(v.ship) + v.total * z(v.payPct) / 100 + z(v.payFix) + z(v.cpa);
			var profit = net - costs;
			var expected = profit * (1 - z(v.returns) / 100) - (z(v.returns) / 100) * z(v.ship);
			return {
				main: { label: __('Beneficio por pedido'), value: M(profit) },
				stats: [[__('Ingreso neto (sin IVA)'), M(net)], [__('Costes del pedido'), M(costs)], [__('Margen sobre ingreso neto'), P(profit / net * 100)], [__('Beneficio esperado con devoluciones'), M(expected), expected >= 0 ? 'good' : 'bad']],
				formula: __('Beneficio') + ' = ' + __('importe') + ' / (1 + IVA) − ' + __('costes'),
				note: __('El efecto de las devoluciones es una aproximación: asume que se pierde el envío y no se obtiene beneficio de los pedidos devueltos.')
			};
		}
	});

	def('comision-marketplace', {
		fields: [
			{ name: 'price', label: __('Precio de venta (con IVA)'), unit: '€', value: 49.99, positive: true },
			{ name: 'vat', label: __('IVA incluido (0 si no lo repercutes)'), unit: '%', value: 21, min: 0, max: 100 },
			{ name: 'fee', label: __('Comisión del marketplace'), unit: '%', value: 15, min: 0, max: 100, help: __('Consulta la comisión de tu categoría: varía según la plataforma.') },
			{ name: 'fixed', label: __('Tarifa fija por venta'), unit: '€', value: 0, min: 0, optional: true },
			{ name: 'cost', label: __('Coste del producto'), unit: '€', value: 18, min: 0 },
			{ name: 'ship', label: __('Envío a tu cargo'), unit: '€', value: 4.5, min: 0, optional: true }
		],
		compute: function (v) {
			var z = function (x) { return isFinite(x) ? x : 0; };
			var commission = v.price * v.fee / 100 + z(v.fixed);
			var vatAmount = v.price - v.price / (1 + v.vat / 100);
			var received = v.price - commission;
			var profit = received - vatAmount - v.cost - z(v.ship);
			var netBase = v.price / (1 + v.vat / 100);
			return {
				main: { label: __('Beneficio por venta'), value: M(profit) },
				stats: [[__('Comisión total'), M(commission)], [__('Recibes del marketplace'), M(received)], [__('IVA a liquidar'), M(vatAmount)], [__('Margen sobre precio sin IVA'), P(profit / netBase * 100), profit >= 0 ? 'good' : 'bad']],
				formula: __('Beneficio') + ' = ' + __('precio') + ' − ' + __('comisión') + ' − IVA − ' + __('coste') + ' − ' + __('envío'),
				note: __('Se asume que la comisión se calcula sobre el precio con IVA, como es habitual; revisa las condiciones de tu plataforma.')
			};
		}
	});

	def('descuento-comercial', {
		fields: [
			{ name: 'price', label: __('Precio de tarifa'), unit: '€', value: 250, min: 0 },
			{ name: 'chain', type: 'text', label: __('Descuentos sucesivos (%)'), value: '10 + 5 + 2', help: __('Separa los descuentos con «+», espacios o punto y coma.') }
		],
		compute: function (v) {
			var parts = v.chain.split(/[+;\s]+/).filter(Boolean).map(CT.parseNum);
			if (!parts.length || parts.some(function (p) { return !isFinite(p) || p < 0 || p > 100; })) { throw C.err('chain', __('Escribe porcentajes entre 0 y 100, por ejemplo «10 + 5».')); }
			var factor = 1, rows = [], current = v.price;
			parts.forEach(function (p, i) {
				var cut = current * p / 100;
				current -= cut;
				factor *= (1 - p / 100);
				rows.push([String(i + 1), P(p), M(cut), M(current)]);
			});
			return {
				main: { label: __('Precio neto'), value: M(current) },
				stats: [[__('Descuento efectivo total'), P((1 - factor) * 100, 4)], [__('Ahorro'), M(v.price - current)], [__('Suma simple (incorrecta)'), P(parts.reduce(function (a, b) { return a + b; }, 0))]],
				formula: __('Precio') + ' × (1 − d1) × (1 − d2) × …',
				table: { title: __('Desglose'), headers: [__('Paso'), __('Descuento'), __('Importe'), __('Precio resultante')], rows: rows, num: [1, 2, 3] }
			};
		}
	});

	def('comisiones', {
		fields: [
			{ name: 'sales', label: __('Ventas del periodo'), unit: '€', value: 48000, min: 0 },
			{ name: 'rate', label: __('Comisión'), unit: '%', value: 3, min: 0, max: 100 },
			{ name: 'threshold', label: __('A partir de (opcional)'), unit: '€', value: 30000, min: 0, optional: true, help: __('Si lo indicas, la segunda comisión se aplica solo a la parte que supere esta cifra.') },
			{ name: 'rate2', label: __('Comisión por encima del umbral'), unit: '%', value: 5, min: 0, max: 100, optional: true },
			{ name: 'fixed', label: __('Fijo o bonus'), unit: '€', value: 0, min: 0, optional: true }
		],
		compute: function (v) {
			var z = function (x) { return isFinite(x) ? x : 0; };
			var c;
			var stats = [];
			if (isFinite(v.threshold) && isFinite(v.rate2) && v.sales > v.threshold) {
				var c1 = v.threshold * v.rate / 100, c2 = (v.sales - v.threshold) * v.rate2 / 100;
				c = c1 + c2;
				stats.push([CT.sprintf(__('Tramo hasta %s'), M(v.threshold)), M(c1)], [__('Tramo superior'), M(c2)]);
			} else {
				c = v.sales * v.rate / 100;
			}
			c += z(v.fixed);
			stats.push([__('Comisión efectiva'), v.sales ? P(c / v.sales * 100) : '—']);
			return { main: { label: __('Comisión total'), value: M(c) }, stats: stats, formula: __('Comisión') + ' = ' + __('ventas') + ' × % (' + __('por tramos si procede') + ') + ' + __('fijo') };
		}
	});

	/* ---------- Intereses, ahorro e inflación ---------- */
	def('interes-simple', {
		fields: [
			{ name: 'capital', label: __('Capital'), unit: '€', value: 10000, min: 0 },
			{ name: 'rate', label: __('Tipo de interés anual'), unit: '%', value: 3, min: 0 },
			{ name: 'time', label: __('Duración'), value: 18, positive: true },
			{ name: 'unit', type: 'select', label: __('Unidad de tiempo'), value: 'months', options: [{ value: 'years', label: __('años') }, { value: 'months', label: __('meses') }, { value: 'days', label: __('días (base 365)') }] }
		],
		compute: function (v) {
			var years = v.unit === 'years' ? v.time : (v.unit === 'months' ? v.time / 12 : v.time / 365);
			var interest = v.capital * v.rate / 100 * years;
			return { main: { label: __('Intereses generados'), value: M(interest) }, stats: [[__('Capital final'), M(v.capital + interest)], [__('Duración en años'), N(years, 4)]], formula: 'I = C × r × t', note: __('Cálculo bruto, antes de impuestos sobre los rendimientos.') };
		}
	});

	var FREQ = [{ value: '1', label: __('Anual') }, { value: '2', label: __('Semestral') }, { value: '4', label: __('Trimestral') }, { value: '12', label: __('Mensual') }, { value: '365', label: __('Diaria') }];
	function growth(initial, monthly, ratePct, comp, years) {
		var m = parseFloat(comp);
		var im = ratePct ? Math.pow(1 + ratePct / 100 / m, m / 12) - 1 : 0;
		var bal = initial, contributed = initial, rows = [];
		var months = Math.round(years * 12);
		for (var k = 1; k <= months; k++) {
			bal = bal * (1 + im) + monthly;
			contributed += monthly;
			if (k % 12 === 0 || k === months) {
				rows.push([String(Math.ceil(k / 12)), M(contributed), M(bal - contributed), M(bal)]);
			}
		}
		return { balance: bal, contributed: contributed, rows: rows, im: im };
	}
	def('interes-compuesto', {
		fields: [
			{ name: 'capital', label: __('Capital inicial'), unit: '€', value: 5000, min: 0 },
			{ name: 'rate', label: __('Rentabilidad anual nominal'), unit: '%', value: 4, min: -50, max: 100 },
			{ name: 'years', label: __('Años'), value: 10, positive: true, max: 100 },
			{ name: 'comp', type: 'select', label: __('Capitalización'), value: '12', options: FREQ },
			{ name: 'monthly', label: __('Aportación mensual (opcional)'), unit: '€', value: 100, min: 0, optional: true }
		],
		compute: function (v) {
			var g = growth(v.capital, isFinite(v.monthly) ? v.monthly : 0, v.rate, v.comp, v.years);
			return {
				main: { label: __('Capital final'), value: M(g.balance) },
				stats: [[__('Total aportado'), M(g.contributed)], [__('Intereses generados'), M(g.balance - g.contributed), 'good'], [__('Rentabilidad efectiva mensual'), P(g.im * 100, 4)]],
				formula: 'Cn = C0 × (1 + r/m)^(m×t) + ' + __('aportaciones capitalizadas'),
				note: __('Las aportaciones se suponen al final de cada mes. Rentabilidades pasadas no garantizan resultados futuros. Antes de impuestos y comisiones.'),
				table: { title: __('Evolución por año'), headers: [__('Año'), __('Aportado'), __('Intereses'), __('Saldo')], rows: g.rows, num: [1, 2, 3], csv: g.rows, filename: 'interes-compuesto' }
			};
		}
	});

	def('ahorro', {
		fields: [
			{ name: 'initial', label: __('Ahorro inicial'), unit: '€', value: 1000, min: 0 },
			{ name: 'monthly', label: __('Ahorro mensual'), unit: '€', value: 200, min: 0 },
			{ name: 'years', label: __('Años'), value: 5, positive: true, max: 80 },
			{ name: 'rate', label: __('Rentabilidad anual esperada'), unit: '%', value: 2, min: -50, max: 50 },
			{ name: 'infl', label: __('Inflación anual estimada (opcional)'), unit: '%', value: 0, optional: true, min: -20, max: 100 }
		],
		compute: function (v) {
			var g = growth(v.initial, v.monthly, v.rate, '12', v.years);
			var stats = [[__('Total ahorrado de tu bolsillo'), M(g.contributed)], [__('Rendimientos'), M(g.balance - g.contributed)]];
			if (isFinite(v.infl) && v.infl) { stats.push([__('Valor en euros de hoy'), M(g.balance / Math.pow(1 + v.infl / 100, v.years))]); }
			return {
				main: { label: CT.sprintf(__('Tendrás en %s años'), N(v.years)), value: M(g.balance) },
				stats: stats,
				formula: __('Saldo mensual') + ' = ' + __('saldo') + ' × (1 + r/12) + ' + __('aportación'),
				table: { title: __('Evolución por año'), headers: [__('Año'), __('Aportado'), __('Rendimientos'), __('Saldo')], rows: g.rows, num: [1, 2, 3], csv: g.rows, filename: 'simulador-ahorro' }
			};
		}
	});

	def('objetivo-ahorro', {
		fields: [
			{ name: 'target', label: __('Objetivo'), unit: '€', value: 12000, positive: true },
			{ name: 'initial', label: __('Ya tengo ahorrado'), unit: '€', value: 2000, min: 0 },
			{ name: 'months', label: __('Plazo'), unit: __('meses'), value: 36, positive: true, integer: true, max: 1200 },
			{ name: 'rate', label: __('Rentabilidad anual esperada'), unit: '%', value: 0, min: -50, max: 50 }
		],
		compute: function (v) {
			var i = v.rate / 100 / 12, n = v.months;
			var fvInitial = v.initial * Math.pow(1 + i, n);
			var pmt = i ? (v.target - fvInitial) * i / (Math.pow(1 + i, n) - 1) : (v.target - v.initial) / n;
			if (pmt <= 0) {
				return { main: { label: __('Ahorro mensual necesario'), value: M(0) }, note: __('Con lo que ya tienes (y la rentabilidad indicada) alcanzas el objetivo sin aportar más.') };
			}
			return {
				main: { label: __('Ahorro mensual necesario'), value: M(pmt) },
				stats: [[__('Ahorro semanal equivalente'), M(pmt * 12 / 52)], [__('Total que aportarás'), M(pmt * n)], [__('Rendimientos estimados'), M(v.target - v.initial - pmt * n)]],
				formula: i ? 'PMT = (FV − PV × (1 + i)^n) × i / ((1 + i)^n − 1)' : 'PMT = (FV − PV) / n'
			};
		}
	});

	def('inflacion', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('¿Qué quieres saber?'), value: 'future', full: true, options: [{ value: 'future', label: __('Cuánto costará en el futuro') }, { value: 'power', label: __('Poder adquisitivo futuro') }] },
			{ name: 'amount', label: __('Importe actual'), unit: '€', value: 1000, min: 0 },
			{ name: 'infl', label: __('Inflación media anual'), unit: '%', value: 3, min: -20, max: 100, help: __('Introduce la tasa que quieras simular. No usamos datos oficiales automáticos.') },
			{ name: 'years', label: __('Años'), value: 10, positive: true, max: 100 }
		],
		compute: function (v) {
			var f = Math.pow(1 + v.infl / 100, v.years);
			if (v.mode === 'future') {
				return { main: { label: __('Coste equivalente en el futuro'), value: M(v.amount * f) }, stats: [[__('Aumento de precios acumulado'), P((f - 1) * 100)]], formula: __('Futuro') + ' = ' + __('importe') + ' × (1 + π)^n' };
			}
			return { main: { label: __('Poder adquisitivo en euros de hoy'), value: M(v.amount / f) }, stats: [[__('Pérdida de poder adquisitivo'), P((1 - 1 / f) * 100)]], formula: __('Real') + ' = ' + __('importe') + ' / (1 + π)^n' };
		}
	});

	/* ---------- Préstamos ---------- */
	function loanSchedule(principal, tinPct, months) {
		var i = tinPct / 100 / 12;
		var pay = i ? principal * i / (1 - Math.pow(1 + i, -months)) : principal / months;
		var payC = Math.round(pay * 100);
		var bal = Math.round(principal * 100), rows = [], totalInt = 0;
		for (var k = 1; k <= months; k++) {
			var intC = Math.round(bal * i);
			var capC = payC - intC;
			if (k === months || capC > bal) { capC = bal; }
			var thisPay = capC + intC;
			bal -= capC;
			totalInt += intC;
			rows.push([k, thisPay, intC, capC, bal]);
		}
		return { payment: payC / 100, rows: rows, interest: totalInt / 100, total: principal + totalInt / 100 };
	}
	function tae(principal, fee, payment, months) {
		// Tasa mensual que iguala el capital neto recibido con las cuotas (método de Newton).
		var net = principal - fee;
		if (net <= 0) { return NaN; }
		var r = 0.005;
		for (var it = 0; it < 100; it++) {
			var f = 0, df = 0;
			for (var k = 1; k <= months; k++) {
				var d = Math.pow(1 + r, -k);
				f += payment * d;
				df += -k * payment * d / (1 + r);
			}
			f -= net;
			var step = f / df;
			r -= step;
			if (Math.abs(step) < 1e-12) { break; }
		}
		return (Math.pow(1 + r, 12) - 1) * 100;
	}
	var LOAN_FIELDS = [
		{ name: 'amount', label: __('Importe del préstamo'), unit: '€', value: 15000, positive: true },
		{ name: 'tin', label: __('Tipo de interés nominal (TIN)'), unit: '%', value: 6.5, min: 0, max: 100 },
		{ name: 'term', label: __('Plazo'), value: 5, positive: true },
		{ name: 'unit', type: 'select', label: __('Unidad del plazo'), value: 'years', options: [{ value: 'years', label: __('años') }, { value: 'months', label: __('meses') }] },
		{ name: 'fee', label: __('Comisión de apertura (opcional)'), unit: '%', value: 0, min: 0, max: 20, optional: true }
	];
	function months(v) {
		var m = Math.round(v.unit === 'years' ? v.term * 12 : v.term);
		if (m < 1 || m > 600) { throw C.err('term', __('El plazo debe estar entre 1 y 600 meses.')); }
		return m;
	}
	def('prestamo', {
		fields: LOAN_FIELDS,
		compute: function (v) {
			var n = months(v);
			var s = loanSchedule(v.amount, v.tin, n);
			var fee = isFinite(v.fee) ? v.amount * v.fee / 100 : 0;
			var stats = [[__('Número de cuotas'), N(n)], [__('Intereses totales'), M(s.interest)], [__('Total a devolver'), M(s.total + fee)]];
			if (fee) { stats.push([__('Comisión de apertura'), M(fee)]); }
			var t = tae(v.amount, fee, s.payment, n);
			if (isFinite(t)) { stats.push([__('TAE aproximada'), P(t, 2)]); }
			return {
				main: { label: __('Cuota mensual'), value: M(s.payment) },
				stats: stats,
				formula: __('Cuota') + ' = C × i / (1 − (1 + i)^−n), i = TIN / 12',
				note: __('Sistema francés (cuota constante). La TAE aproximada solo incluye la comisión de apertura; seguros u otros gastos la aumentarían. La última cuota puede variar unos céntimos por redondeo.')
			};
		}
	});

	def('amortizacion', {
		fields: LOAN_FIELDS.concat([{ name: 'view', type: 'select', label: __('Mostrar'), value: 'months', options: [{ value: 'months', label: __('Cuotas mensuales') }, { value: 'years', label: __('Resumen anual') }] }]),
		compute: function (v) {
			var n = months(v);
			var s = loanSchedule(v.amount, v.tin, n);
			var rows, headers, csv;
			if (v.view === 'years') {
				headers = [__('Año'), __('Pagado'), __('Intereses'), __('Capital amortizado'), __('Pendiente')];
				rows = [];
				for (var y = 0; y < Math.ceil(n / 12); y++) {
					var slice = s.rows.slice(y * 12, y * 12 + 12);
					var sum = function (idx) { return slice.reduce(function (a, r) { return a + r[idx]; }, 0); };
					rows.push([y + 1, sum(1), sum(2), sum(3), slice[slice.length - 1][4]]);
				}
			} else {
				headers = [__('Cuota'), __('Pago'), __('Intereses'), __('Capital'), __('Pendiente')];
				rows = s.rows;
			}
			var display = rows.map(function (r) { return [String(r[0]), M(r[1] / 100), M(r[2] / 100), M(r[3] / 100), M(r[4] / 100)]; });
			csv = rows.map(function (r) { return [r[0], (r[1] / 100).toFixed(2).replace('.', ','), (r[2] / 100).toFixed(2).replace('.', ','), (r[3] / 100).toFixed(2).replace('.', ','), (r[4] / 100).toFixed(2).replace('.', ',')]; });
			return {
				main: { label: __('Cuota mensual'), value: M(s.payment) },
				stats: [[__('Intereses totales'), M(s.interest)], [__('Total pagado'), M(s.total)]],
				formula: __('Interés del mes') + ' = ' + __('pendiente') + ' × TIN / 12; ' + __('capital') + ' = ' + __('cuota') + ' − ' + __('interés'),
				table: { title: __('Cuadro de amortización'), headers: headers, rows: display, num: [1, 2, 3, 4], csv: csv, filename: 'tabla-amortizacion' }
			};
		}
	});

	def('comparar-prestamos', {
		intro: __('Compara hasta tres ofertas para el mismo importe. Deja vacía la tercera si no la necesitas.'),
		fields: [
			{ name: 'amount', label: __('Importe'), unit: '€', value: 20000, positive: true, full: true },
			{ name: 'tinA', label: __('Oferta A · TIN'), unit: '%', value: 5.9, min: 0 },
			{ name: 'yearsA', label: __('Oferta A · años'), value: 6, positive: true },
			{ name: 'feeA', label: __('Oferta A · comisión'), unit: '%', value: 0, min: 0, optional: true },
			{ name: 'tinB', label: __('Oferta B · TIN'), unit: '%', value: 5.2, min: 0 },
			{ name: 'yearsB', label: __('Oferta B · años'), value: 8, positive: true },
			{ name: 'feeB', label: __('Oferta B · comisión'), unit: '%', value: 1.5, min: 0, optional: true },
			{ name: 'tinC', label: __('Oferta C · TIN'), unit: '%', value: '', min: 0, optional: true },
			{ name: 'yearsC', label: __('Oferta C · años'), value: '', positive: true, optional: true },
			{ name: 'feeC', label: __('Oferta C · comisión'), unit: '%', value: '', min: 0, optional: true }
		],
		compute: function (v) {
			var offers = [];
			['A', 'B', 'C'].forEach(function (k) {
				var tin = v['tin' + k], years = v['years' + k];
				if (!isFinite(tin) || !isFinite(years)) { return; }
				var n = Math.round(years * 12);
				if (n < 1 || n > 600) { throw C.err('years' + k, __('El plazo debe estar entre 1 y 50 años.')); }
				var s = loanSchedule(v.amount, tin, n);
				var fee = isFinite(v['fee' + k]) ? v.amount * v['fee' + k] / 100 : 0;
				offers.push({ k: k, pay: s.payment, cost: s.interest + fee, total: s.total + fee, tae: tae(v.amount, fee, s.payment, n), n: n });
			});
			if (offers.length < 2) { throw C.err('tinB', __('Completa al menos dos ofertas.')); }
			var best = offers.slice().sort(function (a, b) { return a.cost - b.cost; })[0];
			return {
				main: { label: __('Oferta más barata en coste total'), value: CT.sprintf(__('Oferta %s'), best.k) },
				stats: offers.map(function (o) { return [CT.sprintf(__('Oferta %s · coste total'), o.k), M(o.cost), o === best ? 'good' : '']; }),
				table: { title: __('Comparativa'), headers: [__('Oferta'), __('Cuota'), __('Cuotas'), __('Intereses + comisión'), __('Total a pagar'), __('TAE aprox.')], rows: offers.map(function (o) { return [o.k, M(o.pay), N(o.n), M(o.cost), M(o.total), isFinite(o.tae) ? P(o.tae) : '—']; }), num: [1, 2, 3, 4, 5] },
				note: __('Una cuota más baja con un plazo más largo suele implicar pagar más intereses en total.')
			};
		}
	});

	/* ---------- Rentabilidad ---------- */
	def('rentabilidad-compra', {
		fields: [
			{ name: 'cost', label: __('Precio de compra'), unit: '€', value: 8000, positive: true },
			{ name: 'extra', label: __('Gastos asociados'), unit: '€', value: 300, min: 0, optional: true },
			{ name: 'value', label: __('Valor actual o precio de venta'), unit: '€', value: 9500, min: 0 },
			{ name: 'income', label: __('Ingresos recibidos (dividendos, alquileres…)'), unit: '€', value: 400, min: 0, optional: true },
			{ name: 'years', label: __('Años de inversión (opcional)'), value: 3, positive: true, optional: true }
		],
		compute: function (v) {
			var z = function (x) { return isFinite(x) ? x : 0; };
			var invested = v.cost + z(v.extra);
			var gain = v.value + z(v.income) - invested;
			var roi = gain / invested * 100;
			var stats = [[__('Inversión total'), M(invested)], [__('Ganancia neta'), M(gain), gain >= 0 ? 'good' : 'bad']];
			if (isFinite(v.years) && v.years > 0 && (1 + roi / 100) > 0) { stats.push([__('Rentabilidad anualizada'), P((Math.pow(1 + roi / 100, 1 / v.years) - 1) * 100)]); }
			return { main: { label: __('Rentabilidad (ROI)'), value: P(roi) }, stats: stats, formula: 'ROI = (' + __('valor final') + ' + ' + __('ingresos') + ' − ' + __('inversión') + ') / ' + __('inversión') + ' × 100', note: __('Antes de impuestos sobre las ganancias.') };
		}
	});

	def('rentabilidad-reventa', {
		fields: [
			{ name: 'buy', label: __('Precio de compra'), unit: '€', value: 120, min: 0 },
			{ name: 'buyCosts', label: __('Gastos de compra (envío, tasas)'), unit: '€', value: 8, min: 0, optional: true },
			{ name: 'repair', label: __('Reparación o preparación'), unit: '€', value: 15, min: 0, optional: true },
			{ name: 'sell', label: __('Precio de venta'), unit: '€', value: 210, positive: true },
			{ name: 'feePct', label: __('Comisión de la plataforma de venta'), unit: '%', value: 10, min: 0, max: 100, optional: true },
			{ name: 'feeFix', label: __('Tarifa fija de venta'), unit: '€', value: 0.5, min: 0, optional: true },
			{ name: 'ship', label: __('Envío a tu cargo'), unit: '€', value: 6, min: 0, optional: true }
		],
		compute: function (v) {
			var z = function (x) { return isFinite(x) ? x : 0; };
			var invested = v.buy + z(v.buyCosts) + z(v.repair);
			var fees = v.sell * z(v.feePct) / 100 + z(v.feeFix) + z(v.ship);
			var profit = v.sell - fees - invested;
			return {
				main: { label: __('Beneficio neto'), value: M(profit) },
				stats: [[__('Inversión total'), M(invested)], [__('Comisiones y envío'), M(fees)], [__('ROI'), invested ? P(profit / invested * 100) : '—', profit >= 0 ? 'good' : 'bad'], [__('Margen sobre venta'), P(profit / v.sell * 100)]],
				formula: __('Beneficio') + ' = ' + __('venta') + ' − ' + __('comisiones') + ' − ' + __('envío') + ' − (' + __('compra') + ' + ' + __('gastos') + ')',
				note: __('Si vendes de forma habitual, revisa tus obligaciones fiscales.')
			};
		}
	});

	/* ---------- Envíos y marketing ---------- */
	def('coste-envio', {
		fields: [
			{ name: 'l', label: __('Largo'), unit: 'cm', value: 40, positive: true },
			{ name: 'w', label: __('Ancho'), unit: 'cm', value: 30, positive: true },
			{ name: 'h', label: __('Alto'), unit: 'cm', value: 20, positive: true },
			{ name: 'kg', label: __('Peso real'), unit: 'kg', value: 3.2, positive: true },
			{ name: 'div', label: __('Divisor volumétrico'), value: 5000, positive: true, help: __('Lo fija cada transportista (habitualmente 4000, 5000 o 6000).') },
			{ name: 'base', label: __('Tarifa base (opcional)'), unit: '€', value: 4.5, min: 0, optional: true },
			{ name: 'perKg', label: __('Precio por kg facturable (opcional)'), unit: '€/kg', value: 0.9, min: 0, optional: true }
		],
		compute: function (v) {
			var vol = v.l * v.w * v.h / v.div;
			var billable = Math.max(vol, v.kg);
			var stats = [[__('Peso volumétrico'), N(vol, 2) + ' kg'], [__('Peso real'), N(v.kg, 2) + ' kg'], [__('Volumen'), N(v.l * v.w * v.h / 1000, 1) + ' L']];
			if (isFinite(v.base) || isFinite(v.perKg)) { stats.push([__('Coste estimado'), M((isFinite(v.base) ? v.base : 0) + (isFinite(v.perKg) ? v.perKg : 0) * Math.ceil(billable))]); }
			return {
				main: { label: __('Peso facturable'), value: N(billable, 2) + ' kg' },
				stats: stats,
				formula: __('Peso volumétrico') + ' = ' + __('largo × ancho × alto (cm)') + ' / ' + __('divisor') + '; ' + __('se factura el mayor'),
				note: __('Muchas tarifas redondean el peso al kilo superior; el coste estimado lo hace.')
			};
		}
	});

	def('coste-adquisicion', {
		fields: [
			{ name: 'marketing', label: __('Gasto en marketing y publicidad'), unit: '€', value: 4500, min: 0 },
			{ name: 'sales', label: __('Otros costes comerciales (opcional)'), unit: '€', value: 1500, min: 0, optional: true },
			{ name: 'customers', label: __('Clientes nuevos conseguidos'), value: 120, positive: true, integer: true },
			{ name: 'aov', label: __('Margen bruto por compra (opcional)'), unit: '€', value: 22, min: 0, optional: true },
			{ name: 'orders', label: __('Compras medias por cliente (opcional)'), value: 3, min: 0, optional: true }
		],
		compute: function (v) {
			var cac = (v.marketing + (isFinite(v.sales) ? v.sales : 0)) / v.customers;
			var stats = [[__('Inversión total'), M(v.marketing + (isFinite(v.sales) ? v.sales : 0))]];
			if (isFinite(v.aov) && isFinite(v.orders)) {
				var ltv = v.aov * v.orders;
				stats.push([__('Valor de cliente estimado (margen)'), M(ltv)]);
				stats.push([__('Ratio valor / CAC'), N(ltv / cac, 2) + ' : 1', ltv >= cac ? 'good' : 'bad']);
			}
			return { main: { label: __('Coste de adquisición por cliente (CAC)'), value: M(cac) }, stats: stats, formula: 'CAC = ' + __('gasto') + ' / ' + __('clientes nuevos') };
		}
	});

	def('coste-publicidad', {
		fields: [
			{ name: 'budget', label: __('Presupuesto'), unit: '€', value: 1000, positive: true },
			{ name: 'model', type: 'seg', label: __('Modelo de pago'), value: 'cpc', options: [{ value: 'cpc', label: 'CPC' }, { value: 'cpm', label: 'CPM' }] },
			{ name: 'cpc', label: __('Coste por clic (CPC)'), unit: '€', value: 0.45, positive: true, showIf: function (v) { return v.model === 'cpc'; } },
			{ name: 'cpm', label: __('Coste por mil impresiones (CPM)'), unit: '€', value: 6, positive: true, showIf: function (v) { return v.model === 'cpm'; } },
			{ name: 'ctr', label: __('Tasa de clics (CTR)'), unit: '%', value: 1.5, positive: true, max: 100 },
			{ name: 'cr', label: __('Tasa de conversión'), unit: '%', value: 2.5, min: 0, max: 100 },
			{ name: 'aov', label: __('Valor medio por venta (opcional)'), unit: '€', value: 55, min: 0, optional: true }
		],
		compute: function (v) {
			var clicks, impressions;
			if (v.model === 'cpc') { clicks = v.budget / v.cpc; impressions = clicks / (v.ctr / 100); }
			else { impressions = v.budget / v.cpm * 1000; clicks = impressions * v.ctr / 100; }
			var conv = clicks * v.cr / 100;
			var stats = [[__('Impresiones'), N(Math.round(impressions))], [__('Clics'), N(Math.round(clicks))], [__('Coste por conversión (CPA)'), conv ? M(v.budget / conv) : '—']];
			if (isFinite(v.aov) && v.aov > 0) {
				var revenue = conv * v.aov;
				stats.push([__('Ingresos estimados'), M(revenue)]);
				stats.push([__('ROAS'), N(revenue / v.budget, 2) + ' ×', revenue >= v.budget ? 'good' : 'bad']);
			}
			return { main: { label: __('Conversiones estimadas'), value: N(conv, 1) }, stats: stats, formula: 'CPA = ' + __('presupuesto') + ' / ' + __('conversiones') + '; ROAS = ' + __('ingresos') + ' / ' + __('presupuesto') };
		}
	});

	/* ---------- Salarios ---------- */
	var PERIODS = [{ value: 'year', label: __('al año') }, { value: 'month', label: __('al mes') }, { value: 'week', label: __('a la semana') }, { value: 'hour', label: __('por hora') }];
	def('sueldo-hora', {
		fields: [
			{ name: 'amount', label: __('Salario bruto'), unit: '€', value: 24000, positive: true },
			{ name: 'period', type: 'select', label: __('Periodo'), value: 'year', options: PERIODS },
			{ name: 'hours', label: __('Horas por semana'), value: 40, positive: true, max: 168 },
			{ name: 'weeks', label: __('Semanas trabajadas al año'), value: 47, positive: true, max: 53, help: __('52 semanas menos vacaciones y festivos (aprox. 47 con 30 días naturales de vacaciones y 14 festivos).') }
		],
		compute: function (v) {
			var annual = v.period === 'year' ? v.amount : v.period === 'month' ? v.amount * 12 : v.period === 'week' ? v.amount * v.weeks : v.amount * v.hours * v.weeks;
			var hourly = annual / (v.hours * v.weeks);
			return {
				main: { label: __('Salario bruto por hora'), value: M(hourly) },
				stats: [[__('Anual'), M(annual)], [__('Mensual (12 pagas)'), M(annual / 12)], [__('Semanal'), M(annual / v.weeks)], [__('Horas efectivas al año'), N(v.hours * v.weeks)]],
				formula: __('€/hora') + ' = ' + __('salario anual') + ' / (' + __('horas por semana') + ' × ' + __('semanas trabajadas') + ')'
			};
		}
	});

	def('conversor-salario', {
		fields: [
			{ name: 'amount', label: __('Importe'), unit: '€', value: 1800, positive: true },
			{ name: 'period', type: 'select', label: __('Periodo del importe'), value: 'month', options: [{ value: 'year', label: __('Anual') }, { value: 'month', label: __('Mensual') }, { value: 'week', label: __('Semanal') }, { value: 'day', label: __('Diario (laborable)') }] },
			{ name: 'payments', type: 'select', label: __('Número de pagas'), value: '14', options: [{ value: '12', label: __('12 pagas') }, { value: '14', label: __('14 pagas (2 extras)') }] },
			{ name: 'days', label: __('Días laborables al año'), value: 222, positive: true, max: 366 }
		],
		compute: function (v) {
			var p = parseInt(v.payments, 10);
			var annual = v.period === 'year' ? v.amount : v.period === 'month' ? v.amount * p : v.period === 'week' ? v.amount * 52 : v.amount * v.days;
			return {
				main: { label: __('Salario anual'), value: M(annual) },
				stats: [[CT.sprintf(__('Mensual en %d pagas'), p), M(annual / p)], [__('Mensual prorrateado (12)'), M(annual / 12)], [__('Semanal'), M(annual / 52)], [__('Por día laborable'), M(annual / v.days)]],
				formula: __('Anual') + ' = ' + __('mensual') + ' × ' + __('pagas') + '; ' + __('semanal') + ' = ' + __('anual') + ' / 52',
				note: __('Las cifras son brutas o netas según el importe que introduzcas.')
			};
		}
	});

	def('salario-neto', {
		intro: __('Estimación orientativa. La retención de IRPF depende de tu situación personal y familiar; calcúlala con el simulador oficial de la Agencia Tributaria o consulta tu nómina.'),
		fields: [
			{ name: 'gross', label: __('Salario bruto anual'), unit: '€', value: 28000, positive: true },
			{ name: 'payments', type: 'select', label: __('Número de pagas'), value: '14', options: [{ value: '12', label: __('12 pagas') }, { value: '14', label: __('14 pagas') }] },
			{ name: 'irpf', label: __('Retención de IRPF'), unit: '%', value: 15, min: 0, max: 60 },
			{ name: 'ss', label: __('Cotización del trabajador a la Seguridad Social'), unit: '%', value: 6.5, min: 0, max: 20, help: __('Valor orientativo para un contrato indefinido del régimen general (contingencias comunes, desempleo, formación profesional y MEI). Comprueba el porcentaje exacto en tu nómina.') }
		],
		compute: function (v) {
			var p = parseInt(v.payments, 10);
			var ss = v.gross * v.ss / 100;
			var irpf = v.gross * v.irpf / 100;
			var net = v.gross - ss - irpf;
			return {
				main: { label: __('Salario neto anual estimado'), value: M(net) },
				stats: [[CT.sprintf(__('Neto mensual (%d pagas)'), p), M(net / p)], [__('Seguridad Social'), M(ss)], [__('Retención IRPF'), M(irpf)], [__('Porcentaje neto'), P(net / v.gross * 100)]],
				formula: __('Neto') + ' = ' + __('bruto') + ' − ' + __('bruto') + ' × (SS% + IRPF%)',
				note: __('No se aplican topes de bases de cotización ni regularizaciones. Las pagas extra prorrateadas o no cambian la cuota mensual, no el total anual.')
			};
		}
	});

	/* ---------- Unidades y precios ---------- */
	def('coste-unidad', {
		fields: [
			{ name: 'total', label: __('Precio total'), unit: '€', value: 18.9, min: 0 },
			{ name: 'units', label: __('Número de unidades'), value: 24, positive: true },
			{ name: 'packs', label: __('Unidades por paquete (opcional)'), value: 6, positive: true, optional: true }
		],
		compute: function (v) {
			var unit = v.total / v.units;
			var stats = [[__('Precio por 10 unidades'), M(unit * 10)], [__('Precio por 100 unidades'), M(unit * 100)]];
			if (isFinite(v.packs)) { stats.push([__('Precio por paquete'), M(unit * v.packs)]); }
			return { main: { label: __('Coste por unidad'), value: M(unit) + (unit < 0.1 ? ' (' + N(unit, 4) + ' €)' : '') }, stats: stats, formula: __('Coste unitario') + ' = ' + __('precio total') + ' / ' + __('unidades') };
		}
	});

	def('precio-kilo', {
		fields: [
			{ name: 'price', label: __('Precio del producto'), unit: '€', value: 2.35, min: 0 },
			{ name: 'qty', label: __('Cantidad'), value: 750, positive: true },
			{ name: 'unit', type: 'select', label: __('Unidad'), value: 'g', options: [{ value: 'g', label: __('gramos (g)') }, { value: 'kg', label: __('kilos (kg)') }, { value: 'ml', label: __('mililitros (ml)') }, { value: 'cl', label: __('centilitros (cl)') }, { value: 'l', label: __('litros (L)') }, { value: 'u', label: __('unidades') }] }
		],
		compute: function (v) {
			if (v.unit === 'u') {
				return { main: { label: __('Precio por unidad'), value: M(v.price / v.qty) }, stats: [[__('Por docena'), M(v.price / v.qty * 12)]], formula: __('precio') + ' / ' + __('unidades') };
			}
			var isMass = v.unit === 'g' || v.unit === 'kg';
			var base = { g: 0.001, kg: 1, ml: 0.001, cl: 0.01, l: 1 }[v.unit] * v.qty;
			var per = v.price / base;
			return {
				main: { label: isMass ? __('Precio por kilo') : __('Precio por litro'), value: M(per) + (isMass ? '/kg' : '/L') },
				stats: [[isMass ? __('Por 100 g') : __('Por 100 ml'), M(per / 10)]],
				formula: __('precio') + ' / ' + __('cantidad en') + (isMass ? ' kg' : ' L'),
				note: __('Útil para comparar envases de distinto tamaño. Para comparar varias ofertas a la vez usa el comparador de ofertas.')
			};
		}
	});

	CT.register('calc-money', CT.engines.calc);
})();
