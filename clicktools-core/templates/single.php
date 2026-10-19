<?php
/**
 * Artículo del blog.
 *
 * @package ClickTools
 */

use ClickTools\Ads;

defined( 'ABSPATH' ) || exit;

clicktools_template( 'shell/header' );
while ( have_posts() ) :
	the_post();
	$clicktools_blog   = clicktools_page_url( 'blog' );
	$clicktools_crumbs = array(
		array(
			'name' => __( 'Inicio', 'clicktools' ),
			'url'  => home_url( '/' ),
		),
	);
	if ( $clicktools_blog ) {
		$clicktools_crumbs[] = array(
			'name' => __( 'Blog', 'clicktools' ),
			'url'  => $clicktools_blog,
		);
	}
	$clicktools_crumbs[] = array(
		'name' => get_the_title(),
		'url'  => get_permalink(),
	);
	?>
	<div class="ct-container ct-container--narrow">
		<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_crumbs ) ); ?>
		<article <?php post_class( 'ct-article' ); ?>>
			<header class="ct-page-head">
				<h1 class="ct-page-head__title"><?php the_title(); ?></h1>
				<p class="ct-article__meta">
					<?php
					/* translators: %s: fecha */
					echo esc_html( sprintf( __( 'Actualizado el %s', 'clicktools' ), get_the_modified_date() ) );
					?>
				</p>
			</header>
			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="ct-article__image"><?php the_post_thumbnail( 'large', array( 'loading' => 'eager', 'fetchpriority' => 'high' ) ); ?></figure>
			<?php endif; ?>
			<div class="ct-prose">
				<?php the_content(); ?>
			</div>
		</article>
		<?php Ads::slot( 'blog' ); ?>
		<nav class="ct-post-nav" aria-label="<?php esc_attr_e( 'Más artículos', 'clicktools' ); ?>">
			<?php previous_post_link( '<span class="ct-post-nav__prev">%link</span>', '← %title' ); ?>
			<?php next_post_link( '<span class="ct-post-nav__next">%link</span>', '%title →' ); ?>
		</nav>
	</div>
	<?php
endwhile;
clicktools_template( 'shell/footer' );
