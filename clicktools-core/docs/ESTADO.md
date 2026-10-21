# Estado del proyecto — HerramientasClave 1.1.0

Clasificación honesta de lo entregado. «Probado» significa que existe una prueba automática ejecutada con
éxito (ver `PRUEBAS.md`) o una comprobación manual en navegador durante el desarrollo, indicada como tal.

## 1. Implementado y probado

**Plataforma**
- Plugin único `clicktools-core` instalable desde ZIP; activación, actualización, desactivación y
  desinstalación probadas en un WordPress limpio.
- Plantilla propia con cabecera (logo, herramientas, categorías, favoritos, blog, selector de idioma preparado,
  modo claro/oscuro, búsqueda, menú móvil), pie completo y diseño responsive con sistema de diseño en variables.
- 29 secciones: inicio, todas las herramientas, 13 categorías, favoritos, historial local, blog, ayuda,
  contacto, sobre nosotros, privacidad, cookies, términos, aviso legal, accesibilidad, estado del servicio,
  404 y mantenimiento.
- Registro declarativo de herramientas; URL `/categoría/herramienta/`; página común por herramienta con
  migas, H1, introducción, área de trabajo, aviso de privacidad, pasos, preguntas frecuentes, relacionadas,
  copiar enlace y favoritos.
- Buscador con autocompletado, sinónimos, tolerancia a erratas, teclado y paleta Ctrl+K; catálogo con filtros
  (categoría, tipo, procesamiento, orden) y paginación; favoritos; historial opcional desactivado por defecto.
- Formularios de sugerencias, errores y contacto con validación, token, honeypot y límites; revisión en el panel
  con estados y prioridad; nada se publica automáticamente.
- Panel: herramientas (activar, ordenar, destacar, textos SEO, icono, categoría), calculadoras propias por
  fórmula, mensajes, estadísticas, ajustes (legales, formularios, analítica, publicidad y consentimiento,
  servidor, SEO, mantenimiento, idiomas, desinstalación).
- Consentimiento: ningún tercero se carga sin configuración; AdSense solo tras aceptar; rechazo respetado.
- SEO: títulos y descripciones únicos, canónica, Open Graph, JSON-LD válido (sin valoraciones inventadas),
  mapa del sitio, robots.txt, redirecciones 301, 404 útil.
- Accesibilidad: 0 incidencias automáticas WCAG 2.1 A/AA (axe-core) en 17 páginas, claro y oscuro;
  movimiento reducido respetado.

**Herramientas con pruebas funcionales automáticas** (resultado verificado, no solo carga):
unir, dividir, extraer, detectar páginas en blanco, extraer texto, comparar, numerar, marca de agua, comprimir,
imágenes a PDF, PDF a imágenes, texto a PDF y metadatos de PDF; detección de PDF dañado y protegido;
conversión, compresión, redimensionado, recorte, DPI, metadatos EXIF/GPS, imágenes para redes e
identificación de formato real; propiedades de vídeo, extraer audio, vídeo a GIF, audio a WAV, bitrate;
factura, presupuesto, recibo, conversor de productos, calculadora de factura, reparto de gastos, lista de
tareas, contador de tiempo, identificar archivo, renombrar archivos; las 8 herramientas de servidor
(Word↔PDF, proteger, desbloquear, compresión avanzada, convertir y comprimir vídeo, convertir audio);
calculadoras propias creadas desde el panel.

**Comprobadas manualmente en navegador durante el desarrollo**: calculadora de IVA, QR, hash MD5 (vectores
conocidos), diferencia horaria, dividir cuenta y buscar y reemplazar (corregidas tras detectar errores), entre otras.

## 2. Implementado pero no probado completamente

- **Resto de herramientas (unas 200)**: cada una tiene una función real y la prueba de recorrido confirma que
  su página carga y su motor se monta sin errores, pero no todas tienen una prueba automática de resultado
  con valores conocidos. Recomendado: revisar a mano las calculadoras financieras y laborales antes de
  promocionarlas.
