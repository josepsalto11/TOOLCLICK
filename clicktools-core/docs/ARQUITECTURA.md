# Arquitectura y cómo añadir herramientas

## Estructura

```
clicktools-core/
├── clicktools-core.php        Cabecera del plugin, constantes y carga
├── uninstall.php              Borrado opcional de datos al eliminar el plugin
├── includes/
│   ├── class-plugin.php       Arranque de todos los módulos
│   ├── class-settings.php     Opción clicktools_settings (valores por defecto y saneado)
│   ├── class-registry.php     Registro de categorías y herramientas
│   ├── class-router.php       URL virtuales (/herramientas/, /{categoría}/, /{categoría}/{herramienta}/…)
│   ├── class-templates.php    Plantilla propia («shell»), mantenimiento y menús
│   ├── class-assets.php       Carga condicional de CSS/JS y configuración para el navegador
│   ├── class-seo.php          Títulos, metadescripción, canónica, Open Graph, JSON-LD, robots
│   ├── class-sitemap-provider.php  Proveedor del mapa del sitio de WordPress
│   ├── class-security.php     Tokens HMAC, límites por cliente y cabeceras
│   ├── class-messages.php     Mensajes y sugerencias (tipo privado ct_message)
│   ├── class-consent.php      Banner de consentimiento y carga diferida de terceros
│   ├── class-ads.php          Espacios publicitarios (solo tras consentimiento)
│   ├── class-analytics.php    Estadísticas agregadas sin cookies
│   ├── class-engines.php      Procesamiento en servidor (LibreOffice, Ghostscript, qpdf, FFmpeg)
│   ├── class-rest.php         API REST clicktools/v1
│   ├── class-shortcodes.php   Shortcodes
│   ├── class-installer.php    Activación, páginas, guías y migraciones
│   ├── functions.php          Funciones auxiliares (iconos, plantillas, ajustes)
│   ├── icons.php              Iconos SVG (Lucide, ISC) generados por build/gen-icons.js
│   └── admin/                 Panel de administración
├── data/
│   ├── categories.php         13 categorías
│   ├── pages.php              Contenido inicial de las páginas
│   ├── guides.php             Guías del blog (se crean como borradores)
│   └── tools/*.php            Definición declarativa de cada herramienta
├── templates/                 Plantillas (sobrescribibles desde el tema en /clicktools/)
├── assets/
│   ├── css/                   clicktools.css (claro/oscuro) y print.css
│   ├── js/core.js             Común: buscador, favoritos, historial, formularios, consentimiento
│   ├── js/ui.js               Componentes de interfaz y utilidades para las herramientas
│   ├── js/lib/                Librerías propias: csv, diff, expr, zip, gif, imgmeta
│   ├── js/engines/            Un motor por familia de herramientas
│   ├── vendor/                pdf-lib, pdf.js, qrcode-generator, js-beautify, lista BIP-39 (se cargan bajo demanda)
│   └── admin/                 Estilos y script del panel
├── languages/clicktools.pot   Plantilla de traducción (dominio clicktools)
└── docs/                      Esta documentación
```

## Flujo de una página de herramienta

1. `Router` reconoce `/pdf/unir-pdf/` y marca la vista `tool` con la herramienta.
2. `Templates` pinta `templates/tool.php` dentro de la plantilla propia: migas, H1, introducción, el
   contenedor `div.ct-app[data-engine][data-key]`, aviso de privacidad, pasos, preguntas frecuentes y
   herramientas relacionadas.
3. `Assets` encola `core.js`, `ui.js` y el motor `clicktools-{engine}` con sus dependencias, y añade la
   configuración (`ClickToolsConfig.tool`).
4. `core.js` monta el motor: `ClickTools.engines[engine].mount(elemento, herramienta)`.
5. Las librerías pesadas (pdf-lib, pdf.js, QR, js-beautify) se cargan solo cuando la herramienta las necesita
   (`ClickTools.loadVendor`).

Todo el procesamiento ocurre en el navegador salvo en las herramientas con `processing => 'server'`.

## Definir una herramienta

Cada archivo de `data/tools/` devuelve un array de herramientas:

```php
array(
	'slug'     => 'calcular-iva',              // URL: /{cat}/{slug}/
	'cat'      => 'calculadoras',              // categoría principal (data/categories.php)
	'also'     => array( 'empresas' ),         // otras categorías donde aparece
	'name'     => __( 'Calcular IVA', 'clicktools' ),
	'desc'     => __( 'Descripción corta para tarjetas y buscador.', 'clicktools' ),
	'intro'    => __( 'Párrafo introductorio bajo el H1.', 'clicktools' ),
	'engine'   => 'calc-money',                // motor JS (ver Assets::engines())
	'key'      => 'iva',                       // herramienta dentro del motor
	'config'   => array(),                     // datos extra para el motor
	'type'     => 'calculadora',               // archivo|calculadora|conversor|generador|editor|organizador|guia
	'processing' => 'local',                   // local|server
	'status'   => 'live',                      // live|beta|server|planned
	'icon'     => 'receipt',                   // nombre de icono (build/icons.txt)
	'priority' => 99,                          // orden (mayor = antes)
	'featured' => true,                        // destacada en portada
	'keywords' => 'iva incluido base imponible',// sinónimos para el buscador
	'steps'    => array( __( 'Paso 1', 'clicktools' ) ),
	'faq'      => array( array( __( 'Pregunta', 'clicktools' ), __( 'Respuesta', 'clicktools' ) ) ),
	'limits'   => __( 'Límites o advertencias.', 'clicktools' ),
	'related'  => array( 'calculadora-factura' ),
	'seo_title'=> '',                          // por defecto «{name} online gratis»
	'meta'     => '',                          // por defecto la descripción
),
```

