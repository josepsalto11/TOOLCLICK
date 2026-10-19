<?php
/**
 * Registro central de categorías y herramientas.
 *
 * Cada herramienta se define de forma declarativa en data/tools/*.php y se
 * normaliza aquí. Para añadir una herramienta basta con añadir su definición
 * (y, si necesita lógica nueva, su motor JavaScript) sin tocar las demás.
 * Terceros pueden usar el filtro "clicktools_tools".
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Registro de herramientas.
 */
class Registry {

	const OVERRIDES_OPTION = 'clicktools_tool_overrides';
	const CUSTOM_OPTION    = 'clicktools_custom_tools';
	const RELEASE_DATE     = '2026-10-19';

	/**
	 * Categorías normalizadas.
	 *
	 * @var array|null
	 */
	private static $categories = null;

	/**
	 * Herramientas normalizadas (todas, incluidas las no públicas).
	 *
	 * @var array|null
	 */
	private static $tools = null;

	/**
	 * Tipos de herramienta para filtros.
	 *
	 * @return array<string,string>
	 */
	public static function types() {
		return array(
			'archivo'     => __( 'Procesa archivos', 'clicktools' ),
			'calculadora' => __( 'Calculadora', 'clicktools' ),
			'conversor'   => __( 'Conversor', 'clicktools' ),
			'generador'   => __( 'Generador', 'clicktools' ),
			'editor'      => __( 'Editor y texto', 'clicktools' ),
			'organizador' => __( 'Organizador', 'clicktools' ),
			'guia'        => __( 'Guía práctica', 'clicktools' ),
		);
	}

	/**
	 * Estados posibles de una herramienta.
	 *
	 * @return array<string,string>
	 */
	public static function statuses() {
		return array(
			'live'    => __( 'Operativa', 'clicktools' ),
			'beta'    => __( 'Operativa (beta)', 'clicktools' ),
			'server'  => __( 'Requiere motor en servidor', 'clicktools' ),
			'planned' => __( 'Pendiente de desarrollo', 'clicktools' ),
		);
	}

	/**
	 * Categorías ordenadas.
	 *
	 * @return array<string,array>
	 */
	public static function categories() {
		if ( null === self::$categories ) {
			$raw = require CLICKTOOLS_DIR . 'data/categories.php';
			$raw = apply_filters( 'clicktools_categories', $raw );
			$out = array();
			foreach ( $raw as $slug => $cat ) {
				$out[ $slug ] = wp_parse_args(
					$cat,
					array(
						'slug'      => $slug,
						'name'      => $slug,
						'short'     => $slug,
						'desc'      => '',
						'intro'     => '',
						'icon'      => 'sparkles',
						'order'     => 50,
						'seo_title' => '',
						'meta'      => '',
					)
				);
				$out[ $slug ]['slug'] = $slug;
			}
			uasort(
				$out,
				static function ( $a, $b ) {
					return $a['order'] <=> $b['order'];
				}
			);
			self::$categories = $out;
		}
		return self::$categories;
	}

	/**
	 * Slugs de categorías (para reglas de reescritura).
	 *
	 * @return string[]
	 */
	public static function category_slugs() {
		return array_keys( self::categories() );
	}

	/**
	 * Una categoría.
	 *
	 * @param string $slug Slug.
	 * @return array|null
	 */
	public static function category( $slug ) {
		$cats = self::categories();
		return isset( $cats[ $slug ] ) ? $cats[ $slug ] : null;
	}

	/**
	 * Categorías con al menos una herramienta pública, con recuento.
	 *
	 * @return array<string,array>
	 */
	public static function categories_with_tools() {
		$out = array();
		foreach ( self::categories() as $slug => $cat ) {
			$count = count( self::tools_in_category( $slug ) );
			if ( $count > 0 ) {
				$cat['count'] = $count;
				$out[ $slug ] = $cat;
			}
		}
		return $out;
	}

	/**
	 * Todas las herramientas (incluye desactivadas y pendientes).
	 *
	 * @return array<string,array>
	 */
	public static function all_tools() {
		if ( null === self::$tools ) {
			self::$tools = self::build( true );
		}
		return self::$tools;
	}

	/**
	 * Definición original de una herramienta, sin los cambios del panel.
	 *
	 * @param string $slug Slug.
	 * @return array|null
	 */
	public static function base_tool( $slug ) {
		static $base = null;
		if ( null === $base ) {
			$base = self::build( false );
		}
		return isset( $base[ $slug ] ) ? $base[ $slug ] : null;
	}

