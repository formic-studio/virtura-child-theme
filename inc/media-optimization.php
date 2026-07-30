<?php
/**
 * Image optimization and responsive media markup.
 *
 * Original uploads remain untouched. WordPress-generated JPEG and PNG
 * sub-sizes are stored as WebP when the active image editor supports it.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VIRTURA_CHILD_THEME_IMAGE_QUALITY       = 80;
const VIRTURA_CHILD_THEME_IMAGE_MAX_DIMENSION = 2560;

add_action( 'after_setup_theme', 'virtura_child_theme_register_responsive_image_sizes' );
add_filter( 'wp_editor_set_quality', 'virtura_child_theme_set_image_quality', 10, 3 );
add_filter( 'jpeg_quality', 'virtura_child_theme_set_legacy_jpeg_quality', 10, 2 );
add_filter( 'image_editor_output_format', 'virtura_child_theme_set_image_output_format', 10, 3 );
add_filter( 'big_image_size_threshold', 'virtura_child_theme_set_big_image_threshold', 10, 4 );
add_filter( 'wp_get_attachment_image_attributes', 'virtura_child_theme_set_responsive_image_attributes', 90, 3 );
add_filter( 'bricks/frontend/render_element', 'virtura_child_theme_remove_image_source_from_video', 20, 2 );

/**
 * Fill the largest gaps between WordPress' default responsive image widths.
 */
function virtura_child_theme_register_responsive_image_sizes(): void {
	add_image_size( 'virtura-responsive-400', 400, 0, false );
	add_image_size( 'virtura-responsive-480', 480, 0, false );
	add_image_size( 'virtura-responsive-640', 640, 0, false );
	add_image_size( 'virtura-responsive-1280', 1280, 0, false );
}

/**
 * Use the same balanced quality for generated JPEG and WebP files.
 *
 * @param int    $quality   Suggested image quality.
 * @param string $mime_type Output MIME type.
 * @param array  $size      Generated image size details.
 */
function virtura_child_theme_set_image_quality( $quality, $mime_type, $size = array() ): int {
	unset( $size );

	if ( in_array( $mime_type, array( 'image/jpeg', 'image/webp' ), true ) ) {
		return VIRTURA_CHILD_THEME_IMAGE_QUALITY;
	}

	return (int) $quality;
}

/**
 * Cover image-editor paths which still use the legacy JPEG quality filter.
 *
 * @param int    $quality Suggested JPEG quality.
 * @param string $context Image compression context.
 */
function virtura_child_theme_set_legacy_jpeg_quality( $quality, $context = '' ): int {
	unset( $quality, $context );

	return VIRTURA_CHILD_THEME_IMAGE_QUALITY;
}

/**
 * Generate JPEG and PNG sub-sizes as WebP while preserving source uploads.
 *
 * @param string[] $formats   MIME type output mappings.
 * @param string   $filename  Source filename.
 * @param string   $mime_type Source MIME type.
 *
 * @return string[]
 */
function virtura_child_theme_set_image_output_format( $formats, $filename = '', $mime_type = '' ): array {
	unset( $filename, $mime_type );

	if (
		! function_exists( 'wp_image_editor_supports' ) ||
		! wp_image_editor_supports( array( 'mime_type' => 'image/webp' ) )
	) {
		return $formats;
	}

	$formats['image/jpeg'] = 'image/webp';
	$formats['image/png']  = 'image/webp';

	return $formats;
}

/**
 * Keep oversized originals for recovery but serve a scaled primary image.
 *
 * @param int|false $threshold    Current large-image threshold.
 * @param int[]     $imagesize    Source width and height.
 * @param string    $file         Source file path.
 * @param int       $attachment_id Attachment ID.
 */
function virtura_child_theme_set_big_image_threshold( $threshold, $imagesize, $file, $attachment_id ): int {
	unset( $threshold, $imagesize, $file, $attachment_id );

	return VIRTURA_CHILD_THEME_IMAGE_MAX_DIMENSION;
}

