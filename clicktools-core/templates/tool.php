<?php
/**
 * Página individual de herramienta.
 *
 * @package ClickTools
 */

use ClickTools\Registry;
use ClickTools\SEO;
use ClickTools\Ads;

defined( 'ABSPATH' ) || exit;

$tool = Registry::tool( sanitize_title( (string) get_query_var( 'ct_tool' ) ) );
if ( ! $tool ) {
	include __DIR__ . '/404.php';
	return;
}
$clicktools_cat     = Registry::category( $tool['cat'] );
$clicktools_seo     = SEO::current();
$clicktools_related = Registry::related( $tool, 6 );
$clicktools_types   = Registry::types();
$clicktools_bug_url = clicktools_page_url( 'bug' );

clicktools_template( 'shell/header' );
?>
<div class="ct-container ct-tool-page">
	<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_seo['crumbs'] ) ); ?>

	<header class="ct-tool-hero">
		<span class="ct-tool-hero__icon" aria-hidden="true"><?php echo clicktools_icon( $tool['icon'], 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
		<div class="ct-tool-hero__text">
			<h1 class="ct-tool-hero__title"><?php echo esc_html( $tool['h1'] ); ?></h1>
			<p class="ct-tool-hero__intro"><?php echo esc_html( $tool['intro'] ); ?></p>
			<p class="ct-tool-hero__meta">
				<span class="ct-chip"><?php echo esc_html( $clicktools_types[ $tool['type'] ] ?? $tool['type'] ); ?></span>
				<?php if ( 'server' === $tool['processing'] ) : ?>
					<span class="ct-chip ct-chip--warn"><?php echo clicktools_icon( 'upload', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Procesado en servidor', 'clicktools' ); ?></span>
				<?php elseif ( 'guia' !== $tool['type'] ) : ?>
					<span class="ct-chip ct-chip--ok"><?php echo clicktools_icon( 'shield-check', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Sin subir archivos', 'clicktools' ); ?></span>
				<?php endif; ?>
				<?php if ( 'beta' === $tool['status'] ) : ?>
					<span class="ct-chip ct-chip--beta"><?php esc_html_e( 'Beta', 'clicktools' ); ?></span>
				<?php endif; ?>
			</p>
		</div>
		<div class="ct-tool-hero__actions">
			<?php if ( clicktools_setting( 'feature_favorites' ) ) : ?>
				<button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-ct-fav="<?php echo esc_attr( $tool['slug'] ); ?>" aria-pressed="false">
					<?php echo clicktools_icon( 'star', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span data-ct-fav-label><?php esc_html_e( 'Añadir a favoritos', 'clicktools' ); ?></span>
				</button>
			<?php endif; ?>
			<button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-ct-copy-link="<?php echo esc_url( Registry::url( $tool ) ); ?>">
				<?php echo clicktools_icon( 'link', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'Copiar enlace', 'clicktools' ); ?>
			</button>
		</div>
	</header>

	<?php clicktools_template( 'partials/tool-app', array( 'tool' => $tool ) ); ?>
	<?php clicktools_template( 'partials/privacy-note', array( 'tool' => $tool ) ); ?>

	<?php Ads::slot( 'tool' ); ?>

	<div class="ct-tool-content">
		<div class="ct-prose ct-tool-content__main">
			<?php if ( $tool['steps'] ) : ?>
				<section aria-labelledby="ct-howto">
					<h2 id="ct-howto"><?php echo esc_html( sprintf( /* translators: %s: herramienta */ __( 'Cómo usar: %s', 'clicktools' ), $tool['name'] ) ); ?></h2>
					<ol class="ct-steps">
						<?php foreach ( $tool['steps'] as $clicktools_step ) : ?>
							<li><?php echo wp_kses( $clicktools_step, array( 'strong' => array(), 'em' => array(), 'code' => array() ) ); ?></li>
						<?php endforeach; ?>
					</ol>
				</section>
			<?php endif; ?>

			<?php if ( $tool['examples'] ) : ?>
				<section aria-labelledby="ct-examples">
					<h2 id="ct-examples"><?php esc_html_e( 'Ejemplos de uso', 'clicktools' ); ?></h2>
					<ul>
						<?php foreach ( $tool['examples'] as $clicktools_example ) : ?>
							<li><?php echo wp_kses( $clicktools_example, array( 'strong' => array(), 'em' => array(), 'code' => array() ) ); ?></li>
						<?php endforeach; ?>
					</ul>
				</section>
			<?php endif; ?>

			<?php if ( $tool['faq'] ) : ?>
				<section aria-labelledby="ct-faq">
					<h2 id="ct-faq"><?php esc_html_e( 'Preguntas frecuentes', 'clicktools' ); ?></h2>
					<div class="ct-faq">
						<?php foreach ( $tool['faq'] as $clicktools_qa ) : ?>
							<details class="ct-faq__item">
								<summary><?php echo esc_html( $clicktools_qa[0] ); ?></summary>
								<p><?php echo wp_kses( $clicktools_qa[1], array( 'strong' => array(), 'em' => array(), 'code' => array() ) ); ?></p>
							</details>
						<?php endforeach; ?>
					</div>
				</section>
			<?php endif; ?>
		</div>

		<aside class="ct-tool-content__side" aria-label="<?php esc_attr_e( 'Más herramientas', 'clicktools' ); ?>">
			<?php if ( $clicktools_related ) : ?>
				<h2 class="ct-side-title"><?php esc_html_e( 'Herramientas relacionadas', 'clicktools' ); ?></h2>
				<ul class="ct-related">
					<?php foreach ( $clicktools_related as $clicktools_rel ) : ?>
						<li>
							<a href="<?php echo esc_url( Registry::url( $clicktools_rel ) ); ?>">
								<span class="ct-related__icon" aria-hidden="true"><?php echo clicktools_icon( $clicktools_rel['icon'], 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
								<span><strong><?php echo esc_html( $clicktools_rel['name'] ); ?></strong><small><?php echo esc_html( $clicktools_rel['desc'] ); ?></small></span>
							</a>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
			<p><a class="ct-btn ct-btn--secondary ct-btn--block" href="<?php echo esc_url( Registry::category_url( $clicktools_cat['slug'] ) ); ?>"><?php echo esc_html( sprintf( /* translators: %s: categoría */ __( 'Ver todo en %s', 'clicktools' ), $clicktools_cat['name'] ) ); ?></a></p>
			<?php if ( $clicktools_bug_url ) : ?>
				<p class="ct-side-small"><?php echo clicktools_icon( 'bug', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?> <a href="<?php echo esc_url( add_query_arg( 'herramienta', $tool['slug'], $clicktools_bug_url ) ); ?>"><?php esc_html_e( '¿Algo no funciona? Comunícanos el error', 'clicktools' ); ?></a></p>
			<?php endif; ?>
		</aside>
	</div>
</div>
<?php
clicktools_template( 'shell/footer' );
