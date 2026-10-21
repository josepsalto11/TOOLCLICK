<?php
/**
 * Panel principal de HerramientasClave.
 *
 * @package ClickTools
 */

use ClickTools\Admin\Admin;
use ClickTools\Admin\Messages_Admin;
use ClickTools\Engines;
use ClickTools\Registry;
use ClickTools\Settings;

defined( 'ABSPATH' ) || exit;

$clicktools_counts  = Admin::tool_counts();
$clicktools_missing = Settings::missing_legal_fields();
$clicktools_pages   = (array) get_option( 'clicktools_pages', array() );
$clicktools_front   = 'page' === get_option( 'show_on_front' ) && ! empty( $clicktools_pages['home'] ) && (int) get_option( 'page_on_front' ) === (int) $clicktools_pages['home'];
$clicktools_guides  = get_posts(
	array(
		'post_type'      => 'post',
		'post_status'    => 'draft',
		'category_name'  => 'guias',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	)
);
$clicktools_new     = Messages_Admin::count_new();
$clicktools_pretty  = '' !== (string) get_option( 'permalink_structure' );
$clicktools_ads     = clicktools_setting( 'ads_enabled' );
$clicktools_page_labels = array(
	'home'          => __( 'Inicio', 'clicktools' ),
	'blog'          => __( 'Blog', 'clicktools' ),
	'help'          => __( 'Ayuda', 'clicktools' ),
	'contact'       => __( 'Contacto', 'clicktools' ),
	'about'         => __( 'Sobre nosotros', 'clicktools' ),
	'suggest'       => __( 'Sugerir herramienta', 'clicktools' ),
	'bug'           => __( 'Comunicar error', 'clicktools' ),
	'privacy'       => __( 'Privacidad', 'clicktools' ),
	'cookies'       => __( 'Cookies', 'clicktools' ),
	'terms'         => __( 'Términos de uso', 'clicktools' ),
	'legal'         => __( 'Aviso legal', 'clicktools' ),
	'accessibility' => __( 'Accesibilidad', 'clicktools' ),
);

/**
 * Elemento de la lista de comprobación.
 *
 * @param bool   $ok    Hecho.
 * @param string $text  Texto.
 * @param string $link  Enlace opcional.
 * @param string $label Texto del enlace.
 */
