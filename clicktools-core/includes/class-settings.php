<?php
/**
 * Ajustes globales del plugin.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Acceso centralizado y saneado a la opción clicktools_settings.
 */
class Settings {

	const OPTION = 'clicktools_settings';

	/**
	 * Caché en memoria.
	 *
	 * @var array|null
	 */
	private static $cache = null;

	/**
	 * Valores por defecto.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			// Marca.
			'brand_name'             => 'ClickTools',
			'slogan'                 => __( 'Todo lo que necesitas, en un clic', 'clicktools' ),
			'slogan_secondary'       => __( 'Herramientas útiles. Resultados rápidos', 'clicktools' ),
			// Identidad legal: debe completarla el propietario antes de publicar.
			'owner_name'             => '',
			'owner_nif'              => '',
			'owner_address'          => '',
			'owner_email'            => '',
			'owner_registry'         => '',
			'privacy_email'          => '',
			'hosting_provider'       => '',
			'legal_updated'          => '',
			// Contacto y formularios.
			'notify_email'           => '',
			'notify_on_message'      => false,
			'messages_retention'     => 365,
			// Plantilla.
			'site_shell'             => true,
			'show_blog_in_header'    => true,
			// Funciones de usuario.
			'feature_favorites'      => true,
			'feature_history'        => true,
			// Analítica propia agregada (sin cookies). Desactivada por defecto.
			'analytics_enabled'      => false,
			'analytics_respect_dnt'  => true,
			'analytics_retention'    => 400,
			// Analítica externa (solo tras consentimiento).
			'external_analytics_src' => '',
			'external_analytics_dom' => '',
			// Publicidad.
			'ads_enabled'            => false,
			'adsense_client'         => '',
			'ad_slot_home'           => '',
			'ad_slot_tool'           => '',
			'ad_slot_blog'           => '',
			'ad_slot_page'           => '',
			'consent_mode'           => 'builtin',
			// Límites del procesamiento local (orientativos para avisos).
			'client_max_mb'          => 200,
			// Procesamiento en servidor (desactivado por defecto).
			'server_enabled'         => false,
			'server_max_mb'          => 25,
			'server_timeout'         => 120,
			'server_rate_hour'       => 20,
			'path_libreoffice'       => '',
			'path_ghostscript'       => '',
			'path_qpdf'              => '',
			'path_ffmpeg'            => '',
			// SEO.
			'seo_output'             => 'auto',
			'gsc_verification'       => '',
			'redirects'              => '',
			// Mantenimiento.
			'maintenance'            => false,
			'maintenance_message'    => __( 'Estamos realizando tareas de mantenimiento. Vuelve a intentarlo en unos minutos.', 'clicktools' ),
			// Idiomas preparados (solo se muestran los activados y con traducción).
			'languages'              => array( 'es' ),
			'language_urls'          => '',
			// Desinstalación.
			'delete_on_uninstall'    => false,
		);
	}

	/**
	 * Todos los ajustes combinados con los valores por defecto.
	 *
	 * @return array
	 */
	public static function all() {
		if ( null === self::$cache ) {
			$saved       = get_option( self::OPTION, array() );
			self::$cache = wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
		}
		return self::$cache;
	}

	/**
	 * Obtiene un ajuste.
	 *
	 * @param string $key     Clave.
	 * @param mixed  $default Valor alternativo.
	 * @return mixed
	 */
	public static function get( $key, $default = null ) {
		$all = self::all();
		return array_key_exists( $key, $all ) ? $all[ $key ] : $default;
	}

	/**
	 * Guarda ajustes ya saneados.
	 *
	 * @param array $values Valores.
	 */
	public static function update( array $values ) {
		$current = self::all();
		$merged  = array_merge( $current, self::sanitize( $values, $current ) );
		update_option( self::OPTION, $merged, true );
		self::$cache = null;
	}

