# Release Notes

## Unreleased

- Stabilized the homepage in Safari and Firefox. Category-stack and GSAP
  measurements now start only after the intro, fonts and two complete layout
  frames are ready. The intro failsafe always removes the scroll lock, clears
  temporary inline styles and resolves initialization even if media or its
  timeline stalls. Hero motion is protected against duplicate placeholders;
  WebKit and Gecko use the stable in-flow hero fallback while retaining all
  other scroll reveals and sticky category cards.
- Added a `Proporcja 1:1` help note below every image field in the realization
  slider editor.
- Added a lazy Google Calendar appointment modal for the Contact page. The
  existing `.btn-big` whose text refers to a meeting, reservation or calendar
  opens the supplied test schedule without rendering Google's own button. For
  an unambiguous Bricks setup, add `booking-calendar-trigger` to the intended
  button. Additional employee buttons can set their own Google Appointment
  Schedule URL through `data-booking-calendar-url` and an optional modal title
  through `data-booking-calendar-title`. The iframe connects to Google only
  after the visitor opens the modal; keyboard activation, Escape/backdrop
  closing, focus restoration, mobile viewport sizing and reduced motion are
  supported.
- Added exclusive playback for the three sound-enabled team videos inside
  `.team-wrapper`. Starting one video pauses the other two while preserving
  their playback positions. Muted autoplay videos elsewhere on the About page
  are unaffected.
- Split the frontend JavaScript into a small global core and DOM-gated feature
  chunks. Sliders, FAQ, archive filters and pagination, training tabs, blog
  mobile layout, fit-text and page motion now download only when their matching
  Bricks component exists. The shared GSAP loader is isolated from the full
  motion implementation. Lenis uses its native animation-frame loop, while
  ScrollTrigger synchronization is attached only on pages that initialize
  motion. The homepage intro bootstrap is printed only on the front page.
  Existing initialization order, reduced-motion handling and lazy-video
  behavior are preserved.
- Added automatic numbered pagination to the Blog and Realization archive
  grids. Their main Bricks queries now return at most 11 posts per page and
  retain the total-row count needed for later pages. The accessible previous,
  next and numbered controls render only when a query has more than one page,
  preserve active filter URL parameters, replace the archive grid over AJAX,
  and keep regular page links as a no-JavaScript fallback. Newly loaded cards
  use a short staggered reveal animation and respect reduced-motion settings.
- Added an optional, unlimited `Opinia Google` Carbon Fields complex field to
  realization posts. Each review contains an author, constrained 1–5 rating,
  description and review URL and is exposed through a Bricks Array Query
  helper. An automatic `data-display-none` value hides the complete testimonial
  section when no valid reviews exist. A `data-rating` attribute on each
  `.spec-level` controls the five existing `.level-dot` elements without
  manually assigning active classes. A realization with one testimonial also
  hides its unused slider navigation automatically, while multiple reviews
  retain the carousel controls.
- Added an unlimited Carbon Fields `Slider realizacji` complex field to
  `realizacja` posts. Each slide contains an attachment image, title and
  description and can be reordered or collapsed in the editor. The data is
  exposed to Bricks Array Query through
  `{echo:virtura_get_realization_slider()}` and includes the attachment ID,
  full image URL, image ALT text, title and description for every slide. A
  single configured slide is displayed as static content and automatically
  hides the slider navigation. Slider initialization now counts only direct
  children of the image and text wrappers, preventing a nested Bricks Image
  that shares the `slider-img-item` styling class from being treated as and
  hidden like an additional slide.
- Added a global `data-display-none="true"` utility for conditionally hiding
  complete Bricks elements. On the realization template, assign the
  `data-display-none` attribute to the "Behind the scenes" section and return
  `true` when the section should be omitted. A missing attribute, an empty
  value or any value other than `true` leaves the section visible.
- Refined the homepage intro header's polygon reveal into a restrained,
  gently irregular left-to-right wipe. The edge offsets are now subtle and
  their strength eases in and back out across the reveal, preventing individual
  polygon points from clipping and visibly snapping at either end.
- Added a CSS crossfade for paired PPF offer images. In each Bricks
  `.offer-img-block`, assign `ppf-img-default` to the in-flow image and
  `ppf-img-hover` to the absolutely positioned overlay. The child-theme CSS
  owns both images' opacity states. Hovering the complete `.offer-block`
  reveals the overlay, keyboard focus receives the same state, and
  touch devices or layouts at the mobile breakpoint display the overlay
  immediately. The explicit breakpoint also covers Bricks' responsive preview,
  which retains the desktop computer's mouse capability. Reduced-motion mode
  removes the transition. The base image remains fully opaque while the
  overlay fades in, preventing the white card background from flashing through.
  The existing offer-image GSAP parallax moves both layers in sync so aligned
  before/after artwork does not jump during the transition.
- Added Media Library accessibility controls for images. Editors can update
  the native ALT text and explicitly mark an image as decorative from both
  attachment details and the Media Library list. Decorative images render with
  `alt=""`, while meaningful alternatives are propagated through WordPress and
  Bricks responsive markup. Stored descriptions are preserved when the
  decorative option is toggled, and LiteSpeed page cache is purged after a
  change.
