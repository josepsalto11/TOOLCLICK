<?php
/**
 * Revisión de mensajes, sugerencias y avisos de error.
 *
 * @package ClickTools
 */

namespace ClickTools\Admin;

use ClickTools\Messages;
use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Columnas, filtros y caja de revisión del tipo ct_message.
 */
class Messages_Admin {

	/**
	 * Registra hooks.
	 */
	public static function init() {
		$cpt = Messages::CPT;
		add_filter( "manage_{$cpt}_posts_columns", array( __CLASS__, 'columns' ) );
		add_action( "manage_{$cpt}_posts_custom_column", array( __CLASS__, 'column' ), 10, 2 );
		add_action( 'restrict_manage_posts', array( __CLASS__, 'filters' ) );
		add_action( 'pre_get_posts', array( __CLASS__, 'apply_filters' ) );
		add_action( 'add_meta_boxes_' . $cpt, array( __CLASS__, 'meta_boxes' ) );
		add_action( 'save_post_' . $cpt, array( __CLASS__, 'save' ), 10, 2 );
		add_filter( 'parent_file', array( __CLASS__, 'parent_file' ) );
		add_filter( 'post_row_actions', array( __CLASS__, 'row_actions' ), 10, 2 );
		add_filter( 'bulk_actions-edit-' . $cpt, array( __CLASS__, 'bulk_actions' ) );
		add_filter( 'handle_bulk_actions-edit-' . $cpt, array( __CLASS__, 'handle_bulk' ), 10, 3 );
	}

