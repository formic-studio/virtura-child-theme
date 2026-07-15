import { loadGsap } from './motion.js';

const FAQ_SELECTOR = '.faq-block';
const FAQ_GROUP_SELECTOR = '.faq-wrapper';
const HEADING_SELECTOR = ':scope > .faq-heading';
const CONTENT_SELECTOR = ':scope > :is(.faq-content, .faq-conent)';
const OPEN_CLASS = 'is-open';
const READY_CLASS = 'virtura-faq-ready';
const ANIMATION_DURATION = 0.48;

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const items = [];
let gsapApi;
let gsapPromise;

const getGsap = () => {
  if (!gsapPromise) {
    gsapPromise = loadGsap().then(({ gsap }) => {
      gsapApi = gsap;
      return gsap;
    });
  }

  return gsapPromise;
};

const getOpenGap = (content) => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--space-24')
    .trim();

  return value || '2.4rem';
};

const setAccessibilityState = (item) => {
  item.heading.setAttribute('aria-expanded', String(item.isOpen));
  item.content.setAttribute('aria-hidden', String(!item.isOpen));
};

const applyStateImmediately = (item) => {
  item.animationVersion += 1;
  gsapApi?.killTweensOf(item.content);
  item.root.classList.toggle(OPEN_CLASS, item.isOpen);
  item.content.style.removeProperty('height');
  item.content.style.removeProperty('margin-top');
  item.content.style.removeProperty('opacity');
  item.content.style.removeProperty('visibility');
  setAccessibilityState(item);
};

const animateState = async (item) => {
  const animationVersion = ++item.animationVersion;

  setAccessibilityState(item);

  if (reducedMotionMedia.matches) {
    applyStateImmediately(item);
    return;
  }

  let gsap;

  try {
    gsap = await getGsap();
  } catch {
    applyStateImmediately(item);
    return;
  }

  if (animationVersion !== item.animationVersion) {
    return;
  }

  const currentHeight = item.content.getBoundingClientRect().height;
  const currentStyles = getComputedStyle(item.content);
  const currentMargin = Number.parseFloat(currentStyles.marginTop) || 0;
  const currentOpacity = Number.parseFloat(currentStyles.opacity) || 0;

  gsap.killTweensOf(item.content);
  gsap.set(item.content, {
    autoAlpha: currentOpacity,
    height: currentHeight,
    marginTop: currentMargin,
  });

  item.root.classList.toggle(OPEN_CLASS, item.isOpen);

  gsap.to(item.content, {
    autoAlpha: item.isOpen ? 1 : 0,
    clearProps: 'height,marginTop,opacity,visibility',
    duration: ANIMATION_DURATION,
    ease: 'power3.inOut',
    height: item.isOpen ? 'auto' : 0,
    marginTop: item.isOpen ? getOpenGap(item.content) : 0,
    overwrite: 'auto',
  });
};

const getGroupItems = (item) => {
  const group = item.root.closest(FAQ_GROUP_SELECTOR);

  if (!group) {
    return [item];
  }

  return items.filter((candidate) => candidate.root.closest(FAQ_GROUP_SELECTOR) === group);
};

const setOpen = (item, isOpen) => {
  if (item.isOpen === isOpen) {
    return;
  }

  item.isOpen = isOpen;
  void animateState(item);
};

const toggleItem = (item) => {
  const shouldOpen = !item.isOpen;

  if (shouldOpen) {
    getGroupItems(item).forEach((candidate) => {
      if (candidate !== item) {
        setOpen(candidate, false);
      }
    });
  }

  setOpen(item, shouldOpen);
};

const initItem = (root, index) => {
  if (!(root instanceof HTMLElement) || root.classList.contains(READY_CLASS)) {
    return;
  }

  const heading = root.querySelector(HEADING_SELECTOR);
  const content = root.querySelector(CONTENT_SELECTOR);

  if (!(heading instanceof HTMLElement) || !(content instanceof HTMLElement)) {
    return;
  }

  const itemId = root.id || `virtura-faq-${index + 1}`;
  const headingId = heading.id || `${itemId}-heading`;
  const contentId = content.id || `${itemId}-content`;
  const icon = heading.querySelector('svg');
  const item = {
    animationVersion: 0,
    content,
    heading,
    isOpen: root.classList.contains(OPEN_CLASS),
    root,
  };

  heading.id = headingId;
  heading.setAttribute('aria-controls', contentId);
  heading.setAttribute('role', 'button');
  heading.setAttribute('tabindex', '0');

  content.id = contentId;
  content.setAttribute('aria-labelledby', headingId);
  content.setAttribute('role', 'region');

  if (icon instanceof SVGElement) {
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
  }

  heading.addEventListener('click', () => toggleItem(item));
  heading.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    toggleItem(item);
  });

  root.classList.add(READY_CLASS);
  items.push(item);
  applyStateImmediately(item);
};

export const initFaqAccordion = () => {
  const faqBlocks = document.querySelectorAll(FAQ_SELECTOR);

  if (!faqBlocks.length) {
    return;
  }

  faqBlocks.forEach(initItem);

  if (!reducedMotionMedia.matches) {
    void getGsap().catch(() => {});
  }
};

const handleReducedMotionChange = () => {
  items.forEach(applyStateImmediately);
};

if ('addEventListener' in reducedMotionMedia) {
  reducedMotionMedia.addEventListener('change', handleReducedMotionChange);
} else {
  reducedMotionMedia.addListener(handleReducedMotionChange);
}
