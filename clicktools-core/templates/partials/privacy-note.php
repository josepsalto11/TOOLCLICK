<?php
/**
 * Aviso de privacidad y límites adaptado a la herramienta.
 *
 * @package ClickTools
 *
 * @var array $tool
 */

defined( 'ABSPATH' ) || exit;

$clicktools_server = 'server' === $tool['processing'];
?>
<aside class="ct-note <?php echo $clicktools_server ? 'ct-note--warn' : 'ct-note--ok'; ?>" aria-label="<?php esc_attr_e( 'Privacidad y límites', 'clicktools' ); ?>">
	<span class="ct-note__icon" aria-hidden="true"><?php echo clicktools_icon( $clicktools_server ? 'upload' : 'shield-check', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
	<div>
		<p class="ct-note__title">
			<?php
			if ( $clicktools_server ) {
				esc_html_e( 'Esta herramienta procesa el archivo en el servidor', 'clicktools' );
			} elseif ( 'guia' === $tool['type'] ) {
				esc_html_e( 'Guía informativa', 'clicktools' );
			} else {
				esc_html_e( 'Se procesa en tu navegador', 'clicktools' );
			}
			?>
		</p>
		<p>
			<?php
			if ( $tool['privacy'] ) {
				echo esc_html( $tool['privacy'] );
			} elseif ( $clicktools_server ) {
				echo esc_html(
					sprintf(
						/* translators: %d: megabytes */
						__( 'Al pulsar el botón, el archivo se envía cifrado al servidor de este sitio, se convierte y se elimina inmediatamente después de devolverte el resultado. No se guarda ninguna copia. Tamaño máximo: %d MB.', 'clicktools' ),
						(int) clicktools_setting( 'server_max_mb', 25 )
					)
				);
			} elseif ( 'guia' === $tool['type'] ) {
				esc_html_e( 'Esta página no recoge ni envía datos. Las comprobaciones que marques se quedan en tu navegador.', 'clicktools' );
			} else {
				esc_html_e( 'Tus archivos y datos no se envían a ningún servidor: todo se calcula en tu dispositivo y desaparece al cerrar la página, salvo que elijas guardarlo en este navegador.', 'clicktools' );
			}
			?>
		</p>
		<?php if ( $tool['limits'] ) : ?>
			<p class="ct-note__limits"><strong><?php esc_html_e( 'Límites:', 'clicktools' ); ?></strong> <?php echo esc_html( $tool['limits'] ); ?></p>
		<?php endif; ?>
	</div>
</aside>
