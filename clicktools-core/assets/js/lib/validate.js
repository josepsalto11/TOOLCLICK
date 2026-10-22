/*!
 * HerramientasClave — validación de identificadores: NIF/DNI, NIE, CIF (NIF de personas jurídicas)
 * e IBAN (con los dígitos de control españoles del CCC). Solo comprueba el formato y los dígitos de
 * control: no consulta ningún registro ni confirma que el número exista o esté a nombre de alguien.
 */
(function (root) {
	'use strict';

	var DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
	var CIF_LETTERS = 'JABCDEFGHI';
	// Tipo de entidad según la letra inicial del CIF (Orden EHA/451/2008).
	var CIF_TYPES = {
		A: 'Sociedad anónima', B: 'Sociedad de responsabilidad limitada', C: 'Sociedad colectiva', D: 'Sociedad comanditaria',
		E: 'Comunidad de bienes o herencia yacente', F: 'Sociedad cooperativa', G: 'Asociación o fundación', H: 'Comunidad de propietarios',
		J: 'Sociedad civil', N: 'Entidad extranjera', P: 'Corporación local', Q: 'Organismo público', R: 'Congregación o institución religiosa',
		S: 'Órgano de la Administración del Estado o de las comunidades autónomas', U: 'Unión temporal de empresas', V: 'Otro tipo de entidad', W: 'Establecimiento permanente de entidad no residente'
	};
	// Letras de CIF cuyo control es siempre una letra, o siempre un número.
	var CIF_LETTER_CONTROL = 'NPQRSW';
	var CIF_DIGIT_CONTROL = 'ABEH';

	function clean(v) { return String(v || '').toUpperCase().replace(/[\s.\-_/]/g, ''); }

	function dniLetter(num) { return DNI_LETTERS[parseInt(num, 10) % 23]; }

	/** Valida un NIF español. Devuelve { valid, type, value, detail, expected }. */
	function nif(input) {
		var v = clean(input);
		var out = { valid: false, type: '', value: v, detail: '', expected: '' };
		if (!v) { out.detail = 'vacío'; return out; }
		var m;
		if ((m = /^(\d{8})([A-Z])$/.exec(v))) {
			out.type = 'DNI';
			out.expected = m[1] + dniLetter(m[1]);
			out.valid = dniLetter(m[1]) === m[2];
			out.detail = out.valid ? '' : 'letra';
			return out;
		}
		if ((m = /^([XYZ])(\d{7})([A-Z])$/.exec(v))) {
			out.type = 'NIE';
			var n = 'XYZ'.indexOf(m[1]) + m[2];
			out.expected = m[1] + m[2] + dniLetter(n);
			out.valid = dniLetter(n) === m[3];
			out.detail = out.valid ? '' : 'letra';
			return out;
		}
		if ((m = /^([KLM])(\d{7})([A-Z])$/.exec(v))) {
			out.type = 'NIF especial (' + m[1] + ')';
			out.expected = m[1] + m[2] + dniLetter(m[2]);
			out.valid = dniLetter(m[2]) === m[3];
			out.detail = out.valid ? '' : 'letra';
			return out;
		}
		if ((m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(v))) {
			out.type = 'CIF';
			out.entity = CIF_TYPES[m[1]];
			var digits = m[2], sum = 0;
			for (var i = 0; i < 7; i++) {
				var d = parseInt(digits[i], 10);
				if (i % 2 === 0) { d *= 2; sum += Math.floor(d / 10) + (d % 10); } else { sum += d; }
			}
			var c = (10 - (sum % 10)) % 10;
			var asLetter = CIF_LETTERS[c], asDigit = String(c), given = m[3];
			var okLetter = given === asLetter, okDigit = given === asDigit;
			if (CIF_LETTER_CONTROL.indexOf(m[1]) >= 0) { out.valid = okLetter; out.expected = m[1] + digits + asLetter; }
			else if (CIF_DIGIT_CONTROL.indexOf(m[1]) >= 0) { out.valid = okDigit; out.expected = m[1] + digits + asDigit; }
			else { out.valid = okLetter || okDigit; out.expected = m[1] + digits + asDigit; }
			out.detail = out.valid ? '' : 'control';
			return out;
		}
		if (/^\d{1,7}[A-Z]$/.test(v)) {
			// DNI sin ceros a la izquierda.
			var padded = v.slice(0, -1).padStart(8, '0') + v.slice(-1);
			var r = nif(padded);
			r.value = padded; r.detail = r.valid ? 'ceros' : r.detail;
			return r;
		}
		out.detail = 'formato';
		return out;
	}

	// Longitud del IBAN por país (registro SWIFT, países SEPA y otros habituales).
	var IBAN_LENGTHS = {
		AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22,
		DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21,
		HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24,
		ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24,
		SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20
	};

	function mod97(str) {
		var r = 0;
		for (var i = 0; i < str.length; i++) { r = (r * 10 + parseInt(str[i], 10)) % 97; }
		return r;
	}

	function cccDigit(ten) {
		var w = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6], s = 0;
		for (var i = 0; i < 10; i++) { s += parseInt(ten[i], 10) * w[i]; }
		var d = 11 - (s % 11);
		return d === 11 ? 0 : d === 10 ? 1 : d;
	}

	/** Valida un IBAN. Devuelve { valid, value, formatted, country, detail, ccc? }. */
	function iban(input) {
		var v = clean(input);
		var out = { valid: false, value: v, formatted: v.replace(/(.{4})/g, '$1 ').trim(), country: v.slice(0, 2), detail: '' };
		if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) { out.detail = 'formato'; return out; }
		var len = IBAN_LENGTHS[out.country];
		if (!len) { out.detail = 'pais'; return out; }
		if (v.length !== len) { out.detail = 'longitud'; out.expectedLength = len; return out; }
		var moved = v.slice(4) + v.slice(0, 4);
		var numeric = moved.replace(/[A-Z]/g, function (ch) { return String(ch.charCodeAt(0) - 55); });
		if (mod97(numeric) !== 1) { out.detail = 'control'; return out; }
		if (out.country === 'ES') {
			var bban = v.slice(4);
			var bank = bban.slice(0, 4), branch = bban.slice(4, 8), dc = bban.slice(8, 10), account = bban.slice(10);
			var expected = String(cccDigit('00' + bank + branch)) + String(cccDigit(account));
			out.ccc = { bank: bank, branch: branch, dc: dc, account: account, dcValid: dc === expected };
			if (dc !== expected) { out.detail = 'ccc'; return out; }
		}
		out.valid = true;
		return out;
	}

	var api = { nif: nif, iban: iban, cifTypes: CIF_TYPES };
	if (root.ClickTools) { root.ClickTools.validate = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
