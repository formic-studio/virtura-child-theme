import { loadGsap } from './motion.js';

const SLIDER_SELECTOR = '.testimonials-slider';
const TRACK_SELECTOR = '.slider-wrapper';
const ITEM_SELECTOR = '.slider-item';
const CONTROLS_SELECTOR = '.slider-paggination .svg-arrow-block';
const ACTIVE_CLASS = 'is-active';
const DISABLED_CLASS = 'is-disabled';
const READY_CLASS = 'virtura-testimonials-slider-ready';
const GSAP_CLASS = 'virtura-testimonials-slider-gsap';
const PREV_LABEL = 'Poprzednia opinia';
const NEXT_LABEL = 'Nastepna opinia';
const ANIMATION_DURATION = 0.92;
const ANIMATION_EASE = 'power3.out';
const SWIPE_THRESHOLD = 40;

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

const clampIndex = (index, length) => Math.min(Math.max(index, 0), length - 1);

const getItemOffset = (item) => item?.offsetLeft || 0;

const setActiveState = (items, index) => {
  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;

    item.classList.toggle(ACTIVE_CLASS, isActive);
    item.setAttribute('aria-hidden', String(!isActive));
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

const setSlideState = (slider, items, index, { animate = true } = {}) => {
  const offset = getItemOffset(items[index]);
  const targetX = -offset;

  setActiveState(items, index);

  if (!animate || reducedMotionMedia.matches) {
    items.forEach((item) => {
      item.style.transform = `translate3d(${targetX}px, 0, 0)`;
    });

    return;
  }

  void loadGsap()
    .then(({ gsap }) => {
      slider.classList.add(GSAP_CLASS);
      gsap.killTweensOf(items);
      gsap.to(items, {
        duration: ANIMATION_DURATION,
        ease: ANIMATION_EASE,
        force3D: true,
        overwrite: 'auto',
        x: targetX,
      });
    })
    .catch(() => {
      items.forEach((item) => {
        item.style.transform = `translate3d(${targetX}px, 0, 0)`;
      });
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

  const goTo = (nextIndex, options) => {
    const clampedIndex = clampIndex(nextIndex, items.length);

    if (clampedIndex === activeIndex && options?.force !== true) {
      return;
    }

    activeIndex = clampedIndex;
    setSlideState(slider, items, activeIndex, options);
    updateControls(controls, activeIndex, items.length);
    slider.dataset.activeSlide = String(activeIndex + 1);
  };

  const refreshPosition = () => {
    resizeFrame = null;
    setSlideState(slider, items, activeIndex, { animate: false, force: true });
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
    if (activeIndex < items.length - 1) {
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
  goTo(0, { animate: false, force: true });
};

export const initTestimonialsSlider = () => {
  document.querySelectorAll(SLIDER_SELECTOR).forEach(initSlider);
};
