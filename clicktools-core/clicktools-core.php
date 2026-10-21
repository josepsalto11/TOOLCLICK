<?php
/**
 * Plugin Name:       HerramientasClave Core
 * Description:       Plataforma de herramientas online (PDF, imágenes, texto, calculadoras, conversores, QR, fechas, desarrollo, seguridad, archivos, productividad y empresas). Incluye catálogo, buscador, páginas SEO por herramienta, plantilla visual propia, formularios, consentimiento y administración. «Todo lo que necesitas, en un clic».
 * Version:           1.1.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            HerramientasClave
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       clicktools
 * Domain Path:       /languages
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

define( 'CLICKTOOLS_VERSION', '1.1.0' );
define( 'CLICKTOOLS_FILE', __FILE__ );
define( 'CLICKTOOLS_DIR', plugin_dir_path( __FILE__ ) );
define( 'CLICKTOOLS_URL', plugin_dir_url( __FILE__ ) );
define( 'CLICKTOOLS_MIN_PHP', '7.4' );
define( 'CLICKTOOLS_MIN_WP', '6.4' );

if ( version_compare( PHP_VERSION, CLICKTOOLS_MIN_PHP, '<' ) || version_compare( get_bloginfo( 'version' ), CLICKTOOLS_MIN_WP, '<' ) ) {
	add_action(
		'admin_notices',
		static function () {
			echo '<div class="notice notice-error"><p>';
			echo esc_html(
				sprintf(
					/* translators: 1: versión mínima de PHP, 2: versión mínima de WordPress */
					__( 'HerramientasClave Core necesita PHP %1$s y WordPress %2$s o superiores. El plugin no se ha cargado.', 'clicktools' ),
					CLICKTOOLS_MIN_PHP,
					CLICKTOOLS_MIN_WP
				)
			);
			echo '</p></div>';
		}
	);
	return;
}

require_once CLICKTOOLS_DIR . 'includes/functions.php';
require_once CLICKTOOLS_DIR . 'includes/class-settings.php';
require_once CLICKTOOLS_DIR . 'includes/class-registry.php';
require_once CLICKTOOLS_DIR . 'includes/class-router.php';
require_once CLICKTOOLS_DIR . 'includes/class-templates.php';
require_once CLICKTOOLS_DIR . 'includes/class-assets.php';
require_once CLICKTOOLS_DIR . 'includes/class-seo.php';
require_once CLICKTOOLS_DIR . 'includes/class-security.php';
require_once CLICKTOOLS_DIR . 'includes/class-messages.php';
require_once CLICKTOOLS_DIR . 'includes/class-consent.php';
require_once CLICKTOOLS_DIR . 'includes/class-ads.php';
require_once CLICKTOOLS_DIR . 'includes/class-analytics.php';
require_once CLICKTOOLS_DIR . 'includes/class-engines.php';
require_once CLICKTOOLS_DIR . 'includes/class-rest.php';
require_once CLICKTOOLS_DIR . 'includes/class-shortcodes.php';
require_once CLICKTOOLS_DIR . 'includes/class-installer.php';
require_once CLICKTOOLS_DIR . 'includes/class-plugin.php';

if ( is_admin() ) {
	require_once CLICKTOOLS_DIR . 'includes/admin/class-admin.php';
}

register_activation_hook( __FILE__, array( 'ClickTools\\Installer', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'ClickTools\\Installer', 'deactivate' ) );

ClickTools\Plugin::instance();
