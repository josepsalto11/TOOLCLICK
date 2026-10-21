<?php
/**
 * Páginas creadas en la activación. Son contenido editable de WordPress.
 *
 * Los textos legales son PLANTILLAS ORIENTATIVAS que el titular debe revisar
 * (idealmente con asesoramiento profesional) antes de publicar el sitio. Los
 * datos identificativos se insertan con [clicktools_owner] desde los ajustes.
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
$ul = static function ( array $items ) {
	$li = '';
	foreach ( $items as $item ) {
		$li .= "<!-- wp:list-item -->\n<li>" . $item . "</li>\n<!-- /wp:list-item -->\n";
	}
	return "<!-- wp:list -->\n<ul class=\"wp-block-list\">" . $li . "</ul>\n<!-- /wp:list -->\n\n";
};
$sc = static function ( $code ) {
	return "<!-- wp:shortcode -->\n" . $code . "\n<!-- /wp:shortcode -->\n\n";
};
// Aviso de plantilla: solo se ve mientras falten datos del titular (ver Shortcodes::legal_notice()).
$notice = $sc( '[clicktools_legal_notice]' );

$owner   = '[clicktools_owner field="owner_name"]';
$nif     = '[clicktools_owner field="owner_nif"]';
$address = '[clicktools_owner field="owner_address"]';
$email   = '[clicktools_owner field="owner_email"]';
$pemail  = '[clicktools_owner field="privacy_email"]';
$updated = '[clicktools_owner field="legal_updated"]';
$brand   = '[clicktools_owner field="brand_name"]';
$domain  = '[clicktools_owner field="site_domain"]';
$b       = static function ( $label ) {
	return '<strong>' . $label . '</strong>';
};

return array(
	'home'          => array(
		'title'   => __( 'Inicio', 'clicktools' ),
		'slug'    => 'inicio',
		'content' => '',
	),
	'blog'          => array(
		'title'   => __( 'Blog y tutoriales', 'clicktools' ),
		'slug'    => 'blog',
		'content' => '',
	),
	'help'          => array(
		'title'   => __( 'Centro de ayuda', 'clicktools' ),
		'slug'    => 'ayuda',
		'content' => $p( __( 'Aquí encontrarás respuestas a las dudas más habituales sobre el funcionamiento de HerramientasClave. Si no encuentras lo que buscas, escríbenos desde la página de contacto.', 'clicktools' ) )
			. $h2( __( 'Cómo usar una herramienta', 'clicktools' ) )
			. $ul(
				array(
					__( 'Busca la herramienta con el buscador o navega por categorías.', 'clicktools' ),
					__( 'Introduce los datos o selecciona tus archivos (puedes arrastrarlos a la zona indicada).', 'clicktools' ),
					__( 'Ajusta las opciones y pulsa el botón principal.', 'clicktools' ),
					__( 'Revisa el resultado y descárgalo o cópialo.', 'clicktools' ),
				)
			)
			. $h2( __( 'Preguntas frecuentes', 'clicktools' ) )
			. $p( '<strong>' . __( '¿Tengo que registrarme?', 'clicktools' ) . '</strong><br>' . __( 'No. Todas las herramientas gratuitas funcionan sin cuenta.', 'clicktools' ) )
			. $p( '<strong>' . __( '¿Se suben mis archivos a algún servidor?', 'clicktools' ) . '</strong><br>' . __( 'La mayoría de herramientas procesan los archivos directamente en tu navegador y no los envían a ningún servidor. Las pocas que necesitan un servidor lo indican claramente antes de empezar, y el archivo se elimina al terminar.', 'clicktools' ) )
			. $p( '<strong>' . __( '¿Hay límite de tamaño?', 'clicktools' ) . '</strong><br>' . __( 'En el procesamiento local el límite depende de la memoria de tu dispositivo. Cada herramienta indica sus límites orientativos.', 'clicktools' ) )
			. $p( '<strong>' . __( '¿Qué son los favoritos y el historial?', 'clicktools' ) . '</strong><br>' . __( 'Puedes marcar herramientas como favoritas y activar un historial opcional. Ambos se guardan solo en tu navegador y puedes borrarlos cuando quieras.', 'clicktools' ) )
			. $p( '<strong>' . __( '¿Por qué una herramienta no funciona en mi navegador?', 'clicktools' ) . '</strong><br>' . __( 'Algunas funciones dependen de capacidades del navegador (por ejemplo, ciertos formatos de imagen). Consulta la página de estado del servicio para ver qué admite tu navegador y usa una versión actualizada.', 'clicktools' ) )
			. $p( '<strong>' . __( '¿Los resultados de las calculadoras tienen validez oficial?', 'clicktools' ) . '</strong><br>' . __( 'No. Son cálculos orientativos basados en los datos que introduces. Para decisiones fiscales, legales o financieras consulta a un profesional.', 'clicktools' ) )
			. $h2( __( '¿No encuentras una herramienta?', 'clicktools' ) )
			. $p( __( 'Cuéntanos qué necesitas en la página «¿Qué herramienta necesitas?». Revisamos todas las sugerencias.', 'clicktools' ) ),
	),
	'contact'       => array(
		'title'   => __( 'Contacto', 'clicktools' ),
		'slug'    => 'contacto',
		'content' => $p( __( 'Escríbenos para dudas, propuestas de colaboración o cuestiones sobre privacidad. Respondemos al correo que indiques.', 'clicktools' ) )
			. $sc( '[clicktools_form type="contact"]' )
			. $p( __( 'Correo de contacto:', 'clicktools' ) . ' ' . $email ),
	),
	'about'         => array(
		'title'   => __( 'Sobre nosotros', 'clicktools' ),
		'slug'    => 'sobre-nosotros',
		'content' => $p( __( 'HerramientasClave es una colección de herramientas online gratuitas para estudiantes, particulares, profesionales, autónomos y pequeñas empresas. Nuestro objetivo es sencillo: que entres, encuentres la herramienta, hagas tu tarea y obtengas el resultado sin complicaciones.', 'clicktools' ) )
			. $h2( __( 'Nuestros principios', 'clicktools' ) )
			. $ul(
				array(
					'<strong>' . __( 'Utilidad real:', 'clicktools' ) . '</strong> ' . __( 'cada herramienta publicada funciona de verdad; si algo no es viable, no lo anunciamos.', 'clicktools' ),
					'<strong>' . __( 'Privacidad:', 'clicktools' ) . '</strong> ' . __( 'siempre que es posible, tus archivos se procesan en tu propio navegador.', 'clicktools' ),
					'<strong>' . __( 'Transparencia:', 'clicktools' ) . '</strong> ' . __( 'indicamos los límites de cada herramienta y cuándo un resultado es orientativo.', 'clicktools' ),
					'<strong>' . __( 'Accesibilidad:', 'clicktools' ) . '</strong> ' . __( 'diseñamos para teclado, lectores de pantalla y cualquier dispositivo.', 'clicktools' ),
				)
			)
			. $p( __( 'Responsable del sitio:', 'clicktools' ) . ' ' . $owner ),
	),
	'suggest'       => array(
		'title'   => __( '¿Qué herramienta necesitas?', 'clicktools' ),
		'slug'    => 'sugerir-herramienta',
		'content' => $p( __( 'Cuéntanos qué herramienta te gustaría encontrar en HerramientasClave y qué problema quieres resolver. Revisamos cada sugerencia de forma manual y priorizamos las más útiles. Las sugerencias no se publican.', 'clicktools' ) )
			. $sc( '[clicktools_form type="suggestion"]' ),
	),
	'bug'           => array(
		'title'   => __( 'Comunicar un error', 'clicktools' ),
		'slug'    => 'comunicar-error',
		'content' => $p( __( '¿Algo no ha funcionado como esperabas? Describe qué hiciste, qué esperabas y qué ocurrió. No adjuntes ni pegues contenido privado de tus documentos.', 'clicktools' ) )
			. $sc( '[clicktools_form type="bug"]' ),
	),
	'privacy'       => array(
		'title'   => __( 'Política de privacidad', 'clicktools' ),
		'slug'    => 'privacidad',
		'content' => $notice
			. $p( __( 'Última actualización:', 'clicktools' ) . ' ' . $updated )
			. $h2( __( '1. Responsable del tratamiento', 'clicktools' ) )
			. $ul(
				array(
					$b( __( 'Titular:', 'clicktools' ) ) . ' ' . $owner,
					$b( __( 'NIF:', 'clicktools' ) ) . ' ' . $nif,
					$b( __( 'Domicilio:', 'clicktools' ) ) . ' ' . $address,
					$b( __( 'Correo para cuestiones de privacidad:', 'clicktools' ) ) . ' ' . $pemail,
					$b( __( 'Nombre comercial:', 'clicktools' ) ) . ' ' . $brand,
				)
			)
			. $h2( __( '2. Principio general: tus archivos se quedan en tu dispositivo', 'clicktools' ) )
			. $p( __( 'La mayoría de herramientas de HerramientasClave (calculadoras, texto, conversores, QR, imágenes, PDF y otras) funcionan íntegramente en tu navegador. Los archivos y textos que utilizas no se envían a nuestros servidores ni a terceros.', 'clicktools' ) )
			. $p( __( 'Si alguna herramienta necesita procesar el archivo en el servidor, lo indica de forma visible antes de empezar. En ese caso, el archivo se recibe por una conexión cifrada, se procesa en un directorio temporal y se elimina en cuanto se devuelve el resultado. No se conserva una copia.', 'clicktools' ) )
			. $h2( __( '3. Qué datos tratamos y con qué finalidad', 'clicktools' ) )
			. $ul(
				array(
					'<strong>' . __( 'Formularios de sugerencias, errores y contacto:', 'clicktools' ) . '</strong> ' . __( 'el asunto y el mensaje que escribas y, solo si lo facilitas, tu correo electrónico para responderte. Base jurídica: tu consentimiento (art. 6.1.a RGPD) y nuestro interés legítimo en mejorar el servicio (art. 6.1.f RGPD).', 'clicktools' ),
					'<strong>' . __( 'Registros técnicos del servidor:', 'clicktools' ) . '</strong> ' . __( 'el proveedor de alojamiento puede registrar datos técnicos de conexión (como la dirección IP) por seguridad. Base jurídica: interés legítimo en la seguridad del servicio.', 'clicktools' ),
					'<strong>' . __( 'Servicios activos en este sitio:', 'clicktools' ) . '</strong> [clicktools_services]',
				)
			)
			. $h2( __( '4. Almacenamiento local en tu navegador', 'clicktools' ) )
			. $p( __( 'Algunas funciones guardan información únicamente en tu navegador (almacenamiento local), nunca en nuestros servidores:', 'clicktools' ) )
			. $sc( '[clicktools_storage_list]' )
			. $p( __( 'Puedes borrar estos datos desde la propia herramienta, desde la página de historial o desde la configuración de tu navegador.', 'clicktools' ) )
			. $h2( __( '5. Conservación', 'clicktools' ) )
			. $p( __( 'Los mensajes recibidos se conservan como máximo durante el plazo configurado por el titular y se eliminan automáticamente después. Los archivos procesados en servidor no se conservan.', 'clicktools' ) )
			. $h2( __( '6. Destinatarios y transferencias', 'clicktools' ) )
			. $p( __( 'No cedemos datos a terceros salvo obligación legal. Proveedor de alojamiento:', 'clicktools' ) . ' [clicktools_owner field="hosting_provider"]. ' . __( 'Si se activan servicios de terceros (por ejemplo, publicidad), se detallan en el apartado 3 y en la política de cookies.', 'clicktools' ) )
			. $h2( __( '7. Tus derechos', 'clicktools' ) )
			. $p( __( 'Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a', 'clicktools' ) . ' ' . $pemail . '. ' . __( 'También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).', 'clicktools' ) ),
		'order'   => 90,
	),
	'cookies'       => array(
		'title'   => __( 'Política de cookies', 'clicktools' ),
		'slug'    => 'politica-de-cookies',
		'content' => $notice
			. $p( __( 'Última actualización:', 'clicktools' ) . ' ' . $updated )
			. $h2( __( 'Qué utilizamos', 'clicktools' ) )
			. $p( __( 'HerramientasClave no instala cookies propias de análisis ni de publicidad. Para recordar tus preferencias (tema, favoritos, historial opcional, elección de consentimiento) usamos el almacenamiento local del navegador, que solo se lee en tu dispositivo:', 'clicktools' ) )
			. $sc( '[clicktools_storage_list]' )
			. $p( __( 'WordPress puede instalar cookies técnicas a usuarios que inician sesión en el panel de administración.', 'clicktools' ) )
			. $h2( __( 'Servicios de terceros', 'clicktools' ) )
			. $p( '[clicktools_services]' )
			. $p( __( 'Los servicios de terceros que requieren consentimiento no se cargan hasta que lo aceptas. Puedes cambiar tu elección en cualquier momento desde el enlace «Configurar privacidad» del pie de página.', 'clicktools' ) )
			. $h2( __( 'Cómo eliminar los datos', 'clicktools' ) )
			. $p( __( 'Puedes borrar el almacenamiento local y las cookies desde la configuración de tu navegador. Si lo haces, se perderán tus favoritos y preferencias.', 'clicktools' ) ),
		'order'   => 91,
	),
	'terms'         => array(
		'title'   => __( 'Términos de uso', 'clicktools' ),
		'slug'    => 'terminos-de-uso',
		'content' => $notice
			. $p( __( 'Última actualización:', 'clicktools' ) . ' ' . $updated )
			. $h2( __( '1. Objeto', 'clicktools' ) )
			. $p( __( 'Estos términos regulan el uso del sitio web HerramientasClave, titularidad de', 'clicktools' ) . ' ' . $owner . '. ' . __( 'Al utilizar el sitio aceptas estos términos.', 'clicktools' ) )
			. $h2( __( '2. Uso de las herramientas', 'clicktools' ) )
			. $ul(
				array(
					__( 'Las herramientas se ofrecen gratuitamente y «tal cual», sin garantía de disponibilidad continua.', 'clicktools' ),
					__( 'Los resultados de calculadoras, conversores y estimaciones son orientativos. Comprueba los resultados importantes antes de usarlos en decisiones fiscales, legales, financieras o técnicas.', 'clicktools' ),
					__( 'Las plantillas de documentos (facturas, presupuestos, recibos u otras) son modelos orientativos y no garantizan el cumplimiento de requisitos fiscales o legales concretos.', 'clicktools' ),
					__( 'Eres responsable de tener los derechos necesarios sobre los archivos que procesas. No utilices las herramientas para eludir protecciones de documentos ajenos.', 'clicktools' ),
					__( 'Está prohibido usar el sitio de forma abusiva, automatizada o que pueda dañar el servicio o a terceros.', 'clicktools' ),
				)
			)
			. $h2( __( '3. Responsabilidad', 'clicktools' ) )
			. $p( __( 'Conserva siempre una copia de tus archivos originales. En la medida permitida por la ley, el titular no responde de pérdidas de datos o daños derivados del uso de las herramientas.', 'clicktools' ) )
			. $h2( __( '4. Propiedad intelectual', 'clicktools' ) )
			. $p( __( 'El diseño, los textos y el código del sitio pertenecen a su titular o se usan con licencia. Las bibliotecas de código abierto empleadas mantienen sus licencias respectivas.', 'clicktools' ) )
			. $h2( __( '5. Legislación aplicable', 'clicktools' ) )
			. $p( __( 'Estos términos se rigen por la legislación española, sin perjuicio de los derechos que la normativa de consumidores reconozca a los usuarios.', 'clicktools' ) ),
		'order'   => 92,
	),
	'legal'         => array(
		'title'   => __( 'Aviso legal', 'clicktools' ),
		'slug'    => 'aviso-legal',
		'content' => $notice
			. $h2( __( 'Titular del sitio web', 'clicktools' ) )
			. $p( __( 'En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), estos son los datos del titular de', 'clicktools' ) . ' <strong>' . $domain . '</strong>:' )
			. $ul(
				array(
					$b( __( 'Titular:', 'clicktools' ) ) . ' ' . $owner,
					$b( __( 'NIF:', 'clicktools' ) ) . ' ' . $nif,
					$b( __( 'Domicilio:', 'clicktools' ) ) . ' ' . $address,
					$b( __( 'Correo electrónico:', 'clicktools' ) ) . ' ' . $email,
					$b( __( 'Nombre comercial:', 'clicktools' ) ) . ' ' . $brand,
				)
			)
			. $p( __( 'También puedes escribirnos a través del', 'clicktools' ) . ' [clicktools_link page="contact"]' . __( 'formulario de contacto', 'clicktools' ) . '[/clicktools_link].' )
			. $h2( __( 'Condiciones de uso', 'clicktools' ) )
			. $p( __( 'El uso del sitio implica la aceptación de los Términos de uso y de la Política de privacidad.', 'clicktools' ) ),
		'order'   => 93,
	),
	'accessibility' => array(
		'title'   => __( 'Accesibilidad', 'clicktools' ),
		'slug'    => 'accesibilidad',
		'content' => $p( __( 'HerramientasClave se diseña con el objetivo de cumplir las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2 en su nivel AA. Este objetivo se revisa de forma continua; no declaramos una conformidad total mientras no se haya completado una auditoría independiente.', 'clicktools' ) )
			. $h2( __( 'Medidas aplicadas', 'clicktools' ) )
			. $ul(
				array(
					__( 'Estructura semántica de encabezados y regiones.', 'clicktools' ),
					__( 'Navegación completa por teclado y foco visible.', 'clicktools' ),
					__( 'Etiquetas asociadas a todos los campos y mensajes de error descriptivos.', 'clicktools' ),
					__( 'Resultados anunciados a los lectores de pantalla.', 'clicktools' ),
					__( 'Contraste de color revisado en modo claro y oscuro.', 'clicktools' ),
					__( 'Respeto de la preferencia de movimiento reducido del sistema.', 'clicktools' ),
				)
			)
			. $h2( __( 'Limitaciones conocidas', 'clicktools' ) )
			. $ul(
				array(
					__( 'La reordenación de páginas y el recorte de imágenes mediante arrastre tienen alternativas con botones y campos numéricos.', 'clicktools' ),
					__( 'Las vistas previas de documentos PDF e imágenes son visuales; el contenido de texto puede extraerse con las herramientas correspondientes.', 'clicktools' ),
				)
			)
			. $h2( __( 'Comunicar un problema de accesibilidad', 'clicktools' ) )
			. $p( __( 'Si encuentras una barrera, escríbenos desde la página de contacto o a', 'clicktools' ) . ' ' . $email . '.' ),
		'order'   => 94,
	),
);
