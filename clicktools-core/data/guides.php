<?php
/**
 * Guías iniciales. Se crean como BORRADORES para que el titular las revise y
 * las publique cuando lo considere oportuno.
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

$h2 = static function ( $text ) {
	return "<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">" . $text . "</h2>\n<!-- /wp:heading -->\n\n";
};
$p  = static function ( $text ) {
	return "<!-- wp:paragraph -->\n<p>" . $text . "</p>\n<!-- /wp:paragraph -->\n\n";
};
$ol = static function ( array $items ) {
	$li = '';
	foreach ( $items as $item ) {
		$li .= "<!-- wp:list-item -->\n<li>" . $item . "</li>\n<!-- /wp:list-item -->\n";
	}
	return "<!-- wp:list {\"ordered\":true} -->\n<ol class=\"wp-block-list\">" . $li . "</ol>\n<!-- /wp:list -->\n\n";
};
$ul = static function ( array $items ) {
	$li = '';
	foreach ( $items as $item ) {
		$li .= "<!-- wp:list-item -->\n<li>" . $item . "</li>\n<!-- /wp:list-item -->\n";
	}
	return "<!-- wp:list -->\n<ul class=\"wp-block-list\">" . $li . "</ul>\n<!-- /wp:list -->\n\n";
};
$tools = static function ( $slugs ) {
	return "<!-- wp:shortcode -->\n[clicktools_tools slugs=\"" . $slugs . "\" limit=\"3\"]\n<!-- /wp:shortcode -->\n\n";
};

return array(
	array(
		'slug'    => 'como-comprimir-un-pdf',
		'title'   => 'Cómo comprimir un PDF sin instalar programas',
		'excerpt' => 'Qué hace realmente la compresión de un PDF, qué modo elegir y por qué algunos archivos apenas reducen su tamaño.',
		'content' => $p( 'Un PDF puede ocupar mucho por motivos muy distintos: imágenes escaneadas a alta resolución, fuentes incrustadas o una estructura interna poco optimizada. Por eso no todos los PDF se comprimen igual.' )
			. $h2( 'Paso a paso' )
			. $ol(
				array(
					'Abre la herramienta <strong>Comprimir PDF</strong> y selecciona tu archivo (o arrástralo).',
					'Elige el modo: <em>optimizar estructura</em> conserva el texto seleccionable; <em>convertir páginas en imágenes</em> reduce mucho los PDF escaneados, pero el texto deja de ser seleccionable.',
					'Pulsa «Comprimir» y compara el tamaño original con el resultado antes de descargarlo.',
				)
			)
			. $h2( 'Consejos' )
			. $ul(
				array(
					'Si el resultado ocupa más que el original, quédate con el original: ese PDF ya estaba optimizado.',
					'Para documentos escaneados, una calidad JPEG entre 60 y 75 suele ser legible y ligera.',
					'Guarda siempre una copia del original.',
				)
			)
			. $tools( 'comprimir-pdf,dividir-pdf-por-tamano,unir-pdf' ),
	),
	array(
		'slug'    => 'como-reducir-el-tamano-de-una-imagen',
		'title'   => 'Cómo reducir el tamaño de una imagen',
		'excerpt' => 'Las dos palancas para que una foto pese menos: dimensiones y calidad de compresión.',
		'content' => $p( 'El peso de una imagen depende sobre todo de dos cosas: cuántos píxeles tiene y cómo se comprime. Reducir ambas con criterio permite ahorrar mucho espacio sin que se note a simple vista.' )
			. $h2( 'Paso a paso' )
			. $ol(
				array(
					'Si la imagen es más grande de lo que necesitas (por ejemplo, 4000 px para una web que la muestra a 1200 px), redúcela primero con <strong>Redimensionar imagen</strong>.',
					'Después usa <strong>Comprimir imagen</strong> y ajusta la calidad. Entre 70 y 85 suele ser un buen equilibrio para fotografías.',
					'Compara el antes y el después y descarga el resultado.',
				)
			)
			. $p( 'Ten en cuenta que JPG y WebP comprimen con pérdida: cada vez que guardas se descarta algo de información. PNG no pierde calidad, pero suele pesar más en fotografías.' )
			. $tools( 'comprimir-imagen,redimensionar-imagen,optimizar-imagenes-web' ),
	),
	array(
		'slug'    => 'como-convertir-jpg-a-png',
		'title'   => 'Cómo convertir JPG a PNG (y cuándo merece la pena)',
		'excerpt' => 'Diferencias entre JPG y PNG y cómo convertir imágenes sin subirlas a ningún servidor.',
		'content' => $p( 'JPG es ideal para fotografías porque comprime mucho. PNG no pierde calidad al guardar y admite transparencia, por lo que es mejor para logotipos, capturas de pantalla e ilustraciones.' )
			. $h2( 'Paso a paso' )
			. $ol(
				array(
					'Abre <strong>Convertir JPG a PNG</strong>.',
					'Selecciona una o varias imágenes.',
					'Pulsa «Convertir» y descarga cada archivo o todos juntos en un ZIP.',
				)
			)
			. $p( 'Importante: convertir un JPG a PNG no recupera la calidad perdida al guardar el JPG. Solo evita perder más calidad en ediciones posteriores. Además, el PNG resultante suele ocupar más.' )
			. $tools( 'jpg-a-png,png-a-jpg,convertir-imagen' ),
	),
	array(
		'slug'    => 'como-calcular-el-iva',
		'title'   => 'Cómo calcular el IVA: añadirlo y quitarlo de un precio',
		'excerpt' => 'Fórmulas para calcular el IVA de una base imponible o desglosarlo de un precio final.',
		'content' => $p( 'En España los tipos de IVA más conocidos son el general, el reducido y el superreducido. Antes de aplicar uno, comprueba qué tipo corresponde a tu producto o servicio en la Agencia Tributaria, porque depende de la actividad y puede cambiar.' )
			. $h2( 'Añadir IVA a una base' )
			. $p( '<code>Cuota de IVA = Base × tipo / 100</code> y <code>Total = Base + Cuota</code>. Ejemplo con un tipo del 21 %: 100 € de base generan 21 € de IVA y un total de 121 €.' )
			. $h2( 'Quitar el IVA de un precio final' )
			. $p( '<code>Base = Total / (1 + tipo / 100)</code>. Ejemplo: 121 € con IVA del 21 % equivalen a 121 / 1,21 = 100 € de base. Un error frecuente es restar el 21 % del total (121 − 25,41), lo que da un resultado incorrecto.' )
			. $tools( 'calcular-iva,calculadora-factura,calcular-porcentaje' ),
	),
	array(
		'slug'    => 'como-calcular-un-descuento',
		'title'   => 'Cómo calcular un descuento y el precio final',
		'excerpt' => 'Calcula el precio rebajado, el ahorro y por qué dos descuentos seguidos no se suman.',
		'content' => $p( 'Para calcular un descuento multiplica el precio por el porcentaje y divídelo entre 100. El precio final es el original menos ese ahorro.' )
			. $p( 'Ejemplo: un producto de 80 € con un 25 % de descuento ahorra 80 × 25 / 100 = 20 €, así que cuesta 60 €.' )
			. $h2( 'Descuentos encadenados' )
			. $p( 'Un 20 % más un 10 % adicional no es un 30 %: el segundo descuento se aplica sobre el precio ya rebajado. El descuento efectivo es 1 − (0,8 × 0,9) = 28 %.' )
			. $tools( 'calcular-descuento,descuento-comercial,calcular-porcentaje' ),
	),
	array(
		'slug'    => 'como-unir-varios-pdf',
		'title'   => 'Cómo unir varios PDF en un solo documento',
		'excerpt' => 'Combina PDF e imágenes en un único archivo y ordénalos antes de descargar.',
		'content' => $ol(
			array(
				'Abre <strong>Unir PDF</strong> y añade los archivos (puedes combinar PDF e imágenes).',
				'Ordénalos arrastrándolos o con los botones de subir y bajar.',
				'Pulsa «Unir» y descarga el documento resultante.',
			)
		)
			. $p( 'Los archivos se procesan en tu navegador, por lo que no se suben a ningún servidor. Los PDF protegidos con contraseña no pueden combinarse hasta que se desbloquean con autorización.' )
			. $tools( 'unir-pdf,ordenar-paginas-pdf,dividir-pdf' ),
	),
	array(
		'slug'    => 'como-crear-un-codigo-qr',
		'title'   => 'Cómo crear un código QR que funcione bien',
		'excerpt' => 'Tipos de QR, contraste, tamaño mínimo y uso de logotipos sin perder legibilidad.',
		'content' => $ol(
			array(
				'Elige el tipo de contenido: enlace, texto, Wi-Fi, correo, teléfono, contacto o ubicación.',
				'Personaliza colores manteniendo un contraste alto (código oscuro sobre fondo claro).',
				'Si añades un logotipo, usa el nivel de corrección de errores alto y no cubras más del 20 % del código.',
				'Descarga en PNG para uso digital o en SVG para imprenta y pruébalo con varios móviles antes de imprimir.',
			)
		)
			. $p( 'Los QR generados aquí son estáticos: el contenido va dentro del propio código y no caducan ni dependen de nuestro servidor.' )
			. $tools( 'generador-qr,qr-wifi,qr-contacto' ),
	),
	array(
		'slug'    => 'como-calcular-el-coste-de-un-viaje',
		'title'   => 'Cómo calcular el coste de un viaje en coche',
		'excerpt' => 'Combustible, peajes y aparcamiento: cómo estimar el coste total y por persona.',
		'content' => $p( 'El coste de combustible se calcula con: <code>litros = distancia × consumo / 100</code> y <code>coste = litros × precio por litro</code>.' )
			. $p( 'Ejemplo: 350 km con un consumo de 6,5 L/100 km son 22,75 litros. A 1,60 €/L, el combustible cuesta 36,40 €. Si es ida y vuelta, se duplica.' )
			. $p( 'Suma peajes y aparcamiento y divide entre los viajeros para obtener el coste por persona. Usa el precio actual del combustible en tu zona: lo introduces tú, no lo inventamos.' )
			. $tools( 'coste-viaje,calculadora-combustible,consumo-combustible' ),
	),
	array(
		'slug'    => 'como-formatear-y-convertir-json',
		'title'   => 'Cómo formatear, validar y convertir un archivo JSON',
		'excerpt' => 'Encuentra errores de sintaxis y convierte JSON a CSV sin enviar tus datos a ningún servidor.',
		'content' => $ol(
			array(
				'Pega tu JSON en <strong>Formatear JSON</strong>. Si hay un error, verás la línea y la columna aproximadas.',
				'Elige la sangría y pulsa «Formatear», o usa «Minificar» para reducir su tamaño.',
				'Para abrirlo en una hoja de cálculo, conviértelo con <strong>JSON a CSV</strong> (funciona con listas de objetos).',
			)
		)
			. $p( 'Errores habituales: comas finales, comillas simples en lugar de dobles y claves sin comillas.' )
			. $tools( 'formatear-json,json-a-csv,validar-json' ),
	),
	array(
		'slug'    => 'como-preparar-imagenes-para-una-web',
		'title'   => 'Cómo preparar imágenes para una página web',
		'excerpt' => 'Dimensiones adecuadas, formato WebP y eliminación de metadatos para webs más rápidas.',
		'content' => $ol(
			array(
				'Decide el ancho máximo con el que se mostrará la imagen (por ejemplo, 1600 px para una imagen a ancho completo).',
				'Usa <strong>Optimizar imágenes para web</strong> para redimensionar y convertir a WebP en un solo paso.',
				'Elimina los metadatos EXIF si las fotos pueden contener ubicación GPS o datos de la cámara.',
				'Pon a cada imagen un nombre descriptivo y, en tu web, un texto alternativo útil.',
			)
		)
			. $p( 'Unas imágenes más ligeras mejoran la velocidad de carga, especialmente en móviles.' )
			. $tools( 'optimizar-imagenes-web,eliminar-metadatos-imagen,renombrar-archivos' ),
	),
);
