<?php
/**
 * Project shortcodes.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read a Pods field with a post meta fallback.
 *
 * @param int    $post_id Post ID.
 * @param string $field_name Field name.
 * @param string $pod_name Optional Pods object name.
 * @return mixed
 */
function virtura_child_theme_get_pods_field_value( int $post_id, string $field_name, string $pod_name = '' ) {
	if ( function_exists( 'pods' ) ) {
		$resolved_pod_name = $pod_name ? $pod_name : get_post_type( $post_id );

		if ( $resolved_pod_name ) {
			$pod = pods( $resolved_pod_name, $post_id );

			if ( is_object( $pod ) && method_exists( $pod, 'field' ) ) {
				$value = $pod->field( $field_name );

				if ( null !== $value && '' !== $value && array() !== $value ) {
					return $value;
				}
			}
		}
	}

	$values = get_post_meta( $post_id, $field_name, false );

	if ( count( $values ) > 1 ) {
		return $values;
	}

	return get_post_meta( $post_id, $field_name, true );
}

/**
 * Extract post IDs from common Pods relationship return shapes.
 *
 * @param mixed $value Relationship value.
 * @return array<int>
 */
function virtura_child_theme_extract_related_post_ids( $value ): array {
	if ( empty( $value ) ) {
		return array();
	}

	if ( is_numeric( $value ) ) {
		return array( absint( $value ) );
	}

	if ( $value instanceof WP_Post ) {
		return array( absint( $value->ID ) );
	}

	if ( is_object( $value ) && isset( $value->ID ) ) {
		return array( absint( $value->ID ) );
	}

	if ( ! is_array( $value ) ) {
		return array();
	}

	$ids = array();

	foreach ( $value as $item ) {
		if ( is_array( $item ) ) {
			if ( isset( $item['ID'] ) ) {
				$ids[] = absint( $item['ID'] );
				continue;
			}

			if ( isset( $item['id'] ) ) {
				$ids[] = absint( $item['id'] );
				continue;
			}

			if ( isset( $item['post_id'] ) ) {
				$ids[] = absint( $item['post_id'] );
				continue;
			}
		}

		$ids = array_merge(
			$ids,
			virtura_child_theme_extract_related_post_ids( $item )
		);
	}

	return array_values( array_unique( array_filter( $ids ) ) );
}

/**
 * Normalize repeatable text field values to a flat text list.
 *
 * @param mixed $value Field value.
 * @return array<string>
 */
function virtura_child_theme_normalize_text_list( $value ): array {
	if ( empty( $value ) ) {
		return array();
	}

	$unserialized_value = is_string( $value ) ? maybe_unserialize( $value ) : $value;

	if ( is_array( $unserialized_value ) ) {
		$items = array();

		foreach ( $unserialized_value as $item ) {
			$items = array_merge(
				$items,
				virtura_child_theme_normalize_text_list( $item )
			);
		}

		return $items;
	}

	if ( is_object( $unserialized_value ) ) {
		return array();
	}

	$text = trim( wp_strip_all_tags( (string) $unserialized_value ) );

	if ( '' === $text ) {
		return array();
	}

	$lines = preg_split( '/\R+/', $text );

	if ( false === $lines || count( $lines ) < 2 ) {
		return array( $text );
	}

	return array_values(
		array_filter(
			array_map(
				static function ( string $line ): string {
					return trim( preg_replace( '/^[\-\*\x{2022}]\s*/u', '', $line ) ?? $line );
				},
				$lines
			)
		)
	);
}

/**
 * Get work scope step posts selected on the current realization.
 *
 * @param int $post_id Realization post ID.
 * @return array<WP_Post>
 */
