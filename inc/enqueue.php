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
 * Detect the Bricks builder iframe.
 */
function virtura_child_theme_is_bricks_builder(): bool {
	return function_exists( 'bricks_is_builder' ) && bricks_is_builder();
}

/**
 * Enqueue the built Vite entrypoint and associated CSS.
 */
function virtura_child_theme_enqueue_vite_entry( string $entry, string $handle, bool $enqueue_script = true ): void {
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

	if ( ! $enqueue_script ) {
		return;
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
	if ( is_admin() ) {
		return;
	}

	virtura_child_theme_enqueue_vite_entry(
		'src/scripts/main.js',
		'virtura-child-theme',
		! virtura_child_theme_is_bricks_builder()
	);
}
add_action( 'wp_enqueue_scripts', 'virtura_child_theme_enqueue_assets', 20 );

/**
 * Prime the homepage intro before the main ES module loads.
 *
 * This prevents the first browser paint from briefly showing the normal header
 * before the GSAP intro overlay is created by the frontend bundle.
 */
function virtura_child_theme_print_intro_bootstrap(): void {
	if ( is_admin() || virtura_child_theme_is_bricks_builder() ) {
		return;
	}

	?>
	<style id="virtura-intro-bootstrap-css">
		html.virtura-intro-pending,
		html.virtura-intro-pending body {
			background: #000 !important;
			overflow: hidden;
		}

		html.virtura-intro-pending body::before {
			background: #000;
			content: "";
			display: block;
			inset: 0;
			pointer-events: auto;
			position: fixed;
			z-index: 10045;
		}

		html.virtura-intro-pending #brx-header,
		html.virtura-intro-pending #brx-header .header-overlay,
		html.virtura-intro-pending .section_hero .hero-heading,
		html.virtura-intro-pending .section_hero .hero-img,
		html.virtura-intro-pending #brxe-rigtwk {
			opacity: 0 !important;
			visibility: hidden !important;
		}
	</style>
	<script id="virtura-intro-bootstrap-js">
		(function () {
			var root = document.documentElement;
			var path = window.location.pathname || "/";
			var normalizedPath = path.charAt(path.length - 1) === "/" ? path : path + "/";
			var shouldPrime = (
				(normalizedPath === "/" || normalizedPath === "/strona-glowna/") &&
				!window.location.hash &&
				!("matchMedia" in window && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
			);

			if (!shouldPrime) {
				return;
			}

			root.classList.add("virtura-intro-pending");

			window.setTimeout(function () {
				if (
					!root.classList.contains("virtura-intro-running") &&
					!root.classList.contains("virtura-intro-revealing")
				) {
					root.classList.remove("virtura-intro-pending");
				}
			}, 6000);
		})();
	</script>
	<?php
}
add_action( 'wp_head', 'virtura_child_theme_print_intro_bootstrap', 0 );

/**
 * Force Vite bundles to load as ES modules.
 *
 * Some WordPress/optimization stacks ignore wp_script_add_data( 'type', 'module' ),
 * but Vite output uses import.meta and dynamic imports, so the script tag must
 * be rendered with type="module".
 */
function virtura_child_theme_add_module_type_to_script( string $tag, string $handle, string $src ): string {
	if ( 'virtura-child-theme' !== $handle || empty( $src ) ) {
		return $tag;
	}

	if ( false !== strpos( $tag, ' type=' ) ) {
		return $tag;
	}

	return sprintf(
		'<script type="module" src="%s" id="%s-js"></script>' . "\n",
		esc_url( $src ),
		esc_attr( $handle )
	);
}
add_filter( 'script_loader_tag', 'virtura_child_theme_add_module_type_to_script', 10, 3 );
