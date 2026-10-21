<?php
/**
 * Pantalla de ajustes con pestañas.
 *
 * @package ClickTools
 */

namespace ClickTools\Admin;

use ClickTools\Engines;
use ClickTools\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Definición, pintado y guardado de los ajustes.
 */
class Settings_Page {

	/**
	 * Pestañas y campos.
	 *
	 * @return array
	 */
	public static function tabs() {
		return array(
			'general'  => array(
				'label'  => __( 'General', 'clicktools' ),
				'fields' => array(
					array( 'brand_name', 'text', __( 'Nombre de la marca', 'clicktools' ) ),
					array( 'slogan', 'text', __( 'Eslogan principal', 'clicktools' ) ),
					array( 'slogan_secondary', 'text', __( 'Eslogan secundario', 'clicktools' ) ),
					array( 'site_shell', 'checkbox', __( 'Usar la plantilla de HerramientasClave en todo el sitio', 'clicktools' ), __( 'Recomendado. Si lo desactivas, las herramientas se muestran dentro de tu tema y puede que debas ajustar estilos.', 'clicktools' ) ),
					array( 'show_blog_in_header', 'checkbox', __( 'Mostrar el enlace al blog en la cabecera', 'clicktools' ) ),
					array( 'feature_favorites', 'checkbox', __( 'Permitir marcar herramientas como favoritas (se guardan en el navegador del visitante)', 'clicktools' ) ),
					array( 'feature_history', 'checkbox', __( 'Ofrecer historial local opcional (desactivado para cada visitante hasta que lo active)', 'clicktools' ) ),
					array( 'client_max_mb', 'number', __( 'Tamaño máximo orientativo por archivo en el navegador (MB)', 'clicktools' ), __( 'Los archivos se procesan en el dispositivo del visitante; por encima de este tamaño se avisa y se rechaza para evitar bloqueos.', 'clicktools' ) ),
				),
			),
			'legal'    => array(
				'label'  => __( 'Datos legales', 'clicktools' ),
				'intro'  => __( 'Estos datos se insertan en el aviso legal, la política de privacidad y la de cookies. Rellénalos con información real del titular del sitio; HerramientasClave no los inventa. Revisa los textos legales con un profesional si tienes dudas.', 'clicktools' ),
				'fields' => array(
					array( 'owner_name', 'text', __( 'Titular (nombre o razón social)', 'clicktools' ) ),
					array( 'owner_nif', 'text', __( 'NIF/CIF', 'clicktools' ) ),
					array( 'owner_address', 'textarea', __( 'Domicilio', 'clicktools' ) ),
					array( 'owner_email', 'email', __( 'Correo de contacto', 'clicktools' ) ),
					array( 'owner_registry', 'text', __( 'Datos registrales (si es una sociedad)', 'clicktools' ), __( 'Por ejemplo: Registro Mercantil, tomo, folio y hoja. Déjalo vacío si no aplica.', 'clicktools' ) ),
					array( 'privacy_email', 'email', __( 'Correo para ejercer derechos de privacidad', 'clicktools' ) ),
					array( 'hosting_provider', 'text', __( 'Proveedor de alojamiento', 'clicktools' ), __( 'Se cita como encargado del tratamiento en la política de privacidad.', 'clicktools' ) ),
					array( 'legal_updated', 'date', __( 'Fecha de última actualización de los textos legales', 'clicktools' ) ),
				),
			),
			'forms'    => array(
				'label'  => __( 'Formularios', 'clicktools' ),
				'fields' => array(
					array( 'notify_on_message', 'checkbox', __( 'Avisarme por correo cuando llegue un mensaje o una sugerencia', 'clicktools' ) ),
					array( 'notify_email', 'email', __( 'Correo para los avisos', 'clicktools' ), __( 'Si lo dejas vacío se usa el correo de administración de WordPress.', 'clicktools' ) ),
					array( 'messages_retention', 'number', __( 'Conservar los mensajes durante (días)', 'clicktools' ), __( 'Pasado este plazo se eliminan automáticamente. Usa 0 para no borrarlos nunca (deberás justificarlo en tu política de privacidad).', 'clicktools' ) ),
				),
			),
			'privacy'  => array(
				'label'  => __( 'Analítica', 'clicktools' ),
				'intro'  => __( 'La analítica propia es agregada: solo cuenta visitas y usos por herramienta y día, sin cookies, sin IP y sin identificadores. Está desactivada por defecto.', 'clicktools' ),
				'fields' => array(
					array( 'analytics_enabled', 'checkbox', __( 'Activar la analítica propia agregada', 'clicktools' ) ),
					array( 'analytics_respect_dnt', 'checkbox', __( 'Respetar «Do Not Track» y «Global Privacy Control»', 'clicktools' ) ),
					array( 'analytics_retention', 'number', __( 'Conservar estadísticas durante (días)', 'clicktools' ) ),
					array( 'external_analytics_src', 'url', __( 'Script de analítica externa (opcional, https)', 'clicktools' ), __( 'Solo se carga después de que el visitante acepte las cookies de analítica. Descríbelo en la política de cookies.', 'clicktools' ) ),
					array( 'external_analytics_dom', 'text', __( 'Valor data-domain del script externo (si lo necesita)', 'clicktools' ) ),
				),
			),
			'ads'      => array(
				'label'  => __( 'Publicidad y consentimiento', 'clicktools' ),
				'intro'  => __( 'La publicidad está desactivada por defecto. Los anuncios no se cargan hasta que el visitante acepta las cookies de publicidad. Antes de activarla necesitas una cuenta de AdSense aprobada y, en el Espacio Económico Europeo, una plataforma de gestión del consentimiento compatible si Google lo exige.', 'clicktools' ),
				'fields' => array(
					array( 'ads_enabled', 'checkbox', __( 'Activar los espacios publicitarios', 'clicktools' ) ),
					array( 'adsense_client', 'text', __( 'ID de editor de AdSense (ca-pub-…)', 'clicktools' ) ),
					array( 'ad_slot_home', 'text', __( 'ID de bloque: portada', 'clicktools' ) ),
					array( 'ad_slot_tool', 'text', __( 'ID de bloque: páginas de herramienta (bajo el resultado)', 'clicktools' ) ),
					array( 'ad_slot_blog', 'text', __( 'ID de bloque: artículos del blog', 'clicktools' ) ),
					array( 'ad_slot_page', 'text', __( 'ID de bloque: páginas y categorías', 'clicktools' ) ),
					array(
						'consent_mode',
						'select',
						__( 'Gestión del consentimiento', 'clicktools' ),
						__( 'Con «externa», HerramientasClave no muestra su banner y asume que tu plataforma de consentimiento carga los anuncios según la elección del visitante.', 'clicktools' ),
						array(
							'builtin'  => __( 'Banner de HerramientasClave', 'clicktools' ),
							'external' => __( 'Plataforma externa (por ejemplo, la CMP de Google)', 'clicktools' ),
						),
					),
				),
			),
			'server'   => array(
				'label'  => __( 'Procesamiento en servidor', 'clicktools' ),
				'intro'  => __( 'Algunas conversiones (Word ↔ PDF, proteger o desbloquear PDF, compresión avanzada, vídeo y audio) necesitan programas instalados en el servidor. Están desactivadas por defecto: los archivos de los visitantes salen de su dispositivo, se procesan en tu servidor y se borran al terminar. Actívalo solo si tu alojamiento lo permite y lo explicas en la política de privacidad.', 'clicktools' ),
				'fields' => array(
					array( 'server_enabled', 'checkbox', __( 'Activar las herramientas que procesan en el servidor', 'clicktools' ) ),
					array( 'server_max_mb', 'number', __( 'Tamaño máximo por archivo (MB)', 'clicktools' ) ),
					array( 'server_timeout', 'number', __( 'Tiempo máximo por conversión (segundos)', 'clicktools' ) ),
					array( 'server_rate_hour', 'number', __( 'Conversiones por hora y visitante', 'clicktools' ), __( '0 = sin límite (no recomendado en un sitio público).', 'clicktools' ) ),
					array( 'path_libreoffice', 'text', __( 'Ruta de LibreOffice (soffice)', 'clicktools' ), __( 'Vacío = detección automática. Solo rutas absolutas, sin argumentos.', 'clicktools' ) ),
					array( 'path_ghostscript', 'text', __( 'Ruta de Ghostscript (gs)', 'clicktools' ) ),
					array( 'path_qpdf', 'text', __( 'Ruta de qpdf', 'clicktools' ) ),
					array( 'path_ffmpeg', 'text', __( 'Ruta de FFmpeg', 'clicktools' ) ),
				),
			),
			'seo'      => array(
				'label'  => __( 'SEO', 'clicktools' ),
				'fields' => array(
					array(
						'seo_output',
						'select',
						__( 'Etiquetas SEO de HerramientasClave', 'clicktools' ),
						__( 'En «automático», HerramientasClave no imprime sus metadatos si detecta Yoast SEO, Rank Math u otro plugin SEO, y les pasa los títulos y descripciones de las herramientas.', 'clicktools' ),
						array(
							'auto' => __( 'Automático', 'clicktools' ),
							'on'   => __( 'Siempre', 'clicktools' ),
							'off'  => __( 'Nunca', 'clicktools' ),
						),
					),
					array( 'gsc_verification', 'text', __( 'Código de verificación de Google Search Console (opcional)', 'clicktools' ), __( 'Solo el valor del atributo content de la metaetiqueta.', 'clicktools' ) ),
					array( 'redirects', 'textarea', __( 'Redirecciones 301', 'clicktools' ), __( 'Una por línea: /ruta-antigua/ /ruta-nueva/ (las líneas que empiezan por # se ignoran).', 'clicktools' ) ),
				),
			),
			'site'     => array(
				'label'  => __( 'Mantenimiento e idiomas', 'clicktools' ),
				'fields' => array(
					array( 'maintenance', 'checkbox', __( 'Activar el modo mantenimiento', 'clicktools' ), __( 'Los visitantes ven un aviso con estado 503; los administradores siguen viendo el sitio.', 'clicktools' ) ),
					array( 'maintenance_message', 'textarea', __( 'Mensaje de mantenimiento', 'clicktools' ) ),
					array(
						'languages',
						'multicheck',
						__( 'Idiomas que se muestran en el selector', 'clicktools' ),
						__( 'El español es el idioma principal. Activa catalán o inglés solo cuando tengas el sitio traducido (por ejemplo, con un plugin multilingüe) e indica sus direcciones abajo.', 'clicktools' ),
						array(
							'es' => 'Español',
							'ca' => 'Català',
							'en' => 'English',
						),
					),
					array( 'language_urls', 'textarea', __( 'Direcciones de cada idioma', 'clicktools' ), __( 'Una por línea: código y URL, por ejemplo «ca https://ejemplo.com/ca/».', 'clicktools' ) ),
					array( 'delete_on_uninstall', 'checkbox', __( 'Borrar los datos de HerramientasClave al desinstalar el plugin', 'clicktools' ), __( 'Ajustes, mensajes y estadísticas. Las páginas y entradas creadas se conservan.', 'clicktools' ) ),
				),
			),
		);
	}

