<?php
/**
 * Cabecera de la carcasa de HerramientasClave.
 *
 * @package ClickTools
 */

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

$clicktools_cats  = Registry::categories_with_tools();
$clicktools_brand = clicktools_setting( 'brand_name', 'HerramientasClave' );
$clicktools_blog  = clicktools_page_url( 'blog' );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1117" media="(prefers-color-scheme: dark)">
<?php wp_head(); ?>
</head>
<body <?php body_class( 'ct-body' ); ?>>
<?php wp_body_open(); ?>
<a class="ct-skip" href="#ct-main"><?php esc_html_e( 'Saltar al contenido', 'clicktools' ); ?></a>
<header class="ct-header" role="banner">
	<div class="ct-container ct-header__inner">
		<a class="ct-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: marca */ __( '%s, ir al inicio', 'clicktools' ), $clicktools_brand ) ); ?>">
			<span class="ct-logo__mark" aria-hidden="true"><?php echo clicktools_icon( 'mouse-pointer-click', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			<span class="ct-logo__text"><?php echo esc_html( $clicktools_brand ); ?></span>
		</a>

		<nav class="ct-nav" aria-label="<?php esc_attr_e( 'Principal', 'clicktools' ); ?>">
			<?php
			if ( has_nav_menu( 'clicktools-header' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'clicktools-header',
						'container'      => false,
						'menu_class'     => 'ct-nav__list',
						'depth'          => 1,
					)
				);
			} else {
				?>
				<ul class="ct-nav__list">
					<li><a href="<?php echo esc_url( Registry::catalog_url() ); ?>"><?php esc_html_e( 'Herramientas', 'clicktools' ); ?></a></li>
					<li class="ct-nav__dropdown">
						<button type="button" class="ct-nav__toggle" aria-expanded="false" aria-controls="ct-mega"><?php esc_html_e( 'Categorías', 'clicktools' ); ?> <?php echo clicktools_icon( 'chevron-down', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></button>
						<div class="ct-mega" id="ct-mega" hidden>
							<ul class="ct-mega__grid">
								<?php foreach ( $clicktools_cats as $clicktools_slug => $clicktools_cat ) : ?>
									<li>
										<a class="ct-mega__item" href="<?php echo esc_url( Registry::category_url( $clicktools_slug ) ); ?>">
											<span class="ct-mega__icon"><?php echo clicktools_icon( $clicktools_cat['icon'], 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
											<span><strong><?php echo esc_html( $clicktools_cat['name'] ); ?></strong><small><?php echo esc_html( sprintf( /* translators: %d: número */ _n( '%d herramienta', '%d herramientas', $clicktools_cat['count'], 'clicktools' ), $clicktools_cat['count'] ) ); ?></small></span>
										</a>
									</li>
								<?php endforeach; ?>
							</ul>
						</div>
					</li>
					<?php if ( clicktools_setting( 'feature_favorites' ) ) : ?>
						<li><a href="<?php echo esc_url( home_url( user_trailingslashit( 'favoritos' ) ) ); ?>"><?php esc_html_e( 'Favoritos', 'clicktools' ); ?></a></li>
					<?php endif; ?>
					<?php if ( $clicktools_blog && clicktools_setting( 'show_blog_in_header' ) ) : ?>
						<li><a href="<?php echo esc_url( $clicktools_blog ); ?>"><?php esc_html_e( 'Blog', 'clicktools' ); ?></a></li>
					<?php endif; ?>
				</ul>
			<?php } ?>
		</nav>

		<div class="ct-header__actions">
			<button type="button" class="ct-search-trigger" data-ct-open-search aria-haspopup="dialog">
				<?php echo clicktools_icon( 'search', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<span class="ct-search-trigger__label"><?php esc_html_e( 'Buscar herramienta', 'clicktools' ); ?></span>
				<kbd class="ct-kbd" aria-hidden="true">Ctrl K</kbd>
			</button>
			<?php clicktools_template( 'partials/language' ); ?>
			<button type="button" class="ct-icon-btn" data-ct-theme-toggle aria-label="<?php esc_attr_e( 'Cambiar entre modo claro y oscuro', 'clicktools' ); ?>">
				<span class="ct-theme-icon ct-theme-icon--light"><?php echo clicktools_icon( 'moon', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				<span class="ct-theme-icon ct-theme-icon--dark"><?php echo clicktools_icon( 'sun', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
			</button>
			<button type="button" class="ct-icon-btn ct-menu-btn" data-ct-menu aria-expanded="false" aria-controls="ct-drawer" aria-label="<?php esc_attr_e( 'Abrir menú', 'clicktools' ); ?>">
				<?php echo clicktools_icon( 'menu', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</button>
		</div>
	</div>

	<div class="ct-drawer" id="ct-drawer" hidden>
		<div class="ct-container">
			<ul class="ct-drawer__links">
				<li><a href="<?php echo esc_url( Registry::catalog_url() ); ?>"><?php echo clicktools_icon( 'layout-grid', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Todas las herramientas', 'clicktools' ); ?></a></li>
				<?php if ( clicktools_setting( 'feature_favorites' ) ) : ?>
					<li><a href="<?php echo esc_url( home_url( user_trailingslashit( 'favoritos' ) ) ); ?>"><?php echo clicktools_icon( 'star', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Favoritos', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<?php if ( clicktools_setting( 'feature_history' ) ) : ?>
					<li><a href="<?php echo esc_url( home_url( user_trailingslashit( 'historial' ) ) ); ?>"><?php echo clicktools_icon( 'history', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Historial', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<?php if ( $clicktools_blog ) : ?>
					<li><a href="<?php echo esc_url( $clicktools_blog ); ?>"><?php echo clicktools_icon( 'newspaper', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Blog y tutoriales', 'clicktools' ); ?></a></li>
				<?php endif; ?>
			</ul>
			<p class="ct-drawer__title"><?php esc_html_e( 'Categorías', 'clicktools' ); ?></p>
			<ul class="ct-drawer__cats">
				<?php foreach ( $clicktools_cats as $clicktools_slug => $clicktools_cat ) : ?>
					<li><a href="<?php echo esc_url( Registry::category_url( $clicktools_slug ) ); ?>"><?php echo clicktools_icon( $clicktools_cat['icon'], 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo esc_html( $clicktools_cat['name'] ); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</header>
<main id="ct-main" class="ct-main" tabindex="-1">
