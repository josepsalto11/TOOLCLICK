<?php
/**
 * Páginas de WordPress (ayuda, contacto, legales...) con la carcasa de HerramientasClave.
 *
 * @package ClickTools
 */

use ClickTools\Ads;

defined( 'ABSPATH' ) || exit;

clicktools_template( 'shell/header' );
while ( have_posts() ) :
	the_post();
	$clicktools_crumbs = array(
		array(
			'name' => __( 'Inicio', 'clicktools' ),
			'url'  => home_url( '/' ),
		),
		array(
			'name' => get_the_title(),
			'url'  => get_permalink(),
		),
	);
	?>
	<div class="ct-container ct-container--narrow">
		<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_crumbs ) ); ?>
		<article <?php post_class( 'ct-article' ); ?>>
			<header class="ct-page-head">
				<h1 class="ct-page-head__title"><?php the_title(); ?></h1>
			</header>
			<div class="ct-prose">
				<?php the_content(); ?>
			</div>
		</article>
		<?php Ads::slot( 'page' ); ?>
	</div>
	<?php
endwhile;
clicktools_template( 'shell/footer' );
