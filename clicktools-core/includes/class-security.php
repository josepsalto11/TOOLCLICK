<?php
/**
 * Utilidades de seguridad: tokens de formulario, limitación de solicitudes,
 * cabeceras HTTP y anonimización de IP.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Seguridad.
 */
class Security {

	const TOKEN_TTL = 7200; // 2 horas.
	const TOKEN_MIN = 3;    // Segundos mínimos antes de enviar (anti-bots).

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_filter( 'wp_headers', array( __CLASS__, 'headers' ) );
	}

	/**
	 * Cabeceras de seguridad para las páginas públicas.
	 *
	 * @param array $headers Cabeceras.
	 * @return array
	 */
	public static function headers( $headers ) {
		if ( is_admin() ) {
			return $headers;
		}
		$headers['X-Content-Type-Options'] = 'nosniff';
		$headers['Referrer-Policy']        = 'strict-origin-when-cross-origin';
		$headers['X-Frame-Options']        = 'SAMEORIGIN';
		$headers['Permissions-Policy']     = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';
		return $headers;
	}

	/**
	 * Genera un token de formulario independiente de la sesión (compatible con caché de página,
	 * porque el navegador lo solicita en el momento de enviar).
	 *
	 * @param string $action Acción.
	 * @return string
	 */
	public static function create_token( $action ) {
		$time = time();
		return $time . '.' . self::sign( $action . '|' . $time );
	}

	/**
	 * Verifica un token.
	 *
	 * @param string $token  Token.
	 * @param string $action Acción.
	 * @return true|\WP_Error
	 */
	public static function verify_token( $token, $action ) {
		$parts = explode( '.', (string) $token );
		if ( 2 !== count( $parts ) || ! ctype_digit( $parts[0] ) ) {
			return new \WP_Error( 'ct_token', __( 'La sesión del formulario no es válida. Recarga la página e inténtalo de nuevo.', 'clicktools' ), array( 'status' => 403 ) );
		}
		$time = (int) $parts[0];
		if ( ! hash_equals( self::sign( $action . '|' . $time ), $parts[1] ) ) {
			return new \WP_Error( 'ct_token', __( 'La sesión del formulario no es válida. Recarga la página e inténtalo de nuevo.', 'clicktools' ), array( 'status' => 403 ) );
		}
		$age = time() - $time;
		if ( $age > self::TOKEN_TTL ) {
			return new \WP_Error( 'ct_token_expired', __( 'El formulario ha caducado. Recarga la página e inténtalo de nuevo.', 'clicktools' ), array( 'status' => 403 ) );
		}
		if ( $age < self::TOKEN_MIN ) {
			return new \WP_Error( 'ct_too_fast', __( 'Has enviado el formulario demasiado rápido. Espera unos segundos e inténtalo de nuevo.', 'clicktools' ), array( 'status' => 429 ) );
		}
		return true;
	}

	/**
	 * Firma HMAC con las sales de WordPress.
	 *
	 * @param string $data Datos.
	 * @return string
	 */
	private static function sign( $data ) {
		return substr( hash_hmac( 'sha256', $data, wp_salt( 'nonce' ) ), 0, 32 );
	}

	/**
	 * Identificador anónimo del cliente (hash de IP con sal rotatoria diaria). No se almacena la IP.
	 *
	 * @return string
	 */
	public static function client_hash() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0.0.0.0';
		return substr( hash_hmac( 'sha256', $ip . '|' . gmdate( 'Y-m-d' ), wp_salt( 'auth' ) ), 0, 24 );
	}

	/**
	 * Limitación de solicitudes por cliente y acción.
	 *
	 * @param string $action Acción.
	 * @param int    $max    Máximo de solicitudes.
	 * @param int    $window Ventana en segundos.
	 * @return bool true si se permite.
	 */
	public static function rate_limit( $action, $max, $window = HOUR_IN_SECONDS ) {
		if ( $max <= 0 ) {
			return true;
		}
		$key   = 'ct_rl_' . md5( $action . self::client_hash() );
		$count = (int) get_transient( $key );
		if ( $count >= $max ) {
			return false;
		}
		set_transient( $key, $count + 1, $window );
		return true;
	}
}
