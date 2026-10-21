/*!
 * HerramientasClave — fechas, calendarios, horas, zonas horarias, temporizador y cronómetro.
 * Las fechas se calculan como días civiles (UTC) para evitar errores por cambios de hora.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var h = CT.h, ui = CT.ui, __ = CT.__, N = CT.fmt.number;
	var DAY = 86400000;
	var WEEKDAYS = [__('domingo'), __('lunes'), __('martes'), __('miércoles'), __('jueves'), __('viernes'), __('sábado')];

	/* ---------- Utilidades de fecha (exportadas para pruebas) ---------- */
	var D = CT.dates = {
		pad: function (n) { return String(n).padStart(2, '0'); },
		parse: function (s) {
			var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
			if (!m) { return null; }
			var y = +m[1], mo = +m[2], d = +m[3];
			var t = Date.UTC(y, mo - 1, d);
			var chk = new Date(t);
			if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== mo - 1 || chk.getUTCDate() !== d) { return null; }
			return t / DAY;
		},
		toDate: function (n) { return new Date(n * DAY); },
		iso: function (n) { var d = new Date(n * DAY); return d.getUTCFullYear() + '-' + D.pad(d.getUTCMonth() + 1) + '-' + D.pad(d.getUTCDate()); },
		today: function () { var t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAY; },
		weekday: function (n) { return new Date(n * DAY).getUTCDay(); },
		long: function (n) { return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(n * DAY)); },
		isLeap: function (y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; },
		addMonths: function (n, months) {
			var d = new Date(n * DAY);
			var y = d.getUTCFullYear(), m = d.getUTCMonth() + months, day = d.getUTCDate();
			var target = new Date(Date.UTC(y, m, 1));
			var last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
			return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last)) / DAY;
		},
		/** Diferencia en años, meses y días (de a hasta b, a <= b). */
		ymd: function (a, b) {
			var da = new Date(a * DAY), db = new Date(b * DAY);
			var y = db.getUTCFullYear() - da.getUTCFullYear();
			var m = db.getUTCMonth() - da.getUTCMonth();
			var d = db.getUTCDate() - da.getUTCDate();
			if (d < 0) { m--; d += new Date(Date.UTC(db.getUTCFullYear(), db.getUTCMonth(), 0)).getUTCDate(); }
			if (m < 0) { y--; m += 12; }
			return { y: y, m: m, d: d };
		},
		isoWeek: function (n) {
			var d = new Date(n * DAY);
			var day = d.getUTCDay() || 7;
			var thursday = n + 4 - day;
			var year = new Date(thursday * DAY).getUTCFullYear();
			var jan1 = Date.UTC(year, 0, 1) / DAY;
			return { week: Math.floor((thursday - jan1) / 7) + 1, year: year };
		},
		easter: function (y) {
			var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
			var g = Math.floor((b - f + 1) / 3), hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
			var l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
			var month = Math.floor((hh + l - 7 * m + 114) / 31), day = ((hh + l - 7 * m + 114) % 31) + 1;
			return Date.UTC(y, month - 1, day) / DAY;
		},
		/** Festivos nacionales habituales en España (orientativo: pueden trasladarse o variar por comunidad). */
		spainHolidays: function (y) {
			var f = function (m, d) { return Date.UTC(y, m - 1, d) / DAY; };
			return [f(1, 1), f(1, 6), D.easter(y) - 2, f(5, 1), f(8, 15), f(10, 12), f(11, 1), f(12, 6), f(12, 8), f(12, 25)];
		},
		countWorkdays: function (a, b, weekend, holidays) {
			var set = {}; (holidays || []).forEach(function (x) { set[x] = 1; });
			var count = 0, hol = 0;
			for (var n = a; n <= b; n++) {
				var wd = D.weekday(n);
				if (weekend[wd]) { continue; }
				if (set[n]) { hol++; continue; }
				count++;
			}
			return { work: count, holidays: hol };
		},
		addWorkdays: function (start, days, weekend, holidays) {
			var set = {}; (holidays || []).forEach(function (x) { set[x] = 1; });
			var n = start, step = days < 0 ? -1 : 1, left = Math.abs(days);
			while (left > 0) { n += step; if (!weekend[D.weekday(n)] && !set[n]) { left--; } }
			return n;
		},
		parseTime: function (s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); if (!m || +m[1] > 24 || +m[2] > 59) { return NaN; } return +m[1] * 60 + +m[2]; },
		hm: function (mins) { var sign = mins < 0 ? '−' : ''; mins = Math.abs(Math.round(mins)); return sign + Math.floor(mins / 60) + ' h ' + D.pad(mins % 60) + ' min'; },
		hhmm: function (mins) { var sign = mins < 0 ? '-' : ''; mins = Math.abs(Math.round(mins)); return sign + Math.floor(mins / 60) + ':' + D.pad(mins % 60); }
	};

	function todayIso() { return D.iso(D.today()); }
	function dateField(label, value) { return ui.field({ label: label, type: 'date', value: value || todayIso() }); }
	function needDate(f) {
		var n = D.parse(f.input.value);
		f.error(n === null ? __('Introduce una fecha válida.') : '');
		return n;
	}
	function holidaysField() {
		var f = ui.field({ label: __('Festivos a excluir (una fecha por línea, AAAA-MM-DD)'), type: 'textarea', rows: 4, mono: true, value: '', help: __('Opcional. Puedes cargar los festivos nacionales habituales y añadir los de tu comunidad y municipio.') });
		return f;
	}
	function parseHolidays(text) {
		return String(text || '').split(/[\s,;]+/).map(function (s) { return D.parse(s.trim()); }).filter(function (x) { return x !== null; });
	}
	function loadSpainButton(field, years) {
		return ui.button(__('Cargar festivos nacionales de España'), { icon: 'calendar-days', size: 'sm', onClick: function () {
			var list = [];
			years().forEach(function (y) { D.spainHolidays(y).forEach(function (n) { list.push(D.iso(n)); }); });
			field.input.value = list.join('\n');
			field.input.dispatchEvent(new Event('input'));
			CT.toast(__('Festivos cargados. Revísalos: son orientativos.'));
		} });
	}
	var HOLIDAY_NOTE = __('Los festivos nacionales cargados son los habituales (incluido Viernes Santo) y son orientativos: algunos se trasladan cada año y cada comunidad autónoma y municipio añade los suyos. Comprueba siempre el calendario laboral oficial publicado en el BOE y en tu boletín autonómico.');

	function weekendSelector() {
		var boxes = [6, 0].map(function (d) {
			var f = ui.field({ type: 'checkbox', label: CT.sprintf(__('Excluir los %s'), WEEKDAYS[d] + 's'), value: true });
			f.day = d;
			return f;
		});
		return { el: h('div', null, boxes.map(function (b) { return b.el; })), get: function () { var w = {}; boxes.forEach(function (b) { if (b.input.checked) { w[b.day] = true; } }); return w; }, inputs: boxes.map(function (b) { return b.input; }) };
	}

	function live(inputs, fn) {
		inputs.forEach(function (i) { i.addEventListener('input', fn); i.addEventListener('change', fn); });
		fn();
	}

	var tools = {};

	tools.diff = function (el) {
		var a = dateField(__('Fecha inicial')), b = dateField(__('Fecha final'), D.iso(D.today() + 30));
		var inc = ui.field({ type: 'checkbox', label: __('Incluir el día final en el recuento'), value: false });
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, a.el, b.el));
		el.appendChild(inc.el);
		el.appendChild(result.el);
		live([a.input, b.input, inc.input], function () {
			var x = needDate(a), y = needDate(b);
			if (x === null || y === null) { result.clear(); return; }
			var swap = y < x; if (swap) { var t = x; x = y; y = t; }
			var days = y - x + (inc.input.checked ? 1 : 0);
			var ymd = D.ymd(x, y + (inc.input.checked ? 1 : 0));
			var wd = D.countWorkdays(x, y - (inc.input.checked ? 0 : 1), { 0: true, 6: true }, []);
			result.set(ui.resultCard({
				label: swap ? __('Días entre las fechas (la final es anterior a la inicial)') : __('Días entre las fechas'),
				main: N(days) + ' ' + (days === 1 ? __('día') : __('días')),
				stats: [[__('Semanas'), N(Math.floor(days / 7)) + ' ' + __('sem.') + ' + ' + (days % 7) + ' ' + __('días')], [__('Años, meses y días'), ymd.y + ' a, ' + ymd.m + ' m, ' + ymd.d + ' d'], [__('Días laborables (lun.–vie.)'), N(wd.work)], [__('Horas'), N(days * 24)]],
				note: __('Los días laborables no descuentan festivos; para eso usa la calculadora de días laborables.'),
				copy: N(days) + ' ' + __('días')
			}));
		});
	};

	tools.add = function (el) {
		var a = dateField(__('Fecha de partida'));
		var op = ui.seg({ label: __('Operación'), value: 'add', options: [{ value: 'add', label: __('Sumar') }, { value: 'sub', label: __('Restar') }] });
		var amount = ui.field({ label: __('Cantidad'), type: 'number', value: 30, integer: true });
		var unit = ui.field({ label: __('Unidad'), type: 'select', value: 'd', options: [{ value: 'd', label: __('días naturales') }, { value: 'b', label: __('días laborables (lun.–vie.)') }, { value: 'w', label: __('semanas') }, { value: 'm', label: __('meses') }, { value: 'y', label: __('años') }] });
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, a.el, amount.el, unit.el));
		el.appendChild(op.el);
		el.appendChild(result.el);
		var run = function () {
			var x = needDate(a), q = amount.get();
			amount.error(isFinite(q) && Math.round(q) === q ? '' : __('Introduce un número entero.'));
			if (x === null || !isFinite(q) || Math.round(q) !== q) { result.clear(); return; }
			if (op.get() === 'sub') { q = -q; }
			var u = unit.input.value, r;
			if (u === 'd') { r = x + q; } else if (u === 'w') { r = x + q * 7; } else if (u === 'm') { r = D.addMonths(x, q); } else if (u === 'y') { r = D.addMonths(x, q * 12); } else { r = D.addWorkdays(x, q, { 0: true, 6: true }, []); }
			result.set(ui.resultCard({ label: __('Fecha resultante'), main: D.long(r), stats: [[__('Formato numérico'), new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC' }).format(D.toDate(r))], [__('Días de diferencia'), N(r - x)]], note: u === 'm' || u === 'y' ? __('Si el día no existe en el mes de destino (por ejemplo, 31 de febrero), se usa el último día de ese mes.') : '', copy: D.iso(r) }));
		};
		op.el.addEventListener('change', run);
		live([a.input, amount.input, unit.input], run);
	};

	tools.age = function (el) {
		var birth = dateField(__('Fecha de nacimiento'), '1990-05-15');
		var at = dateField(__('Calcular la edad a fecha de'));
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, birth.el, at.el));
		el.appendChild(result.el);
		live([birth.input, at.input], function () {
			var b = needDate(birth), t = needDate(at);
			if (b === null || t === null) { result.clear(); return; }
			if (t < b) { birth.error(__('La fecha de nacimiento es posterior a la fecha de cálculo.')); result.clear(); return; }
			var age = D.ymd(b, t);
			var bd = new Date(b * DAY);
			var ty = new Date(t * DAY).getUTCFullYear();
			var next = D.parse(ty + '-' + D.pad(bd.getUTCMonth() + 1) + '-' + D.pad(bd.getUTCDate()));
			if (next === null) { next = Date.UTC(ty, 2, 1) / DAY; } // 29 de febrero en año no bisiesto: 1 de marzo.
			if (next < t) { next = D.addMonths(b, (ty + 1 - bd.getUTCFullYear()) * 12); }
			if (next === t) { next = t; }
			result.set(ui.resultCard({
				label: __('Edad'), main: CT.sprintf(__('%1$d años, %2$d meses y %3$d días'), age.y, age.m, age.d),
				stats: [[__('Días vividos'), N(t - b)], [__('Semanas vividas'), N(Math.floor((t - b) / 7))], [__('Meses completos'), N(age.y * 12 + age.m)], [__('Próximo cumpleaños'), next === t ? __('¡Hoy!') : CT.sprintf(__('en %d días'), next - t)], [__('Día de nacimiento'), WEEKDAYS[D.weekday(b)]]],
				copy: age.y + ' ' + __('años')
			}));
		});
	};

	tools.until = function (el) {
		var ev = dateField(__('Fecha del evento'), D.iso(D.today() + 100));
		var from = dateField(__('Contar desde'));
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, ev.el, from.el));
		el.appendChild(result.el);
		live([ev.input, from.input], function () {
			var e = needDate(ev), f = needDate(from);
			if (e === null || f === null) { result.clear(); return; }
			var days = e - f;
			var wd = days > 0 ? D.countWorkdays(f + 1, e, { 0: true, 6: true }, []).work : 0;
			result.set(ui.resultCard({
				label: days >= 0 ? __('Faltan') : __('Han pasado'), main: N(Math.abs(days)) + ' ' + (Math.abs(days) === 1 ? __('día') : __('días')),
				stats: [[__('Semanas'), N(Math.abs(days) / 7, 1)], [__('Meses aprox.'), N(Math.abs(days) / 30.436875, 1)], [__('Días laborables (lun.–vie.)'), N(wd)], [__('El evento cae en'), WEEKDAYS[D.weekday(e)]]]
			}));
		});
	};

	tools.countdown = function (el) {
		var params = new URLSearchParams(window.location.search);
		var title = ui.field({ label: __('Nombre del evento (opcional)'), value: params.get('titulo') || '' });
		var dt = ui.field({ label: __('Fecha y hora'), type: 'datetime-local', value: params.get('fecha') || (D.iso(D.today() + 7) + 'T20:00') });
		var heading = h('p', { class: 'ct-result__label ct-center' });
		var display = h('p', { class: 'ct-big-display', 'aria-live': 'off' });
		var sr = h('p', { class: 'ct-sr', 'aria-live': 'polite' });
		var timer;
		el.appendChild(h('div', { class: 'ct-cols' }, title.el, dt.el));
		el.appendChild(h('div', { class: 'ct-result' }, heading, display, sr));
		el.appendChild(ui.actions(ui.button(__('Copiar enlace de esta cuenta atrás'), { icon: 'link', onClick: function () {
			var u = new URL(window.location.href.split('?')[0]);
			u.searchParams.set('fecha', dt.input.value);
			if (title.input.value) { u.searchParams.set('titulo', title.input.value); }
			CT.copy(u.toString());
		} })));
		var lastMinute = -1;
		var tick = function () {
			var target = new Date(dt.input.value);
			if (isNaN(target)) { display.textContent = '—'; return; }
			var diff = target - new Date();
			var past = diff < 0;
			diff = Math.abs(diff);
			var d = Math.floor(diff / DAY), hh = Math.floor(diff / 3600000) % 24, mm = Math.floor(diff / 60000) % 60, ss = Math.floor(diff / 1000) % 60;
			heading.textContent = (title.input.value ? title.input.value + ' · ' : '') + (past ? __('Tiempo transcurrido desde el evento') : __('Tiempo restante'));
			display.textContent = d + 'd ' + D.pad(hh) + ':' + D.pad(mm) + ':' + D.pad(ss);
			if (mm !== lastMinute) { lastMinute = mm; sr.textContent = CT.sprintf(__('%1$d días, %2$d horas y %3$d minutos'), d, hh, mm); }
		};
		[title.input, dt.input].forEach(function (i) { i.addEventListener('input', tick); });
		tick();
		timer = setInterval(tick, 1000);
		window.addEventListener('pagehide', function () { clearInterval(timer); });
	};

	tools.workdays = function (el) {
		var a = dateField(__('Fecha inicial')), b = dateField(__('Fecha final'), D.iso(D.today() + 60));
		var weekend = weekendSelector();
		var hol = holidaysField();
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, a.el, b.el));
		el.appendChild(weekend.el);
		el.appendChild(hol.el);
		el.appendChild(ui.actions(loadSpainButton(hol, function () {
			var x = D.parse(a.input.value), y = D.parse(b.input.value);
			if (x === null || y === null) { return [new Date().getFullYear()]; }
			var ys = []; for (var yy = D.toDate(Math.min(x, y)).getUTCFullYear(); yy <= D.toDate(Math.max(x, y)).getUTCFullYear() && ys.length < 10; yy++) { ys.push(yy); }
			return ys;
		})));
		el.appendChild(ui.alert('info', HOLIDAY_NOTE));
		el.appendChild(result.el);
		live([a.input, b.input, hol.input].concat(weekend.inputs), function () {
			var x = needDate(a), y = needDate(b);
			if (x === null || y === null) { result.clear(); return; }
			if (y < x) { b.error(__('La fecha final debe ser posterior a la inicial.')); result.clear(); return; }
			if (y - x > 36600) { b.error(__('El intervalo máximo es de 100 años.')); result.clear(); return; }
			var c = D.countWorkdays(x, y, weekend.get(), parseHolidays(hol.input.value));
			var total = y - x + 1;
			result.set(ui.resultCard({ label: __('Días laborables (ambas fechas incluidas)'), main: N(c.work), stats: [[__('Días naturales'), N(total)], [__('Días de fin de semana'), N(total - c.work - c.holidays)], [__('Festivos descontados'), N(c.holidays)]], copy: String(c.work) }));
		});
	};

	tools.deadline = function (el) {
		var a = dateField(__('Fecha de inicio (notificación o publicación)'));
		var days = ui.field({ label: __('Plazo'), type: 'number', value: 10, integer: true, unit: __('días'), min: 1 });
		var type = ui.field({ label: __('Tipo de días'), type: 'select', value: 'b', options: [{ value: 'b', label: __('Hábiles (excluye sábados, domingos y festivos)') }, { value: 'b5', label: __('Laborables (excluye domingos y festivos)') }, { value: 'n', label: __('Naturales') }] });
		var next = ui.field({ type: 'checkbox', label: __('Empezar a contar desde el día siguiente'), value: true });
		var hol = holidaysField();
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, a.el, days.el, type.el));
		el.appendChild(next.el);
		el.appendChild(hol.el);
		el.appendChild(ui.actions(loadSpainButton(hol, function () { var x = D.parse(a.input.value); var y0 = x === null ? new Date().getFullYear() : D.toDate(x).getUTCFullYear(); return [y0, y0 + 1]; })));
		el.appendChild(ui.alert('warn', __('Herramienta orientativa. El cómputo de plazos legales, administrativos o judiciales tiene reglas específicas (inicio, días inhábiles, agosto en plazos judiciales, vencimiento en día inhábil…). Confirma siempre el plazo con la normativa aplicable o un profesional.')));
		el.appendChild(result.el);
		live([a.input, days.input, type.input, next.input, hol.input], function () {
			var x = needDate(a), n = days.get();
			days.error(isFinite(n) && n >= 1 && Math.round(n) === n ? '' : __('Introduce un número entero de días.'));
			if (x === null || !isFinite(n) || n < 1 || Math.round(n) !== n) { result.clear(); return; }
			var holidays = parseHolidays(hol.input.value);
			var start = next.input.checked ? x : x - 1;
			var end;
			if (type.input.value === 'n') { end = start + n; }
			else { end = D.addWorkdays(start, n, type.input.value === 'b' ? { 0: true, 6: true } : { 0: true }, holidays); }
			result.set(ui.resultCard({ label: __('El plazo vence el'), main: D.long(end), stats: [[__('Días naturales transcurridos'), N(end - x)]], copy: D.iso(end) }));
		});
	};

	function monthTable(y, m, opts) {
		opts = opts || {};
		var first = Date.UTC(y, m, 1) / DAY;
		var days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
		var offset = (D.weekday(first) + 6) % 7;
		var hset = {}; (opts.holidays || []).forEach(function (x) { hset[x] = 1; });
		var today = D.today();
		var heads = [__('L'), __('M'), __('X'), __('J'), __('V'), __('S'), __('D')];
		var table = h('table', { class: 'ct-calendar' });
		table.appendChild(h('caption', { class: 'ct-sr', text: new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(first * DAY)) }));
		var hr = h('tr', null, opts.weeks ? h('th', { scope: 'col', text: __('Sem.') }) : null, heads.map(function (x) { return h('th', { scope: 'col', text: x }); }));
		table.appendChild(h('thead', null, hr));
		var tbody = h('tbody');
		var day = 1 - offset;
		while (day <= days) {
			var tr = h('tr');
			if (opts.weeks) { tr.appendChild(h('td', { class: 'is-week', text: String(D.isoWeek(first + Math.max(day, 1) - 1).week) })); }
			for (var i = 0; i < 7; i++, day++) {
				if (day < 1 || day > days) { tr.appendChild(h('td')); continue; }
				var n = first + day - 1;
				var cls = [];
				if (n === today) { cls.push('is-today'); }
				if (i >= 5) { cls.push('is-weekend'); }
				if (hset[n]) { cls.push('is-holiday'); }
				tr.appendChild(h('td', { class: cls.join(' ') || null, text: String(day), 'aria-current': n === today ? 'date' : null }));
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);
		return table;
	}

	tools.calendar = function (el) {
		var now = new Date();
		var y = now.getFullYear(), m = now.getMonth();
		var title = h('h3', { class: 'ct-panel__title', style: { textTransform: 'capitalize', fontSize: '1.2rem' } });
		var box = h('div');
		var holToggle = ui.field({ type: 'checkbox', label: __('Marcar festivos nacionales habituales de España (orientativo)'), value: false });
		var render = function () {
			title.textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1));
			box.innerHTML = '';
			box.appendChild(monthTable(y, m, { weeks: true, holidays: holToggle.input.checked ? D.spainHolidays(y) : [] }));
		};
		var go = function (delta) { m += delta; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } render(); };
		el.appendChild(h('div', { class: 'ct-row', style: { justifyContent: 'space-between' } },
			ui.button('', { icon: 'chevron-left', aria: __('Mes anterior'), cls: 'ct-btn--icon', onClick: function () { go(-1); } }),
			title,
			ui.button('', { icon: 'chevron-right', aria: __('Mes siguiente'), cls: 'ct-btn--icon', onClick: function () { go(1); } })));
		el.appendChild(box);
		el.appendChild(holToggle.el);
		el.appendChild(ui.actions(ui.button(__('Hoy'), { onClick: function () { y = now.getFullYear(); m = now.getMonth(); render(); } }), ui.button(__('Imprimir'), { icon: 'printer', onClick: function () { CT.printArea(box); } })));
		holToggle.input.addEventListener('change', render);
		render();
	};

	tools.printable = function (el) {
		var year = ui.field({ label: __('Año'), type: 'number', integer: true, value: new Date().getFullYear() });
		var weeks = ui.field({ type: 'checkbox', label: __('Mostrar número de semana'), value: true });
		var hol = ui.field({ type: 'checkbox', label: __('Marcar festivos nacionales habituales de España (orientativo)'), value: false });
		var box = h('div', { class: 'ct-cal-grid' });
		var wrap = h('div', null, h('h2', { class: 'ct-center', style: { fontSize: '1.4rem' } }), box);
		var render = function () {
			var y = year.get();
			year.error(isFinite(y) && y >= 1583 && y <= 9999 ? '' : __('Introduce un año entre 1583 y 9999.'));
			if (!(isFinite(y) && y >= 1583 && y <= 9999)) { return; }
			wrap.firstChild.textContent = String(y);
			box.innerHTML = '';
			for (var m = 0; m < 12; m++) {
				box.appendChild(h('div', null, h('h3', { text: new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1))) }), monthTable(y, m, { weeks: weeks.input.checked, holidays: hol.input.checked ? D.spainHolidays(y) : [] })));
			}
		};
		el.appendChild(h('div', { class: 'ct-cols' }, year.el));
		el.appendChild(weeks.el);
		el.appendChild(hol.el);
		el.appendChild(ui.actions(ui.button(__('Imprimir o guardar en PDF'), { variant: 'primary', icon: 'printer', onClick: function () { CT.printArea(wrap); CT.track('done'); } })));
		el.appendChild(wrap);
		live([year.input, weeks.input, hol.input], render);
	};

	tools.weekday = function (el) {
		var a = dateField(__('Fecha'));
		var result = ui.result();
		el.appendChild(a.el);
		el.appendChild(result.el);
		live([a.input], function () {
			var x = needDate(a);
			if (x === null) { result.clear(); return; }
			var w = D.isoWeek(x);
			var doy = x - Date.UTC(D.toDate(x).getUTCFullYear(), 0, 1) / DAY + 1;
			result.set(ui.resultCard({ label: D.long(x).replace(/^[^,]+, /, ''), main: WEEKDAYS[D.weekday(x)], stats: [[__('Semana ISO'), w.week + ' (' + w.year + ')'], [__('Día del año'), N(doy)]], copy: WEEKDAYS[D.weekday(x)] }));
		});
	};

	tools.week = function (el) {
		var a = dateField(__('Fecha'));
		var yr = ui.field({ label: __('O busca la semana número…'), type: 'number', integer: true, value: '', placeholder: '15' });
		var y2 = ui.field({ label: __('…del año'), type: 'number', integer: true, value: new Date().getFullYear() });
		var r1 = ui.result(), r2 = ui.result();
		el.appendChild(a.el);
		el.appendChild(r1.el);
		el.appendChild(h('div', { class: 'ct-cols', style: { marginTop: '20px' } }, yr.el, y2.el));
		el.appendChild(r2.el);
		live([a.input], function () {
			var x = needDate(a);
			if (x === null) { r1.clear(); return; }
			var w = D.isoWeek(x);
			var monday = x - ((D.weekday(x) + 6) % 7);
			r1.set(ui.resultCard({ label: __('Número de semana (ISO 8601)'), main: CT.sprintf(__('Semana %1$d de %2$d'), w.week, w.year), stats: [[__('Lunes'), D.long(monday)], [__('Domingo'), D.long(monday + 6)]], copy: String(w.week) }));
		});
		live([yr.input, y2.input], function () {
			var n = yr.get(), y = y2.get();
			if (!yr.input.value.trim()) { r2.clear(); return; }
			if (!isFinite(n) || n < 1 || n > 53 || !isFinite(y)) { yr.error(__('Introduce una semana entre 1 y 53.')); r2.clear(); return; }
			yr.error('');
			var jan4 = Date.UTC(y, 0, 4) / DAY;
			var mon1 = jan4 - ((D.weekday(jan4) + 6) % 7);
			var mon = mon1 + (n - 1) * 7;
			if (D.isoWeek(mon).year !== y) { yr.error(CT.sprintf(__('El año %d no tiene semana 53.'), y)); r2.clear(); return; }
			r2.set(ui.resultCard({ label: CT.sprintf(__('Semana %1$d de %2$d'), n, y), main: new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(D.toDate(mon)) + ' – ' + new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(D.toDate(mon + 6)) }));
		});
	};

	tools.leap = function (el) {
		var y = ui.field({ label: __('Año'), type: 'number', integer: true, value: new Date().getFullYear() });
		var result = ui.result();
		el.appendChild(y.el);
		el.appendChild(result.el);
		live([y.input], function () {
			var v = y.get();
			if (!isFinite(v) || Math.round(v) !== v || v < 1) { y.error(__('Introduce un año válido.')); result.clear(); return; }
			y.error('');
			var leap = D.isLeap(v);
			var next = [], prev = [];
			for (var k = v + 1; next.length < 5; k++) { if (D.isLeap(k)) { next.push(k); } }
			for (var j = v - 1; prev.length < 3 && j > 0; j--) { if (D.isLeap(j)) { prev.unshift(j); } }
			result.set(ui.resultCard({ label: String(v), main: leap ? __('Es bisiesto (366 días)') : __('No es bisiesto (365 días)'), stats: [[__('Próximos bisiestos'), next.join(', ')], [__('Anteriores'), prev.join(', ')]], formula: __('Bisiesto si es divisible entre 4, salvo los divisibles entre 100 que no lo son entre 400.'), note: v < 1583 ? __('Antes de 1582 se usaba el calendario juliano, con otra regla.') : '' }));
		});
	};

	tools.formats = function (el) {
		var dt = ui.field({ label: __('Fecha y hora'), type: 'datetime-local', value: D.iso(D.today()) + 'T09:30' });
		var result = ui.result();
		el.appendChild(dt.el);
		el.appendChild(result.el);
		live([dt.input], function () {
			var d = new Date(dt.input.value);
			if (isNaN(d)) { result.clear(); return; }
			var p = D.pad;
			var y = d.getFullYear(), mo = p(d.getMonth() + 1), da = p(d.getDate()), hh = p(d.getHours()), mi = p(d.getMinutes());
			var excel = (Date.UTC(y, d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / DAY + (d.getHours() * 60 + d.getMinutes()) / 1440;
			var rows = [
				[__('Español (DD/MM/AAAA)'), da + '/' + mo + '/' + y],
				[__('Español largo'), new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short' }).format(d)],
				['ISO 8601', d.toISOString()],
				[__('ISO 8601 (local, sin zona)'), y + '-' + mo + '-' + da + 'T' + hh + ':' + mi + ':00'],
				[__('EE. UU. (MM/DD/AAAA)'), mo + '/' + da + '/' + y],
				[__('Compacto (AAAAMMDD)'), '' + y + mo + da],
				['RFC 2822', d.toUTCString()],
				[__('Marca de tiempo Unix (s)'), String(Math.floor(d.getTime() / 1000))],
				[__('Marca de tiempo (ms)'), String(d.getTime())],
				[__('Número de serie de Excel'), CT.fmt.number(excel, 6)]
			];
			result.set(ui.table([__('Formato'), __('Valor')], rows.map(function (r) {
				return [r[0], h('span', { class: 'ct-row' }, h('code', { text: r[1] }), ui.button('', { icon: 'copy', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Copiar'), onClick: function () { CT.copy(r[1]); } }))];
			}), { wrap: true }));
		});
	};

	function timeField(label, value) { return ui.field({ label: label, type: 'time', value: value }); }
	function needTime(f) { var t = D.parseTime(f.input.value); f.error(isFinite(t) ? '' : __('Introduce una hora válida.')); return t; }

	tools.hours = function (el) {
		var a = timeField(__('Hora de inicio'), '08:30'), b = timeField(__('Hora de fin'), '17:15');
		var brk = ui.field({ label: __('Descanso'), type: 'number', unit: 'min', value: 45, integer: true, min: 0 });
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, a.el, b.el, brk.el));
		el.appendChild(result.el);
		live([a.input, b.input, brk.input], function () {
			var x = needTime(a), y = needTime(b), br = brk.get();
			if (!isFinite(x) || !isFinite(y)) { result.clear(); return; }
			if (!isFinite(br)) { br = 0; }
			var mins = y - x; var overnight = mins <= 0; if (overnight) { mins += 1440; }
			mins -= br;
			if (mins < 0) { brk.error(__('El descanso es mayor que el tiempo trabajado.')); result.clear(); return; }
			brk.error('');
			result.set(ui.resultCard({ label: __('Duración'), main: D.hm(mins), stats: [[__('En horas decimales'), N(mins / 60, 2) + ' h'], [__('En minutos'), N(mins)], [__('Formato hh:mm'), D.hhmm(mins)]], note: overnight ? __('La hora de fin es anterior a la de inicio: se ha considerado que termina al día siguiente.') : '', copy: D.hhmm(mins) }));
		});
	};

	tools.night = function (el) {
		var a = timeField(__('Inicio del turno'), '21:00'), b = timeField(__('Fin del turno'), '07:00');
		var na = timeField(__('Inicio del horario nocturno'), '22:00'), nb = timeField(__('Fin del horario nocturno'), '06:00');
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, a.el, b.el));
		el.appendChild(h('div', { class: 'ct-cols' }, na.el, nb.el));
		el.appendChild(h('p', { class: 'ct-help', text: __('En España el Estatuto de los Trabajadores considera trabajo nocturno el realizado entre las 22:00 y las 6:00; tu convenio puede establecer otra franja.') }));
		el.appendChild(result.el);
		live([a.input, b.input, na.input, nb.input], function () {
			var x = needTime(a), y = needTime(b), n1 = needTime(na), n2 = needTime(nb);
			if (![x, y, n1, n2].every(isFinite)) { result.clear(); return; }
			if (y <= x) { y += 1440; }
			var night = 0;
			for (var t = x; t < y; t++) {
				var m = t % 1440;
				var inNight = n1 < n2 ? (m >= n1 && m < n2) : (m >= n1 || m < n2);
				if (inNight) { night++; }
			}
			var total = y - x;
			result.set(ui.resultCard({ label: __('Horas nocturnas'), main: D.hm(night), stats: [[__('Duración total'), D.hm(total)], [__('Horas diurnas'), D.hm(total - night)], [__('Nocturnas en decimal'), N(night / 60, 2) + ' h']] }));
		});
	};

	tools.sumtime = function (el) {
		var f = ui.field({ label: __('Duraciones (una por línea: 2:30, 1h 15m, 45m o -0:30 para restar)'), type: 'textarea', mono: true, rows: 8, value: '7:45\n8:10\n6:30\n-0:15' });
		var result = ui.result();
		el.appendChild(f.el);
		el.appendChild(result.el);
		var parse = function (line) {
			var s = line.trim().toLowerCase(); if (!s) { return null; }
			var sign = 1; if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); } else if (s[0] === '+') { s = s.slice(1).trim(); }
			var m;
			if ((m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s))) { return sign * (+m[1] * 60 + +m[2] + (m[3] ? +m[3] / 60 : 0)); }
			if ((m = /^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/.exec(s)) && (m[1] || m[2])) { return sign * ((m[1] ? CT.parseNum(m[1]) * 60 : 0) + (m[2] ? +m[2] : 0)); }
			var n = CT.parseNum(s); if (isFinite(n)) { return sign * n * 60; }
			return NaN;
		};
		live([f.input], function () {
			var total = 0, count = 0, bad = [];
			f.input.value.split(/\n/).forEach(function (line, i) { var v = parse(line); if (v === null) { return; } if (!isFinite(v)) { bad.push(i + 1); } else { total += v; count++; } });
			f.error(bad.length ? CT.sprintf(__('No se entienden las líneas: %s'), bad.join(', ')) : '');
			if (!count) { result.clear(); return; }
			result.set(ui.resultCard({ label: CT.sprintf(__('Total de %d duraciones'), count), main: D.hhmm(total), stats: [[__('En horas decimales'), N(total / 60, 2)], [__('En minutos'), N(total, 1)], [__('Media'), D.hhmm(total / count)]], copy: D.hhmm(total) }));
		});
	};

	tools.timesheet = function (el) {
		var persist = CT.persist('timesheet', false);
		var days = [__('Lunes'), __('Martes'), __('Miércoles'), __('Jueves'), __('Viernes'), __('Sábado'), __('Domingo')];
		var saved = persist.load(null);
		var rows = days.map(function (d, i) {
			var s = saved && saved[i] ? saved[i] : (i < 5 ? ['09:00', '18:00', '60'] : ['', '', '']);
			return { name: d, a: h('input', { class: 'ct-input', type: 'time', value: s[0], 'aria-label': d + ' ' + __('entrada') }), b: h('input', { class: 'ct-input', type: 'time', value: s[1], 'aria-label': d + ' ' + __('salida') }), br: h('input', { class: 'ct-input', type: 'text', inputmode: 'numeric', value: s[2], 'aria-label': d + ' ' + __('descanso en minutos'), style: { maxWidth: '90px' } }), out: h('span', { class: 'ct-mono' }) };
		});
		var contract = ui.field({ label: __('Jornada semanal pactada'), type: 'number', unit: 'h', value: 40, min: 0 });
		var result = ui.result();
		var data = function () { return rows.map(function (r) { return [r.a.value, r.b.value, r.br.value]; }); };
		el.appendChild(ui.persistToggle(persist, data, function () { rows.forEach(function (r) { r.a.value = ''; r.b.value = ''; r.br.value = ''; }); run(); }));
		el.appendChild(ui.table([__('Día'), __('Entrada'), __('Salida'), __('Descanso (min)'), __('Horas')], rows.map(function (r) { return [r.name, r.a, r.b, r.br, r.out]; }), { caption: __('Horas trabajadas de la semana') }));
		el.appendChild(h('div', { class: 'ct-cols', style: { marginTop: '16px' } }, contract.el));
		el.appendChild(result.el);
		var run = function () {
			var total = 0;
			rows.forEach(function (r) {
				var x = D.parseTime(r.a.value), y = D.parseTime(r.b.value), br = CT.parseNum(r.br.value) || 0;
				if (!isFinite(x) || !isFinite(y)) { r.out.textContent = '—'; return; }
				var m = y - x; if (m <= 0) { m += 1440; } m = Math.max(0, m - br);
				total += m; r.out.textContent = D.hhmm(m);
			});
			persist.save(data());
			var c = contract.get();
			var stats = [[__('En horas decimales'), N(total / 60, 2) + ' h']];
			if (isFinite(c)) { var diff = total - c * 60; stats.push([diff >= 0 ? __('Horas por encima de la jornada') : __('Horas pendientes'), D.hhmm(Math.abs(diff)), diff > 0 ? 'bad' : '']); }
			result.set(ui.resultCard({ label: __('Total semanal'), main: D.hhmm(total), stats: stats, copy: D.hhmm(total) }));
		};
		rows.forEach(function (r) { [r.a, r.b, r.br].forEach(function (i) { i.addEventListener('input', run); }); });
		contract.input.addEventListener('input', run);
		run();
	};

	/* ---------- Temporizador y cronómetro ---------- */


	tools.timer = function (el) {
		var hh = ui.field({ label: __('Horas'), type: 'number', integer: true, value: 0, min: 0 });
		var mm = ui.field({ label: __('Minutos'), type: 'number', integer: true, value: 5, min: 0 });
		var ss = ui.field({ label: __('Segundos'), type: 'number', integer: true, value: 0, min: 0 });
		var display = h('p', { class: 'ct-big-display', role: 'timer', 'aria-live': 'off', text: '00:05:00' });
		var status = h('p', { class: 'ct-center ct-help', 'aria-live': 'assertive' });
		var endAt = null, remaining = 0, int = null, baseTitle = document.title;
		var show = function (ms) { var s = Math.ceil(ms / 1000); display.textContent = D.pad(Math.floor(s / 3600)) + ':' + D.pad(Math.floor(s / 60) % 60) + ':' + D.pad(s % 60); };
		var read = function () { return ((hh.get() || 0) * 3600 + (mm.get() || 0) * 60 + (ss.get() || 0)) * 1000; };
		var stop = function () { clearInterval(int); int = null; document.title = baseTitle; };
		var tick = function () {
			var left = endAt - Date.now();
			if (left <= 0) { stop(); remaining = 0; show(0); status.textContent = __('¡Tiempo cumplido!'); CT.beep(); CT.track('done'); if (window.Notification && Notification.permission === 'granted') { try { new Notification(__('Temporizador terminado')); } catch (e) { /* ignorado */ } } startBtn.querySelector('span').textContent = __('Iniciar'); return; }
			show(left); document.title = display.textContent + ' · ' + baseTitle;
		};
		var startBtn = ui.button(__('Iniciar'), { variant: 'primary', icon: 'play', onClick: function () {
			if (int) { remaining = endAt - Date.now(); stop(); startBtn.querySelector('span').textContent = __('Continuar'); status.textContent = __('En pausa'); return; }
			if (!remaining) { remaining = read(); }
			if (remaining <= 0) { status.textContent = __('Indica una duración mayor que cero.'); return; }
			endAt = Date.now() + remaining; status.textContent = ''; int = setInterval(tick, 250); tick();
			startBtn.querySelector('span').textContent = __('Pausar');
		} });
		var reset = ui.button(__('Reiniciar'), { icon: 'refresh-ccw', onClick: function () { stop(); remaining = 0; show(read()); status.textContent = ''; startBtn.querySelector('span').textContent = __('Iniciar'); } });
		var notify = window.Notification && Notification.permission === 'default' ? ui.button(__('Avisarme con una notificación'), { variant: 'ghost', icon: 'alarm-clock', onClick: function () { Notification.requestPermission(); } }) : null;
		[hh, mm, ss].forEach(function (f) { f.input.addEventListener('input', function () { if (!int) { remaining = 0; show(read()); } }); });
		el.appendChild(h('div', { class: 'ct-cols' }, hh.el, mm.el, ss.el));
		el.appendChild(display);
		el.appendChild(status);
		el.appendChild(h('div', { class: 'ct-actions', style: { justifyContent: 'center' } }, startBtn, reset, notify));
		el.appendChild(h('p', { class: 'ct-help ct-center', text: __('Mantén esta pestaña abierta: al terminar sonará un aviso.') }));
		show(read());
	};

	tools.stopwatch = function (el) {
		var display = h('p', { class: 'ct-big-display', role: 'timer', text: '00:00.00' });
		var start = 0, acc = 0, raf = null, laps = [];
		var lapBox = h('div');
		var fmt = function (ms) { var cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, hr = Math.floor(ms / 3600000); return (hr ? hr + ':' + D.pad(m) : D.pad(m)) + ':' + D.pad(s) + '.' + D.pad(cs); };
		var now = function () { return acc + (raf ? performance.now() - start : 0); };
		var loop = function () { display.textContent = fmt(now()); raf = requestAnimationFrame(loop); };
		var startBtn = ui.button(__('Iniciar'), { variant: 'primary', icon: 'play', onClick: function () {
			if (raf) { acc = now(); cancelAnimationFrame(raf); raf = null; startBtn.querySelector('span').textContent = __('Continuar'); display.textContent = fmt(acc); }
			else { start = performance.now(); raf = requestAnimationFrame(loop); startBtn.querySelector('span').textContent = __('Pausar'); }
		} });
		var renderLaps = function () {
			lapBox.innerHTML = '';
			if (!laps.length) { return; }
			lapBox.appendChild(ui.table([__('Vuelta'), __('Tiempo de vuelta'), __('Tiempo total')], laps.map(function (l, i) { return [String(i + 1), fmt(l[0]), fmt(l[1])]; }).reverse(), { num: [1, 2] }));
			lapBox.appendChild(ui.actions(ui.button(__('Descargar CSV'), { icon: 'download', size: 'sm', onClick: function () { CT.download(CT.csv.stringify([[__('Vuelta'), __('Vuelta (ms)'), __('Total (ms)')]].concat(laps.map(function (l, i) { return [i + 1, Math.round(l[0]), Math.round(l[1])]; })), ';'), 'cronometro.csv', 'text/csv'); } })));
		};
		var lap = ui.button(__('Vuelta'), { icon: 'flag', onClick: function () { var t = now(); if (!t) { return; } var prev = laps.length ? laps[laps.length - 1][1] : 0; laps.push([t - prev, t]); renderLaps(); } });
		var reset = ui.button(__('Reiniciar'), { icon: 'refresh-ccw', onClick: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } acc = 0; laps = []; display.textContent = fmt(0); startBtn.querySelector('span').textContent = __('Iniciar'); renderLaps(); } });
		el.appendChild(display);
		el.appendChild(h('div', { class: 'ct-actions', style: { justifyContent: 'center' } }, startBtn, lap, reset));
		el.appendChild(h('p', { class: 'ct-help ct-center', text: __('Atajos: barra espaciadora para iniciar o pausar y «V» para marcar vuelta (con el foco fuera de campos de texto).') }));
		el.appendChild(lapBox);
		document.addEventListener('keydown', function (e) {
			if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) { return; }
			if (e.code === 'Space') { e.preventDefault(); startBtn.click(); }
			if (e.key === 'v' || e.key === 'V') { lap.click(); }
		});
	};

	/* ---------- Zonas horarias ---------- */
	function zones() {
		try { var list = Intl.supportedValuesOf('timeZone').slice(); if (list.indexOf('UTC') < 0) { list.push('UTC'); } return list; } catch (e) { return ['Europe/Madrid', 'Atlantic/Canary', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney', 'UTC']; }
	}
	function zoneLabel(z) { return z.replace(/_/g, ' ').replace(/\//g, ' / '); }
	function offsetMinutes(zone, date) {
		var parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
		var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
		var asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second);
		return Math.round((asUTC - date.getTime()) / 60000);
	}
	function fmtOffset(m) { var s = m < 0 ? '−' : '+'; m = Math.abs(m); return 'UTC' + s + D.pad(Math.floor(m / 60)) + ':' + D.pad(m % 60); }
	CT.dates.offsetMinutes = offsetMinutes;
	/** Convierte una fecha-hora local de una zona (AAAA-MM-DDThh:mm) a instante UTC. */
	function zonedToInstant(local, zone) {
		var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
		if (!m) { return null; }
		var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
		var off = offsetMinutes(zone, new Date(guess));
		var t = guess - off * 60000;
		var off2 = offsetMinutes(zone, new Date(t));
		return new Date(guess - off2 * 60000);
	}
	CT.dates.zonedToInstant = zonedToInstant;

	tools.worldclock = function (el) {
		var persist = CT.persist('worldclock', true);
		var list = persist.load(['Europe/Madrid', 'Atlantic/Canary', 'Europe/London', 'America/New_York', 'America/Mexico_City', 'America/Argentina/Buenos_Aires', 'Asia/Tokyo']);
		var all = zones();
		var sel = ui.field({ label: __('Añadir zona horaria o ciudad'), type: 'select', options: all.map(function (z) { return { value: z, label: zoneLabel(z) }; }), value: 'Europe/Paris' });
		var grid = h('div', { class: 'ct-grid ct-grid--tools' });
		var render = function () {
			grid.innerHTML = '';
			list.forEach(function (z, i) {
				var time = h('p', { class: 'ct-result__main ct-mono', style: { margin: 0 } });
				var meta = h('p', { class: 'ct-help' });
				var card = h('div', { class: 'ct-card' }, h('strong', { text: zoneLabel(z) }), time, meta, ui.button(__('Quitar'), { size: 'sm', variant: 'ghost', icon: 'x', onClick: function () { list.splice(i, 1); persist.save(list); render(); } }));
				card._z = z; card._t = time; card._m = meta;
				grid.appendChild(card);
			});
			tick();
		};
		var tick = function () {
			var now = new Date();
			CT.$$('.ct-card', grid).forEach(function (c) {
				c._t.textContent = new Intl.DateTimeFormat('es-ES', { timeZone: c._z, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
				c._m.textContent = new Intl.DateTimeFormat('es-ES', { timeZone: c._z, weekday: 'long', day: 'numeric', month: 'short' }).format(now) + ' · ' + fmtOffset(offsetMinutes(c._z, now));
			});
		};
		el.appendChild(ui.persistToggle(persist, function () { return list; }, function () { list = ['Europe/Madrid']; render(); }));
		el.appendChild(h('div', { class: 'ct-row', style: { alignItems: 'flex-end' } }, sel.el, h('div', { class: 'ct-field' }, ui.button(__('Añadir'), { variant: 'primary', icon: 'plus', onClick: function () { if (list.indexOf(sel.input.value) < 0) { list.push(sel.input.value); persist.save(list); render(); } } }))));
		el.appendChild(grid);
		render();
		var int = setInterval(tick, 1000);
		window.addEventListener('pagehide', function () { clearInterval(int); });
	};

	tools.tzdiff = function (el) {
		var all = zones().map(function (z) { return { value: z, label: zoneLabel(z) }; });
		var guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!all.some(function (o) { return o.value === guess; })) { guess = 'Europe/Madrid'; }
		var za = ui.field({ label: __('Zona de origen'), type: 'select', options: all, value: guess });
		var zb = ui.field({ label: __('Zona de destino'), type: 'select', options: all, value: 'America/New_York' });
		var now = new Date();
		var dt = ui.field({ label: __('Fecha y hora en la zona de origen'), type: 'datetime-local', value: D.iso(D.today()) + 'T' + D.pad(now.getHours()) + ':' + D.pad(now.getMinutes()) });
		var result = ui.result();
		el.appendChild(h('div', { class: 'ct-cols' }, za.el, zb.el, dt.el));
		el.appendChild(result.el);
		live([za.input, zb.input, dt.input], function () {
			if (!za.input.value || !zb.input.value) { result.clear(); return; }
			var inst = zonedToInstant(dt.input.value, za.input.value);
			if (!inst) { result.clear(); return; }
			var oa = offsetMinutes(za.input.value, inst), ob = offsetMinutes(zb.input.value, inst);
			var diff = ob - oa;
			result.set(ui.resultCard({
				label: CT.sprintf(__('Hora en %s'), zoneLabel(zb.input.value)),
				main: new Intl.DateTimeFormat('es-ES', { timeZone: zb.input.value, dateStyle: 'full', timeStyle: 'short' }).format(inst),
				stats: [[__('Diferencia horaria'), (diff === 0 ? __('sin diferencia') : (diff > 0 ? '+' : '−') + D.hhmm(Math.abs(diff)).replace(/^-/, '') + ' h')], [__('Origen'), fmtOffset(oa)], [__('Destino'), fmtOffset(ob)]],
				note: __('Se tienen en cuenta los cambios de horario de verano vigentes en la fecha indicada, según la base de datos de zonas horarias de tu navegador.')
			}));
		});
	};

	/* ---------- Recordatorios locales ---------- */
	tools.reminders = function (el) {
		var persist = CT.persist('reminders', false);
		var items = persist.load([]);
		var text = ui.field({ label: __('Recordatorio'), placeholder: __('Llamar al dentista'), value: '' });
		var when = ui.field({ label: __('Fecha y hora'), type: 'datetime-local', value: D.iso(D.today()) + 'T' + D.pad((new Date().getHours() + 1) % 24) + ':00' });
		var list = h('ul', { class: 'ct-list-items' });
		var supported = 'Notification' in window;
		var render = function () {
			list.innerHTML = '';
			items.sort(function (a, b) { return a.t - b.t; });
			if (!items.length) { list.appendChild(h('li', { class: 'ct-help', text: __('No hay recordatorios.') })); }
			items.forEach(function (it, i) {
				var past = it.t <= Date.now();
				list.appendChild(h('li', { class: 'ct-list-item' + (it.done ? ' is-done' : '') }, CT.iconEl(past ? 'check' : 'alarm-clock'), h('span', { class: 'ct-list-item__text', text: it.x + ' · ' + new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(it.t)) }),
					ui.button('', { icon: 'trash-2', size: 'sm', variant: 'ghost', cls: 'ct-btn--icon', aria: __('Eliminar'), onClick: function () { items.splice(i, 1); persist.save(items); render(); } })));
			});
		};
		var check = function () {
			var changed = false;
			items.forEach(function (it) {
				if (!it.done && it.t <= Date.now()) {
					it.done = true; changed = true;
					CT.beep();
					CT.toast(__('Recordatorio:') + ' ' + it.x);
					if (supported && Notification.permission === 'granted') { try { new Notification(it.x); } catch (e) { /* ignorado */ } }
				}
			});
			if (changed) { persist.save(items); render(); }
		};
		el.appendChild(ui.alert('warn', __('Los recordatorios solo funcionan mientras esta pestaña esté abierta y el dispositivo no esté suspendido. No sustituyen a la alarma o al calendario de tu móvil.')));
		el.appendChild(ui.persistToggle(persist, function () { return items; }, function () { items = []; render(); }));
		el.appendChild(h('div', { class: 'ct-cols' }, text.el, when.el));
		el.appendChild(ui.actions(
			ui.button(__('Añadir recordatorio'), { variant: 'primary', icon: 'plus', onClick: function () {
				var t = new Date(when.input.value).getTime();
				if (!text.input.value.trim()) { text.error(__('Escribe el texto del recordatorio.')); return; }
				text.error('');
				if (!isFinite(t) || t <= Date.now()) { when.error(__('Elige una fecha y hora futura.')); return; }
				when.error('');
				items.push({ x: text.input.value.trim().slice(0, 200), t: t, done: false });
				persist.save(items); text.input.value = ''; render(); CT.track('done');
			} }),
			supported && Notification.permission === 'default' ? ui.button(__('Permitir notificaciones'), { icon: 'alarm-clock', onClick: function () { Notification.requestPermission(); } }) : null
		));
		el.appendChild(list);
		render();
		var int = setInterval(check, 5000);
		window.addEventListener('pagehide', function () { clearInterval(int); });
	};

	CT.register('dates', {
		mount: function (el, tool) {
			var fn = tools[tool.key];
			if (!fn) { el.appendChild(ui.alert('err', __('Herramienta no encontrada.'))); return; }
			fn(el, tool);
		}
	});
})();
