<?php
/**
 * Pie de la carcasa de ClickTools.
 *
 * @package ClickTools
 */

use ClickTools\Registry;
use ClickTools\Consent;

defined( 'ABSPATH' ) || exit;

$clicktools_brand = clicktools_setting( 'brand_name', 'ClickTools' );
$clicktools_links = array(
	'help'          => __( 'Centro de ayuda', 'clicktools' ),
	'contact'       => __( 'Contacto', 'clicktools' ),
	'about'         => __( 'Sobre nosotros', 'clicktools' ),
	'accessibility' => __( 'Accesibilidad', 'clicktools' ),
);
$clicktools_legal = array(
	'legal'   => __( 'Aviso legal', 'clicktools' ),
	'privacy' => __( 'Privacidad', 'clicktools' ),
	'cookies' => __( 'Política de cookies', 'clicktools' ),
	'terms'   => __( 'Términos de uso', 'clicktools' ),
);
?>
</main>
<footer class="ct-footer" role="contentinfo">
	<div class="ct-container ct-footer__grid">
		<div class="ct-footer__brand">
			<a class="ct-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<span class="ct-logo__mark" aria-hidden="true"><?php echo clicktools_icon( 'mouse-pointer-click', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				<span class="ct-logo__text"><?php echo esc_html( $clicktools_brand ); ?></span>
			</a>
			<p><?php echo esc_html( clicktools_setting( 'slogan_secondary' ) ); ?>.</p>
			<p class="ct-footer__muted"><?php esc_html_e( 'La mayoría de herramientas funcionan en tu navegador: tus archivos no se suben a ningún servidor.', 'clicktools' ); ?></p>
		</div>
		<nav aria-label="<?php esc_attr_e( 'Categorías', 'clicktools' ); ?>">
			<p class="ct-footer__title"><?php esc_html_e( 'Categorías', 'clicktools' ); ?></p>
			<ul>
				<?php foreach ( Registry::categories_with_tools() as $clicktools_slug => $clicktools_cat ) : ?>
					<li><a href="<?php echo esc_url( Registry::category_url( $clicktools_slug ) ); ?>"><?php echo esc_html( $clicktools_cat['name'] ); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</nav>
		<nav aria-label="<?php echo esc_attr( $clicktools_brand ); ?>">
			<p class="ct-footer__title"><?php echo esc_html( $clicktools_brand ); ?></p>
			<ul>
				<li><a href="<?php echo esc_url( Registry::catalog_url() ); ?>"><?php esc_html_e( 'Todas las herramientas', 'clicktools' ); ?></a></li>
				<?php if ( clicktools_setting( 'feature_favorites' ) ) : ?>
					<li><a href="<?php echo esc_url( home_url( user_trailingslashit( 'favoritos' ) ) ); ?>"><?php esc_html_e( 'Favoritos', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<?php if ( clicktools_setting( 'feature_history' ) ) : ?>
					<li><a href="<?php echo esc_url( home_url( user_trailingslashit( 'historial' ) ) ); ?>"><?php esc_html_e( 'Historial local', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<?php if ( clicktools_page_url( 'blog' ) ) : ?>
					<li><a href="<?php echo esc_url( clicktools_page_url( 'blog' ) ); ?>"><?php esc_html_e( 'Blog y tutoriales', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<?php if ( clicktools_page_url( 'suggest' ) ) : ?>
					<li><a href="<?php echo esc_url( clicktools_page_url( 'suggest' ) ); ?>"><?php esc_html_e( 'Sugerir una herramienta', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<?php if ( clicktools_page_url( 'bug' ) ) : ?>
					<li><a href="<?php echo esc_url( clicktools_page_url( 'bug' ) ); ?>"><?php esc_html_e( 'Comunicar un error', 'clicktools' ); ?></a></li>
				<?php endif; ?>
				<li><a href="<?php echo esc_url( home_url( user_trailingslashit( 'estado' ) ) ); ?>"><?php esc_html_e( 'Estado del servicio', 'clicktools' ); ?></a></li>
			</ul>
		</nav>
		<nav aria-label="<?php esc_attr_e( 'Ayuda e información legal', 'clicktools' ); ?>">
			<p class="ct-footer__title"><?php esc_html_e( 'Ayuda', 'clicktools' ); ?></p>
			<ul>
				<?php foreach ( $clicktools_links as $clicktools_key => $clicktools_label ) : ?>
					<?php if ( clicktools_page_url( $clicktools_key ) ) : ?>
						<li><a href="<?php echo esc_url( clicktools_page_url( $clicktools_key ) ); ?>"><?php echo esc_html( $clicktools_label ); ?></a></li>
					<?php endif; ?>
				<?php endforeach; ?>
			</ul>
			<p class="ct-footer__title"><?php esc_html_e( 'Legal', 'clicktools' ); ?></p>
			<ul>
				<?php foreach ( $clicktools_legal as $clicktools_key => $clicktools_label ) : ?>
					<?php if ( clicktools_page_url( $clicktools_key ) ) : ?>
						<li><a href="<?php echo esc_url( clicktools_page_url( $clicktools_key ) ); ?>"><?php echo esc_html( $clicktools_label ); ?></a></li>
					<?php endif; ?>
				<?php endforeach; ?>
				<?php if ( Consent::banner_required() ) : ?>
					<li><button type="button" class="ct-linklike" data-ct-consent-open><?php esc_html_e( 'Configurar privacidad', 'clicktools' ); ?></button></li>
				<?php endif; ?>
			</ul>
		</nav>
	</div>
	<div class="ct-container ct-footer__bottom">
		<p>&copy; <?php echo esc_html( gmdate( 'Y' ) . ' ' . $clicktools_brand ); ?>. <?php echo esc_html( clicktools_setting( 'slogan' ) ); ?>.</p>
		<?php
		if ( has_nav_menu( 'clicktools-footer' ) ) {
			wp_nav_menu(
				array(
					'theme_location' => 'clicktools-footer',
					'container'      => 'nav',
					'menu_class'     => 'ct-footer__menu',
					'depth'          => 1,
				)
			);
		}
		?>
	</div>
</footer>
<?php clicktools_template( 'partials/search-dialog' ); ?>
<div class="ct-toast-region" aria-live="polite" aria-atomic="true" data-ct-toasts></div>
<?php wp_footer(); ?>
</body>
</html>
