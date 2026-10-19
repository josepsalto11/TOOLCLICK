<?php
/**
 * Buscador con autocompletado (combobox ARIA). Sin JavaScript envía al catálogo.
 *
 * @package ClickTools
 *
 * @var string $size  large|palette|inline
 * @var string $id    Identificador base.
 */

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

$size = isset( $size ) ? $size : 'large';
$id   = isset( $id ) ? $id : 'ct-search-' . wp_rand( 100, 999 );
?>
<form class="ct-search ct-search--<?php echo esc_attr( $size ); ?>" role="search" action="<?php echo esc_url( Registry::catalog_url() ); ?>" method="get" data-ct-search>
	<label class="ct-sr" for="<?php echo esc_attr( $id ); ?>"><?php esc_html_e( 'Buscar una herramienta', 'clicktools' ); ?></label>
	<span class="ct-search__icon" aria-hidden="true"><?php echo clicktools_icon( 'search', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
	<input class="ct-search__input" id="<?php echo esc_attr( $id ); ?>" name="q" type="search" autocomplete="off" spellcheck="false"
		role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="<?php echo esc_attr( $id ); ?>-list"
		placeholder="<?php esc_attr_e( 'Busca: comprimir PDF, calcular IVA, crear QR…', 'clicktools' ); ?>">
	<button class="ct-btn ct-btn--primary ct-search__submit" type="submit"><?php esc_html_e( 'Buscar', 'clicktools' ); ?></button>
	<ul class="ct-search__list" id="<?php echo esc_attr( $id ); ?>-list" role="listbox" aria-label="<?php esc_attr_e( 'Resultados', 'clicktools' ); ?>" hidden></ul>
	<p class="ct-sr" aria-live="polite" data-ct-search-status></p>
</form>
