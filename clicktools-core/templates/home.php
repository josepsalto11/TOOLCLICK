<?php
/**
 * Página de inicio.
 *
 * @package ClickTools
 */

use ClickTools\Registry;
use ClickTools\Ads;

defined( 'ABSPATH' ) || exit;

$clicktools_shortcuts = array( 'comprimir-pdf', 'jpg-a-png', 'calcular-iva', 'generador-qr', 'contador-palabras', 'calcular-porcentaje', 'unir-pdf', 'comprimir-imagen' );
$clicktools_recommend = array( 'calcular-descuento', 'dias-entre-fechas', 'generador-contrasenas', 'formatear-json', 'comparar-textos', 'calculadora-combustible', 'eliminar-metadatos-imagen', 'reparto-gastos' );
$clicktools_pick      = static function ( array $slugs ) {
	$out = array();
	foreach ( $slugs as $slug ) {
		$t = Registry::tool( $slug );
		if ( $t ) {
			$out[ $slug ] = $t;
		}
	}
	return $out;
};
$clicktools_featured  = Registry::featured( 12 );
$clicktools_latest    = array_slice( Registry::sort( Registry::public_tools(), 'added' ), 0, 6, true );
$clicktools_total     = count( Registry::public_tools() );
$clicktools_guides    = get_posts(
	array(
		'post_type'      => 'post',
		'post_status'    => 'publish',
		'posts_per_page' => 3,
		'category_name'  => 'guias',
	)
);
$clicktools_popular   = (bool) \ClickTools\Analytics::popularity();

