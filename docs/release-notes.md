# Release Notes

## Unreleased

- Added a global CSS-only horizontal swipe carousel for direct
  `.category-link` groups on mobile. Cards keep their 80% width, scroll with
  touch momentum and snap one card at a time without a visible scrollbar.
- Added an accessible animated FAQ accordion for Bricks structures using
  `.faq-block`, `.faq-heading` and `.faq-content` (the existing typo
  `.faq-conent` remains supported). Add `is-open` to the whole `.faq-block`
  to expose its content while editing in Bricks or to make it initially open
  on the frontend. Opening an item closes the other items in the same
  `.faq-wrapper`.
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
- Added Carbon Fields meta box for `realizacja` posts to manage the dynamic
  "Zakres prac" steps and nested step points.
- Added media switch behavior for Bricks blocks that can receive either an
  image or a video from one file field. Add `media-switch` to the common
  wrapper, `media-switch-img` to the Image element, and `media-switch-video`
  to the Video element. The script detects the uploaded file type and hides
  the unused element.
- Added tablet/mobile services menu rendering for the header. It reuses the
  WordPress `Usługi` submenu as an accordion and clones the existing Bricks
  "Polecane" realization card from the desktop giga menu.
