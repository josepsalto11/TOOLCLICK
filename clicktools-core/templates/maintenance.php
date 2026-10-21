<?php
/**
 * Página de mantenimiento (HTTP 503). Autónoma, sin dependencias de WordPress en el cliente.
 *
 * @package ClickTools
 */

defined( 'ABSPATH' ) || exit;

$clicktools_brand = clicktools_setting( 'brand_name', 'HerramientasClave' );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title><?php echo esc_html( sprintf( /* translators: %s: marca */ __( 'Mantenimiento | %s', 'clicktools' ), $clicktools_brand ) ); ?></title>
<link rel="stylesheet" href="<?php echo esc_url( CLICKTOOLS_URL . 'assets/css/clicktools.css?ver=' . CLICKTOOLS_VERSION ); ?>">
</head>
<body class="ct-body ct-maintenance">
<main class="ct-container ct-container--narrow ct-404">
	<p class="ct-logo"><span class="ct-logo__mark" aria-hidden="true"><?php echo clicktools_icon( 'mouse-pointer-click', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span><span class="ct-logo__text"><?php echo esc_html( $clicktools_brand ); ?></span></p>
	<span class="ct-empty__icon" aria-hidden="true"><?php echo clicktools_icon( 'wrench', 28 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
	<h1 class="ct-page-head__title"><?php esc_html_e( 'Volvemos enseguida', 'clicktools' ); ?></h1>
	<p class="ct-page-head__lead"><?php echo esc_html( clicktools_setting( 'maintenance_message' ) ); ?></p>
</main>
</body>
</html>
