<?php
/**
 * Selector de idioma preparado para crecer (compatible con Polylang si está activo).
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

$clicktools_langs = array();
if ( function_exists( 'pll_the_languages' ) ) {
	$clicktools_raw = pll_the_languages( array( 'raw' => 1, 'hide_if_empty' => 0 ) );
	foreach ( (array) $clicktools_raw as $clicktools_l ) {
		$clicktools_langs[] = array(
			'code'    => strtoupper( substr( $clicktools_l['slug'], 0, 2 ) ),
			'name'    => $clicktools_l['name'],
			'url'     => $clicktools_l['url'],
			'current' => ! empty( $clicktools_l['current_lang'] ),
		);
	}
} else {
	$clicktools_names = array(
		'es' => 'Español',
		'ca' => 'Català',
		'en' => 'English',
	);
	$clicktools_urls  = array();
	foreach ( preg_split( '/\r\n|\r|\n/', (string) clicktools_setting( 'language_urls', '' ) ) as $clicktools_line ) {
		$clicktools_parts = preg_split( '/\s+/', trim( $clicktools_line ) );
		if ( 2 === count( $clicktools_parts ) && isset( $clicktools_names[ $clicktools_parts[0] ] ) ) {
			$clicktools_urls[ $clicktools_parts[0] ] = $clicktools_parts[1];
		}
	}
	foreach ( (array) clicktools_setting( 'languages', array( 'es' ) ) as $clicktools_code ) {
		if ( ! isset( $clicktools_names[ $clicktools_code ] ) ) {
			continue;
		}
		$clicktools_langs[] = array(
			'code'    => strtoupper( $clicktools_code ),
			'name'    => $clicktools_names[ $clicktools_code ],
			'url'     => 'es' === $clicktools_code ? home_url( '/' ) : ( isset( $clicktools_urls[ $clicktools_code ] ) ? $clicktools_urls[ $clicktools_code ] : '' ),
			'current' => 'es' === $clicktools_code,
		);
	}
}
$clicktools_current = 'ES';
foreach ( $clicktools_langs as $clicktools_l ) {
	if ( $clicktools_l['current'] ) {
		$clicktools_current = $clicktools_l['code'];
	}
}
?>
<details class="ct-lang<?php echo count( $clicktools_langs ) < 2 ? ' ct-lang--single' : ''; ?>">
	<summary class="ct-icon-btn" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: código de idioma */ __( 'Idioma: %s. Cambiar idioma', 'clicktools' ), $clicktools_current ) ); ?>">
		<?php echo clicktools_icon( 'languages', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		<span class="ct-lang__code"><?php echo esc_html( $clicktools_current ); ?></span>
	</summary>
	<ul class="ct-lang__menu">
		<?php foreach ( $clicktools_langs as $clicktools_l ) : ?>
			<li>
				<?php if ( $clicktools_l['current'] ) : ?>
					<span aria-current="true"><?php echo esc_html( $clicktools_l['name'] ); ?> <?php echo clicktools_icon( 'check', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				<?php elseif ( $clicktools_l['url'] ) : ?>
					<a href="<?php echo esc_url( $clicktools_l['url'] ); ?>" hreflang="<?php echo esc_attr( strtolower( $clicktools_l['code'] ) ); ?>"><?php echo esc_html( $clicktools_l['name'] ); ?></a>
				<?php else : ?>
					<span class="ct-muted"><?php echo esc_html( $clicktools_l['name'] ); ?> · <?php esc_html_e( 'próximamente', 'clicktools' ); ?></span>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
		<?php if ( count( $clicktools_langs ) < 2 ) : ?>
			<li><span class="ct-muted"><?php esc_html_e( 'Más idiomas próximamente', 'clicktools' ); ?></span></li>
		<?php endif; ?>
	</ul>
</details>
