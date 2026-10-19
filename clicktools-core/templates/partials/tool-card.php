<?php
/**
 * Tarjeta de herramienta.
 *
 * @package ClickTools
 *
 * @var array $tool
 */

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

$clicktools_cat = Registry::category( $tool['cat'] );
?>
<article class="ct-card ct-card--tool" data-ct-tool-card="<?php echo esc_attr( $tool['slug'] ); ?>" data-cat="<?php echo esc_attr( $tool['cat'] ); ?>" data-cats="<?php echo esc_attr( implode( ' ', array_merge( array( $tool['cat'] ), $tool['also'] ) ) ); ?>" data-name="<?php echo esc_attr( $tool['name'] ); ?>" data-priority="<?php echo esc_attr( $tool['priority'] ); ?>" data-type="<?php echo esc_attr( $tool['type'] ); ?>" data-proc="<?php echo esc_attr( $tool['processing'] ); ?>" data-catname="<?php echo esc_attr( $clicktools_cat['name'] ); ?>">
	<span class="ct-card__icon" aria-hidden="true"><?php echo clicktools_icon( $tool['icon'], 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
	<h3 class="ct-card__title"><a class="ct-card__link" href="<?php echo esc_url( Registry::url( $tool ) ); ?>"><?php echo esc_html( $tool['name'] ); ?></a></h3>
	<p class="ct-card__desc"><?php echo esc_html( $tool['desc'] ); ?></p>
	<p class="ct-card__meta">
		<span class="ct-chip"><?php echo esc_html( $clicktools_cat['short'] ); ?></span>
		<?php if ( 'beta' === $tool['status'] ) : ?>
			<span class="ct-chip ct-chip--beta"><?php esc_html_e( 'Beta', 'clicktools' ); ?></span>
		<?php endif; ?>
		<?php if ( 'server' === $tool['processing'] ) : ?>
			<span class="ct-chip ct-chip--warn"><?php esc_html_e( 'Usa servidor', 'clicktools' ); ?></span>
		<?php endif; ?>
	</p>
</article>
