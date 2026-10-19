<?php
/**
 * Analítica propia, agregada y sin cookies (desactivada por defecto).
 *
 * Solo se guardan contadores diarios: herramienta, tipo de evento y un detalle
 * genérico (código de error, tramo de tiempo, tramo de tamaño, tipo de
 * dispositivo o término de búsqueda sin resultados). Nunca se guarda el
 * contenido de archivos o textos, nombres de archivo, IP ni identificadores.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Analítica agregada.
 */
class Analytics {

	const DB_VERSION = '1';

	/**
	 * Eventos permitidos.
	 *
	 * @return string[]
	 */
	public static function events() {
		return array( 'view', 'done', 'error', 'time', 'size', 'device', 'search_none', 'pro_interest' );
	}

	/**
	 * Registra hooks.
	 */
	public static function init() {
		add_action( 'clicktools_daily', array( __CLASS__, 'purge_old' ) );
	}

	/**
	 * Nombre de la tabla.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'clicktools_stats';
	}

	/**
	 * Crea o actualiza la tabla.
	 */
	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$table   = self::table();
		$sql     = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			day date NOT NULL,
			tool varchar(80) NOT NULL DEFAULT '',
			event varchar(20) NOT NULL DEFAULT '',
			detail varchar(80) NOT NULL DEFAULT '',
			hits int(10) unsigned NOT NULL DEFAULT 0,
			PRIMARY KEY  (id),
			UNIQUE KEY day_tool_event_detail (day,tool,event,detail),
			KEY tool_event (tool,event)
		) {$charset};";
		dbDelta( $sql );
		update_option( 'clicktools_db_version', self::DB_VERSION );
	}

	/**
	 * ¿Debe el cliente enviar eventos?
	 *
	 * @return array|false
	 */
	public static function client_enabled() {
		if ( ! clicktools_setting( 'analytics_enabled' ) ) {
			return false;
		}
		return array( 'respectDnt' => (bool) clicktools_setting( 'analytics_respect_dnt' ) );
	}

	/**
	 * Registra un evento.
	 *
	 * @param array $data Datos recibidos.
	 * @return true|\WP_Error
	 */
	public static function record( array $data ) {
		global $wpdb;
		if ( ! clicktools_setting( 'analytics_enabled' ) ) {
			return new \WP_Error( 'ct_disabled', 'disabled', array( 'status' => 404 ) );
		}
		if ( ! Security::rate_limit( 'event', 600, HOUR_IN_SECONDS ) ) {
			return new \WP_Error( 'ct_rate', 'rate', array( 'status' => 429 ) );
		}
		$event = isset( $data['e'] ) ? sanitize_key( $data['e'] ) : '';
		if ( ! in_array( $event, self::events(), true ) ) {
			return new \WP_Error( 'ct_event', 'event', array( 'status' => 400 ) );
		}
		$tool = isset( $data['t'] ) ? sanitize_title( $data['t'] ) : '';
		if ( $tool && ! Registry::tool( $tool ) ) {
			return new \WP_Error( 'ct_tool', 'tool', array( 'status' => 400 ) );
		}
		$detail = isset( $data['d'] ) ? (string) $data['d'] : '';
		if ( 'search_none' === $event ) {
			$detail = remove_accents( mb_strtolower( sanitize_text_field( $detail ) ) );
			// Evita guardar posibles datos personales: sin dígitos largos ni arrobas.
			if ( preg_match( '/@|\d{5,}/', $detail ) ) {
				return true;
			}
			$detail = mb_substr( $detail, 0, 60 );
		} else {
			$detail = substr( preg_replace( '/[^a-z0-9_<>\-+.]/', '', strtolower( $detail ) ), 0, 40 );
		}
		$table = self::table();
		$day   = gmdate( 'Y-m-d' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Contador agregado.
		$updated = $wpdb->query( $wpdb->prepare( "UPDATE {$table} SET hits = hits + 1 WHERE day = %s AND tool = %s AND event = %s AND detail = %s", $day, $tool, $event, $detail ) );
		if ( ! $updated ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->query( $wpdb->prepare( "INSERT INTO {$table} (day, tool, event, detail, hits) VALUES (%s, %s, %s, %s, 1)", $day, $tool, $event, $detail ) );
		}
		return true;
	}

	/**
	 * Resumen de eventos para el panel.
	 *
	 * @param string $event Evento.
	 * @param int    $days  Días hacia atrás.
	 * @param string $group Columna de agrupación (tool|detail).
	 * @param int    $limit Límite.
	 * @return array
	 */
	public static function summary( $event, $days = 30, $group = 'tool', $limit = 20 ) {
		global $wpdb;
		$group = 'detail' === $group ? 'detail' : 'tool';
		$table = self::table();
		$since = gmdate( 'Y-m-d', time() - $days * DAY_IN_SECONDS );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT {$group} AS label, SUM(hits) AS total FROM {$table} WHERE event = %s AND day >= %s GROUP BY {$group} ORDER BY total DESC LIMIT %d", $event, $since, $limit ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Recuento de vistas por herramienta (para ordenar por uso real).
	 *
	 * @return array<string,int>
	 */
	public static function popularity() {
		if ( ! clicktools_setting( 'analytics_enabled' ) ) {
			return array();
		}
		$cached = get_transient( 'clicktools_popularity' );
		if ( is_array( $cached ) ) {
			return $cached;
		}
		$out = array();
		foreach ( self::summary( 'view', 90, 'tool', 500 ) as $row ) {
			if ( '' !== $row['label'] ) {
				$out[ $row['label'] ] = (int) $row['total'];
			}
		}
		set_transient( 'clicktools_popularity', $out, HOUR_IN_SECONDS );
		return $out;
	}

	/**
	 * Elimina datos antiguos.
	 */
	public static function purge_old() {
		global $wpdb;
		$days  = max( 30, (int) clicktools_setting( 'analytics_retention', 400 ) );
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE day < %s", gmdate( 'Y-m-d', time() - $days * DAY_IN_SECONDS ) ) );
	}

	/**
	 * Vacía todas las estadísticas.
	 */
	public static function purge_all() {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "DELETE FROM {$table}" );
		delete_transient( 'clicktools_popularity' );
	}
}
