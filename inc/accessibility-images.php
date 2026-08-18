<?php
/**
 * Accessible alternatives for Media Library images rendered by WordPress and Bricks.
 *
 * Editors keep using the native WordPress alternative-text field. A separate
 * decorative flag intentionally forces alt="" while preserving the entered
 * description for possible reuse.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META = '_virtura_image_decorative';
const VIRTURA_CHILD_THEME_IMAGE_ALT_MANAGED_META = '_virtura_image_alt_managed';

add_action( 'init', 'virtura_child_theme_register_image_accessibility_meta', 5 );
add_filter( 'attachment_fields_to_edit', 'virtura_child_theme_add_image_accessibility_fields', 30, 2 );
add_filter( 'attachment_fields_to_save', 'virtura_child_theme_save_image_accessibility_fields', 30, 2 );
add_filter( 'manage_media_columns', 'virtura_child_theme_add_image_accessibility_column' );
add_action( 'manage_media_custom_column', 'virtura_child_theme_render_image_accessibility_column', 10, 2 );
add_action( 'admin_head-upload.php', 'virtura_child_theme_print_image_accessibility_styles' );
add_action( 'admin_footer-upload.php', 'virtura_child_theme_print_image_accessibility_script' );
add_action( 'wp_ajax_virtura_save_image_accessibility', 'virtura_child_theme_save_inline_image_accessibility' );
add_filter( 'wp_get_attachment_image_attributes', 'virtura_child_theme_apply_attachment_image_alt', 80, 3 );
add_filter( 'bricks/frontend/render_element', 'virtura_child_theme_apply_bricks_image_alts', 90, 2 );
add_action( 'added_post_meta', 'virtura_child_theme_watch_image_accessibility_meta', 10, 4 );
add_action( 'updated_post_meta', 'virtura_child_theme_watch_image_accessibility_meta', 10, 4 );
add_action( 'deleted_post_meta', 'virtura_child_theme_watch_image_accessibility_meta', 10, 4 );
add_action( 'add_attachment', 'virtura_child_theme_invalidate_image_attachment_index' );
add_action( 'edit_attachment', 'virtura_child_theme_invalidate_image_attachment_index' );
add_action( 'delete_attachment', 'virtura_child_theme_invalidate_image_attachment_index' );

/**
 * Register the decorative flag for REST-backed media editors.
 */
function virtura_child_theme_register_image_accessibility_meta(): void {
	register_post_meta(
		'attachment',
		VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META,
		array(
			'type'              => 'boolean',
			'single'            => true,
			'show_in_rest'      => true,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'auth_callback'     => static function ( $allowed, $meta_key, $post_id ): bool {
				unset( $allowed, $meta_key );

				return current_user_can( 'edit_post', $post_id );
			},
		)
	);
}

/**
 * Check whether an attachment is an image, including uploaded SVG files.
 */
function virtura_child_theme_is_image_attachment( int $attachment_id ): bool {
	if ( 'attachment' !== get_post_type( $attachment_id ) ) {
		return false;
	}

	return 0 === strpos( (string) get_post_mime_type( $attachment_id ), 'image/' );
}

/**
 * Add clear ALT guidance and a decorative checkbox to image details.
 *
 * @param array<string, array<string, mixed>> $fields Attachment fields.
 * @param WP_Post                             $post   Attachment post.
 * @return array<string, array<string, mixed>>
 */