	/**
	 * Mensajes nuevos sin revisar.
	 *
	 * @return int
	 */
	public static function count_new() {
		$cached = wp_cache_get( 'ct_new_messages', 'clicktools' );
		if ( false !== $cached ) {
			return (int) $cached;
		}
		$q = new \WP_Query(
			array(
				'post_type'      => Messages::CPT,
				'post_status'    => 'any',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => false,
				'meta_key'       => '_ct_state', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => 'new', // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		wp_cache_set( 'ct_new_messages', (int) $q->found_posts, 'clicktools', 300 );
		return (int) $q->found_posts;
	}

	/**
	 * Mantiene abierto el menú de ClickTools en las pantallas de mensajes.
	 *
	 * @param string $parent Menú padre.
	 * @return string
	 */
	public static function parent_file( $parent ) {
		$screen = get_current_screen();
		if ( $screen && Messages::CPT === $screen->post_type ) {
			return 'clicktools';
		}
		return $parent;
	}

	/**
	 * Columnas del listado.
	 *
	 * @param array $cols Columnas.
	 * @return array
	 */
	public static function columns( $cols ) {
		return array(
			'cb'          => $cols['cb'],
			'title'       => __( 'Asunto', 'clicktools' ),
			'ct_type'     => __( 'Tipo', 'clicktools' ),
			'ct_state'    => __( 'Estado', 'clicktools' ),
			'ct_priority' => __( 'Prioridad', 'clicktools' ),
			'ct_about'    => __( 'Sobre', 'clicktools' ),
			'ct_email'    => __( 'Correo', 'clicktools' ),
			'date'        => __( 'Recibido', 'clicktools' ),
		);
	}

	/**
	 * Contenido de las columnas.
	 *
	 * @param string $col     Columna.
	 * @param int    $post_id Mensaje.
	 */
	public static function column( $col, $post_id ) {
		switch ( $col ) {
			case 'ct_type':
				$types = Messages::types();
				$type  = get_post_meta( $post_id, '_ct_type', true );
				echo esc_html( isset( $types[ $type ] ) ? $types[ $type ] : $type );
				break;
			case 'ct_state':
				$states = Messages::review_states();
				$state  = get_post_meta( $post_id, '_ct_state', true );
				echo '<span class="ct-admin-state ct-admin-state--' . esc_attr( $state ) . '">' . esc_html( isset( $states[ $state ] ) ? $states[ $state ] : $state ) . '</span>';
				break;
			case 'ct_priority':
				$p      = (int) get_post_meta( $post_id, '_ct_priority', true );
				$labels = self::priorities();
				echo esc_html( isset( $labels[ $p ] ) ? $labels[ $p ] : (string) $p );
				break;
			case 'ct_about':
				$tool = get_post_meta( $post_id, '_ct_tool', true );
				$cat  = get_post_meta( $post_id, '_ct_category', true );
				$t    = $tool ? Registry::tool( $tool, false ) : null;
				$c    = $cat ? Registry::category( $cat ) : null;
				echo esc_html( $t ? $t['name'] : ( $c ? $c['name'] : '—' ) );
				break;
			case 'ct_email':
				$email = get_post_meta( $post_id, '_ct_email', true );
				echo $email ? '<a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>' : '—';
				break;
		}
	}

	/**
	 * Prioridades.
	 *
	 * @return array<int,string>
	 */
	public static function priorities() {
		return array(
			0 => __( 'Sin asignar', 'clicktools' ),
			1 => __( 'Baja', 'clicktools' ),
			2 => __( 'Media', 'clicktools' ),
			3 => __( 'Alta', 'clicktools' ),
		);
	}

	/**
	 * Filtros por tipo y estado.
	 *
	 * @param string $post_type Tipo.
	 */
	public static function filters( $post_type ) {
		if ( Messages::CPT !== $post_type ) {
			return;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$type  = isset( $_GET['ct_type'] ) ? sanitize_key( wp_unslash( $_GET['ct_type'] ) ) : '';
		$state = isset( $_GET['ct_state'] ) ? sanitize_key( wp_unslash( $_GET['ct_state'] ) ) : '';
		// phpcs:enable
		echo '<label class="screen-reader-text" for="ct-f-type">' . esc_html__( 'Filtrar por tipo', 'clicktools' ) . '</label><select name="ct_type" id="ct-f-type"><option value="">' . esc_html__( 'Todos los tipos', 'clicktools' ) . '</option>';
		foreach ( Messages::types() as $k => $l ) {
			echo '<option value="' . esc_attr( $k ) . '"' . selected( $type, $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select><label class="screen-reader-text" for="ct-f-state">' . esc_html__( 'Filtrar por estado', 'clicktools' ) . '</label><select name="ct_state" id="ct-f-state"><option value="">' . esc_html__( 'Todos los estados', 'clicktools' ) . '</option>';
		foreach ( Messages::review_states() as $k => $l ) {
			echo '<option value="' . esc_attr( $k ) . '"' . selected( $state, $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select>';
	}

	/**
	 * Aplica los filtros a la consulta del listado.
	 *
	 * @param \WP_Query $q Consulta.
	 */
	public static function apply_filters( $q ) {
		if ( ! is_admin() || ! $q->is_main_query() || Messages::CPT !== $q->get( 'post_type' ) ) {
			return;
		}
		$meta = array();
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		if ( ! empty( $_GET['ct_type'] ) ) {
			$meta[] = array( 'key' => '_ct_type', 'value' => sanitize_key( wp_unslash( $_GET['ct_type'] ) ) );
		}
		if ( ! empty( $_GET['ct_state'] ) ) {
			$meta[] = array( 'key' => '_ct_state', 'value' => sanitize_key( wp_unslash( $_GET['ct_state'] ) ) );
		}
		// phpcs:enable
		if ( $meta ) {
			$q->set( 'meta_query', $meta ); // phpcs:ignore WordPress.DB.SlowDBQuery
		}
	}

	/**
	 * Acciones de fila: sin «Vista previa» (son privados).
	 *
	 * @param array    $actions Acciones.
	 * @param \WP_Post $post    Mensaje.
	 * @return array
	 */
	public static function row_actions( $actions, $post ) {
		if ( Messages::CPT === $post->post_type ) {
			unset( $actions['view'], $actions['inline hide-if-no-js'] );
		}
		return $actions;
	}

	/**
	 * Acciones masivas de estado.
	 *
	 * @param array $actions Acciones.
	 * @return array
	 */
	public static function bulk_actions( $actions ) {
		unset( $actions['edit'] );
		foreach ( Messages::review_states() as $k => $l ) {
			/* translators: %s: estado */
			$actions[ 'ct_state_' . $k ] = sprintf( __( 'Marcar como: %s', 'clicktools' ), $l );
		}
		return $actions;
	}

	/**
	 * Aplica el cambio de estado masivo.
	 *
	 * @param string $redirect Destino.
	 * @param string $action   Acción.
	 * @param int[]  $ids      Mensajes.
	 * @return string
	 */
	public static function handle_bulk( $redirect, $action, $ids ) {
		if ( 0 !== strpos( $action, 'ct_state_' ) ) {
			return $redirect;
		}
		$state = substr( $action, 9 );
		if ( ! isset( Messages::review_states()[ $state ] ) ) {
			return $redirect;
		}
		foreach ( $ids as $id ) {
			if ( current_user_can( 'edit_post', $id ) ) {
				update_post_meta( $id, '_ct_state', $state );
			}
		}
		wp_cache_delete( 'ct_new_messages', 'clicktools' );
		return $redirect;
	}

	/**
	 * Cajas de la pantalla de revisión.
	 */
	public static function meta_boxes() {
		add_meta_box( 'ct-message-review', __( 'Revisión', 'clicktools' ), array( __CLASS__, 'box_review' ), Messages::CPT, 'side', 'high' );
		add_meta_box( 'ct-message-data', __( 'Datos del envío', 'clicktools' ), array( __CLASS__, 'box_data' ), Messages::CPT, 'normal', 'high' );
	}

	/**
	 * Caja de estado y prioridad.
	 *
	 * @param \WP_Post $post Mensaje.
	 */
	public static function box_review( $post ) {
		wp_nonce_field( 'ct_message_review', 'ct_review_nonce' );
		$state    = get_post_meta( $post->ID, '_ct_state', true );
		$priority = (int) get_post_meta( $post->ID, '_ct_priority', true );
		echo '<p><label for="ct-review-state"><strong>' . esc_html__( 'Estado', 'clicktools' ) . '</strong></label><br><select id="ct-review-state" name="ct_state" class="widefat">';
		foreach ( Messages::review_states() as $k => $l ) {
			echo '<option value="' . esc_attr( $k ) . '"' . selected( $state, $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select></p><p><label for="ct-review-priority"><strong>' . esc_html__( 'Prioridad', 'clicktools' ) . '</strong></label><br><select id="ct-review-priority" name="ct_priority" class="widefat">';
		foreach ( self::priorities() as $k => $l ) {
			echo '<option value="' . esc_attr( (string) $k ) . '"' . selected( $priority, $k, false ) . '>' . esc_html( $l ) . '</option>';
		}
		echo '</select></p><p class="description">' . esc_html__( 'Guarda con el botón «Actualizar». El contenido del mensaje es el que envió el visitante.', 'clicktools' ) . '</p>';
	}

	/**
	 * Caja con los datos del envío.
	 *
	 * @param \WP_Post $post Mensaje.
	 */
	public static function box_data( $post ) {
		$types   = Messages::types();
		$type    = get_post_meta( $post->ID, '_ct_type', true );
		$email   = get_post_meta( $post->ID, '_ct_email', true );
		$consent = get_post_meta( $post->ID, '_ct_consent', true );
		$tool    = get_post_meta( $post->ID, '_ct_tool', true );
		$cat     = get_post_meta( $post->ID, '_ct_category', true );
		$t       = $tool ? Registry::tool( $tool, false ) : null;
		$c       = $cat ? Registry::category( $cat ) : null;
		echo '<table class="widefat striped"><tbody>';
		echo '<tr><th scope="row">' . esc_html__( 'Tipo', 'clicktools' ) . '</th><td>' . esc_html( isset( $types[ $type ] ) ? $types[ $type ] : $type ) . '</td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Herramienta', 'clicktools' ) . '</th><td>' . ( $t ? '<a href="' . esc_url( Registry::url( $t ) ) . '" target="_blank" rel="noopener">' . esc_html( $t['name'] ) . '</a>' : '—' ) . '</td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Categoría', 'clicktools' ) . '</th><td>' . esc_html( $c ? $c['name'] : '—' ) . '</td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Correo de respuesta', 'clicktools' ) . '</th><td>' . ( $email ? '<a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a>' : esc_html__( 'No facilitado', 'clicktools' ) ) . '</td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Consentimiento para responder', 'clicktools' ) . '</th><td>' . ( $consent ? esc_html( clicktools_date( $consent ) ) : '—' ) . '</td></tr>';
		echo '</tbody></table>';
		$days = (int) clicktools_setting( 'messages_retention', 365 );
		if ( $days > 0 ) {
			/* translators: %d: días */
			echo '<p class="description">' . esc_html( sprintf( __( 'Este mensaje se eliminará automáticamente %d días después de recibirse.', 'clicktools' ), $days ) ) . '</p>';
		}
	}

	/**
	 * Guarda estado y prioridad.
	 *
	 * @param int      $post_id Mensaje.
	 * @param \WP_Post $post    Objeto.
	 */
	public static function save( $post_id, $post ) {
		if ( ! isset( $_POST['ct_review_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['ct_review_nonce'] ) ), 'ct_message_review' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$state = isset( $_POST['ct_state'] ) ? sanitize_key( wp_unslash( $_POST['ct_state'] ) ) : '';
		if ( isset( Messages::review_states()[ $state ] ) ) {
			update_post_meta( $post_id, '_ct_state', $state );
		}
		$priority = isset( $_POST['ct_priority'] ) ? (int) $_POST['ct_priority'] : 0;
		if ( isset( self::priorities()[ $priority ] ) ) {
			update_post_meta( $post_id, '_ct_priority', $priority );
		}
		wp_cache_delete( 'ct_new_messages', 'clicktools' );
	}
}
