<?php
/**
 * Gestión de herramientas: listado, edición de textos y SEO, activación y orden.
 *
 * @package ClickTools
 */

namespace ClickTools\Admin;

use ClickTools\Engines;
use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

/**
 * Tabla de herramientas.
 */
class Tools_Table extends \WP_List_Table {

	/**
	 * Constructor.
	 */
	public function __construct() {
		parent::__construct(
			array(
				'singular' => 'herramienta',
				'plural'   => 'herramientas',
				'ajax'     => false,
			)
		);
	}

	/**
	 * Columnas.
	 *
	 * @return array
	 */
	public function get_columns() {
		return array(
			'cb'         => '<input type="checkbox">',
			'name'       => __( 'Herramienta', 'clicktools' ),
			'cat'        => __( 'Categoría', 'clicktools' ),
			'type'       => __( 'Tipo', 'clicktools' ),
			'status'     => __( 'Estado', 'clicktools' ),
			'processing' => __( 'Procesamiento', 'clicktools' ),
			'priority'   => __( 'Prioridad', 'clicktools' ),
			'featured'   => __( 'Destacada', 'clicktools' ),
		);
	}

	/**
	 * Columnas ordenables.
	 *
	 * @return array
	 */
	protected function get_sortable_columns() {
		return array(
			'name'     => array( 'name', false ),
			'cat'      => array( 'cat', false ),
			'priority' => array( 'priority', true ),
			'status'   => array( 'status', false ),
		);
	}

	/**
	 * Acciones masivas.
	 *
	 * @return array
	 */
	protected function get_bulk_actions() {
		return array(
			'enable'     => __( 'Activar', 'clicktools' ),
			'disable'    => __( 'Desactivar', 'clicktools' ),
			'feature'    => __( 'Destacar', 'clicktools' ),
			'unfeature'  => __( 'Quitar de destacadas', 'clicktools' ),
			'reset'      => __( 'Restablecer valores originales', 'clicktools' ),
		);
	}

