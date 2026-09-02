import '../styles/main.css';
import { initCoreUi, initVideoOptimization } from './core.js';

const INTRO_PATHS = new Set(['/', '/strona-glowna/']);
const INTRO_SELECTOR = '.section_hero';
const MOTION_SELECTOR = [
  '[data-motion]',
  '.section_hero .hero-video',
  '.section_category .category-block',
  '.option-block',
].join(', ');
let videoOptimizationInitialized = false;

const nextAnimationFrame = () => new Promise((resolve) => {
  window.requestAnimationFrame(resolve);
});

const waitForStableLayout = async () => {
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise((resolve) => window.setTimeout(resolve, 2500)),
    ]);
  }

  // Safari and Firefox can keep recalculating viewport/font metrics for one
  // frame after the intro overlay and its scroll lock are removed.
  await nextAnimationFrame();
  await nextAnimationFrame();
};

const getNormalizedPath = () => {
  const path = window.location.pathname || '/';

  return path.endsWith('/') ? path : `${path}/`;
};

const loadFeature = (selector, importer, initializer) => {
  if (!document.querySelector(selector)) {
    return Promise.resolve();
  }

  return importer().then((module) => module[initializer]());
};

const startVideoOptimization = () => {
  if (videoOptimizationInitialized) {
    return;
  }

  videoOptimizationInitialized = true;
  initVideoOptimization();
};

const startIntro = () => {
  const shouldLoadIntro =
    INTRO_PATHS.has(getNormalizedPath()) &&
    document.querySelector(INTRO_SELECTOR);

  if (!shouldLoadIntro) {
    startVideoOptimization();
    return Promise.resolve();
  }

  return import('./intro-animation.js')
    .then(({ initIntroAnimation }) => {
      const introReady = initIntroAnimation();

      // initIntroAnimation synchronously holds and primes the hero video before
      // its first await. Keep the global video observer behind that point.
      startVideoOptimization();

      return introReady;
    })
    .catch(() => {
      document.documentElement.classList.remove('virtura-intro-prime');
      startVideoOptimization();
    });
};

const initPageFeatures = () => Promise.allSettled([
  loadFeature(
    '.about-slider',
    () => import('./about-slider.js'),
    'initAboutSlider',
  ),
  loadFeature(
    '.brxe-fjvljt, #brxe-ccwslj',
    () => import('./archive-filters.js'),
    'initArchiveFilters',
  ),
  loadFeature(
    '.virtura-archive-pagination[data-query-element-id]',
    () => import('./archive-pagination.js'),
    'initArchivePagination',
  ),
  loadFeature(
    '.blog-grid-top, .blog-grid-bottom',
    () => import('./blog-mobile-content.js'),
    'initBlogMobileContent',
  ),
  loadFeature(
    '[data-booking-calendar-trigger], .booking-calendar-trigger, .btn-big',
    () => import('./booking-calendar.js'),
    'initBookingCalendar',
  ),
  loadFeature(
    '.faq-block',
    () => import('./faq-accordion.js'),
    'initFaqAccordion',
  ),
  loadFeature(
    '.text-overview, .fit-text-to-box, [data-fit-text]',
    () => import('./fit-text.js'),
    'initFitText',
  ),
  loadFeature(
    '.specs-slider',
    () => import('./specs-slider.js'),
    'initSpecsSlider',
  ),
  loadFeature(
    '.testimonials-slider',
    () => import('./testimonials-slider.js'),
    'initTestimonialsSlider',
  ),
  loadFeature(
    '.tab-options',
    () => import('./training-tabs.js'),
    'initTrainingTabs',
  ),
  loadFeature(
    '.video-about',
    () => import('./video-about-controls.js'),
    'initVideoAboutControls',
  ),
]);

const initScrollFeatures = async () => {
  await import('./smooth-scroll.js')
    .then(({ initSmoothScroll }) => initSmoothScroll())
    .catch(() => {});

  await waitForStableLayout();

  // The category stack changes document geometry. Initialize it before GSAP
  // measures ScrollTrigger start/end positions, never while intro is hidden.
  await loadFeature(
    '.section_category .category-wrapper',
    () => import('./category-stack.js'),
    'initCategoryStack',
  ).catch(() => {});

  await waitForStableLayout();

  await loadFeature(
    MOTION_SELECTOR,
    () => import('./motion.js'),
    'initMotion',
  ).catch(() => {});

  await loadFeature(
    '.section_hero .skip',
    () => import('./hero-skip.js'),
    'initHeroSkip',
  ).catch(() => {});
};

const initTheme = () => {
  initCoreUi();

  const introReady = startIntro();

  void initPageFeatures();
  void introReady.finally(() => {
    void initScrollFeatures();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
