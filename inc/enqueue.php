<?php
/**
 * Frontend assets for the Virtura child theme.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read the Vite manifest generated during npm run build.
 */
function virtura_child_theme_get_manifest(): array {
	static $manifest = null;

	if ( null !== $manifest ) {
		return $manifest;
	}

	$manifest_path = VIRTURA_CHILD_THEME_PATH . '/dist/.vite/manifest.json';

	if ( ! file_exists( $manifest_path ) ) {
		$manifest = array();
		return $manifest;
	}

	$manifest_contents = file_get_contents( $manifest_path );

	if ( false === $manifest_contents ) {
		$manifest = array();
		return $manifest;
	}

	$decoded_manifest  = json_decode( $manifest_contents, true );

	$manifest = is_array( $decoded_manifest ) ? $decoded_manifest : array();

	return $manifest;
}

/**
 * Version assets by file modification time when available.
 */
function virtura_child_theme_asset_version( string $relative_path ): string {
	$asset_path = VIRTURA_CHILD_THEME_PATH . '/' . ltrim( $relative_path, '/' );

	if ( file_exists( $asset_path ) ) {
		return (string) filemtime( $asset_path );
	}

	return VIRTURA_CHILD_THEME_VERSION;
}

/**
 * Keep custom frontend behavior out of the Bricks editor iframe.
 */
function virtura_child_theme_should_enqueue_frontend_assets(): bool {
	if ( is_admin() ) {
		return false;
	}

	if ( function_exists( 'bricks_is_builder' ) && bricks_is_builder() ) {
		return false;
	}

	return true;
}

/**
 * Enqueue the built Vite entrypoint and associated CSS.
 */
function virtura_child_theme_enqueue_vite_entry( string $entry, string $handle ): void {
	$manifest = virtura_child_theme_get_manifest();

	if ( ! isset( $manifest[ $entry ] ) || ! is_array( $manifest[ $entry ] ) ) {
		return;
	}

	$asset = $manifest[ $entry ];

	if ( ! empty( $asset['css'] ) && is_array( $asset['css'] ) ) {
		foreach ( $asset['css'] as $index => $css_file ) {
			$css_relative_path = 'dist/' . ltrim( $css_file, '/' );

			wp_enqueue_style(
				"{$handle}-{$index}",
				VIRTURA_CHILD_THEME_URI . '/' . $css_relative_path,
				array(),
				virtura_child_theme_asset_version( $css_relative_path )
			);
		}
	}

	if ( empty( $asset['file'] ) ) {
		return;
	}

	$js_relative_path = 'dist/' . ltrim( $asset['file'], '/' );

	wp_enqueue_script(
		$handle,
		VIRTURA_CHILD_THEME_URI . '/' . $js_relative_path,
		array(),
		virtura_child_theme_asset_version( $js_relative_path ),
		true
	);

	wp_script_add_data( $handle, 'type', 'module' );
}

/**
 * Load the child theme frontend bundle.
 */
function virtura_child_theme_enqueue_assets(): void {
	if ( ! virtura_child_theme_should_enqueue_frontend_assets() ) {
		return;
	}

	virtura_child_theme_enqueue_vite_entry( 'src/scripts/main.js', 'virtura-child-theme' );
}
add_action( 'wp_enqueue_scripts', 'virtura_child_theme_enqueue_assets', 20 );
