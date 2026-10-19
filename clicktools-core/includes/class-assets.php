<?php
/**
 * Registro y carga condicional de recursos.
 *
 * Solo se carga el motor JavaScript de la herramienta visitada; las bibliotecas
 * pesadas (PDF, QR, formateadores) se descargan bajo demanda desde el navegador.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Recursos CSS/JS.
 */
class Assets {

	/**
	 * Motores JavaScript disponibles y sus dependencias internas.
	 *
	 * @return array<string,array>
	 */
	public static function engines() {
		return array(
			'lib-zip'    => array( 'file' => 'lib/zip.js', 'deps' => array() ),
			'lib-csv'    => array( 'file' => 'lib/csv.js', 'deps' => array() ),
			'lib-diff'   => array( 'file' => 'lib/diff.js', 'deps' => array() ),
			'lib-expr'   => array( 'file' => 'lib/expr.js', 'deps' => array() ),
			'lib-imgmeta' => array( 'file' => 'lib/imgmeta.js', 'deps' => array() ),
			'lib-gif'    => array( 'file' => 'lib/gif.js', 'deps' => array() ),
			'calc'       => array( 'file' => 'engines/calc.js', 'deps' => array( 'lib-csv' ) ),
			'calc-basic' => array( 'file' => 'engines/calc-basic.js', 'deps' => array( 'calc' ) ),
			'calc-money' => array( 'file' => 'engines/calc-money.js', 'deps' => array( 'calc' ) ),
			'calc-home'  => array( 'file' => 'engines/calc-home.js', 'deps' => array( 'calc' ) ),
			'calculator' => array( 'file' => 'engines/calculator.js', 'deps' => array( 'lib-expr' ) ),
			'custom'     => array( 'file' => 'engines/custom.js', 'deps' => array( 'lib-expr' ) ),
			'units'      => array( 'file' => 'engines/units.js', 'deps' => array() ),
			'dates'      => array( 'file' => 'engines/dates.js', 'deps' => array( 'lib-csv' ) ),
			'text'       => array( 'file' => 'engines/text.js', 'deps' => array( 'lib-diff', 'lib-csv' ) ),
			'dev'        => array( 'file' => 'engines/dev.js', 'deps' => array( 'lib-diff', 'lib-csv' ) ),
			'qr'         => array( 'file' => 'engines/qr.js', 'deps' => array( 'lib-zip' ) ),
			'gen'        => array( 'file' => 'engines/gen.js', 'deps' => array( 'lib-csv' ) ),
			'security'   => array( 'file' => 'engines/security.js', 'deps' => array() ),
			'image'      => array( 'file' => 'engines/image.js', 'deps' => array( 'lib-zip', 'lib-imgmeta' ) ),
			'pdf'        => array( 'file' => 'engines/pdf.js', 'deps' => array( 'lib-zip', 'lib-diff' ) ),
			'media'      => array( 'file' => 'engines/media.js', 'deps' => array( 'lib-gif' ) ),
			'files'      => array( 'file' => 'engines/files.js', 'deps' => array( 'lib-zip', 'lib-imgmeta', 'lib-csv' ) ),
			'lists'      => array( 'file' => 'engines/lists.js', 'deps' => array( 'lib-csv' ) ),
			'prod'       => array( 'file' => 'engines/prod.js', 'deps' => array( 'lib-csv' ) ),
			'biz'        => array( 'file' => 'engines/biz.js', 'deps' => array() ),
			'server'     => array( 'file' => 'engines/server.js', 'deps' => array() ),
			'guide'      => array( 'file' => 'engines/guide.js', 'deps' => array() ),
		);
	}

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register' ), 5 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 20 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'dequeue_theme' ), 100 );
		add_action( 'wp_head', array( __CLASS__, 'early_theme_script' ), 1 );
	}

	/**
	 * URL de un recurso con versión.
	 *
	 * @param string $path Ruta relativa a assets/.
	 * @return string
	 */
	public static function url( $path ) {
		return CLICKTOOLS_URL . 'assets/' . ltrim( $path, '/' );
	}

	/**
	 * Registra estilos y scripts.
	 */
	public static function register() {
		$v = CLICKTOOLS_VERSION;
		wp_register_style( 'clicktools', self::url( 'css/clicktools.css' ), array(), $v );
		wp_register_style( 'clicktools-print', self::url( 'css/print.css' ), array( 'clicktools' ), $v, 'print' );

		$args = array(
			'in_footer' => true,
			'strategy'  => 'defer',
		);
		wp_register_script( 'clicktools-core', self::url( 'js/core.js' ), array( 'wp-i18n' ), $v, $args );
		wp_register_script( 'clicktools-ui', self::url( 'js/ui.js' ), array( 'clicktools-core' ), $v, $args );
		wp_set_script_translations( 'clicktools-core', 'clicktools', CLICKTOOLS_DIR . 'languages' );
		wp_set_script_translations( 'clicktools-ui', 'clicktools', CLICKTOOLS_DIR . 'languages' );

		foreach ( self::engines() as $name => $engine ) {
			$deps = array( 'clicktools-ui' );
			foreach ( $engine['deps'] as $dep ) {
				$deps[] = 'clicktools-' . $dep;
			}
			$handle = 'clicktools-' . $name;
			wp_register_script( $handle, self::url( 'js/' . $engine['file'] ), $deps, $v, $args );
			wp_set_script_translations( $handle, 'clicktools', CLICKTOOLS_DIR . 'languages' );
		}
	}

	/**
	 * Carga los recursos necesarios para la vista actual.
	 */
	public static function enqueue() {
		if ( ! Templates::is_shell_request() ) {
			// Fuera de la carcasa solo se cargan recursos en rutas propias o con shortcodes.
			return;
		}
		wp_enqueue_style( 'clicktools' );
		wp_enqueue_style( 'clicktools-print' );
		wp_enqueue_script( 'clicktools-core' );

		$view   = clicktools_current_view();
		$config = self::base_config();

		if ( in_array( $view, array( 'catalog', 'favorites', 'history' ), true ) || ( is_front_page() && Templates::is_home_page() ) ) {
			$config['catalog']   = Registry::search_index();
			$config['toolIcons'] = Registry::search_icons();
		}

		if ( 'tool' === $view ) {
			$tool = Registry::tool( sanitize_title( (string) get_query_var( 'ct_tool' ) ) );
			if ( $tool ) {
				$config['tool'] = self::tool_config( $tool );
				self::enqueue_engine( $tool['engine'] );
			}
		}

		if ( 'status' === $view ) {
			wp_enqueue_script( 'clicktools-ui' );
		}

		wp_localize_script( 'clicktools-core', 'ClickToolsConfig', $config );
	}

	/**
	 * Encola el motor de una herramienta.
	 *
	 * @param string $engine Nombre del motor.
	 */
	public static function enqueue_engine( $engine ) {
		$engines = self::engines();
		wp_enqueue_script( 'clicktools-ui' );
		if ( $engine && isset( $engines[ $engine ] ) ) {
			wp_enqueue_script( 'clicktools-' . $engine );
		}
	}

	/**
	 * Configuración común para JavaScript (sin datos personales).
	 *
	 * @return array
	 */
	public static function base_config() {
		return array(
			'home'      => home_url( '/' ),
			'rest'      => esc_url_raw( rest_url( 'clicktools/v1/' ) ),
			'version'   => CLICKTOOLS_VERSION,
			'brand'     => clicktools_setting( 'brand_name' ),
			'locale'    => str_replace( '_', '-', get_locale() ),
			'maxMb'     => (int) clicktools_setting( 'client_max_mb', 200 ),
			'features'  => array(
				'favorites' => (bool) clicktools_setting( 'feature_favorites' ),
				'history'   => (bool) clicktools_setting( 'feature_history' ),
			),
			'analytics' => Analytics::client_enabled(),
			'urls'      => array(
				'catalog'   => Registry::catalog_url(),
				'favorites' => home_url( user_trailingslashit( 'favoritos' ) ),
				'history'   => home_url( user_trailingslashit( 'historial' ) ),
				'suggest'   => clicktools_page_url( 'suggest' ),
				'privacy'   => clicktools_page_url( 'privacy' ),
				'cookies'   => clicktools_page_url( 'cookies' ),
			),
			'vendor'    => array(
				'pdflib'      => self::url( 'vendor/pdf-lib/pdf-lib.min.js' ) . '?ver=1.17.1',
				'pdfjs'       => self::url( 'vendor/pdfjs/pdf.min.js' ) . '?ver=3.11.174',
				'pdfjsWorker' => self::url( 'vendor/pdfjs/pdf.worker.min.js' ) . '?ver=3.11.174',
				'qrcode'      => self::url( 'vendor/qrcode/qrcode.js' ) . '?ver=1.4.4',
				'beautify'    => self::url( 'vendor/js-beautify/beautifier.min.js' ) . '?ver=1.15.1',
				'wordlist'    => self::url( 'vendor/wordlists/es.js' ) . '?ver=1',
			),
			'consent'   => Consent::client_config(),
			'icons'     => clicktools_icons_for_js(
				array( 'copy', 'download', 'trash-2', 'refresh-ccw', 'check', 'triangle-alert', 'info', 'upload', 'x', 'plus', 'minus', 'arrow-up', 'arrow-down', 'grip-vertical', 'rotate-cw', 'rotate-ccw', 'star', 'search', 'file', 'printer', 'play', 'pause', 'square', 'eye', 'eye-off', 'link', 'chevron-right', 'loader-circle', 'circle-check', 'circle-x', 'save', 'undo-2', 'move' )
			),
		);
	}

	/**
	 * Datos de la herramienta para su motor.
	 *
	 * @param array $tool Herramienta.
	 * @return array
	 */
	public static function tool_config( array $tool ) {
		$cats = Registry::categories();
		return array(
			'slug'       => $tool['slug'],
			'cat'        => $tool['cat'],
			'catName'    => $cats[ $tool['cat'] ]['name'],
			'name'       => $tool['name'],
			'url'        => Registry::url( $tool ),
			'icon'       => $tool['icon'],
			'engine'     => $tool['engine'],
			'key'        => $tool['key'],
			'config'     => $tool['config'],
			'processing' => $tool['processing'],
			'server'     => 'server' === $tool['processing'] ? Engines::client_info( $tool ) : null,
		);
	}

	/**
	 * Aplica el tema guardado antes de pintar para evitar parpadeos.
	 */
	public static function early_theme_script() {
		if ( ! Templates::is_shell_request() ) {
			return;
		}
		$js = "(function(){try{var t=localStorage.getItem('ct-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}document.documentElement.classList.add('ct-js');})();";
		if ( function_exists( 'wp_print_inline_script_tag' ) ) {
			wp_print_inline_script_tag( $js );
		} else {
			echo '<script>' . $js . '</script>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Cadena estática.
		}
	}

	/**
	 * Quita estilos del tema activo cuando la carcasa propia está en uso,
	 * para evitar conflictos visuales y peso innecesario.
	 */
	public static function dequeue_theme() {
		if ( ! Templates::is_shell_request() ) {
			return;
		}
		$theme_urls = array_unique( array( get_template_directory_uri(), get_stylesheet_directory_uri() ) );
		$styles     = wp_styles();
		foreach ( (array) $styles->queue as $handle ) {
			$src = isset( $styles->registered[ $handle ] ) ? (string) $styles->registered[ $handle ]->src : '';
			foreach ( $theme_urls as $url ) {
				if ( $src && 0 === strpos( $src, $url ) ) {
					wp_dequeue_style( $handle );
				}
			}
		}
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'wp-block-library-theme' );
		wp_dequeue_style( 'classic-theme-styles' );
		$scripts = wp_scripts();
		foreach ( (array) $scripts->queue as $handle ) {
			$src = isset( $scripts->registered[ $handle ] ) ? (string) $scripts->registered[ $handle ]->src : '';
			foreach ( $theme_urls as $url ) {
				if ( $src && 0 === strpos( $src, $url ) ) {
					wp_dequeue_script( $handle );
				}
			}
		}
	}
}