function virtura_child_theme_add_image_accessibility_fields( $fields, $post ): array {
	if ( ! $post instanceof WP_Post || ! virtura_child_theme_is_image_attachment( (int) $post->ID ) ) {
		return is_array( $fields ) ? $fields : array();
	}

	if ( isset( $fields['image_alt'] ) ) {
		$fields['image_alt']['label'] = __( 'Tekst alternatywny (ALT)', 'virtura-child-theme' );
		$fields['image_alt']['helps'] = __(
			'Opisz znaczenie obrazu w jego kontekście. Nie zaczynaj od słów „zdjęcie” ani nie wpisuj fraz kluczowych na siłę.',
			'virtura-child-theme'
		);
	} else {
		$fields['image_alt'] = array(
			'label' => __( 'Tekst alternatywny (ALT)', 'virtura-child-theme' ),
			'input' => 'textarea',
			'value' => (string) get_post_meta( $post->ID, '_wp_attachment_image_alt', true ),
			'helps' => __(
				'Opisz znaczenie obrazu w jego kontekście. Nie zaczynaj od słów „zdjęcie” ani nie wpisuj fraz kluczowych na siłę.',
				'virtura-child-theme'
			),
		);
	}

	$fields['virtura_image_decorative'] = array(
		'label' => __( 'Dostępność', 'virtura-child-theme' ),
		'input' => 'html',
		'html'  => sprintf(
			'<input type="hidden" name="attachments[%1$d][virtura_image_decorative]" value="0"><label><input type="checkbox" name="attachments[%1$d][virtura_image_decorative]" value="1"%2$s> %3$s</label>',
			(int) $post->ID,
			checked( '1', (string) get_post_meta( $post->ID, VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META, true ), false ),
			esc_html__( 'Obraz dekoracyjny — pomiń w czytnikach ekranu', 'virtura-child-theme' )
		),
		'helps' => __(
			'Zaznaczenie wymusza pusty alt="". Wpisany opis pozostaje zapisany i wróci po odznaczeniu tej opcji.',
			'virtura-child-theme'
		),
	);

	return $fields;
}

/**
 * Persist image accessibility fields submitted from attachment details.
 *
 * @param array<string, mixed> $post       Attachment post data.
 * @param array<string, mixed> $attachment Submitted attachment fields.
 * @return array<string, mixed>
 */
function virtura_child_theme_save_image_accessibility_fields( $post, $attachment ): array {
	if ( ! is_array( $post ) || ! is_array( $attachment ) ) {
		return is_array( $post ) ? $post : array();
	}

	$attachment_id = isset( $post['ID'] ) ? absint( $post['ID'] ) : 0;

	if ( ! $attachment_id || ! virtura_child_theme_is_image_attachment( $attachment_id ) ) {
		return is_array( $post ) ? $post : array();
	}

	if ( array_key_exists( 'image_alt', $attachment ) ) {
		update_post_meta(
			$attachment_id,
			'_wp_attachment_image_alt',
			sanitize_textarea_field( wp_unslash( $attachment['image_alt'] ) )
		);
		update_post_meta( $attachment_id, VIRTURA_CHILD_THEME_IMAGE_ALT_MANAGED_META, '1' );
	}

	if ( array_key_exists( 'virtura_image_decorative', $attachment ) ) {
		virtura_child_theme_set_image_decorative(
			$attachment_id,
			! empty( $attachment['virtura_image_decorative'] )
		);
	}

	return $post;
}

/**
 * Store or clear the explicit decorative state.
 */
function virtura_child_theme_set_image_decorative( int $attachment_id, bool $decorative ): void {
	if ( $decorative ) {
		update_post_meta( $attachment_id, VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META, '1' );
		return;
	}

	delete_post_meta( $attachment_id, VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META );
}

/**
 * Add one compact ALT/accessibility editor to Media Library list view.
 *
 * @param array<string, string> $columns Existing columns.
 * @return array<string, string>
 */
function virtura_child_theme_add_image_accessibility_column( $columns ): array {
	$updated_columns = array();

	foreach ( $columns as $key => $label ) {
		$updated_columns[ $key ] = $label;

		if ( 'title' === $key ) {
			$updated_columns['virtura_image_accessibility'] = __( 'ALT / dostępność', 'virtura-child-theme' );
		}
	}

	if ( ! isset( $updated_columns['virtura_image_accessibility'] ) ) {
		$updated_columns['virtura_image_accessibility'] = __( 'ALT / dostępność', 'virtura-child-theme' );
	}

	return $updated_columns;
}

