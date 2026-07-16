# Release Notes

## Unreleased

- Added a responsive `.specs-slider` for package comparison tables. It shows
  up to four packages on desktop, two on tablet and one on mobile, hides
  `.slider-paggination` whenever every package fits, and enables accessible
  arrows plus touch swipe only when the track actually overflows.
- Added a global `.service-img-block` hover treatment without changing the
  Bricks structure: its inherited background image scales to `1.02` inside the
  clipped card over `1.2s`, while `.img-button` uses the violet shared fill
  effect and transitions its border to violet in parallel.
- Added the shared button fill hover/focus treatment to `.category-link`
  glass links, using `--color-violet` without changing text colors.
- Added a global CSS-only horizontal swipe carousel for direct
  `.category-link` groups on mobile. Cards keep their 80% width, scroll with
  touch momentum and snap one card at a time without a visible scrollbar. The
  scroller bleeds through both mobile `.padding-global` gutters while keeping
  the cards aligned to the inner grid, so moving cards are clipped only at the
  viewport edges.
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
