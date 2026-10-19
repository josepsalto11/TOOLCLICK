// Genera clicktools-core/includes/icons.php a partir de lucide-static (ISC).
// Uso: node build/gen-icons.js <ruta a node_modules/lucide-static/icons>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const names = fs.readFileSync(path.join(__dirname, 'icons.txt'), 'utf8').split(/\s+/).filter(Boolean);
let out = "<?php\n/**\n * Iconos SVG (Lucide, licencia ISC). Archivo generado por build/gen-icons.js.\n *\n * @package ClickTools\n */\n\ndefined( 'ABSPATH' ) || exit;\n\nreturn array(\n";
for (const n of names) {
  const svg = fs.readFileSync(path.join(dir, n + '.svg'), 'utf8');
  const inner = svg.replace(/<!--.*?-->/s, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')
    .replace(/\s*\n\s*/g, '').replace(/\s+\/>/g, '/>').trim();
  out += `\t'${n}' => '${inner.replace(/'/g, "\\'")}',\n`;
}
out += ");\n";
fs.writeFileSync(path.join(__dirname, '../clicktools-core/includes/icons.php'), out);
console.log('icons:', names.length);
