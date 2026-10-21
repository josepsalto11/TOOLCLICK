<?php
/**
 * Shortcodes para usar componentes de HerramientasClave dentro de páginas y entradas.
 *
 * [clicktools_tool slug="calcular-iva"]   Inserta una herramienta.
 * [clicktools_tools cat="pdf" limit="6"]   Rejilla de herramientas.
 * [clicktools_search]                       Buscador.
 * [clicktools_form type="suggestion|bug|contact"]
 * [clicktools_owner field="owner_name"]     Datos legales configurables.
 * [clicktools_categories]                   Rejilla de categorías.
 * [clicktools_services]                     Servicios de terceros activos (según ajustes reales).
 * [clicktools_storage_list]                 Claves de almacenamiento local utilizadas.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Shortcodes.
 */
class Shortcodes {

	/**
	 * Registra shortcodes.
	 */
	public static function init() {
		add_shortcode( 'clicktools_tool', array( __CLASS__, 'tool' ) );
		add_shortcode( 'clicktools_tools', array( __CLASS__, 'tools' ) );
		add_shortcode( 'clicktools_categories', array( __CLASS__, 'categories' ) );
		add_shortcode( 'clicktools_search', array( __CLASS__, 'search' ) );
		add_shortcode( 'clicktools_form', array( __CLASS__, 'form' ) );
		add_shortcode( 'clicktools_owner', array( __CLASS__, 'owner' ) );
		add_shortcode( 'clicktools_services', array( __CLASS__, 'services' ) );
		add_shortcode( 'clicktools_storage_list', array( __CLASS__, 'storage_list' ) );
		add_shortcode( 'clicktools_link', array( __CLASS__, 'link' ) );
		add_shortcode( 'clicktools_legal_notice', array( __CLASS__, 'legal_notice' ) );
	}

	/**
	 * Asegura los estilos y el núcleo cuando se usa un shortcode fuera de la carcasa.
	 */
	private static function ensure_assets() {
		wp_enqueue_style( 'clicktools' );
		wp_enqueue_script( 'clicktools-core' );
		if ( ! wp_script_is( 'clicktools-core', 'done' ) && ! Templates::is_shell_request() ) {
			wp_localize_script( 'clicktools-core', 'ClickToolsConfig', Assets::base_config() );
		}
	}

	/**
	 * Herramienta incrustada.
	 *
	 * @param array $atts Atributos.
	 * @return string
	 */
	public static function tool( $atts ) {
		$atts = shortcode_atts( array( 'slug' => '' ), $atts );
		$tool = Registry::tool( sanitize_title( $atts['slug'] ) );
		if ( ! $tool ) {
			return '';
		}
		self::ensure_assets();
		Assets::enqueue_engine( $tool['engine'] );
		$config = Assets::tool_config( $tool );
		wp_add_inline_script( 'clicktools-core', 'window.ClickToolsEmbeds=window.ClickToolsEmbeds||{};window.ClickToolsEmbeds[' . wp_json_encode( $tool['slug'] ) . ']=' . wp_json_encode( $config ) . ';', 'before' );
		ob_start();
		clicktools_template( 'partials/tool-app', array( 'tool' => $tool, 'embed' => true ) );
		return ob_get_clean();
	}

	/**
	 * Rejilla de herramientas.
	 *
	 * @param array $atts Atributos.
	 * @return string
	 */
	public static function tools( $atts ) {
		$atts  = shortcode_atts(
			array(
				'cat'   => '',
				'limit' => 6,
				'slugs' => '',
			),
			$atts
		);
		$tools = array();
		if ( $atts['slugs'] ) {
			foreach ( array_map( 'trim', explode( ',', $atts['slugs'] ) ) as $slug ) {
				$t = Registry::tool( sanitize_title( $slug ) );
				if ( $t ) {
					$tools[ $t['slug'] ] = $t;
				}
			}
		} elseif ( $atts['cat'] ) {
			$tools = Registry::tools_in_category( sanitize_key( $atts['cat'] ) );
		} else {
			$tools = Registry::featured( 100 );
		}
		$tools = array_slice( $tools, 0, max( 1, (int) $atts['limit'] ), true );
		if ( ! $tools ) {
			return '';
		}
		self::ensure_assets();
		ob_start();
		echo '<div class="ct-grid ct-grid--tools">';
		foreach ( $tools as $tool ) {
			clicktools_template( 'partials/tool-card', array( 'tool' => $tool ) );
		}
		echo '</div>';
		return ob_get_clean();
	}

	/**
	 * Rejilla de categorías.
	 *
	 * @return string
	 */
	public static function categories() {
		self::ensure_assets();
		ob_start();
		clicktools_template( 'partials/category-grid' );
		return ob_get_clean();
	}

	/**
	 * Buscador.
	 *
	 * @return string
	 */
	public static function search() {
		self::ensure_assets();
		ob_start();
		clicktools_template( 'partials/search', array( 'size' => 'large' ) );
		return ob_get_clean();
	}

	/**
	 * Formulario de sugerencias, errores o contacto.
	 *
	 * @param array $atts Atributos.
	 * @return string
	 */
	public static function form( $atts ) {
		$atts = shortcode_atts( array( 'type' => 'suggestion' ), $atts );
		$type = array_key_exists( $atts['type'], Messages::types() ) ? $atts['type'] : 'suggestion';
		self::ensure_assets();
		ob_start();
		clicktools_template( 'partials/form', array( 'type' => $type ) );
		return ob_get_clean();
	}

