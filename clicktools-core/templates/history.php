<?php
/**
 * Historial local opcional.
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
		<h1 class="ct-page-head__title"><?php esc_html_e( 'Historial local', 'clicktools' ); ?></h1>
		<p class="ct-page-head__lead"><?php esc_html_e( 'Si lo activas, recordaremos en este navegador qué herramientas has usado recientemente (solo el nombre de la herramienta y la fecha, nunca tus datos ni archivos). Puedes desactivarlo y borrarlo cuando quieras.', 'clicktools' ); ?></p>
	</header>
	<div class="ct-card ct-history-toggle">
		<label class="ct-switch">
			<input type="checkbox" data-ct-history-toggle>
			<span class="ct-switch__track" aria-hidden="true"></span>
			<span><?php esc_html_e( 'Guardar historial en este navegador', 'clicktools' ); ?></span>
		</label>
		<button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-ct-clear="history"><?php echo clicktools_icon( 'trash-2', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Borrar historial', 'clicktools' ); ?></button>
	</div>
	<ol class="ct-history" data-ct-list="history"></ol>
	<div class="ct-empty" data-ct-list-empty hidden>
		<span class="ct-empty__icon" aria-hidden="true"><?php echo clicktools_icon( 'history', 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
		<h2><?php esc_html_e( 'El historial está vacío', 'clicktools' ); ?></h2>
		<p><?php esc_html_e( 'Activa el historial y las herramientas que uses aparecerán aquí.', 'clicktools' ); ?></p>
	</div>
</div>
<?php
clicktools_template( 'shell/footer' );