- **Navegadores**: probado en Chromium. Falta probar en Safari (macOS/iOS), Firefox y dispositivos físicos.
  Algunas funciones dependen del navegador: AVIF, grabación de vídeo (Recortar vídeo), notificaciones.
- **Lectores de pantalla**: estructura y etiquetas comprobadas con axe-core; no probado con NVDA, JAWS o VoiceOver.
- **Compatibilidad con Yoast SEO / Rank Math**: el código cede las etiquetas a estos plugins, pero no se ha
  probado con ellos instalados. Tampoco con plugins de caché, CDN, multisitio ni Nginx.
- **Herramientas beta**: *Recordatorios* (solo avisa con la página abierta) y *Recortar vídeo* (graba el
  fragmento en tiempo real y lo guarda en WebM).
- **Rendimiento real**: medido en laboratorio (LCP ~0,3–0,5 s, CLS 0); INP sin medir; falta medir en producción.

## 3. Preparado, pendiente de configuración

| Elemento | Qué hace falta |
|---|---|
| Datos legales del titular | Incluidos (titular, NIF, domicilio, correo y nombre comercial). Falta el proveedor de alojamiento; revisar los textos con un profesional |
| Publicidad (AdSense) | Cuenta aprobada, ID de editor e ID de bloques; CMP certificada si se sirven anuncios personalizados en el EEE |
| Analítica propia | Activarla (desactivada por defecto) y mencionarla en la política de privacidad |
| Analítica externa | URL del script del proveedor elegido y actualización de la política de cookies |
| Procesamiento en servidor | Alojamiento con `proc_open` y LibreOffice, Ghostscript, qpdf y FFmpeg; activarlo en Ajustes |
| Avisos por correo | Activarlos; puede requerir un plugin SMTP |
| Google Search Console | Código de verificación en Ajustes › SEO y envío de `/wp-sitemap.xml` |
| Catalán e inglés | `languages/clicktools.pot` listo (todas las cadenas); faltan las traducciones y un plugin multilingüe para las URL |
| Guías del blog | 10 borradores con contenido real: revisarlos y publicarlos |
| Dominio | No se ha comprobado la disponibilidad de clicktools.es ni de ningún otro dominio |

## 4. Pendiente de desarrollo

- OCR de PDF e imágenes escaneadas (requiere Tesseract u otro motor).
- Conversión de HEIC/HEIF y de hojas de cálculo y presentaciones (Excel/PowerPoint ↔ PDF), ampliable con LibreOffice.
- Proteger o desbloquear PDF sin servidor (pdf-lib no cifra PDF; hoy se hace con qpdf en el servidor).
- Recorte de vídeo sin recodificar y salida MP4 en el navegador (necesitaría FFmpeg compilado a WebAssembly).
- Festivos por comunidad autónoma con datos oficiales (hoy: festivos nacionales orientativos + los que añada el usuario).
- Bloques de Gutenberg propios (hoy se usan shortcodes, que funcionan en el bloque «Código corto»).
- Versión Pro: cuentas, historial sincronizado, lotes mayores, API, pagos. Solo existen puntos de extensión
  (filtros) y el evento de analítica `pro_interest`; **no hay pagos, precios ni cuentas**.
- Estadística de «tamaño de archivo» solo se registra en la conversión de imágenes.

## 5. No viable en el entorno actual

- Instalar el plugin en tu WordPress: no hay acceso a tu sitio; el ZIP se instala desde tu panel.
- Garantizar posiciones en Google, la aprobación de AdSense o el cumplimiento normativo completo: dependen de
  terceros y de la configuración real.
- Medir Core Web Vitals de usuarios reales: requiere el sitio publicado con tráfico.
- Detectar malware o asegurar que un enlace o archivo es «seguro»: las herramientas lo indican expresamente.
- Herramientas de servidor en alojamientos que no permiten ejecutar programas: no se muestran en la web.
