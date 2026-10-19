<?php
/**
 * Migas de pan.
 *
 * @package ClickTools
 *
 * @var array $crumbs Lista de [name, url].
 */

defined( 'ABSPATH' ) || exit;

if ( empty( $crumbs ) ) {
	return;
}
$clicktools_last = count( $crumbs ) - 1;
?>
<nav class="ct-crumbs" aria-label="<?php esc_attr_e( 'Ruta de navegación', 'clicktools' ); ?>">
	<ol>
		<?php foreach ( $crumbs as $clicktools_i => $clicktools_crumb ) : ?>
			<li>
				<?php if ( $clicktools_i === $clicktools_last ) : ?>
					<span aria-current="page"><?php echo esc_html( $clicktools_crumb['name'] ); ?></span>
				<?php else : ?>
					<a href="<?php echo esc_url( $clicktools_crumb['url'] ); ?>"><?php echo esc_html( $clicktools_crumb['name'] ); ?></a>
					<?php echo clicktools_icon( 'chevron-right', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ol>
</nav>
