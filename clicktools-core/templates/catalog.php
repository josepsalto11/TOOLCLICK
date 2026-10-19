<?php
/**
 * Catálogo completo con búsqueda, filtros, ordenación y paginación.
 *
 * Sin JavaScript se muestran todas las herramientas; con JavaScript se filtran
 * y se paginan en el navegador.
 *
 * @package ClickTools
 */

use ClickTools\Registry;
use ClickTools\SEO;

defined( 'ABSPATH' ) || exit;

$clicktools_seo   = SEO::current();
$clicktools_tools = Registry::sort( Registry::public_tools() );
$clicktools_cats  = Registry::categories_with_tools();
$clicktools_types = Registry::types();
$clicktools_used  = array_unique( wp_list_pluck( $clicktools_tools, 'type' ) );
$clicktools_pop   = \ClickTools\Analytics::popularity();
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Filtro público de solo lectura.
$clicktools_q     = isset( $_GET['q'] ) ? sanitize_text_field( wp_unslash( $_GET['q'] ) ) : '';

clicktools_template( 'shell/header' );
?>
<div class="ct-container">
	<?php clicktools_template( 'partials/breadcrumbs', array( 'crumbs' => $clicktools_seo['crumbs'] ) ); ?>
	<header class="ct-page-head">
		<h1 class="ct-page-head__title"><?php esc_html_e( 'Todas las herramientas', 'clicktools' ); ?></h1>
		<p class="ct-page-head__lead"><?php echo esc_html( sprintf( /* translators: %d: número */ __( '%d herramientas gratuitas que funcionan desde el navegador. Filtra por categoría, tipo o forma de procesamiento.', 'clicktools' ), count( $clicktools_tools ) ) ); ?></p>
	</header>

	<form class="ct-filters" data-ct-catalog-filters role="search" aria-label="<?php esc_attr_e( 'Filtrar herramientas', 'clicktools' ); ?>">
		<div class="ct-field ct-filters__q">
			<label for="ct-filter-q"><?php esc_html_e( 'Buscar', 'clicktools' ); ?></label>
			<input class="ct-input" id="ct-filter-q" type="search" name="q" value="<?php echo esc_attr( $clicktools_q ); ?>" placeholder="<?php esc_attr_e( 'Nombre, descripción o categoría', 'clicktools' ); ?>" autocomplete="off">
		</div>
		<div class="ct-field">
			<label for="ct-filter-cat"><?php esc_html_e( 'Categoría', 'clicktools' ); ?></label>
			<select class="ct-input" id="ct-filter-cat" name="cat">
				<option value=""><?php esc_html_e( 'Todas', 'clicktools' ); ?></option>
				<?php foreach ( $clicktools_cats as $clicktools_slug => $clicktools_cat ) : ?>
					<option value="<?php echo esc_attr( $clicktools_slug ); ?>"><?php echo esc_html( $clicktools_cat['name'] ); ?></option>
				<?php endforeach; ?>
			</select>
		</div>
		<div class="ct-field">
			<label for="ct-filter-type"><?php esc_html_e( 'Tipo', 'clicktools' ); ?></label>
			<select class="ct-input" id="ct-filter-type" name="type">
				<option value=""><?php esc_html_e( 'Todos', 'clicktools' ); ?></option>
				<?php foreach ( $clicktools_types as $clicktools_k => $clicktools_label ) : ?>
					<?php if ( in_array( $clicktools_k, $clicktools_used, true ) ) : ?>
						<option value="<?php echo esc_attr( $clicktools_k ); ?>"><?php echo esc_html( $clicktools_label ); ?></option>
					<?php endif; ?>
				<?php endforeach; ?>
			</select>
		</div>
		<div class="ct-field">
			<label for="ct-filter-proc"><?php esc_html_e( 'Disponibilidad', 'clicktools' ); ?></label>
			<select class="ct-input" id="ct-filter-proc" name="proc">
				<option value=""><?php esc_html_e( 'Todas', 'clicktools' ); ?></option>
				<option value="local"><?php esc_html_e( 'En tu navegador (sin subir archivos)', 'clicktools' ); ?></option>
				<option value="server"><?php esc_html_e( 'Procesadas en servidor', 'clicktools' ); ?></option>
			</select>
		</div>
		<div class="ct-field">
			<label for="ct-filter-sort"><?php esc_html_e( 'Ordenar por', 'clicktools' ); ?></label>
			<select class="ct-input" id="ct-filter-sort" name="sort">
				<option value="priority"><?php esc_html_e( 'Destacadas', 'clicktools' ); ?></option>
				<?php if ( $clicktools_pop ) : ?>
					<option value="popularity"><?php esc_html_e( 'Más usadas', 'clicktools' ); ?></option>
				<?php endif; ?>
				<option value="name"><?php esc_html_e( 'Nombre', 'clicktools' ); ?></option>
				<option value="category"><?php esc_html_e( 'Categoría', 'clicktools' ); ?></option>
			</select>
		</div>
	</form>

	<p class="ct-results-count" role="status" aria-live="polite" data-ct-count></p>

	<div class="ct-grid ct-grid--tools" data-ct-catalog data-page-size="48">
		<?php foreach ( $clicktools_tools as $tool ) : ?>
			<?php clicktools_template( 'partials/tool-card', array( 'tool' => $tool ) ); ?>
		<?php endforeach; ?>
	</div>

	<div class="ct-empty" data-ct-empty hidden>
		<span class="ct-empty__icon" aria-hidden="true"><?php echo clicktools_icon( 'search', 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
		<h2><?php esc_html_e( 'No hemos encontrado herramientas con esos filtros', 'clicktools' ); ?></h2>
		<p><?php esc_html_e( 'Prueba con otras palabras (por ejemplo, «convertir», «calcular» o el formato del archivo) o elimina algún filtro.', 'clicktools' ); ?></p>
		<p>
			<button type="button" class="ct-btn ct-btn--secondary" data-ct-reset-filters><?php esc_html_e( 'Quitar filtros', 'clicktools' ); ?></button>
			<?php if ( clicktools_page_url( 'suggest' ) ) : ?>
				<a class="ct-btn ct-btn--primary" href="<?php echo esc_url( clicktools_page_url( 'suggest' ) ); ?>"><?php esc_html_e( 'Sugerir esta herramienta', 'clicktools' ); ?></a>
			<?php endif; ?>
		</p>
	</div>

	<p class="ct-center"><button type="button" class="ct-btn ct-btn--secondary" data-ct-more hidden><?php esc_html_e( 'Mostrar más herramientas', 'clicktools' ); ?></button></p>
</div>
<?php
clicktools_template( 'shell/footer' );