	/**
	 * Construye el registro a partir de los archivos de datos, las calculadoras
	 * personalizadas, el filtro clicktools_tools y, opcionalmente, los cambios del panel.
	 *
	 * @param bool $with_overrides Aplicar cambios guardados en el panel.
	 * @return array<string,array>
	 */
	private static function build( $with_overrides ) {
		$tools = array();
		foreach ( glob( CLICKTOOLS_DIR . 'data/tools/*.php' ) as $file ) {
			$list = require $file;
			if ( is_array( $list ) ) {
				foreach ( $list as $tool ) {
					$tools[] = $tool;
				}
			}
		}
		foreach ( self::custom_tools() as $tool ) {
			$tools[] = $tool;
		}
		$tools     = apply_filters( 'clicktools_tools', $tools );
		$overrides = $with_overrides ? (array) get_option( self::OVERRIDES_OPTION, array() ) : array();
		$out       = array();
		foreach ( $tools as $tool ) {
			if ( empty( $tool['slug'] ) || empty( $tool['cat'] ) || isset( $out[ $tool['slug'] ] ) ) {
				continue;
			}
			$tool = self::normalize( $tool );
			if ( isset( $overrides[ $tool['slug'] ] ) && is_array( $overrides[ $tool['slug'] ] ) ) {
				$tool = self::apply_override( $tool, $overrides[ $tool['slug'] ] );
			}
			if ( ! self::category( $tool['cat'] ) ) {
				continue;
			}
			$out[ $tool['slug'] ] = $tool;
		}
		return $out;
	}

	/**
	 * Restablece la caché interna (tras guardar cambios en el admin).
	 */
	public static function reset() {
		self::$tools      = null;
		self::$categories = null;
	}

	/**
	 * Normaliza la definición de una herramienta.
	 *
	 * @param array $tool Definición.
	 * @return array
	 */
	public static function normalize( array $tool ) {
		$tool = wp_parse_args(
			$tool,
			array(
				'slug'       => '',
				'cat'        => '',
				'name'       => '',
				'desc'       => '',
				'h1'         => '',
				'intro'      => '',
				'steps'      => array(),
				'faq'        => array(),
				'examples'   => array(),
				'keywords'   => '',
				'engine'     => '',
				'key'        => '',
				'config'     => array(),
				'type'       => 'calculadora',
				'processing' => 'local',
				'status'     => 'live',
				'requires'   => '',
				'added'      => self::RELEASE_DATE,
				'priority'   => 50,
				'featured'   => false,
				'also'       => array(),
				'limits'     => '',
				'aliases'    => array(),
				'related'    => array(),
				'seo_title'  => '',
				'meta'       => '',
				'icon'       => '',
				'privacy'    => '',
				'enabled'    => true,
				'custom'     => false,
			)
		);

		$tool['slug'] = sanitize_title( $tool['slug'] );
		if ( '' === $tool['h1'] ) {
			$tool['h1'] = $tool['name'];
		}
		if ( '' === $tool['intro'] ) {
			$tool['intro'] = $tool['desc'];
		}
		if ( '' === $tool['key'] ) {
			$tool['key'] = $tool['slug'];
		}
		if ( '' === $tool['icon'] ) {
			$cat          = self::category( $tool['cat'] );
			$tool['icon'] = $cat ? $cat['icon'] : 'sparkles';
		}
		if ( '' === $tool['seo_title'] ) {
			/* translators: %s: nombre de la herramienta */
			$tool['seo_title'] = sprintf( __( '%s online gratis', 'clicktools' ), $tool['name'] );
		}
		if ( '' === $tool['meta'] ) {
			$tool['meta'] = $tool['desc'];
		}
		$tool['priority'] = (int) $tool['priority'];
		$tool['also']     = array_values( array_diff( (array) $tool['also'], array( $tool['cat'] ) ) );
		return $tool;
	}

