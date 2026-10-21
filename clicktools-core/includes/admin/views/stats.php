<?php
/**
 * Estadísticas agregadas.
 *
 * @package ClickTools
 */

use ClickTools\Admin\Admin;
use ClickTools\Analytics;
use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

// phpcs:ignore WordPress.Security.NonceVerification.Recommended
$clicktools_days = isset( $_GET['days'] ) ? (int) $_GET['days'] : 30;
if ( ! in_array( $clicktools_days, array( 7, 30, 90, 365 ), true ) ) {
	$clicktools_days = 30;
}

/**
 * Tabla de un resumen.
 *
 * @param string $title Título.
 * @param array  $rows  Filas label/total.
 * @param string $kind  tool|detail.
 */
$clicktools_table = static function ( $title, array $rows, $kind = 'tool' ) {
	echo '<div class="ct-admin-box"><h2>' . esc_html( $title ) . '</h2>';
	if ( ! $rows ) {
		echo '<p class="description">' . esc_html__( 'Sin datos en este periodo.', 'clicktools' ) . '</p></div>';
		return;
	}
	echo '<table class="widefat striped"><thead><tr><th>' . ( 'tool' === $kind ? esc_html__( 'Herramienta', 'clicktools' ) : esc_html__( 'Detalle', 'clicktools' ) ) . '</th><th class="num">' . esc_html__( 'Total', 'clicktools' ) . '</th></tr></thead><tbody>';
	foreach ( $rows as $row ) {
		$label = (string) $row['label'];
		if ( 'tool' === $kind ) {
			$tool  = '' !== $label ? Registry::tool( $label, false ) : null;
			$label = $tool ? $tool['name'] : ( '' === $label ? __( '(páginas generales)', 'clicktools' ) : $label );
		}
		echo '<tr><td>' . esc_html( $label ) . '</td><td class="num">' . esc_html( number_format_i18n( (int) $row['total'] ) ) . '</td></tr>';
	}
	echo '</tbody></table></div>';
};
?>
<div class="wrap ct-admin">
	<h1><?php esc_html_e( 'Estadísticas', 'clicktools' ); ?></h1>
	<?php if ( ! clicktools_setting( 'analytics_enabled' ) ) : ?>
		<div class="notice notice-info inline"><p>
			<?php esc_html_e( 'La analítica propia está desactivada. Cuando la actives, HerramientasClave contará de forma agregada (por herramienta y día, sin cookies ni datos personales) las visitas, los usos completados y los errores.', 'clicktools' ); ?>
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=clicktools-settings&tab=privacy' ) ); ?>"><?php esc_html_e( 'Activar en Ajustes', 'clicktools' ); ?></a>
		</p></div>
	<?php endif; ?>
	<form method="get" class="ct-admin-inline">
		<input type="hidden" name="page" value="clicktools-stats">
		<label for="ct-stats-days"><?php esc_html_e( 'Periodo', 'clicktools' ); ?></label>
		<select id="ct-stats-days" name="days">
			<?php foreach ( array( 7, 30, 90, 365 ) as $clicktools_d ) : ?>
				<option value="<?php echo (int) $clicktools_d; ?>" <?php selected( $clicktools_days, $clicktools_d ); ?>><?php echo esc_html( sprintf( /* translators: %d: días */ __( 'Últimos %d días', 'clicktools' ), $clicktools_d ) ); ?></option>
			<?php endforeach; ?>
		</select>
		<?php submit_button( __( 'Ver', 'clicktools' ), 'secondary', '', false ); ?>
	</form>
	<div class="ct-admin-columns">
		<?php
		$clicktools_table( __( 'Herramientas más visitadas', 'clicktools' ), Analytics::summary( 'view', $clicktools_days, 'tool', 25 ) );
		$clicktools_table( __( 'Usos completados', 'clicktools' ), Analytics::summary( 'done', $clicktools_days, 'tool', 25 ) );
		$clicktools_table( __( 'Errores por herramienta', 'clicktools' ), Analytics::summary( 'error', $clicktools_days, 'tool', 25 ) );
		$clicktools_table( __( 'Tipos de error', 'clicktools' ), Analytics::summary( 'error', $clicktools_days, 'detail', 25 ), 'detail' );
		$clicktools_table( __( 'Búsquedas sin resultados', 'clicktools' ), Analytics::summary( 'search_none', $clicktools_days, 'detail', 40 ), 'detail' );
		$clicktools_table( __( 'Dispositivos', 'clicktools' ), Analytics::summary( 'device', $clicktools_days, 'detail', 5 ), 'detail' );
		?>
	</div>
	<p class="description"><?php echo esc_html( sprintf( /* translators: %d: días */ __( 'Los datos se conservan %d días y después se eliminan automáticamente.', 'clicktools' ), (int) clicktools_setting( 'analytics_retention', 400 ) ) ); ?></p>
	<?php Admin::action_button( 'purge_stats', __( 'Borrar todas las estadísticas', 'clicktools' ), 'button button-link-delete', __( '¿Borrar todas las estadísticas? No se puede deshacer.', 'clicktools' ) ); ?>
</div>
