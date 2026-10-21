# Instalación de HerramientasClave

HerramientasClave es un único plugin de WordPress (`clicktools-core`). No necesita tema propio: trae su propia
plantilla («shell») con cabecera, pie y diseño, y funciona con cualquier tema actual.

## Requisitos

| Requisito | Mínimo | Notas |
|---|---|---|
| WordPress | 6.4 | Probado con 7.1 |
| PHP | 7.4 | Probado con PHP 8.3 |
| Enlaces permanentes | Cualquiera excepto «Simple» | Las URL de las herramientas (`/pdf/unir-pdf/`) los necesitan |
| HTTPS | Recomendado | Algunas funciones del navegador (portapapeles, notificaciones) solo funcionan con HTTPS |
| Procesamiento en servidor | Opcional | LibreOffice, Ghostscript, qpdf y FFmpeg + `proc_open` habilitado |

Las herramientas que trabajan en el navegador (la gran mayoría) no requieren nada especial en el servidor.

## Instalar desde el ZIP

1. En el escritorio de WordPress ve a **Plugins › Añadir nuevo › Subir plugin**.
2. Selecciona `clicktools-core.zip` y pulsa **Instalar ahora**.
3. Pulsa **Activar**.

Al activarse, HerramientasClave:

- Crea las páginas básicas si no existen: Inicio, Blog, Ayuda, Contacto, Sobre nosotros, Sugerir herramienta,
  Comunicar error, Privacidad, Cookies, Términos de uso, Aviso legal y Accesibilidad. No modifica páginas
  que ya existan con el mismo slug.
- Crea **10 guías del blog como borradores** (categoría «Guías»). No se publica nada automáticamente.
- Si tu portada mostraba «Tus últimas entradas», la cambia a la página Inicio de HerramientasClave. Si ya tenías una
  portada estática, la respeta; puedes cambiarla desde **HerramientasClave › Panel › Usar la portada de HerramientasClave**.
- Crea la tabla de estadísticas agregadas (vacía; la analítica está desactivada por defecto).
- Programa dos tareas de limpieza (diaria y horaria) mediante WP-Cron.

## Primeros pasos después de activar

Ve a **HerramientasClave › Panel**. La lista «Antes de publicar el sitio» indica lo que falta:

1. **Datos legales del titular** (HerramientasClave › Ajustes › Datos legales): vienen ya rellenados con los datos
   facilitados por el titular (nombre, NIF, domicilio y correo). Revísalos y añade el **proveedor de
   alojamiento**, que aparece como pendiente en la política de privacidad. Si vacías un campo, las páginas
   legales muestran «dato pendiente» en lugar de inventar información.
2. **Revisar los textos legales**: son plantillas orientativas. Revísalas (idealmente con un profesional) y
   anota la fecha de revisión.
3. **Revisar y publicar las guías** del blog que te interesen.
4. Opcional: analítica propia, publicidad, procesamiento en servidor (ver `CONFIGURACION.md`).

## Actualizar

Sube la nueva versión del ZIP (WordPress ofrece reemplazar la versión instalada) o sustituye la carpeta
`wp-content/plugins/clicktools-core`. Los ajustes, los cambios hechos a las herramientas desde el panel, las
calculadoras propias, los mensajes y las estadísticas se guardan en la base de datos y se conservan.
Al detectar una versión nueva, HerramientasClave crea las páginas que falten y regenera sus reglas de URL.

## Desactivar y desinstalar

- **Desactivar** conserva todo (ajustes, páginas, mensajes). Solo detiene las tareas programadas.
- **Eliminar** el plugin solo borra datos si activaste «Borrar los datos de HerramientasClave al desinstalar el plugin»
  (Ajustes › Mantenimiento e idiomas). En ese caso se eliminan ajustes, mensajes, estadísticas y archivos
  temporales. **Las páginas y entradas creadas nunca se borran**: son contenido tuyo.

## Personalizar plantillas

Copia cualquier archivo de `clicktools-core/templates/` a `tu-tema/clicktools/` manteniendo la ruta
(por ejemplo `tu-tema/clicktools/partials/tool-card.php`) y HerramientasClave usará tu copia.

Si prefieres que las páginas normales usen tu tema, desactiva «Usar la plantilla de HerramientasClave en todo el
sitio» en Ajustes › General. Las herramientas seguirán funcionando, pero puede que tengas que ajustar estilos.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Las herramientas dan 404 | Enlaces permanentes en «Simple» o reglas sin regenerar | Ajustes › Enlaces permanentes › Guardar |
| Las páginas legales muestran «Dato pendiente» | Faltan datos del titular | HerramientasClave › Ajustes › Datos legales |
| No aparecen las herramientas de servidor | Procesamiento desactivado o programa no instalado | Ajustes › Procesamiento en servidor (muestra qué se detecta) |
| «El archivo supera el tamaño máximo» en herramientas de servidor | Límite `upload_max_filesize` / `post_max_size` de PHP | Súbelo en el alojamiento; el panel muestra el límite actual |
| Una caché de página sirve formularios que fallan | — | No debería ocurrir: el token antispam se pide en el momento, no se guarda en el HTML |
