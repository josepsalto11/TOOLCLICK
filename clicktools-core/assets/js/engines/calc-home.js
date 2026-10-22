/*!
 * HerramientasClave — calculadoras de hogar, energía, transporte, datos, multimedia y almacenamiento.
 * Los precios (kWh, agua, combustible) los introduce siempre el usuario.
 */
(function () {
	'use strict';

	var CT = window.ClickTools;
	var __ = CT.__, C = CT.calc, N = C.num, M = C.money, P = C.pct;
	var def = C.define;
	var z = function (x) { return isFinite(x) ? x : 0; };

	/* ---------- Energía y agua ---------- */
	def('electricidad', {
		fields: [
			{ name: 'watts', label: __('Potencia del aparato'), unit: 'W', value: 1500, positive: true, help: __('Aparece en la etiqueta o el manual (en vatios).') },
			{ name: 'hours', label: __('Horas de uso al día'), unit: 'h', value: 2, positive: true, max: 24 },
			{ name: 'days', label: __('Días de uso al mes'), value: 30, positive: true, max: 31, integer: true },
			{ name: 'price', label: __('Precio de la energía'), unit: '€/kWh', value: 0.15, positive: true, help: __('Consúltalo en tu factura; el precio cambia según tarifa y franja horaria.') },
			{ name: 'standby', label: __('Consumo en espera (opcional)'), unit: 'W', value: 0, min: 0, optional: true }
		],
		compute: function (v) {
			var kwhDay = v.watts * v.hours / 1000 + z(v.standby) * (24 - v.hours) / 1000;
			var kwhMonth = kwhDay * v.days;
			return {
				main: { label: __('Coste mensual'), value: M(kwhMonth * v.price) },
				stats: [[__('Consumo mensual'), N(kwhMonth, 2) + ' kWh'], [__('Coste por día de uso'), M(kwhDay * v.price)], [__('Coste por hora de uso'), M(v.watts / 1000 * v.price)], [__('Coste anual estimado'), M(kwhMonth * 12 * v.price)]],
				formula: 'kWh = W × h / 1000; ' + __('coste') + ' = kWh × €/kWh',
				note: __('Solo energía consumida. La factura incluye además potencia contratada, impuestos y alquiler del contador.')
			};
		}
	});

	def('agua', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Dato de consumo'), value: 'm3', full: true, options: [{ value: 'm3', label: __('Consumo en m³') }, { value: 'people', label: __('Por personas') }] },
			{ name: 'm3', label: __('Consumo del periodo'), unit: 'm³', value: 12, min: 0, showIf: function (v) { return v.mode === 'm3'; } },
			{ name: 'people', label: __('Personas en el hogar'), value: 3, positive: true, integer: true, showIf: function (v) { return v.mode === 'people'; } },
			{ name: 'lpd', label: __('Litros por persona y día'), unit: 'L', value: 130, positive: true, showIf: function (v) { return v.mode === 'people'; }, help: __('Valor orientativo editable; cada hogar es distinto.') },
			{ name: 'days', label: __('Días del periodo'), value: 60, positive: true, integer: true, showIf: function (v) { return v.mode === 'people'; } },
			{ name: 'price', label: __('Precio del agua'), unit: '€/m³', value: 1.9, min: 0, help: __('Incluye abastecimiento, alcantarillado y depuración si los ves por m³ en tu factura.') },
			{ name: 'fixed', label: __('Cuota fija del periodo (opcional)'), unit: '€', value: 0, min: 0, optional: true }
		],
		compute: function (v) {
			var m3 = v.mode === 'm3' ? v.m3 : v.people * v.lpd * v.days / 1000;
			var cost = m3 * v.price + z(v.fixed);
			return { main: { label: __('Coste aproximado'), value: M(cost) }, stats: [[__('Consumo'), N(m3, 2) + ' m³ (' + N(m3 * 1000, 0) + ' L)'], [__('Coste por m³ efectivo'), m3 ? M(cost / m3) : '—']], formula: __('coste') + ' = m³ × €/m³ + ' + __('cuota fija'), note: __('Muchas tarifas son por tramos; este cálculo usa un precio medio.') };
		}
	});

	/* ---------- Combustible y transporte ---------- */
	def('combustible', {
		fields: [
			{ name: 'km', label: __('Distancia'), unit: 'km', value: 350, positive: true },
			{ name: 'cons', label: __('Consumo medio'), unit: 'L/100 km', value: 6.5, positive: true },
			{ name: 'price', label: __('Precio del combustible'), unit: '€/L', value: 1.6, positive: true },
			{ name: 'round', type: 'checkbox', label: __('Ida y vuelta'), value: false }
		],
		compute: function (v) {
			var km = v.km * (v.round ? 2 : 1);
			var liters = km * v.cons / 100;
			return { main: { label: __('Coste del combustible'), value: M(liters * v.price) }, stats: [[__('Litros necesarios'), N(liters, 2) + ' L'], [__('Coste por km'), M(v.cons / 100 * v.price)], [__('Distancia total'), N(km) + ' km']], formula: 'L = km × L/100km / 100; ' + __('coste') + ' = L × €/L' };
		}
	});

	def('consumo-combustible', {
		fields: [
			{ name: 'liters', label: __('Litros repostados'), unit: 'L', value: 42, positive: true },
			{ name: 'km', label: __('Kilómetros recorridos'), unit: 'km', value: 650, positive: true },
			{ name: 'price', label: __('Precio pagado (opcional)'), unit: '€/L', value: 1.6, positive: true, optional: true }
		],
		compute: function (v) {
			var l100 = v.liters / v.km * 100;
			var stats = [[__('Kilómetros por litro'), N(v.km / v.liters, 2) + ' km/L'], [__('Millas por galón (EE. UU.)'), N(235.214583 / l100, 1) + ' mpg'], [__('Millas por galón (R. Unido)'), N(282.480936 / l100, 1) + ' mpg']];
			if (isFinite(v.price)) { stats.push([__('Coste cada 100 km'), M(l100 * v.price)]); }
			return { main: { label: __('Consumo medio'), value: N(l100, 2) + ' L/100 km' }, stats: stats, formula: 'L/100km = ' + __('litros') + ' / km × 100', note: __('Para mayor precisión, llena el depósito, pon el parcial a cero y vuelve a llenarlo al repostar.') };
		}
	});

	def('coste-viaje', {
		fields: [
			{ name: 'km', label: __('Distancia (solo ida)'), unit: 'km', value: 420, positive: true },
			{ name: 'round', type: 'checkbox', label: __('Ida y vuelta'), value: true },
			{ name: 'cons', label: __('Consumo medio'), unit: 'L/100 km', value: 6.2, positive: true, help: __('Para coches eléctricos, usa kWh/100 km y el precio por kWh.') },
			{ name: 'price', label: __('Precio del combustible'), unit: '€/L', value: 1.6, positive: true },
			{ name: 'tolls', label: __('Peajes (total)'), unit: '€', value: 0, min: 0, optional: true },
			{ name: 'parking', label: __('Aparcamiento y otros'), unit: '€', value: 15, min: 0, optional: true },
			{ name: 'people', label: __('Personas que comparten gastos'), value: 2, integer: true, min: 1 }
		],
		compute: function (v) {
			var km = v.km * (v.round ? 2 : 1);
			var fuel = km * v.cons / 100 * v.price;
			var total = fuel + z(v.tolls) + z(v.parking);
			return {
				main: { label: __('Coste total del viaje'), value: M(total) },
				stats: [[__('Por persona'), M(total / v.people)], [__('Combustible'), M(fuel)], [__('Peajes y otros'), M(z(v.tolls) + z(v.parking))], [__('Kilómetros'), N(km)]],
				formula: __('Total') + ' = km × ' + __('consumo') + ' / 100 × ' + __('precio') + ' + ' + __('peajes') + ' + ' + __('otros')
			};
		}
	});

	def('desplazamientos-mes', {
		fields: [
			{ name: 'km', label: __('Kilómetros por día (ida y vuelta)'), unit: 'km', value: 36, positive: true },
			{ name: 'days', label: __('Días por semana'), value: 5, positive: true, max: 7 },
			{ name: 'weeks', label: __('Semanas al mes'), value: 4.33, positive: true, help: __('4,33 semanas de media por mes.') },
			{ name: 'cons', label: __('Consumo'), unit: 'L/100 km', value: 6, positive: true },
			{ name: 'price', label: __('Precio del combustible'), unit: '€/L', value: 1.6, positive: true },
			{ name: 'other', label: __('Peajes y aparcamiento al mes'), unit: '€', value: 0, min: 0, optional: true },
			{ name: 'transit', label: __('Abono de transporte para comparar (opcional)'), unit: '€', value: 0, min: 0, optional: true }
		],
		compute: function (v) {
			var kmMonth = v.km * v.days * v.weeks;
			var cost = kmMonth * v.cons / 100 * v.price + z(v.other);
			var stats = [[__('Kilómetros al mes'), N(kmMonth, 0)], [__('Coste anual (11 meses)'), M(cost * 11)], [__('Coste por día'), M(cost / (v.days * v.weeks))]];
			if (z(v.transit) > 0) { stats.push([__('Diferencia con el abono'), M(cost - v.transit), cost > v.transit ? 'bad' : 'good']); }
			return { main: { label: __('Coste mensual de desplazamientos'), value: M(cost) }, stats: stats, formula: 'km/' + __('mes') + ' × ' + __('consumo') + ' / 100 × €/L + ' + __('otros'), note: __('Solo combustible y gastos directos; no incluye desgaste, seguro ni mantenimiento.') };
		}
	});

	def('coste-vehiculo', {
		fields: [
			{ name: 'price', label: __('Precio de compra'), unit: '€', value: 22000, min: 0 },
			{ name: 'resale', label: __('Valor de reventa estimado'), unit: '€', value: 9000, min: 0 },
			{ name: 'years', label: __('Años de uso'), value: 6, positive: true, max: 40 },
			{ name: 'km', label: __('Kilómetros al año'), value: 15000, positive: true },
			{ name: 'cons', label: __('Consumo'), unit: 'L/100 km', value: 6, positive: true },
			{ name: 'fuel', label: __('Precio del combustible'), unit: '€/L', value: 1.6, positive: true },
			{ name: 'insurance', label: __('Seguro al año'), unit: '€', value: 450, min: 0 },
			{ name: 'tax', label: __('Impuesto de circulación al año'), unit: '€', value: 100, min: 0, optional: true },
			{ name: 'maint', label: __('Mantenimiento y ITV al año'), unit: '€', value: 400, min: 0, optional: true },
			{ name: 'parking', label: __('Aparcamiento al año'), unit: '€', value: 0, min: 0, optional: true },
			{ name: 'interest', label: __('Intereses de financiación (total)'), unit: '€', value: 0, min: 0, optional: true }
		],
		compute: function (v) {
			var dep = (v.price - v.resale + z(v.interest)) / v.years;
			var fuel = v.km * v.cons / 100 * v.fuel;
			var fixed = v.insurance + z(v.tax) + z(v.maint) + z(v.parking);
			var annual = dep + fuel + fixed;
			return {
				main: { label: __('Coste total al año'), value: M(annual) },
				stats: [[__('Al mes'), M(annual / 12)], [__('Por kilómetro'), M(annual / v.km)], [__('Depreciación y financiación'), M(dep)], [__('Combustible'), M(fuel)], [__('Seguro, impuestos y mantenimiento'), M(fixed)], [__('Coste total del periodo'), M(annual * v.years)]],
				formula: __('Anual') + ' = (' + __('compra') + ' − ' + __('reventa') + ' + ' + __('intereses') + ') / ' + __('años') + ' + ' + __('combustible') + ' + ' + __('fijos')
			};
		}
	});

	/* ---------- Datos móviles ---------- */
	def('consumo-datos', {
		intro: __('Los consumos por hora son valores orientativos editables: dependen de la calidad elegida y de cada servicio.'),
		fields: [
			{ name: 'video', label: __('Vídeo en streaming (h/día)'), unit: 'h', value: 1, min: 0, max: 24 },
			{ name: 'videoRate', label: __('Consumo del vídeo'), unit: 'GB/h', value: 1.5, min: 0, help: __('Aproximado: 0,7 calidad estándar, 1,5–3 HD, 7 4K.') },
			{ name: 'music', label: __('Música en streaming (h/día)'), unit: 'h', value: 1, min: 0, max: 24 },
			{ name: 'musicRate', label: __('Consumo de la música'), unit: 'MB/h', value: 100, min: 0 },
			{ name: 'calls', label: __('Videollamadas (h/día)'), unit: 'h', value: 0.25, min: 0, max: 24 },
			{ name: 'callsRate', label: __('Consumo de las videollamadas'), unit: 'GB/h', value: 1, min: 0 },
			{ name: 'web', label: __('Redes sociales y web (h/día)'), unit: 'h', value: 1.5, min: 0, max: 24 },
			{ name: 'webRate', label: __('Consumo de redes y web'), unit: 'MB/h', value: 300, min: 0 },
			{ name: 'days', label: __('Días al mes'), value: 30, positive: true, max: 31 }
		],
		compute: function (v) {
			var dayGB = v.video * v.videoRate + v.music * v.musicRate / 1000 + v.calls * v.callsRate + v.web * v.webRate / 1000;
			var month = dayGB * v.days;
			return {
				main: { label: __('Consumo mensual estimado'), value: N(month, 1) + ' GB' },
				stats: [[__('Al día'), N(dayGB, 2) + ' GB'], [__('Vídeo'), N(v.video * v.videoRate * v.days, 1) + ' GB'], [__('Música'), N(v.music * v.musicRate / 1000 * v.days, 1) + ' GB'], [__('Videollamadas'), N(v.calls * v.callsRate * v.days, 1) + ' GB'], [__('Redes y web'), N(v.web * v.webRate / 1000 * v.days, 1) + ' GB']],
				formula: 'GB/' + __('mes') + ' = Σ(' + __('horas') + ' × ' + __('consumo por hora') + ') × ' + __('días'),
				note: __('Añade un margen del 20 % aproximadamente para actualizaciones y uso imprevisto.')
			};
		}
	});

	/* ---------- Multimedia ---------- */
	var SIZE_UNITS = [{ value: '1e6', label: 'MB' }, { value: '1e9', label: 'GB' }, { value: '1048576', label: 'MiB' }, { value: '1073741824', label: 'GiB' }];
	def('bitrate', {
		fields: [
			{ name: 'size', label: __('Tamaño del archivo'), value: 1.4, positive: true },
			{ name: 'unit', type: 'select', label: __('Unidad'), value: '1e9', options: SIZE_UNITS },
			{ name: 'hh', label: __('Horas'), value: 0, min: 0, integer: true },
			{ name: 'mm', label: __('Minutos'), value: 45, min: 0, max: 59, integer: true },
			{ name: 'ss', label: __('Segundos'), value: 0, min: 0, max: 59, integer: true }
		],
		compute: function (v) {
			var sec = v.hh * 3600 + v.mm * 60 + v.ss;
			if (sec <= 0) { throw C.err('mm', __('La duración debe ser mayor que cero.')); }
			var bits = v.size * parseFloat(v.unit) * 8;
			var kbps = bits / sec / 1000;
			return {
				main: { label: __('Bitrate medio total'), value: kbps >= 1000 ? N(kbps / 1000, 2) + ' Mbit/s' : N(kbps, 0) + ' kbit/s' },
				stats: [[__('En kbit/s'), N(kbps, 0)], [__('En MB por minuto'), N(bits / 8 / 1e6 / (sec / 60), 2) + ' MB/min'], [__('Duración'), CT.fmt.duration(sec)]],
				formula: 'bitrate = ' + __('tamaño en bits') + ' / ' + __('segundos'),
				note: __('Es el bitrate medio de vídeo y audio juntos, incluida la sobrecarga del contenedor.')
			};
		}
	});

	def('tamano-video', {
		fields: [
			{ name: 'hh', label: __('Horas'), value: 0, min: 0, integer: true },
			{ name: 'mm', label: __('Minutos'), value: 10, min: 0, max: 59, integer: true },
			{ name: 'ss', label: __('Segundos'), value: 0, min: 0, max: 59, integer: true },
			{ name: 'vbr', label: __('Bitrate de vídeo'), unit: 'Mbit/s', value: 8, min: 0 },
			{ name: 'abr', label: __('Bitrate de audio'), unit: 'kbit/s', value: 192, min: 0 },
			{ name: 'overhead', label: __('Sobrecarga del contenedor'), unit: '%', value: 1, min: 0, max: 20 }
		],
		compute: function (v) {
			var sec = v.hh * 3600 + v.mm * 60 + v.ss;
			if (sec <= 0) { throw C.err('mm', __('La duración debe ser mayor que cero.')); }
			var bytes = (v.vbr * 1e6 + v.abr * 1e3) * sec / 8 * (1 + v.overhead / 100);
			return {
				main: { label: __('Tamaño estimado'), value: CT.fmt.bytes(bytes) },
				stats: [[__('En sistema binario'), CT.fmt.bytes(bytes, true)], [__('Por minuto'), CT.fmt.bytes(bytes / sec * 60)], [__('Bitrate total'), N(v.vbr + v.abr / 1000, 3) + ' Mbit/s']],
				formula: __('bytes') + ' = (' + __('vídeo') + ' + ' + __('audio') + ') × ' + __('segundos') + ' / 8 × (1 + ' + __('sobrecarga') + ')'
			};
		}
	});

	/* ---------- Almacenamiento ---------- */
	var CAP_UNITS = [{ value: '1e9', label: 'GB' }, { value: '1e12', label: 'TB' }, { value: '1073741824', label: 'GiB' }, { value: '1099511627776', label: 'TiB' }];
	def('espacio-almacenamiento', {
		fields: [
			{ name: 'cap', label: __('Capacidad anunciada'), value: 1, positive: true },
			{ name: 'unit', type: 'select', label: __('Unidad'), value: '1e12', options: CAP_UNITS },
			{ name: 'used', label: __('Espacio ocupado'), value: 640, min: 0 },
			{ name: 'usedUnit', type: 'select', label: __('Unidad del ocupado'), value: '1e9', options: CAP_UNITS }
		],
		compute: function (v) {
			var cap = v.cap * parseFloat(v.unit), used = v.used * parseFloat(v.usedUnit);
			if (used > cap) { throw C.err('used', __('El espacio ocupado no puede superar la capacidad.')); }
			var free = cap - used;
			return {
				main: { label: __('Espacio libre'), value: CT.fmt.bytes(free) },
				stats: [[__('Libre (como lo muestra Windows)'), CT.fmt.bytes(free, true)], [__('Ocupado'), P(used / cap * 100, 1)], [__('Capacidad real en binario'), CT.fmt.bytes(cap, true)]],
				formula: __('libre') + ' = ' + __('capacidad') + ' − ' + __('ocupado'),
				note: __('Los fabricantes usan unidades decimales (1 TB = 10¹² bytes) y muchos sistemas operativos muestran binarias (1 TiB = 2⁴⁰ bytes): por eso un disco de 1 TB aparece como unos 931 «GB».')
			};
		}
	});

	def('archivos-capacidad', {
		fields: [
			{ name: 'cap', label: __('Capacidad disponible'), value: 64, positive: true },
			{ name: 'unit', type: 'select', label: __('Unidad'), value: '1e9', options: CAP_UNITS },
			{ name: 'file', label: __('Tamaño medio de cada archivo'), value: 4.5, positive: true },
			{ name: 'fileUnit', type: 'select', label: __('Unidad del archivo'), value: '1e6', options: [{ value: '1e3', label: 'KB' }, { value: '1e6', label: 'MB' }, { value: '1e9', label: 'GB' }] },
			{ name: 'reserve', label: __('Espacio reservado (sistema, formato)'), unit: '%', value: 5, min: 0, max: 90 }
		],
		compute: function (v) {
			var usable = v.cap * parseFloat(v.unit) * (1 - v.reserve / 100);
			var each = v.file * parseFloat(v.fileUnit);
			return { main: { label: __('Archivos que caben'), value: N(Math.floor(usable / each)) }, stats: [[__('Espacio útil'), CT.fmt.bytes(usable)]], formula: '⌊' + __('espacio útil') + ' / ' + __('tamaño medio') + '⌋' };
		}
	});

	def('almacenamiento-fotos', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Cálculo'), value: 'fit', full: true, options: [{ value: 'fit', label: __('Cuántas fotos caben') }, { value: 'need', label: __('Espacio para N fotos') }] },
			{ name: 'cap', label: __('Capacidad'), unit: 'GB', value: 128, positive: true, showIf: function (v) { return v.mode === 'fit'; } },
			{ name: 'count', label: __('Número de fotos'), value: 5000, positive: true, integer: true, showIf: function (v) { return v.mode === 'need'; } },
			{ name: 'size', label: __('Tamaño medio por foto'), unit: 'MB', value: 3.5, positive: true, help: __('Orientativo: móvil de 12 MP en JPEG/HEIF 2–5 MB; cámara de 24 MP en JPEG 8–12 MB; RAW de 24 MP 25–50 MB.') }
		],
		compute: function (v) {
			if (v.mode === 'fit') {
				return { main: { label: __('Fotos aproximadas'), value: N(Math.floor(v.cap * 1000 / v.size)) }, formula: 'GB × 1000 / MB' };
			}
			var bytes = v.count * v.size * 1e6;
			return { main: { label: __('Espacio necesario'), value: CT.fmt.bytes(bytes) }, stats: [[__('En binario'), CT.fmt.bytes(bytes, true)]], formula: __('fotos') + ' × MB' };
		}
	});

	def('almacenamiento-video', {
		fields: [
			{ name: 'mode', type: 'seg', label: __('Cálculo'), value: 'fit', full: true, options: [{ value: 'fit', label: __('Cuánto vídeo cabe') }, { value: 'need', label: __('Espacio para X horas') }] },
			{ name: 'preset', type: 'select', label: __('Calidad (bitrate orientativo)'), value: '16', options: [
				{ value: '5', label: '720p · 5 Mbit/s' }, { value: '10', label: '1080p · 10 Mbit/s' }, { value: '16', label: '1080p 60 fps · 16 Mbit/s' },
				{ value: '45', label: '4K · 45 Mbit/s' }, { value: '100', label: '4K 60 fps · 100 Mbit/s' }, { value: 'custom', label: __('Otro bitrate…') }
			] },
			{ name: 'custom', label: __('Bitrate'), unit: 'Mbit/s', value: 20, positive: true, showIf: function (v) { return v.preset === 'custom'; } },
			{ name: 'cap', label: __('Capacidad'), unit: 'GB', value: 256, positive: true, showIf: function (v) { return v.mode === 'fit'; } },
			{ name: 'hours', label: __('Horas de vídeo'), unit: 'h', value: 2, positive: true, showIf: function (v) { return v.mode === 'need'; } }
		],
		compute: function (v) {
			var mbps = v.preset === 'custom' ? v.custom : parseFloat(v.preset);
			var bytesPerHour = mbps * 1e6 * 3600 / 8;
			if (v.mode === 'fit') {
				var hours = v.cap * 1e9 / bytesPerHour;
				return { main: { label: __('Horas de vídeo aproximadas'), value: N(hours, 1) + ' h' }, stats: [[__('Por hora'), CT.fmt.bytes(bytesPerHour)], [__('Minutos'), N(hours * 60, 0)]], formula: 'GB / (Mbit/s × 3600 / 8)', note: __('El bitrate real depende de la cámara, el códec (H.264, HEVC) y el contenido.') };
			}
			return { main: { label: __('Espacio necesario'), value: CT.fmt.bytes(bytesPerHour * v.hours) }, stats: [[__('Por hora'), CT.fmt.bytes(bytesPerHour)]], formula: __('horas') + ' × Mbit/s × 3600 / 8' };
		}
	});

	def('almacenamiento-musica', {
		fields: [
			{ name: 'kbps', type: 'select', label: __('Calidad'), value: '256', options: [{ value: '128', label: 'MP3/AAC 128 kbit/s' }, { value: '192', label: '192 kbit/s' }, { value: '256', label: '256 kbit/s' }, { value: '320', label: '320 kbit/s' }, { value: '900', label: __('FLAC (≈ 900 kbit/s, orientativo)') }, { value: '1411', label: __('WAV calidad CD (1411 kbit/s)') }] },
			{ name: 'cap', label: __('Capacidad'), unit: 'GB', value: 32, positive: true },
			{ name: 'song', label: __('Duración media por canción'), unit: 'min', value: 3.5, positive: true }
		],
		compute: function (v) {
			var bytesPerMin = parseFloat(v.kbps) * 1000 * 60 / 8;
			var minutes = v.cap * 1e9 / bytesPerMin;
			return { main: { label: __('Canciones aproximadas'), value: N(Math.floor(minutes / v.song)) }, stats: [[__('Horas de música'), N(minutes / 60, 0) + ' h'], [__('Tamaño por canción'), CT.fmt.bytes(bytesPerMin * v.song)]], formula: 'GB / (kbit/s × 60 / 8 × ' + __('minutos por canción') + ')' };
		}
	});

	def('copia-seguridad', {
		fields: [
			{ name: 'data', label: __('Datos a copiar'), unit: 'GB', value: 500, positive: true },
			{ name: 'change', label: __('Datos que cambian por copia'), unit: '%', value: 2, min: 0, max: 100 },
			{ name: 'versions', label: __('Copias incrementales que conservas'), value: 30, min: 0, integer: true },
			{ name: 'fulls', label: __('Copias completas que conservas'), value: 2, min: 1, integer: true },
			{ name: 'compress', label: __('Ahorro por compresión/deduplicación'), unit: '%', value: 20, min: 0, max: 95 }
		],
		compute: function (v) {
			var factor = 1 - v.compress / 100;
			var full = v.data * factor;
			var inc = v.data * v.change / 100 * factor;
			var total = full * v.fulls + inc * v.versions;
			return {
				main: { label: __('Espacio estimado para las copias'), value: N(total, 1) + ' GB' },
				stats: [[__('Cada copia completa'), N(full, 1) + ' GB'], [__('Cada incremental'), N(inc, 2) + ' GB'], [__('Recomendado con margen (+20 %)'), N(total * 1.2, 0) + ' GB']],
				formula: __('completas') + ' × ' + __('datos') + ' × (1 − c) + ' + __('incrementales') + ' × ' + __('datos') + ' × ' + __('cambio') + ' × (1 − c)'
			};
		}
	});

	def('bytes', {
		fields: [
			{ name: 'value', label: __('Cantidad'), value: 1, min: 0 },
			{ name: 'unit', type: 'select', label: __('Unidad'), value: 'TB', options: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'bit', 'Kbit', 'Mbit', 'Gbit'].map(function (u) { return { value: u, label: u }; }) }
		],
		compute: function (v) {
			var mult = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15, KiB: 1024, MiB: Math.pow(1024, 2), GiB: Math.pow(1024, 3), TiB: Math.pow(1024, 4), PiB: Math.pow(1024, 5), bit: 1 / 8, Kbit: 125, Mbit: 125000, Gbit: 125000000 }[v.unit];
			var b = v.value * mult;
			var rows = [['bytes', N(b, 3)], ['KB (10³)', N(b / 1e3, 6)], ['MB (10⁶)', N(b / 1e6, 6)], ['GB (10⁹)', N(b / 1e9, 6)], ['TB (10¹²)', N(b / 1e12, 6)], ['KiB (2¹⁰)', N(b / 1024, 6)], ['MiB (2²⁰)', N(b / Math.pow(1024, 2), 6)], ['GiB (2³⁰)', N(b / Math.pow(1024, 3), 6)], ['TiB (2⁴⁰)', N(b / Math.pow(1024, 4), 6)], ['bits', N(b * 8, 3)]];
			return {
				main: { label: __('Tamaño legible'), value: CT.fmt.bytes(b) + ' · ' + CT.fmt.bytes(b, true) },
				table: { title: __('Equivalencias'), headers: [__('Unidad'), __('Valor')], rows: rows, num: [1] },
				formula: '1 KB = 1.000 B; 1 KiB = 1.024 B'
			};
		}
	});

	CT.register('calc-home', CT.engines.calc);
})();
