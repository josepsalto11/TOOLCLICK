<?php
/**
 * Arranque del plugin.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Clase principal (singleton).
 */
final class Plugin {

	/**
	 * Instancia.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Devuelve la instancia.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'load_textdomain' ), 0 );
		Router::init();
		Templates::init();
		Assets::init();
		SEO::init();
		Security::init();
		Messages::init();
		Consent::init();
		Analytics::init();
		Rest::init();
		Shortcodes::init();
		Installer::init();

		add_action( 'clicktools_hourly', array( 'ClickTools\\Engines', 'cleanup_stale' ) );

		if ( is_admin() ) {
			Admin\Admin::init();
		}
	}

	/**
	 * Carga traducciones (catalán, inglés... cuando existan en /languages).
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'clicktools', false, dirname( plugin_basename( CLICKTOOLS_FILE ) ) . '/languages' );
	}
}
