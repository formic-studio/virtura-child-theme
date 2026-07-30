<?php
/**
 * Video posters, Media Library integration and frontend lazy loading markup.
 *
 * Poster frames are captured in the editor's browser. PHP validates the
 * generated image, stores it in Media Library and links it to the video.
 * This avoids requiring FFmpeg on the web server.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VIRTURA_CHILD_THEME_VIDEO_POSTER_META = '_virtura_video_poster_id';

add_filter( 'upload_mimes', 'virtura_child_theme_allow_webm_uploads' );
add_action( 'init', 'virtura_child_theme_register_video_poster_meta' );
add_action( 'admin_enqueue_scripts', 'virtura_child_theme_enqueue_video_poster_admin_assets' );
add_action( 'wp_enqueue_scripts', 'virtura_child_theme_enqueue_video_poster_builder_assets', 25 );
add_action( 'wp_ajax_virtura_generate_video_poster', 'virtura_child_theme_ajax_generate_video_poster' );
add_filter( 'attachment_fields_to_edit', 'virtura_child_theme_add_video_poster_attachment_field', 20, 2 );
add_filter( 'wp_prepare_attachment_for_js', 'virtura_child_theme_add_video_poster_attachment_data', 20, 3 );
add_action( 'add_meta_boxes_attachment', 'virtura_child_theme_add_video_poster_meta_box' );
add_filter( 'bricks/frontend/render_element', 'virtura_child_theme_optimize_bricks_video_markup', 30, 2 );
add_filter( 'wp_video_shortcode', 'virtura_child_theme_optimize_shortcode_video_markup', 30, 5 );
add_filter( 'render_block_core/video', 'virtura_child_theme_optimize_video_block_markup', 30, 2 );

/**
 * Explicitly allow WebM files in Media Library.
 *
 * The web server must still return .webm files with Content-Type: video/webm.
 *
 * @param string[] $mimes Allowed extension and MIME mappings.
 *
 * @return string[]
 */
function virtura_child_theme_allow_webm_uploads( $mimes ): array {
	$mimes['webm'] = 'video/webm';

	return $mimes;
}

/**
 * Make the poster relation available to attachment REST/JS responses.
 */
function virtura_child_theme_register_video_poster_meta(): void {
	register_post_meta(
		'attachment',
		VIRTURA_CHILD_THEME_VIDEO_POSTER_META,
		array(
			'type'              => 'integer',
			'single'            => true,
			'default'           => 0,
			'sanitize_callback' => 'absint',
			'auth_callback'     => static function (): bool {
				return current_user_can( 'upload_files' );
			},
			'show_in_rest'      => true,
		)
	);
}

/**
 * Check whether an attachment is a directly playable video file.
 */
function virtura_child_theme_is_video_attachment( int $attachment_id ): bool {
	$mime_type = (string) get_post_mime_type( $attachment_id );

	return 0 === strpos( $mime_type, 'video/' );
}

/**
 * Resolve the poster attached to a video.
 */
function virtura_child_theme_get_video_poster_id( int $video_id ): int {
	$poster_id = absint( get_post_meta( $video_id, VIRTURA_CHILD_THEME_VIDEO_POSTER_META, true ) );

	if ( $poster_id && wp_attachment_is_image( $poster_id ) ) {
		return $poster_id;
	}

	$thumbnail_id = absint( get_post_thumbnail_id( $video_id ) );

	return $thumbnail_id && wp_attachment_is_image( $thumbnail_id ) ? $thumbnail_id : 0;
}

/**
 * Enqueue the small poster utility without forcing WordPress media scripts onto
 * screens which do not already need them.
 */
function virtura_child_theme_enqueue_video_poster_assets(): void {
	if ( ! current_user_can( 'upload_files' ) ) {
		return;
	}

	$handle = 'virtura-video-poster-admin';

	virtura_child_theme_enqueue_vite_entry(
		'src/scripts/admin-video-poster.js',
		$handle
	);

	if ( ! wp_script_is( $handle, 'enqueued' ) ) {
		return;
	}

	wp_localize_script(
		$handle,
		'virturaVideoPosterConfig',
		array(
			'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
			'nonce'         => wp_create_nonce( 'virtura-video-poster' ),
			'captureTime'   => 0.1,
			'maxWidth'      => 1920,
			'quality'       => 0.82,
			'messages'      => array(
				'creating'    => __( 'Tworzę poster z początkowej klatki…', 'virtura-child-theme' ),
				'decodeError' => __( 'Przeglądarka nie mogła odczytać klatki tego filmu.', 'virtura-child-theme' ),
				'error'       => __( 'Nie udało się utworzyć postera.', 'virtura-child-theme' ),
				'ready'       => __( 'Poster został zapisany w Media Library.', 'virtura-child-theme' ),
			),
		)
	);
}

