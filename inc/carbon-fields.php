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