/**
 * Describe the rendered width of known Bricks image components to browsers.
 *
 * @param array   $attr       Image attributes.
 * @param WP_Post $attachment Attachment post object.
 * @param string  $size       Requested image size.
 *
 * @return array
 */
function virtura_child_theme_set_responsive_image_attributes( $attr, $attachment, $size ): array {
	unset( $attachment, $size );

	if ( empty( $attr['class'] ) || ! is_string( $attr['class'] ) ) {
		return $attr;
	}

	$classes = preg_split( '/\s+/', trim( $attr['class'] ) );

	if ( ! is_array( $classes ) ) {
		return $attr;
	}

	$attr['decoding'] = 'async';

	if ( in_array( 'hero-img', $classes, true ) ) {
		$attr['sizes']         = '(max-width: 767px) calc(100vw - 32px), 480px';
		$attr['loading']       = 'eager';
		$attr['fetchpriority'] = 'high';

		return $attr;
	}

	$sizes_by_class = array(
		'archive-img'  => '(max-width: 767px) calc(100vw - 32px), (max-width: 991px) calc(50vw - 60px), (max-width: 1919px) calc(33.333vw - 48px), 592px',
		'category-img' => '(max-width: 767px) calc(100vw - 72px), (max-width: 1919px) calc(50vw - 72px), 888px',
		'team-img'     => '(max-width: 511px) 86vw, (max-width: 767px) 440px, (max-width: 1919px) calc(33.333vw - 45px), 596px',
	);

	foreach ( $sizes_by_class as $class_name => $sizes_value ) {
		if ( in_array( $class_name, $classes, true ) ) {
			$attr['sizes'] = $sizes_value;
			break;
		}
	}

	if (
		is_front_page() &&
		array_intersect( array_keys( $sizes_by_class ), $classes )
	) {
		$attr['loading']       = 'lazy';
		$attr['fetchpriority'] = 'low';
	}

	return $attr;
}

/**
 * Prevent Bricks media-switch placeholders from requesting an image as video.
 *
 * The selected media URL is currently rendered into both the Image and Video
 * elements. JavaScript hides the unused element, but the browser may start the
 * invalid video request before that script runs.
 *
 * @param string $html    Rendered Bricks element markup.
 * @param object $element Bricks element instance.
 */
function virtura_child_theme_remove_image_source_from_video( $html, $element ): string {
	unset( $element );

	if ( ! is_string( $html ) || false === stripos( $html, '<video' ) ) {
		return is_string( $html ) ? $html : '';
	}

	$image_extensions = array(
		'apng',
		'avif',
		'bmp',
		'gif',
		'jpeg',
		'jpg',
		'png',
		'svg',
		'tif',
		'tiff',
		'webp',
	);

	$filtered_html = preg_replace_callback(
		'/<video\b[^>]*>/i',
		static function ( $matches ) use ( $image_extensions ) {
			$video_tag = $matches[0];

			if ( ! preg_match( '/\ssrc\s*=\s*(["\'])([^"\']+)\1/i', $video_tag, $source_match ) ) {
				return $video_tag;
			}

			$source_url  = html_entity_decode( $source_match[2], ENT_QUOTES, 'UTF-8' );
			$source_path = wp_parse_url( $source_url, PHP_URL_PATH );

			if ( ! is_string( $source_path ) ) {
				return $video_tag;
			}

			$extension = strtolower( pathinfo( $source_path, PATHINFO_EXTENSION ) );

			if ( ! in_array( $extension, $image_extensions, true ) ) {
				return $video_tag;
			}

			$cleaned_tag = preg_replace(
				'/\s+src\s*=\s*(["\'])[^"\']+\1/i',
				'',
				$video_tag,
				1
			);

			return is_string( $cleaned_tag ) ? $cleaned_tag : $video_tag;
		},
		$html
	);

	return is_string( $filtered_html ) ? $filtered_html : $html;
}
