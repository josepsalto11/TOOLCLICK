<?php
/**
 * Favoritos (guardados solo en el navegador).
 *
 * @package ClickTools
 */

use ClickTools\SEO;

defined( 'ABSPATH' ) || exit;

$clicktools_seo = SEO::current();
clicktools_template( 'shell/header' );
?>
<div class="ct-container">
	<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_seo['crumbs'] ) ); ?>
	<header class="ct-page-head">
		<h1 class="ct-page-head__title"><?php esc_html_e( 'Tus favoritos', 'clicktools' ); ?></h1>
		<p class="ct-page-head__lead"><?php esc_html_e( 'Las herramientas que marques con la estrella aparecerán aquí. Se guardan únicamente en este navegador.', 'clicktools' ); ?></p>
	</header>
	<div class="ct-grid ct-grid--tools" data-ct-list="favorites"></div>
	<div class="ct-empty" data-ct-list-empty hidden>
		<span class="ct-empty__icon" aria-hidden="true"><?php echo clicktools_icon( 'star', 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
		<h2><?php esc_html_e( 'Todavía no tienes favoritos', 'clicktools' ); ?></h2>
		<p><?php esc_html_e( 'Abre cualquier herramienta y pulsa «Añadir a favoritos» para tenerla siempre a mano.', 'clicktools' ); ?></p>
		<p><a class="ct-btn ct-btn--primary" href="<?php echo esc_url( \ClickTools\Registry::catalog_url() ); ?>"><?php esc_html_e( 'Explorar herramientas', 'clicktools' ); ?></a></p>
	</div>
	<p class="ct-center"><button type="button" class="ct-btn ct-btn--ghost" data-ct-clear="favorites" hidden><?php echo clicktools_icon( 'trash-2', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Borrar todos los favoritos', 'clicktools' ); ?></button></p>
</div>
<?php
clicktools_template( 'shell/footer' );