/**
 * Render the inline ALT editor for one Media Library row.
 */
function virtura_child_theme_render_image_accessibility_column( string $column_name, int $post_id ): void {
	if ( 'virtura_image_accessibility' !== $column_name || ! virtura_child_theme_is_image_attachment( $post_id ) ) {
		return;
	}

	$title = trim( wp_strip_all_tags( get_the_title( $post_id ) ) );
	$alt   = (string) get_post_meta( $post_id, '_wp_attachment_image_alt', true );

	printf(
		'<textarea class="virtura-inline-image-alt" rows="3" data-attachment-id="%1$d" aria-label="%2$s" placeholder="%3$s">%4$s</textarea>',
		$post_id,
		esc_attr( sprintf( __( 'Tekst alternatywny: %s', 'virtura-child-theme' ), $title ) ),
		esc_attr__( 'Brak opisu', 'virtura-child-theme' ),
		esc_textarea( $alt )
	);

	printf(
		'<div class="virtura-inline-image-actions">
			<label class="virtura-inline-image-decorative">
				<input type="checkbox" class="virtura-inline-image-decorative-input"%1$s>
				%2$s
			</label>
			<button type="button" class="button button-small virtura-inline-image-save" data-attachment-id="%3$d">%4$s</button>
			<span class="virtura-inline-image-status" role="status" aria-live="polite"></span>
		</div>',
		checked( '1', (string) get_post_meta( $post_id, VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META, true ), false ),
		esc_html__( 'Dekoracyjny', 'virtura-child-theme' ),
		$post_id,
		esc_html__( 'Zapisz', 'virtura-child-theme' )
	);
}

/**
 * Keep the inline editor readable without loading theme CSS in wp-admin.
 */
function virtura_child_theme_print_image_accessibility_styles(): void {
	?>
	<style id="virtura-inline-image-accessibility-styles">
		.column-virtura_image_accessibility {
			width: 24rem;
		}

		.virtura-inline-image-alt {
			box-sizing: border-box;
			min-width: 15rem;
			width: 100%;
			resize: vertical;
		}

		.virtura-inline-image-actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem 0.75rem;
			margin-top: 0.5rem;
		}

		.virtura-inline-image-decorative {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
		}

		.virtura-inline-image-status {
			min-width: 4rem;
			font-size: 0.8rem;
		}

		.virtura-inline-image-status.is-error {
			color: #b32d2e;
		}

		.virtura-inline-image-status.is-success {
			color: #008a20;
		}
	</style>
	<?php
}

/**
 * Print the small dependency-free Media Library inline editor script.
 */
