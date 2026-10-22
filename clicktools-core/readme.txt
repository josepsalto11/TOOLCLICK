=== HerramientasClave Core ===
Contributors: clicktools
Tags: herramientas, pdf, imágenes, calculadoras, conversores
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.2.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Plataforma de herramientas online gratuitas: PDF, imágenes, vídeo y audio, texto, calculadoras, conversores, QR, fechas, desarrollo, seguridad, archivos, productividad y empresas. «Todo lo que necesitas, en un clic».

== Description ==

HerramientasClave convierte un WordPress en un sitio de herramientas online con 279 herramientas reales en 13 categorías. La gran mayoría funcionan en el navegador del visitante: los archivos no se suben a ningún servidor.

* Página propia por herramienta con URL corta, instrucciones, preguntas frecuentes y herramientas relacionadas.
* Buscador instantáneo, catálogo con filtros, favoritos e historial local opcional.
* Diseño propio claro y oscuro, adaptado a móvil y accesible (WCAG 2.1 AA en las pruebas automáticas).
* Formularios de sugerencias, errores y contacto con protección antispam y revisión en el panel.
* Panel para activar, ordenar y editar herramientas, crear calculadoras por fórmula, revisar mensajes y ver estadísticas agregadas.
* SEO técnico: títulos y descripciones únicos, datos estructurados, mapa del sitio y robots.txt.
* Publicidad (AdSense) y analítica externa preparadas, solo tras el consentimiento del visitante. Desactivadas por defecto.
* Procesamiento opcional en servidor (LibreOffice, Ghostscript, qpdf, FFmpeg) para Word↔PDF, PDF protegido y vídeo/audio.
* Textos legales en forma de plantilla con datos del titular configurables (nunca inventados).

Documentación completa en la carpeta `docs/` del plugin: INSTALACION, CONFIGURACION, ARQUITECTURA, SEGURIDAD-Y-PRIVACIDAD, PRUEBAS, ESTADO, HERRAMIENTAS y TERCEROS.

== Installation ==

1. Plugins › Añadir nuevo › Subir plugin › selecciona clicktools-core.zip › Instalar ahora › Activar.
2. Asegúrate de que los enlaces permanentes no están en «Simple».
3. Ve a HerramientasClave › Panel y sigue la lista «Antes de publicar el sitio» (datos legales, revisión de textos, guías).

== Frequently Asked Questions ==

= ¿Necesito un tema concreto? =
No. HerramientasClave usa su propia plantilla visual con cualquier tema.

= ¿Los archivos de los visitantes se suben a mi servidor? =
No, salvo en las herramientas de servidor, que están desactivadas por defecto y piden aceptación expresa antes de enviar el archivo.

= ¿Carga scripts de terceros? =
No en una instalación nueva. AdSense y la analítica externa solo se cargan si las configuras y el visitante las acepta.

= ¿Qué pasa al desinstalar? =
Por defecto se conservan los datos. Si activas el borrado en Ajustes, se eliminan ajustes, mensajes y estadísticas. Las páginas creadas se conservan siempre.

== Changelog ==

= 1.2.0 =
* Generador de facturas ampliado: logotipo, emisor autónomo o empresa, datos registrales (registro, tomo, folio, hoja, inscripción, capital social), cláusula de protección de datos y derechos al pie de cada página, menciones especiales del Reglamento de facturación, facturas rectificativas, fecha de operación, IBAN y comprobación de NIF.
* Nuevas herramientas: generador de albaranes, validador de NIF/NIE/CIF y validador de IBAN.
* Los números se muestran siempre con punto de miles y coma decimal (3.528,93), también los de cuatro cifras.

= 1.1.0 =
* El sitio pasa a llamarse HerramientasClave.
* Datos del titular incluidos en el aviso legal y la política de privacidad, con nombre comercial y dominio del sitio.
* Al actualizar desde 1.0.0: se cambia el nombre, se rellenan los datos del titular que estuvieran vacíos y se regeneran las páginas del plugin que no se habían editado (en las editadas solo se cambia el nombre).
* Cabecera adaptada a móviles estrechos.

= 1.0.0 =
* Primera versión.