	/**
	 * Pinta la pantalla.
	 */
	public static function page() {
		$tabs = self::tabs();
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'general';
		if ( ! isset( $tabs[ $tab ] ) ) {
			$tab = 'general';
		}
		$values = Settings::all();
		echo '<div class="wrap ct-admin"><h1>' . esc_html__( 'Ajustes de HerramientasClave', 'clicktools' ) . '</h1>';
		echo '<nav class="nav-tab-wrapper" aria-label="' . esc_attr__( 'Secciones de ajustes', 'clicktools' ) . '">';
		foreach ( $tabs as $key => $def ) {
			$url = add_query_arg( array( 'page' => 'clicktools-settings', 'tab' => $key ), admin_url( 'admin.php' ) );
			echo '<a class="nav-tab' . ( $key === $tab ? ' nav-tab-active' : '' ) . '" href="' . esc_url( $url ) . '"' . ( $key === $tab ? ' aria-current="page"' : '' ) . '>' . esc_html( $def['label'] ) . '</a>';
		}
		echo '</nav>';
		if ( ! empty( $tabs[ $tab ]['intro'] ) ) {
			echo '<p class="ct-admin-intro">' . esc_html( $tabs[ $tab ]['intro'] ) . '</p>';
		}
		if ( 'server' === $tab ) {
			self::engines_status();
		}
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		echo '<input type="hidden" name="action" value="clicktools_save_settings"><input type="hidden" name="tab" value="' . esc_attr( $tab ) . '">';
		wp_nonce_field( 'clicktools_save_settings' );
		echo '<table class="form-table" role="presentation"><tbody>';
		foreach ( $tabs[ $tab ]['fields'] as $field ) {
			self::field( $field, $values );
		}
		echo '</tbody></table>';
		submit_button( __( 'Guardar cambios', 'clicktools' ) );
		echo '</form></div>';
	}

