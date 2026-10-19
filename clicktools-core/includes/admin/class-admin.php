<?php
/**
 * Panel de administración de ClickTools.
 *
 * @package ClickTools
 */

namespace ClickTools\Admin;

use ClickTools\Analytics;
use ClickTools\Installer;
use ClickTools\Messages;
use ClickTools\Registry;
use ClickTools\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Menú, pantallas, avisos y acciones del panel.
 */
class Admin {

	const CAP  = 'manage_options';
	const SLUG = 'clicktools';

	/**
	 * Acciones admin-post que gestiona el panel.
	 *
	 * @var string[]
	 */
	private static $actions = array( 'save_settings', 'save_tool', 'reset_tool', 'save_custom', 'delete_custom', 'use_front', 'create_pages', 'purge_stats' );

	/**
	 * Registra hooks.
	 */
	public static function init() {
		require_once __DIR__ . '/class-settings-page.php';
		require_once __DIR__ . '/class-tools-admin.php';
		require_once __DIR__ . '/class-custom-tools.php';
		require_once __DIR__ . '/class-messages-admin.php';
		Messages_Admin::init();

		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_notices', array( __CLASS__, 'notices' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( CLICKTOOLS_FILE ), array( __CLASS__, 'action_links' ) );
		add_filter( 'display_post_states', array( __CLASS__, 'post_states' ), 10, 2 );
		foreach ( self::$actions as $action ) {
			add_action( 'admin_post_clicktools_' . $action, array( __CLASS__, 'dispatch' ) );
		}
	}

	/**
	 * Menú y submenús.
	 */
	public static function menu() {
		$icon = 'data:image/svg+xml;base64,' . base64_encode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a7aaad" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/></svg>' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		add_menu_page( 'ClickTools', 'ClickTools', self::CAP, self::SLUG, array( __CLASS__, 'page_dashboard' ), $icon, 58 );
		add_submenu_page( self::SLUG, __( 'Panel de ClickTools', 'clicktools' ), __( 'Panel', 'clicktools' ), self::CAP, self::SLUG, array( __CLASS__, 'page_dashboard' ) );
		$hook = add_submenu_page( self::SLUG, __( 'Herramientas', 'clicktools' ), __( 'Herramientas', 'clicktools' ), self::CAP, 'clicktools-tools', array( Tools_Admin::class, 'page' ) );
		if ( $hook ) {
			add_action( 'load-' . $hook, array( Tools_Admin::class, 'load' ) );
		}
		add_submenu_page( self::SLUG, __( 'Calculadoras personalizadas', 'clicktools' ), __( 'Calculadoras propias', 'clicktools' ), self::CAP, 'clicktools-custom', array( Custom_Tools::class, 'page' ) );
		$new   = Messages_Admin::count_new();
		$label = __( 'Mensajes', 'clicktools' ) . ( $new ? ' <span class="awaiting-mod">' . (int) $new . '</span>' : '' );
		add_submenu_page( self::SLUG, __( 'Mensajes', 'clicktools' ), $label, self::CAP, 'edit.php?post_type=' . Messages::CPT );
		add_submenu_page( self::SLUG, __( 'Estadísticas', 'clicktools' ), __( 'Estadísticas', 'clicktools' ), self::CAP, 'clicktools-stats', array( __CLASS__, 'page_stats' ) );
		add_submenu_page( self::SLUG, __( 'Ajustes de ClickTools', 'clicktools' ), __( 'Ajustes', 'clicktools' ), self::CAP, 'clicktools-settings', array( Settings_Page::class, 'page' ) );
	}