	/**
	 * Aplica los cambios guardados desde el panel de administración.
	 *
	 * @param array $tool     Herramienta.
	 * @param array $override Cambios.
	 * @return array
	 */
	private static function apply_override( array $tool, array $override ) {
		$text = array( 'name', 'desc', 'seo_title', 'meta', 'intro' );
		foreach ( $text as $field ) {
			if ( isset( $override[ $field ] ) && '' !== trim( (string) $override[ $field ] ) ) {
				$tool[ $field ] = (string) $override[ $field ];
				if ( 'name' === $field ) {
					$tool['h1'] = $tool['name'];
				}
			}
		}
		if ( isset( $override['icon'] ) && in_array( $override['icon'], clicktools_icon_names(), true ) ) {
			$tool['icon'] = $override['icon'];
		}
		if ( isset( $override['priority'] ) && '' !== $override['priority'] ) {
			$tool['priority'] = (int) $override['priority'];
		}
		if ( isset( $override['featured'] ) ) {
			$tool['featured'] = (bool) $override['featured'];
		}
		if ( isset( $override['enabled'] ) ) {
			$tool['enabled'] = (bool) $override['enabled'];
		}
		if ( ! empty( $override['cat'] ) && self::category( $override['cat'] ) ) {
			$tool['cat'] = $override['cat'];
		}
		return $tool;
	}

	/**
	 * Herramientas personalizadas creadas desde el administrador (calculadoras por fórmula).
	 *
	 * @return array
	 */
	public static function custom_tools() {
		$custom = get_option( self::CUSTOM_OPTION, array() );
		$out    = array();
		if ( ! is_array( $custom ) ) {
			return $out;
		}
		foreach ( $custom as $c ) {
			if ( empty( $c['slug'] ) || empty( $c['inputs'] ) || empty( $c['outputs'] ) ) {
				continue;
			}
			$out[] = array(
				'slug'     => $c['slug'],
				'cat'      => $c['cat'],
				'name'     => $c['name'],
				'desc'     => $c['desc'],
				'intro'    => isset( $c['intro'] ) ? $c['intro'] : '',
				'steps'    => array(
					__( 'Introduce los valores en los campos.', 'clicktools' ),
					__( 'El resultado se calcula automáticamente con la fórmula indicada.', 'clicktools' ),
					__( 'Copia el resultado si lo necesitas.', 'clicktools' ),
				),
				'engine'   => 'custom',
				'type'     => 'calculadora',
				'config'   => array(
					'inputs'  => $c['inputs'],
					'outputs' => $c['outputs'],
				),
				'priority' => isset( $c['priority'] ) ? (int) $c['priority'] : 40,
				'enabled'  => ! empty( $c['enabled'] ),
				'custom'   => true,
				'added'    => isset( $c['added'] ) ? $c['added'] : self::RELEASE_DATE,
				'icon'     => 'calculator',
			);
		}
		return $out;
	}

	/**
	 * Indica si una herramienta puede mostrarse en la parte pública.
	 *
	 * @param array $tool Herramienta.
	 * @return bool
	 */
	public static function is_public( array $tool ) {
		$public = false;
		if ( ! empty( $tool['enabled'] ) ) {
			if ( in_array( $tool['status'], array( 'live', 'beta' ), true ) ) {
				$public = true;
			} elseif ( 'server' === $tool['status'] ) {
				$public = Engines::tool_available( $tool );
			}
		}
		/**
		 * Filtro clicktools_tool_is_public: permite a una extensión ocultar o mostrar herramientas.
		 */
		return (bool) apply_filters( 'clicktools_tool_is_public', $public, $tool );
	}

	/**
	 * Herramientas públicas.
	 *
	 * @return array<string,array>
	 */
	public static function public_tools() {
		return array_filter( self::all_tools(), array( __CLASS__, 'is_public' ) );
	}

	/**
	 * Una herramienta por slug.
	 *
	 * @param string $slug        Slug.
	 * @param bool   $only_public Solo si es pública.
	 * @return array|null
	 */
	public static function tool( $slug, $only_public = true ) {
		$all = self::all_tools();
		if ( ! isset( $all[ $slug ] ) ) {
			return null;
		}
		if ( $only_public && ! self::is_public( $all[ $slug ] ) ) {
			return null;
		}
		return $all[ $slug ];
	}

	/**
	 * Busca una herramienta por un alias antiguo.
	 *
	 * @param string $slug Slug antiguo.
	 * @return array|null
	 */
	public static function tool_by_alias( $slug ) {
		foreach ( self::public_tools() as $tool ) {
			if ( in_array( $slug, (array) $tool['aliases'], true ) ) {
				return $tool;
			}
		}
		return null;
	}