function virtura_child_theme_get_work_scope_posts( int $post_id ): array {
	$related_value = virtura_child_theme_get_pods_field_value(
		$post_id,
		'zakresy_prac',
		get_post_type( $post_id ) ?: 'realizacja'
	);
	$related_ids   = virtura_child_theme_extract_related_post_ids( $related_value );

	if ( empty( $related_ids ) ) {
		$related_posts = get_posts(
			array(
				'meta_key'       => 'numer',
				'meta_query'     => array(
					'relation' => 'OR',
					array(
						'key'     => 'powiazana_realizacja',
						'value'   => (string) $post_id,
						'compare' => '=',
					),
					array(
						'key'     => 'powiazana_realizacja',
						'value'   => '"' . $post_id . '"',
						'compare' => 'LIKE',
					),
					array(
						'key'     => 'powiazana_realizacja',
						'value'   => ';i:' . $post_id . ';',
						'compare' => 'LIKE',
					),
				),
				'orderby'        => 'meta_value_num',
				'order'          => 'ASC',
				'post_status'    => 'publish',
				'post_type'      => 'zakres_prac',
				'posts_per_page' => -1,
			)
		);

		return is_array( $related_posts ) ? $related_posts : array();
	}

	$posts = get_posts(
		array(
			'orderby'        => 'post__in',
			'post__in'       => $related_ids,
			'post_status'    => 'publish',
			'post_type'      => 'zakres_prac',
			'posts_per_page' => -1,
		)
	);

	if ( ! is_array( $posts ) ) {
		return array();
	}

	$has_number = false;

	foreach ( $posts as $post ) {
		$number = virtura_child_theme_get_pods_field_value( $post->ID, 'numer', 'zakres_prac' );

		if ( '' !== trim( (string) $number ) ) {
			$has_number = true;
			break;
		}
	}

	if ( ! $has_number ) {
		return $posts;
	}

	usort(
		$posts,
		static function ( WP_Post $first_post, WP_Post $second_post ): int {
			$first_number  = (float) virtura_child_theme_get_pods_field_value( $first_post->ID, 'numer', 'zakres_prac' );
			$second_number = (float) virtura_child_theme_get_pods_field_value( $second_post->ID, 'numer', 'zakres_prac' );

			return $first_number <=> $second_number;
		}
	);

	return $posts;
}

/**
 * Render work scope cards for a realization.
 *
 * @param mixed $atts Shortcode attributes.
 * @return string
 */
function virtura_child_theme_render_work_scope_shortcode( $atts = array() ): string {
	$atts = is_array( $atts ) ? $atts : array();
	$atts = shortcode_atts(
		array(
			'class'   => '',
			'post_id' => '',
		),
		$atts,
		'virtura_work_scope'
	);

	$post_id = absint( $atts['post_id'] );

	if ( ! $post_id ) {
		$post_id = get_the_ID();
	}

	if ( ! $post_id ) {
		return '';
	}

	$scope_posts = virtura_child_theme_get_work_scope_posts( $post_id );

	if ( empty( $scope_posts ) ) {
		return '';
	}

	$extra_classes = preg_split( '/\s+/', (string) $atts['class'] );
	$extra_classes = false === $extra_classes ? array() : $extra_classes;
	$extra_classes = array_filter( array_map( 'sanitize_html_class', $extra_classes ) );
	$classes       = trim( 'virtura-work-scope ' . implode( ' ', $extra_classes ) );

	ob_start();
	?>
	<div class="<?php echo esc_attr( $classes ); ?>">
		<?php foreach ( $scope_posts as $index => $scope_post ) : ?>
			<?php
			$step_number = virtura_child_theme_get_pods_field_value( $scope_post->ID, 'numer', 'zakres_prac' );
			$step_number = '' !== trim( (string) $step_number ) ? $step_number : $index + 1;
			$step_label  = is_numeric( $step_number )
				? sprintf( 'KROK %02d', absint( $step_number ) )
				: (string) $step_number;
			$step_title  = virtura_child_theme_get_pods_field_value( $scope_post->ID, 'tytul_kroku', 'zakres_prac' );
			$step_title  = '' !== trim( (string) $step_title ) ? (string) $step_title : get_the_title( $scope_post );
			$points      = virtura_child_theme_normalize_text_list(
				virtura_child_theme_get_pods_field_value( $scope_post->ID, 'punkty_kroku', 'zakres_prac' )
			);
			?>
			<article class="virtura-work-scope__item">
				<div class="virtura-work-scope__card">
					<p class="virtura-work-scope__eyebrow"><?php echo esc_html( $step_label ); ?></p>
					<h3 class="virtura-work-scope__title"><?php echo esc_html( $step_title ); ?></h3>
				</div>

				<?php if ( ! empty( $points ) ) : ?>
					<ul class="virtura-work-scope__points">
						<?php foreach ( $points as $point ) : ?>
							<li class="virtura-work-scope__point">
								<span><?php echo wp_kses_post( nl2br( esc_html( $point ) ) ); ?></span>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</article>
		<?php endforeach; ?>
	</div>
	<?php

	return (string) ob_get_clean();
}
add_shortcode( 'virtura_work_scope', 'virtura_child_theme_render_work_scope_shortcode' );
