<?php
/**
 * Pagination for the Blog and Realization archive grids.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VIRTURA_ARCHIVE_POSTS_PER_PAGE = 14;

/**
 * Check whether an element uses a given Bricks CSS class.
 *
 * Bricks stores regular and global classes separately, so both sources need to
 * be checked when a query is identified by its frontend class.
 *
 * @param array  $settings   Bricks element settings.
 * @param string $class_name CSS class without the leading dot.
 */
function virtura_child_theme_bricks_element_has_class( array $settings, string $class_name ): bool {
	$custom_classes = isset( $settings['_cssClasses'] )
		? preg_split( '/\s+/', trim( (string) $settings['_cssClasses'] ) )
		: array();

	if ( is_array( $custom_classes ) && in_array( $class_name, $custom_classes, true ) ) {
		return true;
	}

	if (
		empty( $settings['_cssGlobalClasses'] ) ||
		! is_array( $settings['_cssGlobalClasses'] ) ||
		! class_exists( '\\Bricks\\Element' ) ||
		! method_exists( '\\Bricks\\Element', 'get_element_global_classes' )
	) {
		return false;
	}

	$global_classes = \Bricks\Element::get_element_global_classes( $settings['_cssGlobalClasses'] );

	return is_array( $global_classes ) && in_array( $class_name, $global_classes, true );
}

/**
 * Detect a frontend request for one of the archive templates.
 *
 * The main-query flag keeps the check working inside Bricks REST/AJAX requests,
 * where WordPress conditional tags do not describe the original archive URL.
 *
 * @param array $query_vars WP_Query arguments prepared by Bricks.
 * @param array $settings   Bricks element settings.
 */
function virtura_child_theme_is_archive_grid_query( array $query_vars, array $settings ): bool {
	if ( ! virtura_child_theme_bricks_element_has_class( $settings, 'archive-grid' ) ) {
		return false;
	}

	$is_archive_main_query = ! empty( $query_vars['is_archive_main_query'] );

	if ( ! $is_archive_main_query && ! empty( $settings['query'] ) && is_array( $settings['query'] ) ) {
		$is_archive_main_query = ! empty( $settings['query']['is_archive_main_query'] );
	}

	return $is_archive_main_query || is_archive() || is_home();
}

/**
 * Return the current archive page for regular and Bricks AJAX requests.
 *
 * @param array $query_vars WP_Query arguments prepared by Bricks.
 */
function virtura_child_theme_get_archive_page( array $query_vars = array() ): int {
	$current_page = isset( $query_vars['paged'] ) ? absint( $query_vars['paged'] ) : 0;

	if (
		class_exists( '\\Bricks\\Helpers' ) &&
		method_exists( '\\Bricks\\Helpers', 'get_ajax_current_page' )
	) {
		$current_page = max( $current_page, absint( \Bricks\Helpers::get_ajax_current_page() ) );
	}

	$current_page = max(
		$current_page,
		absint( get_query_var( 'paged' ) ),
		absint( get_query_var( 'page' ) )
	);

	return max( 1, $current_page );
}

/**
 * Limit archive-grid queries to fourteen posts and retain pagination totals.
 *
 * @param array  $query_vars  WP_Query arguments prepared by Bricks.
 * @param array  $settings    Bricks element settings.
 * @param string $element_id  Bricks query element ID.
 * @param string $element_name Bricks element name.
 */
function virtura_child_theme_limit_archive_grid_query(
	array $query_vars,
	array $settings,
	string $element_id,
	string $element_name = ''
): array {
	unset( $element_name );

	if ( ! virtura_child_theme_is_archive_grid_query( $query_vars, $settings ) ) {
		return $query_vars;
	}

	$current_page                        = virtura_child_theme_get_archive_page( $query_vars );
	$query_vars['posts_per_page']        = VIRTURA_ARCHIVE_POSTS_PER_PAGE;
	$query_vars['paged']                 = $current_page;
	$query_vars['no_found_rows']         = false;
	$GLOBALS['virtura_archive_queries']  = $GLOBALS['virtura_archive_queries'] ?? array();
	$GLOBALS['virtura_archive_queries'][ $element_id ] = array(
		'current'               => $current_page,
		'total'                 => 0,
		'has_native_navigation' => ! empty( $settings['postsNavigation'] ),
	);

	return $query_vars;
}
add_filter( 'bricks/posts/query_vars', 'virtura_child_theme_limit_archive_grid_query', 30, 4 );

/**
 * Store the page count calculated by the target Bricks query.
 *
 * @param int|float     $max_num_pages Maximum number of result pages.
 * @param \Bricks\Query $query_obj     Bricks query instance.
 */
function virtura_child_theme_capture_archive_page_count( $max_num_pages, $query_obj ) {
	$element_id = isset( $query_obj->element_id ) ? (string) $query_obj->element_id : '';
	$queries    = $GLOBALS['virtura_archive_queries'] ?? array();

	if ( ! $element_id || ! isset( $queries[ $element_id ] ) ) {
		return $max_num_pages;
	}

	$GLOBALS['virtura_archive_queries'][ $element_id ]['total'] = max( 0, absint( $max_num_pages ) );

	return $max_num_pages;
}
add_filter(
	'bricks/query/result_max_num_pages',
	'virtura_child_theme_capture_archive_page_count',
	10,
	2
);

