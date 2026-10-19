# ClickTools

Plataforma de herramientas online para WordPress: «Todo lo que necesitas, en un clic».

Un único plugin, **ClickTools Core** (`clicktools-core/`), con 276 herramientas en 13 categorías (PDF,
imágenes, vídeo y audio, texto, calculadoras, conversores, desarrollo, seguridad, QR, fechas, archivos,
productividad y empresas), plantilla visual propia, buscador, favoritos, formularios, SEO técnico,
consentimiento y panel de administración. La mayoría de herramientas procesan los archivos en el navegador.

## Instalar

Descarga `clicktools-core.zip` y súbelo en **Plugins › Añadir nuevo › Subir plugin**. Guía completa en
[`clicktools-core/docs/INSTALACION.md`](clicktools-core/docs/INSTALACION.md).

## Documentación

| Documento | Contenido |
|---|---|
| [INSTALACION](clicktools-core/docs/INSTALACION.md) | Requisitos, instalación, actualización, desinstalación |
| [CONFIGURACION](clicktools-core/docs/CONFIGURACION.md) | Datos legales, formularios, analítica, publicidad, servidor, SEO, idiomas |
| [ARQUITECTURA](clicktools-core/docs/ARQUITECTURA.md) | Estructura, cómo añadir herramientas, API, shortcodes, ganchos |
| [SEGURIDAD-Y-PRIVACIDAD](clicktools-core/docs/SEGURIDAD-Y-PRIVACIDAD.md) | Datos tratados, medidas y riesgos pendientes |
| [PRUEBAS](clicktools-core/docs/PRUEBAS.md) | Pruebas ejecutadas y resultados |
| [ESTADO](clicktools-core/docs/ESTADO.md) | Implementado, pendiente de configuración, pendiente y no viable |
| [HERRAMIENTAS](clicktools-core/docs/HERRAMIENTAS.md) | Inventario completo |
| [TERCEROS](clicktools-core/docs/TERCEROS.md) | Bibliotecas incluidas y licencias |

## Desarrollo

```
clicktools-core/   Plugin (lo que va en el ZIP)
build/             build.sh (empaquetado), gen-icons.js e icons.txt (iconos Lucide)
tests/unit/        Pruebas de las librerías JavaScript (node --test)
tests/e2e/         Pruebas de navegador con Playwright contra un WordPress local
tests/fixtures/    Archivos de prueba (PDF dañado y protegido, imágenes con GPS, vídeo, audio…)
```

```bash
build/build.sh                                # → dist/clicktools-core.zip (+ .sha256)
WPCLI=/ruta/wp-cli.phar build/build.sh        # además regenera languages/clicktools.pot
node build/gen-icons.js node_modules/lucide-static/icons   # tras añadir iconos a build/icons.txt
```

Cómo ejecutar cada suite de pruebas: [PRUEBAS.md](clicktools-core/docs/PRUEBAS.md#cómo-ejecutar-las-pruebas).

Licencia: GPL-2.0-or-later. Bibliotecas de terceros con sus propias licencias (ver TERCEROS).
