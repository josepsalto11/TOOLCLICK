#!/usr/bin/env bash
# Genera dist/clicktools-core.zip, listo para «Plugins › Añadir nuevo › Subir plugin».
# Uso: build/build.sh            (WPCLI=/ruta/wp-cli.phar para regenerar el .pot)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/clicktools-core"
DIST="$ROOT/dist"
VERSION="$(sed -n 's/^ \* Version: *//p' "$SRC/clicktools-core.php" | head -1)"
echo "ClickTools $VERSION"

echo "· Comprobando sintaxis PHP"
find "$SRC" -name '*.php' -not -path '*/vendor/*' -print0 | xargs -0 -n1 php -l > /dev/null

echo "· Comprobando sintaxis JavaScript"
find "$SRC/assets" -name '*.js' -not -path '*/vendor/*' -print0 | xargs -0 -n1 node --check

if [ -n "${WPCLI:-}" ]; then
	echo "· Regenerando languages/clicktools.pot"
	php -d memory_limit=1G "$WPCLI" --allow-root i18n make-pot "$SRC" "$SRC/languages/clicktools.pot" \
		--domain=clicktools --ignore-domain --exclude=assets/vendor \
		--headers='{"Report-Msgid-Bugs-To":"","Language-Team":"","Last-Translator":""}' > /dev/null 2>&1
fi

echo "· Empaquetando"
mkdir -p "$DIST"
rm -f "$DIST/clicktools-core.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -a "$SRC" "$STAGE/clicktools-core"
find "$STAGE/clicktools-core" \( -name '.DS_Store' -o -name '*.log' -o -name '.git*' \) -exec rm -rf {} +
find "$STAGE/clicktools-core" -type d -name node_modules -prune -exec rm -rf {} +
( cd "$STAGE" && find clicktools-core -type d -exec chmod 755 {} + && find clicktools-core -type f -exec chmod 644 {} + && zip -qr -X "$DIST/clicktools-core.zip" clicktools-core )
( cd "$DIST" && sha256sum clicktools-core.zip > clicktools-core.zip.sha256 )
echo "✓ $(du -h "$DIST/clicktools-core.zip" | cut -f1)  $DIST/clicktools-core.zip"
