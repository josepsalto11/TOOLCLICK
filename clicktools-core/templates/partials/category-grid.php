<?php
/**
 * Rejilla de categorías con herramientas publicadas.
 *
 * @package ClickTools
 */

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;
?>
<ul class="ct-grid ct-grid--cats" role="list">
	<?php foreach ( Registry::categories_with_tools() as $clicktools_slug => $clicktools_cat ) : ?>
		<li class="ct-card ct-card--cat">
			<span class="ct-card__icon" aria-hidden="true"><?php echo clicktools_icon( $clicktools_cat['icon'], 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<h3 class="ct-card__title"><a class="ct-card__link" href="<?php echo esc_url( Registry::category_url( $clicktools_slug ) ); ?>"><?php echo esc_html( $clicktools_cat['name'] ); ?></a></h3>
			<p class="ct-card__desc"><?php echo esc_html( $clicktools_cat['desc'] ); ?></p>
			<p class="ct-card__meta"><span class="ct-chip"><?php echo esc_html( sprintf( /* translators: %d: número */ _n( '%d herramienta', '%d herramientas', $clicktools_cat['count'], 'clicktools' ), $clicktools_cat['count'] ) ); ?></span></p>
		</li>
	<?php endforeach; ?>
</ul>