	/**
	 * Dato legal del titular o marcador visible si falta.
	 *
	 * @param array $atts Atributos.
	 * @return string
	 */
	public static function owner( $atts ) {
		$atts    = shortcode_atts( array( 'field' => 'owner_name' ), $atts );
		$allowed = array( 'owner_name', 'owner_nif', 'owner_address', 'owner_email', 'owner_registry', 'privacy_email', 'hosting_provider', 'legal_updated', 'brand_name', 'site_domain' );
		if ( ! in_array( $atts['field'], $allowed, true ) ) {
			return '';
		}
		if ( 'site_domain' === $atts['field'] ) {
			// El dominio real del sitio (sin «www.»), para no depender de un dato escrito a mano.
			return esc_html( preg_replace( '/^www\./', '', (string) wp_parse_url( home_url(), PHP_URL_HOST ) ) );
		}
		$value = trim( (string) clicktools_setting( $atts['field'], '' ) );
		if ( '' === $value ) {
			if ( 'legal_updated' === $atts['field'] ) {
				return esc_html( date_i18n( get_option( 'date_format' ) ) );
			}
			return '<mark class="ct-placeholder" title="' . esc_attr__( 'Completa este dato en HerramientasClave > Ajustes > Datos legales', 'clicktools' ) . '">[' . esc_html__( 'Pendiente de completar por el titular', 'clicktools' ) . ']</mark>';
		}
		if ( false !== strpos( $atts['field'], 'email' ) ) {
			return '<a href="mailto:' . esc_attr( antispambot( $value ) ) . '">' . esc_html( antispambot( $value ) ) . '</a>';
		}
		return nl2br( esc_html( $value ) );
	}

	/**
	 * Enlace a una página creada por el plugin: [clicktools_link page="contact"]texto[/clicktools_link].
	 *
	 * @param array  $atts    Atributos.
	 * @param string $content Texto del enlace.
	 * @return string
	 */
	public static function link( $atts, $content = '' ) {
		$atts = shortcode_atts( array( 'page' => 'contact' ), $atts );
		$url  = clicktools_page_url( sanitize_key( $atts['page'] ) );
		$text = '' !== trim( (string) $content ) ? $content : __( 'formulario de contacto', 'clicktools' );
		if ( ! $url ) {
			return esc_html( $text );
		}
		return '<a href="' . esc_url( $url ) . '">' . esc_html( $text ) . '</a>';
	}

	/**
	 * Aviso de «plantilla orientativa»: solo se muestra mientras falten datos legales del titular.
	 *
	 * @return string
	 */
	public static function legal_notice() {
		if ( ! Settings::missing_legal_fields() ) {
			return '';
		}
		return '<p><em>' . esc_html__( 'Plantilla orientativa: el titular del sitio debe revisarla, completar los datos marcados y adaptarla a su situación real antes de publicar. No constituye asesoramiento jurídico.', 'clicktools' ) . '</em></p>';
	}

	/**
	 * Lista de servicios activos según la configuración real (para las políticas).
	 *
	 * @return string
	 */
	public static function services() {
		$items = array();
		if ( Consent::ads_configured() ) {
			$items[] = __( 'Publicidad de Google AdSense (Google Ireland Ltd.). Solo se carga tras tu consentimiento y puede usar cookies para mostrar y medir anuncios. Más información: policies.google.com/technologies/ads.', 'clicktools' );
		}
		if ( Consent::external_analytics_configured() ) {
			$host    = wp_parse_url( clicktools_setting( 'external_analytics_src' ), PHP_URL_HOST );
			/* translators: %s: dominio del servicio de analítica */
			$items[] = sprintf( __( 'Analítica externa servida desde %s. Solo se carga tras tu consentimiento.', 'clicktools' ), $host );
		}
		if ( clicktools_setting( 'analytics_enabled' ) ) {
			$items[] = __( 'Estadísticas propias agregadas y sin cookies: contamos visitas, usos completados y errores por herramienta, sin guardar IP, identificadores ni el contenido de tus archivos.', 'clicktools' );
		}
		if ( clicktools_setting( 'server_enabled' ) ) {
			$items[] = __( 'Procesamiento en servidor para algunas herramientas concretas, que lo indican antes de empezar. Los archivos se eliminan al terminar.', 'clicktools' );
		}
		if ( ! $items ) {
			return esc_html__( 'Actualmente no hay servicios de terceros, analítica ni procesamiento en servidor activos.', 'clicktools' );
		}
		return '<ul><li>' . implode( '</li><li>', array_map( 'esc_html', $items ) ) . '</li></ul>';
	}

	/**
	 * Claves de almacenamiento local que usa HerramientasClave.
	 *
	 * @return string
	 */
	public static function storage_list() {
		$items = array(
			'ct-theme'   => __( 'Tema claro u oscuro elegido.', 'clicktools' ),
			'ct-favs'    => __( 'Herramientas marcadas como favoritas.', 'clicktools' ),
			'ct-history' => __( 'Historial de herramientas usadas (solo si lo activas).', 'clicktools' ),
			'ct-consent' => __( 'Tu elección sobre servicios de terceros.', 'clicktools' ),
			'ct-data-*'  => __( 'Datos de herramientas de organización (listas, planificadores, temporizadores) cuando eliges guardarlos en este navegador.', 'clicktools' ),
		);
		$out = '<ul class="ct-storage-list">';
		foreach ( $items as $key => $desc ) {
			$out .= '<li><code>' . esc_html( $key ) . '</code>: ' . esc_html( $desc ) . '</li>';
		}
		return $out . '</ul>';
	}
}
