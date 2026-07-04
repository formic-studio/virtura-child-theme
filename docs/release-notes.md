# Release Notes

## Unreleased

- Initial child theme setup for Bricks Builder.
- Added Vite asset pipeline.
- Added GSAP motion foundation with `prefers-reduced-motion` support.
- Added transparent header color switching based on Bricks section classes:
  use `nav-light` for sections where the navigation should be white and
  `nav-dark` for sections where it should be black.
- Added giga menu behavior for the header. Build the panel in Bricks inside
  `.section_nav` with the `giga-menu` class; hovering the desktop `Usługi`
  menu item opens it and leaving `.section_nav` closes it. Add
  `giga-menu-items` inside the panel to auto-render columns from the WordPress
  submenu.
- Giga menu can be forced open for editing by adding
  `giga-menu-builder-open` to `.section_nav`.
- Added `[virtura_work_scope]` shortcode for rendering Pods-powered work scope
  steps on single `realizacja` templates. In Bricks, place a Shortcode element
  where the dynamic "Zakres prac" list should appear.
