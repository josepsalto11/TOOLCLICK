<?php
/**
 * Estado del servicio: datos reales del sitio y comprobación del navegador.
 *
 * @package ClickTools
 */

use ClickTools\Registry;
use ClickTools\SEO;

defined( 'ABSPATH' ) || exit;

$clicktools_seo     = SEO::current();
$clicktools_public  = Registry::public_tools();
$clicktools_local   = count( wp_list_filter( $clicktools_public, array( 'processing' => 'local' ) ) );
$clicktools_server  = count( $clicktools_public ) - $clicktools_local;
$clicktools_srv_on  = (bool) clicktools_setting( 'server_enabled' );
clicktools_template( 'shell/header' );
?>
<div class="ct-container ct-container--narrow">
	<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_seo['crumbs'] ) ); ?>
	<header class="ct-page-head">
		<h1 class="ct-page-head__title"><?php esc_html_e( 'Estado del servicio', 'clicktools' ); ?></h1>
		<p class="ct-page-head__lead"><?php esc_html_e( 'Información real de este sitio y de la compatibilidad de tu navegador. No mostramos cifras de disponibilidad que no podamos medir.', 'clicktools' ); ?></p>
	</header>

	<section class="ct-card ct-status-block" aria-labelledby="ct-status-site">
		<h2 id="ct-status-site"><?php esc_html_e( 'Sitio', 'clicktools' ); ?></h2>
		<ul class="ct-status-list">
			<li><span class="ct-dot ct-dot--ok" aria-hidden="true"></span><?php esc_html_e( 'Sitio web operativo (estás viendo esta página).', 'clicktools' ); ?></li>
			<li><span class="ct-dot ct-dot--ok" aria-hidden="true"></span><?php echo esc_html( sprintf( /* translators: %d: número */ __( '%d herramientas que funcionan en tu navegador.', 'clicktools' ), $clicktools_local ) ); ?></li>
			<li><span class="ct-dot <?php echo $clicktools_srv_on ? 'ct-dot--ok' : 'ct-dot--off'; ?>" aria-hidden="true"></span>
				<?php
				echo esc_html(
					$clicktools_srv_on
						? sprintf( /* translators: %d: número */ __( 'Procesamiento en servidor activo: %d herramientas disponibles.', 'clicktools' ), $clicktools_server )
						: __( 'Procesamiento en servidor desactivado en este sitio.', 'clicktools' )
				);
				?>
			</li>
			<li><span class="ct-dot ct-dot--ok" aria-hidden="true"></span><?php echo esc_html( sprintf( /* translators: %s: versión */ __( 'Versión de ClickTools: %s', 'clicktools' ), CLICKTOOLS_VERSION ) ); ?></li>
		</ul>
	</section>

	<section class="ct-card ct-status-block" aria-labelledby="ct-status-browser">
		<h2 id="ct-status-browser"><?php esc_html_e( 'Tu navegador', 'clicktools' ); ?></h2>
		<p><?php esc_html_e( 'Comprobamos qué funciones admite tu navegador. Esta comprobación se hace en tu dispositivo y no envía nada.', 'clicktools' ); ?></p>
		<ul class="ct-status-list" data-ct-browser-check>
			<li><?php esc_html_e( 'Activa JavaScript para ver la comprobación.', 'clicktools' ); ?></li>
		</ul>
	</section>
</div>
<?php
clicktools_template( 'shell/footer' );