clicktools_template( 'shell/header' );
?>
<section class="ct-hero">
	<div class="ct-container ct-hero__inner">
		<p class="ct-eyebrow"><?php echo esc_html( sprintf( /* translators: %d: número de herramientas */ __( '%d herramientas gratuitas · sin registro', 'clicktools' ), $clicktools_total ) ); ?></p>
		<h1 class="ct-hero__title"><?php echo esc_html( clicktools_setting( 'slogan' ) ); ?></h1>
		<p class="ct-hero__subtitle"><?php esc_html_e( 'Convierte, comprime, calcula y organiza tus archivos con herramientas rápidas, sencillas y seguras.', 'clicktools' ); ?></p>
		<?php clicktools_template( 'partials/search', array( 'size' => 'large', 'id' => 'ct-hero-search' ) ); ?>
		<ul class="ct-shortcuts" aria-label="<?php esc_attr_e( 'Accesos rápidos', 'clicktools' ); ?>">
			<?php foreach ( $clicktools_pick( $clicktools_shortcuts ) as $clicktools_t ) : ?>
				<li><a class="ct-shortcut" href="<?php echo esc_url( Registry::url( $clicktools_t ) ); ?>"><?php echo clicktools_icon( $clicktools_t['icon'], 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo esc_html( $clicktools_t['name'] ); ?></a></li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>

<?php if ( $clicktools_featured ) : ?>
<section class="ct-section" aria-labelledby="ct-popular">
	<div class="ct-container">
		<div class="ct-section__head">
			<div>
				<h2 id="ct-popular" class="ct-section__title"><?php esc_html_e( 'Herramientas populares', 'clicktools' ); ?></h2>
				<p class="ct-section__lead"><?php esc_html_e( 'Las que más se necesitan en el día a día.', 'clicktools' ); ?></p>
			</div>
			<div class="ct-sort">
				<label for="ct-home-sort"><?php esc_html_e( 'Ordenar por', 'clicktools' ); ?></label>
				<select id="ct-home-sort" class="ct-input ct-input--sm" data-ct-sort="#ct-popular-grid">
					<option value="priority"><?php esc_html_e( 'Destacadas', 'clicktools' ); ?></option>
					<?php if ( $clicktools_popular ) : ?>
						<option value="popularity"><?php esc_html_e( 'Más usadas', 'clicktools' ); ?></option>
					<?php endif; ?>
					<option value="name"><?php esc_html_e( 'Nombre', 'clicktools' ); ?></option>
					<option value="category"><?php esc_html_e( 'Categoría', 'clicktools' ); ?></option>
				</select>
			</div>
		</div>
		<div class="ct-grid ct-grid--tools" id="ct-popular-grid">
			<?php foreach ( $clicktools_featured as $tool ) : ?>
				<?php clicktools_template( 'partials/tool-card', array( 'tool' => $tool ) ); ?>
			<?php endforeach; ?>
		</div>
		<p class="ct-center"><a class="ct-btn ct-btn--secondary" href="<?php echo esc_url( Registry::catalog_url() ); ?>"><?php esc_html_e( 'Ver todas las herramientas', 'clicktools' ); ?> <?php echo clicktools_icon( 'arrow-right', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a></p>
	</div>
</section>
<?php endif; ?>

<section class="ct-section ct-section--alt" aria-labelledby="ct-cats">
	<div class="ct-container">
		<div class="ct-section__head">
			<div>
				<h2 id="ct-cats" class="ct-section__title"><?php esc_html_e( 'Explora por categorías', 'clicktools' ); ?></h2>
				<p class="ct-section__lead"><?php esc_html_e( 'Todo organizado para que encuentres la herramienta en segundos.', 'clicktools' ); ?></p>
			</div>
		</div>
		<?php clicktools_template( 'partials/category-grid' ); ?>
	</div>
</section>

<div class="ct-container"><?php Ads::slot( 'home' ); ?></div>

<?php $clicktools_rec = $clicktools_pick( $clicktools_recommend ); ?>
<?php if ( $clicktools_rec ) : ?>
<section class="ct-section" aria-labelledby="ct-recommended">
	<div class="ct-container">
		<div class="ct-section__head">
			<div>
				<h2 id="ct-recommended" class="ct-section__title"><?php esc_html_e( 'Recomendadas', 'clicktools' ); ?></h2>
				<p class="ct-section__lead"><?php esc_html_e( 'Pequeñas utilidades que ahorran mucho tiempo.', 'clicktools' ); ?></p>
			</div>
		</div>
		<div class="ct-grid ct-grid--tools">
			<?php foreach ( $clicktools_rec as $tool ) : ?>
				<?php clicktools_template( 'partials/tool-card', array( 'tool' => $tool ) ); ?>
			<?php endforeach; ?>
		</div>
	</div>
</section>
<?php endif; ?>

<section class="ct-section ct-section--alt" aria-labelledby="ct-benefits">
	<div class="ct-container">
		<h2 id="ct-benefits" class="ct-section__title ct-center"><?php esc_html_e( 'Herramientas sin instalación, pensadas para ti', 'clicktools' ); ?></h2>
		<ul class="ct-benefits" role="list">
			<li><span class="ct-benefits__icon" aria-hidden="true"><?php echo clicktools_icon( 'zap', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><h3><?php esc_html_e( 'Sin instalar nada', 'clicktools' ); ?></h3><p><?php esc_html_e( 'Funcionan en el navegador del ordenador, la tablet o el móvil. Sin registro.', 'clicktools' ); ?></p></li>
			<li><span class="ct-benefits__icon" aria-hidden="true"><?php echo clicktools_icon( 'shield-check', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><h3><?php esc_html_e( 'Privacidad real', 'clicktools' ); ?></h3><p><?php esc_html_e( 'La mayoría de herramientas procesan tus archivos en tu dispositivo, sin subirlos.', 'clicktools' ); ?></p></li>
			<li><span class="ct-benefits__icon" aria-hidden="true"><?php echo clicktools_icon( 'gauge', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><h3><?php esc_html_e( 'Resultados rápidos', 'clicktools' ); ?></h3><p><?php esc_html_e( 'Sin colas ni esperas: el resultado aparece al momento y se descarga con un clic.', 'clicktools' ); ?></p></li>
			<li><span class="ct-benefits__icon" aria-hidden="true"><?php echo clicktools_icon( 'info', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><h3><?php esc_html_e( 'Transparencia', 'clicktools' ); ?></h3><p><?php esc_html_e( 'Cada herramienta explica sus límites, sus fórmulas y cuándo un resultado es orientativo.', 'clicktools' ); ?></p></li>
		</ul>
	</div>
</section>

<?php if ( $clicktools_latest ) : ?>
<section class="ct-section" aria-labelledby="ct-latest">
	<div class="ct-container">
		<div class="ct-section__head">
			<div>
				<h2 id="ct-latest" class="ct-section__title"><?php esc_html_e( 'Últimas herramientas incorporadas', 'clicktools' ); ?></h2>
			</div>
		</div>
		<div class="ct-grid ct-grid--tools">
			<?php foreach ( $clicktools_latest as $tool ) : ?>
				<?php clicktools_template( 'partials/tool-card', array( 'tool' => $tool ) ); ?>
			<?php endforeach; ?>
		</div>
	</div>
</section>
<?php endif; ?>

<?php if ( $clicktools_guides ) : ?>
<section class="ct-section ct-section--alt" aria-labelledby="ct-guides">
	<div class="ct-container">
		<div class="ct-section__head">
			<div><h2 id="ct-guides" class="ct-section__title"><?php esc_html_e( 'Guías útiles', 'clicktools' ); ?></h2></div>
			<a class="ct-link-arrow" href="<?php echo esc_url( clicktools_page_url( 'blog' ) ); ?>"><?php esc_html_e( 'Ver el blog', 'clicktools' ); ?> <?php echo clicktools_icon( 'arrow-right', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
		</div>
		<div class="ct-grid ct-grid--posts">
			<?php foreach ( $clicktools_guides as $clicktools_post ) : ?>
				<article class="ct-card ct-card--post">
					<h3 class="ct-card__title"><a class="ct-card__link" href="<?php echo esc_url( get_permalink( $clicktools_post ) ); ?>"><?php echo esc_html( get_the_title( $clicktools_post ) ); ?></a></h3>
					<p class="ct-card__desc"><?php echo esc_html( get_the_excerpt( $clicktools_post ) ); ?></p>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
<?php endif; ?>

<section class="ct-section" aria-labelledby="ct-home-faq">
	<div class="ct-container ct-container--narrow">
		<h2 id="ct-home-faq" class="ct-section__title ct-center"><?php esc_html_e( 'Preguntas frecuentes', 'clicktools' ); ?></h2>
		<div class="ct-faq">
			<details class="ct-faq__item"><summary><?php esc_html_e( '¿HerramientasClave es gratis?', 'clicktools' ); ?></summary><p><?php esc_html_e( 'Sí. Todas las herramientas publicadas se pueden usar gratis y sin crear una cuenta.', 'clicktools' ); ?></p></details>
			<details class="ct-faq__item"><summary><?php esc_html_e( '¿Mis archivos se suben a internet?', 'clicktools' ); ?></summary><p><?php esc_html_e( 'En la mayoría de herramientas no: el procesamiento ocurre en tu navegador. Las herramientas que necesitan un servidor lo indican antes de empezar y eliminan el archivo al terminar.', 'clicktools' ); ?></p></details>
			<details class="ct-faq__item"><summary><?php esc_html_e( '¿Funciona en el móvil?', 'clicktools' ); ?></summary><p><?php esc_html_e( 'Sí. El diseño se adapta a cualquier pantalla y puedes seleccionar archivos y descargar resultados desde el móvil. En archivos muy grandes, la memoria del dispositivo puede ser un límite.', 'clicktools' ); ?></p></details>
			<details class="ct-faq__item"><summary><?php esc_html_e( '¿Puedo guardar mis herramientas favoritas?', 'clicktools' ); ?></summary><p><?php esc_html_e( 'Sí. Pulsa «Añadir a favoritos» en cualquier herramienta. Se guardan solo en tu navegador.', 'clicktools' ); ?></p></details>
		</div>
	</div>
</section>

<?php if ( clicktools_page_url( 'suggest' ) ) : ?>
<section class="ct-section">
	<div class="ct-container">
		<div class="ct-cta">
			<div>
				<h2 class="ct-cta__title"><?php esc_html_e( '¿Qué herramienta necesitas?', 'clicktools' ); ?></h2>
				<p><?php esc_html_e( 'Cuéntanos qué problema quieres resolver. Revisamos cada sugerencia y priorizamos las más útiles.', 'clicktools' ); ?></p>
			</div>
			<a class="ct-btn ct-btn--primary" href="<?php echo esc_url( clicktools_page_url( 'suggest' ) ); ?>"><?php esc_html_e( 'Sugerir una herramienta', 'clicktools' ); ?></a>
		</div>
	</div>
</section>
<?php endif; ?>
<?php
clicktools_template( 'shell/footer' );
