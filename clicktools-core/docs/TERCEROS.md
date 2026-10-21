# Software de terceros incluido

| Componente | Versión | Licencia | Uso | Ubicación |
|---|---|---|---|---|
| pdf-lib | 1.17.1 | MIT | Crear y modificar PDF en el navegador | `assets/vendor/pdf-lib/` |
| PDF.js (pdfjs-dist) | 3.11.174 | Apache 2.0 | Leer, renderizar y extraer texto de PDF | `assets/vendor/pdfjs/` |
| qrcode-generator | 1.4.4 | MIT | Generar códigos QR | `assets/vendor/qrcode/` |
| js-beautify | 1.15.1 | MIT | Formatear HTML, CSS y JavaScript | `assets/vendor/js-beautify/` |
| Lista de palabras BIP-39 (español) | — | ISC | Frases de contraseña | `assets/vendor/wordlists/` |
| Lucide (iconos) | lucide-static | ISC | Iconos SVG incrustados | `includes/icons.php`, licencia en `includes/icons-LICENSE.txt` |

Cada carpeta incluye el texto de su licencia. Todas se cargan desde el propio sitio (no desde CDN externos)
y solo en las páginas que las necesitan.

Programas opcionales del servidor (no incluidos; los instala el administrador): LibreOffice (MPL 2.0),
Ghostscript (AGPL 3.0), qpdf (Apache 2.0) y FFmpeg (LGPL/GPL según compilación). HerramientasClave los ejecuta como
programas independientes. Revisa sus licencias si distribuyes el servidor o el servicio.

«QR Code» es una marca registrada de DENSO WAVE INCORPORATED.

El código propio de HerramientasClave se distribuye bajo GPL-2.0-or-later, como WordPress.
