<?php
/**
 * Blog, archivos y resultados de búsqueda de WordPress.
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

clicktools_template( 'shell/header' );
if ( is_search() ) {
	/* translators: %s: término buscado */
	$clicktools_title = sprintf( __( 'Resultados para «%s»', 'clicktools' ), get_search_query() );
} elseif ( is_home() ) {
	$clicktools_title = __( 'Blog y tutoriales', 'clicktools' );
} else {
	$clicktools_title = wp_strip_all_tags( get_the_archive_title() );
}
?>
<div class="ct-container">
	<header class="ct-page-head">
		<h1 class="ct-page-head__title"><?php echo esc_html( $clicktools_title ); ?></h1>
		<?php if ( is_home() ) : ?>
			<p class="ct-page-head__lead"><?php esc_html_e( 'Guías prácticas para sacar partido a las herramientas y resolver tareas digitales del día a día.', 'clicktools' ); ?></p>
		<?php endif; ?>
	</header>
	<?php if ( have_posts() ) : ?>
		<div class="ct-grid ct-grid--posts">
			<?php
			while ( have_posts() ) :
				the_post();
				?>
				<article <?php post_class( 'ct-card ct-card--post' ); ?>>
					<h2 class="ct-card__title"><a class="ct-card__link" href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
					<p class="ct-card__desc"><?php echo esc_html( get_the_excerpt() ); ?></p>
					<p class="ct-card__meta"><span class="ct-chip"><?php echo esc_html( get_the_date() ); ?></span></p>
				</article>
			<?php endwhile; ?>
		</div>
		<div class="ct-pagination">
			<?php
			the_posts_pagination(
				array(
					'prev_text' => __( 'Anterior', 'clicktools' ),
					'next_text' => __( 'Siguiente', 'clicktools' ),
				)
			);
			?>
		</div>
	<?php else : ?>
		<div class="ct-empty">
			<span class="ct-empty__icon" aria-hidden="true"><?php echo clicktools_icon( 'newspaper', 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<h2><?php esc_html_e( 'Todavía no hay artículos publicados', 'clicktools' ); ?></h2>
			<p><?php esc_html_e( 'Mientras tanto, puedes explorar todas las herramientas.', 'clicktools' ); ?></p>
			<p><a class="ct-btn ct-btn--primary" href="<?php echo esc_url( \ClickTools\Registry::catalog_url() ); ?>"><?php esc_html_e( 'Ver herramientas', 'clicktools' ); ?></a></p>
		</div>
	<?php endif; ?>
</div>
<?php
clicktools_template( 'shell/footer' );
