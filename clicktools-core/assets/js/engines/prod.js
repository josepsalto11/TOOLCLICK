/*!
 * HerramientasClave — productividad: listas, planificadores, prioridades, Pomodoro, tablas y turnos.
 * El guardado en este navegador es opcional y se puede desactivar o borrar en cualquier momento.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;
	var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
	var PRIO = { alta: [__('Alta'), 3], media: [__('Media'), 2], baja: [__('Baja'), 1] };

	function checklist(el, opts) {
		var persist = CT.persist(opts.key, true);
		var items = persist.load(null) || opts.initial || [];
		var listEl = h('ul', { class: 'ct-list-items' });
		var counter = h('p', { class: 'ct-help', 'aria-live': 'polite' });
		var text = ui.field({ label: opts.addLabel || __('Nuevo elemento'), value: '', placeholder: opts.placeholder || '' });
		var extra = opts.extraFields ? opts.extraFields() : [];
		var save = function () { persist.save(items); };
		var render = function () {
			listEl.innerHTML = '';
			var shown = opts.filter ? items.filter(opts.filter()) : items;
			if (opts.sort) { shown = shown.slice().sort(opts.sort()); }
			if (!shown.length) { listEl.appendChild(h('li', { class: 'ct-help', text: opts.empty || __('La lista está vacía.') })); }
			shown.forEach(function (it) {
				var cb = h('input', { type: 'checkbox', 'aria-label': (it.done ? __('Desmarcar') : __('Marcar')) + ' ' + it.text });
				cb.checked = !!it.done;
				cb.addEventListener('change', function () { it.done = cb.checked; it.doneAt = cb.checked ? Date.now() : null; save(); render(); });
				listEl.appendChild(h('li', { class: 'ct-list-item' + (it.done ? ' is-done' : '') }, cb,
					h('span', { class: 'ct-list-item__text' }, it.text, opts.meta ? opts.meta(it) : null),
					ui.button('', { icon: 'trash-2', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon ct-no-print', aria: __('Eliminar') + ' ' + it.text, onClick: function () { items.splice(items.indexOf(it), 1); save(); render(); } })));
			});
			var done = items.filter(function (i) { return i.done; }).length;
			counter.textContent = CT.sprintf(__('%1$d de %2$d completados'), done, items.length);
		};
		var add = function () {
			var t = text.input.value.trim();
			if (!t) { text.error(__('Escribe algo antes de añadir.')); text.input.focus(); return; }
			text.error('');
			t.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (line) {
				var it = { id: uid(), text: line.slice(0, 300), done: false, created: Date.now() };
				extra.forEach(function (f) { it[f.key] = f.input.value; });
				items.push(it);
			});
			text.input.value = '';
			save(); render(); text.input.focus();
			CT.track('done');
		};
		text.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
		el.appendChild(ui.persistToggle(persist, function () { return items; }, function () { items.length = 0; render(); }));
		if (opts.before) { el.appendChild(opts.before(function () { return items; }, function (newItems) { newItems.forEach(function (x) { items.push(x); }); save(); render(); }, render)); }
		el.appendChild(h('div', { class: 'ct-row ct-no-print', style: { alignItems: 'flex-end' } }, text.el, extra.map(function (f) { return f.el; }), h('div', { class: 'ct-field' }, ui.button(__('Añadir'), { variant: 'primary', icon: 'plus', onClick: add }))));
		if (opts.toolbar) { el.appendChild(opts.toolbar(render)); }
		el.appendChild(counter);
		el.appendChild(listEl);
		el.appendChild(ui.actions(
			ui.button(__('Quitar completados'), { icon: 'check', size: 'sm', variant: 'ghost', onClick: function () { for (var i = items.length - 1; i >= 0; i--) { if (items[i].done) { items.splice(i, 1); } } save(); render(); } }),
			ui.button(__('Desmarcar todo'), { icon: 'undo-2', size: 'sm', variant: 'ghost', onClick: function () { items.forEach(function (i) { i.done = false; }); save(); render(); } }),
			ui.button(__('Copiar lista'), { icon: 'copy', size: 'sm', variant: 'ghost', onClick: function () { CT.copy(items.map(function (i) { return (i.done ? '[x] ' : '[ ] ') + i.text; }).join('\n')); } }),
			ui.button(__('Imprimir'), { icon: 'printer', size: 'sm', variant: 'ghost', onClick: function () { CT.printArea(listEl); } }),
			opts.csv ? ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', variant: 'ghost', onClick: function () { CT.download('﻿' + CT.csv.stringify(opts.csv(items), ';'), opts.key + '.csv', 'text/csv;charset=utf-8'); } }) : null));
		render();
		return { items: function () { return items; }, render: render };
	}

	var tools = {};

	tools.todo = function (el) {
		var filter = 'pending', sortBy = 'due';
		var fmtDate = function (d) { return d ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')) : ''; };
		checklist(el, {
			key: 'todo', addLabel: __('Nueva tarea'), placeholder: __('Por ejemplo: enviar el presupuesto'),
			initial: [],
			extraFields: function () {
				var due = ui.field({ label: __('Fecha límite'), type: 'date', value: '' }); due.key = 'due';
				var pr = ui.field({ label: __('Prioridad'), type: 'select', value: 'media', options: Object.keys(PRIO).map(function (k) { return { value: k, label: PRIO[k][0] }; }) }); pr.key = 'prio';
				return [due, pr];
			},
			meta: function (it) {
				var today = new Date().toISOString().slice(0, 10);
				var late = it.due && !it.done && it.due < today;
				return h('span', { class: 'ct-row', style: { gap: '6px', marginLeft: '8px', display: 'inline-flex' } }, it.prio ? h('span', { class: 'ct-chip' + (it.prio === 'alta' ? ' ct-chip--warn' : ''), text: PRIO[it.prio][0] }) : null, it.due ? h('span', { class: 'ct-chip' + (late ? ' ct-chip--warn' : ''), text: (late ? __('Vencida') + ' · ' : '') + fmtDate(it.due) }) : null);
			},
			filter: function () { return function (it) { return filter === 'all' || (filter === 'pending' ? !it.done : it.done); }; },
			sort: function () { return function (a, b) { if (sortBy === 'prio') { return PRIO[b.prio || 'media'][1] - PRIO[a.prio || 'media'][1]; } return (a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0; }; },
			toolbar: function (render) {
				var seg = ui.seg({ label: __('Mostrar'), value: 'pending', options: [{ value: 'pending', label: __('Pendientes') }, { value: 'done', label: __('Completadas') }, { value: 'all', label: __('Todas') }], onChange: function (v) { filter = v; render(); } });
				var sort = ui.seg({ label: __('Ordenar por'), value: 'due', options: [{ value: 'due', label: __('Fecha') }, { value: 'prio', label: __('Prioridad') }], onChange: function (v) { sortBy = v; render(); } });
				return h('div', { class: 'ct-row ct-no-print' }, seg.el, sort.el);
			},
			csv: function (items) { return [[__('Tarea'), __('Prioridad'), __('Fecha límite'), __('Completada'), __('Completada el')]].concat(items.map(function (i) { return [i.text, i.prio ? PRIO[i.prio][0] : '', i.due || '', i.done ? __('sí') : __('no'), i.doneAt ? new Date(i.doneAt).toISOString() : '']; })); }
		});
	};

	tools.log = function (el) {
		var persist = CT.persist('todo', true);
		var box = h('div');
		var render = function () {
			var items = (persist.load([]) || []).filter(function (i) { return i.done && i.doneAt; }).sort(function (a, b) { return b.doneAt - a.doneAt; });
			box.innerHTML = '';
			if (!persist.enabled()) { box.appendChild(ui.alert('info', __('El registro usa las tareas guardadas de la lista de tareas. Activa allí «Guardar en este navegador».'))); return; }
			if (!items.length) { box.appendChild(ui.alert('info', __('Todavía no hay tareas completadas. Márcalas como hechas en la lista de tareas.'))); return; }
			var byDay = {};
			items.forEach(function (i) { var d = new Date(i.doneAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); (byDay[d] = byDay[d] || []).push(i); });
			box.appendChild(ui.resultCard({ label: __('Tareas completadas'), main: N(items.length), stats: [[__('Últimos 7 días'), N(items.filter(function (i) { return Date.now() - i.doneAt < 7 * 864e5; }).length)], [__('Hoy'), N(items.filter(function (i) { return new Date(i.doneAt).toDateString() === new Date().toDateString(); }).length)]] }));
			Object.keys(byDay).forEach(function (d) { box.appendChild(h('h3', { class: 'ct-panel__title', style: { marginTop: '16px', textTransform: 'capitalize' }, text: d })); box.appendChild(h('ul', { class: 'ct-list-items' }, byDay[d].map(function (i) { return h('li', { class: 'ct-list-item' }, CT.iconEl('circle-check'), h('span', { class: 'ct-list-item__text', text: i.text }), h('small', { class: 'ct-muted', text: new Date(i.doneAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) })); }))); });
			box.appendChild(ui.actions(ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () { CT.download('﻿' + CT.csv.stringify([[__('Tarea'), __('Completada el')]].concat(items.map(function (i) { return [i.text, new Date(i.doneAt).toLocaleString('es-ES')]; })), ';'), 'registro-tareas.csv', 'text/csv;charset=utf-8'); } })));
		};
		el.appendChild(box);
		render();
	};

	tools.shopping = function (el) {
		var AISLES = [['fruta', __('Fruta y verdura')], ['frescos', __('Carne, pescado y frescos')], ['lacteos', __('Lácteos y huevos')], ['despensa', __('Despensa')], ['bebidas', __('Bebidas')], ['congelados', __('Congelados')], ['limpieza', __('Limpieza e higiene')], ['otros', __('Otros')]];
		checklist(el, {
			key: 'shopping', addLabel: __('Producto'), placeholder: __('Leche, pan…'),
			extraFields: function () {
				var q = ui.field({ label: __('Cantidad'), value: '', placeholder: '2' }); q.key = 'qty';
				var a = ui.field({ label: __('Sección'), type: 'select', value: 'otros', options: AISLES.map(function (x) { return { value: x[0], label: x[1] }; }) }); a.key = 'aisle';
				return [q, a];
			},
			meta: function (it) { var a = AISLES.filter(function (x) { return x[0] === it.aisle; })[0]; return h('span', { class: 'ct-muted', text: (it.qty ? ' × ' + it.qty : '') + (a ? ' · ' + a[1] : '') }); },
			sort: function () { var order = AISLES.map(function (x) { return x[0]; }); return function (x, y) { return (x.done - y.done) || (order.indexOf(x.aisle) - order.indexOf(y.aisle)); }; },
			empty: __('Añade productos; se agruparán por sección del supermercado.')
		});
	};

	var PACK = {
		base: [__('Documento de identidad o pasaporte'), __('Tarjeta sanitaria'), __('Cargador del móvil'), __('Cepillo y pasta de dientes'), __('Medicación habitual'), __('Ropa interior'), __('Pijama'), __('Gafas o lentillas')],
		playa: [__('Bañador'), __('Crema solar'), __('Toalla de playa'), __('Gafas de sol'), __('Gorra o sombrero'), __('Chanclas')],
		montana: [__('Calzado de montaña'), __('Chaqueta impermeable'), __('Ropa térmica'), __('Linterna'), __('Botiquín'), __('Cantimplora')],
		trabajo: [__('Portátil y cargador'), __('Adaptador de enchufe'), __('Ropa formal'), __('Documentación de la reunión'), __('Tarjetas de visita')],
		bebe: [__('Pañales y toallitas'), __('Biberones'), __('Ropa de recambio'), __('Cartilla de vacunación'), __('Juguete favorito')]
	};
	tools.packing = function (el) {
		checklist(el, {
			key: 'packing', addLabel: __('Añadir a la maleta'), placeholder: __('Paraguas'),
			before: function (get, add) {
				var sel = ui.field({ label: __('Cargar una plantilla'), type: 'select', value: 'base', options: [{ value: 'base', label: __('Básico para cualquier viaje') }, { value: 'playa', label: __('Playa') }, { value: 'montana', label: __('Montaña') }, { value: 'trabajo', label: __('Viaje de trabajo') }, { value: 'bebe', label: __('Viajar con bebé') }] });
				return h('div', { class: 'ct-row ct-no-print', style: { alignItems: 'flex-end' } }, sel.el, h('div', { class: 'ct-field' }, ui.button(__('Añadir plantilla'), { icon: 'luggage', onClick: function () {
					var existing = get().map(function (i) { return i.text.toLowerCase(); });
					add(PACK[sel.input.value].filter(function (t) { return existing.indexOf(t.toLowerCase()) < 0; }).map(function (t) { return { id: uid(), text: t, done: false }; }));
				} })));
			},
			empty: __('Carga una plantilla o añade tus propios elementos.')
		});
	};

	tools.notes = function (el) {
		var input = ui.field({ label: __('Pega tus notas (una tarea por línea; se quitan viñetas y números)'), type: 'textarea', rows: 7, value: '- Llamar al banco\n* Revisar el contrato\n3. Enviar facturas de octubre\n[ ] Pedir cita médica' });
		var list = h('ul', { class: 'ct-list-items' });
		var run = function () {
			list.innerHTML = '';
			input.input.value.split('\n').map(function (l) { return l.replace(/^\s*(?:[-*•–]|\d+[.)]|\[[ xX]?\]|[a-z]\))\s*/, '').trim(); }).filter(Boolean).forEach(function (t, i) {
				var id = 'nt-' + i;
				list.appendChild(h('li', { class: 'ct-list-item' }, h('input', { type: 'checkbox', id: id }), h('label', { for: id, class: 'ct-list-item__text', text: t })));
			});
		};
		el.appendChild(input.el);
		el.appendChild(list);
		el.appendChild(ui.actions(
			ui.button(__('Copiar en formato Markdown'), { icon: 'copy', onClick: function () { CT.copy(CT.$$('li', list).map(function (li) { return '- [' + (li.querySelector('input').checked ? 'x' : ' ') + '] ' + li.textContent; }).join('\n')); } }),
			ui.button(__('Imprimir'), { icon: 'printer', variant: 'ghost', onClick: function () { CT.printArea(list); } })));
		input.input.addEventListener('input', CT.debounce(run, 200));
		run();
	};

	tools.daily = function (el) {
		var persist = CT.persist('daily', true);
		var data = persist.load(null) || { date: new Date().toISOString().slice(0, 10), start: '08', end: '20', step: '60', slots: {}, top: ['', '', ''], notes: '' };
		var dateF = ui.field({ label: __('Fecha'), type: 'date', value: data.date });
		var startF = ui.field({ label: __('Desde'), type: 'select', value: data.start, options: Array.from({ length: 24 }, function (_, i) { return { value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') + ':00' }; }) });
		var endF = ui.field({ label: __('Hasta'), type: 'select', value: data.end, options: Array.from({ length: 24 }, function (_, i) { return { value: String(i + 1).padStart(2, '0'), label: String(i + 1).padStart(2, '0') + ':00' }; }) });
		var stepF = ui.field({ label: __('Intervalo'), type: 'select', value: data.step, options: [{ value: '30', label: '30 min' }, { value: '60', label: '1 h' }] });
		var sheet = h('div', { class: 'ct-panel' });
		var save = function () { persist.save(data); };
		var render = function () {
			data.date = dateF.input.value; data.start = startF.input.value; data.end = endF.input.value; data.step = stepF.input.value;
			sheet.innerHTML = '';
			sheet.appendChild(h('h3', { class: 'ct-panel__title', style: { fontSize: '1.1rem', textTransform: 'capitalize' }, text: data.date ? new Date(data.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '' }));
			sheet.appendChild(h('p', { class: 'ct-label', text: __('Las 3 prioridades del día') }));
			data.top.forEach(function (t, i) { var inp = h('input', { class: 'ct-input', value: t, 'aria-label': __('Prioridad') + ' ' + (i + 1), placeholder: (i + 1) + '.' }); inp.addEventListener('input', function () { data.top[i] = inp.value; save(); }); sheet.appendChild(h('div', { style: { marginBottom: '6px' } }, inp)); });
			var rows = [];
			for (var m = parseInt(data.start, 10) * 60; m < parseInt(data.end, 10) * 60; m += parseInt(data.step, 10)) {
				(function (min) {
					var key = String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
					var inp = h('input', { class: 'ct-input', value: data.slots[key] || '', 'aria-label': key });
					inp.addEventListener('input', function () { data.slots[key] = inp.value; save(); });
					rows.push([key, inp]);
				})(m);
			}
			sheet.appendChild(h('div', { style: { marginTop: '12px' } }, ui.table([__('Hora'), __('Actividad')], rows, { wrap: true })));
			var notes = h('textarea', { class: 'ct-input', rows: 4, 'aria-label': __('Notas') }); notes.value = data.notes || '';
			notes.addEventListener('input', function () { data.notes = notes.value; save(); });
			sheet.appendChild(h('p', { class: 'ct-label', style: { marginTop: '12px' }, text: __('Notas') }));
			sheet.appendChild(notes);
			save();
		};
		el.appendChild(ui.persistToggle(persist, function () { return data; }, function () { data.slots = {}; data.top = ['', '', '']; data.notes = ''; render(); }));
		el.appendChild(h('div', { class: 'ct-cols ct-no-print' }, dateF.el, startF.el, endF.el, stepF.el));
		el.appendChild(ui.actions(ui.button(__('Imprimir'), { icon: 'printer', onClick: function () { CT.printArea(sheet); } }), ui.button(__('Vaciar actividades'), { icon: 'eraser', variant: 'ghost', onClick: function () { data.slots = {}; render(); } })));
		el.appendChild(sheet);
		[dateF, startF, endF, stepF].forEach(function (f) { f.input.addEventListener('change', render); });
		render();
	};

	tools.weekly = function (el) {
		var persist = CT.persist('weekly', true);
		var days = [__('Lunes'), __('Martes'), __('Miércoles'), __('Jueves'), __('Viernes'), __('Sábado'), __('Domingo')];
		var data = persist.load(null) || { title: __('Semana'), cells: {} };
		var title = ui.field({ label: __('Título'), value: data.title });
		var sheet = h('div', { class: 'ct-panel' });
		var save = function () { persist.save(data); };
		var render = function () {
			sheet.innerHTML = '';
			sheet.appendChild(h('h3', { class: 'ct-panel__title', style: { fontSize: '1.1rem' }, text: data.title }));
			var grid = h('div', { class: 'ct-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' } });
			days.forEach(function (d, i) {
				var ta = h('textarea', { class: 'ct-input', rows: 7, 'aria-label': d }); ta.value = data.cells[i] || '';
				ta.addEventListener('input', function () { data.cells[i] = ta.value; save(); });
				grid.appendChild(h('div', null, h('p', { class: 'ct-label', text: d }), ta));
			});
			sheet.appendChild(grid);
		};
		title.input.addEventListener('input', function () { data.title = title.input.value; save(); sheet.querySelector('h3').textContent = data.title; });
		el.appendChild(ui.persistToggle(persist, function () { return data; }, function () { data.cells = {}; render(); }));
		el.appendChild(h('div', { class: 'ct-cols ct-no-print' }, title.el));
		el.appendChild(ui.actions(ui.button(__('Imprimir'), { icon: 'printer', onClick: function () { CT.printArea(sheet); } })));
		el.appendChild(sheet);
		render();
	};

	tools.matrix = function (el) {
		var persist = CT.persist('matrix', true);
		var Q = [['q1', __('Urgente e importante'), __('Hazlo ahora')], ['q2', __('Importante, no urgente'), __('Planifícalo')], ['q3', __('Urgente, no importante'), __('Delégalo si puedes')], ['q4', __('Ni urgente ni importante'), __('Elimínalo o déjalo para después')]];
		var data = persist.load(null) || { q1: [], q2: [], q3: [], q4: [] };
		var text = ui.field({ label: __('Tarea'), value: '' });
		var quad = ui.field({ label: __('Cuadrante'), type: 'select', value: 'q1', options: Q.map(function (q) { return { value: q[0], label: q[1] }; }) });
		var grid = h('div', { class: 'ct-matrix' });
		var save = function () { persist.save(data); };
		var render = function () {
			grid.innerHTML = '';
			Q.forEach(function (q, qi) {
				var cell = h('div', { class: 'ct-matrix__cell' }, h('h3', { text: q[1] }), h('p', { class: 'ct-help', text: q[2] }));
				var ul = h('ul', { class: 'ct-list-items' });
				data[q[0]].forEach(function (t, i) {
					ul.appendChild(h('li', { class: 'ct-list-item' }, h('span', { class: 'ct-list-item__text', text: t }),
						h('select', { class: 'ct-input ct-input--sm ct-no-print', 'aria-label': __('Mover') + ' ' + t, onchange: function (e) { var to = e.target.value; if (to === q[0]) { return; } data[q[0]].splice(i, 1); data[to].push(t); save(); render(); } }, Q.map(function (o) { var op = h('option', { value: o[0], text: o[1] }); if (o[0] === q[0]) { op.selected = true; } return op; })),
						ui.button('', { icon: 'trash-2', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon ct-no-print', aria: __('Eliminar') + ' ' + t, onClick: function () { data[q[0]].splice(i, 1); save(); render(); } })));
				});
				cell.appendChild(ul);
				grid.appendChild(cell);
				void qi;
			});
		};
		var add = function () { var t = text.input.value.trim(); if (!t) { return; } data[quad.input.value].push(t.slice(0, 200)); text.input.value = ''; save(); render(); CT.track('done'); };
		text.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
		el.appendChild(ui.persistToggle(persist, function () { return data; }, function () { data = { q1: [], q2: [], q3: [], q4: [] }; render(); }));
		el.appendChild(h('div', { class: 'ct-row ct-no-print', style: { alignItems: 'flex-end' } }, text.el, quad.el, h('div', { class: 'ct-field' }, ui.button(__('Añadir'), { variant: 'primary', icon: 'plus', onClick: add }))));
		el.appendChild(grid);
		el.appendChild(ui.actions(ui.button(__('Imprimir'), { icon: 'printer', variant: 'ghost', onClick: function () { CT.printArea(grid); } })));
		render();
	};

	tools.tracker = function (el) {
		var persist = CT.persist('tracker', true);
		var data = persist.load(null) || { tasks: [] };
		var name = ui.field({ label: __('Tarea o proyecto'), value: '' });
		var box = h('div');
		var save = function () { persist.save(data); };
		var running = function (t) { return t.start ? Date.now() - t.start : 0; };
		var total = function (t) { return t.ms + running(t); };
		var fmt = function (ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
		var render = function () {
			box.innerHTML = '';
			if (!data.tasks.length) { box.appendChild(h('p', { class: 'ct-help', text: __('Añade una tarea y pulsa ▶ para empezar a contar.') })); return; }
			var sum = data.tasks.reduce(function (a, t) { return a + total(t); }, 0);
			box.appendChild(ui.resultCard({ label: __('Tiempo total'), main: fmt(sum), stats: [[__('Horas decimales'), N(sum / 3600000, 2) + ' h']] }));
			box.appendChild(ui.table([__('Tarea'), __('Tiempo'), '%', ''], data.tasks.map(function (t, i) {
				var timeEl = h('span', { class: 'ct-mono', 'data-ti': String(i), text: fmt(total(t)) });
				return [t.name, timeEl, sum ? CT.fmt.percent(total(t) / sum * 100, 0) : '—', h('span', { class: 'ct-row', style: { flexWrap: 'nowrap' } },
					ui.button('', { icon: t.start ? 'pause' : 'play', size: 'sm', variant: t.start ? 'primary' : 'secondary', cls: 'ct-btn--icon', aria: (t.start ? __('Pausar') : __('Iniciar')) + ' ' + t.name, onClick: function () { var wasRunning = !!t.start; data.tasks.forEach(function (o) { if (o.start) { o.ms += running(o); o.start = null; } }); if (!wasRunning) { t.start = Date.now(); } save(); render(); } }),
					ui.button('', { icon: 'plus', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Añadir 15 minutos a') + ' ' + t.name, onClick: function () { t.ms += 15 * 60000; save(); render(); } }),
					ui.button('', { icon: 'trash-2', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Eliminar') + ' ' + t.name, onClick: function () { data.tasks.splice(i, 1); save(); render(); } }))];
			}), { caption: __('Tiempo por tarea') }));
			box.appendChild(ui.actions(ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () { CT.download('﻿' + CT.csv.stringify([[__('Tarea'), __('Minutos'), __('Horas')]].concat(data.tasks.map(function (t) { return [t.name, Math.round(total(t) / 60000), (total(t) / 3600000).toFixed(2).replace('.', ',')]; })), ';'), 'tiempo-tareas.csv', 'text/csv;charset=utf-8'); } })));
		};
		var add = function () { var n = name.input.value.trim(); if (!n) { return; } data.tasks.push({ name: n.slice(0, 120), ms: 0, start: null }); name.input.value = ''; save(); render(); };
		name.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
		el.appendChild(ui.persistToggle(persist, function () { return data; }, function () { data.tasks = []; render(); }));
		el.appendChild(h('div', { class: 'ct-row', style: { alignItems: 'flex-end' } }, name.el, h('div', { class: 'ct-field' }, ui.button(__('Añadir tarea'), { variant: 'primary', icon: 'plus', onClick: add }))));
		el.appendChild(box);
		render();
		var int = setInterval(function () { CT.$$('[data-ti]', box).forEach(function (s) { var t = data.tasks[+s.getAttribute('data-ti')]; if (t && t.start) { s.textContent = fmt(total(t)); } }); }, 1000);
		window.addEventListener('pagehide', function () { clearInterval(int); });
	};

	tools.pomodoro = function (el) {
		var persist = CT.persist('pomodoro', true);
		var cfg = persist.load(null) || { work: 25, short: 5, long: 15, every: 4, done: 0 };
		var work = ui.field({ label: __('Concentración'), type: 'number', integer: true, unit: 'min', value: cfg.work });
		var short = ui.field({ label: __('Descanso corto'), type: 'number', integer: true, unit: 'min', value: cfg.short });
		var long = ui.field({ label: __('Descanso largo'), type: 'number', integer: true, unit: 'min', value: cfg.long });
		var every = ui.field({ label: __('Descanso largo cada'), type: 'number', integer: true, unit: __('pomodoros'), value: cfg.every });
		var phase = 'work', left = cfg.work * 60000, endAt = null, int = null, base = document.title;
		var label = h('p', { class: 'ct-result__label ct-center' });
		var display = h('p', { class: 'ct-big-display', role: 'timer' });
		var count = h('p', { class: 'ct-center ct-help', 'aria-live': 'polite' });
		var names = { work: __('Concentración'), short: __('Descanso corto'), long: __('Descanso largo') };
		var minutes = function (p) { return Math.max(1, (p === 'work' ? work.get() : p === 'short' ? short.get() : long.get()) || 1); };
		var show = function () { var s = Math.ceil(left / 1000); display.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); label.textContent = names[phase]; count.textContent = CT.sprintf(__('Pomodoros completados hoy: %d'), cfg.done); if (int) { document.title = display.textContent + ' · ' + names[phase]; } };
		var save = function () { cfg.work = work.get() || 25; cfg.short = short.get() || 5; cfg.long = long.get() || 15; cfg.every = every.get() || 4; persist.save(cfg); };
		var next = function () {
			if (CT.beep) { CT.beep(); }
			if (phase === 'work') { cfg.done++; phase = cfg.done % (every.get() || 4) === 0 ? 'long' : 'short'; } else { phase = 'work'; }
			save();
			left = minutes(phase) * 60000;
			if (window.Notification && Notification.permission === 'granted') { try { new Notification(names[phase]); } catch (e) { /* ignorado */ } }
			endAt = Date.now() + left;
		};
		var tick = function () { left = endAt - Date.now(); if (left <= 0) { next(); } show(); };
		var startBtn = ui.button(__('Iniciar'), { variant: 'primary', icon: 'play', onClick: function () {
			if (int) { clearInterval(int); int = null; left = endAt - Date.now(); startBtn.querySelector('span').textContent = __('Continuar'); document.title = base; return; }
			endAt = Date.now() + left; int = setInterval(tick, 250); startBtn.querySelector('span').textContent = __('Pausar');
		} });
		var reset = ui.button(__('Reiniciar'), { icon: 'refresh-ccw', onClick: function () { clearInterval(int); int = null; phase = 'work'; left = minutes('work') * 60000; startBtn.querySelector('span').textContent = __('Iniciar'); document.title = base; show(); } });
		var skip = ui.button(__('Saltar fase'), { icon: 'chevron-right', variant: 'ghost', onClick: function () { endAt = Date.now(); if (!int) { next(); show(); } } });
		[work, short, long, every].forEach(function (f) { f.input.addEventListener('change', function () { save(); if (!int) { left = minutes(phase) * 60000; show(); } }); });
		if (new Date().toDateString() !== cfg.day) { cfg.done = 0; cfg.day = new Date().toDateString(); }
		el.appendChild(ui.persistToggle(persist, function () { return cfg; }, function () { cfg.done = 0; show(); }));
		el.appendChild(label); el.appendChild(display); el.appendChild(count);
		el.appendChild(h('div', { class: 'ct-actions', style: { justifyContent: 'center' } }, startBtn, reset, skip, window.Notification && Notification.permission === 'default' ? ui.button(__('Activar notificaciones'), { variant: 'ghost', icon: 'alarm-clock', onClick: function () { Notification.requestPermission(); } }) : null));
		el.appendChild(h('details', { class: 'ct-panel' }, h('summary', { class: 'ct-panel__title', style: { cursor: 'pointer' }, text: __('Ajustar duraciones') }), h('div', { class: 'ct-cols', style: { marginTop: '12px' } }, work.el, short.el, long.el, every.el)));
		show();
	};

	tools.tablegen = function (el) {
		var rowsF = ui.field({ label: __('Filas'), type: 'number', integer: true, value: 4 });
		var colsF = ui.field({ label: __('Columnas'), type: 'number', integer: true, value: 3 });
		var header = ui.field({ type: 'checkbox', label: __('La primera fila es de encabezados'), value: true });
		var data = [[__('Producto'), __('Cantidad'), __('Precio')], ['', '', ''], ['', '', ''], ['', '', '']];
		var grid = h('div', { class: 'ct-table-wrap' });
		var out = ui.output({ label: __('Resultado'), rows: 8, mono: true });
		var fmt = ui.seg({ label: __('Formato'), value: 'md', options: [{ value: 'md', label: 'Markdown' }, { value: 'html', label: 'HTML' }, { value: 'csv', label: 'CSV' }], onChange: function () { emit(); } });
		var resize = function () {
			var r = Math.max(1, Math.min(100, rowsF.get() || 1)), c = Math.max(1, Math.min(20, colsF.get() || 1));
			while (data.length < r) { data.push([]); } data.length = r;
			data.forEach(function (row) { while (row.length < c) { row.push(''); } row.length = c; });
			draw(); emit();
		};
		var draw = function () {
			grid.innerHTML = '';
			var t = h('table', { class: 'ct-table' }), tb = h('tbody');
			data.forEach(function (row, i) { tb.appendChild(h('tr', null, row.map(function (v, j) { var inp = h('input', { class: 'ct-input', value: v, 'aria-label': __('Fila') + ' ' + (i + 1) + ', ' + __('columna') + ' ' + (j + 1), style: i === 0 && header.input.checked ? { fontWeight: '700' } : null }); inp.addEventListener('input', function () { data[i][j] = inp.value; emit(); }); return h('td', null, inp); }))); });
			t.appendChild(tb); grid.appendChild(t);
		};
		var emit = function () {
			var hasH = header.input.checked, f = fmt.get();
			if (f === 'csv') { out.set(CT.csv.stringify(data, ';')); return; }
			if (f === 'html') {
				var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
				var lines = ['<table>'];
				data.forEach(function (row, i) { var tag = hasH && i === 0 ? 'th' : 'td'; lines.push('  <tr>' + row.map(function (v) { return '<' + tag + '>' + esc(v) + '</' + tag + '>'; }).join('') + '</tr>'); });
				lines.push('</table>'); out.set(lines.join('\n')); return;
			}
			var esc2 = function (s) { return String(s).replace(/\|/g, '\\|'); };
			var md = data.map(function (row) { return '| ' + row.map(esc2).join(' | ') + ' |'; });
			md.splice(1, 0, '| ' + data[0].map(function () { return '---'; }).join(' | ') + ' |');
			if (!hasH) { md.unshift('| ' + data[0].map(function (_, j) { return __('Columna') + ' ' + (j + 1); }).join(' | ') + ' |'); md.splice(1, 1); md.splice(1, 0, '| ' + data[0].map(function () { return '---'; }).join(' | ') + ' |'); }
			out.set(md.join('\n'));
		};
		el.appendChild(h('div', { class: 'ct-cols' }, rowsF.el, colsF.el));
		el.appendChild(header.el);
		el.appendChild(grid);
		el.appendChild(fmt.el);
		el.appendChild(out.el);
		[rowsF.input, colsF.input].forEach(function (i) { i.addEventListener('change', resize); });
		header.input.addEventListener('change', function () { draw(); emit(); });
		resize();
	};

	tools.printlist = function (el) {
		var title = ui.field({ label: __('Título'), value: __('Lista de tareas') });
		var items = ui.field({ label: __('Elementos (uno por línea)'), type: 'textarea', rows: 8, value: __('Revisar el correo') + '\n' + __('Preparar la reunión') + '\n' + __('Llamar a proveedores') });
		var style = ui.field({ label: __('Estilo'), type: 'select', value: 'check', options: [{ value: 'check', label: __('Casillas para marcar') }, { value: 'num', label: __('Numerada') }, { value: 'bullet', label: __('Viñetas') }, { value: 'lines', label: __('Con líneas para escribir') }] });
		var blank = ui.field({ label: __('Líneas en blanco extra'), type: 'number', integer: true, value: 3 });
		var preview = h('div', { class: 'ct-panel', style: { background: '#fff', color: '#111' } });
		var render = function () {
			preview.innerHTML = '';
			preview.appendChild(h('h2', { style: { color: '#111', fontSize: '1.4rem' }, text: title.input.value }));
			var list = items.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
			for (var b = 0; b < Math.min(50, Math.max(0, blank.get() || 0)); b++) { list.push(''); }
			var ol = h(style.input.value === 'num' ? 'ol' : 'ul', { style: { listStyle: style.input.value === 'check' || style.input.value === 'lines' ? 'none' : null, paddingLeft: style.input.value === 'check' || style.input.value === 'lines' ? '0' : '1.4em' } });
			list.forEach(function (t) {
				ol.appendChild(h('li', { style: { padding: '8px 0', borderBottom: style.input.value === 'lines' ? '1px solid #999' : '1px solid #eee', minHeight: '1.6em' } }, style.input.value === 'check' ? h('span', { style: { display: 'inline-block', width: '14px', height: '14px', border: '1.5px solid #333', borderRadius: '3px', marginRight: '10px', verticalAlign: '-2px' } }) : null, t));
			});
			preview.appendChild(ol);
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, h('div', null, title.el, items.el, h('div', { class: 'ct-cols' }, style.el, blank.el)), preview));
		el.appendChild(ui.actions(ui.button(__('Imprimir o guardar en PDF'), { variant: 'primary', icon: 'printer', onClick: function () { CT.printArea(preview); CT.track('done'); } })));
		[title.input, items.input, style.input, blank.input].forEach(function (i) { i.addEventListener('input', CT.debounce(render, 120)); i.addEventListener('change', render); });
		render();
	};

	tools.shifts = function (el) {
		var people = ui.field({ label: __('Personas (una por línea)'), type: 'textarea', rows: 5, value: 'Ana\nLuis\nMarta\nPedro' });
		var shiftsF = ui.field({ label: __('Turnos de cada día (separados por comas)'), value: __('Mañana, Tarde') });
		var start = ui.field({ label: __('Fecha de inicio'), type: 'date', value: new Date().toISOString().slice(0, 10) });
		var days = ui.field({ label: __('Número de días'), type: 'number', integer: true, value: 14 });
		var weekends = ui.field({ type: 'checkbox', label: __('Incluir fines de semana'), value: false });
		var noDouble = ui.field({ type: 'checkbox', label: __('Evitar dos turnos el mismo día para la misma persona'), value: true });
		var result = h('div');
		var run = function () {
			var ps = people.input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
			var sh = shiftsF.input.value.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
			var n = Math.max(1, Math.min(366, days.get() || 1));
			result.innerHTML = '';
			if (!ps.length || !sh.length) { result.appendChild(ui.alert('info', __('Indica al menos una persona y un turno.'))); return; }
			if (noDouble.input.checked && sh.length > ps.length) { result.appendChild(ui.alert('warn', __('Hay más turnos por día que personas: alguien tendrá que repetir.'))); }
			var count = {}; ps.forEach(function (p) { count[p] = 0; });
			var rows = [], d0 = new Date((start.input.value || new Date().toISOString().slice(0, 10)) + 'T12:00:00'), added = 0, offset = 0;
			while (added < n && offset < 1000) {
				var d = new Date(d0.getTime() + offset * 864e5); offset++;
				if (!weekends.input.checked && (d.getDay() === 0 || d.getDay() === 6)) { continue; }
				var used = {}, row = [d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })];
				sh.forEach(function () {
					var cand = ps.slice().sort(function (a, b) { return count[a] - count[b] || ps.indexOf(a) - ps.indexOf(b); });
					var pick = cand.filter(function (p) { return !noDouble.input.checked || !used[p]; })[0] || cand[0];
					used[pick] = true; count[pick]++; row.push(pick);
				});
				// Rotación para que no siempre caiga el mismo turno a la misma persona.
				ps.push(ps.shift());
				rows.push(row); added++;
			}
			result.appendChild(ui.table([__('Día')].concat(sh), rows, { tall: rows.length > 14, caption: __('Cuadrante de turnos') }));
			result.appendChild(ui.table([__('Persona'), __('Turnos asignados')], Object.keys(count).map(function (p) { return [p, String(count[p])]; }), { num: [1] }));
			result.appendChild(ui.actions(ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () { CT.download('﻿' + CT.csv.stringify([[__('Día')].concat(sh)].concat(rows), ';'), 'turnos.csv', 'text/csv;charset=utf-8'); } }), ui.button(__('Imprimir'), { icon: 'printer', size: 'sm', variant: 'ghost', onClick: function () { CT.printArea(result.firstChild); } })));
		};
		el.appendChild(h('div', { class: 'ct-cols ct-cols--2' }, people.el, h('div', null, shiftsF.el, h('div', { class: 'ct-cols' }, start.el, days.el))));
		el.appendChild(h('div', { class: 'ct-row' }, weekends.el, noDouble.el));
		el.appendChild(ui.actions(ui.button(__('Repartir turnos'), { variant: 'primary', icon: 'shuffle', onClick: function () { run(); CT.track('done'); } })));
		el.appendChild(h('p', { class: 'ct-help', text: __('Reparto equitativo y rotativo. Revisa siempre que cumple los descansos y condiciones de vuestro convenio.') }));
		el.appendChild(result);
		run();
	};

	CT.register('prod', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
