<?php
/**
 * API REST pública mínima: catálogo, token de formulario, mensajes, eventos
 * agregados y procesamiento en servidor.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Rutas REST.
 */
class Rest {

	const NS = 'clicktools/v1';

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/**
	 * Registra rutas.
	 */
	public static function routes() {
		register_rest_route(
			self::NS,
			'/catalog',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'catalog' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/token',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'token' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'action' => array(
						'type'     => 'string',
						'enum'     => array( 'message', 'process' ),
						'required' => true,
					),
				),
			)
		);
		register_rest_route(
			self::NS,
			'/message',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'message' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/event',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'event' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/process/(?P<slug>[a-z0-9-]+)',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'process' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * Catálogo público para el buscador.
	 *
	 * @return \WP_REST_Response
	 */
	public static function catalog() {
		$response = new \WP_REST_Response(
			array(
				'tools'      => Registry::search_index(),
				'icons'      => Registry::search_icons(),
				'categories' => array_map(
					static function ( $c ) {
						return array(
							'slug' => $c['slug'],
							'name' => $c['name'],
							'url'  => Registry::category_url( $c['slug'] ),
						);
					},
					array_values( Registry::categories_with_tools() )
				),
				'popularity' => Analytics::popularity(),
			)
		);
		$response->header( 'Cache-Control', 'public, max-age=3600' );
		return $response;
	}

	/**
	 * Token de formulario (no se cachea).
	 *
	 * @param \WP_REST_Request $request Solicitud.
	 * @return \WP_REST_Response
	 */
	public static function token( \WP_REST_Request $request ) {
		$response = new \WP_REST_Response( array( 'token' => Security::create_token( $request->get_param( 'action' ) ) ) );
		$response->header( 'Cache-Control', 'no-store, max-age=0' );
		return $response;
	}

	/**
	 * Recepción de mensajes.
	 *
	 * @param \WP_REST_Request $request Solicitud.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function message( \WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_body_params();
		}
		$result = Messages::submit( (array) $params );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new \WP_REST_Response( $result, 201 );
	}

	/**
	 * Evento de analítica agregada.
	 *
	 * @param \WP_REST_Request $request Solicitud.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function event( \WP_REST_Request $request ) {
		$params = json_decode( $request->get_body(), true );
		$result = Analytics::record( is_array( $params ) ? $params : array() );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new \WP_REST_Response( null, 204 );
	}

	/**
	 * Procesamiento en servidor.
	 *
	 * @param \WP_REST_Request $request Solicitud.
	 * @return \WP_Error|void
	 */
	public static function process( \WP_REST_Request $request ) {
		$tool = Registry::tool( $request->get_param( 'slug' ), false );
		if ( ! $tool || 'server' !== $tool['processing'] || empty( $tool['enabled'] ) ) {
			return new \WP_Error( 'ct_not_found', __( 'Herramienta no encontrada.', 'clicktools' ), array( 'status' => 404 ) );
		}
		return Engines::process( $tool, $request );
	}
}
