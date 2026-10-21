/*!
 * HerramientasClave — núcleo común (todas las páginas).
 * Tema, menús, buscador, favoritos, historial opcional, catálogo, formularios,
 * consentimiento, analítica agregada opcional y montaje de herramientas.
 */
(function () {
	'use strict';

	var cfg = window.ClickToolsConfig || {};
	var i18n = (window.wp && window.wp.i18n) || null;
	var __ = i18n ? function (s) { return i18n.__(s, 'clicktools'); } : function (s) { return s; };
	var _n = i18n ? function (a, b, n) { return i18n._n(a, b, n, 'clicktools'); } : function (a, b, n) { return n === 1 ? a : b; };
	var sprintf = i18n ? i18n.sprintf : function (f) { var a = [].slice.call(arguments, 1); var i = 0; return f.replace(/%(\d+\$)?[sd]/g, function () { return a[i++]; }); };

	var CT = window.ClickTools = window.ClickTools || {};
	CT.cfg = cfg;
	CT.__ = __;
	CT._n = _n;
	CT.sprintf = sprintf;
	CT.engines = CT.engines || {};
	CT.register = function (name, engine) { CT.engines[name] = engine; };

	/* ---------- Utilidades ---------- */
	var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
	var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
	CT.$ = $;
	CT.$$ = $$;

	CT.store = {
		get: function (key, fallback) {
			try {
				var v = window.localStorage.getItem(key);
				return v === null ? fallback : JSON.parse(v);
			} catch (e) { return fallback; }
		},
		set: function (key, value) {
			try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
		},
		remove: function (key) {
			try { window.localStorage.removeItem(key); } catch (e) { /* sin almacenamiento */ }
		}
	};

	CT.escape = function (s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	};

	CT.normalize = function (s) {
		return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%+]+/g, ' ').trim();
	};

	CT.icon = function (name) { return (cfg.icons && cfg.icons[name]) || ''; };

	CT.toast = function (msg, type) {
		var region = $('[data-ct-toasts]');
		if (!region) { return; }
		var el = document.createElement('div');
		el.className = 'ct-toast' + (type === 'error' ? ' ct-toast--err' : '');
		el.innerHTML = CT.icon(type === 'error' ? 'triangle-alert' : 'check') + '<span></span>';
		el.lastChild.textContent = msg;
		region.appendChild(el);
		setTimeout(function () { el.remove(); }, 3200);
	};

	CT.copy = function (text) {
		var done = function () { CT.toast(__('Copiado al portapapeles')); return true; };
		if (navigator.clipboard && window.isSecureContext) {
			return navigator.clipboard.writeText(text).then(done, function () { return fallback(); });
		}
		return Promise.resolve(fallback());
		function fallback() {
			var ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			var ok = false;
			try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
			ta.remove();
			if (ok) { return done(); }
			CT.toast(__('No se ha podido copiar. Selecciona el texto y cópialo manualmente.'), 'error');
			return false;
		}
	};

	/* ---------- Analítica agregada opcional (sin cookies) ---------- */
	CT.track = function (event, detail, tool) {
		if (!cfg.analytics) { return; }
		if (cfg.analytics.respectDnt && (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true)) { return; }
		var slug = tool !== undefined ? tool : (cfg.tool ? cfg.tool.slug : '');
		var body = JSON.stringify({ e: event, t: slug, d: detail || '' });
		var url = cfg.rest + 'event';
		try {
			if (navigator.sendBeacon) {
				navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
			} else {
				fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
			}
		} catch (e) { /* nunca debe romper la herramienta */ }
	};

	/* ---------- Tema claro/oscuro ---------- */
	function currentTheme() {
		var attr = document.documentElement.getAttribute('data-theme');
		if (attr) { return attr; }
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	function initTheme() {
		$$('[data-ct-theme-toggle]').forEach(function (btn) {
			var update = function () {
				btn.setAttribute('aria-label', currentTheme() === 'dark' ? __('Cambiar a modo claro') : __('Cambiar a modo oscuro'));
			};
			update();
			btn.addEventListener('click', function () {
				var next = currentTheme() === 'dark' ? 'light' : 'dark';
				document.documentElement.setAttribute('data-theme', next);
				try { window.localStorage.setItem('ct-theme', next); } catch (e) { /* sin almacenamiento */ }
				update();
			});
		});
	}

	/* ---------- Menús ---------- */
	function initMenus() {
		var menuBtn = $('[data-ct-menu]');
		var drawer = $('#ct-drawer');
		if (menuBtn && drawer) {
			menuBtn.addEventListener('click', function () {
				var open = menuBtn.getAttribute('aria-expanded') === 'true';
				menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
				menuBtn.setAttribute('aria-label', open ? __('Abrir menú') : __('Cerrar menú'));
				drawer.hidden = open;
			});
		}
		$$('.ct-nav__toggle').forEach(function (btn) {
			var panel = document.getElementById(btn.getAttribute('aria-controls'));
			if (!panel) { return; }
			var close = function () { btn.setAttribute('aria-expanded', 'false'); panel.hidden = true; };
			btn.addEventListener('click', function (e) {
				e.stopPropagation();
				var open = btn.getAttribute('aria-expanded') === 'true';
				btn.setAttribute('aria-expanded', open ? 'false' : 'true');
				panel.hidden = open;
			});
			document.addEventListener('click', function (e) { if (!panel.contains(e.target)) { close(); } });
			document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
		});
		$$('details.ct-lang').forEach(function (d) {
			document.addEventListener('click', function (e) { if (!d.contains(e.target)) { d.removeAttribute('open'); } });
		});
	}

	/* ---------- Catálogo para búsqueda ---------- */
	var catalogPromise = null;
	CT.catalog = function () {
		if (cfg.catalog) { return Promise.resolve(cfg.catalog); }
		if (!catalogPromise) {
			catalogPromise = fetch(cfg.rest + 'catalog', { credentials: 'same-origin' })
				.then(function (r) { if (!r.ok) { throw new Error('catalog'); } return r.json(); })
				.then(function (d) { cfg.catalog = d.tools; cfg.toolIcons = d.icons || {}; cfg.popularity = d.popularity || {}; return d.tools; })
				.catch(function (e) { catalogPromise = null; throw e; });
		}
		return catalogPromise;
	};

	var STOP = { de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, un: 1, una: 1, en: 1, a: 1, para: 1, por: 1, con: 1, mi: 1, y: 1, o: 1, que: 1, como: 1, online: 1, gratis: 1, herramienta: 1 };
	var SYN = {
		reducir: ['comprimir', 'reducir', 'optimizar'], achicar: ['comprimir', 'reducir'], comprimir: ['comprimir', 'reducir', 'optimizar'],
		pasar: ['convertir', 'pasar'], transformar: ['convertir'], convertir: ['convertir', 'conversor'],
		juntar: ['unir', 'combinar'], combinar: ['unir', 'combinar'], fusionar: ['unir'], unir: ['unir', 'combinar'],
		separar: ['dividir', 'extraer'], partir: ['dividir'], cortar: ['recortar', 'dividir'],
		quitar: ['eliminar', 'quitar', 'borrar'], borrar: ['eliminar', 'borrar'],
		foto: ['imagen', 'foto'], fotos: ['imagen', 'imagenes', 'foto'], imagen: ['imagen', 'imagenes', 'foto'],
		jpeg: ['jpg'], jpg: ['jpg'], peso: ['tamano', 'peso', 'comprimir'],
		clave: ['contrasena', 'clave'], password: ['contrasena'], pass: ['contrasena'],
		cumpleanos: ['edad'], anos: ['edad', 'ano'], mayusculas: ['mayusculas'], hora: ['hora', 'horas', 'tiempo'],
		'%': ['porcentaje'], porciento: ['porcentaje'], impuesto: ['iva', 'impuesto'], hipoteca: ['prestamo', 'hipoteca'],
		gasolina: ['combustible', 'gasolina'], diesel: ['combustible'], luz: ['electricidad', 'electrico', 'luz'],
		qr: ['qr'], wifi: ['wifi'], texto: ['texto'], palabras: ['palabras'], firma: ['firma']
	};

	function prepare(tool) {
		if (!tool._n) {
			tool._n = CT.normalize(tool.n);
			tool._k = CT.normalize(tool.k + ' ' + tool.s.replace(/-/g, ' '));
			tool._d = CT.normalize(tool.d);
			tool._c = CT.normalize(tool.cn);
		}
		return tool;
	}

	function lev1(a, b) {
		if (Math.abs(a.length - b.length) > 1) { return false; }
		var i = 0, j = 0, edits = 0;
		while (i < a.length && j < b.length) {
			if (a[i] === b[j]) { i++; j++; continue; }
			if (++edits > 1) { return false; }
			if (a.length > b.length) { i++; } else if (a.length < b.length) { j++; } else { i++; j++; }
		}
		return edits + (a.length - i) + (b.length - j) <= 1;
	}

	CT.search = function (tools, query, limit) {
		var q = CT.normalize(query);
		if (!q) { return []; }
		var tokens = q.split(' ').filter(function (t) { return t && !STOP[t]; });
		if (!tokens.length) { tokens = q.split(' '); }
		var results = [];
		var scoreTool = function (tool, fuzzy) {
			prepare(tool);
			var total = 0;
			for (var i = 0; i < tokens.length; i++) {
				var alts = [tokens[i]].concat(SYN[tokens[i]] || []);
				var best = 0;
				for (var j = 0; j < alts.length; j++) {
					var t = alts[j];
					var s = 0;
					if (tool._n.indexOf(t) === 0) { s = 40; }
					else if ((' ' + tool._n).indexOf(' ' + t) >= 0) { s = 32; }
					else if (tool._n.indexOf(t) >= 0) { s = 20; }
					else if ((' ' + tool._k).indexOf(' ' + t) >= 0) { s = 16; }
					else if (tool._k.indexOf(t) >= 0) { s = 10; }
					else if (tool._c.indexOf(t) >= 0) { s = 8; }
					else if ((' ' + tool._d).indexOf(' ' + t) >= 0) { s = 6; }
					else if (fuzzy && t.length >= 4) {
						var words = (tool._n + ' ' + tool._k).split(' ');
						for (var w = 0; w < words.length; w++) { if (lev1(t, words[w])) { s = 12; break; } }
					}
					if (j > 0) { s = Math.round(s * 0.8); }
					if (s > best) { best = s; }
				}
				if (!best) { return 0; }
				total += best;
			}
			if (tool._n === q) { total += 50; }
			else if (tool._n.indexOf(q) >= 0) { total += 20; }
			return total + tool.r / 20 + (tool.f ? 2 : 0);
		};
		var collect = function (fuzzy) {
			tools.forEach(function (tool) {
				var s = scoreTool(tool, fuzzy);
				if (s > 0) { results.push({ tool: tool, score: s }); }
			});
		};
		collect(false);
		if (!results.length) { collect(true); }
		results.sort(function (a, b) { return b.score - a.score; });
		return results.slice(0, limit || 8).map(function (r) { return r.tool; });
	};

	function highlight(text, query) {
		var safe = CT.escape(text);
		var tokens = CT.normalize(query).split(' ').filter(function (t) { return t.length > 1 && !STOP[t]; });
		if (!tokens.length) { return safe; }
		var norm = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
		var marks = [];
		tokens.forEach(function (t) {
			var idx = norm.indexOf(t);
			if (idx >= 0) { marks.push([idx, idx + t.length]); }
		});
		if (!marks.length) { return safe; }
		marks.sort(function (a, b) { return a[0] - b[0]; });
		var out = '', pos = 0;
		marks.forEach(function (m) {
			if (m[0] < pos) { return; }
			out += CT.escape(text.slice(pos, m[0])) + '<mark>' + CT.escape(text.slice(m[0], m[1])) + '</mark>';
			pos = m[1];
		});
		return out + CT.escape(text.slice(pos));
	}

	var noResultTimer = null;
	function initSearch(form) {
		var input = $('.ct-search__input', form);
		var list = $('.ct-search__list', form);
		var status = $('[data-ct-search-status]', form);
		if (!input || !list) { return; }
		var items = [];
		var active = -1;
		var seq = 0;

		var close = function () {
			list.hidden = true;
			input.setAttribute('aria-expanded', 'false');
			input.removeAttribute('aria-activedescendant');
			active = -1;
		};
		var setActive = function (i) {
			var opts = $$('[role="option"]', list);
			opts.forEach(function (o, k) { o.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
			active = i;
			if (opts[i]) {
				input.setAttribute('aria-activedescendant', opts[i].id);
				opts[i].scrollIntoView({ block: 'nearest' });
			}
		};
		var render = function (query) {
			var my = ++seq;
			if (!CT.normalize(query)) {
				// Sin texto: muestra recientes/favoritos si existen, si no, populares.
				CT.catalog().then(function (tools) {
					if (my !== seq) { return; }
					var favs = CT.favorites.list();
					var picks = tools.filter(function (t) { return favs.indexOf(t.s) >= 0; }).slice(0, 5);
					var label = __('Tus favoritos');
					if (!picks.length) { picks = tools.filter(function (t) { return t.f; }).slice(0, 6); label = __('Populares'); }
					draw(picks, query, label);
				}).catch(function () {});
				return;
			}
			CT.catalog().then(function (tools) {
				if (my !== seq) { return; }
				var found = CT.search(tools, query, 8);
				draw(found, query, '');
				clearTimeout(noResultTimer);
				if (!found.length && CT.normalize(query).length >= 3) {
					noResultTimer = setTimeout(function () { CT.track('search_none', query, ''); }, 1500);
				}
			}).catch(function () {
				list.innerHTML = '<li class="ct-search__empty">' + CT.escape(__('No se ha podido cargar el buscador. Pulsa Buscar para ver el catálogo.')) + '</li>';
				list.hidden = false;
			});
		};
		var draw = function (found, query, label) {
			items = found;
			var base = input.id || 'ct-s';
			var html = label ? '<li class="ct-search__group" role="presentation">' + CT.escape(label) + '</li>' : '';
			if (!found.length) {
				html += '<li class="ct-search__empty" role="presentation">' + CT.escape(__('No hay herramientas que coincidan. Prueba con otras palabras o sugiérenos la herramienta.')) +
					(cfg.urls && cfg.urls.suggest ? ' <a href="' + CT.escape(cfg.urls.suggest) + '">' + CT.escape(__('Sugerir herramienta')) + '</a>' : '') + '</li>';
			}
			found.forEach(function (t, i) {
				html += '<li id="' + base + '-opt-' + i + '" role="option" aria-selected="false" class="ct-search__item" data-url="' + CT.escape(t.u) + '">' +
					'<span class="ct-search__item-icon" aria-hidden="true">' + (cfg.toolIcons && cfg.toolIcons[t.i] ? cfg.toolIcons[t.i] : CT.icon('chevron-right')) + '</span>' +
					'<span class="ct-search__item-text"><strong>' + highlight(t.n, query) + '</strong><small>' + CT.escape(t.cn) + ' · ' + CT.escape(t.d) + '</small></span></li>';
			});
			list.innerHTML = html;
			list.hidden = false;
			input.setAttribute('aria-expanded', 'true');
			active = -1;
			if (status) {
				status.textContent = found.length ? sprintf(_n('%d resultado disponible', '%d resultados disponibles', found.length), found.length) : __('Sin resultados');
			}
		};
		var go = function (i) {
			if (items[i]) { window.location.href = items[i].u; }
		};

		input.addEventListener('input', function () { render(input.value); });
		input.addEventListener('focus', function () { render(input.value); });
		input.addEventListener('keydown', function (e) {
			var count = items.length;
			if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { render(input.value); } else if (count) { setActive((active + 1) % count); } }
			else if (e.key === 'ArrowUp') { e.preventDefault(); if (count) { setActive(active <= 0 ? count - 1 : active - 1); } }
			else if (e.key === 'Enter') {
				if (active >= 0) { e.preventDefault(); go(active); }
				else if (items.length && CT.normalize(input.value)) { e.preventDefault(); go(0); }
			} else if (e.key === 'Escape') {
				if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
			}
		});
		list.addEventListener('mousedown', function (e) { e.preventDefault(); });
		list.addEventListener('click', function (e) {
			var li = e.target.closest('[role="option"]');
			if (li) { window.location.href = li.getAttribute('data-url'); }
		});
		input.addEventListener('blur', function () { setTimeout(close, 120); });
	}

	function initPalette() {
		var dlg = $('[data-ct-palette]');
		if (!dlg || typeof dlg.showModal !== 'function') {
			$$('[data-ct-open-search]').forEach(function (b) { b.addEventListener('click', function () { window.location.href = cfg.urls.catalog; }); });
			return;
		}
		var input = $('.ct-search__input', dlg);
		var open = function () {
			if (dlg.open) { return; }
			dlg.showModal();
			input.value = '';
			input.focus();
			input.dispatchEvent(new Event('input'));
		};
		$$('[data-ct-open-search]').forEach(function (b) { b.addEventListener('click', open); });
		dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
		document.addEventListener('keydown', function (e) {
			var tag = (e.target && e.target.tagName) || '';
			var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
			if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
			else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
		});
	}

	/* ---------- Favoritos e historial ---------- */
	CT.favorites = {
		list: function () { var v = CT.store.get('ct-favs', []); return Array.isArray(v) ? v : []; },
		has: function (slug) { return this.list().indexOf(slug) >= 0; },
		toggle: function (slug) {
			var l = this.list();
			var i = l.indexOf(slug);
			if (i >= 0) { l.splice(i, 1); } else { l.unshift(slug); }
			CT.store.set('ct-favs', l.slice(0, 100));
			return i < 0;
		},
		clear: function () { CT.store.remove('ct-favs'); }
	};
	CT.history = {
		enabled: function () { return CT.store.get('ct-history-on', false) === true; },
		enable: function (on) { if (on) { CT.store.set('ct-history-on', true); } else { CT.store.remove('ct-history-on'); CT.store.remove('ct-history'); } },
		list: function () { var v = CT.store.get('ct-history', []); return Array.isArray(v) ? v : []; },
		add: function (slug) {
			if (!this.enabled()) { return; }
			var l = this.list().filter(function (h) { return h.s !== slug; });
			l.unshift({ s: slug, t: Date.now() });
			CT.store.set('ct-history', l.slice(0, 50));
		},
		clear: function () { CT.store.remove('ct-history'); }
	};

	function initFavButtons() {
		$$('[data-ct-fav]').forEach(function (btn) {
			var slug = btn.getAttribute('data-ct-fav');
			var label = $('[data-ct-fav-label]', btn);
			var update = function () {
				var on = CT.favorites.has(slug);
				btn.setAttribute('aria-pressed', on ? 'true' : 'false');
				if (label) { label.textContent = on ? __('En favoritos') : __('Añadir a favoritos'); }
			};
			update();
			btn.addEventListener('click', function () {
				var added = CT.favorites.toggle(slug);
				update();
				CT.toast(added ? __('Añadida a favoritos') : __('Quitada de favoritos'));
			});
		});
		$$('[data-ct-copy-link]').forEach(function (btn) {
			btn.addEventListener('click', function () { CT.copy(btn.getAttribute('data-ct-copy-link')); });
		});
	}

	function cardHtml(t) {
		return '<article class="ct-card ct-card--tool"><span class="ct-card__icon" aria-hidden="true">' + (cfg.toolIcons && cfg.toolIcons[t.i] ? cfg.toolIcons[t.i] : CT.icon('star')) + '</span>' +
			'<h3 class="ct-card__title"><a class="ct-card__link" href="' + CT.escape(t.u) + '">' + CT.escape(t.n) + '</a></h3>' +
			'<p class="ct-card__desc">' + CT.escape(t.d) + '</p><p class="ct-card__meta"><span class="ct-chip">' + CT.escape(t.cn) + '</span></p></article>';
	}

	function initLists() {
		var fav = $('[data-ct-list="favorites"]');
		var hist = $('[data-ct-list="history"]');
		var empty = $('[data-ct-list-empty]');
		if (fav) {
			var drawFav = function () {
				CT.catalog().then(function (tools) {
					var map = {};
					tools.forEach(function (t) { map[t.s] = t; });
					var slugs = CT.favorites.list().filter(function (s) { return map[s]; });
					fav.innerHTML = slugs.map(function (s) { return cardHtml(map[s]); }).join('');
					empty.hidden = slugs.length > 0;
					var clear = $('[data-ct-clear="favorites"]');
					if (clear) { clear.hidden = !slugs.length; }
				});
			};
			drawFav();
			var clearBtn = $('[data-ct-clear="favorites"]');
			if (clearBtn) {
				clearBtn.addEventListener('click', function () {
					if (window.confirm(__('¿Seguro que quieres borrar todos tus favoritos de este navegador?'))) { CT.favorites.clear(); drawFav(); CT.toast(__('Favoritos borrados')); }
				});
			}
		}
		if (hist) {
			var toggle = $('[data-ct-history-toggle]');
			var drawHist = function () {
				CT.catalog().then(function (tools) {
					var map = {};
					tools.forEach(function (t) { map[t.s] = t; });
					var items = CT.history.list().filter(function (h) { return map[h.s]; });
					var fmt = new Intl.DateTimeFormat(cfg.locale || 'es-ES', { dateStyle: 'medium', timeStyle: 'short' });
					hist.innerHTML = items.map(function (h) {
						var t = map[h.s];
						return '<li>' + (cfg.toolIcons && cfg.toolIcons[t.i] ? cfg.toolIcons[t.i] : '') + '<a href="' + CT.escape(t.u) + '">' + CT.escape(t.n) + '</a><span class="ct-chip">' + CT.escape(t.cn) + '</span><time datetime="' + new Date(h.t).toISOString() + '">' + CT.escape(fmt.format(new Date(h.t))) + '</time></li>';
					}).join('');
					empty.hidden = items.length > 0;
				});
			};
			if (toggle) {
				toggle.checked = CT.history.enabled();
				toggle.addEventListener('change', function () {
					CT.history.enable(toggle.checked);
					CT.toast(toggle.checked ? __('Historial activado en este navegador') : __('Historial desactivado y borrado'));
					drawHist();
				});
			}
			var clearH = $('[data-ct-clear="history"]');
			if (clearH) { clearH.addEventListener('click', function () { CT.history.clear(); drawHist(); CT.toast(__('Historial borrado')); }); }
			drawHist();
		}
	}

	/* ---------- Ordenación y filtros de rejillas ---------- */
	function sortCards(grid, by) {
		var cards = $$('[data-ct-tool-card]', grid);
		var pop = cfg.popularity || {};
		cards.sort(function (a, b) {
			if (by === 'name') { return a.dataset.name.localeCompare(b.dataset.name, 'es'); }
			if (by === 'category') { return a.dataset.catname.localeCompare(b.dataset.catname, 'es') || a.dataset.name.localeCompare(b.dataset.name, 'es'); }
			if (by === 'popularity') { return (pop[b.dataset.ctToolCard] || 0) - (pop[a.dataset.ctToolCard] || 0) || (b.dataset.priority - a.dataset.priority); }
			return (b.dataset.priority - a.dataset.priority) || a.dataset.name.localeCompare(b.dataset.name, 'es');
		});
		cards.forEach(function (c) { grid.appendChild(c); });
	}
	function ensurePopularity() {
		if (cfg.popularity) { return Promise.resolve(); }
		return fetch(cfg.rest + 'catalog').then(function (r) { return r.json(); }).then(function (d) { cfg.popularity = d.popularity || {}; }).catch(function () { cfg.popularity = {}; });
	}
	function initSorts() {
		$$('[data-ct-sort]').forEach(function (sel) {
			var grid = $(sel.getAttribute('data-ct-sort'));
			if (!grid) { return; }
			sel.addEventListener('change', function () {
				if (sel.value === 'popularity') { ensurePopularity().then(function () { sortCards(grid, 'popularity'); }); }
				else { sortCards(grid, sel.value); }
			});
		});
	}

	function initCatalog() {
		var grid = $('[data-ct-catalog]');
		var form = $('[data-ct-catalog-filters]');
		if (!grid || !form) { return; }
		var pageSize = parseInt(grid.getAttribute('data-page-size'), 10) || 48;
		var shown = pageSize;
		var more = $('[data-ct-more]');
		var empty = $('[data-ct-empty]');
		var count = $('[data-ct-count]');
		var cards = $$('[data-ct-tool-card]', grid);
		var bySlug = {};
		(cfg.catalog || []).forEach(function (t) { bySlug[t.s] = prepare(t); });
		var params = new URLSearchParams(window.location.search);
		['q', 'cat', 'type', 'proc', 'sort'].forEach(function (k) { if (params.get(k) && form.elements[k]) { form.elements[k].value = params.get(k); } });

		var apply = function (resetPage) {
			if (resetPage) { shown = pageSize; }
			var q = form.elements.q.value;
			var cat = form.elements.cat.value;
			var type = form.elements.type.value;
			var proc = form.elements.proc.value;
			var sort = form.elements.sort.value;
			var allowed = null;
			if (CT.normalize(q)) {
				allowed = {};
				CT.search(cfg.catalog || [], q, 1000).forEach(function (t, i) { allowed[t.s] = i; });
			}
			if (allowed) {
				cards.sort(function (a, b) { return (allowed[a.dataset.ctToolCard] || 0) - (allowed[b.dataset.ctToolCard] || 0); });
				cards.forEach(function (c) { grid.appendChild(c); });
			} else {
				sortCards(grid, sort);
				cards = $$('[data-ct-tool-card]', grid);
			}
			var visible = 0;
			cards.forEach(function (c) {
				var ok = (!allowed || allowed[c.dataset.ctToolCard] !== undefined) &&
					(!cat || (' ' + c.dataset.cats + ' ').indexOf(' ' + cat + ' ') >= 0) &&
					(!type || c.dataset.type === type) &&
					(!proc || c.dataset.proc === proc);
				if (ok) { visible++; }
				c.hidden = !ok || visible > shown;
			});
			var total = cards.filter(function (c) { var s = c.dataset.ctToolCard; return (!allowed || allowed[s] !== undefined) && (!cat || (' ' + c.dataset.cats + ' ').indexOf(' ' + cat + ' ') >= 0) && (!type || c.dataset.type === type) && (!proc || c.dataset.proc === proc); }).length;
			empty.hidden = total > 0;
			more.hidden = total <= shown;
			count.textContent = sprintf(_n('%d herramienta encontrada', '%d herramientas encontradas', total), total);
			if (!total && CT.normalize(q).length >= 3) { clearTimeout(noResultTimer); noResultTimer = setTimeout(function () { CT.track('search_none', q, ''); }, 1500); }
			var url = new URL(window.location.href);
			['q', 'cat', 'type', 'proc', 'sort'].forEach(function (k) {
				var v = form.elements[k].value;
				if (v && !(k === 'sort' && v === 'priority')) { url.searchParams.set(k, v); } else { url.searchParams.delete(k); }
			});
			window.history.replaceState(null, '', url.toString());
		};
		form.addEventListener('submit', function (e) { e.preventDefault(); apply(true); });
		form.addEventListener('input', function () { apply(true); });
		form.addEventListener('change', function (e) {
			if (e.target.name === 'sort' && e.target.value === 'popularity') { ensurePopularity().then(function () { apply(true); }); } else { apply(true); }
		});
		more.addEventListener('click', function () { shown += pageSize; apply(false); });
		var reset = $('[data-ct-reset-filters]');
		if (reset) { reset.addEventListener('click', function () { form.reset(); form.elements.q.value = ''; apply(true); form.elements.q.focus(); }); }
		apply(true);
	}

	/* ---------- Formularios públicos ---------- */
	CT.token = function (action) {
		return fetch(cfg.rest + 'token?action=' + encodeURIComponent(action), { credentials: 'same-origin', cache: 'no-store' })
			.then(function (r) { if (!r.ok) { throw new Error('token'); } return r.json(); })
			.then(function (d) { return d.token; });
	};

	function initForms() {
		$$('[data-ct-form]').forEach(function (form) {
			var status = $('[data-ct-form-status]', form);
			var shownAt = Date.now();
			var token = null;
			// El token se pide en segundo plano (no se cachea con la página).
			CT.token('message').then(function (t) { token = t; }).catch(function () {});
			var setError = function (name, msg) {
				var p = $('[data-error-for="' + name + '"]', form);
				var field = form.elements[name];
				if (p) { p.textContent = msg || ''; }
				if (field && field.setAttribute) { if (msg) { field.setAttribute('aria-invalid', 'true'); } else { field.removeAttribute('aria-invalid'); } }
			};
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				var data = {};
				$$('input, textarea, select', form).forEach(function (el) {
					if (!el.name) { return; }
					data[el.name] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value.trim();
				});
				['title', 'message', 'email', 'consent'].forEach(function (k) { setError(k, ''); });
				var errors = {};
				if (form.elements.title && (data.title || '').length < 3) { errors.title = __('Indica un nombre o asunto de al menos 3 caracteres.'); }
				if ((data.message || '').length < 10) { errors.message = __('Describe el problema con al menos 10 caracteres.'); }
				if (data.type === 'contact' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) { errors.email = __('Necesitamos un correo válido para poder responderte.'); }
				if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { errors.email = __('El correo electrónico no parece válido.'); }
				if (data.email && !data.consent) { errors.consent = __('Para guardar tu correo necesitamos que aceptes la política de privacidad.'); }
				var keys = Object.keys(errors);
				if (keys.length) {
					keys.forEach(function (k) { setError(k, errors[k]); });
					var first = form.elements[keys[0]];
					if (first && first.focus) { first.focus(); }
					status.innerHTML = '<p class="ct-alert ct-alert--err">' + CT.escape(__('Revisa los campos marcados.')) + '</p>';
					return;
				}
				var btn = $('button[type="submit"]', form);
				btn.classList.add('is-busy');
				btn.disabled = true;
				var wait = Math.max(0, 3200 - (Date.now() - shownAt));
				var send = function (t) {
					data.token = t;
					return fetch(cfg.rest + 'message', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
						.then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
				};
				new Promise(function (res) { setTimeout(res, wait); })
					.then(function () { return token ? token : CT.token('message'); })
					.then(send)
					.then(function (res) {
						if (res.ok) {
							form.reset();
							status.innerHTML = '<p class="ct-alert ct-alert--ok">' + CT.icon('circle-check') + '<span>' + CT.escape(res.body.message || __('Mensaje enviado. ¡Gracias!')) + '</span></p>';
							token = null;
							CT.token('message').then(function (t) { token = t; }).catch(function () {});
						} else {
							var fields = res.body && res.body.data && res.body.data.fields;
							if (fields) { Object.keys(fields).forEach(function (k) { setError(k, fields[k]); }); }
							status.innerHTML = '<p class="ct-alert ct-alert--err">' + CT.escape((res.body && res.body.message) || __('No se ha podido enviar. Inténtalo de nuevo.')) + '</p>';
						}
					})
					.catch(function () {
						status.innerHTML = '<p class="ct-alert ct-alert--err">' + CT.escape(__('No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.')) + '</p>';
					})
					.then(function () { btn.classList.remove('is-busy'); btn.disabled = false; });
			});
		});
	}

	/* ---------- Consentimiento y scripts de terceros ---------- */
	function loadScript(src, attrs) {
		var s = document.createElement('script');
		s.async = true;
		s.src = src;
		Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
		document.head.appendChild(s);
	}
	var thirdPartyLoaded = { ads: false, analytics: false };
	function applyConsent(c) {
		var cc = cfg.consent || {};
		var adsAllowed = cc.ads && (cc.mode === 'external' || (c && c.ads));
		if (adsAllowed && !thirdPartyLoaded.ads) {
			thirdPartyLoaded.ads = true;
			loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cc.ads.client), { crossorigin: 'anonymous' });
			$$('[data-ct-ad]').forEach(function (slot) {
				slot.hidden = false;
				try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ignorado */ }
			});
		}
		if (cc.analytics && c && c.analytics && !thirdPartyLoaded.analytics) {
			thirdPartyLoaded.analytics = true;
			var attrs = {};
			if (cc.analytics.domain) { attrs['data-domain'] = cc.analytics.domain; }
			loadScript(cc.analytics.src, attrs);
		}
	}
	function initConsent() {
		var cc = cfg.consent || {};
		var banner = $('[data-ct-consent]');
		var saved = CT.store.get('ct-consent', null);
		if (saved && saved.v !== cc.version) { saved = null; }
		applyConsent(saved);
		if (!banner) { return; }
		var form = $('[data-ct-consent-form]', banner);
		var save = function (choice) {
			choice.v = cc.version;
			choice.t = Date.now();
			CT.store.set('ct-consent', choice);
			banner.hidden = true;
			applyConsent(choice);
			if ((thirdPartyLoaded.ads && !choice.ads && cc.mode !== 'external') || (thirdPartyLoaded.analytics && !choice.analytics)) {
				// Para retirar scripts ya cargados es necesario recargar la página.
				window.location.reload();
			}
		};
		var show = function () {
			var s = CT.store.get('ct-consent', null) || {};
			if (form.elements.analytics) { form.elements.analytics.checked = !!s.analytics; }
			if (form.elements.ads) { form.elements.ads.checked = !!s.ads; }
			banner.hidden = false;
			var first = $('button, input:not([disabled])', banner);
			if (first) { first.focus(); }
		};
		if (!saved && cc.required) { banner.hidden = false; }
		$('[data-ct-consent-accept]', banner).addEventListener('click', function () { save({ analytics: true, ads: true }); });
		$('[data-ct-consent-reject]', banner).addEventListener('click', function () { save({ analytics: false, ads: false }); });
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			save({ analytics: !!(form.elements.analytics && form.elements.analytics.checked), ads: !!(form.elements.ads && form.elements.ads.checked) });
		});
		$$('[data-ct-consent-open]').forEach(function (b) { b.addEventListener('click', show); });
	}

	/* ---------- Comprobación del navegador (página de estado) ---------- */
	function initBrowserCheck() {
		var ul = $('[data-ct-browser-check]');
		if (!ul) { return; }
		var checks = [];
		var add = function (ok, label) { checks.push('<li><span class="ct-dot ' + (ok ? 'ct-dot--ok' : 'ct-dot--warn') + '" aria-hidden="true"></span>' + CT.escape(label) + ' — ' + CT.escape(ok ? __('compatible') : __('no disponible')) + '</li>'); };
		var canvas = document.createElement('canvas');
		add(!!(canvas.getContext && canvas.getContext('2d')), __('Procesamiento de imágenes (Canvas)'));
		add(!!(window.crypto && window.crypto.getRandomValues), __('Generador aleatorio criptográfico'));
		add(!!(window.crypto && window.crypto.subtle), __('Web Crypto (hashes SHA)'));
		add(typeof Worker !== 'undefined', __('Procesamiento en segundo plano (Web Workers)'));
		add(!!(window.File && window.Blob && window.FileReader), __('Lectura de archivos locales'));
		add(typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined', __('Decodificación de audio (Web Audio)'));
		add(typeof window.MediaRecorder !== 'undefined', __('Grabación de medios (MediaRecorder)'));
		add(!!window.localStorage, __('Almacenamiento local'));
		var webp = canvas.toDataURL ? canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 : false;
		add(webp, __('Exportar imágenes WebP'));
		ul.innerHTML = checks.join('');
		if (canvas.toBlob) {
			canvas.width = canvas.height = 2;
			canvas.toBlob(function (b) {
				ul.insertAdjacentHTML('beforeend', '<li><span class="ct-dot ' + (b && b.type === 'image/avif' ? 'ct-dot--ok' : 'ct-dot--warn') + '" aria-hidden="true"></span>' + CT.escape(__('Exportar imágenes AVIF')) + ' — ' + CT.escape(b && b.type === 'image/avif' ? __('compatible') : __('no disponible')) + '</li>');
			}, 'image/avif');
		}
	}

	/* ---------- Montaje de herramientas ---------- */
	function mountTools() {
		$$('[data-ct-app]').forEach(function (el) {
			var slug = el.getAttribute('data-ct-app');
			var tool = el.hasAttribute('data-embed') ? (window.ClickToolsEmbeds || {})[slug] : cfg.tool;
			if (!tool) { return; }
			var engine = CT.engines[tool.engine];
			if (!engine || typeof engine.mount !== 'function') {
				el.innerHTML = '<p class="ct-alert ct-alert--err">' + CT.escape(__('No se ha podido cargar esta herramienta. Recarga la página; si el problema continúa, avísanos.')) + '</p>';
				CT.track('error', 'engine_missing', slug);
				return;
			}
			try {
				el.innerHTML = '';
				engine.mount(el, tool);
				el.setAttribute('data-ready', '1');
			} catch (err) {
				el.innerHTML = '<p class="ct-alert ct-alert--err">' + CT.escape(__('Se ha producido un error al iniciar la herramienta. Recarga la página.')) + '</p>';
				CT.track('error', 'mount', slug);
				if (window.console) { console.error(err); }
			}
		});
		if (cfg.tool) {
			CT.history.add(cfg.tool.slug);
			CT.track('view');
			var ua = navigator.userAgent || '';
			CT.track('device', /Mobi|Android.+Mobile|iPhone/i.test(ua) ? 'mobile' : (/iPad|Tablet|Android/i.test(ua) ? 'tablet' : 'desktop'));
		}
	}

	// Los scripts se cargan con «defer»: se espera a DOMContentLoaded para que todos los motores estén registrados.
	CT.ready = function (fn) {
		var done = false;
		var run = function () { if (!done) { done = true; fn(); } };
		if (document.readyState === 'complete') { run(); return; }
		document.addEventListener('DOMContentLoaded', run);
		window.addEventListener('load', run);
	};

	CT.ready(function () {
		initTheme();
		initMenus();
		$$('[data-ct-search]').forEach(initSearch);
		initPalette();
		initFavButtons();
		initLists();
		initSorts();
		initCatalog();
		initForms();
		initConsent();
		initBrowserCheck();
		mountTools();
	});
})();
