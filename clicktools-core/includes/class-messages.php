<?php
/**
 * Sugerencias de herramientas, avisos de errores y mensajes de contacto.
 *
 * Se guardan como entradas privadas (tipo "ct_message") que solo ve el
 * administrador. Nunca se publican automáticamente. No se guarda la IP.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Mensajes.
 */
class Messages {

	const CPT = 'ct_message';

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_type' ) );
		add_action( 'clicktools_daily', array( __CLASS__, 'purge_old' ) );
	}

	/**
	 * Tipos de mensaje.
	 *
	 * @return array<string,string>
	 */
	public static function types() {
		return array(
			'suggestion' => __( 'Sugerencia de herramienta', 'clicktools' ),
			'bug'        => __( 'Aviso de error', 'clicktools' ),
			'contact'    => __( 'Contacto', 'clicktools' ),
		);
	}

	/**
	 * Estados de revisión.
	 *
	 * @return array<string,string>
	 */
	public static function review_states() {
		return array(
			'new'       => __( 'Nueva', 'clicktools' ),
			'reviewing' => __( 'En revisión', 'clicktools' ),
			'approved'  => __( 'Aprobada', 'clicktools' ),
			'planned'   => __( 'Planificada', 'clicktools' ),
			'done'      => __( 'Resuelta', 'clicktools' ),
			'rejected'  => __( 'Descartada', 'clicktools' ),
		);
	}

	/**
	 * Registra el tipo de contenido privado.
	 */
	public static function register_type() {
		register_post_type(
			self::CPT,
			array(
				'labels'              => array(
					'name'          => __( 'Mensajes y sugerencias', 'clicktools' ),
					'singular_name' => __( 'Mensaje', 'clicktools' ),
					'edit_item'     => __( 'Revisar mensaje', 'clicktools' ),
					'search_items'  => __( 'Buscar mensajes', 'clicktools' ),
					'not_found'     => __( 'No hay mensajes.', 'clicktools' ),
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_menu'        => false,
				'show_in_rest'        => false,
				'supports'            => array( 'title', 'editor' ),
				'capability_type'     => 'post',
				'capabilities'        => array( 'create_posts' => 'do_not_allow' ),
				'map_meta_cap'        => true,
				'rewrite'             => false,
				'query_var'           => false,
			)
		);
	}

	/**
	 * Procesa un envío del formulario.
	 *
	 * @param array $data Datos sin sanear.
	 * @return array|\WP_Error
	 */
	public static function submit( array $data ) {
		// Honeypot: un humano no rellena este campo oculto.
		if ( ! empty( $data['website'] ) ) {
			return array( 'ok' => true );
		}
		$check = Security::verify_token( isset( $data['token'] ) ? $data['token'] : '', 'message' );
		if ( is_wp_error( $check ) ) {
			return $check;
		}
		if ( ! Security::rate_limit( 'message', 5, HOUR_IN_SECONDS ) ) {
			return new \WP_Error( 'ct_rate', __( 'Has enviado varios mensajes en poco tiempo. Inténtalo de nuevo más tarde.', 'clicktools' ), array( 'status' => 429 ) );
		}

		$type     = isset( $data['type'] ) && array_key_exists( $data['type'], self::types() ) ? $data['type'] : 'suggestion';
		$title    = isset( $data['title'] ) ? sanitize_text_field( wp_unslash( $data['title'] ) ) : '';
		$message  = isset( $data['message'] ) ? sanitize_textarea_field( wp_unslash( $data['message'] ) ) : '';
		$category = isset( $data['category'] ) ? sanitize_key( $data['category'] ) : '';
		$tool     = isset( $data['tool'] ) ? sanitize_title( $data['tool'] ) : '';
		$email    = isset( $data['email'] ) ? sanitize_email( wp_unslash( $data['email'] ) ) : '';
		$consent  = ! empty( $data['consent'] );

		$errors = array();
		if ( 'contact' !== $type && ( mb_strlen( $title ) < 3 || mb_strlen( $title ) > 120 ) ) {
			$errors['title'] = __( 'Indica un nombre o asunto de entre 3 y 120 caracteres.', 'clicktools' );
		}
		if ( mb_strlen( $message ) < 10 || mb_strlen( $message ) > 3000 ) {
			$errors['message'] = __( 'Describe el problema con entre 10 y 3000 caracteres.', 'clicktools' );
		}
		if ( 'contact' === $type && ! is_email( $email ) ) {
			$errors['email'] = __( 'Necesitamos un correo válido para poder responderte.', 'clicktools' );
		}
		if ( '' !== $email && ! is_email( $email ) ) {
			$errors['email'] = __( 'El correo electrónico no parece válido.', 'clicktools' );
		}
		if ( '' !== $email && ! $consent ) {
			$errors['consent'] = __( 'Para guardar tu correo necesitamos que aceptes la política de privacidad.', 'clicktools' );
		}
		if ( $category && ! Registry::category( $category ) ) {
			$category = '';
		}
		if ( $tool && ! Registry::tool( $tool, false ) ) {
			$tool = '';
		}
		if ( $errors ) {
			return new \WP_Error( 'ct_invalid', __( 'Revisa los campos marcados.', 'clicktools' ), array( 'status' => 400, 'fields' => $errors ) );
		}

		if ( '' === $title ) {
			$title = wp_trim_words( $message, 8, '…' );
		}

		$post_id = wp_insert_post(
			array(
				'post_type'    => self::CPT,
				'post_status'  => 'private',
				'post_title'   => $title,
				'post_content' => $message,
			),
			true
		);
		if ( is_wp_error( $post_id ) ) {
			return new \WP_Error( 'ct_save', __( 'No hemos podido guardar el mensaje. Inténtalo más tarde.', 'clicktools' ), array( 'status' => 500 ) );
		}
		update_post_meta( $post_id, '_ct_type', $type );
		update_post_meta( $post_id, '_ct_state', 'new' );
		update_post_meta( $post_id, '_ct_priority', 0 );
		if ( $category ) {
			update_post_meta( $post_id, '_ct_category', $category );
		}
		if ( $tool ) {
			update_post_meta( $post_id, '_ct_tool', $tool );
		}
		if ( $email ) {
			update_post_meta( $post_id, '_ct_email', $email );
			update_post_meta( $post_id, '_ct_consent', gmdate( 'c' ) );
		}

		self::notify( $post_id, $type, $title );
		return array(
			'ok'      => true,
			'message' => __( '¡Gracias! Hemos recibido tu mensaje. Lo revisaremos personalmente.', 'clicktools' ),
		);
	}

	/**
	 * Aviso opcional por correo al administrador (sin incluir datos personales).
	 *
	 * @param int    $post_id ID.
	 * @param string $type    Tipo.
	 * @param string $title   Asunto.
	 */
	private static function notify( $post_id, $type, $title ) {
		if ( ! clicktools_setting( 'notify_on_message' ) ) {
			return;
		}
		$to = clicktools_setting( 'notify_email' );
		$to = $to ? $to : get_option( 'admin_email' );
		$types = self::types();
		wp_mail(
			$to,
			/* translators: %s: tipo de mensaje */
			sprintf( __( '[HerramientasClave] Nuevo mensaje: %s', 'clicktools' ), $types[ $type ] ),
			sprintf(
				/* translators: 1: asunto, 2: enlace de revisión */
				__( "Asunto: %1\$s\n\nRevísalo en el panel: %2\$s", 'clicktools' ),
				$title,
				admin_url( 'post.php?post=' . (int) $post_id . '&action=edit' )
			)
		);
	}

	/**
	 * Elimina mensajes más antiguos que el periodo de conservación configurado.
	 */
	public static function purge_old() {
		$days = (int) clicktools_setting( 'messages_retention', 365 );
		if ( $days <= 0 ) {
			return;
		}
		$old = get_posts(
			array(
				'post_type'      => self::CPT,
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => 200,
				'date_query'     => array(
					array(
						'before' => gmdate( 'Y-m-d', time() - $days * DAY_IN_SECONDS ),
					),
				),
			)
		);
		foreach ( $old as $id ) {
			wp_delete_post( $id, true );
		}
	}
}
