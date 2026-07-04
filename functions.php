<?php
/**
 * Virtura Child Theme bootstrap.
 *
 * @package VirturaChildTheme
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'VIRTURA_CHILD_THEME_VERSION', wp_get_theme()->get( 'Version' ) );
define( 'VIRTURA_CHILD_THEME_PATH', get_stylesheet_directory() );
define( 'VIRTURA_CHILD_THEME_URI', get_stylesheet_directory_uri() );

require_once VIRTURA_CHILD_THEME_PATH . '/inc/enqueue.php';
