import { loadGsap } from './motion.js';

const SLIDER_SELECTOR = '.testimonials-slider';
const TRACK_SELECTOR = '.slider-wrapper';
const ITEM_SELECTOR = '.slider-item';
const CONTROLS_SELECTOR = '.slider-paggination .svg-arrow-block';
const ACTIVE_CLASS = 'is-active';
const DISABLED_CLASS = 'is-disabled';
const READY_CLASS = 'virtura-testimonials-slider-ready';
const GSAP_CLASS = 'virtura-testimonials-slider-gsap';
const PREV_LABEL = 'Poprzedni slajd';
const NEXT_LABEL = 'Nastepna opinia';
const ANIMATION_DURATION = 0.92;
const ANIMATION_EASE = 'power3.out';
const SCROLL_EPSILON = 1;
const SWIPE_THRESHOLD = 40;

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

const clampIndex = (index, length) => Math.min(Math.max(index, 0), length - 1);

const getItemOffset = (track, item) => {
  if (!track || !item) {
    return 0;
  }

  const trackRect = track.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();

  return itemRect.left - trackRect.left + track.scrollLeft;
};

const getMaxScroll = (track) => Math.max(0, track.scrollWidth - track.clientWidth);

const getScrollPositions = (track, items) => {
  const maxScroll = getMaxScroll(track);
  const positions = items
    .map((item) => Math.min(getItemOffset(track, item), maxScroll))
    .filter((position, index, allPositions) => (
      index === 0 || Math.abs(position - allPositions[index - 1]) > SCROLL_EPSILON
    ));

  return positions.length ? positions : [0];
};

const setActiveState = (items, index) => {
  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;

    item.classList.toggle(ACTIVE_CLASS, isActive);
    item.removeAttribute('aria-hidden');
  });
};

const setControlState = (control, isDisabled) => {
  control.classList.toggle(DISABLED_CLASS, isDisabled);
  control.setAttribute('aria-disabled', String(isDisabled));
  control.setAttribute('tabindex', isDisabled ? '-1' : '0');
};

const setupControl = (control, label, onClick) => {
  control.setAttribute('aria-label', label);
  control.setAttribute('role', 'button');
  control.setAttribute('tabindex', '0');

  control.addEventListener('click', onClick);
  control.addEventListener('keydown', (event) => {
    if (control.getAttribute('aria-disabled') === 'true') {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onClick();
  });
};

const updateControls = (controls, activeIndex, slideCount) => {
  setControlState(controls[0], activeIndex === 0);
  setControlState(controls[1], activeIndex === slideCount - 1);
};

const clearItemTransforms = (items) => {
  items.forEach((item) => {
    item.style.removeProperty('transform');
  });
};

const clearTrackTransform = (track) => {
  track.style.removeProperty('transform');
};

const clearPreviousMotionStyles = (track, items) => {
  clearItemTransforms(items);
  clearTrackTransform(track);
};

const setSlideState = (
  slider,
  track,
  items,
  positions,
  index,
  { animate = true } = {},
) => {
  const targetScroll = positions[index] || 0;

  setActiveState(items, index);
  clearPreviousMotionStyles(track, items);
  track.style.willChange = 'scroll-position';

  if (!animate || reducedMotionMedia.matches) {
    track.scrollLeft = targetScroll;

    return;
  }

  void loadGsap()
    .then(({ gsap }) => {
      slider.classList.add(GSAP_CLASS);
      gsap.killTweensOf(track);
      gsap.to(track, {
        duration: ANIMATION_DURATION,
        ease: ANIMATION_EASE,
        overwrite: 'auto',
        scrollLeft: targetScroll,
      });
    })
    .catch(() => {
      track.scrollTo({ left: targetScroll, behavior: 'smooth' });
    });
};

const initSlider = (slider) => {
  if (slider.classList.contains(READY_CLASS)) {
    return;
  }

  const track = slider.querySelector(TRACK_SELECTOR);
  const items = track ? Array.from(track.querySelectorAll(ITEM_SELECTOR)) : [];
  const controls = Array.from(slider.querySelectorAll(CONTROLS_SELECTOR));

  if (!track || items.length < 2 || controls.length < 2) {
    return;
  }

  let activeIndex = 0;
  let touchStartX = null;
  let resizeFrame = null;
  let positions = [];

  const refreshPositions = () => {
    positions = getScrollPositions(track, items);
    activeIndex = clampIndex(activeIndex, positions.length);
    updateControls(controls, activeIndex, positions.length);
  };

  const goTo = (nextIndex, options) => {
    refreshPositions();

    const clampedIndex = clampIndex(nextIndex, positions.length);

    if (clampedIndex === activeIndex && options?.force !== true) {
      return;
    }

    activeIndex = clampedIndex;
    setSlideState(slider, track, items, positions, activeIndex, options);
    updateControls(controls, activeIndex, positions.length);
    slider.dataset.activeSlide = String(activeIndex + 1);
  };

  const refreshPosition = () => {
    resizeFrame = null;
    refreshPositions();
    setSlideState(slider, track, items, positions, activeIndex, {
      animate: false,
      force: true,
    });
  };

  const scheduleRefresh = () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(refreshPosition);
  };

  setupControl(controls[0], PREV_LABEL, () => {
    if (activeIndex > 0) {
      goTo(activeIndex - 1);
    }
  });

  setupControl(controls[1], NEXT_LABEL, () => {
    if (activeIndex < positions.length - 1) {
      goTo(activeIndex + 1);
    }
  });

  slider.addEventListener(
    'touchstart',
    (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
    },
    { passive: true },
  );

  slider.addEventListener(
    'touchend',
    (event) => {
      if (touchStartX === null) {
        return;
      }

      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchEndX - touchStartX;

      touchStartX = null;

      if (Math.abs(distance) < SWIPE_THRESHOLD) {
        return;
      }

      goTo(distance < 0 ? activeIndex + 1 : activeIndex - 1);
    },
    { passive: true },
  );

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleRefresh);

    observer.observe(track);
    items.forEach((item) => observer.observe(item));
  } else {
    window.addEventListener('resize', scheduleRefresh, { passive: true });
  }

  slider.classList.add(READY_CLASS);
  slider.setAttribute('aria-roledescription', 'carousel');
  clearPreviousMotionStyles(track, items);
  positions = getScrollPositions(track, items);
  goTo(0, { animate: false, force: true });
};

export const initTestimonialsSlider = () => {
  document.querySelectorAll(SLIDER_SELECTOR).forEach(initSlider);
};
