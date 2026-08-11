import { getHeroMediaScrollTrigger } from './motion.js';
import { scrollToPosition } from './smooth-scroll.js';

const SKIP_SELECTOR = '.section_hero .skip';
const HERO_SECTION_SELECTOR = '.section_hero';
const CONTENT_SECTION_SELECTOR = '#brx-content .brxe-section';
const READY_ATTRIBUTE = 'data-virtura-hero-skip';
const SKIP_DURATION = 0.8;

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

const getNextSection = (control) => {
  const hero = control.closest(HERO_SECTION_SELECTOR);

  if (!hero) {
    return null;
  }

  const sections = Array.from(document.querySelectorAll(CONTENT_SECTION_SELECTOR));
  const heroIndex = sections.indexOf(hero);

  if (heroIndex >= 0) {
    return sections[heroIndex + 1] || null;
  }

  return hero.nextElementSibling;
};

const getSkipTarget = (control) => {
  const nextSection = getNextSection(control);

  if (nextSection) {
    return Math.ceil(nextSection.getBoundingClientRect().top + window.scrollY);
  }

  const scrollTrigger = getHeroMediaScrollTrigger();

  if (scrollTrigger && Number.isFinite(scrollTrigger.end)) {
    return Math.ceil(scrollTrigger.end + 1);
  }

  return null;
};

const setupSkipControl = (control) => {
  if (control.hasAttribute(READY_ATTRIBUTE)) {
    return;
  }

  control.setAttribute(READY_ATTRIBUTE, 'true');
  control.setAttribute(
    'aria-label',
    control.getAttribute('aria-label') || 'Pomiń animację i przejdź dalej',
  );

  if (!control.matches('a[href], button')) {
    control.setAttribute('role', 'button');
    control.setAttribute('tabindex', '0');
  }

  let isSkipping = false;

  const skipHeroMotion = () => {
    if (isSkipping) {
      return;
    }

    const target = getSkipTarget(control);

    if (!Number.isFinite(target)) {
      return;
    }

    isSkipping = true;
    control.classList.add('is-skipping');

    scrollToPosition(target, {
      duration: SKIP_DURATION,
      immediate: reducedMotionMedia.matches,
      onComplete: () => {
        isSkipping = false;
        control.classList.remove('is-skipping');
      },
    });
  };

  control.addEventListener('click', (event) => {
    event.preventDefault();
    skipHeroMotion();
  });
  control.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    skipHeroMotion();
  });
};

export const initHeroSkip = () => {
  document.querySelectorAll(SKIP_SELECTOR).forEach(setupSkipControl);
};