/**
 * Load the utility on admin screens which can contain a media uploader.
 */
function virtura_child_theme_enqueue_video_poster_admin_assets(): void {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

	if ( ! $screen ) {
		return;
	}

	$allowed_bases = array(
		'attachment',
		'customize',
		'media',
		'post',
		'post-new',
		'site-editor',
		'upload',
		'widgets',
	);

	if ( ! in_array( $screen->base, $allowed_bases, true ) ) {
		return;
	}

	virtura_child_theme_enqueue_video_poster_assets();
}

/**
 * Also support uploads opened from the Bricks builder.
 */
function virtura_child_theme_enqueue_video_poster_builder_assets(): void {
	if ( ! virtura_child_theme_is_bricks_builder() ) {
		return;
	}

	virtura_child_theme_enqueue_video_poster_assets();
}

/**
 * Render the Media Library poster controls.
 */
function virtura_child_theme_get_video_poster_control_html( int $video_id ): string {
	if ( ! virtura_child_theme_is_video_attachment( $video_id ) ) {
		return '';
	}

	$video_url  = wp_get_attachment_url( $video_id );
	$poster_id  = virtura_child_theme_get_video_poster_id( $video_id );
	$poster_url = $poster_id ? wp_get_attachment_image_url( $poster_id, 'medium' ) : '';
	$button     = $poster_id ? __( 'Wygeneruj ponownie', 'virtura-child-theme' ) : __( 'Wygeneruj poster', 'virtura-child-theme' );

	if ( ! $video_url ) {
		return '';
	}

	ob_start();
	?>
	<div
		class="virtura-video-poster-control"
		data-virtura-video-poster-control
		data-attachment-id="<?php echo esc_attr( (string) $video_id ); ?>"
		data-video-url="<?php echo esc_url( $video_url ); ?>"
	>
		<div class="virtura-video-poster-preview" data-virtura-video-poster-preview<?php echo $poster_url ? '' : ' hidden'; ?>>
			<img src="<?php echo esc_url( (string) $poster_url ); ?>" alt="" />
		</div>
		<p>
			<button type="button" class="button" data-virtura-video-poster-generate>
				<?php echo esc_html( $button ); ?>
			</button>
		</p>
		<p class="description" data-virtura-video-poster-status aria-live="polite">
			<?php
			echo esc_html(
				$poster_id
					? __( 'Poster jest przypięty do tego wideo.', 'virtura-child-theme' )
					: __( 'Poster utworzy się automatycznie po uploadzie. Możesz też wygenerować go tutaj.', 'virtura-child-theme' )
			);
			?>
		</p>
	</div>
	<?php

	return (string) ob_get_clean();
}

/**
 * Add controls to the attachment compatibility panel used by media modals.
 *
 * @param array   $form_fields Attachment fields.
 * @param WP_Post $post        Attachment post.
 *
 * @return array
 */
function virtura_child_theme_add_video_poster_attachment_field( $form_fields, $post ): array {
	if ( ! $post instanceof WP_Post || ! virtura_child_theme_is_video_attachment( (int) $post->ID ) ) {
		return $form_fields;
	}

	$form_fields['virtura_video_poster'] = array(
		'label' => __( 'Poster wideo', 'virtura-child-theme' ),
		'input' => 'html',
		'html'  => virtura_child_theme_get_video_poster_control_html( (int) $post->ID ),
	);

	return $form_fields;
}

/**
 * Expose poster state to newly uploaded Backbone attachment models.
 *
 * @param array        $response   Prepared attachment data.
 * @param WP_Post      $attachment Attachment post.
 * @param array|false  $meta       Attachment metadata.
 *
 * @return array
 */
