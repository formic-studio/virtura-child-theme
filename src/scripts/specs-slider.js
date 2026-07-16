import { loadGsap } from './motion.js';

const SLIDER_SELECTOR = '.specs-slider';
const TRACK_SELECTOR = '.specs-wrapper';
const ITEM_CLASS = 'spec-slider-item';
const CONTROLS_SELECTOR = '.slider-paggination';
const CONTROL_SELECTOR = '.svg-arrow-block';
const READY_CLASS = 'virtura-specs-slider-ready';
const OVERFLOW_CLASS = 'has-overflow';
const DISABLED_CLASS = 'is-disabled';
const PREV_LABEL = 'Poprzednie pakiety';
const NEXT_LABEL = 'Następne pakiety';
const ANIMATION_DURATION = 0.72;
const ANIMATION_EASE = 'power3.out';
const SCROLL_EPSILON = 2;
const SWIPE_THRESHOLD = 40;

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

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

const clampIndex = (index, length) =>
  Math.min(Math.max(index, 0), Math.max(0, length - 1));

const getItemsPerView = () => {
  if (window.matchMedia('(max-width: 767px)').matches) {
    return 1;
  }

  if (window.matchMedia('(max-width: 991px)').matches) {
    return 2;
  }

  return 4;
};

const getTrackGap = (track) => {
  const styles = getComputedStyle(track);
  const gap = Number.parseFloat(styles.columnGap || styles.gap);

  return Number.isFinite(gap) ? gap : 0;
};

const setItemWidth = (track, items) => {
  const trackWidth = track.clientWidth;

  if (trackWidth <= 0 || !items.length) {
    return false;
  }

  const visibleItems = Math.min(items.length, getItemsPerView());
  const gap = getTrackGap(track);
  const itemWidth = Math.max(
    0,
    (trackWidth - gap * Math.max(0, visibleItems - 1)) / visibleItems,
  );
  const nextValue = `${itemWidth.toFixed(3)}px`;

  if (track.style.getPropertyValue('--virtura-spec-item-width') !== nextValue) {
    track.style.setProperty('--virtura-spec-item-width', nextValue);
  }

  return true;
};

const getMaxScroll = (track) =>
  Math.max(0, track.scrollWidth - track.clientWidth);

const getItemOffset = (track, item) => {
  const trackRect = track.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();

  return itemRect.left - trackRect.left + track.scrollLeft;
};

const getScrollPositions = (track, items) => {
  const maxScroll = getMaxScroll(track);
  const positions = items
    .map((item) => Math.min(getItemOffset(track, item), maxScroll))
    .filter(
      (position, index, allPositions) =>
        index === 0 ||
        Math.abs(position - allPositions[index - 1]) > SCROLL_EPSILON,
    );

  return positions.length ? positions : [0];
};

const setControlState = (control, isDisabled) => {
  control.classList.toggle(DISABLED_CLASS, isDisabled);
  control.setAttribute('aria-disabled', String(isDisabled));
  control.setAttribute('tabindex', isDisabled ? '-1' : '0');
};

const setupControl = (control, label, onActivate) => {
  const icon = control.querySelector('svg');

  control.setAttribute('aria-label', label);
  control.setAttribute('role', 'button');
  control.setAttribute('tabindex', '0');

  if (icon instanceof SVGElement) {
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
  }

  control.addEventListener('click', () => {
    if (control.getAttribute('aria-disabled') !== 'true') {
      onActivate();
    }
  });

  control.addEventListener('keydown', (event) => {
    if (
      control.getAttribute('aria-disabled') === 'true' ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return;
    }

    event.preventDefault();
    onActivate();
  });
};