	/**
	 * Limpia la caché en memoria.
	 */
	public static function flush() {
		self::$cache = null;
	}

	/**
	 * Sanea los valores según su tipo por defecto.
	 *
	 * @param array $values  Valores recibidos.
	 * @param array $current Valores actuales.
	 * @return array
	 */
	public static function sanitize( array $values, array $current ) {
		$defaults = self::defaults();
		$out      = array();
		$emails   = array( 'owner_email', 'privacy_email', 'notify_email' );
		$urls     = array( 'external_analytics_src' );
		$textarea = array( 'owner_address', 'redirects', 'maintenance_message', 'language_urls' );
		$paths    = array( 'path_libreoffice', 'path_ghostscript', 'path_qpdf', 'path_ffmpeg' );

		foreach ( $values as $key => $value ) {
			if ( ! array_key_exists( $key, $defaults ) ) {
				continue;
			}
			$type = gettype( $defaults[ $key ] );
			if ( in_array( $key, $emails, true ) ) {
				$out[ $key ] = sanitize_email( $value );
			} elseif ( in_array( $key, $urls, true ) ) {
				$url         = esc_url_raw( trim( (string) $value ), array( 'https' ) );
				$out[ $key ] = $url;
			} elseif ( in_array( $key, $textarea, true ) ) {
				$out[ $key ] = sanitize_textarea_field( $value );
			} elseif ( in_array( $key, $paths, true ) ) {
				// Solo rutas absolutas simples a ejecutables, sin argumentos.
				$value       = trim( (string) $value );
				$out[ $key ] = preg_match( '#^/[A-Za-z0-9._/\-]+$#', $value ) ? $value : '';
			} elseif ( 'adsense_client' === $key ) {
				$value       = trim( (string) $value );
				$out[ $key ] = preg_match( '/^ca-pub-\d{10,20}$/', $value ) ? $value : '';
			} elseif ( 0 === strpos( $key, 'ad_slot_' ) ) {
				$out[ $key ] = preg_replace( '/\D/', '', (string) $value );
			} elseif ( 'consent_mode' === $key ) {
				$out[ $key ] = in_array( $value, array( 'builtin', 'external' ), true ) ? $value : 'builtin';
			} elseif ( 'seo_output' === $key ) {
				$out[ $key ] = in_array( $value, array( 'auto', 'on', 'off' ), true ) ? $value : 'auto';
			} elseif ( 'languages' === $key ) {
				$allowed     = array( 'es', 'ca', 'en' );
				$out[ $key ] = array_values( array_intersect( $allowed, (array) $value ) );
				if ( ! in_array( 'es', $out[ $key ], true ) ) {
					array_unshift( $out[ $key ], 'es' );
				}
			} elseif ( 'gsc_verification' === $key ) {
				$out[ $key ] = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $value );
			} elseif ( 'boolean' === $type ) {
				$out[ $key ] = (bool) $value;
			} elseif ( 'integer' === $type ) {
				$out[ $key ] = max( 0, (int) $value );
			} else {
				$out[ $key ] = sanitize_text_field( (string) $value );
			}
		}
		return $out;
	}

	/**
	 * Campos legales pendientes de completar.
	 *
	 * @return string[] Etiquetas legibles.
	 */
	public static function missing_legal_fields() {
		$labels  = array(
			'owner_name'    => __( 'Titular (nombre o razón social)', 'clicktools' ),
			'owner_nif'     => __( 'NIF/CIF', 'clicktools' ),
			'owner_address' => __( 'Domicilio', 'clicktools' ),
			'owner_email'   => __( 'Correo de contacto', 'clicktools' ),
			'privacy_email' => __( 'Correo para privacidad', 'clicktools' ),
		);
		$missing = array();
		foreach ( $labels as $key => $label ) {
			if ( '' === trim( (string) self::get( $key, '' ) ) ) {
				$missing[] = $label;
			}
		}
		return $missing;
	}
}
