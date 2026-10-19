<?php
/**
 * Banner de consentimiento (solo se muestra si hay servicios que lo requieren).
 *
 * @package ClickTools
 */

use ClickTools\Consent;

defined( 'ABSPATH' ) || exit;

$clicktools_cfg = Consent::client_config();
?>
<section class="ct-consent" data-ct-consent hidden aria-labelledby="ct-consent-title" role="region">
	<div class="ct-consent__box">
		<h2 id="ct-consent-title" class="ct-consent__title"><?php esc_html_e( 'Tu privacidad', 'clicktools' ); ?></h2>
		<p><?php esc_html_e( 'Las herramientas funcionan sin cookies. Solo con tu permiso cargaremos los servicios de terceros indicados abajo. Puedes cambiar tu elección cuando quieras desde el pie de página.', 'clicktools' ); ?>
			<?php if ( clicktools_page_url( 'cookies' ) ) : ?>
				<a href="<?php echo esc_url( clicktools_page_url( 'cookies' ) ); ?>"><?php esc_html_e( 'Más información', 'clicktools' ); ?></a>
			<?php endif; ?>
		</p>
		<form class="ct-consent__options" data-ct-consent-form>
			<label class="ct-check"><input type="checkbox" checked disabled> <span><?php esc_html_e( 'Necesarias (preferencias guardadas en tu navegador)', 'clicktools' ); ?></span></label>
			<?php if ( $clicktools_cfg['analytics'] ) : ?>
				<label class="ct-check"><input type="checkbox" name="analytics"> <span><?php esc_html_e( 'Analítica de terceros', 'clicktools' ); ?></span></label>
			<?php endif; ?>
			<?php if ( $clicktools_cfg['ads'] && 'builtin' === $clicktools_cfg['mode'] ) : ?>
				<label class="ct-check"><input type="checkbox" name="ads"> <span><?php esc_html_e( 'Publicidad (Google AdSense)', 'clicktools' ); ?></span></label>
			<?php endif; ?>
			<div class="ct-consent__actions">
				<button type="button" class="ct-btn ct-btn--ghost" data-ct-consent-reject><?php esc_html_e( 'Rechazar todo', 'clicktools' ); ?></button>
				<button type="submit" class="ct-btn ct-btn--secondary"><?php esc_html_e( 'Guardar selección', 'clicktools' ); ?></button>
				<button type="button" class="ct-btn ct-btn--primary" data-ct-consent-accept><?php esc_html_e( 'Aceptar todo', 'clicktools' ); ?></button>
			</div>
		</form>
	</div>
</section>
