<?php
/**
 * Formulario de sugerencias, errores o contacto.
 *
 * @package ClickTools
 *
 * @var string $type suggestion|bug|contact
 */

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

$clicktools_id   = 'ct-form-' . $type;
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Solo preselecciona un valor.
$clicktools_pre  = isset( $_GET['herramienta'] ) ? sanitize_title( wp_unslash( $_GET['herramienta'] ) ) : '';
$clicktools_tool = $clicktools_pre ? Registry::tool( $clicktools_pre ) : null;
?>
<form class="ct-form" data-ct-form="<?php echo esc_attr( $type ); ?>" novalidate>
	<input type="hidden" name="type" value="<?php echo esc_attr( $type ); ?>">
	<div class="ct-hp" aria-hidden="true">
		<label for="<?php echo esc_attr( $clicktools_id ); ?>-website"><?php esc_html_e( 'No rellenes este campo', 'clicktools' ); ?></label>
		<input type="text" id="<?php echo esc_attr( $clicktools_id ); ?>-website" name="website" tabindex="-1" autocomplete="off">
	</div>

	<?php if ( 'contact' !== $type ) : ?>
		<div class="ct-field">
			<label for="<?php echo esc_attr( $clicktools_id ); ?>-title">
				<?php 'bug' === $type ? esc_html_e( 'Resumen del problema', 'clicktools' ) : esc_html_e( 'Nombre de la herramienta que necesitas', 'clicktools' ); ?>
				<span class="ct-req" aria-hidden="true">*</span>
			</label>
			<input class="ct-input" type="text" id="<?php echo esc_attr( $clicktools_id ); ?>-title" name="title" required minlength="3" maxlength="120" aria-describedby="<?php echo esc_attr( $clicktools_id ); ?>-title-err">
			<p class="ct-field__error" id="<?php echo esc_attr( $clicktools_id ); ?>-title-err" data-error-for="title"></p>
		</div>
	<?php endif; ?>

	<?php if ( 'suggestion' === $type ) : ?>
		<div class="ct-field">
			<label for="<?php echo esc_attr( $clicktools_id ); ?>-category"><?php esc_html_e( 'Categoría', 'clicktools' ); ?></label>
			<select class="ct-input" id="<?php echo esc_attr( $clicktools_id ); ?>-category" name="category">
				<option value=""><?php esc_html_e( 'No lo sé / otra', 'clicktools' ); ?></option>
				<?php foreach ( Registry::categories() as $clicktools_slug => $clicktools_cat ) : ?>
					<option value="<?php echo esc_attr( $clicktools_slug ); ?>"><?php echo esc_html( $clicktools_cat['name'] ); ?></option>
				<?php endforeach; ?>
			</select>
		</div>
	<?php endif; ?>

	<?php if ( 'bug' === $type ) : ?>
		<div class="ct-field">
			<label for="<?php echo esc_attr( $clicktools_id ); ?>-tool"><?php esc_html_e( 'Herramienta afectada', 'clicktools' ); ?></label>
			<select class="ct-input" id="<?php echo esc_attr( $clicktools_id ); ?>-tool" name="tool">
				<option value=""><?php esc_html_e( 'General / no lo sé', 'clicktools' ); ?></option>
				<?php foreach ( Registry::sort( Registry::public_tools(), 'name' ) as $clicktools_t ) : ?>
					<option value="<?php echo esc_attr( $clicktools_t['slug'] ); ?>" <?php selected( $clicktools_tool && $clicktools_tool['slug'] === $clicktools_t['slug'] ); ?>><?php echo esc_html( $clicktools_t['name'] ); ?></option>
				<?php endforeach; ?>
			</select>
		</div>
	<?php endif; ?>

	<div class="ct-field">
		<label for="<?php echo esc_attr( $clicktools_id ); ?>-message">
			<?php
			if ( 'suggestion' === $type ) {
				esc_html_e( '¿Qué problema quieres resolver?', 'clicktools' );
			} elseif ( 'bug' === $type ) {
				esc_html_e( '¿Qué hiciste, qué esperabas y qué ocurrió?', 'clicktools' );
			} else {
				esc_html_e( 'Mensaje', 'clicktools' );
			}
			?>
			<span class="ct-req" aria-hidden="true">*</span>
		</label>
		<textarea class="ct-input" id="<?php echo esc_attr( $clicktools_id ); ?>-message" name="message" rows="5" required minlength="10" maxlength="3000" aria-describedby="<?php echo esc_attr( $clicktools_id ); ?>-message-err"></textarea>
		<p class="ct-field__error" id="<?php echo esc_attr( $clicktools_id ); ?>-message-err" data-error-for="message"></p>
	</div>

	<div class="ct-field">
		<label for="<?php echo esc_attr( $clicktools_id ); ?>-email">
			<?php 'contact' === $type ? esc_html_e( 'Tu correo electrónico', 'clicktools' ) : esc_html_e( 'Correo electrónico (opcional, si quieres respuesta)', 'clicktools' ); ?>
			<?php if ( 'contact' === $type ) : ?><span class="ct-req" aria-hidden="true">*</span><?php endif; ?>
		</label>
		<input class="ct-input" type="email" id="<?php echo esc_attr( $clicktools_id ); ?>-email" name="email" autocomplete="email" <?php echo 'contact' === $type ? 'required' : ''; ?> aria-describedby="<?php echo esc_attr( $clicktools_id ); ?>-email-err">
		<p class="ct-field__error" id="<?php echo esc_attr( $clicktools_id ); ?>-email-err" data-error-for="email"></p>
	</div>

	<div class="ct-field">
		<label class="ct-check">
			<input type="checkbox" name="consent" value="1" aria-describedby="<?php echo esc_attr( $clicktools_id ); ?>-consent-err">
			<span>
				<?php esc_html_e( 'Acepto que se guarde mi correo para responder a este mensaje, según la', 'clicktools' ); ?>
				<?php if ( clicktools_page_url( 'privacy' ) ) : ?>
					<a href="<?php echo esc_url( clicktools_page_url( 'privacy' ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'política de privacidad', 'clicktools' ); ?></a>.
				<?php else : ?>
					<?php esc_html_e( 'política de privacidad', 'clicktools' ); ?>.
				<?php endif; ?>
			</span>
		</label>
		<p class="ct-field__error" id="<?php echo esc_attr( $clicktools_id ); ?>-consent-err" data-error-for="consent"></p>
	</div>

	<p class="ct-form__note"><?php esc_html_e( 'Por favor, no incluyas contraseñas ni contenido privado de tus documentos.', 'clicktools' ); ?></p>
	<div class="ct-form__actions">
		<button class="ct-btn ct-btn--primary" type="submit"><?php esc_html_e( 'Enviar', 'clicktools' ); ?></button>
	</div>
	<div class="ct-form__status" role="status" aria-live="polite" data-ct-form-status></div>
	<noscript><p class="ct-alert ct-alert--warn"><?php esc_html_e( 'Este formulario necesita JavaScript. Si no puedes activarlo, escríbenos por correo desde la página de contacto.', 'clicktools' ); ?></p></noscript>
</form>
