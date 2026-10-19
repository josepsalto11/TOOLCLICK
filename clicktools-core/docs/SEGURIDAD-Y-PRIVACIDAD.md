# Seguridad y privacidad

Este documento describe las medidas aplicadas y los riesgos que siguen existiendo. Aplicar estas medidas no
convierte el sitio en «completamente seguro» ni garantiza por sí solo el cumplimiento del RGPD o la LSSI: eso
depende también del alojamiento, de los plugins que instales, de los proveedores que actives y de cómo
gestiones los datos.

## Qué datos trata ClickTools

| Dato | Dónde | Cuándo | Conservación |
|---|---|---|---|
| Archivos y textos de las herramientas | Navegador del visitante | Siempre (salvo herramientas de servidor) | No salen del dispositivo |
| Archivos de herramientas de servidor | Servidor, carpeta temporal | Solo si el administrador lo activa **y** el visitante acepta el envío | Se borran al terminar; limpieza horaria de restos |
| Favoritos | `localStorage` del visitante | Al pulsar «Añadir a favoritos» | Hasta que el visitante los borre |
| Historial | `localStorage` del visitante | Solo si el visitante lo activa | Hasta que lo desactive o lo borre |
| Datos de herramientas de organización (tareas, listas, facturas…) | `localStorage` del visitante | Solo con «Guardar en este navegador» activado (por defecto en listas, desactivado en datos de facturación) | Hasta que el visitante pulse «Borrar todo» |
| Tema claro/oscuro, decisión de cookies | `localStorage` del visitante | Al elegir | Indefinida |
| Mensajes y sugerencias | Base de datos (contenido privado) | Al enviar el formulario | Plazo configurable (365 días por defecto) |
| Correo del remitente | Base de datos | Solo si lo escribe y acepta la privacidad | Igual que el mensaje |
| Estadísticas agregadas | Base de datos | Solo si el administrador activa la analítica | Plazo configurable (400 días por defecto) |
| Hash diario de la IP | Transitorio de WordPress | Para limitar abusos | 1 hora; la IP no se guarda |

ClickTools no usa cookies propias. Lo que guarda en el navegador está listado en la política de cookies
mediante el shortcode `[clicktools_storage_list]`.

## Medidas implementadas

**Entradas y salidas**
- Todo lo que llega a PHP se sanea (`sanitize_text_field`, `sanitize_email`, `sanitize_key`, listas blancas) y
  todo lo que se imprime se escapa (`esc_html`, `esc_attr`, `esc_url`).
- En JavaScript, el contenido del usuario se inserta como texto (`textContent`) o escapado (`CT.escape`).
  Ninguna herramienta interpreta HTML o JavaScript del usuario en la página; el formateador de HTML solo
  muestra texto.
- Las calculadoras con fórmulas usan un analizador propio (sin `eval` ni `Function`) que solo admite números,
  operadores, funciones matemáticas y variables declaradas.
- Las exportaciones CSV neutralizan celdas que una hoja de cálculo interpretaría como fórmula.

**Base de datos**
- Consultas con `$wpdb->prepare()`. La tabla de estadísticas solo guarda contadores por día, herramienta y evento.

**Formularios y API**
- Token HMAC con caducidad (2 h), independiente de la sesión para funcionar con caché de página.
- Tiempo mínimo de 3 s, campo trampa y límite de 5 mensajes por hora y visitante.
- Analítica: 600 eventos por hora y visitante; los eventos y herramientas se validan contra listas blancas.
- Procesamiento en servidor: token propio, límite configurable por hora y visitante (20 por defecto).
- Panel de administración: todas las acciones comprueban `manage_options` y un nonce de WordPress.

**Archivos en el servidor**
- Tipo real comprobado por contenido (`finfo`), no solo por la extensión; formato de entrada forzado en FFmpeg.
- Nombres de archivo generados por el servidor; el nombre original solo se usa, saneado, para la descarga.
- Ejecución sin shell (`proc_open` con lista de argumentos), con tiempo máximo y variables de entorno mínimas;
  Ghostscript con `-dSAFER`; contraseñas de PDF pasadas a qpdf mediante archivo temporal.
- Carpeta temporal protegida (`.htaccess` y `index.php`), borrado inmediato y limpieza horaria.
- Límite de tamaño configurable y respuesta con errores comprensibles que no revelan rutas internas.

**Terceros y consentimiento**
- Sin publicidad, analítica externa ni fuentes externas por defecto: una instalación nueva no hace ninguna
  petición a terceros (verificado en las pruebas).
- AdSense y analítica externa solo se cargan después de que el visitante acepte la categoría correspondiente.
  El rechazo se respeta y se puede cambiar desde «Configurar privacidad».

**Cabeceras** (páginas públicas): `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` restrictiva.

## Riesgos y comprobaciones pendientes

- **Revisión legal**: los textos legales son plantillas. Deben revisarse con los datos reales del titular y de
  los proveedores (alojamiento, correo, AdSense, analítica).
- **Procesamiento en servidor**: LibreOffice, Ghostscript, FFmpeg y qpdf procesan archivos no confiables.
  Mantén estos programas actualizados, y si es posible ejecútalos en un servidor o contenedor aislado.
  Valora límites de memoria y CPU del alojamiento (cgroups, `ulimit`).
- **Nginx**: la protección de la carpeta temporal con `.htaccess` solo funciona en Apache/LiteSpeed. En Nginx
  añade la regla indicada en `CONFIGURACION.md`.
- **Limitación por IP**: tras un proxy o CDN, `REMOTE_ADDR` puede ser la IP del proxy. Configura tu servidor
  para que WordPress reciba la IP real o los límites se aplicarán a todos los visitantes a la vez.
- **Caché de objetos**: los límites usan transitorios; con una caché de objetos persistente funcionan mejor.
- **Content-Security-Policy**: no se envía porque WordPress y muchos temas usan scripts en línea. Puede
  añadirse en el servidor si controlas todo el código del sitio.
- **Dependencias**: pdf-lib 1.17.1, pdf.js 3.11.174, qrcode-generator 1.4.4 y js-beautify 1.15.1 están
  incluidas en el plugin. Revisa periódicamente si hay versiones con correcciones de seguridad.
- **Pruebas de penetración**: no se ha realizado una auditoría de seguridad profesional.
