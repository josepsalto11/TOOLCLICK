<?php
/**
 * Activación, desactivación y creación de contenido inicial.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Instalador.
 */
class Installer {

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'admin_init', array( __CLASS__, 'maybe_upgrade' ) );
	}

	/**
	 * Activación del plugin.
	 */
	public static function activate() {
		if ( false === get_option( Settings::OPTION ) ) {
			add_option( Settings::OPTION, Settings::defaults(), '', true );
		}
		Analytics::install();
		self::create_pages();
		self::create_guides();
		self::schedule();
		Router::add_rules();
		flush_rewrite_rules( false );
		update_option( 'clicktools_version', CLICKTOOLS_VERSION );
		set_transient( 'clicktools_activated', 1, 300 );
	}

	/**
	 * Desactivación: se conservan datos y páginas.
	 */
	public static function deactivate() {
		wp_clear_scheduled_hook( 'clicktools_daily' );
		wp_clear_scheduled_hook( 'clicktools_hourly' );
		flush_rewrite_rules( false );
	}

	/**
	 * Tareas programadas.
	 */
	public static function schedule() {
		if ( ! wp_next_scheduled( 'clicktools_daily' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'clicktools_daily' );
		}
		if ( ! wp_next_scheduled( 'clicktools_hourly' ) ) {
			wp_schedule_event( time() + 300, 'hourly', 'clicktools_hourly' );
		}
	}

	/**
	 * Migraciones al actualizar el plugin (sin reactivar).
	 */
	public static function maybe_upgrade() {
		if ( get_option( 'clicktools_version' ) === CLICKTOOLS_VERSION ) {
			return;
		}
		if ( get_option( 'clicktools_db_version' ) !== Analytics::DB_VERSION ) {
			Analytics::install();
		}
		self::create_pages();
		self::schedule();
		update_option( 'clicktools_version', CLICKTOOLS_VERSION );
		delete_option( 'clicktools_routes_hash' );
	}

	/**
	 * Crea las páginas necesarias si no existen (no sobrescribe páginas existentes).
	 */
	public static function create_pages() {
		$defs  = require CLICKTOOLS_DIR . 'data/pages.php';
		$pages = (array) get_option( 'clicktools_pages', array() );

		foreach ( $defs as $key => $def ) {
			if ( ! empty( $pages[ $key ] ) && get_post( (int) $pages[ $key ] ) ) {
				continue;
			}
			$existing = get_page_by_path( $def['slug'] );
			if ( $existing ) {
				$pages[ $key ] = $existing->ID;
				continue;
			}
			$id = wp_insert_post(
				array(
					'post_type'      => 'page',
					'post_status'    => 'publish',
					'post_title'     => $def['title'],
					'post_name'      => $def['slug'],
					'post_content'   => $def['content'],
					'comment_status' => 'closed',
					'ping_status'    => 'closed',
					'menu_order'     => isset( $def['order'] ) ? (int) $def['order'] : 0,
				),
				true
			);
			if ( ! is_wp_error( $id ) ) {
				$pages[ $key ] = $id;
			}
		}
		update_option( 'clicktools_pages', $pages );

		// Portada y blog: solo si el sitio aún no tiene una portada estática configurada.
		if ( 'posts' === get_option( 'show_on_front' ) && ! empty( $pages['home'] ) ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', (int) $pages['home'] );
			if ( ! empty( $pages['blog'] ) ) {
				update_option( 'page_for_posts', (int) $pages['blog'] );
			}
		}
		$current_privacy = (int) get_option( 'wp_page_for_privacy_policy' );
		if ( ! empty( $pages['privacy'] ) && ( ! $current_privacy || 'publish' !== get_post_status( $current_privacy ) ) ) {
			update_option( 'wp_page_for_privacy_policy', (int) $pages['privacy'] );
		}
	}

	/**
	 * Fuerza la portada y el blog de ClickTools (acción manual desde el panel).
	 */
	public static function use_clicktools_front() {
		$pages = (array) get_option( 'clicktools_pages', array() );
		if ( empty( $pages['home'] ) ) {
			self::create_pages();
			$pages = (array) get_option( 'clicktools_pages', array() );
		}
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', (int) $pages['home'] );
		if ( ! empty( $pages['blog'] ) ) {
			update_option( 'page_for_posts', (int) $pages['blog'] );
		}
	}

	/**
	 * Crea las guías como BORRADORES para que el titular las revise antes de publicarlas.
	 */
	public static function create_guides() {
		if ( get_option( 'clicktools_guides_created' ) ) {
			return;
		}
		$guides = require CLICKTOOLS_DIR . 'data/guides.php';
		$term   = term_exists( 'guias', 'category' );
		if ( ! $term ) {
			$term = wp_insert_term( __( 'Guías y tutoriales', 'clicktools' ), 'category', array( 'slug' => 'guias' ) );
		}
		$term_id = is_array( $term ) ? (int) $term['term_id'] : 0;
		foreach ( $guides as $guide ) {
			if ( get_page_by_path( $guide['slug'], OBJECT, 'post' ) ) {
				continue;
			}
			wp_insert_post(
				array(
					'post_type'     => 'post',
					'post_status'   => 'draft',
					'post_title'    => $guide['title'],
					'post_name'     => $guide['slug'],
					'post_excerpt'  => $guide['excerpt'],
					'post_content'  => $guide['content'],
					'post_category' => $term_id ? array( $term_id ) : array(),
				)
			);
		}
		update_option( 'clicktools_guides_created', 1 );
	}
}
