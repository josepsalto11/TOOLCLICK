<?php
/**
 * Proveedor del mapa del sitio XML nativo de WordPress para herramientas y categorías.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Proveedor "clicktools" de wp-sitemap.xml.
 */
class Sitemap_Provider extends \WP_Sitemaps_Provider {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->name        = 'clicktools';
		$this->object_type = 'clicktools';
	}

	/**
	 * Subtipos: categorías y herramientas.
	 *
	 * @return array
	 */
	public function get_object_subtypes() {
		return array(
			'categorias'   => (object) array( 'name' => 'categorias' ),
			'herramientas' => (object) array( 'name' => 'herramientas' ),
		);
	}

	/**
	 * URLs de una página del mapa.
	 *
	 * @param int    $page_num       Página.
	 * @param string $object_subtype Subtipo.
	 * @return array
	 */
	public function get_url_list( $page_num, $object_subtype = '' ) {
		$urls = array();
		if ( 1 !== (int) $page_num ) {
			return $urls;
		}
		if ( 'categorias' === $object_subtype ) {
			$urls[] = array( 'loc' => Registry::catalog_url() );
			foreach ( Registry::categories_with_tools() as $slug => $cat ) {
				$urls[] = array( 'loc' => Registry::category_url( $slug ) );
			}
		} elseif ( 'herramientas' === $object_subtype ) {
			foreach ( Registry::sort( Registry::public_tools() ) as $tool ) {
				$urls[] = array( 'loc' => Registry::url( $tool ) );
			}
		}
		return $urls;
	}

	/**
	 * Número de páginas.
	 *
	 * @param string $object_subtype Subtipo.
	 * @return int
	 */
	public function get_max_num_pages( $object_subtype = '' ) {
		return 1;
	}
}
