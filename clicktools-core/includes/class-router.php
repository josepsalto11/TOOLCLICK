<?php
/**
 * Rutas virtuales: catálogo, categorías, herramientas, favoritos, historial y estado.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Reglas de reescritura y resolución de vistas.
 */
class Router {

	/**
	 * Vistas fijas y su ruta.
	 *
	 * @return array<string,string> ruta => vista
	 */
	public static function fixed_routes() {
		return array(
			'herramientas' => 'catalog',
			'favoritos'    => 'favorites',
			'historial'    => 'history',
			'estado'       => 'status',
		);
	}

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'add_rules' ) );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'resolve' ), 1 );
		add_action( 'template_redirect', array( __CLASS__, 'custom_redirects' ), 0 );
		add_filter( 'redirect_canonical', array( __CLASS__, 'redirect_canonical' ), 10, 2 );
	}

	/**
	 * Reglas de reescritura.
	 */
	public static function add_rules() {
		foreach ( self::fixed_routes() as $path => $view ) {
			add_rewrite_rule( '^' . $path . '/?$', 'index.php?ct_view=' . $view, 'top' );
		}
		$cats = implode( '|', array_map( 'preg_quote', Registry::category_slugs() ) );
		if ( $cats ) {
			add_rewrite_rule( '^(' . $cats . ')/?$', 'index.php?ct_view=category&ct_cat=$matches[1]', 'top' );
			add_rewrite_rule( '^(' . $cats . ')/([a-z0-9-]+)/?$', 'index.php?ct_view=tool&ct_cat=$matches[1]&ct_tool=$matches[2]', 'top' );
		}

		// Regenera las reglas una sola vez si cambia la estructura.
		if ( get_option( 'clicktools_routes_hash' ) !== Registry::routes_hash() ) {
			update_option( 'clicktools_routes_hash', Registry::routes_hash() );
			flush_rewrite_rules( false );
		}
	}

	/**
	 * Variables de consulta públicas.
	 *
	 * @param array $vars Variables.
	 * @return array
	 */
	public static function query_vars( $vars ) {
		$vars[] = 'ct_view';
		$vars[] = 'ct_cat';
		$vars[] = 'ct_tool';
		return $vars;
	}

	/**
	 * Valida la vista solicitada; redirige alias o marca 404.
	 */
	public static function resolve() {
		$view = clicktools_current_view();
		if ( '' === $view ) {
			return;
		}
		$cat  = sanitize_title( (string) get_query_var( 'ct_cat' ) );
		$slug = sanitize_title( (string) get_query_var( 'ct_tool' ) );

		if ( 'category' === $view ) {
			$category = Registry::category( $cat );
			if ( ! $category || ! Registry::tools_in_category( $cat ) ) {
				self::not_found();
			}
			return;
		}

		if ( 'tool' === $view ) {
			$tool = Registry::tool( $slug );
			if ( ! $tool ) {
				$alias = Registry::tool_by_alias( $slug );
				if ( $alias ) {
					wp_safe_redirect( Registry::url( $alias ), 301 );
					exit;
				}
				self::not_found();
				return;
			}
			// Si la herramienta pertenece a otra categoría, redirige a su URL canónica.
			if ( $tool['cat'] !== $cat ) {
				wp_safe_redirect( Registry::url( $tool ), 301 );
				exit;
			}
			return;
		}

		if ( 'favorites' === $view && ! clicktools_setting( 'feature_favorites' ) ) {
			self::not_found();
		}
		if ( 'history' === $view && ! clicktools_setting( 'feature_history' ) ) {
			self::not_found();
		}
	}

	/**
	 * Convierte la petición en un 404.
	 */
	public static function not_found() {
		global $wp_query;
		set_query_var( 'ct_view', '' );
		$wp_query->set_404();
		status_header( 404 );
		nocache_headers();
	}

	/**
	 * Redirecciones configuradas por el administrador ("/antigua/ /nueva/").
	 */
	public static function custom_redirects() {
		$rules = (string) clicktools_setting( 'redirects', '' );
		if ( '' === trim( $rules ) || ! isset( $_SERVER['REQUEST_URI'] ) ) {
			return;
		}
		$request = wp_parse_url( esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH );
		$request = '/' . trim( (string) $request, '/' ) . '/';
		foreach ( preg_split( '/\r\n|\r|\n/', $rules ) as $line ) {
			$parts = preg_split( '/\s+/', trim( $line ) );
			if ( count( $parts ) < 2 || '' === $parts[0] || '#' === $parts[0][0] ) {
				continue;
			}
			$from = '/' . trim( $parts[0], '/' ) . '/';
			if ( $from === $request ) {
				$to = $parts[1];
				$to = ( 0 === strpos( $to, 'http' ) ) ? $to : home_url( $to );
				wp_safe_redirect( $to, 301 );
				exit;
			}
		}
	}

	/**
	 * Evita que WordPress "adivine" otra URL para nuestras rutas.
	 *
	 * @param string $redirect Destino.
	 * @param string $requested Solicitud.
	 * @return string|false
	 */
	public static function redirect_canonical( $redirect, $requested ) {
		if ( clicktools_current_view() ) {
			return false;
		}
		return $redirect;
	}
}