function virtura_child_theme_print_image_accessibility_script(): void {
	$nonce = wp_create_nonce( 'virtura_inline_image_accessibility' );
	?>
	<script id="virtura-inline-image-accessibility-script">
		(function () {
			'use strict';

			var nonce = <?php echo wp_json_encode( $nonce ); ?>;

			function clearStatus(row) {
				var status = row ? row.querySelector('.virtura-inline-image-status') : null;

				if (!status) {
					return;
				}

				status.textContent = '';
				status.classList.remove('is-error', 'is-success');
			}

			document.addEventListener('input', function (event) {
				if (!event.target.matches('.virtura-inline-image-alt')) {
					return;
				}

				clearStatus(event.target.closest('tr'));
			});

			document.addEventListener('change', function (event) {
				if (!event.target.matches('.virtura-inline-image-decorative-input')) {
					return;
				}

				clearStatus(event.target.closest('tr'));
			});

			document.addEventListener('click', function (event) {
				var button = event.target.closest('.virtura-inline-image-save');

				if (!button) {
					return;
				}

				var row = button.closest('tr');
				var alt = row ? row.querySelector('.virtura-inline-image-alt') : null;
				var decorative = row ? row.querySelector('.virtura-inline-image-decorative-input') : null;
				var status = row ? row.querySelector('.virtura-inline-image-status') : null;

				if (!row || !alt || !decorative || !status) {
					return;
				}

				button.disabled = true;
				row.setAttribute('aria-busy', 'true');
				status.textContent = <?php echo wp_json_encode( __( 'Zapisywanie…', 'virtura-child-theme' ) ); ?>;
				status.classList.remove('is-error', 'is-success');

				var data = new URLSearchParams();
				data.set('action', 'virtura_save_image_accessibility');
				data.set('nonce', nonce);
				data.set('attachment_id', button.dataset.attachmentId);
				data.set('alt', alt.value);
				data.set('decorative', decorative.checked ? '1' : '0');

				window.fetch(window.ajaxurl, {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
					},
					body: data.toString()
				})
					.then(function (response) {
						return response.json();
					})
					.then(function (response) {
						if (!response.success) {
							throw new Error('save_failed');
						}

						status.textContent = <?php echo wp_json_encode( __( 'Zapisano', 'virtura-child-theme' ) ); ?>;
						status.classList.add('is-success');
					})
					.catch(function () {
						status.textContent = <?php echo wp_json_encode( __( 'Błąd zapisu', 'virtura-child-theme' ) ); ?>;
						status.classList.add('is-error');
					})
					.finally(function () {
						button.disabled = false;
						row.removeAttribute('aria-busy');
					});
			});
		})();
	</script>
	<?php
}

/**
 * Save image accessibility values edited in the Media Library table.
 */
function virtura_child_theme_save_inline_image_accessibility(): void {
	check_ajax_referer( 'virtura_inline_image_accessibility', 'nonce' );

	$attachment_id = isset( $_POST['attachment_id'] ) ? absint( $_POST['attachment_id'] ) : 0;

	if (
		! $attachment_id ||
		! virtura_child_theme_is_image_attachment( $attachment_id ) ||
		! current_user_can( 'edit_post', $attachment_id )
	) {
		wp_send_json_error(
			array( 'message' => __( 'Nie możesz edytować tego obrazu.', 'virtura-child-theme' ) ),
			403
		);
	}

	$alt        = isset( $_POST['alt'] )
		? sanitize_textarea_field( wp_unslash( $_POST['alt'] ) )
		: '';
	$decorative = ! empty( $_POST['decorative'] );

	update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt );
	update_post_meta( $attachment_id, VIRTURA_CHILD_THEME_IMAGE_ALT_MANAGED_META, '1' );
	virtura_child_theme_set_image_decorative( $attachment_id, $decorative );

	wp_send_json_success(
		array(
			'alt'        => $alt,
			'decorative' => $decorative,
		)
	);
}

/**
 * Resolve the frontend alternative for an attachment.
 *
 * @return array{found: bool, text: string}
 */
function virtura_child_theme_get_attachment_image_alt( int $attachment_id ): array {
	if ( ! $attachment_id || ! virtura_child_theme_is_image_attachment( $attachment_id ) ) {
		return array(
			'found' => false,
			'text'  => '',
		);
	}

	if ( '1' === (string) get_post_meta( $attachment_id, VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META, true ) ) {
		return array(
			'found' => true,
			'text'  => '',
		);
	}

	$alt     = trim( (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ) );
	$managed = metadata_exists( 'post', $attachment_id, VIRTURA_CHILD_THEME_IMAGE_ALT_MANAGED_META );

	return array(
		'found' => '' !== $alt || $managed,
		'text'  => $alt,
	);
}

/**
 * Apply accessibility state to WordPress-generated images.
 *
 * @param array<string, string>  $attr       Image attributes.
 * @param WP_Post                $attachment Attachment post.
 * @param string|array<int, int> $size       Requested image size.
 * @return array<string, string>
 */
