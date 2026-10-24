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
add_filter( 'bricks/frontend/render_element', 'virtura_child_theme_use_landscape_image_for_wide_realization_card', 15, 2 );

/**
 * Register the 2.03:1 image attachment ID for REST-backed Gutenberg editing.
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
				'panelTitle'   => __( 'Zdjęcie 2.03 : 1 – prostokąt', 'virtura-child-theme' ),
				'description'  => __( 'Poziome zdjęcie realizacji używane w układach 2.03:1, w rozmiarze 2560 × 1261 px.', 'virtura-child-theme' ),
				'empty'        => __( 'Nie wybrano zdjęcia prostokątnego 2.03:1.', 'virtura-child-theme' ),
				'choose'       => __( 'Wybierz zdjęcie', 'virtura-child-theme' ),
				'replace'      => __( 'Zmień zdjęcie', 'virtura-child-theme' ),
				'remove'       => __( 'Usuń', 'virtura-child-theme' ),
				'mediaTitle'   => __( 'Wybierz zdjęcie 2.03:1', 'virtura-child-theme' ),
				'loading'      => __( 'Ładowanie podglądu zdjęcia…', 'virtura-child-theme' ),
				'previewAlt'   => __( 'Podgląd zdjęcia 2.03:1', 'virtura-child-theme' ),
			),
		)
	);
}

/**
 * Return the valid 2.03:1 realization image attachment ID.
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
 * Return the full URL of the 2.03:1 realization image for Bricks dynamic data.
 *
 * @param int|string $post_id Optional realization ID.
 */
function virtura_get_realization_landscape_image_url( $post_id = 0 ): string {
	$image_id = virtura_get_realization_landscape_image_id( $post_id );
	$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : '';

	return is_string( $image_url ) ? $image_url : '';
}

/**
 * Use the dedicated landscape image in wide realization cards.
 *
 * Bricks renders the query loop server-side, including AJAX filter responses.
 * The fifth archive card and the second two-item featured card switch to the
 * dedicated attachment from 768px upwards. The existing featured image stays
 * as the mobile and empty-field fallback without adding a second visible
 * media element.
 *
 * @param string          $html    Rendered Bricks element markup.
 * @param \Bricks\Element $element Bricks element instance.
 */
function virtura_child_theme_use_landscape_image_for_wide_realization_card( $html, $element ): string {
	if (
		! is_string( $html ) ||
		'' === $html ||
		! class_exists( '\\Bricks\\Query' ) ||
		! method_exists( '\\Bricks\\Query', 'get_loop_index' ) ||
		( function_exists( 'virtura_child_theme_is_bricks_builder' ) && virtura_child_theme_is_bricks_builder() )
	) {
		return is_string( $html ) ? $html : '';
	}

	$settings = function_exists( 'virtura_child_theme_get_bricks_element_settings' )
		? virtura_child_theme_get_bricks_element_settings( $element )
		: array();

	if ( ! function_exists( 'virtura_child_theme_bricks_element_has_class' ) ) {
		return $html;
	}

	$is_archive_card = virtura_child_theme_bricks_element_has_class( $settings, 'archive-block' );
	$is_blog_card    = virtura_child_theme_bricks_element_has_class( $settings, 'blog' );
	$is_grid_two     = virtura_child_theme_bricks_element_has_class( $settings, 'grid-2-item' );
	$loop_index      = (int) \Bricks\Query::get_loop_index();
	$is_wide_archive_card =
		! $is_grid_two &&
		4 === $loop_index &&
		function_exists( 'virtura_child_theme_is_archive_listing_request' ) &&
		virtura_child_theme_is_archive_listing_request();
	$is_wide_featured_card = $is_grid_two && 1 === $loop_index;

	if (
		! $is_archive_card ||
		$is_blog_card ||
		( ! $is_wide_archive_card && ! $is_wide_featured_card )
	) {
		return $html;
	}

	$post_id = method_exists( '\\Bricks\\Query', 'get_loop_object_id' )
		? absint( \Bricks\Query::get_loop_object_id() )
		: get_the_ID();

	if ( ! $post_id || 'realizacja' !== get_post_type( $post_id ) ) {
		return $html;
	}

	$image_id = virtura_get_realization_landscape_image_id( $post_id );

	if ( ! $image_id ) {
		return $html;
	}

	$landscape_url    = wp_get_attachment_image_url( $image_id, 'full' );
	$landscape_srcset = wp_get_attachment_image_srcset( $image_id, 'full' );

	if ( ! is_string( $landscape_url ) || '' === $landscape_url ) {
		return $html;
	}

	$landscape_srcset = is_string( $landscape_srcset ) && '' !== $landscape_srcset
		? $landscape_srcset
		: $landscape_url;
	$responsive_sizes = $is_wide_featured_card
		? '(max-width: 1919px) calc(66.667vw - 56px), 1208px'
		: '(max-width: 991px) calc(100vw - 80px), (max-width: 1919px) calc(66.667vw - 56px), 1208px';
	$replaced          = false;
	$updated           = preg_replace_callback(
		'/<img\b[^>]*>/i',
		static function ( $matches ) use ( $landscape_srcset, $responsive_sizes, &$replaced ) {
			$image_tag = $matches[0];

			if (
				$replaced ||
				! preg_match( '/\sclass\s*=\s*(["\'])([^"\']*)\1/i', $image_tag, $class_matches )
			) {
				return $image_tag;
			}

			$classes = preg_split( '/\s+/', trim( $class_matches[2] ) );

			if ( ! is_array( $classes ) || ! in_array( 'archive-img', $classes, true ) ) {
				return $image_tag;
			}

			$replaced = true;

			return sprintf(
				'<picture class="archive-img virtura-realization-card-picture" data-media-switch-image><source media="(min-width: 768px)" srcset="%1$s" sizes="%2$s">%3$s</picture>',
				esc_attr( $landscape_srcset ),
				esc_attr( $responsive_sizes ),
				$image_tag
			);
		},
		$html
	);

	return $replaced && is_string( $updated ) ? $updated : $html;
}
