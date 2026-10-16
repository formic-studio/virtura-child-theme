<?php
/**
 * Gutenberg controls for realization-specific editorial media.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VIRTURA_CHILD_THEME_REALIZATION_LANDSCAPE_IMAGE_META = '_virtura_realization_landscape_image_id';

add_action( 'init', 'virtura_child_theme_register_realization_landscape_image_meta', 20 );
add_action( 'enqueue_block_editor_assets', 'virtura_child_theme_enqueue_realization_editor_assets', 1 );

/**
 * Register the 16:9 image attachment ID for REST-backed Gutenberg editing.
 */
function virtura_child_theme_register_realization_landscape_image_meta(): void {
	if ( ! post_type_exists( 'realizacja' ) ) {
		return;
	}

	add_post_type_support( 'realizacja', 'custom-fields' );

	register_post_meta(
		'realizacja',
		VIRTURA_CHILD_THEME_REALIZATION_LANDSCAPE_IMAGE_META,
		array(
			'type'              => 'integer',
			'single'            => true,
			'default'           => 0,
			'sanitize_callback' => 'absint',
			'auth_callback'     => static function ( $allowed, $meta_key, $post_id ): bool {
				unset( $allowed, $meta_key );

				return current_user_can( 'edit_post', $post_id );
			},
			'show_in_rest'      => true,
		)
	);
}

/**
 * Load the realization image panel only in the matching block editor.
 */
function virtura_child_theme_enqueue_realization_editor_assets(): void {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

	if ( ! $screen || 'realizacja' !== $screen->post_type || ! $screen->is_block_editor() ) {
		return;
	}

	wp_enqueue_media();

	$handle = 'virtura-realization-editor';

	virtura_child_theme_enqueue_vite_entry(
		'src/scripts/realization-editor.js',
		$handle,
		true,
		array(
			'wp-block-editor',
			'wp-components',
			'wp-core-data',
			'wp-data',
			'wp-editor',
			'wp-element',
			'wp-plugins',
		)
	);

	if ( ! wp_script_is( $handle, 'enqueued' ) ) {
		return;
	}

	wp_localize_script(
		$handle,
		'virturaRealizationEditorConfig',
		array(
			'metaKey'  => VIRTURA_CHILD_THEME_REALIZATION_LANDSCAPE_IMAGE_META,
			'postType' => 'realizacja',
			'labels'   => array(
				'panelTitle'   => __( 'Zdjęcie 16:9', 'virtura-child-theme' ),
				'description'  => __( 'Poziome zdjęcie realizacji używane w układach 16:9.', 'virtura-child-theme' ),
				'empty'        => __( 'Nie wybrano zdjęcia 16:9.', 'virtura-child-theme' ),
				'choose'       => __( 'Wybierz zdjęcie', 'virtura-child-theme' ),
				'replace'      => __( 'Zmień zdjęcie', 'virtura-child-theme' ),
				'remove'       => __( 'Usuń', 'virtura-child-theme' ),
				'mediaTitle'   => __( 'Wybierz zdjęcie 16:9', 'virtura-child-theme' ),
				'loading'      => __( 'Ładowanie podglądu zdjęcia…', 'virtura-child-theme' ),
				'previewAlt'   => __( 'Podgląd zdjęcia 16:9', 'virtura-child-theme' ),
			),
		)
	);
}

/**
 * Return the valid 16:9 realization image attachment ID.
 *
 * @param int|string $post_id Optional realization ID.
 */
function virtura_get_realization_landscape_image_id( $post_id = 0 ): int {
	$post_id = absint( $post_id );

	if ( ! $post_id ) {
		$post_id = get_the_ID();
	}

	if ( ! $post_id || 'realizacja' !== get_post_type( $post_id ) ) {
		return 0;
	}

	$image_id = absint(
		get_post_meta(
			$post_id,
			VIRTURA_CHILD_THEME_REALIZATION_LANDSCAPE_IMAGE_META,
			true
		)
	);

	if ( ! $image_id || 'attachment' !== get_post_type( $image_id ) ) {
		return 0;
	}

	return 0 === strpos( (string) get_post_mime_type( $image_id ), 'image/' ) ? $image_id : 0;
}

/**
 * Return the full URL of the 16:9 realization image for Bricks dynamic data.
 *
 * @param int|string $post_id Optional realization ID.
 */
function virtura_get_realization_landscape_image_url( $post_id = 0 ): string {
	$image_id = virtura_get_realization_landscape_image_id( $post_id );
	$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : '';

	return is_string( $image_url ) ? $image_url : '';
}
