<?php
/**
 * Blog tag links.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Point post tags to the filtered Blog page instead of the tag archive.
 *
 * The Blog layout and its Bricks filter live on a regular page. Native tag
 * archives do not use that layout, so tag links need to activate the matching
 * filter on the Blog page directly.
 *
 * @param string   $term_link Native term archive URL.
 * @param \WP_Term $term      Term represented by the URL.
 * @param string   $taxonomy  Term taxonomy.
 */
function virtura_child_theme_filter_blog_tag_link(
	string $term_link,
	\WP_Term $term,
	string $taxonomy
): string {
	if ( 'post_tag' !== $taxonomy ) {
		return $term_link;
	}

	return add_query_arg(
		'brx_yoostw',
		$term->slug,
		home_url( '/blog/' )
	);
}
add_filter( 'term_link', 'virtura_child_theme_filter_blog_tag_link', 10, 3 );
