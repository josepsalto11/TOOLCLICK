<?php
/**
 * Categorías del catálogo. El slug es también la ruta pública (/pdf/, /imagenes/...).
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

return array(
	'pdf'           => array(
		'name'      => __( 'PDF y documentos', 'clicktools' ),
		'short'     => __( 'PDF', 'clicktools' ),
		'desc'      => __( 'Une, divide, ordena, gira, comprime y edita PDF directamente en tu navegador.', 'clicktools' ),
		'intro'     => __( 'Herramientas para trabajar con documentos PDF sin instalar programas. Se ejecutan en tu navegador, así que tus documentos no se suben a ningún servidor salvo en las herramientas que lo indican expresamente.', 'clicktools' ),
		'icon'      => 'file-text',
		'order'     => 10,
		'seo_title' => __( 'Herramientas PDF online gratis: unir, dividir y comprimir', 'clicktools' ),
	),
	'imagenes'      => array(
		'name'      => __( 'Imágenes', 'clicktools' ),
		'short'     => __( 'Imágenes', 'clicktools' ),
		'desc'      => __( 'Convierte, comprime, redimensiona, recorta y limpia metadatos de tus imágenes.', 'clicktools' ),
		'intro'     => __( 'Convierte entre JPG, PNG y WebP, reduce el peso de tus fotos, cambia sus dimensiones o elimina los datos EXIF. Todo se procesa en tu dispositivo.', 'clicktools' ),
		'icon'      => 'image',
		'order'     => 20,
		'seo_title' => __( 'Herramientas de imágenes online: convertir, comprimir y redimensionar', 'clicktools' ),
	),
	'video-audio'   => array(
		'name'      => __( 'Vídeo y audio', 'clicktools' ),
		'short'     => __( 'Vídeo y audio', 'clicktools' ),
		'desc'      => __( 'Consulta propiedades, calcula bitrate y tamaños, extrae audio y crea GIF.', 'clicktools' ),
		'intro'     => __( 'Utilidades multimedia que funcionan en el navegador: propiedades de vídeo y audio, cálculos de bitrate y tamaño, extracción de audio a WAV y creación de GIF a partir de vídeos cortos.', 'clicktools' ),
		'icon'      => 'clapperboard',
		'order'     => 30,
	),
	'texto'         => array(
		'name'      => __( 'Texto', 'clicktools' ),
		'short'     => __( 'Texto', 'clicktools' ),
		'desc'      => __( 'Cuenta palabras, compara textos, limpia, ordena, convierte y extrae datos.', 'clicktools' ),
		'intro'     => __( 'Contadores, comparadores, conversores de mayúsculas, limpieza de espacios y líneas, codificación y extracción de datos. El texto se procesa localmente y no sale de tu navegador.', 'clicktools' ),
		'icon'      => 'type',
		'order'     => 40,
	),
	'calculadoras'  => array(
		'name'      => __( 'Calculadoras', 'clicktools' ),
		'short'     => __( 'Calculadoras', 'clicktools' ),
		'desc'      => __( 'Porcentajes, IVA, márgenes, préstamos, ahorro, energía, combustible y más.', 'clicktools' ),
		'intro'     => __( 'Calculadoras financieras y cotidianas con fórmulas visibles y unidades claras. Los resultados son orientativos: los tipos, precios e impuestos los introduces tú.', 'clicktools' ),
		'icon'      => 'calculator',
		'order'     => 50,
		'seo_title' => __( 'Calculadoras online gratis: porcentajes, IVA, préstamos y más', 'clicktools' ),
	),
	'conversores'   => array(
		'name'      => __( 'Conversores', 'clicktools' ),
		'short'     => __( 'Conversores', 'clicktools' ),
		'desc'      => __( 'Longitud, peso, temperatura, volumen, datos, velocidad, energía y más unidades.', 'clicktools' ),
		'intro'     => __( 'Conversores de unidades con factores exactos o normalizados, distinguiendo correctamente las unidades decimales y binarias.', 'clicktools' ),
		'icon'      => 'arrow-left-right',
		'order'     => 60,
	),
	'desarrollo'    => array(
		'name'      => __( 'Desarrollo web', 'clicktools' ),
		'short'     => __( 'Desarrollo', 'clicktools' ),
		'desc'      => __( 'JSON, CSV, Base64, hashes, expresiones regulares, colores, timestamps y más.', 'clicktools' ),
		'intro'     => __( 'Utilidades para programadores y diseñadores web. El código que pegas no se ejecuta en ningún servidor ni se envía a terceros.', 'clicktools' ),
		'icon'      => 'code',
		'order'     => 70,
	),
	'seguridad'     => array(
		'name'      => __( 'Seguridad y privacidad', 'clicktools' ),
		'short'     => __( 'Seguridad', 'clicktools' ),
		'desc'      => __( 'Contraseñas seguras, entropía, hashes de archivos y guías de privacidad.', 'clicktools' ),
		'intro'     => __( 'Generadores criptográficamente seguros y comprobaciones locales. Nada de lo que escribes aquí se envía a ningún servidor.', 'clicktools' ),
		'icon'      => 'shield-check',
		'order'     => 80,
	),
	'qr'            => array(
		'name'      => __( 'QR y generadores', 'clicktools' ),
		'short'     => __( 'QR', 'clicktools' ),
		'desc'      => __( 'Códigos QR personalizables y generadores de números, nombres, códigos y datos.', 'clicktools' ),
		'intro'     => __( 'Crea códigos QR estáticos para enlaces, Wi-Fi, contactos o ubicaciones y descárgalos en PNG o SVG. También encontrarás generadores aleatorios útiles.', 'clicktools' ),
		'icon'      => 'qr-code',
		'order'     => 90,
	),
	'fechas'        => array(
		'name'      => __( 'Fechas y tiempo', 'clicktools' ),
		'short'     => __( 'Fechas', 'clicktools' ),
		'desc'      => __( 'Días entre fechas, edad, días laborables, horas, zonas horarias y temporizadores.', 'clicktools' ),
		'intro'     => __( 'Calcula diferencias entre fechas, plazos, horas trabajadas y zonas horarias, o usa temporizadores y cronómetros.', 'clicktools' ),
		'icon'      => 'calendar',
		'order'     => 100,
	),
	'archivos'      => array(
		'name'      => __( 'Archivos', 'clicktools' ),
		'short'     => __( 'Archivos', 'clicktools' ),
		'desc'      => __( 'Identifica formatos, renombra en lote, compara carpetas y calcula almacenamiento.', 'clicktools' ),
		'intro'     => __( 'Herramientas para conocer y organizar tus archivos: formato real, tamaños, renombrado masivo, inventarios y cálculos de almacenamiento.', 'clicktools' ),
		'icon'      => 'folder',
		'order'     => 110,
	),
	'productividad' => array(
		'name'      => __( 'Productividad', 'clicktools' ),
		'short'     => __( 'Productividad', 'clicktools' ),
		'desc'      => __( 'Listas, planificadores, Pomodoro, prioridades y tablas sencillas.', 'clicktools' ),
		'intro'     => __( 'Organízate con listas y planificadores que funcionan sin cuenta. Tú decides si se guardan en este navegador.', 'clicktools' ),
		'icon'      => 'list-checks',
		'order'     => 120,
	),
	'empresas'      => array(
		'name'      => __( 'Empresas y autónomos', 'clicktools' ),
		'short'     => __( 'Empresas', 'clicktools' ),
		'desc'      => __( 'Precios, márgenes, comisiones, presupuestos, facturas y rentabilidad.', 'clicktools' ),
		'intro'     => __( 'Calculadoras y plantillas para el día a día de un negocio. Las plantillas de documentos son orientativas y no sustituyen el asesoramiento fiscal.', 'clicktools' ),
		'icon'      => 'briefcase',
		'order'     => 130,
	),
);