/**
 * Build an archive pagination base URL, including active Bricks filter values.
 */
function virtura_child_theme_get_archive_pagination_base(): string {
	$large = 999999999;

	if ( ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) && wp_get_referer() ) {
		$referer = remove_query_arg( 'paged', wp_get_referer() );
		$referer = preg_replace( '#/page/\d+/?(?=\?|$)#', '/', $referer );
		$base    = add_query_arg( 'paged', $large, $referer );
	} else {
		$base = get_pagenum_link( $large, false );
	}

	return str_replace( (string) $large, '%#%', esc_url( $base ) );
}

/**
 * Return a chevron used by the previous and next page controls.
 *
 * @param string $direction Either "previous" or "next".
 */
function virtura_child_theme_get_archive_pagination_icon( string $direction ): string {
	$path = 'previous' === $direction ? 'M10.5 3.5 6 8l4.5 4.5' : 'M5.5 3.5 10 8l-4.5 4.5';

	return sprintf(
		'<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="%s" /></svg>',
		esc_attr( $path )
	);
}

/**
 * Render the numbered archive navigation.
 *
 * @param int    $current_page Current page number.
 * @param int    $total_pages  Total number of pages.
 * @param string $element_id   Related Bricks query element ID.
 */
function virtura_child_theme_render_archive_pagination(
	int $current_page,
	int $total_pages,
	string $element_id = ''
): string {
	if ( $total_pages < 2 ) {
		return '';
	}

	$previous_label = __( 'Poprzednia strona', 'virtura-child-theme' );
	$next_label     = __( 'Następna strona', 'virtura-child-theme' );
	$page_label     = __( 'Strona', 'virtura-child-theme' );
	$links          = paginate_links(
		array(
			'base'               => virtura_child_theme_get_archive_pagination_base(),
			'format'             => '',
			'current'            => $current_page,
			'total'              => $total_pages,
			'mid_size'           => 1,
			'end_size'           => 1,
			'prev_text'          => sprintf(
				'<span class="screen-reader-text">%s</span>%s',
				esc_html( $previous_label ),
				virtura_child_theme_get_archive_pagination_icon( 'previous' )
			),
			'next_text'          => sprintf(
				'<span class="screen-reader-text">%s</span>%s',
				esc_html( $next_label ),
				virtura_child_theme_get_archive_pagination_icon( 'next' )
			),
			'before_page_number' => sprintf(
				'<span class="screen-reader-text">%s </span>',
				esc_html( $page_label )
			),
			'type'               => 'array',
		)
	);

	if ( ! is_array( $links ) || empty( $links ) ) {
		return '';
	}

	$previous_control = '';
	$next_control     = '';
	$number_links     = array();

	foreach ( $links as $link ) {
		if ( false !== strpos( $link, 'prev page-numbers' ) ) {
			$previous_control = $link;
			continue;
		}

		if ( false !== strpos( $link, 'next page-numbers' ) ) {
			$next_control = $link;
			continue;
		}

		$number_links[] = $link;
	}

	if ( ! $previous_control ) {
		$previous_control = sprintf(
			'<span class="prev page-numbers is-disabled" aria-disabled="true"><span class="screen-reader-text">%s</span>%s</span>',
			esc_html( $previous_label ),
			virtura_child_theme_get_archive_pagination_icon( 'previous' )
		);
	}

	if ( ! $next_control ) {
		$next_control = sprintf(
			'<span class="next page-numbers is-disabled" aria-disabled="true"><span class="screen-reader-text">%s</span>%s</span>',
			esc_html( $next_label ),
			virtura_child_theme_get_archive_pagination_icon( 'next' )
		);
	}

	$items   = array_merge( array( $previous_control ), $number_links, array( $next_control ) );
	$markup  = sprintf(
		'<nav class="virtura-archive-pagination" data-query-element-id="%s" aria-label="',
		esc_attr( $element_id )
	);
	$markup .= esc_attr__( 'Paginacja archiwum', 'virtura-child-theme' ) . '">';
	$markup .= '<ul class="page-numbers">';

	foreach ( $items as $item ) {
		$markup .= '<li>' . $item . '</li>';
	}

	$markup .= '</ul></nav>';

	return $markup;
}

/**
 * Append pagination directly after the matching Bricks archive element.
 *
 * @param string          $html    Rendered Bricks element HTML.
 * @param \Bricks\Element $element Bricks element instance.
 */
function virtura_child_theme_append_archive_pagination( string $html, $element ): string {
	if (
		function_exists( 'virtura_child_theme_is_bricks_builder' ) &&
		virtura_child_theme_is_bricks_builder()
	) {
		return $html;
	}

	$element_id = isset( $element->id ) ? (string) $element->id : '';
	$queries    = $GLOBALS['virtura_archive_queries'] ?? array();

	if ( ! $element_id || empty( $queries[ $element_id ] ) ) {
		return $html;
	}

	$query_state = $queries[ $element_id ];

	if ( ! empty( $query_state['has_native_navigation'] ) || (int) $query_state['total'] < 2 ) {
		return $html;
	}

	$pagination = virtura_child_theme_render_archive_pagination(
		(int) $query_state['current'],
		(int) $query_state['total'],
		$element_id
	);

	return $html . $pagination;
}
add_filter(
	'bricks/frontend/render_element',
	'virtura_child_theme_append_archive_pagination',
	20,
	2
);