- Rewired the complete homepage hero sequence from the removed `.hero-img` to
  the new `.hero-video`. The intro now promotes the lazy video source and waits
  for its first frame before revealing it. Autoplay remains paused during the
  logo and heading sequence, then starts the video from its opening frame at the
  exact beginning of the `.hero-video` reveal. On desktop, the same live video
  element expands to the fullscreen scroll state, so playback stays continuous
  without creating a second video decoder; mobile and reduced-motion views keep
  the static layout.
- Added a black `theme-color` meta tag on the frontend and a matching black
  mobile document canvas so Safari, including Safari 26 which derives its tint
  from `html`/`body`, can match the browser chrome and safe area to the footer.
  The editable `#brx-content` canvas remains white. Corrected the square footer
  animation to override Bricks' default 16:9 video ratio and cover crop, and
  removed the global gray lazy-video background that appeared beside it.
- Added browser-assisted video poster generation without requiring FFmpeg.
  New MP4/WebM uploads capture an opening frame at `0.1s`, scale it to a
  maximum width of 1920px, save it as WebP (with a JPEG fallback) in Media
  Library and link it to the video using both native attachment thumbnail meta
  and `_virtura_video_poster_id`. Existing videos receive a manual regenerate
  control in their media details. Bricks, Core Video blocks and WordPress video
  shortcodes automatically receive the linked poster. Posters use the 1280px
  responsive variant and remain in the native HTML `poster` attribute so they
  can paint before JavaScript. Video sources are deferred in PHP and restored
  100px before the viewport, with at most two videos starting concurrently.
  Autoplay pauses outside the observed area, is disabled for reduced-motion
  users, and direct user interaction can load an otherwise deferred source. Add
  `data-virtura-video-eager="true"` to opt a critical video out of source
  deferral. WebM uploads are allowed, while the hosting layer must still serve
  `.webm` files with `Content-Type: video/webm`.
- Added automatic media optimization for new WordPress uploads. JPEG and PNG
  display files and responsive variants are generated as WebP at quality 80
  when supported by the active image editor, source uploads remain available
  for recovery, and images larger than 2560px use WordPress' scaled primary
  file. Added 400px, 480px, 640px and
  1280px intermediate sizes, component-aware `sizes` values for hero, archive,
  category and team images, and corrected hero loading to `eager` with a valid
  `fetchpriority="high"`. Below-fold homepage media no longer competes with the
  hero, and Bricks video placeholders pointing to JPEG/PNG/WebP files have
  their invalid `src` removed before reaching the browser.
- Added an accessible `.skip` control to the homepage hero. Its duplicated
  arrow uses the shared push transition vertically, while activation quickly
  scrolls to the exact end of the pinned hero media animation. The jump uses a
  short Lenis transition, falls back to the following section when the desktop
  ScrollTrigger is unavailable and becomes immediate for reduced motion.
- Replaced the shared arrow hover movement with a global push transition. Each
  `.svg-arrow-block` now receives an accessibility-hidden duplicate that enters
  as the visible arrow exits; previous-slide controls move in the opposite
  direction. The effect also supports keyboard focus, keeps the existing arrow
  colours and is disabled by `prefers-reduced-motion`.
- Added a `0.2s ease` grey hover and keyboard-focus state to Bricks contact
  form submit buttons, matching the footer button timing.
- Simplified Bricks form feedback into inline text: success messages are white,
  errors are red, and both omit the default alert background, border, shadow
  and padding.
- Added responsive content placement for the blog post template. On mobile,
  the first `.blog-grid-top` block containing violet text moves inside
  `.blog-rich-text` immediately before its second direct `h2`; its original
  desktop grid position is restored when the viewport grows again.
- Fixed shared `.glass-block` cards being clipped by the following section on
  mobile. Their section, container and padding wrapper now expose the full card
  while the existing `7rem` overlap is preserved and layered above the next
  section.
- Added a responsive `.specs-slider` for package comparison tables. It shows
  up to six packages on viewports from 1920px, four on regular desktop, two on
  tablet and one on mobile. It hides `.slider-paggination` whenever every
  package fits and enables accessible
  arrows, touch swipe and horizontal touchpad/Magic Mouse gestures only when
  the track actually overflows. Wheel handling reacts only to horizontal intent
  and advances once per gesture so vertical page scrolling remains unaffected.
  A fresh gesture can re-arm the slider from a long momentum tail only after a
  short guard period and a clear acceleration spike, avoiding both lock-ups and
  accidental two-slide jumps.
  The track is
  moved with transforms and clipped without an overflow scroll container, so
  the existing sticky `.spec-top` headers keep following the viewport without
  covering the first data row. Package headers and corresponding `.spec-bottom`
  rows are height-synchronised whenever multiple packages are visible, keeping
  later parameters aligned even when one value has fewer or more text lines.
  The sticky inset is `0` on every breakpoint. Header top padding scales from
  `2.8–3.6rem` on mobile through `3.6–4.2rem` on tablet to a maximum of
  `4.6rem` on desktop, while mobile bottom padding remains compact.
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
