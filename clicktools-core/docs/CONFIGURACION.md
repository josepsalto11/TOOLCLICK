# Configuración

Todo se configura en **HerramientasClave › Ajustes**. Esta guía explica cada bloque y qué implica activarlo.

## Datos legales

Los textos de Aviso legal, Privacidad y Cookies usan el shortcode `[clicktools_owner field="…"]` para insertar:

| Campo | Uso |
|---|---|
| `owner_name` | Titular del sitio (nombre o razón social) |
| `owner_nif` | NIF/CIF |
| `owner_address` | Domicilio |
| `owner_email` | Correo de contacto |
| `owner_registry` | Datos registrales (si es una sociedad) |
| `privacy_email` | Correo para ejercer derechos de privacidad |
| `hosting_provider` | Proveedor de alojamiento (encargado del tratamiento) |
| `legal_updated` | Fecha de la última revisión |
| `brand_name` | Nombre comercial (el nombre de la marca, «HerramientasClave») |
| `site_domain` | Dominio real del sitio, tomado de la dirección de WordPress (no se escribe a mano) |

El aviso legal sigue este formato: «En cumplimiento de la Ley 34/2002 (LSSI), estos son los datos del titular de
*tu-dominio*», con titular, NIF, domicilio, correo electrónico y nombre comercial, y un enlace al formulario de
contacto. El aviso «Plantilla orientativa» solo se muestra mientras falte algún dato del titular.

Si un campo está vacío, se muestra un marcador visible «dato pendiente» para que nunca se publique un dato
inventado. **Los textos son una plantilla orientativa**: no garantizan el cumplimiento normativo de tu caso
concreto. Revísalos con un profesional, sobre todo si activas publicidad, analítica externa o el
procesamiento en servidor.

## Formularios

Los formularios de sugerencias, errores y contacto guardan los mensajes como contenido privado
(**HerramientasClave › Mensajes**), con estado (nueva, en revisión, aprobada, planificada, resuelta, descartada) y
prioridad. Protecciones: token firmado (HMAC) pedido al cargar la página, tiempo mínimo de 3 segundos,
campo trampa (honeypot) y límite de 5 envíos por hora y visitante (identificado por un hash diario de la IP
que no se guarda).

- **Aviso por correo**: opcional, usa `wp_mail()` (configura un plugin SMTP si tu alojamiento no envía correo).
- **Conservación**: los mensajes se eliminan automáticamente pasado el plazo (365 días por defecto; 0 = nunca).
- El correo del visitante solo se guarda si lo escribe y acepta la política de privacidad.

## Analítica

- **Analítica propia** (desactivada por defecto): cuenta por día y herramienta las visitas, usos completados,
  errores, tiempos aproximados y búsquedas sin resultados. No usa cookies, no guarda IP ni identificadores, y
  respeta «Do Not Track» y «Global Privacy Control» si así lo indicas. Las búsquedas que contienen una arroba
  o números largos se descartan para no guardar datos personales. Se borra automáticamente tras el plazo
  configurado.
- **Analítica externa** (por ejemplo Plausible, Matomo, Google Analytics): indica la URL `https://` del script.
  Solo se carga **después** de que el visitante acepte la categoría de analítica en el banner.

## Publicidad y consentimiento

La publicidad está **desactivada y sin ningún script** mientras no la actives. Para usar Google AdSense:

1. Necesitas una cuenta de AdSense aprobada para tu dominio. HerramientasClave no puede comprobarlo ni conseguirlo.
2. Indica el ID de editor (`ca-pub-…`) y los ID de los bloques para cada ubicación (portada, herramientas,
   blog, páginas). Una ubicación sin ID no muestra nada.
3. Elige la gestión del consentimiento:
   - **Banner de HerramientasClave**: el script de AdSense solo se pide después de que el visitante acepte la
     categoría «Publicidad». Si la rechaza, no se carga nada de Google.
   - **Plataforma externa** (por ejemplo, la CMP certificada de Google, obligatoria para mostrar anuncios
     personalizados en el EEE): HerramientasClave no muestra su banner y tu plataforma decide.
4. Actualiza la política de cookies para describir los proveedores.

El banner solo aparece cuando hay algún servicio que lo requiere. Los visitantes pueden cambiar su decisión
desde el enlace «Configurar privacidad» del pie.