function virtura_child_theme_apply_attachment_image_alt( $attr, $attachment, $size ): array {
	unset( $size );

	if ( ! $attachment instanceof WP_Post ) {
		return is_array( $attr ) ? $attr : array();
	}

	$alternative = virtura_child_theme_get_attachment_image_alt( (int) $attachment->ID );

	if ( $alternative['found'] ) {
		$attr['alt'] = $alternative['text'];
	}

	return $attr;
}

/**
 * Build a cached filename-to-attachment index for responsive Bricks markup.
 *
 * @return array<string, int>
 */
function virtura_child_theme_get_image_attachment_index(): array {
	static $index = null;

	if ( null !== $index ) {
		return $index;
	}

	$cached_index = get_transient( 'virtura_image_attachment_index_v1' );

	if ( is_array( $cached_index ) ) {
		$index = $cached_index;
		return $index;
	}

	global $wpdb;

	$index = array();
	$rows  = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT pm.post_id, pm.meta_key, pm.meta_value
			FROM {$wpdb->postmeta} AS pm
			INNER JOIN {$wpdb->posts} AS p ON p.ID = pm.post_id
			WHERE pm.meta_key IN (%s, %s)
				AND p.post_type = %s
				AND p.post_mime_type LIKE %s
			ORDER BY pm.post_id ASC",
			'_wp_attached_file',
			'_wp_attachment_metadata',
			'attachment',
			'image/%'
		),
		ARRAY_A
	);

	foreach ( $rows as $row ) {
		$attachment_id = absint( $row['post_id'] );
		$filenames      = array();

		if ( '_wp_attached_file' === $row['meta_key'] ) {
			$filenames[] = wp_basename( (string) $row['meta_value'] );
		} else {
			$metadata = maybe_unserialize( $row['meta_value'] );

			if ( is_array( $metadata ) ) {
				if ( ! empty( $metadata['file'] ) ) {
					$filenames[] = wp_basename( (string) $metadata['file'] );
				}

				if ( ! empty( $metadata['original_image'] ) ) {
					$filenames[] = wp_basename( (string) $metadata['original_image'] );
				}

				if ( ! empty( $metadata['sizes'] ) && is_array( $metadata['sizes'] ) ) {
					foreach ( $metadata['sizes'] as $image_size ) {
						if ( is_array( $image_size ) && ! empty( $image_size['file'] ) ) {
							$filenames[] = wp_basename( (string) $image_size['file'] );
						}
					}
				}
			}
		}

		foreach ( array_unique( $filenames ) as $filename ) {
			$key = strtolower( rawurldecode( $filename ) );

			if ( '' !== $key && ! isset( $index[ $key ] ) ) {
				$index[ $key ] = $attachment_id;
			}
		}
	}

	set_transient( 'virtura_image_attachment_index_v1', $index, 12 * HOUR_IN_SECONDS );

	return $index;
}

/**
 * Invalidate the filename index after attachment files change.
 */
function virtura_child_theme_invalidate_image_attachment_index( $attachment_id = 0 ): void {
	unset( $attachment_id );

	delete_transient( 'virtura_image_attachment_index_v1' );
}

/**
 * Normalize a responsive filename to the original Media Library filename.
 */
function virtura_child_theme_get_canonical_image_filename( string $filename ): string {
	$canonical = preg_replace( '/-\d+x\d+(?=\.[^.]+$)/i', '', $filename );

	return is_string( $canonical ) ? $canonical : $filename;
}

/**
 * Resolve an attachment ID from attributes on the current HTML img tag.
 */
