<?php
/**
 * Funciones auxiliares globales.
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

/**
 * Devuelve el marcado SVG de un icono (Lucide, ISC) ya escapado y seguro.
 *
 * @param string $name  Nombre del icono.
 * @param int    $size  Tamaño en píxeles.
 * @param string $class Clases CSS adicionales.
 * @return string
 */
function clicktools_icon( $name, $size = 20, $class = '' ) {
	static $icons = null;
	if ( null === $icons ) {
		$icons = require CLICKTOOLS_DIR . 'includes/icons.php';
	}
	$inner = isset( $icons[ $name ] ) ? $icons[ $name ] : $icons['sparkles'];
	$size  = absint( $size );
	return sprintf(
		'<svg class="ct-icon %1$s" width="%2$d" height="%2$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%3$s</svg>',
		esc_attr( $class ),
		$size,
		$inner // Contenido estático generado en el build, no procede de usuarios.
	);
}

/**
 * Lista de nombres de iconos disponibles.
 *
 * @return string[]
 */
function clicktools_icon_names() {
	$icons = require CLICKTOOLS_DIR . 'includes/icons.php';
	return array_keys( $icons );
}

/**
 * Marcado SVG en bruto de algunos iconos para JavaScript.
 *
 * @param string[] $names Iconos.
 * @return array<string,string>
 */
function clicktools_icons_for_js( array $names ) {
	$out = array();
	foreach ( $names as $n ) {
		$out[ $n ] = clicktools_icon( $n, 18 );
	}
	return $out;
}

/**
 * Lee un ajuste del plugin.
 *
 * @param string $key     Clave.
 * @param mixed  $default Valor por defecto si no existe.
 * @return mixed
 */
function clicktools_setting( $key, $default = null ) {
	return ClickTools\Settings::get( $key, $default );
}

/**
 * Carga una plantilla del plugin (permite sobrescribirla desde el tema en /clicktools/).
 *
 * @param string $name Ruta relativa sin extensión, p. ej. "partials/tool-card".
 * @param array  $args Variables disponibles en la plantilla.
 */
function clicktools_template( $name, array $args = array() ) {
	$name     = preg_replace( '/[^a-z0-9\/_-]/', '', $name );
	$override = locate_template( 'clicktools/' . $name . '.php' );
	$file     = $override ? $override : CLICKTOOLS_DIR . 'templates/' . $name . '.php';
	if ( ! file_exists( $file ) ) {
		return;
	}
	// phpcs:ignore WordPress.PHP.DontExtract.extract_extract -- Variables de plantilla controladas.
	extract( $args, EXTR_SKIP );
	include $file;
}

/**
 * Formatea una fecha Y-m-d de forma legible.
 *
 * @param string $ymd Fecha.
 * @return string
 */
function clicktools_date( $ymd ) {
	$ts = strtotime( $ymd );
	return $ts ? date_i18n( get_option( 'date_format' ), $ts ) : '';
}

/**
 * URL de una página creada por el instalador (privacidad, contacto...).
 *
 * @param string $key Clave de la página.
 * @return string
 */
function clicktools_page_url( $key ) {
	$pages = (array) get_option( 'clicktools_pages', array() );
	if ( ! empty( $pages[ $key ] ) && 'publish' === get_post_status( (int) $pages[ $key ] ) ) {
		return get_permalink( (int) $pages[ $key ] );
	}
	return '';
}

/**
 * Indica si la petición actual es una vista de HerramientasClave.
 *
 * @return string Nombre de la vista o cadena vacía.
 */
function clicktools_current_view() {
	return (string) get_query_var( 'ct_view' );
}
