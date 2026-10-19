<?php
/**
 * Gestión de consentimiento para scripts de terceros (publicidad y analítica externa).
 *
 * Ningún script de terceros se carga antes del consentimiento. La elección se
 * guarda en el navegador (localStorage) y puede cambiarse desde el pie de página.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Consentimiento.
 */
class Consent {

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'wp_footer', array( __CLASS__, 'banner' ), 5 );
	}

	/**
	 * ¿Hay publicidad configurada?
	 *
	 * @return bool
	 */
	public static function ads_configured() {
		return (bool) clicktools_setting( 'ads_enabled' ) && '' !== clicktools_setting( 'adsense_client', '' );
	}

	/**
	 * ¿Hay analítica externa configurada?
	 *
	 * @return bool
	 */
	public static function external_analytics_configured() {
		return '' !== clicktools_setting( 'external_analytics_src', '' );
	}

	/**
	 * ¿Debe mostrarse el banner integrado?
	 *
	 * @return bool
	 */
	public static function banner_required() {
		if ( 'external' === clicktools_setting( 'consent_mode' ) ) {
			return self::external_analytics_configured();
		}
		return self::ads_configured() || self::external_analytics_configured();
	}

	/**
	 * Configuración para el cliente.
	 *
	 * @return array
	 */
	public static function client_config() {
		return array(
			'required'  => self::banner_required(),
			'mode'      => clicktools_setting( 'consent_mode', 'builtin' ),
			'ads'       => self::ads_configured() ? array( 'client' => clicktools_setting( 'adsense_client' ) ) : null,
			'analytics' => self::external_analytics_configured() ? array(
				'src'    => clicktools_setting( 'external_analytics_src' ),
				'domain' => clicktools_setting( 'external_analytics_dom' ),
			) : null,
			'version'   => 1,
		);
	}

	/**
	 * Banner de consentimiento (solo si hace falta).
	 */
	public static function banner() {
		if ( ! Templates::is_shell_request() || ! self::banner_required() ) {
			return;
		}
		clicktools_template( 'partials/consent' );
	}
}