	/**
	 * Filtros sobre la tabla.
	 *
	 * @param string $which Posición.
	 */
	protected function extra_tablenav( $which ) {
		if ( 'top' !== $which ) {
			return;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$cat    = isset( $_GET['cat'] ) ? sanitize_key( wp_unslash( $_GET['cat'] ) ) : '';
		$status = isset( $_GET['tstatus'] ) ? sanitize_key( wp_unslash( $_GET['tstatus'] ) ) : '';
		// phpcs:enable
		echo '<div class="alignleft actions">';
		echo '<label class="screen-reader-text" for="ct-filter-cat">' . esc_html__( 'Filtrar por categoría', 'clicktools' ) . '</label>';
		echo '<select name="cat" id="ct-filter-cat"><option value="">' . esc_html__( 'Todas las categorías', 'clicktools' ) . '</option>';
		foreach ( Registry::categories() as $slug => $c ) {
			echo '<option value="' . esc_attr( $slug ) . '"' . selected( $cat, $slug, false ) . '>' . esc_html( $c['name'] ) . '</option>';
		}
		echo '</select>';
		echo '<label class="screen-reader-text" for="ct-filter-status">' . esc_html__( 'Filtrar por estado', 'clicktools' ) . '</label>';
		echo '<select name="tstatus" id="ct-filter-status"><option value="">' . esc_html__( 'Todos los estados', 'clicktools' ) . '</option>';
		foreach ( array_merge( Registry::statuses(), array( 'off' => __( 'Desactivadas', 'clicktools' ), 'hidden' => __( 'No visibles en la web', 'clicktools' ) ) ) as $key => $label ) {
			echo '<option value="' . esc_attr( $key ) . '"' . selected( $status, $key, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		submit_button( __( 'Filtrar', 'clicktools' ), '', 'filter_action', false );
		echo '</div>';
	}

	/**
	 * Prepara los elementos.
	 */
	public function prepare_items() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$search  = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$cat     = isset( $_GET['cat'] ) ? sanitize_key( wp_unslash( $_GET['cat'] ) ) : '';
		$status  = isset( $_GET['tstatus'] ) ? sanitize_key( wp_unslash( $_GET['tstatus'] ) ) : '';
		$orderby = isset( $_GET['orderby'] ) ? sanitize_key( wp_unslash( $_GET['orderby'] ) ) : 'priority';
		$order   = isset( $_GET['order'] ) && 'asc' === strtolower( sanitize_key( wp_unslash( $_GET['order'] ) ) ) ? 'asc' : 'desc';
		// phpcs:enable
		if ( ! isset( $_GET['orderby'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$order = 'desc';
		}
		$items = array_values( Registry::all_tools() );
		$items = array_filter(
			$items,
			static function ( $t ) use ( $search, $cat, $status ) {
				if ( $cat && $t['cat'] !== $cat && ! in_array( $cat, (array) $t['also'], true ) ) {
					return false;
				}
				if ( 'off' === $status && ! empty( $t['enabled'] ) ) {
					return false;
				}
				if ( 'hidden' === $status && Registry::is_public( $t ) ) {
					return false;
				}
				if ( $status && ! in_array( $status, array( 'off', 'hidden' ), true ) && $t['status'] !== $status ) {
					return false;
				}
				if ( '' !== $search ) {
					$hay = remove_accents( mb_strtolower( $t['name'] . ' ' . $t['slug'] . ' ' . $t['keywords'] ) );
					if ( false === strpos( $hay, remove_accents( mb_strtolower( $search ) ) ) ) {
						return false;
					}
				}
				return true;
			}
		);
		usort(
			$items,
			static function ( $a, $b ) use ( $orderby, $order ) {
				switch ( $orderby ) {
					case 'name':
						$r = strcoll( remove_accents( $a['name'] ), remove_accents( $b['name'] ) );
						break;
					case 'cat':
						$r = strcmp( $a['cat'], $b['cat'] );
						break;
					case 'status':
						$r = strcmp( $a['status'], $b['status'] );
						break;
					default:
						$r = $a['priority'] - $b['priority'];
				}
				if ( 0 === $r ) {
					$r = strcmp( $a['slug'], $b['slug'] );
				}
				return 'asc' === $order ? $r : -$r;
			}
		);
		$per_page = 50;
		$total    = count( $items );
		$page     = $this->get_pagenum();
		$this->items           = array_slice( $items, ( $page - 1 ) * $per_page, $per_page );
		$this->_column_headers = array( $this->get_columns(), array(), $this->get_sortable_columns(), 'name' );
		$this->set_pagination_args(
			array(
				'total_items' => $total,
				'per_page'    => $per_page,
			)
		);
	}

	/**
	 * Casilla de selección.
	 *
	 * @param array $item Herramienta.
	 * @return string
	 */
	protected function column_cb( $item ) {
		return '<label class="screen-reader-text" for="ct-cb-' . esc_attr( $item['slug'] ) . '">' . esc_html( $item['name'] ) . '</label><input type="checkbox" id="ct-cb-' . esc_attr( $item['slug'] ) . '" name="slugs[]" value="' . esc_attr( $item['slug'] ) . '">';
	}

	/**
	 * Nombre con acciones.
	 *
	 * @param array $item Herramienta.
	 * @return string
	 */
	protected function column_name( $item ) {
		$edit    = add_query_arg( array( 'page' => 'clicktools-tools', 'edit' => $item['slug'] ), admin_url( 'admin.php' ) );
		$public  = Registry::is_public( $item );
		$actions = array( 'edit' => '<a href="' . esc_url( $edit ) . '">' . esc_html__( 'Editar', 'clicktools' ) . '</a>' );
		if ( $public ) {
			$actions['view'] = '<a href="' . esc_url( Registry::url( $item ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Ver', 'clicktools' ) . '</a>';
		}
		$flags = '';
		if ( empty( $item['enabled'] ) ) {
			$flags .= ' <span class="ct-admin-badge ct-admin-badge--off">' . esc_html__( 'Desactivada', 'clicktools' ) . '</span>';
		} elseif ( ! $public ) {
			$flags .= ' <span class="ct-admin-badge ct-admin-badge--warn">' . esc_html__( 'No visible', 'clicktools' ) . '</span>';
		}
		if ( ! empty( $item['custom'] ) ) {
			$flags .= ' <span class="ct-admin-badge">' . esc_html__( 'Propia', 'clicktools' ) . '</span>';
		}
		$overrides = (array) get_option( Registry::OVERRIDES_OPTION, array() );
		if ( isset( $overrides[ $item['slug'] ] ) ) {
			$flags .= ' <span class="ct-admin-badge">' . esc_html__( 'Modificada', 'clicktools' ) . '</span>';
		}
		return '<strong><a class="row-title" href="' . esc_url( $edit ) . '">' . esc_html( $item['name'] ) . '</a></strong>' . $flags . '<br><code class="ct-admin-slug">' . esc_html( $item['slug'] ) . '</code>' . $this->row_actions( $actions );
	}

	/**
	 * Resto de columnas.
	 *
	 * @param array  $item   Herramienta.
	 * @param string $column Columna.
	 * @return string
	 */
	protected function column_default( $item, $column ) {
		switch ( $column ) {
			case 'cat':
				$c = Registry::category( $item['cat'] );
				return esc_html( $c ? $c['name'] : $item['cat'] );
			case 'type':
				$types = Registry::types();
				return esc_html( isset( $types[ $item['type'] ] ) ? $types[ $item['type'] ] : $item['type'] );
			case 'status':
				$statuses = Registry::statuses();
				$label    = isset( $statuses[ $item['status'] ] ) ? $statuses[ $item['status'] ] : $item['status'];
				if ( 'server' === $item['status'] && ! Engines::tool_available( $item ) ) {
					$label .= ' · ' . __( 'no disponible', 'clicktools' );
				}
				return esc_html( $label );
			case 'processing':
				return 'server' === $item['processing'] ? esc_html__( 'Servidor', 'clicktools' ) : esc_html__( 'Navegador', 'clicktools' );
			case 'priority':
				return (int) $item['priority'];
			case 'featured':
				return ! empty( $item['featured'] ) ? '<span class="ct-admin-ok" aria-label="' . esc_attr__( 'Sí', 'clicktools' ) . '">★</span>' : '<span aria-label="' . esc_attr__( 'No', 'clicktools' ) . '">—</span>';
		}
		return '';
	}

	/**
	 * Mensaje sin resultados.
	 */
	public function no_items() {
		esc_html_e( 'No hay herramientas que coincidan con el filtro.', 'clicktools' );
	}
}

/**
 * Pantallas y acciones de herramientas.
 */
class Tools_Admin {

	/**
	 * Campos editables de texto.
	 *
	 * @var string[]
	 */
	private static $text_fields = array( 'name', 'desc', 'intro', 'seo_title', 'meta' );

	/**
	 * Pinta el listado o el formulario de edición.
	 */
	public static function page() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$edit = isset( $_GET['edit'] ) ? sanitize_title( wp_unslash( $_GET['edit'] ) ) : '';
		if ( $edit ) {
			self::edit_form( $edit );
			return;
		}
		$table = new Tools_Table();
		$table->prepare_items();
		$counts = Admin::tool_counts();
		echo '<div class="wrap ct-admin"><h1 class="wp-heading-inline">' . esc_html__( 'Herramientas', 'clicktools' ) . '</h1>';
		echo ' <a class="page-title-action" href="' . esc_url( admin_url( 'admin.php?page=clicktools-custom&new=1' ) ) . '">' . esc_html__( 'Nueva calculadora propia', 'clicktools' ) . '</a>';
		echo '<hr class="wp-header-end">';
		/* translators: 1: herramientas visibles, 2: total */
		echo '<p>' . esc_html( sprintf( __( '%1$d herramientas visibles en la web de %2$d registradas. Las herramientas de servidor solo se muestran si activas el procesamiento en servidor y el programa necesario está instalado.', 'clicktools' ), $counts['public'], $counts['total'] ) ) . '</p>';
		echo '<form method="get"><input type="hidden" name="page" value="clicktools-tools">';
		$table->search_box( __( 'Buscar herramientas', 'clicktools' ), 'ct-tools' );
		$table->display();
		echo '</form></div>';
	}

	/**
	 * Formulario de edición de una herramienta.
	 *
	 * @param string $slug Slug.
	 */
	private static function edit_form( $slug ) {
		$tool = Registry::tool( $slug, false );
		$base = Registry::base_tool( $slug );
		if ( ! $tool || ! $base ) {
			echo '<div class="wrap"><h1>' . esc_html__( 'Herramienta no encontrada', 'clicktools' ) . '</h1></div>';
			return;
		}
		$overrides = (array) get_option( Registry::OVERRIDES_OPTION, array() );
		$o         = isset( $overrides[ $slug ] ) ? (array) $overrides[ $slug ] : array();
		$labels    = array(
			'name'      => array( __( 'Nombre (H1)', 'clicktools' ), 'text' ),
			'desc'      => array( __( 'Descripción corta (tarjetas y buscador)', 'clicktools' ), 'textarea' ),
			'intro'     => array( __( 'Introducción', 'clicktools' ), 'textarea' ),
			'seo_title' => array( __( 'Título SEO', 'clicktools' ), 'text' ),
			'meta'      => array( __( 'Metadescripción', 'clicktools' ), 'textarea' ),
		);
		echo '<div class="wrap ct-admin"><h1>' . esc_html( sprintf( /* translators: %s: herramienta */ __( 'Editar: %s', 'clicktools' ), $tool['name'] ) ) . '</h1>';
		echo '<p><a href="' . esc_url( admin_url( 'admin.php?page=clicktools-tools' ) ) . '">← ' . esc_html__( 'Volver al listado', 'clicktools' ) . '</a>';
		if ( Registry::is_public( $tool ) ) {
			echo ' · <a href="' . esc_url( Registry::url( $tool ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Ver en la web', 'clicktools' ) . '</a>';
		}
		echo '</p><p class="description">' . esc_html__( 'Deja un campo de texto vacío para usar el texto original (se muestra como ejemplo). Los cambios se guardan aparte: las actualizaciones del plugin no los sobrescriben.', 'clicktools' ) . '</p>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="clicktools_save_tool"><input type="hidden" name="slug" value="' . esc_attr( $slug ) . '">';
		wp_nonce_field( 'clicktools_save_tool' );
		echo '<table class="form-table" role="presentation"><tbody>';
		foreach ( $labels as $field => $def ) {
			$val = isset( $o[ $field ] ) ? (string) $o[ $field ] : '';
			$id  = 'ct-tool-' . $field;
			echo '<tr><th scope="row"><label for="' . esc_attr( $id ) . '">' . esc_html( $def[0] ) . '</label></th><td>';
			if ( 'textarea' === $def[1] ) {
				echo '<textarea class="large-text" rows="3" id="' . esc_attr( $id ) . '" name="tool[' . esc_attr( $field ) . ']" placeholder="' . esc_attr( $base[ $field ] ) . '" data-count="' . ( 'meta' === $field ? '160' : '' ) . '">' . esc_textarea( $val ) . '</textarea>';
			} else {
				echo '<input type="text" class="large-text" id="' . esc_attr( $id ) . '" name="tool[' . esc_attr( $field ) . ']" value="' . esc_attr( $val ) . '" placeholder="' . esc_attr( $base[ $field ] ) . '" data-count="' . ( 'seo_title' === $field ? '60' : '' ) . '">';
			}
			echo '</td></tr>';
		}
		// Categoría.
		echo '<tr><th scope="row"><label for="ct-tool-cat">' . esc_html__( 'Categoría principal', 'clicktools' ) . '</label></th><td><select id="ct-tool-cat" name="tool[cat]">';
		foreach ( Registry::categories() as $cslug => $c ) {
			echo '<option value="' . esc_attr( $cslug ) . '"' . selected( $tool['cat'], $cslug, false ) . '>' . esc_html( $c['name'] ) . ( $cslug === $base['cat'] ? ' ' . esc_html__( '(original)', 'clicktools' ) : '' ) . '</option>';
		}
		echo '</select><p class="description">' . esc_html__( 'Cambiar la categoría cambia la URL. La dirección anterior redirige a la nueva automáticamente si añades la redirección en Ajustes › SEO.', 'clicktools' ) . '</p></td></tr>';
		// Icono.
		echo '<tr><th scope="row"><label for="ct-tool-icon">' . esc_html__( 'Icono', 'clicktools' ) . '</label></th><td><select id="ct-tool-icon" name="tool[icon]" class="ct-icon-select">';
		foreach ( clicktools_icon_names() as $icon ) {
			echo '<option value="' . esc_attr( $icon ) . '"' . selected( $tool['icon'], $icon, false ) . '>' . esc_html( $icon ) . '</option>';
		}
		echo '</select> <span class="ct-admin-icon-preview" aria-hidden="true">' . clicktools_icon( $tool['icon'], 22 ) . '</span></td></tr>'; // phpcs:ignore WordPress.Security.EscapeOutput
		// Prioridad, destacada y activa.
		echo '<tr><th scope="row"><label for="ct-tool-priority">' . esc_html__( 'Prioridad', 'clicktools' ) . '</label></th><td><input type="number" class="small-text" min="0" max="999" id="ct-tool-priority" name="tool[priority]" value="' . esc_attr( (string) $tool['priority'] ) . '"><p class="description">' . esc_html( sprintf( /* translators: %d: prioridad original */ __( 'Las herramientas con más prioridad aparecen antes. Original: %d.', 'clicktools' ), $base['priority'] ) ) . '</p></td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Visibilidad', 'clicktools' ) . '</th><td>';
		echo '<label class="ct-admin-check"><input type="checkbox" name="tool[enabled]" value="1"' . checked( ! empty( $tool['enabled'] ), true, false ) . '> ' . esc_html__( 'Activa (visible en la web si su estado lo permite)', 'clicktools' ) . '</label>';
		echo '<label class="ct-admin-check"><input type="checkbox" name="tool[featured]" value="1"' . checked( ! empty( $tool['featured'] ), true, false ) . '> ' . esc_html__( 'Destacada en la portada', 'clicktools' ) . '</label>';
		echo '</td></tr>';
		$statuses = Registry::statuses();
		echo '<tr><th scope="row">' . esc_html__( 'Información', 'clicktools' ) . '</th><td><p>';
		echo esc_html__( 'Estado:', 'clicktools' ) . ' <strong>' . esc_html( isset( $statuses[ $tool['status'] ] ) ? $statuses[ $tool['status'] ] : $tool['status'] ) . '</strong> · ';
		echo esc_html__( 'Motor:', 'clicktools' ) . ' <code>' . esc_html( $tool['engine'] . ( $tool['key'] ? ':' . $tool['key'] : '' ) ) . '</code> · ';
		echo esc_html__( 'Procesamiento:', 'clicktools' ) . ' ' . ( 'server' === $tool['processing'] ? esc_html__( 'servidor', 'clicktools' ) : esc_html__( 'navegador', 'clicktools' ) );
		echo '</p></td></tr>';
		echo '</tbody></table>';
		submit_button( __( 'Guardar cambios', 'clicktools' ) );
		echo '</form>';
		if ( $o ) {
			Admin::action_button( 'reset_tool', __( 'Restablecer valores originales', 'clicktools' ), 'button button-link-delete', __( '¿Restablecer los textos y ajustes originales de esta herramienta?', 'clicktools' ), array( 'slug' => $slug ) );
		}
		echo '</div>';
	}

	/**
	 * Guarda los cambios de una herramienta.
	 */
	public static function save() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Comprobado en Admin::dispatch().
		$slug = isset( $_POST['slug'] ) ? sanitize_title( wp_unslash( $_POST['slug'] ) ) : '';
		$base = $slug ? Registry::base_tool( $slug ) : null;
		if ( ! $base ) {
			Admin::back( 'clicktools-tools', 'invalid' );
		}
		$in = isset( $_POST['tool'] ) && is_array( $_POST['tool'] ) ? wp_unslash( $_POST['tool'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Se sanea campo a campo.
		// phpcs:enable
		$o = array();
		foreach ( self::$text_fields as $field ) {
			$val = isset( $in[ $field ] ) ? trim( in_array( $field, array( 'name', 'seo_title' ), true ) ? sanitize_text_field( $in[ $field ] ) : sanitize_textarea_field( $in[ $field ] ) ) : '';
			if ( '' !== $val && $val !== $base[ $field ] ) {
				$o[ $field ] = $val;
			}
		}
		$cat = isset( $in['cat'] ) ? sanitize_key( $in['cat'] ) : '';
		if ( $cat && $cat !== $base['cat'] && Registry::category( $cat ) ) {
			$o['cat'] = $cat;
		}
		$icon = isset( $in['icon'] ) ? sanitize_key( $in['icon'] ) : '';
		if ( $icon && $icon !== $base['icon'] && in_array( $icon, clicktools_icon_names(), true ) ) {
			$o['icon'] = $icon;
		}
		$priority = isset( $in['priority'] ) && '' !== $in['priority'] ? min( 999, max( 0, (int) $in['priority'] ) ) : $base['priority'];
		if ( $priority !== $base['priority'] ) {
			$o['priority'] = $priority;
		}
		$enabled  = ! empty( $in['enabled'] );
		$featured = ! empty( $in['featured'] );
		if ( $enabled !== (bool) $base['enabled'] ) {
			$o['enabled'] = $enabled;
		}
		if ( $featured !== (bool) $base['featured'] ) {
			$o['featured'] = $featured;
		}
		self::store( $slug, $o );
		Admin::back( 'clicktools-tools', 'saved', array( 'edit' => $slug ) );
	}

	/**
	 * Elimina los cambios de una herramienta.
	 */
	public static function reset() {
		$slug = isset( $_POST['slug'] ) ? sanitize_title( wp_unslash( $_POST['slug'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Comprobado en Admin::dispatch().
		self::store( $slug, array() );
		Admin::back( 'clicktools-tools', 'reset', array( 'edit' => $slug ) );
	}

	/**
	 * Procesa las acciones masivas al cargar la pantalla (patrón estándar de WP_List_Table).
	 */
	public static function load() {
		$table  = new Tools_Table();
		$action = $table->current_action();
		if ( ! $action || ! in_array( $action, array( 'enable', 'disable', 'feature', 'unfeature', 'reset' ), true ) ) {
			return;
		}
		if ( ! current_user_can( Admin::CAP ) ) {
			wp_die( esc_html__( 'No tienes permiso para hacer esto.', 'clicktools' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bulk-herramientas' );
		$slugs = isset( $_REQUEST['slugs'] ) ? array_map( 'sanitize_title', (array) wp_unslash( $_REQUEST['slugs'] ) ) : array();
		$keep  = array();
		foreach ( array( 'cat', 'tstatus', 's', 'paged', 'orderby', 'order' ) as $k ) {
			if ( isset( $_REQUEST[ $k ] ) && '' !== $_REQUEST[ $k ] ) {
				$keep[ $k ] = sanitize_text_field( wp_unslash( $_REQUEST[ $k ] ) );
			}
		}
		if ( ! $slugs ) {
			Admin::back( 'clicktools-tools', 'nothing', $keep );
		}
		self::bulk( $action, $slugs );
		Admin::back( 'clicktools-tools', 'bulk', $keep );
	}

	/**
	 * Aplica una acción masiva.
	 *
	 * @param string   $action Acción.
	 * @param string[] $slugs  Herramientas.
	 */
	public static function bulk( $action, array $slugs ) {
		$overrides = (array) get_option( Registry::OVERRIDES_OPTION, array() );
		foreach ( $slugs as $slug ) {
			$base = Registry::base_tool( $slug );
			if ( ! $base ) {
				continue;
			}
			$o = isset( $overrides[ $slug ] ) ? (array) $overrides[ $slug ] : array();
			switch ( $action ) {
				case 'enable':
				case 'disable':
					$want = 'enable' === $action;
					if ( $want === (bool) $base['enabled'] ) {
						unset( $o['enabled'] );
					} else {
						$o['enabled'] = $want;
					}
					break;
				case 'feature':
				case 'unfeature':
					$want = 'feature' === $action;
					if ( $want === (bool) $base['featured'] ) {
						unset( $o['featured'] );
					} else {
						$o['featured'] = $want;
					}
					break;
				case 'reset':
					$o = array();
					break;
			}
			if ( $o ) {
				$overrides[ $slug ] = $o;
			} else {
				unset( $overrides[ $slug ] );
			}
		}
		update_option( Registry::OVERRIDES_OPTION, $overrides, true );
		self::after_change();
	}

	/**
	 * Guarda (o elimina si está vacío) el cambio de una herramienta.
	 *
	 * @param string $slug Slug.
	 * @param array  $o    Cambios.
	 */
	private static function store( $slug, array $o ) {
		$overrides = (array) get_option( Registry::OVERRIDES_OPTION, array() );
		if ( $o ) {
			$overrides[ $slug ] = $o;
		} else {
			unset( $overrides[ $slug ] );
		}
		update_option( Registry::OVERRIDES_OPTION, $overrides, true );
		self::after_change();
	}

	/**
	 * Limpia cachés tras modificar herramientas.
	 */
	public static function after_change() {
		Registry::reset();
		delete_transient( 'clicktools_popularity' );
		// Fuerza a regenerar las reglas de reescritura si cambian categorías o visibilidad.
		delete_option( 'clicktools_routes_hash' );
		do_action( 'clicktools_tools_changed' );
	}
}