const initSlider = (slider) => {
  if (!(slider instanceof HTMLElement) || slider.classList.contains(READY_CLASS)) {
    return;
  }

  const track = slider.querySelector(TRACK_SELECTOR);
  const controlsContainer = slider.querySelector(CONTROLS_SELECTOR);
  const items = track
    ? Array.from(track.children).filter(
        (child) => child instanceof HTMLElement && child.classList.contains(ITEM_CLASS),
      )
    : [];
  const controls = controlsContainer
    ? Array.from(controlsContainer.querySelectorAll(CONTROL_SELECTOR)).filter(
        (control) => control instanceof HTMLElement,
      )
    : [];

  if (
    !(track instanceof HTMLElement) ||
    !(controlsContainer instanceof HTMLElement) ||
    !items.length ||
    controls.length < 2
  ) {
    return;
  }

  let activeIndex = 0;
  let hasOverflow = false;
  let positions = [0];
  let resizeFrame = null;
  let scrollFrame = null;
  let touchStartX = null;
  let touchStartY = null;

  const syncControls = () => {
    const lastIndex = positions.length - 1;

    setControlState(controls[0], !hasOverflow || activeIndex <= 0);
    setControlState(
      controls[1],
      !hasOverflow || activeIndex >= lastIndex,
    );
  };

  const setOverflowState = (nextHasOverflow) => {
    hasOverflow = nextHasOverflow;
    slider.classList.toggle(OVERFLOW_CLASS, hasOverflow);
    controlsContainer.hidden = !hasOverflow;
    controlsContainer.setAttribute('aria-hidden', String(!hasOverflow));
  };

  const setActiveIndexFromScroll = () => {
    scrollFrame = null;

    if (!hasOverflow) {
      return;
    }

    const currentScroll = track.scrollLeft;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    positions.forEach((position, index) => {
      const distance = Math.abs(position - currentScroll);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex !== activeIndex) {
      activeIndex = nearestIndex;
      slider.dataset.activeSlide = String(activeIndex + 1);
      syncControls();
    }
  };

  const scheduleScrollSync = () => {
    if (scrollFrame !== null) {
      return;
    }

    scrollFrame = window.requestAnimationFrame(setActiveIndexFromScroll);
  };

  const refreshLayout = () => {
    resizeFrame = null;
    gsapApi?.killTweensOf(track);

    if (!setItemWidth(track, items)) {
      setOverflowState(false);
      syncControls();
      return;
    }

    positions = getScrollPositions(track, items);
    setOverflowState(
      getMaxScroll(track) > SCROLL_EPSILON && positions.length > 1,
    );

    if (!hasOverflow) {
      activeIndex = 0;
      track.scrollLeft = 0;
    } else {
      activeIndex = clampIndex(activeIndex, positions.length);
      track.scrollLeft = positions[activeIndex] || 0;
    }

    slider.dataset.activeSlide = String(activeIndex + 1);
    syncControls();
  };

  const scheduleRefresh = () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(refreshLayout);
  };

  const scrollToPosition = (position) => {
    gsapApi?.killTweensOf(track);

    if (reducedMotionMedia.matches) {
      track.scrollLeft = position;
      return;
    }

    void getGsap()
      .then((gsap) => {
        gsap.killTweensOf(track);
        gsap.to(track, {
          duration: ANIMATION_DURATION,
          ease: ANIMATION_EASE,
          overwrite: 'auto',
          scrollLeft: position,
        });
      })
      .catch(() => {
        track.scrollTo({ left: position, behavior: 'smooth' });
      });
  };

  const goTo = (nextIndex) => {
    if (!hasOverflow) {
      return;
    }

    const clampedIndex = clampIndex(nextIndex, positions.length);

    if (clampedIndex === activeIndex) {
      return;
    }

    activeIndex = clampedIndex;
    slider.dataset.activeSlide = String(activeIndex + 1);
    syncControls();
    scrollToPosition(positions[activeIndex] || 0);
  };

  setupControl(controls[0], PREV_LABEL, () => goTo(activeIndex - 1));
  setupControl(controls[1], NEXT_LABEL, () => goTo(activeIndex + 1));

  track.addEventListener('scroll', scheduleScrollSync, { passive: true });
  track.addEventListener(
    'touchstart',
    (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
      touchStartY = event.touches[0]?.clientY ?? null;
    },
    { passive: true },
  );
  track.addEventListener(
    'touchend',
    (event) => {
      if (touchStartX === null || touchStartY === null) {
        return;
      }

      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
      const distanceX = touchEndX - touchStartX;
      const distanceY = touchEndY - touchStartY;

      touchStartX = null;
      touchStartY = null;

      if (
        Math.abs(distanceX) < SWIPE_THRESHOLD ||
        Math.abs(distanceX) <= Math.abs(distanceY)
      ) {
        return;
      }

      goTo(distanceX < 0 ? activeIndex + 1 : activeIndex - 1);
    },
    { passive: true },
  );

  slider.classList.add(READY_CLASS);
  slider.setAttribute('aria-label', slider.getAttribute('aria-label') || 'Pakiety');
  slider.setAttribute('aria-roledescription', 'carousel');
  slider.setAttribute('role', 'region');

  items.forEach((item, index) => {
    item.setAttribute('aria-label', `Pakiet ${index + 1} z ${items.length}`);
    item.setAttribute('role', 'group');
  });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(scheduleRefresh);

    resizeObserver.observe(track);
  }

  window.addEventListener('resize', scheduleRefresh, { passive: true });
  window.addEventListener('orientationchange', scheduleRefresh, { passive: true });
  document.fonts?.ready?.then(scheduleRefresh).catch(() => {});

  refreshLayout();
};

export const initSpecsSlider = () => {
  document.querySelectorAll(SLIDER_SELECTOR).forEach(initSlider);
};
