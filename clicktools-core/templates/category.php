<?php
/**
 * Página de categoría.
 *
 * @package ClickTools
 */

use ClickTools\Registry;
use ClickTools\SEO;
use ClickTools\Ads;

defined( 'ABSPATH' ) || exit;

$clicktools_slug  = sanitize_title( (string) get_query_var( 'ct_cat' ) );
$clicktools_cat   = Registry::category( $clicktools_slug );
$clicktools_tools = Registry::tools_in_category( $clicktools_slug );
$clicktools_seo   = SEO::current();

clicktools_template( 'shell/header' );
?>
<div class="ct-container">
	<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_seo['crumbs'] ) ); ?>
	<header class="ct-page-head ct-page-head--icon">
		<span class="ct-tool-hero__icon" aria-hidden="true"><?php echo clicktools_icon( $clicktools_cat['icon'], 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
		<div>
			<h1 class="ct-page-head__title"><?php echo esc_html( $clicktools_cat['name'] ); ?></h1>
			<p class="ct-page-head__lead"><?php echo esc_html( $clicktools_cat['intro'] ? $clicktools_cat['intro'] : $clicktools_cat['desc'] ); ?></p>
		</div>
	</header>

	<div class="ct-section__head">
		<p class="ct-results-count"><?php echo esc_html( sprintf( /* translators: %d: número */ _n( '%d herramienta', '%d herramientas', count( $clicktools_tools ), 'clicktools' ), count( $clicktools_tools ) ) ); ?></p>
		<div class="ct-sort">
			<label for="ct-cat-sort"><?php esc_html_e( 'Ordenar por', 'clicktools' ); ?></label>
			<select id="ct-cat-sort" class="ct-input ct-input--sm" data-ct-sort="#ct-cat-grid">
				<option value="priority"><?php esc_html_e( 'Destacadas', 'clicktools' ); ?></option>
				<option value="name"><?php esc_html_e( 'Nombre', 'clicktools' ); ?></option>
			</select>
		</div>
	</div>

	<div class="ct-grid ct-grid--tools" id="ct-cat-grid">
		<?php foreach ( $clicktools_tools as $tool ) : ?>
			<?php clicktools_template( 'partials/tool-card', array( 'tool' => $tool ) ); ?>
		<?php endforeach; ?>
	</div>

	<?php Ads::slot( 'page' ); ?>

	<section class="ct-section" aria-labelledby="ct-other-cats">
		<h2 id="ct-other-cats" class="ct-section__title"><?php esc_html_e( 'Otras categorías', 'clicktools' ); ?></h2>
		<ul class="ct-shortcuts ct-shortcuts--left">
			<?php foreach ( Registry::categories_with_tools() as $clicktools_other => $clicktools_oc ) : ?>
				<?php if ( $clicktools_other !== $clicktools_slug ) : ?>
					<li><a class="ct-shortcut" href="<?php echo esc_url( Registry::category_url( $clicktools_other ) ); ?>"><?php echo clicktools_icon( $clicktools_oc['icon'], 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo esc_html( $clicktools_oc['name'] ); ?></a></li>
				<?php endif; ?>
			<?php endforeach; ?>
		</ul>
	</section>
</div>
<?php
clicktools_template( 'shell/footer' );