function virtura_child_theme_add_video_poster_attachment_data( $response, $attachment, $meta ): array {
	unset( $meta );

	if ( ! $attachment instanceof WP_Post || ! virtura_child_theme_is_video_attachment( (int) $attachment->ID ) ) {
		return $response;
	}

	$poster_id  = virtura_child_theme_get_video_poster_id( (int) $attachment->ID );
	$poster_url = $poster_id ? wp_get_attachment_image_url( $poster_id, 'medium' ) : false;

	$response['virturaVideoPoster'] = array(
		'id'  => $poster_id,
		'url' => $poster_url ? $poster_url : '',
	);

	return $response;
}

/**
 * Add the same controls to the dedicated attachment edit screen.
 */
function virtura_child_theme_add_video_poster_meta_box(): void {
	$post = get_post();

	if ( ! $post instanceof WP_Post || ! virtura_child_theme_is_video_attachment( (int) $post->ID ) ) {
		return;
	}

	add_meta_box(
		'virtura-video-poster',
		__( 'Poster wideo', 'virtura-child-theme' ),
		static function ( WP_Post $attachment ): void {
			echo virtura_child_theme_get_video_poster_control_html( (int) $attachment->ID ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		},
		'attachment',
		'side',
		'default'
	);
}

/**
 * Accept a browser-generated poster and attach it to its source video.
 */
function virtura_child_theme_ajax_generate_video_poster(): void {
	check_ajax_referer( 'virtura-video-poster', 'nonce' );

	$video_id = isset( $_POST['attachmentId'] ) ? absint( $_POST['attachmentId'] ) : 0;

	if (
		! $video_id ||
		! current_user_can( 'upload_files' ) ||
		! current_user_can( 'edit_post', $video_id ) ||
		! virtura_child_theme_is_video_attachment( $video_id )
	) {
		wp_send_json_error(
			array( 'message' => __( 'Nie masz uprawnień do utworzenia tego postera.', 'virtura-child-theme' ) ),
			403
		);
	}

	if ( empty( $_FILES['poster'] ) || ! is_array( $_FILES['poster'] ) ) {
		wp_send_json_error(
			array( 'message' => __( 'Przeglądarka nie przesłała obrazu postera.', 'virtura-child-theme' ) ),
			400
		);
	}

	$poster_file = $_FILES['poster'];
	$file_size   = isset( $poster_file['size'] ) ? absint( $poster_file['size'] ) : 0;
	$tmp_name    = isset( $poster_file['tmp_name'] ) ? (string) $poster_file['tmp_name'] : '';

	if ( ! $tmp_name || ! $file_size || $file_size > 5 * MB_IN_BYTES ) {
		wp_send_json_error(
			array( 'message' => __( 'Wygenerowany poster jest pusty albo zbyt duży.', 'virtura-child-theme' ) ),
			400
		);
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';

	$image_mime = wp_get_image_mime( $tmp_name );

	if ( ! in_array( $image_mime, array( 'image/jpeg', 'image/webp' ), true ) ) {
		wp_send_json_error(
			array( 'message' => __( 'Poster musi być prawidłowym plikiem JPEG lub WebP.', 'virtura-child-theme' ) ),
			400
		);
	}

	$video_title = get_the_title( $video_id );
	$extension   = 'image/webp' === $image_mime ? 'webp' : 'jpg';
	$base_name   = sanitize_file_name( pathinfo( (string) get_attached_file( $video_id ), PATHINFO_FILENAME ) );

	$_FILES['poster']['name'] = ( $base_name ? $base_name : 'video' ) . '-poster.' . $extension;
	$_FILES['poster']['type'] = $image_mime;

	$poster_id = media_handle_upload(
		'poster',
		$video_id,
		array(
			'post_title'  => sprintf(
				/* translators: %s: source video title. */
				__( 'Poster – %s', 'virtura-child-theme' ),
				$video_title ? $video_title : __( 'wideo', 'virtura-child-theme' )
			),
			'post_status' => 'inherit',
		),
		array( 'test_form' => false )
	);

	if ( is_wp_error( $poster_id ) ) {
		wp_send_json_error(
			array( 'message' => $poster_id->get_error_message() ),
			500
		);
	}

	update_post_meta( $poster_id, '_virtura_generated_video_poster_for', $video_id );
	update_post_meta( $poster_id, '_wp_attachment_image_alt', '' );
	update_post_meta( $video_id, VIRTURA_CHILD_THEME_VIDEO_POSTER_META, $poster_id );
	set_post_thumbnail( $video_id, $poster_id );

	$poster_url = wp_get_attachment_image_url( $poster_id, 'medium' );

	wp_send_json_success(
		array(
			'posterId'  => $poster_id,
			'posterUrl' => $poster_url ? $poster_url : wp_get_attachment_url( $poster_id ),
			'message'   => __( 'Poster został zapisany w Media Library.', 'virtura-child-theme' ),
		)
	);
}

/**
 * Resolve a local video URL back to its Media Library attachment.
 */
function virtura_child_theme_get_video_attachment_id_from_url( string $url ): int {
	static $resolved_ids = array();

	$clean_url = strtok( html_entity_decode( $url, ENT_QUOTES, 'UTF-8' ), '?#' );

	if ( ! is_string( $clean_url ) || '' === $clean_url ) {
		return 0;
	}

	if ( isset( $resolved_ids[ $clean_url ] ) ) {
		return $resolved_ids[ $clean_url ];
	}

	$attachment_id             = absint( attachment_url_to_postid( $clean_url ) );
	$resolved_ids[ $clean_url ] = $attachment_id;

	return $attachment_id;
}

/**
 * Extract the first direct video source URL from a markup fragment.
 */
function virtura_child_theme_get_video_source_from_markup( string $html ): string {
	if (
		preg_match( '/<(?:video|source)\b[^>]*\s(?:src|data-src)\s*=\s*(["\'])([^"\']+)\1/i', $html, $matches ) &&
		! empty( $matches[2] )
	) {
		return html_entity_decode( $matches[2], ENT_QUOTES, 'UTF-8' );
	}

	return '';
}

/**
 * Add or replace an attribute in an opening HTML tag.
 */
function virtura_child_theme_set_html_tag_attribute( string $tag, string $name, string $value ): string {
	$attribute = sprintf( ' %s="%s"', $name, esc_attr( $value ) );
	$pattern   = '/\s+' . preg_quote( $name, '/' ) . '\s*=\s*(["\'])[^"\']*\1/i';

	if ( preg_match( $pattern, $tag ) ) {
		$replaced = preg_replace( $pattern, $attribute, $tag, 1 );

		return is_string( $replaced ) ? $replaced : $tag;
	}

	$boolean_pattern = '/\s+' . preg_quote( $name, '/' ) . '(?=\s|\/?>)/i';

	if ( preg_match( $boolean_pattern, $tag ) ) {
		$replaced = preg_replace( $boolean_pattern, $attribute, $tag, 1 );

		return is_string( $replaced ) ? $replaced : $tag;
	}

	$replaced = preg_replace( '/\s*\/>$/', $attribute . ' />', $tag, 1, $count );

	if ( $count && is_string( $replaced ) ) {
		return $replaced;
	}

	$replaced = preg_replace( '/>$/', $attribute . '>', $tag, 1 );

	return is_string( $replaced ) ? $replaced : $tag;
}

/**
 * Move a source/poster attribute to its data-* equivalent before HTML reaches
 * the browser, preventing premature downloads.
 */
function virtura_child_theme_defer_html_tag_attribute( string $tag, string $name ): string {
	$data_name = 'data-' . $name;

	if ( preg_match( '/\s+' . preg_quote( $data_name, '/' ) . '\s*=/i', $tag ) ) {
		$without_source = preg_replace(
			'/\s+' . preg_quote( $name, '/' ) . '\s*=\s*(["\'])[^"\']+\1/i',
			'',
			$tag,
			1
		);

		return is_string( $without_source ) ? $without_source : $tag;
	}

	$pattern = '/\s+' . preg_quote( $name, '/' ) . '\s*=\s*(["\'])([^"\']+)\1/i';

	$replaced = preg_replace_callback(
		$pattern,
		static function ( $matches ) use ( $data_name ) {
			return sprintf( ' %s=%s%s%s', $data_name, $matches[1], $matches[2], $matches[1] );
		},
		$tag,
		1
	);

	return is_string( $replaced ) ? $replaced : $tag;
}

/**
 * Add a stored poster and turn direct video sources into lazy data attributes.
 */
function virtura_child_theme_optimize_video_markup( string $html ): string {
	if (
		'' === $html ||
		false === stripos( $html, '<video' ) ||
		( is_admin() && ! wp_doing_ajax() ) ||
		virtura_child_theme_is_bricks_builder()
	) {
		return $html;
	}

	$optimized_html = preg_replace_callback(
		'/<video\b[^>]*>.*?<\/video>/is',
		static function ( $matches ) {
			$video_html = $matches[0];
			$source_url = virtura_child_theme_get_video_source_from_markup( $video_html );

			if ( ! $source_url ) {
				return $video_html;
			}

			if ( ! preg_match( '/^<video\b[^>]*>/i', $video_html, $opening_match ) ) {
				return $video_html;
			}

			$opening_tag = $opening_match[0];
			$is_eager    = false !== stripos( $opening_tag, 'data-virtura-video-eager' );

			if ( false !== stripos( $opening_tag, 'data-virtura-video-lazy' ) ) {
				return $video_html;
			}

			if ( ! preg_match( '/\sposter\s*=/i', $opening_tag ) ) {
				$video_id   = virtura_child_theme_get_video_attachment_id_from_url( $source_url );
				$poster_id  = $video_id ? virtura_child_theme_get_video_poster_id( $video_id ) : 0;
				$poster_url = $poster_id ? wp_get_attachment_image_url( $poster_id, 'virtura-responsive-1280' ) : false;

				if ( $poster_id && ! $poster_url ) {
					$poster_url = wp_get_attachment_image_url( $poster_id, 'full' );
				}

				if ( $poster_url ) {
					$opening_tag = virtura_child_theme_set_html_tag_attribute( $opening_tag, 'poster', $poster_url );
				}
			}

			$opening_tag = virtura_child_theme_set_html_tag_attribute( $opening_tag, 'playsinline', 'playsinline' );

			if ( $is_eager ) {
				return $opening_tag . substr( $video_html, strlen( $opening_match[0] ) );
			}

			if ( preg_match( '/\sautoplay(?:\s|=|>)/i', $opening_tag ) ) {
				$opening_tag = virtura_child_theme_set_html_tag_attribute( $opening_tag, 'data-virtura-video-autoplay', 'true' );
			}

			$opening_tag = virtura_child_theme_set_html_tag_attribute( $opening_tag, 'preload', 'none' );
			$opening_tag = virtura_child_theme_set_html_tag_attribute( $opening_tag, 'data-virtura-video-lazy', 'true' );
			$opening_tag = virtura_child_theme_defer_html_tag_attribute( $opening_tag, 'src' );

			$video_html = $opening_tag . substr( $video_html, strlen( $opening_match[0] ) );
			$video_html = preg_replace_callback(
				'/<source\b[^>]*>/i',
				static function ( $source_matches ) {
					return virtura_child_theme_defer_html_tag_attribute( $source_matches[0], 'src' );
				},
				$video_html
			);

			return is_string( $video_html ) ? $video_html : $matches[0];
		},
		$html
	);

	return is_string( $optimized_html ) ? $optimized_html : $html;
}

/**
 * Bricks render filter adapter.
 *
 * @param string $html    Rendered element markup.
 * @param object $element Bricks element instance.
 */
function virtura_child_theme_optimize_bricks_video_markup( $html, $element ): string {
	unset( $element );

	return is_string( $html ) ? virtura_child_theme_optimize_video_markup( $html ) : '';
}

/**
 * WordPress video shortcode filter adapter.
 */
function virtura_child_theme_optimize_shortcode_video_markup( $html, $atts, $video, $post_id, $library ): string {
	unset( $atts, $video, $post_id, $library );

	return is_string( $html ) ? virtura_child_theme_optimize_video_markup( $html ) : '';
}

/**
 * Core Video block render filter adapter.
 */
function virtura_child_theme_optimize_video_block_markup( $block_content, $block ): string {
	unset( $block );

	return is_string( $block_content ) ? virtura_child_theme_optimize_video_markup( $block_content ) : '';
}