$clicktools_check = static function ( $ok, $text, $link = '', $label = '' ) {
	echo '<li class="' . ( $ok ? 'is-ok' : 'is-todo' ) . '"><span class="ct-admin-check-icon" aria-hidden="true">' . ( $ok ? '✓' : '•' ) . '</span><span class="screen-reader-text">' . ( $ok ? esc_html__( 'Hecho:', 'clicktools' ) : esc_html__( 'Pendiente:', 'clicktools' ) ) . '</span> ' . esc_html( $text );
	if ( $link && ! $ok ) {
		echo ' — <a href="' . esc_url( $link ) . '">' . esc_html( $label ) . '</a>';
	}
	echo '</li>';
};
?>
<div class="wrap ct-admin">
	<h1><?php esc_html_e( 'Panel de HerramientasClave', 'clicktools' ); ?></h1>
	<p class="ct-admin-intro"><?php echo esc_html( clicktools_setting( 'slogan' ) ); ?> · <?php echo esc_html( sprintf( /* translators: %s: versión */ __( 'Versión %s', 'clicktools' ), CLICKTOOLS_VERSION ) ); ?></p>

	<div class="ct-admin-cards">
		<div class="ct-admin-card">
			<p class="ct-admin-card__num"><?php echo (int) $clicktools_counts['public']; ?></p>
			<p><?php esc_html_e( 'herramientas visibles en la web', 'clicktools' ); ?></p>
			<p class="description"><?php echo esc_html( sprintf( /* translators: 1: total, 2: desactivadas, 3: de servidor */ __( '%1$d registradas · %2$d desactivadas · %3$d de servidor', 'clicktools' ), $clicktools_counts['total'], $clicktools_counts['disabled'], $clicktools_counts['server'] ) ); ?></p>
			<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=clicktools-tools' ) ); ?>"><?php esc_html_e( 'Gestionar herramientas', 'clicktools' ); ?></a>
		</div>
		<div class="ct-admin-card">
			<p class="ct-admin-card__num"><?php echo (int) $clicktools_new; ?></p>
			<p><?php esc_html_e( 'mensajes o sugerencias sin revisar', 'clicktools' ); ?></p>
			<a class="button" href="<?php echo esc_url( admin_url( 'edit.php?post_type=ct_message' ) ); ?>"><?php esc_html_e( 'Ver mensajes', 'clicktools' ); ?></a>
		</div>
		<div class="ct-admin-card">
			<p class="ct-admin-card__num"><?php echo count( $clicktools_guides ); ?></p>
			<p><?php esc_html_e( 'guías del blog en borrador', 'clicktools' ); ?></p>
			<p class="description"><?php esc_html_e( 'Revísalas y publícalas cuando quieras: no se publican solas.', 'clicktools' ); ?></p>
			<a class="button" href="<?php echo esc_url( admin_url( 'edit.php?post_status=draft&post_type=post&category_name=guias' ) ); ?>"><?php esc_html_e( 'Revisar guías', 'clicktools' ); ?></a>
		</div>
	</div>

	<div class="ct-admin-columns">
		<div class="ct-admin-box">
			<h2><?php esc_html_e( 'Antes de publicar el sitio', 'clicktools' ); ?></h2>
			<ul class="ct-admin-checklist">
				<?php
				$clicktools_check( $clicktools_pretty, __( 'Enlaces permanentes «bonitos» activados', 'clicktools' ), admin_url( 'options-permalink.php' ), __( 'Configurar', 'clicktools' ) );
				$clicktools_check( ! $clicktools_missing, $clicktools_missing ? sprintf( /* translators: %s: lista de campos */ __( 'Datos legales del titular (faltan: %s)', 'clicktools' ), implode( ', ', $clicktools_missing ) ) : __( 'Datos legales del titular completos', 'clicktools' ), admin_url( 'admin.php?page=clicktools-settings&tab=legal' ), __( 'Completar', 'clicktools' ) );
				$clicktools_check( '' !== (string) clicktools_setting( 'legal_updated' ), __( 'Textos legales revisados (fecha de actualización indicada)', 'clicktools' ), admin_url( 'admin.php?page=clicktools-settings&tab=legal' ), __( 'Indicar fecha', 'clicktools' ) );
				$clicktools_check( $clicktools_front, __( 'Portada de HerramientasClave como página de inicio', 'clicktools' ) );
				$clicktools_check( ! $clicktools_ads || '' !== (string) clicktools_setting( 'adsense_client' ), __( 'Publicidad desactivada o configurada con su ID', 'clicktools' ), admin_url( 'admin.php?page=clicktools-settings&tab=ads' ), __( 'Revisar', 'clicktools' ) );
				$clicktools_check( (bool) get_option( 'blog_public' ), __( 'El sitio permite la indexación en buscadores', 'clicktools' ), admin_url( 'options-reading.php' ), __( 'Revisar lectura', 'clicktools' ) );
				?>
			</ul>
			<div class="ct-admin-actions">
				<?php
				if ( ! $clicktools_front ) {
					Admin::action_button( 'use_front', __( 'Usar la portada de HerramientasClave', 'clicktools' ), 'button button-primary', __( 'Se cambiará la página de inicio y la del blog en Ajustes › Lectura. ¿Continuar?', 'clicktools' ) );
				}
				Admin::action_button( 'create_pages', __( 'Crear las páginas que falten', 'clicktools' ) );
				?>
			</div>
		</div>

		<div class="ct-admin-box">
			<h2><?php esc_html_e( 'Páginas de HerramientasClave', 'clicktools' ); ?></h2>
			<table class="widefat striped">
				<tbody>
				<?php
				foreach ( $clicktools_page_labels as $clicktools_key => $clicktools_label ) :
					$clicktools_id   = isset( $clicktools_pages[ $clicktools_key ] ) ? (int) $clicktools_pages[ $clicktools_key ] : 0;
					$clicktools_post = $clicktools_id ? get_post( $clicktools_id ) : null;
					?>
					<tr>
						<td><?php echo esc_html( $clicktools_label ); ?></td>
						<td>
							<?php if ( $clicktools_post && 'trash' !== $clicktools_post->post_status ) : ?>
								<a href="<?php echo esc_url( get_edit_post_link( $clicktools_id ) ); ?>"><?php esc_html_e( 'Editar', 'clicktools' ); ?></a> ·
								<a href="<?php echo esc_url( get_permalink( $clicktools_id ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Ver', 'clicktools' ); ?></a>
								<?php if ( 'publish' !== $clicktools_post->post_status ) : ?>
									<span class="ct-admin-badge ct-admin-badge--warn"><?php echo esc_html( get_post_status_object( $clicktools_post->post_status )->label ); ?></span>
								<?php endif; ?>
							<?php else : ?>
								<span class="ct-admin-ko"><?php esc_html_e( 'No existe', 'clicktools' ); ?></span>
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		</div>

		<div class="ct-admin-box">
			<h2><?php esc_html_e( 'Funciones y servicios', 'clicktools' ); ?></h2>
			<table class="widefat striped">
				<tbody>
					<tr><td><?php esc_html_e( 'Analítica propia (agregada, sin cookies)', 'clicktools' ); ?></td><td><?php echo clicktools_setting( 'analytics_enabled' ) ? esc_html__( 'Activada', 'clicktools' ) : esc_html__( 'Desactivada', 'clicktools' ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Analítica externa', 'clicktools' ); ?></td><td><?php echo clicktools_setting( 'external_analytics_src' ) ? esc_html__( 'Configurada (tras consentimiento)', 'clicktools' ) : esc_html__( 'No configurada', 'clicktools' ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Publicidad', 'clicktools' ); ?></td><td><?php echo $clicktools_ads ? esc_html__( 'Activada (tras consentimiento)', 'clicktools' ) : esc_html__( 'Desactivada', 'clicktools' ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Procesamiento en servidor', 'clicktools' ); ?></td><td><?php echo clicktools_setting( 'server_enabled' ) ? esc_html__( 'Activado', 'clicktools' ) : esc_html__( 'Desactivado', 'clicktools' ); ?></td></tr>
					<?php foreach ( Engines::status() as $clicktools_engine ) : ?>
						<tr><td>&nbsp;&nbsp;<?php echo esc_html( $clicktools_engine['label'] ); ?></td><td><?php echo $clicktools_engine['path'] ? '<span class="ct-admin-ok">' . esc_html__( 'Disponible', 'clicktools' ) . '</span>' : '<span class="ct-admin-ko">' . esc_html__( 'No encontrado', 'clicktools' ) . '</span>'; ?></td></tr>
					<?php endforeach; ?>
					<tr><td><?php esc_html_e( 'Modo mantenimiento', 'clicktools' ); ?></td><td><?php echo clicktools_setting( 'maintenance' ) ? esc_html__( 'Activado', 'clicktools' ) : esc_html__( 'Desactivado', 'clicktools' ); ?></td></tr>
				</tbody>
			</table>
			<p>
				<a href="<?php echo esc_url( home_url( '/wp-sitemap.xml' ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Mapa del sitio', 'clicktools' ); ?></a> ·
				<a href="<?php echo esc_url( home_url( '/robots.txt' ) ); ?>" target="_blank" rel="noopener">robots.txt</a> ·
				<a href="<?php echo esc_url( home_url( '/estado/' ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Página de estado', 'clicktools' ); ?></a> ·
				<a href="<?php echo esc_url( Registry::catalog_url() ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Catálogo', 'clicktools' ); ?></a>
			</p>
		</div>
	</div>

	<div class="ct-admin-box">
		<h2><?php esc_html_e( 'Herramientas por categoría', 'clicktools' ); ?></h2>
		<table class="widefat striped ct-admin-narrow">
			<thead><tr><th><?php esc_html_e( 'Categoría', 'clicktools' ); ?></th><th><?php esc_html_e( 'Visibles', 'clicktools' ); ?></th></tr></thead>
			<tbody>
			<?php foreach ( Registry::categories_with_tools() as $clicktools_slug => $clicktools_cat ) : ?>
				<tr><td><a href="<?php echo esc_url( add_query_arg( array( 'page' => 'clicktools-tools', 'cat' => $clicktools_slug ), admin_url( 'admin.php' ) ) ); ?>"><?php echo esc_html( $clicktools_cat['name'] ); ?></a></td><td><?php echo (int) $clicktools_cat['count']; ?></td></tr>
			<?php endforeach; ?>
			</tbody>
		</table>
	</div>
</div>