	/**
	 * Herramientas públicas de una categoría (principal o secundaria).
	 *
	 * @param string $cat Categoría.
	 * @return array
	 */
	public static function tools_in_category( $cat ) {
		$out = array();
		foreach ( self::public_tools() as $tool ) {
			if ( $tool['cat'] === $cat || in_array( $cat, $tool['also'], true ) ) {
				$out[ $tool['slug'] ] = $tool;
			}
		}
		return self::sort( $out );
	}

	/**
	 * Ordena por prioridad editorial y nombre.
	 *
	 * @param array  $tools Herramientas.
	 * @param string $by    priority|name|added.
	 * @return array
	 */
	public static function sort( array $tools, $by = 'priority' ) {
		uasort(
			$tools,
			static function ( $a, $b ) use ( $by ) {
				if ( 'added' === $by && $a['added'] !== $b['added'] ) {
					return strcmp( $b['added'], $a['added'] );
				}
				if ( 'name' !== $by && $a['priority'] !== $b['priority'] ) {
					return $b['priority'] <=> $a['priority'];
				}
				return strcoll( remove_accents( $a['name'] ), remove_accents( $b['name'] ) );
			}
		);
		return $tools;
	}

	/**
	 * Herramientas destacadas.
	 *
	 * @param int $limit Máximo.
	 * @return array
	 */
	public static function featured( $limit = 12 ) {
		$featured = array_filter(
			self::public_tools(),
			static function ( $t ) {
				return ! empty( $t['featured'] );
			}
		);
		return array_slice( self::sort( $featured ), 0, $limit, true );
	}

	/**
	 * Herramientas relacionadas.
	 *
	 * @param array $tool  Herramienta.
	 * @param int   $limit Máximo.
	 * @return array
	 */
	public static function related( array $tool, $limit = 6 ) {
		$out = array();
		foreach ( (array) $tool['related'] as $slug ) {
			$rel = self::tool( $slug );
			if ( $rel && $rel['slug'] !== $tool['slug'] ) {
				$out[ $slug ] = $rel;
			}
		}
		if ( count( $out ) < $limit ) {
			foreach ( self::tools_in_category( $tool['cat'] ) as $slug => $rel ) {
				if ( $slug !== $tool['slug'] && ! isset( $out[ $slug ] ) ) {
					$out[ $slug ] = $rel;
				}
				if ( count( $out ) >= $limit ) {
					break;
				}
			}
		}
		return array_slice( $out, 0, $limit, true );
	}

	/**
	 * URL canónica de una herramienta.
	 *
	 * @param array $tool Herramienta.
	 * @return string
	 */
	public static function url( array $tool ) {
		return home_url( user_trailingslashit( $tool['cat'] . '/' . $tool['slug'] ) );
	}

	/**
	 * URL de una categoría.
	 *
	 * @param string $cat Slug.
	 * @return string
	 */
	public static function category_url( $cat ) {
		return home_url( user_trailingslashit( $cat ) );
	}

	/**
	 * URL del catálogo completo.
	 *
	 * @return string
	 */
	public static function catalog_url() {
		return home_url( user_trailingslashit( 'herramientas' ) );
	}

	/**
	 * Índice de búsqueda para el cliente (sin datos sensibles).
	 *
	 * @return array
	 */
	public static function search_index() {
		$cats = self::categories();
		$out  = array();
		foreach ( self::sort( self::public_tools() ) as $tool ) {
			$out[] = array(
				's' => $tool['slug'],
				'n' => $tool['name'],
				'd' => $tool['desc'],
				'c' => $tool['cat'],
				'cn' => $cats[ $tool['cat'] ]['name'],
				'a' => $tool['also'],
				'k' => $tool['keywords'],
				't' => $tool['type'],
				'p' => $tool['processing'],
				'u' => self::url( $tool ),
				'i' => $tool['icon'],
				'r' => $tool['priority'],
				'f' => (bool) $tool['featured'],
				'b' => 'beta' === $tool['status'],
				'ad' => $tool['added'],
			);
		}
		return $out;
	}

	/**
	 * Iconos SVG usados por las herramientas públicas (para el buscador y listas en cliente).
	 *
	 * @return array<string,string>
	 */
	public static function search_icons() {
		$names = array_unique( wp_list_pluck( self::public_tools(), 'icon' ) );
		return clicktools_icons_for_js( $names );
	}

	/**
	 * Huella de la estructura de URLs (para regenerar reglas si cambian).
	 *
	 * @return string
	 */
	public static function routes_hash() {
		return md5( implode( '|', self::category_slugs() ) . CLICKTOOLS_VERSION );
	}
}
