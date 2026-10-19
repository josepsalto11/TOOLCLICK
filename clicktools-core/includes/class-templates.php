<?php
/**
 * Selección de plantillas y "carcasa" visual propia de ClickTools.
 *
 * El plugin incluye una carcasa completa (cabecera, pie y estilos) para que el
 * sitio funcione con cualquier tema. Puede limitarse a las rutas de ClickTools
 * desde Ajustes (opción "site_shell").
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Gestión de plantillas.
 */
class Templates {

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_filter( 'template_include', array( __CLASS__, 'template_include' ), 99 );
		add_action( 'template_redirect', array( __CLASS__, 'maintenance' ), 2 );
		add_action( 'after_setup_theme', array( __CLASS__, 'theme_support' ), 20 );
		add_action( 'init', array( __CLASS__, 'register_menus' ) );
	}

	/**
	 * Indica si la petición actual se renderiza con la carcasa de ClickTools.
	 *
	 * @return bool
	 */
	public static function is_shell_request() {
		if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || is_feed() || is_embed() ) {
			return false;
		}
		if ( clicktools_current_view() ) {
			return true;
		}
		return (bool) clicktools_setting( 'site_shell', true );
	}

	/**
	 * Selecciona la plantilla.
	 *
	 * @param string $template Plantilla propuesta por WordPress.
	 * @return string
	 */
	public static function template_include( $template ) {
		$view = clicktools_current_view();
		$map  = array(
			'catalog'   => 'catalog',
			'category'  => 'category',
			'tool'      => 'tool',
			'favorites' => 'favorites',
			'history'   => 'history',
			'status'    => 'status',
		);
		if ( $view && isset( $map[ $view ] ) ) {
			return self::locate( $map[ $view ] );
		}
		if ( ! self::is_shell_request() ) {
			return $template;
		}
		if ( is_404() ) {
			return self::locate( '404' );
		}
		if ( is_front_page() && self::is_home_page() ) {
			return self::locate( 'home' );
		}
		if ( is_singular( 'post' ) ) {
			return self::locate( 'single' );
		}
		if ( is_page() ) {
			return self::locate( 'page' );
		}
		if ( is_home() || is_archive() || is_search() ) {
			return self::locate( 'archive' );
		}
		if ( is_singular() ) {
			return self::locate( 'page' );
		}
		return $template;
	}

	/**
	 * La portada estática es la página de inicio creada por ClickTools.
	 *
	 * @return bool
	 */
	public static function is_home_page() {
		$pages = (array) get_option( 'clicktools_pages', array() );
		if ( 'page' === get_option( 'show_on_front' ) ) {
			return ! empty( $pages['home'] ) && (int) get_option( 'page_on_front' ) === (int) $pages['home'];
		}
		return is_home();
	}

	/**
	 * Ruta de una plantilla (el tema puede sobrescribirla en /clicktools/).
	 *
	 * @param string $name Nombre.
	 * @return string
	 */
	public static function locate( $name ) {
		$override = locate_template( 'clicktools/' . $name . '.php' );
		return $override ? $override : CLICKTOOLS_DIR . 'templates/' . $name . '.php';
	}

	/**
	 * Modo mantenimiento (503 para visitantes, acceso normal para administradores).
	 */
	public static function maintenance() {
		if ( ! clicktools_setting( 'maintenance' ) || current_user_can( 'manage_options' ) ) {
			return;
		}
		status_header( 503 );
		header( 'Retry-After: 1800' );
		nocache_headers();
		include self::locate( 'maintenance' );
		exit;
	}

	/**
	 * Soportes básicos cuando la carcasa está activa.
	 */
	public static function theme_support() {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	}

	/**
	 * Ubicaciones de menú opcionales.
	 */
	public static function register_menus() {
		register_nav_menus(
			array(
				'clicktools-header' => __( 'ClickTools: menú principal (opcional)', 'clicktools' ),
				'clicktools-footer' => __( 'ClickTools: enlaces del pie (opcional)', 'clicktools' ),
			)
		);
	}
}