	/**
	 * Pinta un campo.
	 *
	 * @param array $field  Definición [clave, tipo, etiqueta, ayuda, opciones].
	 * @param array $values Valores actuales.
	 */
	private static function field( array $field, array $values ) {
		list( $key, $type, $label ) = $field;
		$help    = isset( $field[3] ) ? $field[3] : '';
		$options = isset( $field[4] ) ? $field[4] : array();
		$value   = isset( $values[ $key ] ) ? $values[ $key ] : '';
		$id      = 'ct-' . $key;
		$name    = 'settings[' . $key . ']';
		$desc    = $help ? ' aria-describedby="' . esc_attr( $id ) . '-help"' : '';
		echo '<tr><th scope="row">';
		if ( 'checkbox' === $type || 'multicheck' === $type ) {
			echo esc_html( $label );
		} else {
			echo '<label for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label>';
		}
		echo '</th><td>';
		switch ( $type ) {
			case 'checkbox':
				echo '<label for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( ! empty( $value ), true, false ) . $desc . '> ' . esc_html__( 'Activado', 'clicktools' ) . '</label>'; // phpcs:ignore WordPress.Security.EscapeOutput
				break;
			case 'textarea':
				echo '<textarea class="large-text" rows="4" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . $desc . '>' . esc_textarea( (string) $value ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput
				break;
			case 'select':
				echo '<select id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . $desc . '>'; // phpcs:ignore WordPress.Security.EscapeOutput
				foreach ( $options as $opt => $opt_label ) {
					echo '<option value="' . esc_attr( $opt ) . '"' . selected( $value, $opt, false ) . '>' . esc_html( $opt_label ) . '</option>';
				}
				echo '</select>';
				break;
			case 'multicheck':
				echo '<fieldset><legend class="screen-reader-text">' . esc_html( $label ) . '</legend>';
				foreach ( $options as $opt => $opt_label ) {
					$disabled = 'es' === $opt ? ' disabled' : '';
					echo '<label class="ct-admin-check"><input type="checkbox" name="' . esc_attr( $name ) . '[]" value="' . esc_attr( $opt ) . '"' . checked( in_array( $opt, (array) $value, true ), true, false ) . $disabled . '> ' . esc_html( $opt_label ) . '</label>'; // phpcs:ignore WordPress.Security.EscapeOutput
				}
				echo '</fieldset>';
				break;
			case 'number':
				echo '<input type="number" min="0" class="small-text" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '"' . $desc . '>'; // phpcs:ignore WordPress.Security.EscapeOutput
				break;
			default:
				$input_type = in_array( $type, array( 'email', 'url', 'date' ), true ) ? $type : 'text';
				echo '<input type="' . esc_attr( $input_type ) . '" class="regular-text" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '"' . $desc . '>'; // phpcs:ignore WordPress.Security.EscapeOutput
		}
		if ( $help ) {
			echo '<p class="description" id="' . esc_attr( $id ) . '-help">' . esc_html( $help ) . '</p>';
		}
		echo '</td></tr>';
	}