Una herramienta con `status => 'planned'` no se publica. Las de tipo `server` solo se publican si el
procesamiento en servidor está activado y el programa existe.

Otros plugins pueden añadir herramientas o categorías con los filtros `clicktools_tools` y
`clicktools_categories` (mismo formato).

## Escribir un motor

Un motor es un archivo en `assets/js/engines/` registrado en `Assets::engines()` con sus dependencias:

```js
(function () {
	'use strict';
	var CT = window.ClickTools, h = CT.h, ui = CT.ui, __ = CT.__;
	var tools = {};
	tools.mi_herramienta = function (el, tool) {
		var campo = ui.field({ label: __('Texto'), type: 'textarea' });
		var salida = ui.output({ filename: function () { return 'resultado.txt'; } });
		campo.input.addEventListener('input', function () { salida.set(campo.input.value.toUpperCase()); CT.track('done'); });
		el.appendChild(campo.el);
		el.appendChild(salida.el);
	};
	CT.register('mi-motor', { mount: function (el, tool) { tools[tool.key](el, tool); } });
})();
```

Reglas: cadenas con `__()` en español (se extraen al `.pot`), errores comprensibles con `CT.fail()` o
`ui.alert('err', …)`, sin `eval` ni HTML sin escapar (`CT.h` crea nodos con `textContent`), y sin enviar datos
a terceros.

### Calculadoras declarativas

Las calculadoras usan `CT.calc.define(clave, definición)` (motor `calc` y derivados):

```js
CT.calc.define('mi-calculo', {
	fields: [
		{ name: 'base', label: __('Base'), unit: '€', value: 100, positive: true },
		{ name: 'tipo', type: 'select', label: __('Tipo'), value: '21', options: [{ value: '21', label: '21 %' }] }
	],
	compute: function (v) {
		if (v.base > 1e9) { throw CT.calc.err('base', __('Demasiado grande.')); }
		return {
			main: { label: __('Total'), value: CT.calc.money(v.base * (1 + v.tipo / 100)) },
			stats: [[__('Cuota'), CT.calc.money(v.base * v.tipo / 100)]],
			formula: 'total = base × (1 + tipo / 100)',
			note: __('Aclaración opcional.')
		};
	}
});
```

El motor valida los campos (números en formato español, mínimos, máximos, obligatorios), muestra errores
junto a cada campo, permite copiar el resultado y exportar tablas a CSV. Los importes se calculan en céntimos.

## API REST (`/wp-json/clicktools/v1/`)

| Ruta | Método | Uso |
|---|---|---|
| `catalog` | GET | Índice de búsqueda de herramientas visibles (se cachea en el navegador) |
| `token?action=message\|process` | GET | Token firmado para formularios y procesamiento |
| `message` | POST | Envío de sugerencias, errores y contacto |
| `event` | POST | Evento de analítica agregada (solo si está activada) |
| `process/{slug}` | POST | Procesamiento en servidor (solo herramientas de servidor activas) |

## Shortcodes

| Shortcode | Uso |
|---|---|
| `[clicktools_tool slug="unir-pdf"]` | Inserta una herramienta en cualquier página o entrada |
| `[clicktools_tools cat="pdf" limit="6"]` / `[clicktools_tools slugs="a,b,c"]` | Rejilla de tarjetas |
| `[clicktools_categories]` | Rejilla de categorías |
| `[clicktools_search]` | Buscador |
| `[clicktools_form type="suggestion\|bug\|contact"]` | Formularios |
| `[clicktools_owner field="owner_name"]` | Dato legal del titular (marca «dato pendiente» si falta) |
| `[clicktools_services]` | Lista real de servicios de terceros activos (para la política de cookies) |
| `[clicktools_storage_list]` | Lista de datos que se guardan en el navegador |

## Ganchos

| Gancho | Tipo | Uso |
|---|---|---|
| `clicktools_tools` | filtro | Añadir o modificar herramientas |
| `clicktools_categories` | filtro | Añadir o modificar categorías |
| `clicktools_tool_is_public` | filtro | Decidir si una herramienta es visible |
| `clicktools_tool_config` | filtro | Datos que recibe el motor JavaScript |
| `clicktools_server_limits` | filtro | Tamaño, usos por hora y tiempo máximo en servidor |
| `clicktools_tools_changed` | acción | Tras cambiar herramientas desde el panel |
| `clicktools_daily` / `clicktools_hourly` | acción (cron) | Limpieza de mensajes, estadísticas y temporales |

Estos filtros son también el punto de partida para una posible versión «Pro» (cuentas, límites mayores,
procesamiento por lotes): **no hay pagos, cuentas ni funciones Pro implementadas**.

## Construir el ZIP

```
build/build.sh            # genera dist/clicktools-core.zip (regenera iconos y .pot si hay herramientas)
```

Ver `README.md` del repositorio para las pruebas.
