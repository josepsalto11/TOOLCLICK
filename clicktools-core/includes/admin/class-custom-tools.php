<?php
/**
 * Calculadoras personalizadas por fórmula, creadas desde el panel.
 *
 * @package ClickTools
 */

namespace ClickTools\Admin;

use ClickTools\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Listado, formulario y validación de calculadoras propias.
 */
class Custom_Tools {

	const MAX_INPUTS  = 8;
	const MAX_OUTPUTS = 4;

	/**
	 * Funciones y constantes admitidas en las fórmulas (igual que assets/js/lib/expr.js).
	 *
	 * @var array
	 */
	private static $funcs = array( 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'ln', 'log', 'log2', 'exp', 'abs', 'round', 'floor', 'ceil', 'min', 'max', 'pow', 'root' );

	/**
	 * Funciones con número variable de argumentos (el resto lleva 1, salvo pow y root, que llevan 2).
	 *
	 * @var string[]
	 */
	private static $variadic = array( 'min', 'max' );

	/**
	 * Constantes.
	 *
	 * @var string[]
	 */
	private static $consts = array( 'pi', 'e', 'tau' );

	/**
	 * Calculadoras guardadas.
	 *
	 * @return array
	 */
	public static function all() {
		$list = get_option( Registry::CUSTOM_OPTION, array() );
		return is_array( $list ) ? $list : array();
	}