	/**
	 * Estado de los programas de servidor.
	 */
	private static function engines_status() {
		echo '<h2>' . esc_html__( 'Programas detectados', 'clicktools' ) . '</h2>';
		if ( ! Engines::can_exec() ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'Este servidor no permite ejecutar programas externos (proc_open está desactivado). Las herramientas de servidor no estarán disponibles aunque las actives.', 'clicktools' ) . '</p></div>';
		}
		echo '<table class="widefat striped ct-admin-narrow"><thead><tr><th>' . esc_html__( 'Programa', 'clicktools' ) . '</th><th>' . esc_html__( 'Estado', 'clicktools' ) . '</th></tr></thead><tbody>';
		foreach ( Engines::status() as $engine ) {
			echo '<tr><td>' . esc_html( $engine['label'] ) . '</td><td>' . ( $engine['path'] ? '<span class="ct-admin-ok">' . esc_html__( 'Disponible', 'clicktools' ) . '</span> <code>' . esc_html( $engine['path'] ) . '</code>' : '<span class="ct-admin-ko">' . esc_html__( 'No encontrado', 'clicktools' ) . '</span>' ) . '</td></tr>';
		}
		echo '</tbody></table>';
		$upload = wp_max_upload_size();
		/* translators: %s: tamaño */
		echo '<p class="description">' . esc_html( sprintf( __( 'Límite de subida de PHP en este servidor: %s. El tamaño máximo efectivo es el menor entre este valor y el que indiques abajo.', 'clicktools' ), size_format( $upload ) ) ) . '</p>';
	}

	/**
	 * Guarda la pestaña enviada.
	 */
	public static function save() {
		$tabs = self::tabs();
		$tab  = isset( $_POST['tab'] ) ? sanitize_key( wp_unslash( $_POST['tab'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Comprobado en Admin::dispatch().
		if ( ! isset( $tabs[ $tab ] ) ) {
			Admin::back( 'clicktools-settings', 'invalid' );
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Se sanea en Settings::sanitize().
		$posted = isset( $_POST['settings'] ) && is_array( $_POST['settings'] ) ? wp_unslash( $_POST['settings'] ) : array();
		$values = array();
		$errors = array();
		$bad    = array();
		foreach ( $tabs[ $tab ]['fields'] as $field ) {
			list( $key, $type, $label ) = $field;
			if ( 'checkbox' === $type ) {
				$values[ $key ] = ! empty( $posted[ $key ] );
			} elseif ( 'multicheck' === $type ) {
				$values[ $key ] = isset( $posted[ $key ] ) ? array_map( 'sanitize_key', (array) $posted[ $key ] ) : array();
			} else {
				$raw            = isset( $posted[ $key ] ) ? (string) $posted[ $key ] : '';
				$values[ $key ] = $raw;
				if ( 'email' === $type && '' !== trim( $raw ) && ! is_email( trim( $raw ) ) ) {
					/* translators: %s: nombre del campo */
					$errors[] = sprintf( __( '«%s» no es un correo válido.', 'clicktools' ), $label );
					$bad[]    = $key;
				}
				if ( 'adsense_client' === $key && '' !== trim( $raw ) && ! preg_match( '/^ca-pub-\d{10,20}$/', trim( $raw ) ) ) {
					$errors[] = __( 'El ID de editor de AdSense debe tener el formato ca-pub-0000000000000000.', 'clicktools' );
					$bad[]    = $key;
				}
				if ( 0 === strpos( $key, 'path_' ) && '' !== trim( $raw ) && ! preg_match( '#^/[A-Za-z0-9._/\-]+$#', trim( $raw ) ) ) {
					/* translators: %s: nombre del campo */
					$errors[] = sprintf( __( '«%s» debe ser una ruta absoluta sin espacios ni argumentos.', 'clicktools' ), $label );
					$bad[]    = $key;
				}
			}
		}
		// Los campos con errores conservan su valor anterior.
		foreach ( $bad as $key ) {
			unset( $values[ $key ] );
		}
		if ( 'ads' === $tab && ! empty( $values['ads_enabled'] ) && '' === trim( (string) ( isset( $values['adsense_client'] ) ? $values['adsense_client'] : Settings::get( 'adsense_client' ) ) ) ) {
			$errors[] = __( 'Para activar la publicidad indica el ID de editor de AdSense.', 'clicktools' );
			$values['ads_enabled'] = false;
		}
		Settings::update( $values );
		delete_transient( 'clicktools_popularity' );
		Admin::back( 'clicktools-settings', $errors ? 'partial' : 'saved', array( 'tab' => $tab ), $errors );
	}
}
