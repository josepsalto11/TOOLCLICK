/*!
 * HerramientasClave — calculadoras basadas en listas editables: reparto de gastos, presupuestos,
 * suscripciones, ofertas, consumo de aparatos, proveedores y gastos de viaje.
 * Los datos pueden guardarse opcionalmente en este navegador.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number, M = CT.fmt.money;
	var cents = CT.money.toCents;

	/** Tabla editable. cols: [{key,label,type:'text'|'number'|'select',options,placeholder,width}] */
	function editTable(cols, rows, onChange, opts) {
		opts = opts || {};
		var wrap = h('div');
		var draw = function () {
			wrap.innerHTML = '';
			var table = h('table', { class: 'ct-table' });
			table.appendChild(h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { scope: 'col', text: c.label, style: c.width ? { width: c.width } : null }); }), h('th', null, h('span', { class: 'ct-sr', text: __('Acciones') })))));
			var tb = h('tbody');
			rows.forEach(function (r, i) {
				var tr = h('tr');
				cols.forEach(function (c) {
					var opts2 = typeof c.options === 'function' ? c.options() : c.options;
					var inp;
					if (c.type === 'select') {
						inp = h('select', { class: 'ct-input', 'aria-label': c.label + ' ' + (i + 1) });
						(opts2 || []).forEach(function (o) { inp.appendChild(h('option', { value: o.value, text: o.label })); });
						inp.value = r[c.key] !== undefined ? r[c.key] : (opts2 && opts2[0] ? opts2[0].value : '');
						r[c.key] = inp.value;
					} else {
						inp = h('input', { class: 'ct-input', type: c.type === 'date' ? 'date' : 'text', inputmode: c.type === 'number' ? 'decimal' : null, value: r[c.key] !== undefined ? String(r[c.key]) : '', placeholder: c.placeholder || '', 'aria-label': c.label + ' ' + (i + 1) });
					}
					inp.addEventListener('input', function () { r[c.key] = inp.value; onChange(); });
					inp.addEventListener('change', function () { r[c.key] = inp.value; onChange(); });
					tr.appendChild(h('td', null, inp));
				});
				tr.appendChild(h('td', null, ui.button('', { icon: 'trash-2', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Eliminar fila') + ' ' + (i + 1), onClick: function () { rows.splice(i, 1); draw(); onChange(); } })));
				tb.appendChild(tr);
			});
			table.appendChild(tb);
			wrap.appendChild(h('div', { class: 'ct-table-wrap' }, table));
			wrap.appendChild(h('div', { class: 'ct-actions' }, ui.button(opts.addLabel || __('Añadir fila'), { icon: 'plus', size: 'sm', onClick: function () { var n = {}; cols.forEach(function (c) { n[c.key] = c.default !== undefined ? c.default : ''; }); rows.push(n); draw(); onChange(); var last = wrap.querySelector('tbody tr:last-child input, tbody tr:last-child select'); if (last) { last.focus(); } } })));
		};
		draw();
		return { el: wrap, redraw: draw, rows: function () { return rows; } };
	}
	var num = function (v) { var n = CT.parseNum(v); return isFinite(n) ? n : 0; };

	/** Liquidación mínima de deudas a partir de saldos en céntimos. */
	function settle(balances) {
		var cred = [], debt = [];
		Object.keys(balances).forEach(function (p) { if (balances[p] > 0) { cred.push([p, balances[p]]); } else if (balances[p] < 0) { debt.push([p, -balances[p]]); } });
		cred.sort(function (a, b) { return b[1] - a[1]; }); debt.sort(function (a, b) { return b[1] - a[1]; });
		var out = [], i = 0, j = 0;
		while (i < debt.length && j < cred.length) {
			var amt = Math.min(debt[i][1], cred[j][1]);
			if (amt > 0) { out.push([debt[i][0], cred[j][0], amt]); }
			debt[i][1] -= amt; cred[j][1] -= amt;
			if (debt[i][1] === 0) { i++; }
			if (cred[j][1] === 0) { j++; }
		}
		return out;
	}
	CT.settle = settle;
	/** Reparte gastos (en céntimos) y devuelve saldos. */
	function balancesFor(people, expenses) {
		var bal = {}, paid = {}, share = {};
		people.forEach(function (p) { bal[p] = 0; paid[p] = 0; share[p] = 0; });
		expenses.forEach(function (e) {
			var amount = cents(num(e.amount));
			if (!amount || !e.payer || bal[e.payer] === undefined) { return; }
			var among = String(e.among || '').split(/[,;]+/).map(function (s) { return s.trim(); }).filter(function (s) { return bal[s] !== undefined; });
			if (!among.length) { among = people; }
			var base = Math.floor(amount / among.length), rem = amount - base * among.length;
			among.forEach(function (p, k) { var part = base + (k < rem ? 1 : 0); bal[p] -= part; share[p] += part; });
			bal[e.payer] += amount; paid[e.payer] += amount;
		});
		return { bal: bal, paid: paid, share: share };
	}
	CT.balancesFor = balancesFor;

	function persisted(el, key, initial, getData, onClear) {
		var p = CT.persist(key, true);
		var data = p.load(null) || initial;
		el.appendChild(ui.persistToggle(p, getData, onClear));
		return { data: data, save: function () { p.save(getData()); } };
	}

	var tools = {};

	tools.split = function (el, tool) {
		var travel = tool.config && tool.config.travel;
		var st;
		var peopleF = ui.field({ label: __('Participantes (separados por comas)'), value: '' });
		var result = h('div', { 'aria-live': 'polite' });
		var data = { people: 'Ana, Luis, Marta', rows: travel ? [{ concept: __('Alojamiento'), cat: 'alojamiento', amount: '360', payer: 'Ana', among: '' }, { concept: __('Gasolina'), cat: 'transporte', amount: '85,40', payer: 'Luis', among: '' }, { concept: __('Cena'), cat: 'comida', amount: '96', payer: 'Marta', among: 'Ana, Marta' }] : [{ concept: __('Supermercado'), amount: '64,30', payer: 'Ana', among: '' }, { concept: __('Entradas'), amount: '45', payer: 'Luis', among: '' }] };
		var people = function () { return peopleF.input.value.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(function (s, i, a) { return s && a.indexOf(s) === i; }); };
		var cats = [{ value: 'alojamiento', label: __('Alojamiento') }, { value: 'transporte', label: __('Transporte') }, { value: 'comida', label: __('Comida') }, { value: 'actividades', label: __('Actividades') }, { value: 'compras', label: __('Compras') }, { value: 'otros', label: __('Otros') }];
		st = persisted(el, travel ? 'travel' : 'split', data, function () { return { people: peopleF.input.value, rows: table.rows() }; }, function () { table.rows().length = 0; table.redraw(); calc(); });
		peopleF.input.value = st.data.people;
		var cols = [{ key: 'concept', label: __('Concepto') }];
		if (travel) { cols.push({ key: 'cat', label: __('Categoría'), type: 'select', options: cats }); }
		cols.push({ key: 'amount', label: __('Importe (€)'), type: 'number', width: '120px' }, { key: 'payer', label: __('Pagó'), type: 'select', options: function () { return people().map(function (p) { return { value: p, label: p }; }); } }, { key: 'among', label: __('Entre (vacío = todos)'), placeholder: __('todos') });
		var table = editTable(cols, st.data.rows, function () { calc(); }, { addLabel: __('Añadir gasto') });
		var calc = function () {
			st.save();
			result.innerHTML = '';
			var ps = people();
			if (ps.length < 2) { result.appendChild(ui.alert('info', __('Indica al menos dos participantes.'))); return; }
			var b = balancesFor(ps, table.rows());
			var total = ps.reduce(function (a, p) { return a + b.paid[p]; }, 0);
			var tx = settle(Object.assign({}, b.bal));
			result.appendChild(ui.resultCard({ label: __('Total de gastos'), main: M(total / 100), stats: [[__('Por persona (media)'), M(total / ps.length / 100)], [__('Pagos necesarios'), N(tx.length)]] }));
			result.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px' }, text: __('Quién debe a quién') }));
			result.appendChild(tx.length ? h('ul', { class: 'ct-list-items' }, tx.map(function (t) { return h('li', { class: 'ct-list-item' }, CT.iconEl('arrow-right'), h('span', { class: 'ct-list-item__text' }, h('strong', { text: t[0] }), ' ' + __('paga a') + ' ', h('strong', { text: t[1] })), h('strong', { text: M(t[2] / 100) })); })) : ui.alert('ok', __('Las cuentas están saldadas.')));
			result.appendChild(ui.table([__('Persona'), __('Ha pagado'), __('Le corresponde'), __('Saldo')], ps.map(function (p) { return [p, M(b.paid[p] / 100), M(b.share[p] / 100), (b.bal[p] > 0 ? '+' : '') + M(b.bal[p] / 100)]; }), { num: [1, 2, 3] }));
			if (travel) {
				var byCat = {};
				table.rows().forEach(function (r) { byCat[r.cat] = (byCat[r.cat] || 0) + cents(num(r.amount)); });
				result.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px' }, text: __('Gastos por categoría') }));
				result.appendChild(ui.table([__('Categoría'), __('Total'), '%'], cats.filter(function (c) { return byCat[c.value]; }).map(function (c) { return [c.label, M(byCat[c.value] / 100), CT.fmt.percent(byCat[c.value] / total * 100, 1)]; }), { num: [1, 2] }));
			}
			result.appendChild(ui.actions(ui.button(__('Copiar resumen'), { icon: 'copy', size: 'sm', onClick: function () { CT.copy(tx.map(function (t) { return t[0] + ' → ' + t[1] + ': ' + M(t[2] / 100); }).join('\n') || __('Las cuentas están saldadas.')); } })));
		};
		peopleF.input.addEventListener('input', CT.debounce(function () { table.redraw(); calc(); }, 400));
		el.appendChild(peopleF.el);
		el.appendChild(table.el);
		el.appendChild(result);
		calc();
	};

	var BUDGET_CATS = [['Vivienda', __('Vivienda')], ['Alimentación', __('Alimentación')], ['Transporte', __('Transporte')], ['Suministros', __('Suministros')], ['Salud', __('Salud')], ['Educación', __('Educación')], ['Ocio', __('Ocio')], ['Ropa', __('Ropa')], ['Seguros', __('Seguros')], ['Deudas', __('Deudas')], ['Ahorro', __('Ahorro')], ['Otros', __('Otros')]].map(function (c) { return { value: c[0], label: c[1] }; });
	var catLabel = function (v) { var c = BUDGET_CATS.filter(function (x) { return x.value === v; })[0]; return c ? c.label : v; };
	tools.budget = function (el) {
		var st = persisted(el, 'budget', { rows: [{ type: 'in', concept: __('Nómina'), cat: 'Otros', amount: '1800' }, { type: 'out', concept: __('Alquiler'), cat: 'Vivienda', amount: '750' }, { type: 'out', concept: __('Supermercado'), cat: 'Alimentación', amount: '320' }, { type: 'out', concept: __('Transporte'), cat: 'Transporte', amount: '60' }, { type: 'out', concept: __('Luz, agua e internet'), cat: 'Suministros', amount: '110' }] }, function () { return { rows: table.rows() }; }, function () { table.rows().length = 0; table.redraw(); calc(); });
		var result = h('div', { 'aria-live': 'polite' });
		var table = editTable([{ key: 'type', label: __('Tipo'), type: 'select', options: [{ value: 'out', label: __('Gasto') }, { value: 'in', label: __('Ingreso') }], width: '120px' }, { key: 'concept', label: __('Concepto') }, { key: 'cat', label: __('Categoría'), type: 'select', options: BUDGET_CATS }, { key: 'amount', label: __('Importe mensual (€)'), type: 'number', width: '140px' }], st.data.rows, function () { calc(); }, { addLabel: __('Añadir ingreso o gasto') });
		var calc = function () {
			st.save();
			var inc = 0, out = 0, byCat = {};
			table.rows().forEach(function (r) { var a = cents(num(r.amount)); if (r.type === 'in') { inc += a; } else { out += a; byCat[r.cat] = (byCat[r.cat] || 0) + a; } });
			result.innerHTML = '';
			var bal = inc - out;
			result.appendChild(ui.resultCard({ label: __('Saldo mensual'), main: M(bal / 100), stats: [[__('Ingresos'), M(inc / 100)], [__('Gastos'), M(out / 100)], [__('Tasa de ahorro'), inc ? CT.fmt.percent(bal / inc * 100, 1) : '—', bal >= 0 ? 'good' : 'bad'], [__('Proyección anual'), M(bal * 12 / 100)]] }));
			var keys = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
			if (keys.length) {
				result.appendChild(ui.table([__('Categoría'), __('Gasto mensual'), __('% de los gastos'), __('% de los ingresos')], keys.map(function (k) { return [catLabel(k), M(byCat[k] / 100), CT.fmt.percent(byCat[k] / out * 100, 1), inc ? CT.fmt.percent(byCat[k] / inc * 100, 1) : '—']; }), { num: [1, 2, 3] }));
			}
			if (bal < 0) { result.appendChild(ui.alert('warn', __('Los gastos superan a los ingresos. Revisa las categorías con más peso.'))); }
			result.appendChild(ui.actions(ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () { CT.download('﻿' + CT.csv.stringify([[__('Tipo'), __('Concepto'), __('Categoría'), __('Importe')]].concat(table.rows().map(function (r) { return [r.type === 'in' ? __('Ingreso') : __('Gasto'), r.concept, r.cat, String(num(r.amount)).replace('.', ',')]; })), ';'), 'presupuesto-mensual.csv', 'text/csv;charset=utf-8'); } }), ui.button(__('Imprimir'), { icon: 'printer', size: 'sm', variant: 'ghost', onClick: function () { window.print(); } })));
		};
		el.appendChild(table.el);
		el.appendChild(result);
		calc();
	};

	var PERIODS = { week: 52 / 12, month: 1, quarter: 1 / 3, half: 1 / 6, year: 1 / 12 };
	tools.subs = function (el) {
		var st = persisted(el, 'subs', { rows: [{ name: __('Plataforma de vídeo'), price: '12,99', period: 'month' }, { name: __('Música'), price: '10,99', period: 'month' }, { name: __('Almacenamiento en la nube'), price: '29,99', period: 'year' }, { name: __('Gimnasio'), price: '35', period: 'month' }] }, function () { return { rows: table.rows() }; }, function () { table.rows().length = 0; table.redraw(); calc(); });
		var result = h('div', { 'aria-live': 'polite' });
		var table = editTable([{ key: 'name', label: __('Servicio') }, { key: 'price', label: __('Precio (€)'), type: 'number', width: '120px' }, { key: 'period', label: __('Se paga'), type: 'select', options: [{ value: 'week', label: __('cada semana') }, { value: 'month', label: __('cada mes') }, { value: 'quarter', label: __('cada trimestre') }, { value: 'half', label: __('cada semestre') }, { value: 'year', label: __('cada año') }] }], st.data.rows, function () { calc(); }, { addLabel: __('Añadir suscripción') });
		var calc = function () {
			st.save();
			var items = table.rows().map(function (r) { return { name: r.name || '—', month: num(r.price) * (PERIODS[r.period] || 1) }; }).filter(function (x) { return x.month > 0; });
			var total = items.reduce(function (a, x) { return a + x.month; }, 0);
			items.sort(function (a, b) { return b.month - a.month; });
			result.innerHTML = '';
			result.appendChild(ui.resultCard({ label: __('Gasto mensual en suscripciones'), main: M(total), stats: [[__('Al año'), M(total * 12)], [__('Al día'), M(total * 12 / 365)], [__('Suscripciones'), N(items.length)]] }));
			if (items.length) { result.appendChild(ui.table([__('Servicio'), __('Al mes'), __('Al año'), '%'], items.map(function (x) { return [x.name, M(x.month), M(x.month * 12), CT.fmt.percent(x.month / total * 100, 1)]; }), { num: [1, 2, 3] })); }
		};
		el.appendChild(table.el);
		el.appendChild(result);
		calc();
	};

	var UNIT = { g: ['kg', 0.001], kg: ['kg', 1], ml: ['L', 0.001], cl: ['L', 0.01], l: ['L', 1], u: ['u', 1] };
	tools.offers = function (el) {
		var st = persisted(el, 'offers', { rows: [{ name: __('Paquete 500 g'), price: '2,35', qty: '500', unit: 'g', packs: '1' }, { name: __('Paquete 1 kg'), price: '4,10', qty: '1', unit: 'kg', packs: '1' }, { name: __('Oferta 3 × 400 g'), price: '5,49', qty: '400', unit: 'g', packs: '3' }] }, function () { return { rows: table.rows() }; }, function () { table.rows().length = 0; table.redraw(); calc(); });
		var result = h('div', { 'aria-live': 'polite' });
		var table = editTable([{ key: 'name', label: __('Producto u oferta') }, { key: 'price', label: __('Precio total (€)'), type: 'number', width: '120px' }, { key: 'qty', label: __('Cantidad por envase'), type: 'number', width: '120px' }, { key: 'unit', label: __('Unidad'), type: 'select', options: [{ value: 'g', label: 'g' }, { value: 'kg', label: 'kg' }, { value: 'ml', label: 'ml' }, { value: 'cl', label: 'cl' }, { value: 'l', label: 'L' }, { value: 'u', label: __('unidades') }] }, { key: 'packs', label: __('Envases'), type: 'number', width: '90px', default: '1' }], st.data.rows, function () { calc(); }, { addLabel: __('Añadir oferta') });
		var calc = function () {
			st.save();
			var items = table.rows().map(function (r) {
				var u = UNIT[r.unit] || UNIT.u, qty = num(r.qty) * u[1] * (num(r.packs) || 1);
				return { name: r.name || '—', base: u[0], per: qty > 0 ? num(r.price) / qty : NaN };
			}).filter(function (x) { return isFinite(x.per) && x.per > 0; });
			result.innerHTML = '';
			if (!items.length) { return; }
			var groups = {};
			items.forEach(function (x) { (groups[x.base] = groups[x.base] || []).push(x); });
			Object.keys(groups).forEach(function (g) {
				var list = groups[g].sort(function (a, b) { return a.per - b.per; }), best = list[0];
				result.appendChild(ui.resultCard({ label: CT.sprintf(__('Mejor precio por %s'), g === 'u' ? __('unidad') : g), main: best.name + ' · ' + M(best.per) + '/' + (g === 'u' ? 'u' : g) }));
				result.appendChild(ui.table([__('Oferta'), CT.sprintf(__('Precio por %s'), g === 'u' ? __('unidad') : g), __('Diferencia con la mejor')], list.map(function (x) { return [x.name, M(x.per), x === best ? '—' : '+' + CT.fmt.percent((x.per / best.per - 1) * 100, 1)]; }), { num: [1, 2] }));
			});
		};
		el.appendChild(table.el);
		el.appendChild(result);
		calc();
	};

	tools.appliances = function (el) {
		var priceF = ui.field({ label: __('Precio de la energía'), type: 'number', unit: '€/kWh', value: 0.15, help: __('Consúltalo en tu factura.') });
		var st = persisted(el, 'appliances', { price: '0,15', rows: [{ name: __('Frigorífico'), w: '150', hours: '8', days: '30' }, { name: __('Lavadora'), w: '2000', hours: '1', days: '12' }, { name: __('Televisor'), w: '100', hours: '4', days: '30' }, { name: __('Horno'), w: '2200', hours: '0,5', days: '10' }] }, function () { return { price: priceF.input.value, rows: table.rows() }; }, function () { table.rows().length = 0; table.redraw(); calc(); });
		priceF.input.value = st.data.price;
		var result = h('div', { 'aria-live': 'polite' });
		var table = editTable([{ key: 'name', label: __('Aparato') }, { key: 'w', label: __('Potencia (W)'), type: 'number', width: '110px' }, { key: 'hours', label: __('Horas/día'), type: 'number', width: '100px' }, { key: 'days', label: __('Días/mes'), type: 'number', width: '100px', default: '30' }], st.data.rows, function () { calc(); }, { addLabel: __('Añadir aparato') });
		var calc = function () {
			st.save();
			var price = num(priceF.input.value);
			var items = table.rows().map(function (r) { var kwh = num(r.w) * num(r.hours) * num(r.days) / 1000; return { name: r.name || '—', kwh: kwh, cost: kwh * price }; }).filter(function (x) { return x.kwh > 0; });
			var tk = items.reduce(function (a, x) { return a + x.kwh; }, 0);
			items.sort(function (a, b) { return b.kwh - a.kwh; });
			result.innerHTML = '';
			result.appendChild(ui.resultCard({ label: __('Coste mensual estimado'), main: M(tk * price), stats: [[__('Consumo mensual'), N(tk, 1) + ' kWh'], [__('Coste anual'), M(tk * price * 12)]], note: __('Solo energía consumida; la factura incluye además potencia contratada e impuestos.') }));
			if (items.length) { result.appendChild(ui.table([__('Aparato'), __('kWh/mes'), __('€/mes'), '%'], items.map(function (x) { return [x.name, N(x.kwh, 1), M(x.cost), CT.fmt.percent(x.kwh / tk * 100, 1)]; }), { num: [1, 2, 3] })); }
		};
		priceF.input.addEventListener('input', calc);
		el.appendChild(h('div', { class: 'ct-cols' }, priceF.el));
		el.appendChild(table.el);
		el.appendChild(result);
		calc();
	};

	tools.suppliers = function (el) {
		var qtyF = ui.field({ label: __('Unidades que necesitas'), type: 'number', integer: true, value: 500 });
		var st = persisted(el, 'suppliers', { qty: '500', rows: [{ name: __('Proveedor A'), price: '1,85', disc: '0', ship: '25', min: '100', days: '3' }, { name: __('Proveedor B'), price: '1,72', disc: '5', ship: '60', min: '500', days: '7' }, { name: __('Proveedor C'), price: '1,95', disc: '10', ship: '0', min: '250', days: '2' }] }, function () { return { qty: qtyF.input.value, rows: table.rows() }; }, function () { table.rows().length = 0; table.redraw(); calc(); });
		qtyF.input.value = st.data.qty;
		var result = h('div', { 'aria-live': 'polite' });
		var table = editTable([{ key: 'name', label: __('Proveedor') }, { key: 'price', label: __('Precio unidad (€)'), type: 'number', width: '120px' }, { key: 'disc', label: __('Descuento %'), type: 'number', width: '100px' }, { key: 'ship', label: __('Envío (€)'), type: 'number', width: '100px' }, { key: 'min', label: __('Pedido mínimo'), type: 'number', width: '110px' }, { key: 'days', label: __('Plazo (días)'), type: 'number', width: '100px' }], st.data.rows, function () { calc(); }, { addLabel: __('Añadir proveedor') });
		var calc = function () {
			st.save();
			var q = num(qtyF.input.value);
			var items = table.rows().map(function (r) {
				var total = num(r.price) * q * (1 - num(r.disc) / 100) + num(r.ship);
				return { name: r.name || '—', total: total, unit: q ? total / q : NaN, ok: q >= num(r.min), days: num(r.days) };
			}).filter(function (x) { return x.total > 0; });
			result.innerHTML = '';
			if (!items.length || !q) { return; }
			var valid = items.filter(function (x) { return x.ok; }).sort(function (a, b) { return a.total - b.total; });
			if (valid.length) { result.appendChild(ui.resultCard({ label: CT.sprintf(__('Opción más barata para %s unidades'), N(q)), main: valid[0].name + ' · ' + M(valid[0].total), stats: [[__('Coste por unidad'), M(valid[0].unit)], [__('Plazo'), N(valid[0].days) + ' ' + __('días')]] })); }
			else { result.appendChild(ui.alert('warn', __('Ningún proveedor admite esa cantidad por su pedido mínimo.'))); }
			result.appendChild(ui.table([__('Proveedor'), __('Total'), __('Por unidad'), __('Pedido mínimo'), __('Plazo')], items.sort(function (a, b) { return a.total - b.total; }).map(function (x) { return [x.name, M(x.total), M(x.unit), x.ok ? '✓' : '✗ ' + __('no alcanza'), N(x.days) + ' ' + __('días')]; }), { num: [1, 2] }));
		};
		qtyF.input.addEventListener('input', calc);
		el.appendChild(h('div', { class: 'ct-cols' }, qtyF.el));
		el.appendChild(table.el);
		el.appendChild(result);
		calc();
	};

	CT.register('lists', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
	CT.editTable = editTable;
})();