## Procesamiento en servidor

Herramientas afectadas: Word a PDF, PDF a Word (LibreOffice), Comprimir PDF avanzado (Ghostscript),
Proteger y Desbloquear PDF (qpdf), Convertir vídeo, Comprimir vídeo y Convertir audio (FFmpeg).

Desactivado por defecto. Al activarlo, los archivos de los visitantes **salen de su dispositivo**: se suben a tu
servidor, se procesan y se borran inmediatamente al devolver el resultado (y una tarea horaria elimina
cualquier resto de más de una hora). El visitante debe marcar una casilla de aceptación antes de enviar.

Requisitos y seguridad:

- `proc_open` habilitado en PHP y los programas instalados (el panel muestra cuáles detecta). Las rutas se
  pueden indicar a mano, solo como rutas absolutas sin argumentos.
- Los programas se ejecutan sin shell (lista de argumentos), con tiempo máximo, con el tipo real del archivo
  comprobado por su contenido, y Ghostscript en modo `-dSAFER`. Las contraseñas de PDF se pasan a qpdf en un
  archivo temporal, nunca en la línea de comandos.
- Límites configurables: tamaño por archivo, conversiones por hora y visitante, y tiempo máximo.
- La carpeta temporal `wp-content/uploads/clicktools-tmp/` incluye `.htaccess` que impide el acceso web
  (en Nginx, añade una regla equivalente: `location ^~ /wp-content/uploads/clicktools-tmp/ { deny all; }`).
- Explica este tratamiento en tu política de privacidad.

## SEO

- HerramientasClave genera título, metadescripción, URL canónica, Open Graph y datos estructurados (WebSite,
  BreadcrumbList, WebApplication para herramientas, Article para guías). No inventa valoraciones ni reseñas.
- Con Yoast SEO o Rank Math activos (modo automático), HerramientasClave no duplica etiquetas y les pasa los
  títulos y descripciones de las herramientas.
- Mapa del sitio: se integra en el de WordPress (`/wp-sitemap.xml`) con categorías y herramientas visibles.
  Se quita el mapa de usuarios para no exponer nombres de autor.
- `robots.txt`: se añaden la ruta del mapa del sitio y exclusiones de la API interna y de las búsquedas.
- Redirecciones 301: una por línea (`/ruta-antigua/ /ruta-nueva/`).
- Ningún plugin puede garantizar posiciones en Google; el contenido y la autoridad del sitio son decisivos.

## Mantenimiento e idiomas

- **Modo mantenimiento**: los visitantes reciben un 503 con tu mensaje; los administradores ven el sitio.
- **Idiomas**: el sitio está en español. Todas las cadenas son traducibles (`languages/clicktools.pot`, dominio
  `clicktools`). Para catalán o inglés:
  1. Traduce el `.pot` (Poedit, Loco Translate…) y guarda `clicktools-ca.po/.mo` o `clicktools-en_US.po/.mo` en
     `wp-content/languages/plugins/` o en `clicktools-core/languages/`.
  2. Genera las traducciones de JavaScript: `wp i18n make-json languages/ --no-purge`.
  3. Para tener URL por idioma necesitas un plugin multilingüe (WPML, Polylang, TranslatePress…). Después
     activa los idiomas en Ajustes e indica sus direcciones para el selector.

## Gestión de herramientas

En **HerramientasClave › Herramientas** puedes, sin tocar código:

- Activar o desactivar herramientas (una desactivada devuelve 404 y sale del buscador y del mapa del sitio).
- Destacarlas en la portada y cambiar su prioridad (orden).
- Cambiar nombre, descripción, introducción, título SEO, metadescripción, icono y categoría principal.
- Restablecer los valores originales.

Los cambios se guardan aparte de los archivos del plugin, así que **sobreviven a las actualizaciones**.

En **Calculadoras propias** puedes crear calculadoras con hasta 8 campos y 4 resultados definidos por
fórmulas (`+ − * / ^ %`, paréntesis, `sqrt`, `round`, `min`, `max`, `pow`, `ln`, `log`, trigonométricas,
`pi`, `e`). Las fórmulas se validan al guardar y se evalúan en el navegador con un analizador propio; no se
ejecuta código.