	/**
	 * ¿Es una pantalla de ClickTools?
	 *
	 * @return bool
	 */
	public static function is_own_screen() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen ) {
			return false;
		}
		return false !== strpos( $screen->id, 'clicktools' ) || Messages::CPT === $screen->post_type;
	}

	/**
	 * Estilos y scripts del panel (solo en sus pantallas).
	 *
	 * @param string $hook Pantalla.
	 */
	public static function assets( $hook ) {
		if ( ! self::is_own_screen() ) {
			return;
		}
		wp_enqueue_style( 'clicktools-admin', CLICKTOOLS_URL . 'assets/admin/admin.css', array(), CLICKTOOLS_VERSION );
		wp_register_script( 'clicktools-admin-expr', CLICKTOOLS_URL . 'assets/js/lib/expr.js', array(), CLICKTOOLS_VERSION, true );
		wp_add_inline_script( 'clicktools-admin-expr', 'window.ClickTools = window.ClickTools || {};', 'before' );
		wp_enqueue_script( 'clicktools-admin', CLICKTOOLS_URL . 'assets/admin/admin.js', array( 'clicktools-admin-expr', 'wp-i18n' ), CLICKTOOLS_VERSION, true );
		wp_set_script_translations( 'clicktools-admin', 'clicktools', CLICKTOOLS_DIR . 'languages' );
	}

	/**
	 * Enlaces en la lista de plugins.
	 *
	 * @param array $links Enlaces.
	 * @return array
	 */
	public static function action_links( $links ) {
		array_unshift(
			$links,
			'<a href="' . esc_url( admin_url( 'admin.php?page=clicktools' ) ) . '">' . esc_html__( 'Panel', 'clicktools' ) . '</a>',
			'<a href="' . esc_url( admin_url( 'admin.php?page=clicktools-settings' ) ) . '">' . esc_html__( 'Ajustes', 'clicktools' ) . '</a>'
		);
		return $links;
	}

	/**
	 * Marca las páginas creadas por ClickTools en el listado de páginas.
	 *
	 * @param array    $states Estados.
	 * @param \WP_Post $post   Página.
	 * @return array
	 */
	public static function post_states( $states, $post ) {
		$pages = (array) get_option( 'clicktools_pages', array() );
		if ( in_array( (int) $post->ID, array_map( 'intval', $pages ), true ) ) {
			$states['clicktools'] = 'ClickTools';
		}
		return $states;
	}

	/**
	 * Avisos del panel.
	 */
	public static function notices() {
		if ( ! current_user_can( self::CAP ) ) {
			return;
		}
		$screen = get_current_screen();
		$own    = self::is_own_screen();
		if ( '' === (string) get_option( 'permalink_structure' ) ) {
			echo '<div class="notice notice-error"><p><strong>ClickTools:</strong> ' . esc_html__( 'Las direcciones de las herramientas necesitan enlaces permanentes «bonitos». Elige cualquier estructura distinta de «Simple» en Ajustes › Enlaces permanentes.', 'clicktools' ) . ' <a href="' . esc_url( admin_url( 'options-permalink.php' ) ) . '">' . esc_html__( 'Abrir enlaces permanentes', 'clicktools' ) . '</a></p></div>';
		}
		if ( get_transient( 'clicktools_activated' ) ) {
			delete_transient( 'clicktools_activated' );
			echo '<div class="notice notice-success is-dismissible"><p><strong>' . esc_html__( 'ClickTools está activo.', 'clicktools' ) . '</strong> ' . esc_html__( 'Se han creado las páginas básicas y las guías del blog como borradores. Revisa el panel para completar los datos legales antes de publicar el sitio.', 'clicktools' ) . ' <a href="' . esc_url( admin_url( 'admin.php?page=clicktools' ) ) . '">' . esc_html__( 'Ir al panel', 'clicktools' ) . '</a></p></div>';
		}
		if ( ( $own || ( $screen && in_array( $screen->id, array( 'dashboard', 'plugins' ), true ) ) ) && Settings::missing_legal_fields() ) {
			echo '<div class="notice notice-warning"><p><strong>ClickTools:</strong> ' . esc_html__( 'Faltan datos del titular para los textos legales (aviso legal, privacidad). Las páginas legales muestran avisos hasta que los completes.', 'clicktools' ) . ' <a href="' . esc_url( admin_url( 'admin.php?page=clicktools-settings&tab=legal' ) ) . '">' . esc_html__( 'Completar datos legales', 'clicktools' ) . '</a></p></div>';
		}
		if ( $own && clicktools_setting( 'maintenance' ) ) {
			echo '<div class="notice notice-info"><p>' . esc_html__( 'El modo mantenimiento está activado: los visitantes ven la página de mantenimiento; tú sigues viendo el sitio porque has iniciado sesión.', 'clicktools' ) . '</p></div>';
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Solo muestra un mensaje.
		$msg = isset( $_GET['ct_msg'] ) ? sanitize_key( wp_unslash( $_GET['ct_msg'] ) ) : '';
		if ( $own && $msg ) {
			$messages = array(
				'saved'     => __( 'Cambios guardados.', 'clicktools' ),
				'reset'     => __( 'Se han restablecido los valores originales.', 'clicktools' ),
				'bulk'      => __( 'Acción aplicada a las herramientas seleccionadas.', 'clicktools' ),
				'deleted'   => __( 'Calculadora eliminada.', 'clicktools' ),
				'front'     => __( 'La portada y la página del blog de ClickTools están configuradas.', 'clicktools' ),
				'pages'     => __( 'Se han creado las páginas que faltaban (las existentes no se han modificado).', 'clicktools' ),
				'purged'    => __( 'Estadísticas borradas.', 'clicktools' ),
				'invalid'   => __( 'No se ha guardado: revisa los errores.', 'clicktools' ),
				'partial'   => __( 'Cambios guardados, salvo los campos con errores, que conservan su valor anterior.', 'clicktools' ),
				'nothing'   => __( 'No se ha seleccionado ninguna herramienta.', 'clicktools' ),
			);
			if ( isset( $messages[ $msg ] ) ) {
				$type = in_array( $msg, array( 'invalid', 'nothing' ), true ) ? 'error' : ( 'partial' === $msg ? 'warning' : 'success' );
				echo '<div class="notice notice-' . esc_attr( $type ) . ' is-dismissible"><p>' . esc_html( $messages[ $msg ] ) . '</p></div>';
			}
			$errors = get_transient( 'clicktools_admin_errors_' . get_current_user_id() );
			if ( is_array( $errors ) && $errors ) {
				delete_transient( 'clicktools_admin_errors_' . get_current_user_id() );
				echo '<div class="notice notice-error"><ul class="ct-admin-errors">';
				foreach ( $errors as $error ) {
					echo '<li>' . esc_html( $error ) . '</li>';
				}
				echo '</ul></div>';
			}
		}
	}

	/**
	 * Punto de entrada de las acciones admin-post (comprueba permisos y nonce).
	 */
	public static function dispatch() {
		$action = isset( $_REQUEST['action'] ) ? sanitize_key( wp_unslash( $_REQUEST['action'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$name   = substr( $action, strlen( 'clicktools_' ) );
		if ( ! in_array( $name, self::$actions, true ) ) {
			wp_die( esc_html__( 'Acción no válida.', 'clicktools' ), '', array( 'response' => 400 ) );
		}
		if ( ! current_user_can( self::CAP ) ) {
			wp_die( esc_html__( 'No tienes permiso para hacer esto.', 'clicktools' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( $action );
		switch ( $name ) {
			case 'save_settings':
				Settings_Page::save();
				break;
			case 'save_tool':
				Tools_Admin::save();
				break;
			case 'reset_tool':
				Tools_Admin::reset();
				break;
			case 'save_custom':
				Custom_Tools::save();
				break;
			case 'delete_custom':
				Custom_Tools::delete();
				break;
			case 'use_front':
				Installer::use_clicktools_front();
				self::back( 'clicktools', 'front' );
				break;
			case 'create_pages':
				Installer::create_pages();
				self::back( 'clicktools', 'pages' );
				break;
			case 'purge_stats':
				Analytics::purge_all();
				self::back( 'clicktools-stats', 'purged' );
				break;
		}
		exit;
	}

	/**
	 * Vuelve a una pantalla del panel con un mensaje.
	 *
	 * @param string $page   Página.
	 * @param string $msg    Clave del mensaje.
	 * @param array  $args   Argumentos extra.
	 * @param array  $errors Errores a mostrar.
	 */
	public static function back( $page, $msg, array $args = array(), array $errors = array() ) {
		if ( $errors ) {
			set_transient( 'clicktools_admin_errors_' . get_current_user_id(), $errors, 120 );
		}
		wp_safe_redirect( add_query_arg( array_merge( array( 'page' => $page, 'ct_msg' => $msg ), $args ), admin_url( 'admin.php' ) ) );
		exit;
	}

	/**
	 * Formulario mínimo para una acción admin-post.
	 *
	 * @param string $action  Acción sin prefijo.
	 * @param string $label   Texto del botón.
	 * @param string $class   Clases del botón.
	 * @param string $confirm Mensaje de confirmación opcional.
	 * @param array  $fields  Campos ocultos adicionales.
	 */
	public static function action_button( $action, $label, $class = 'button', $confirm = '', array $fields = array() ) {
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="ct-inline-form"' . ( $confirm ? ' data-confirm="' . esc_attr( $confirm ) . '"' : '' ) . '>';
		echo '<input type="hidden" name="action" value="' . esc_attr( 'clicktools_' . $action ) . '">';
		foreach ( $fields as $name => $value ) {
			echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '">';
		}
		wp_nonce_field( 'clicktools_' . $action );
		echo '<button type="submit" class="' . esc_attr( $class ) . '">' . esc_html( $label ) . '</button></form>';
	}

	/**
	 * Pantalla principal.
	 */
	public static function page_dashboard() {
		require __DIR__ . '/views/dashboard.php';
	}

	/**
	 * Pantalla de estadísticas.
	 */
	public static function page_stats() {
		require __DIR__ . '/views/stats.php';
	}

	/**
	 * Recuento de herramientas por estado (para el panel).
	 *
	 * @return array
	 */
	public static function tool_counts() {
		$all    = Registry::all_tools();
		$counts = array(
			'total'    => count( $all ),
			'public'   => 0,
			'disabled' => 0,
			'server'   => 0,
			'planned'  => 0,
			'beta'     => 0,
			'custom'   => 0,
		);
		foreach ( $all as $tool ) {
			if ( Registry::is_public( $tool ) ) {
				++$counts['public'];
			}
			if ( empty( $tool['enabled'] ) ) {
				++$counts['disabled'];
			}
			if ( isset( $counts[ $tool['status'] ] ) ) {
				++$counts[ $tool['status'] ];
			}
			if ( ! empty( $tool['custom'] ) ) {
				++$counts['custom'];
			}
		}
		return $counts;
	}
}
