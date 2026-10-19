<?php
/**
 * Área de trabajo de una herramienta (la monta su motor JavaScript).
 *
 * @package ClickTools
 *
 * @var array $tool
 * @var bool  $embed Incrustada mediante shortcode.
 */

defined( 'ABSPATH' ) || exit;

$embed = ! empty( $embed );
?>
<section class="ct-workspace<?php echo $embed ? ' ct-workspace--embed' : ''; ?>" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: herramienta */ __( 'Área de trabajo: %s', 'clicktools' ), $tool['name'] ) ); ?>">
	<div class="ct-app" data-ct-app="<?php echo esc_attr( $tool['slug'] ); ?>" data-engine="<?php echo esc_attr( $tool['engine'] ); ?>" data-key="<?php echo esc_attr( $tool['key'] ); ?>"<?php echo $embed ? ' data-embed="1"' : ''; ?>>
		<div class="ct-app__loading" aria-hidden="true">
			<span class="ct-skeleton ct-skeleton--line"></span>
			<span class="ct-skeleton ct-skeleton--block"></span>
			<span class="ct-skeleton ct-skeleton--btn"></span>
		</div>
	</div>
	<noscript>
		<p class="ct-alert ct-alert--warn"><?php esc_html_e( 'Esta herramienta funciona en tu navegador y necesita JavaScript activado.', 'clicktools' ); ?></p>
	</noscript>
</section>
