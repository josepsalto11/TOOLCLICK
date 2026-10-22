# Pruebas realizadas

Todas las pruebas de esta página se han **ejecutado de verdad** sobre WordPress con el plugin instalado. Los
scripts están en el repositorio (`tests/`), no dentro del ZIP del plugin.

## Entorno

| Componente | Versión |
|---|---|
| WordPress | 7.1.3 (base de datos SQLite, servidor PHP integrado) |
| PHP | 8.3.6 |
| Navegador | Chromium 141 (Playwright), escritorio 1280×900 y móvil Pixel 7 / 390×844 |
| Node.js | 22 (pruebas unitarias) |
| Programas de servidor | LibreOffice 24.2, Ghostscript 10.02, qpdf 11.9, FFmpeg 6.1 |

No se ha probado en Safari/iOS, Firefox ni dispositivos físicos; tampoco con lectores de pantalla reales.

## Resultados

| Suite | Qué comprueba | Resultado |
|---|---|---|
| `tests/unit/libs.test.js` | CSV (comillas, saltos, delimitador, fórmulas), diff, analizador de expresiones (precedencia, factorial, variables, errores, nombres del prototipo), ZIP (CRC, nombres únicos, `unzip -t`), GIF (decodificado con ffprobe), metadatos (lectura y borrado de GPS sin cambiar dimensiones, PNG con extensión .jpg), validación de NIF/NIE/CIF e IBAN (incluido el CCC español) | 10/10 |
| `tests/e2e/smoke.js` | Cada herramienta publicada: HTTP 200, motor montado, sin errores JS/consola; portada, catálogo, favoritos, historial, estado, categorías y 404 | 289/289 (con servidor activado) |
| `tests/e2e/images.test.js` | JPG→PNG, compresión con comparación de peso, redimensionado, borrado de EXIF/GPS, PNG transparente, WebP, extensión engañosa, DPI 300, imágenes para redes (ZIP), recorte | 10/10 |
| `tests/e2e/pdf.test.js` | Unir (orden y nº de páginas), dividir (ZIP), rango no válido, extraer, páginas en blanco, extraer texto, comparar, PDF dañado, PDF protegido, numerar, marca de agua, comprimir, imágenes→PDF, PDF→PNG, texto→PDF, metadatos | 14/14 |
| `tests/e2e/media.test.js` | Propiedades de vídeo, extraer audio WAV (duración verificada con ffprobe), vídeo→GIF (30 fotogramas), OGG→WAV mono, bitrate | 5/5 |
| `tests/e2e/biz.test.js` | Factura (descuento, IVA, IRPF, PDF verificado con pdftotext), recargo de equivalencia con varios tipos, exportar/importar JSON, recibo con importe en letras, conversor de productos, reparto de gastos, contador de tiempo, lista de tareas, identificar archivo, renombrado en ZIP, formato de miles (3.528,93), factura de empresa con logotipo, datos registrales y cláusula RGPD en el PDF, avisos de NIF y de datos registrales, factura rectificativa con mención de exención, albarán sin precios, validadores de NIF e IBAN | 17/17 |
| `tests/e2e/server.test.js` | Word→PDF con acentos, PDF→Word, proteger y desbloquear (qpdf), contraseña incorrecta, Ghostscript, WebM→MP4 H.264, compresión a 360p, OGG→MP3, archivo falso rechazado, sin restos en la carpeta temporal | 10/10 |
| `tests/e2e/admin.test.js` | Todas las pantallas sin avisos PHP, edición y restablecimiento de herramientas, acciones masivas (404 al desactivar), calculadora propia (rechazo y uso real), ajustes legales con validación, revisión de mensajes | 6/6 (en el sitio de desarrollo y en la instalación limpia) |
| `tests/e2e/site.test.js` | Buscador con sinónimos y teclado, paleta Ctrl+K, filtros del catálogo, favoritos, historial opcional, formulario con validación, honeypot y token falso, ningún tercero sin configurar, AdSense solo tras aceptar, SEO y JSON-LD sin valoraciones inventadas, sitemap y robots, 404, móvil sin desbordamiento, modo oscuro recordado, movimiento reducido | 16/16 |
| `tests/e2e/a11y.js` | axe-core WCAG 2.1 A/AA en 17 páginas, en modo claro y oscuro | 0 incidencias automáticas |

Durante las pruebas el registro de depuración de WordPress (`WP_DEBUG`) quedó vacío: sin avisos, advertencias
ni errores de PHP.

### Instalación limpia

Sobre un WordPress recién instalado: instalación del ZIP con `wp plugin install … --activate`, creación de
12 páginas y 10 guías en borrador, portada configurada, recorrido completo de herramientas, pruebas del panel,
desactivación (conserva datos y quita las tareas programadas) y desinstalación con borrado (elimina opciones,
tabla, mensajes, temporales y contadores; conserva las páginas).

### Errores encontrados y corregidos gracias a las pruebas

- El analizador de expresiones resolvía nombres como `constructor` desde el prototipo de JavaScript.
- El validador de fórmulas del panel aceptaba `round(x, 2)` (la función admite un argumento).
- El token de procesamiento en servidor exigía 3 s de espera aunque se pide al pulsar el botón.
- Contraste insuficiente (4,45:1) en etiquetas verdes y en la vista previa de facturas en modo oscuro.
- Atributo `pattern` no válido para la sintaxis de expresiones regulares actual de los navegadores.
- La desinstalación dejaba contadores temporales de límite de uso.

## Rendimiento (laboratorio)

`tests/e2e/perf.js` con emulación de móvil, CPU 4× más lenta y red de ~10 Mbit/s y 40 ms. El servidor de
pruebas no comprime (sin gzip), por eso los KB son mayores que en un alojamiento normal.

| Página | LCP | CLS | Scripts |
|---|---|---|---|
| Portada | ~0,4 s | 0,000 | 4 |
| Todas las herramientas | ~0,5 s | 0,000 | 4 |
| Unir PDF | ~0,4 s | 0,000 | 8 |
| Comprimir imagen | ~0,4 s | 0,000 | 8 |
| Calcular IVA | ~0,3 s | 0,000 | 8 |

Son medidas de laboratorio en una máquina local, **no** datos de usuarios reales. Los objetivos (LCP ≤ 2,5 s,
INP ≤ 200 ms, CLS ≤ 0,1) deben comprobarse en producción con PageSpeed Insights o los datos de Chrome UX
Report, que dependen del alojamiento, la caché, el CDN y los plugins instalados. INP no se ha medido.

## Cómo ejecutar las pruebas

```bash
# Requisitos: WordPress con el plugin en http://localhost:8080 (CT_BASE para otra URL), Playwright y Chromium.
node --test tests/unit/libs.test.js
node tests/e2e/smoke.js
PDFLIB=/ruta/a/node_modules/pdf-lib node tests/e2e/pdf.test.js
node tests/e2e/images.test.js && node tests/e2e/media.test.js && node tests/e2e/biz.test.js
CT_ADMIN_USER=admin CT_ADMIN_PASS=… node tests/e2e/admin.test.js
CT_WP=/ruta/wordpress CT_WPCLI=/ruta/wp-cli.phar node tests/e2e/site.test.js
CT_TMP_DIR=/ruta/wp-content/uploads/clicktools-tmp node tests/e2e/server.test.js   # con procesamiento en servidor activado
AXE=/ruta/axe.min.js node tests/e2e/a11y.js
node tests/e2e/perf.js
```
