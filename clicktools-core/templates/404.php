<?php
/**
 * Página 404 útil, con búsqueda y sugerencias.
 *
 * @package ClickTools
 */

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

// Sugerencias a partir de la URL solicitada.
$clicktools_path  = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_parse_url( esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH ) : '';
$clicktools_words = array_filter( preg_split( '/[\/\-_]+/', strtolower( remove_accents( urldecode( $clicktools_path ) ) ) ), static function ( $w ) {
	return strlen( $w ) > 2;
} );
$clicktools_found = array();
if ( $clicktools_words ) {
	foreach ( Registry::sort( Registry::public_tools() ) as $clicktools_t ) {
		$clicktools_hay = strtolower( remove_accents( $clicktools_t['slug'] . ' ' . $clicktools_t['name'] . ' ' . $clicktools_t['keywords'] ) );
		$clicktools_hit = 0;
		foreach ( $clicktools_words as $clicktools_w ) {
			if ( false !== strpos( $clicktools_hay, $clicktools_w ) ) {
				++$clicktools_hit;
			}
		}
		if ( $clicktools_hit ) {
			$clicktools_found[ $clicktools_t['slug'] ] = array( $clicktools_hit, $clicktools_t );
		}
	}
	uasort( $clicktools_found, static function ( $a, $b ) {
		return $b[0] <=> $a[0];
	} );
	$clicktools_found = array_slice( $clicktools_found, 0, 6, true );
}
if ( ! $clicktools_found ) {
	foreach ( Registry::featured( 6 ) as $clicktools_t ) {
		$clicktools_found[ $clicktools_t['slug'] ] = array( 0, $clicktools_t );
	}
}

clicktools_template( 'shell/header' );
?>
<div class="ct-container ct-container--narrow ct-404">
	<p class="ct-eyebrow">404</p>
	<h1 class="ct-page-head__title"><?php esc_html_e( 'No encontramos esta página', 'clicktools' ); ?></h1>
	<p class="ct-page-head__lead"><?php esc_html_e( 'Puede que la dirección haya cambiado o que la herramienta ya no esté disponible. Busca lo que necesitas:', 'clicktools' ); ?></p>
	<?php clicktools_template( 'partials/search', array( 'size' => 'large', 'id' => 'ct-404-search' ) ); ?>
	<h2 class="ct-section__title"><?php esc_html_e( 'Quizá te interese', 'clicktools' ); ?></h2>
	<div class="ct-grid ct-grid--tools">
		<?php foreach ( $clicktools_found as $clicktools_pair ) : ?>
			<?php clicktools_template( 'partials/tool-card', array( 'tool' => $clicktools_pair[1] ) ); ?>
		<?php endforeach; ?>
	</div>
	<p class="ct-center"><a class="ct-btn ct-btn--secondary" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Volver al inicio', 'clicktools' ); ?></a></p>
</div>
<?php
clicktools_template( 'shell/footer' );
