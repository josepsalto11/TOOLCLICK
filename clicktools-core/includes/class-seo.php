<?php
/**
 * SEO técnico: títulos, descripciones, canonical, Open Graph, datos estructurados,
 * mapa del sitio y robots.txt.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * SEO.
 */
class SEO {

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_filter( 'document_title_parts', array( __CLASS__, 'title_parts' ), 20 );
		add_filter( 'document_title_separator', array( __CLASS__, 'separator' ) );
		add_action( 'wp_head', array( __CLASS__, 'head' ), 2 );
		add_filter( 'wp_robots', array( __CLASS__, 'robots_meta' ) );
		add_action( 'init', array( __CLASS__, 'sitemaps' ) );
		add_filter( 'wp_sitemaps_add_provider', array( __CLASS__, 'filter_providers' ), 10, 2 );
		add_filter( 'robots_txt', array( __CLASS__, 'robots_txt' ), 10, 2 );

		// Compatibilidad con plugins SEO: se les pasan nuestros datos en las rutas virtuales.
		add_filter( 'wpseo_title', array( __CLASS__, 'plugin_title' ) );
		add_filter( 'wpseo_metadesc', array( __CLASS__, 'plugin_desc' ) );
		add_filter( 'wpseo_canonical', array( __CLASS__, 'plugin_canonical' ) );
		add_filter( 'wpseo_opengraph_url', array( __CLASS__, 'plugin_canonical' ) );
		add_filter( 'wpseo_opengraph_title', array( __CLASS__, 'plugin_title' ) );
		add_filter( 'wpseo_opengraph_desc', array( __CLASS__, 'plugin_desc' ) );
		add_filter( 'rank_math/frontend/title', array( __CLASS__, 'plugin_title' ) );
		add_filter( 'rank_math/frontend/description', array( __CLASS__, 'plugin_desc' ) );
		add_filter( 'rank_math/frontend/canonical', array( __CLASS__, 'plugin_canonical' ) );
	}

	/**
	 * ¿Hay un plugin SEO activo?
	 *
	 * @return bool
	 */
	public static function seo_plugin_active() {
		return defined( 'WPSEO_VERSION' ) || class_exists( 'RankMath' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || defined( 'THE_SEO_FRAMEWORK_VERSION' );
	}

	/**
	 * ¿Debe HerramientasClave imprimir sus propias etiquetas SEO?
	 *
	 * @return bool
	 */
	public static function own_output() {
		$mode = clicktools_setting( 'seo_output', 'auto' );
		if ( 'on' === $mode ) {
			return true;
		}
		if ( 'off' === $mode ) {
			return false;
		}
		return ! self::seo_plugin_active();
	}

	/**
	 * Datos SEO de la vista actual de HerramientasClave.
	 *
	 * @return array|null title, desc, canonical, crumbs, tool, noindex
	 */
	public static function current() {
		static $data = false;
		if ( false !== $data ) {
			return $data;
		}
		$data  = null;
		$view  = clicktools_current_view();
		$brand = clicktools_setting( 'brand_name', 'HerramientasClave' );
		$home  = array(
			'name' => __( 'Inicio', 'clicktools' ),
			'url'  => home_url( '/' ),
		);
		$all   = array(
			'name' => __( 'Herramientas', 'clicktools' ),
			'url'  => Registry::catalog_url(),
		);
		switch ( $view ) {
			case 'catalog':
				$data = array(
					'title'     => __( 'Todas las herramientas online gratuitas', 'clicktools' ),
					'desc'      => __( 'Catálogo completo de herramientas gratuitas de HerramientasClave: PDF, imágenes, texto, calculadoras, conversores, QR, fechas y más. Sin registro y desde el navegador.', 'clicktools' ),
					'canonical' => Registry::catalog_url(),
					'crumbs'    => array( $home, $all ),
				);
				break;
			case 'category':
				$cat = Registry::category( (string) get_query_var( 'ct_cat' ) );
				if ( $cat ) {
					$data = array(
						'title'     => $cat['seo_title'] ? $cat['seo_title'] : $cat['name'],
						'desc'      => $cat['meta'] ? $cat['meta'] : $cat['desc'],
						'canonical' => Registry::category_url( $cat['slug'] ),
						'crumbs'    => array( $home, $all, array( 'name' => $cat['name'], 'url' => Registry::category_url( $cat['slug'] ) ) ),
					);
				}
				break;
			case 'tool':
				$tool = Registry::tool( (string) get_query_var( 'ct_tool' ) );
				if ( $tool ) {
					$cat  = Registry::category( $tool['cat'] );
					$data = array(
						'title'     => $tool['seo_title'],
						'desc'      => $tool['meta'],
						'canonical' => Registry::url( $tool ),
						'tool'      => $tool,
						'crumbs'    => array(
							$home,
							array( 'name' => $cat['name'], 'url' => Registry::category_url( $cat['slug'] ) ),
							array( 'name' => $tool['name'], 'url' => Registry::url( $tool ) ),
						),
					);
				}
				break;
			case 'favorites':
				$data = array(
					'title'     => __( 'Tus herramientas favoritas', 'clicktools' ),
					'desc'      => __( 'Accede rápidamente a las herramientas que has marcado como favoritas en este navegador.', 'clicktools' ),
					'canonical' => home_url( user_trailingslashit( 'favoritos' ) ),
					'crumbs'    => array( $home, array( 'name' => __( 'Favoritos', 'clicktools' ), 'url' => home_url( user_trailingslashit( 'favoritos' ) ) ) ),
					'noindex'   => true,
				);
				break;
			case 'history':
				$data = array(
					'title'     => __( 'Historial local de herramientas', 'clicktools' ),
					'desc'      => __( 'Historial opcional de herramientas usadas, guardado solo en tu navegador.', 'clicktools' ),
					'canonical' => home_url( user_trailingslashit( 'historial' ) ),
					'crumbs'    => array( $home, array( 'name' => __( 'Historial', 'clicktools' ), 'url' => home_url( user_trailingslashit( 'historial' ) ) ) ),
					'noindex'   => true,
				);
				break;
			case 'status':
				$data = array(
					'title'     => __( 'Estado del servicio', 'clicktools' ),
					'desc'      => __( 'Estado de las herramientas, motores de procesamiento y compatibilidad de tu navegador.', 'clicktools' ),
					'canonical' => home_url( user_trailingslashit( 'estado' ) ),
					'crumbs'    => array( $home, array( 'name' => __( 'Estado del servicio', 'clicktools' ), 'url' => home_url( user_trailingslashit( 'estado' ) ) ) ),
					'noindex'   => true,
				);
				break;
		}
		if ( $data ) {
			$data['brand'] = $brand;
		}
		return $data;
	}

	/**
	 * Partes del título.
	 *
	 * @param array $parts Partes.
	 * @return array
	 */
	public static function title_parts( $parts ) {
		$data = self::current();
		if ( $data ) {
			$parts['title'] = $data['title'];
			$parts['site']  = $data['brand'];
			unset( $parts['tagline'] );
		} elseif ( is_front_page() && Templates::is_home_page() ) {
			$parts['title'] = clicktools_setting( 'brand_name' ) . ': ' . clicktools_setting( 'slogan' );
			unset( $parts['site'], $parts['tagline'] );
		} elseif ( isset( $parts['site'] ) && '' !== (string) clicktools_setting( 'brand_name' ) ) {
			// Resto de páginas (legales, blog…): la marca configurada en lugar del nombre del sitio de WordPress.
			$parts['site'] = clicktools_setting( 'brand_name' );
		}
		return $parts;
	}

	/**
	 * Separador del título.
	 *
	 * @param string $sep Separador.
	 * @return string
	 */
	public static function separator( $sep ) {
		return Templates::is_shell_request() ? '|' : $sep;
	}

	/**
	 * Meta robots.
	 *
	 * @param array $robots Directivas.
	 * @return array
	 */
	public static function robots_meta( $robots ) {
		$data = self::current();
		if ( $data && ! empty( $data['noindex'] ) ) {
			$robots['noindex'] = true;
			$robots['follow']  = true;
		}
		if ( is_search() || ( is_404() && Templates::is_shell_request() ) ) {
			$robots['noindex'] = true;
		}
		return $robots;
	}

	/**
	 * Descripción para la vista actual.
	 *
	 * @return string
	 */
	public static function description() {
		$data = self::current();
		if ( $data ) {
			return $data['desc'];
		}
		if ( is_front_page() ) {
			return __( 'Convierte, comprime, calcula y organiza tus archivos con herramientas rápidas, sencillas y seguras. Gratis, sin registro y desde el navegador.', 'clicktools' );
		}
		if ( is_singular() ) {
			$post = get_queried_object();
			if ( $post instanceof \WP_Post ) {
				$excerpt = has_excerpt( $post ) ? $post->post_excerpt : wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
				return wp_trim_words( $excerpt, 28, '…' );
			}
		}
		if ( is_category() || is_tag() ) {
			return wp_strip_all_tags( term_description() );
		}
		return '';
	}

	/**
	 * Canonical de la vista actual (solo vistas propias y archivos).
	 *
	 * @return string
	 */
	public static function canonical() {
		$data = self::current();
		return $data ? $data['canonical'] : '';
	}

	/**
	 * Imprime las etiquetas en <head>.
	 */
	public static function head() {
		$verification = clicktools_setting( 'gsc_verification' );
		if ( $verification ) {
			printf( '<meta name="google-site-verification" content="%s" />' . "\n", esc_attr( $verification ) );
		}
		if ( ! self::own_output() || ! Templates::is_shell_request() ) {
			return;
		}
		$desc      = self::description();
		$canonical = self::canonical();
		$title     = wp_get_document_title();

		if ( $desc ) {
			printf( '<meta name="description" content="%s" />' . "\n", esc_attr( $desc ) );
		}
		if ( $canonical ) {
			printf( '<link rel="canonical" href="%s" />' . "\n", esc_url( $canonical ) );
		}
		$url = $canonical ? $canonical : ( is_singular() ? get_permalink() : home_url( '/' ) );
		printf( '<meta property="og:site_name" content="%s" />' . "\n", esc_attr( clicktools_setting( 'brand_name' ) ) );
		printf( '<meta property="og:locale" content="%s" />' . "\n", esc_attr( get_locale() ) );
		printf( '<meta property="og:type" content="%s" />' . "\n", is_singular( 'post' ) ? 'article' : 'website' );
		printf( '<meta property="og:title" content="%s" />' . "\n", esc_attr( $title ) );
		if ( $desc ) {
			printf( '<meta property="og:description" content="%s" />' . "\n", esc_attr( $desc ) );
		}
		printf( '<meta property="og:url" content="%s" />' . "\n", esc_url( $url ) );
		if ( is_singular() && has_post_thumbnail() ) {
			printf( '<meta property="og:image" content="%s" />' . "\n", esc_url( get_the_post_thumbnail_url( null, 'large' ) ) );
		}
		echo '<meta name="twitter:card" content="summary" />' . "\n";

		$graph = self::structured_data();
		if ( $graph ) {
			echo '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@graph' => $graph ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ) . "</script>\n";
		}
	}

	/**
	 * Datos estructurados válidos y apropiados para la vista.
	 *
	 * @return array
	 */
	public static function structured_data() {
		$graph = array();
		$data  = self::current();
		if ( is_front_page() ) {
			$graph[] = array(
				'@type' => 'WebSite',
				'name'  => clicktools_setting( 'brand_name' ),
				'url'   => home_url( '/' ),
				'inLanguage' => str_replace( '_', '-', get_locale() ),
			);
		}
		if ( $data && ! empty( $data['crumbs'] ) && empty( $data['noindex'] ) ) {
			$items = array();
			foreach ( $data['crumbs'] as $i => $crumb ) {
				$items[] = array(
					'@type'    => 'ListItem',
					'position' => $i + 1,
					'name'     => $crumb['name'],
					'item'     => $crumb['url'],
				);
			}
			$graph[] = array(
				'@type'           => 'BreadcrumbList',
				'itemListElement' => $items,
			);
		}
		if ( $data && ! empty( $data['tool'] ) && 'guia' !== $data['tool']['type'] ) {
			$tool    = $data['tool'];
			$graph[] = array(
				'@type'               => 'WebApplication',
				'name'                => $tool['name'],
				'url'                 => Registry::url( $tool ),
				'description'         => $tool['meta'],
				'applicationCategory' => 'UtilitiesApplication',
				'operatingSystem'     => 'Any',
				'browserRequirements' => 'Requires JavaScript',
				'inLanguage'          => str_replace( '_', '-', get_locale() ),
				'isAccessibleForFree' => true,
				'offers'              => array(
					'@type'         => 'Offer',
					'price'         => '0',
					'priceCurrency' => 'EUR',
				),
			);
		}
		if ( is_singular( 'post' ) ) {
			$post    = get_queried_object();
			$graph[] = array(
				'@type'         => 'Article',
				'headline'      => get_the_title( $post ),
				'datePublished' => get_the_date( 'c', $post ),
				'dateModified'  => get_the_modified_date( 'c', $post ),
				'mainEntityOfPage' => get_permalink( $post ),
				'author'        => array(
					'@type' => 'Organization',
					'name'  => clicktools_setting( 'brand_name' ),
				),
			);
		}
		return $graph;
	}

	/**
	 * Registra el proveedor de mapa del sitio.
	 */
	public static function sitemaps() {
		if ( ! function_exists( 'wp_register_sitemap_provider' ) ) {
			return;
		}
		require_once CLICKTOOLS_DIR . 'includes/class-sitemap-provider.php';
		wp_register_sitemap_provider( 'clicktools', new Sitemap_Provider() );
	}

	/**
	 * Evita publicar el mapa de autores (expone nombres de usuario).
	 *
	 * @param mixed  $provider Proveedor.
	 * @param string $name     Nombre.
	 * @return mixed
	 */
	public static function filter_providers( $provider, $name ) {
		return 'users' === $name ? false : $provider;
	}

	/**
	 * Ajusta robots.txt.
	 *
	 * @param string $output Contenido.
	 * @param bool   $public Sitio público.
	 * @return string
	 */
	public static function robots_txt( $output, $public ) {
		if ( ! $public ) {
			return $output;
		}
		$extra = "Disallow: /wp-json/clicktools/\nDisallow: /?s=\nDisallow: /search/\n";
		if ( false === strpos( $output, 'Disallow: /wp-json/clicktools/' ) ) {
			$output = preg_replace( '/(Allow: \/wp-admin\/admin-ajax\.php\n)/', "$1" . $extra, $output, 1, $count );
			if ( ! $count ) {
				$output .= "\nUser-agent: *\n" . $extra;
			}
		}
		if ( false === strpos( $output, 'Sitemap:' ) && function_exists( 'get_sitemap_url' ) && get_sitemap_url( 'index' ) ) {
			$output .= "\nSitemap: " . esc_url_raw( get_sitemap_url( 'index' ) ) . "\n";
		}
		return $output;
	}

	/**
	 * Título para plugins SEO en rutas virtuales.
	 *
	 * @param string $title Título.
	 * @return string
	 */
	public static function plugin_title( $title ) {
		$data = self::current();
		return $data ? $data['title'] . ' | ' . $data['brand'] : $title;
	}

	/**
	 * Descripción para plugins SEO en rutas virtuales.
	 *
	 * @param string $desc Descripción.
	 * @return string
	 */
	public static function plugin_desc( $desc ) {
		$data = self::current();
		return $data ? $data['desc'] : $desc;
	}

	/**
	 * Canonical para plugins SEO en rutas virtuales.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	public static function plugin_canonical( $url ) {
		$data = self::current();
		return $data ? $data['canonical'] : $url;
	}
}