	/**
	 * Pinta el listado o el formulario.
	 */
	public static function page() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$edit = isset( $_GET['edit'] ) ? sanitize_title( wp_unslash( $_GET['edit'] ) ) : '';
		$new  = isset( $_GET['new'] );
		// phpcs:enable
		if ( $edit || $new ) {
			self::form( $edit );
			return;
		}
		$list = self::all();
		echo '<div class="wrap ct-admin"><h1 class="wp-heading-inline">' . esc_html__( 'Calculadoras propias', 'clicktools' ) . '</h1>';
		echo ' <a class="page-title-action" href="' . esc_url( admin_url( 'admin.php?page=clicktools-custom&new=1' ) ) . '">' . esc_html__( 'Añadir calculadora', 'clicktools' ) . '</a><hr class="wp-header-end">';
		echo '<p class="ct-admin-intro">' . esc_html__( 'Crea calculadoras sencillas a partir de fórmulas sin programar: defines los campos de entrada y las fórmulas de los resultados. Las fórmulas se evalúan en el navegador del visitante con un analizador seguro (no se ejecuta código).', 'clicktools' ) . '</p>';
		if ( ! $list ) {
			echo '<p>' . esc_html__( 'Todavía no has creado ninguna calculadora.', 'clicktools' ) . '</p></div>';
			return;
		}
		echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'Nombre', 'clicktools' ) . '</th><th>' . esc_html__( 'Categoría', 'clicktools' ) . '</th><th>' . esc_html__( 'Estado', 'clicktools' ) . '</th><th>' . esc_html__( 'Acciones', 'clicktools' ) . '</th></tr></thead><tbody>';
		foreach ( $list as $c ) {
			$cat  = Registry::category( $c['cat'] );
			$tool = Registry::tool( $c['slug'], false );
			echo '<tr><td><strong>' . esc_html( $c['name'] ) . '</strong><br><code>' . esc_html( $c['slug'] ) . '</code></td>';
			echo '<td>' . esc_html( $cat ? $cat['name'] : $c['cat'] ) . '</td>';
			echo '<td>' . ( ! empty( $c['enabled'] ) ? esc_html__( 'Publicada', 'clicktools' ) : esc_html__( 'Borrador', 'clicktools' ) ) . '</td><td class="ct-admin-row-actions">';
			echo '<a class="button button-small" href="' . esc_url( add_query_arg( array( 'page' => 'clicktools-custom', 'edit' => $c['slug'] ), admin_url( 'admin.php' ) ) ) . '">' . esc_html__( 'Editar', 'clicktools' ) . '</a> ';
			if ( $tool && Registry::is_public( $tool ) ) {
				echo '<a class="button button-small" href="' . esc_url( Registry::url( $tool ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Ver', 'clicktools' ) . '</a> ';
			}
			Admin::action_button( 'delete_custom', __( 'Eliminar', 'clicktools' ), 'button button-small button-link-delete', __( '¿Eliminar esta calculadora? Su página dejará de existir.', 'clicktools' ), array( 'slug' => $c['slug'] ) );
			echo '</td></tr>';
		}
		echo '</tbody></table></div>';
	}

	/**
	 * Formulario de alta o edición.
	 *
	 * @param string $slug Slug a editar (vacío para nueva).
	 */
	private static function form( $slug ) {
		$c = array(
			'slug'     => '',
			'name'     => '',
			'desc'     => '',
			'intro'    => '',
			'cat'      => 'calculadoras',
			'priority' => 40,
			'enabled'  => false,
			'inputs'   => array(),
			'outputs'  => array(),
		);
		$draft = get_transient( 'clicktools_custom_draft_' . get_current_user_id() );
		if ( is_array( $draft ) ) {
			delete_transient( 'clicktools_custom_draft_' . get_current_user_id() );
			$c = array_merge( $c, $draft );
		} elseif ( $slug ) {
			foreach ( self::all() as $item ) {
				if ( $item['slug'] === $slug ) {
					$c = array_merge( $c, $item );
				}
			}
		}
		if ( ! $c['inputs'] && ! $slug ) {
			$c['inputs']  = array(
				array( 'key' => 'precio', 'label' => __( 'Precio', 'clicktools' ), 'unit' => '€', 'default' => '100' ),
				array( 'key' => 'cantidad', 'label' => __( 'Cantidad', 'clicktools' ), 'unit' => '', 'default' => '3' ),
			);
			$c['outputs'] = array( array( 'label' => __( 'Total', 'clicktools' ), 'formula' => 'precio * cantidad', 'format' => 'money', 'decimals' => '2' ) );
		}
		$is_edit = '' !== $slug;
		echo '<div class="wrap ct-admin"><h1>' . ( $is_edit ? esc_html__( 'Editar calculadora', 'clicktools' ) : esc_html__( 'Nueva calculadora', 'clicktools' ) ) . '</h1>';
		echo '<p><a href="' . esc_url( admin_url( 'admin.php?page=clicktools-custom' ) ) . '">← ' . esc_html__( 'Volver', 'clicktools' ) . '</a></p>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" id="ct-custom-form"><input type="hidden" name="action" value="clicktools_save_custom"><input type="hidden" name="original" value="' . esc_attr( $slug ) . '">';
		wp_nonce_field( 'clicktools_save_custom' );
		echo '<table class="form-table" role="presentation"><tbody>';
		echo '<tr><th scope="row"><label for="ct-c-name">' . esc_html__( 'Nombre', 'clicktools' ) . '</label></th><td><input type="text" class="regular-text" id="ct-c-name" name="c[name]" value="' . esc_attr( $c['name'] ) . '" required></td></tr>';
		echo '<tr><th scope="row"><label for="ct-c-slug">' . esc_html__( 'URL (slug)', 'clicktools' ) . '</label></th><td><input type="text" class="regular-text" id="ct-c-slug" name="c[slug]" value="' . esc_attr( $c['slug'] ) . '" pattern="[a-z0-9\\-]+" aria-describedby="ct-c-slug-h"><p class="description" id="ct-c-slug-h">' . esc_html__( 'Solo minúsculas, números y guiones. Si lo dejas vacío se genera a partir del nombre.', 'clicktools' ) . '</p></td></tr>';
		echo '<tr><th scope="row"><label for="ct-c-desc">' . esc_html__( 'Descripción corta', 'clicktools' ) . '</label></th><td><input type="text" class="large-text" id="ct-c-desc" name="c[desc]" value="' . esc_attr( $c['desc'] ) . '" required></td></tr>';
		echo '<tr><th scope="row"><label for="ct-c-intro">' . esc_html__( 'Introducción', 'clicktools' ) . '</label></th><td><textarea class="large-text" rows="3" id="ct-c-intro" name="c[intro]">' . esc_textarea( $c['intro'] ) . '</textarea></td></tr>';
		echo '<tr><th scope="row"><label for="ct-c-cat">' . esc_html__( 'Categoría', 'clicktools' ) . '</label></th><td><select id="ct-c-cat" name="c[cat]">';
		foreach ( Registry::categories() as $cslug => $cat ) {
			echo '<option value="' . esc_attr( $cslug ) . '"' . selected( $c['cat'], $cslug, false ) . '>' . esc_html( $cat['name'] ) . '</option>';
		}
		echo '</select></td></tr>';
		echo '<tr><th scope="row"><label for="ct-c-priority">' . esc_html__( 'Prioridad', 'clicktools' ) . '</label></th><td><input type="number" class="small-text" min="0" max="999" id="ct-c-priority" name="c[priority]" value="' . esc_attr( (string) $c['priority'] ) . '"></td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Publicación', 'clicktools' ) . '</th><td><label><input type="checkbox" name="c[enabled]" value="1"' . checked( ! empty( $c['enabled'] ), true, false ) . '> ' . esc_html__( 'Publicada (visible en la web)', 'clicktools' ) . '</label></td></tr>';
		echo '</tbody></table>';

		echo '<h2>' . esc_html__( 'Campos de entrada', 'clicktools' ) . '</h2><p class="description">' . esc_html__( 'La clave es el nombre que usarás en las fórmulas: minúsculas, números y guion bajo, empezando por una letra (por ejemplo, precio_base). Deja vacías las filas que no necesites.', 'clicktools' ) . '</p>';
		echo '<table class="widefat ct-admin-grid"><thead><tr><th scope="col">' . esc_html__( 'Clave', 'clicktools' ) . '</th><th scope="col">' . esc_html__( 'Etiqueta', 'clicktools' ) . '</th><th scope="col">' . esc_html__( 'Unidad', 'clicktools' ) . '</th><th scope="col">' . esc_html__( 'Valor inicial', 'clicktools' ) . '</th></tr></thead><tbody>';
		for ( $i = 0; $i < self::MAX_INPUTS; $i++ ) {
			$in = isset( $c['inputs'][ $i ] ) ? $c['inputs'][ $i ] : array( 'key' => '', 'label' => '', 'unit' => '', 'default' => '' );
			/* translators: %d: número de fila */
			$row = sprintf( __( 'fila %d', 'clicktools' ), $i + 1 );
			echo '<tr>';
			echo '<td><input type="text" class="ct-input-key" name="c[inputs][' . (int) $i . '][key]" value="' . esc_attr( $in['key'] ) . '" aria-label="' . esc_attr( __( 'Clave', 'clicktools' ) . ' ' . $row ) . '"></td>';
			echo '<td><input type="text" class="regular-text" name="c[inputs][' . (int) $i . '][label]" value="' . esc_attr( $in['label'] ) . '" aria-label="' . esc_attr( __( 'Etiqueta', 'clicktools' ) . ' ' . $row ) . '"></td>';
			echo '<td><input type="text" class="small-text" name="c[inputs][' . (int) $i . '][unit]" value="' . esc_attr( $in['unit'] ) . '" aria-label="' . esc_attr( __( 'Unidad', 'clicktools' ) . ' ' . $row ) . '"></td>';
			echo '<td><input type="text" class="small-text" name="c[inputs][' . (int) $i . '][default]" value="' . esc_attr( (string) $in['default'] ) . '" aria-label="' . esc_attr( __( 'Valor inicial', 'clicktools' ) . ' ' . $row ) . '"></td>';
			echo '</tr>';
		}
		echo '</tbody></table>';

		echo '<h2>' . esc_html__( 'Resultados', 'clicktools' ) . '</h2><p class="description">' . esc_html__( 'Operadores: + − * / ^ % y paréntesis. Funciones: sqrt, round, floor, ceil, abs, min, max, pow, ln, log, exp y trigonométricas. Constantes: pi, e. El primer resultado es el principal.', 'clicktools' ) . '</p>';
		echo '<table class="widefat ct-admin-grid"><thead><tr><th scope="col">' . esc_html__( 'Etiqueta', 'clicktools' ) . '</th><th scope="col">' . esc_html__( 'Fórmula', 'clicktools' ) . '</th><th scope="col">' . esc_html__( 'Formato', 'clicktools' ) . '</th><th scope="col">' . esc_html__( 'Decimales', 'clicktools' ) . '</th></tr></thead><tbody>';
		$formats = array(
			'number'  => __( 'Número', 'clicktools' ),
			'money'   => __( 'Moneda (€)', 'clicktools' ),
			'percent' => __( 'Porcentaje', 'clicktools' ),
		);
		for ( $i = 0; $i < self::MAX_OUTPUTS; $i++ ) {
			$out = isset( $c['outputs'][ $i ] ) ? $c['outputs'][ $i ] : array( 'label' => '', 'formula' => '', 'format' => 'number', 'decimals' => '2' );
			/* translators: %d: número de fila */
			$row = sprintf( __( 'fila %d', 'clicktools' ), $i + 1 );
			echo '<tr><td><input type="text" class="regular-text" name="c[outputs][' . (int) $i . '][label]" value="' . esc_attr( $out['label'] ) . '" aria-label="' . esc_attr( __( 'Etiqueta del resultado', 'clicktools' ) . ' ' . $row ) . '"></td>';
			echo '<td><input type="text" class="large-text code ct-formula" name="c[outputs][' . (int) $i . '][formula]" value="' . esc_attr( $out['formula'] ) . '" aria-label="' . esc_attr( __( 'Fórmula', 'clicktools' ) . ' ' . $row ) . '"><span class="ct-formula-msg" aria-live="polite"></span></td>';
			echo '<td><select name="c[outputs][' . (int) $i . '][format]" aria-label="' . esc_attr( __( 'Formato', 'clicktools' ) . ' ' . $row ) . '">';
			foreach ( $formats as $fk => $fl ) {
				echo '<option value="' . esc_attr( $fk ) . '"' . selected( $out['format'], $fk, false ) . '>' . esc_html( $fl ) . '</option>';
			}
			echo '</select></td><td><input type="number" min="0" max="10" class="small-text" name="c[outputs][' . (int) $i . '][decimals]" value="' . esc_attr( (string) $out['decimals'] ) . '" aria-label="' . esc_attr( __( 'Decimales', 'clicktools' ) . ' ' . $row ) . '"></td></tr>';
		}
		echo '</tbody></table>';
		echo '<div id="ct-custom-preview" class="ct-admin-preview" aria-live="polite"></div>';
		submit_button( $is_edit ? __( 'Guardar cambios', 'clicktools' ) : __( 'Crear calculadora', 'clicktools' ) );
		echo '</form></div>';
	}

	/**
	 * Valida una fórmula (misma gramática que el analizador del navegador).
	 *
	 * @param string   $formula Fórmula.
	 * @param string[] $vars    Claves de entrada.
	 * @return string Mensaje de error o cadena vacía si es válida.
	 */
	public static function validate_formula( $formula, array $vars ) {
		$src = str_replace( array( '×', '÷', '−', '√', 'π' ), array( '*', '/', '-', 'sqrt', 'pi' ), (string) $formula );
		if ( '' === trim( $src ) ) {
			return __( 'La fórmula está vacía.', 'clicktools' );
		}
		if ( strlen( $src ) > 500 ) {
			return __( 'La fórmula es demasiado larga.', 'clicktools' );
		}
		if ( ! preg_match_all( '/\s*(?:(\d+\.?\d*(?:e[-+]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*\/^%!(),]))/A', $src, $m, PREG_SET_ORDER ) ) {
			return __( 'La fórmula contiene caracteres no permitidos.', 'clicktools' );
		}
		$consumed = implode( '', array_column( $m, 0 ) );
		if ( strlen( rtrim( $consumed ) ) !== strlen( rtrim( $src ) ) ) {
			return __( 'La fórmula contiene caracteres no permitidos.', 'clicktools' );
		}
		$count = count( $m );
		$stack = array(); // Cada paréntesis abierto: [función o '', comas].
		foreach ( $m as $i => $tok ) {
			if ( ! empty( $tok[2] ) ) {
				$id      = $tok[2];
				$lower   = strtolower( $id );
				$is_call = isset( $m[ $i + 1 ][3] ) && '(' === $m[ $i + 1 ][3];
				if ( in_array( $lower, self::$funcs, true ) && $is_call ) {
					continue;
				}
				if ( in_array( $id, $vars, true ) || in_array( $lower, self::$consts, true ) ) {
					continue;
				}
				/* translators: %s: nombre */
				return sprintf( __( 'Nombre desconocido en la fórmula: «%s». Usa una de las claves de entrada.', 'clicktools' ), $id );
			}
			$op = isset( $tok[3] ) ? $tok[3] : '';
			if ( '(' === $op ) {
				$prev    = $i > 0 && ! empty( $m[ $i - 1 ][2] ) ? strtolower( $m[ $i - 1 ][2] ) : '';
				$stack[] = array( in_array( $prev, self::$funcs, true ) ? $prev : '', 0 );
			} elseif ( ',' === $op ) {
				if ( ! $stack || '' === $stack[ count( $stack ) - 1 ][0] ) {
					return __( 'Las comas solo pueden separar argumentos de una función.', 'clicktools' );
				}
				++$stack[ count( $stack ) - 1 ][1];
			} elseif ( ')' === $op ) {
				if ( ! $stack ) {
					return __( 'Hay un paréntesis de cierre sin abrir.', 'clicktools' );
				}
				list( $fn, $commas ) = array_pop( $stack );
				if ( '' !== $fn && ! in_array( $fn, self::$variadic, true ) ) {
					$arity = in_array( $fn, array( 'pow', 'root' ), true ) ? 2 : 1;
					if ( $commas + 1 !== $arity ) {
						/* translators: 1: función, 2: número de argumentos */
						return sprintf( __( 'La función %1$s necesita %2$d argumento(s).', 'clicktools' ), $fn, $arity );
					}
				}
			}
		}
		if ( $stack ) {
			return __( 'Falta cerrar algún paréntesis.', 'clicktools' );
		}
		$last = $m[ $count - 1 ];
		if ( isset( $last[3] ) && in_array( $last[3], array( '+', '-', '*', '/', '^', '(', ',' ), true ) ) {
			return __( 'La fórmula termina con un operador.', 'clicktools' );
		}
		return '';
	}

	/**
	 * Guarda una calculadora.
	 */
	public static function save() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Comprobado en Admin::dispatch().
		$raw      = isset( $_POST['c'] ) && is_array( $_POST['c'] ) ? wp_unslash( $_POST['c'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Se sanea campo a campo.
		$original = isset( $_POST['original'] ) ? sanitize_title( wp_unslash( $_POST['original'] ) ) : '';
		// phpcs:enable
		$errors = array();
		$c      = array(
			'name'     => sanitize_text_field( isset( $raw['name'] ) ? $raw['name'] : '' ),
			'desc'     => sanitize_text_field( isset( $raw['desc'] ) ? $raw['desc'] : '' ),
			'intro'    => sanitize_textarea_field( isset( $raw['intro'] ) ? $raw['intro'] : '' ),
			'cat'      => sanitize_key( isset( $raw['cat'] ) ? $raw['cat'] : '' ),
			'priority' => min( 999, max( 0, (int) ( isset( $raw['priority'] ) ? $raw['priority'] : 40 ) ) ),
			'enabled'  => ! empty( $raw['enabled'] ),
			'inputs'   => array(),
			'outputs'  => array(),
		);
		$c['slug'] = sanitize_title( ! empty( $raw['slug'] ) ? $raw['slug'] : $c['name'] );
		if ( '' === $c['name'] ) {
			$errors[] = __( 'Indica un nombre.', 'clicktools' );
		}
		if ( '' === $c['desc'] ) {
			$errors[] = __( 'Indica una descripción corta.', 'clicktools' );
		}
		if ( ! Registry::category( $c['cat'] ) ) {
			$c['cat'] = 'calculadoras';
		}
		if ( '' === $c['slug'] ) {
			$errors[] = __( 'La URL no es válida.', 'clicktools' );
		} else {
			$existing = Registry::tool( $c['slug'], false );
			$taken    = $existing && empty( $existing['custom'] );
			foreach ( self::all() as $item ) {
				if ( $item['slug'] === $c['slug'] && $item['slug'] !== $original ) {
					$taken = true;
				}
			}
			if ( $taken || Registry::category( $c['slug'] ) ) {
				$errors[] = __( 'Ya existe una herramienta o categoría con esa URL. Elige otra.', 'clicktools' );
			}
		}
		$keys = array();
		foreach ( array_slice( isset( $raw['inputs'] ) ? (array) $raw['inputs'] : array(), 0, self::MAX_INPUTS ) as $in ) {
			$key = isset( $in['key'] ) ? strtolower( trim( (string) $in['key'] ) ) : '';
			if ( '' === $key ) {
				continue;
			}
			if ( ! preg_match( '/^[a-z][a-z0-9_]{0,30}$/', $key ) || in_array( $key, self::$funcs, true ) || in_array( $key, self::$consts, true ) ) {
				/* translators: %s: clave */
				$errors[] = sprintf( __( 'La clave «%s» no es válida (minúsculas, números y guion bajo; no puede ser el nombre de una función).', 'clicktools' ), $key );
				continue;
			}
			if ( in_array( $key, $keys, true ) ) {
				/* translators: %s: clave */
				$errors[] = sprintf( __( 'La clave «%s» está repetida.', 'clicktools' ), $key );
				continue;
			}
			$keys[]        = $key;
			$default       = isset( $in['default'] ) ? str_replace( ',', '.', trim( (string) $in['default'] ) ) : '';
			$c['inputs'][] = array(
				'key'     => $key,
				'label'   => sanitize_text_field( isset( $in['label'] ) && '' !== trim( $in['label'] ) ? $in['label'] : $key ),
				'unit'    => sanitize_text_field( isset( $in['unit'] ) ? $in['unit'] : '' ),
				'default' => is_numeric( $default ) ? $default : '',
			);
		}
		if ( ! $c['inputs'] ) {
			$errors[] = __( 'Añade al menos un campo de entrada.', 'clicktools' );
		}
		foreach ( array_slice( isset( $raw['outputs'] ) ? (array) $raw['outputs'] : array(), 0, self::MAX_OUTPUTS ) as $out ) {
			$formula = isset( $out['formula'] ) ? trim( (string) $out['formula'] ) : '';
			if ( '' === $formula ) {
				continue;
			}
			$label = sanitize_text_field( isset( $out['label'] ) && '' !== trim( $out['label'] ) ? $out['label'] : __( 'Resultado', 'clicktools' ) );
			$error = self::validate_formula( $formula, $keys );
			if ( $error ) {
				$errors[] = $label . ': ' . $error;
			}
			$c['outputs'][] = array(
				'label'    => $label,
				// Solo contiene símbolos admitidos por validate_formula() (si no, no se guarda).
				'formula'  => substr( wp_strip_all_tags( $formula ), 0, 500 ),
				'format'   => isset( $out['format'] ) && in_array( $out['format'], array( 'number', 'money', 'percent' ), true ) ? $out['format'] : 'number',
				'decimals' => (string) min( 10, max( 0, (int) ( isset( $out['decimals'] ) ? $out['decimals'] : 2 ) ) ),
			);
		}
		if ( ! $c['outputs'] ) {
			$errors[] = __( 'Añade al menos un resultado con su fórmula.', 'clicktools' );
		}
		if ( $errors ) {
			set_transient( 'clicktools_custom_draft_' . get_current_user_id(), $c, 300 );
			Admin::back( 'clicktools-custom', 'invalid', $original ? array( 'edit' => $original ) : array( 'new' => 1 ), $errors );
		}
		$list  = self::all();
		$found = false;
		foreach ( $list as $i => $item ) {
			if ( $item['slug'] === $original && '' !== $original ) {
				$c['added'] = isset( $item['added'] ) ? $item['added'] : gmdate( 'Y-m-d' );
				$list[ $i ] = $c;
				$found      = true;
			}
		}
		if ( ! $found ) {
			$c['added'] = gmdate( 'Y-m-d' );
			$list[]     = $c;
		}
		update_option( Registry::CUSTOM_OPTION, array_values( $list ), false );
		Tools_Admin::after_change();
		Admin::back( 'clicktools-custom', 'saved', array( 'edit' => $c['slug'] ) );
	}

	/**
	 * Elimina una calculadora.
	 */
	public static function delete() {
		$slug = isset( $_POST['slug'] ) ? sanitize_title( wp_unslash( $_POST['slug'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Comprobado en Admin::dispatch().
		$list = array_values(
			array_filter(
				self::all(),
				static function ( $item ) use ( $slug ) {
					return $item['slug'] !== $slug;
				}
			)
		);
		update_option( Registry::CUSTOM_OPTION, $list, false );
		Tools_Admin::after_change();
		Admin::back( 'clicktools-custom', 'deleted' );
	}
}
