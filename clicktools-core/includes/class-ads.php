<?php
/**
 * Espacios publicitarios discretos (Google AdSense opcional).
 *
 * Solo se imprimen si el administrador ha configurado un ID de editor y un ID de
 * bloque para esa posición. El script de AdSense lo carga core.js después del
 * consentimiento. Los espacios nunca se colocan sobre los controles de una herramienta.
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Publicidad.
 */
class Ads {

	/**
	 * Posiciones disponibles.
	 *
	 * @return array<string,string>
	 */
	public static function positions() {
		return array(
			'home' => __( 'Inicio: zona secundaria, tras las categorías', 'clicktools' ),
			'tool' => __( 'Herramientas: tras el área de trabajo, antes de las instrucciones', 'clicktools' ),
			'blog' => __( 'Blog: tras el contenido del artículo', 'clicktools' ),
			'page' => __( 'Páginas informativas: tras el contenido', 'clicktools' ),
		);
	}

	/**
	 * Imprime un espacio si está configurado.
	 *
	 * @param string $position Posición.
	 */
	public static function slot( $position ) {
		if ( ! Consent::ads_configured() ) {
			return;
		}
		$slot = clicktools_setting( 'ad_slot_' . $position, '' );
		if ( '' === $slot ) {
			return;
		}
		printf(
			'<aside class="ct-ad" data-ct-ad hidden aria-label="%1$s"><span class="ct-ad__label">%2$s</span><ins class="adsbygoogle" style="display:block" data-ad-client="%3$s" data-ad-slot="%4$s" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>',
			esc_attr__( 'Publicidad', 'clicktools' ),
			esc_html__( 'Publicidad', 'clicktools' ),
			esc_attr( clicktools_setting( 'adsense_client' ) ),
			esc_attr( $slot )
		);
	}
}