function virtura_child_theme_get_image_attachment_id_from_tag( WP_HTML_Tag_Processor $processor ): int {
	$direct_id = absint( $processor->get_attribute( 'data-attachment-id' ) );

	if ( $direct_id ) {
		return $direct_id;
	}

	$classes = (string) $processor->get_attribute( 'class' );

	if ( preg_match( '/(?:^|\s)wp-image-(\d+)(?:\s|$)/', $classes, $class_match ) ) {
		return absint( $class_match[1] );
	}

	$index = virtura_child_theme_get_image_attachment_index();

	foreach ( array( 'data-src', 'data-lazy-src', 'src' ) as $source_attribute ) {
		$source = $processor->get_attribute( $source_attribute );

		if ( ! is_string( $source ) || '' === $source ) {
			continue;
		}

		$decoded_source = html_entity_decode( $source, ENT_QUOTES, 'UTF-8' );
		$path           = wp_parse_url( $decoded_source, PHP_URL_PATH );

		if ( ! is_string( $path ) || '' === $path ) {
			continue;
		}

		$filename  = strtolower( rawurldecode( wp_basename( $path ) ) );
		$candidates = array(
			$filename,
			virtura_child_theme_get_canonical_image_filename( $filename ),
		);

		foreach ( array_unique( $candidates ) as $candidate ) {
			if ( isset( $index[ $candidate ] ) ) {
				return absint( $index[ $candidate ] );
			}
		}

		$attachment_id = absint( attachment_url_to_postid( $decoded_source ) );

		if ( $attachment_id ) {
			return $attachment_id;
		}
	}

	return 0;
}

/**
 * Override Bricks' stored alt value with current Media Library accessibility data.
 *
 * @param string $html    Rendered Bricks element HTML.
 * @param object $element Bricks element instance.
 */
function virtura_child_theme_apply_bricks_image_alts( $html, $element ): string {
	unset( $element );

	if (
		! is_string( $html ) ||
		false === stripos( $html, '<img' ) ||
		! class_exists( 'WP_HTML_Tag_Processor' )
	) {
		return is_string( $html ) ? $html : '';
	}

	$processor = new WP_HTML_Tag_Processor( $html );

	while ( $processor->next_tag( 'img' ) ) {
		$attachment_id = virtura_child_theme_get_image_attachment_id_from_tag( $processor );
		$alternative   = virtura_child_theme_get_attachment_image_alt( $attachment_id );

		if ( $alternative['found'] ) {
			$processor->set_attribute( 'alt', $alternative['text'] );
		}
	}

	return $processor->get_updated_html();
}

/**
 * Purge rendered page caches when an ALT or decorative flag changes.
 *
 * @param int|array<int, int> $meta_id    Meta row ID or deleted row IDs.
 * @param int                 $object_id  Attachment post ID.
 * @param string              $meta_key   Changed meta key.
 * @param mixed               $meta_value Changed meta value.
 */
function virtura_child_theme_watch_image_accessibility_meta( $meta_id, $object_id, $meta_key, $meta_value ): void {
	unset( $meta_id, $meta_value );

	if ( '_wp_attached_file' === $meta_key && 'attachment' === get_post_type( $object_id ) ) {
		virtura_child_theme_invalidate_image_attachment_index( $object_id );
		return;
	}

	if (
		! in_array(
			$meta_key,
			array( '_wp_attachment_image_alt', VIRTURA_CHILD_THEME_IMAGE_DECORATIVE_META ),
			true
		) ||
		! virtura_child_theme_is_image_attachment( (int) $object_id )
	) {
		return;
	}

	if ( '_wp_attachment_image_alt' === $meta_key ) {
		update_post_meta( $object_id, VIRTURA_CHILD_THEME_IMAGE_ALT_MANAGED_META, '1' );
	}

	virtura_child_theme_schedule_image_accessibility_cache_purge();
}

/**
 * Purge LiteSpeed once after one or more image accessibility changes.
 */
function virtura_child_theme_schedule_image_accessibility_cache_purge(): void {
	static $scheduled = false;

	if ( $scheduled ) {
		return;
	}

	$scheduled = true;
	add_action( 'shutdown', 'virtura_child_theme_purge_image_accessibility_cache', 999 );
}

/**
 * Ask LiteSpeed Cache to regenerate pages containing the edited image.
 */
function virtura_child_theme_purge_image_accessibility_cache(): void {
	do_action( 'litespeed_purge_all' );
}
