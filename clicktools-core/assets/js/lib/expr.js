/*!
 * ClickTools — analizador y evaluador seguro de expresiones matemáticas.
 * No usa eval ni Function: construye un árbol sintáctico y lo evalúa.
 * Soporta + − × ÷ ^ %, !, paréntesis, multiplicación implícita, constantes y funciones.
 */
(function (root) {
	'use strict';

	var FUNCS = {
		sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sinh: 1, cosh: 1, tanh: 1,
		sqrt: 1, cbrt: 1, ln: 1, log: 1, log2: 1, exp: 1, abs: 1, round: 1, floor: 1, ceil: 1,
		min: -1, max: -1, pow: 2, root: 2
	};
	var CONSTS = { pi: Math.PI, 'π': Math.PI, e: Math.E, tau: 2 * Math.PI };

	function ExprError(msg, pos) { this.message = msg; this.pos = pos; this.name = 'ExprError'; }

	function tokenize(src) {
		var s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt');
		var tokens = [], i = 0;
		while (i < s.length) {
			var c = s[i];
			if (/\s/.test(c)) { i++; continue; }
			if (/[0-9.]/.test(c)) {
				var m = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
				if (!m) { throw new ExprError('Número no válido', i); }
				tokens.push({ t: 'num', v: parseFloat(m[0]), p: i });
				i += m[0].length;
				continue;
			}
			if (/[a-zA-Zπ_]/.test(c)) {
				var w = /^[a-zA-Zπ_][a-zA-Z0-9_]*/.exec(s.slice(i))[0];
				tokens.push({ t: 'id', v: w.toLowerCase() === 'π' ? 'π' : w, p: i });
				i += w.length;
				continue;
			}
			if ('+-*/^%!(),'.indexOf(c) >= 0) { tokens.push({ t: 'op', v: c, p: i }); i++; continue; }
			throw new ExprError('Carácter no reconocido: «' + c + '»', i);
		}
		return tokens;
	}

	function parse(src, opts) {
		opts = opts || {};
		var tokens = tokenize(src), pos = 0;
		var peek = function () { return tokens[pos]; };
		var next = function () { return tokens[pos++]; };
		var isOp = function (t, v) { return t && t.t === 'op' && t.v === v; };

		function expr() {
			var node = term();
			while (isOp(peek(), '+') || isOp(peek(), '-')) {
				var op = next().v;
				node = { k: 'bin', op: op, a: node, b: term() };
			}
			return node;
		}
		function term() {
			var node = unary();
			for (;;) {
				var t = peek();
				if (isOp(t, '*') || isOp(t, '/')) { next(); node = { k: 'bin', op: t.v, a: node, b: unary() }; }
				else if (t && (t.t === 'num' || t.t === 'id' || isOp(t, '('))) { node = { k: 'bin', op: '*', a: node, b: unary() }; }
				else { break; }
			}
			return node;
		}
		function unary() {
			if (isOp(peek(), '-')) { next(); return { k: 'neg', a: unary() }; }
			if (isOp(peek(), '+')) { next(); return unary(); }
			return power();
		}
		function power() {
			var base = postfix();
			if (isOp(peek(), '^')) { next(); return { k: 'bin', op: '^', a: base, b: unary() }; }
			return base;
		}
		function postfix() {
			var node = primary();
			for (;;) {
				if (isOp(peek(), '!')) { next(); node = { k: 'fact', a: node }; }
				else if (isOp(peek(), '%')) { next(); node = { k: 'pct', a: node }; }
				else { break; }
			}
			return node;
		}
		function primary() {
			var t = next();
			if (!t) { throw new ExprError('La expresión está incompleta', src.length); }
			if (t.t === 'num') { return { k: 'num', v: t.v }; }
			if (isOp(t, '(')) {
				var e = expr();
				if (!isOp(next(), ')')) { throw new ExprError('Falta cerrar un paréntesis', t.p); }
				return e;
			}
			if (t.t === 'id') {
				var name = t.v;
				var lower = name.toLowerCase();
				if (isOp(peek(), '(') && FUNCS[lower] !== undefined) {
					next();
					var args = [];
					if (!isOp(peek(), ')')) {
						args.push(expr());
						while (isOp(peek(), ',')) { next(); args.push(expr()); }
					}
					if (!isOp(next(), ')')) { throw new ExprError('Falta cerrar el paréntesis de ' + name, t.p); }
					var arity = FUNCS[lower];
					if (arity > 0 && args.length !== arity) { throw new ExprError('La función ' + name + ' necesita ' + arity + ' argumento(s)', t.p); }
					if (!args.length) { throw new ExprError('La función ' + name + ' necesita argumentos', t.p); }
					return { k: 'fn', f: lower, args: args };
				}
				if (FUNCS[lower] !== undefined && !opts.vars) {
					// sin 30 → sin(30)
					return { k: 'fn', f: lower, args: [power()] };
				}
				if (CONSTS[lower] !== undefined || CONSTS[name] !== undefined) { return { k: 'num', v: CONSTS[lower] !== undefined ? CONSTS[lower] : CONSTS[name] }; }
				if (opts.vars && opts.vars.indexOf(name) >= 0) { return { k: 'var', v: name }; }
				throw new ExprError('Nombre desconocido: «' + name + '»', t.p);
			}
			throw new ExprError('Símbolo inesperado: «' + t.v + '»', t.p);
		}

		if (!tokens.length) { throw new ExprError('La expresión está vacía', 0); }
		var ast = expr();
		if (pos < tokens.length) { throw new ExprError('Símbolo inesperado: «' + tokens[pos].v + '»', tokens[pos].p); }
		return ast;
	}

	function factorial(n) {
		if (n < 0 || Math.round(n) !== n) { throw new ExprError('El factorial solo admite enteros no negativos'); }
		if (n > 170) { return Infinity; }
		var r = 1;
		for (var i = 2; i <= n; i++) { r *= i; }
		return r;
	}

	function evaluate(node, scope, opts) {
		opts = opts || {};
		var deg = opts.angle === 'deg';
		var toRad = function (x) { return deg ? x * Math.PI / 180 : x; };
		var fromRad = function (x) { return deg ? x * 180 / Math.PI : x; };
		var ev = function (n) {
			switch (n.k) {
				case 'num': return n.v;
				case 'var':
					if (!scope || !isFinite(scope[n.v])) { throw new ExprError('Falta el valor de «' + n.v + '»'); }
					return scope[n.v];
				case 'neg': return -ev(n.a);
				case 'pct': return ev(n.a) / 100;
				case 'fact': return factorial(ev(n.a));
				case 'bin':
					var a = ev(n.a), b = ev(n.b);
					switch (n.op) {
						case '+': return a + b;
						case '-': return a - b;
						case '*': return a * b;
						case '/':
							if (b === 0) { throw new ExprError('No se puede dividir entre cero'); }
							return a / b;
						case '^': return Math.pow(a, b);
					}
					break;
				case 'fn':
					var x = n.args.map(ev);
					switch (n.f) {
						case 'sin': return cleanTrig(Math.sin(toRad(x[0])));
						case 'cos': return cleanTrig(Math.cos(toRad(x[0])));
						case 'tan':
							if (deg && Math.abs((x[0] % 180 + 180) % 180 - 90) < 1e-12) { throw new ExprError('La tangente no está definida en ese ángulo'); }
							return cleanTrig(Math.tan(toRad(x[0])));
						case 'asin': return fromRad(Math.asin(x[0]));
						case 'acos': return fromRad(Math.acos(x[0]));
						case 'atan': return fromRad(Math.atan(x[0]));
						case 'sinh': return Math.sinh(x[0]);
						case 'cosh': return Math.cosh(x[0]);
						case 'tanh': return Math.tanh(x[0]);
						case 'sqrt':
							if (x[0] < 0) { throw new ExprError('No existe la raíz cuadrada real de un número negativo'); }
							return Math.sqrt(x[0]);
						case 'cbrt': return Math.cbrt(x[0]);
						case 'ln':
							if (x[0] <= 0) { throw new ExprError('El logaritmo solo admite números positivos'); }
							return Math.log(x[0]);
						case 'log':
							if (x[0] <= 0) { throw new ExprError('El logaritmo solo admite números positivos'); }
							return Math.log10(x[0]);
						case 'log2': return Math.log2(x[0]);
						case 'exp': return Math.exp(x[0]);
						case 'abs': return Math.abs(x[0]);
						case 'round': return Math.round(x[0]);
						case 'floor': return Math.floor(x[0]);
						case 'ceil': return Math.ceil(x[0]);
						case 'min': return Math.min.apply(null, x);
						case 'max': return Math.max.apply(null, x);
						case 'pow': return Math.pow(x[0], x[1]);
						case 'root': return Math.pow(x[0], 1 / x[1]);
					}
			}
			throw new ExprError('Expresión no válida');
		};
		var r = ev(node);
		if (typeof r !== 'number' || isNaN(r)) { throw new ExprError('El resultado no es un número real'); }
		if (!isFinite(r)) { throw new ExprError('El resultado es demasiado grande'); }
		return r;
	}

	function cleanTrig(v) { return Math.abs(v) < 1e-14 ? 0 : v; }

	/** Redondea a 12 cifras significativas para ocultar errores de coma flotante (0.1 + 0.2). */
	function tidy(r) { return parseFloat(r.toPrecision(12)); }

	var api = {
		parse: parse,
		evaluate: evaluate,
		calc: function (src, opts) { return tidy(evaluate(parse(src, opts), opts && opts.scope, opts)); },
		tidy: tidy,
		ExprError: ExprError
	};
	if (root.ClickTools) { root.ClickTools.expr = api; }
	if (typeof module !== 'undefined') { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
