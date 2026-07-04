<?php
/**
 * Carbon Fields definitions.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register Carbon Fields meta boxes for realization posts.
 */
function virtura_child_theme_register_realization_carbon_fields(): void {
	if (
		! class_exists( '\Carbon_Fields\Container' ) ||
		! class_exists( '\Carbon_Fields\Field' )
	) {
		return;
	}

	\Carbon_Fields\Container::make(
		'post_meta',
		__( 'Zakres prac', 'virtura-child-theme' )
	)
		->where( 'post_type', '=', 'realizacja' )
		->add_fields(
			array(
				\Carbon_Fields\Field::make(
					'complex',
					'virtura_realization_work_scope',
					__( 'Zakres prac', 'virtura-child-theme' )
				)
					->setup_labels(
						array(
							'singular_name' => __( 'krok', 'virtura-child-theme' ),
							'plural_name'   => __( 'kroki', 'virtura-child-theme' ),
						)
					)
					->set_layout( 'tabbed-vertical' )
					->set_collapsed( true )
					->set_header_template(
						'<% if (step_title) { %>Krok <%- $_index + 1 %>: <%- step_title %><% } else { %>Krok <%- $_index + 1 %><% } %>'
					)
					->add_fields(
						array(
							\Carbon_Fields\Field::make(
								'text',
								'step_title',
								__( 'Tytuł kroku', 'virtura-child-theme' )
							),
							\Carbon_Fields\Field::make(
								'complex',
								'step_points',
								__( 'Punkty kroku', 'virtura-child-theme' )
							)
								->setup_labels(
									array(
										'singular_name' => __( 'punkt', 'virtura-child-theme' ),
										'plural_name'   => __( 'punkty', 'virtura-child-theme' ),
									)
								)
								->set_layout( 'grid' )
								->set_header_template(
									'<% if (point_text) { %><%- point_text %><% } else { %>Punkt <%- $_index + 1 %><% } %>'
								)
								->add_fields(
									array(
										\Carbon_Fields\Field::make(
											'text',
											'point_text',
											__( 'Treść punktu', 'virtura-child-theme' )
										),
									)
								),
						)
					),
			)
		);
}
add_action( 'carbon_fields_register_fields', 'virtura_child_theme_register_realization_carbon_fields' );

/**
 * Resolve the current realization ID for frontend and Bricks preview contexts.
 */
function virtura_child_theme_get_current_realization_id(): int {
	$queried_object_id = get_queried_object_id();

	if ( $queried_object_id && 'realizacja' === get_post_type( $queried_object_id ) ) {
		return (int) $queried_object_id;
	}

	$post_id = get_the_ID();

	if ( $post_id && 'realizacja' === get_post_type( $post_id ) ) {
		return (int) $post_id;
	}

	return 0;
}

/**
 * Return the current post date in month.year format for Bricks dynamic data.
 *
 * @param int|string $post_id Optional post ID.
 */
function virtura_get_post_date_month_year( $post_id = 0 ): string {
	$post_id = absint( $post_id );

	if ( ! $post_id ) {
		$post_id = get_the_ID();
	}

	if ( ! $post_id ) {
		return '';
	}

	return get_the_date( 'm.Y', $post_id );
}

/**
 * Return Carbon Fields work-scope data as a PHP array.
 *
 * @param int|string $post_id Optional realization ID.
 */
function virtura_child_theme_get_realization_work_scope_data( $post_id = 0 ): array {
	if ( ! function_exists( 'carbon_get_post_meta' ) ) {
		return array();
	}

	$post_id = absint( $post_id );

	if ( ! $post_id ) {
		$post_id = virtura_child_theme_get_current_realization_id();
	}

	if ( ! $post_id || 'realizacja' !== get_post_type( $post_id ) ) {
		return array();
	}

	$steps = carbon_get_post_meta( $post_id, 'virtura_realization_work_scope' );

	if ( ! is_array( $steps ) ) {
		return array();
	}

	$formatted_steps = array();

	foreach ( $steps as $step_index => $step ) {
		if ( ! is_array( $step ) ) {
			continue;
		}

		$points           = isset( $step['step_points'] ) && is_array( $step['step_points'] ) ? $step['step_points'] : array();
		$formatted_points = array();

		foreach ( $points as $point_index => $point ) {
			if ( ! is_array( $point ) ) {
				continue;
			}

			$point_text = isset( $point['point_text'] ) ? trim( (string) $point['point_text'] ) : '';

			if ( '' === $point_text ) {
				continue;
			}

			$formatted_points[] = array(
				'point_index' => $point_index + 1,
				'point_text'  => $point_text,
			);
		}

		$formatted_steps[] = array(
			'step_index'  => $step_index + 1,
			'step_number' => sprintf( '%02d', $step_index + 1 ),
			'step_label'  => sprintf( 'KROK %02d', $step_index + 1 ),
			'step_title'  => isset( $step['step_title'] ) ? trim( (string) $step['step_title'] ) : '',
			'step_points' => $formatted_points,
		);
	}

	return $formatted_steps;
}

/**
 * Return Carbon Fields work-scope items as JSON objects for Bricks Array Query editor.
 *
 * This is meant to be used inside the editor's outer brackets:
 * [
 *   {echo:virtura_get_realization_work_scope()}
 * ]
 *
 * @param int|string $post_id Optional realization ID. Useful when called from Bricks via {post_id}.
 */
function virtura_get_realization_work_scope( $post_id = 0 ): string {
	$json = wp_json_encode( virtura_child_theme_get_realization_work_scope_data( $post_id ) );

	if ( ! is_string( $json ) || '[]' === $json ) {
		return '';
	}

	return trim( $json, '[]' );
}

/**
 * Return Carbon Fields work-scope data as a full JSON array.
 *
 * @param int|string $post_id Optional realization ID. Useful when called from Bricks via {post_id}.
 */
function virtura_get_realization_work_scope_json( $post_id = 0 ): string {
	$json = wp_json_encode( virtura_child_theme_get_realization_work_scope_data( $post_id ) );

	return is_string( $json ) ? $json : '[]';
}

/**
 * Allow Bricks dynamic data `{echo:...}` to call the work-scope helper.
 *
 * @param mixed $function_names Allowed function names.
 *
 * @return string[]
 */
function virtura_child_theme_allow_bricks_echo_functions( $function_names ): array {
	if ( ! is_array( $function_names ) ) {
		$function_names = array();
	}

	$function_names[] = 'virtura_get_realization_work_scope';
	$function_names[] = 'virtura_get_realization_work_scope_json';
	$function_names[] = 'virtura_get_post_date_month_year';

	return array_values( array_unique( $function_names ) );
}
add_filter( 'bricks/code/echo_function_names', 'virtura_child_theme_allow_bricks_echo_functions' );
