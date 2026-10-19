<?php
/**
 * Paleta de búsqueda (Ctrl/Cmd + K).
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;
?>
<dialog class="ct-palette" data-ct-palette aria-label="<?php esc_attr_e( 'Buscar herramientas', 'clicktools' ); ?>">
	<div class="ct-palette__box">
		<?php clicktools_template( 'partials/search', array( 'size' => 'palette', 'id' => 'ct-palette-search' ) ); ?>
		<p class="ct-palette__hint"><kbd class="ct-kbd">↑</kbd> <kbd class="ct-kbd">↓</kbd> <?php esc_html_e( 'para moverte', 'clicktools' ); ?> · <kbd class="ct-kbd">Enter</kbd> <?php esc_html_e( 'para abrir', 'clicktools' ); ?> · <kbd class="ct-kbd">Esc</kbd> <?php esc_html_e( 'para cerrar', 'clicktools' ); ?></p>
	</div>
</dialog>
