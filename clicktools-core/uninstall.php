<?php
/**
 * Desinstalación de HerramientasClave Core.
 *
 * Por seguridad solo borra datos si el administrador activó
 * "Eliminar datos al desinstalar" en Ajustes. Las páginas y entradas creadas
 * se conservan siempre porque son contenido editable del sitio.
 *
 * @package ClickTools
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$clicktools_settings = get_option( 'clicktools_settings', array() );
if ( empty( $clicktools_settings['delete_on_uninstall'] ) ) {
	return;
}

global $wpdb;

// Mensajes y sugerencias.
$clicktools_ids = get_posts(
	array(
		'post_type'      => 'ct_message',
		'post_status'    => 'any',
		'fields'         => 'ids',
		'posts_per_page' => -1,
	)
);
foreach ( $clicktools_ids as $clicktools_id ) {
	wp_delete_post( $clicktools_id, true );
}

// Estadísticas agregadas.
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}clicktools_stats" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared

// Opciones.
foreach ( array( 'clicktools_settings', 'clicktools_tool_overrides', 'clicktools_custom_tools', 'clicktools_pages', 'clicktools_version', 'clicktools_db_version', 'clicktools_routes_hash', 'clicktools_guides_created', 'clicktools_brand_migrated' ) as $clicktools_option ) {
	delete_option( $clicktools_option );
}
delete_transient( 'clicktools_popularity' );
// Contadores temporales de límite de uso (caducan solos, pero se limpian igualmente).
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_ct\\_rl\\_%' OR option_name LIKE '\\_transient\\_timeout\\_ct\\_rl\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

// Directorio temporal.
$clicktools_uploads = wp_upload_dir( null, false );
$clicktools_tmp     = trailingslashit( $clicktools_uploads['basedir'] ) . 'clicktools-tmp';
if ( is_dir( $clicktools_tmp ) ) {
	$clicktools_it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $clicktools_tmp, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST );
	foreach ( $clicktools_it as $clicktools_item ) {
		$clicktools_item->isDir() ? rmdir( $clicktools_item->getPathname() ) : unlink( $clicktools_item->getPathname() );
	}
	rmdir( $clicktools_tmp );
}
