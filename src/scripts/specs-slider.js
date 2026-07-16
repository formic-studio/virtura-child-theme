import { loadGsap } from './motion.js';

const SLIDER_SELECTOR = '.specs-slider';
const TRACK_SELECTOR = '.specs-wrapper';
const ITEM_CLASS = 'spec-slider-item';
const CONTROLS_SELECTOR = '.slider-paggination';
const CONTROL_SELECTOR = '.svg-arrow-block';
const READY_CLASS = 'virtura-specs-slider-ready';
const OVERFLOW_CLASS = 'has-overflow';
const DISABLED_CLASS = 'is-disabled';
const SYNCED_HEIGHT_ATTRIBUTE = 'data-virtura-spec-synced-height';
const SYNCED_HEIGHT_PROPERTY = '--virtura-spec-synced-height';
const PREV_LABEL = 'Poprzednie pakiety';
const NEXT_LABEL = 'Następne pakiety';
const ANIMATION_DURATION = 0.72;
const ANIMATION_EASE = 'power3.out';
const OFFSET_EPSILON = 2;
const SWIPE_THRESHOLD = 40;
const WHEEL_LINE_MULTIPLIER = 16;
const WHEEL_GESTURE_COOLDOWN = 520;
const WHEEL_GESTURE_IDLE = 120;
const WHEEL_GESTURE_THRESHOLD = 28;

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
  if (window.matchMedia('(min-width: 1920px)').matches) {
    return 6;
  }

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

const getMaxOffset = (track) =>
  Math.max(0, track.scrollWidth - track.clientWidth);

const getItemOffset = (track, item) => {
  const trackRect = track.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();

  return itemRect.left - trackRect.left;
};

const getTrackPositions = (track, items) => {
  const maxOffset = getMaxOffset(track);
  const positions = items
    .map((item) => Math.min(getItemOffset(track, item), maxOffset))
    .filter(
      (position, index, allPositions) =>
        index === 0 ||
        Math.abs(position - allPositions[index - 1]) > OFFSET_EPSILON,
    );

  return positions.length ? positions : [0];
};

const getHorizontalWheelDelta = (event, pageSize) => {
  if (event.ctrlKey) {
    return 0;
  }

  const hasHorizontalIntent =
    Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const usesShiftWheel =
    event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX);

  if (!hasHorizontalIntent && !usesShiftWheel) {
    return 0;
  }

  const rawDelta = hasHorizontalIntent ? event.deltaX : event.deltaY;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return rawDelta * WHEEL_LINE_MULTIPLIER;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return rawDelta * pageSize;
  }

  return rawDelta;
};

const getItemLayout = (item) => {
  const top = Array.from(item.children).find(
    (child) => child instanceof HTMLElement && child.classList.contains('spec-top'),
  );
  const bottom = Array.from(item.children).find(
    (child) => child instanceof HTMLElement && child.classList.contains('spec-bottom'),
  );

  return {
    rows:
      bottom instanceof HTMLElement
        ? Array.from(bottom.children).filter(
            (child) => child instanceof HTMLElement,
          )
        : [],
    top: top instanceof HTMLElement ? top : null,
  };
};

const clearSyncedHeight = (element) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.removeAttribute(SYNCED_HEIGHT_ATTRIBUTE);
  element.style.removeProperty(SYNCED_HEIGHT_PROPERTY);
};

const setSyncedHeight = (elements) => {
  const validElements = elements.filter(
    (element) => element instanceof HTMLElement,
  );

  if (validElements.length < 2) {
    return;
  }

  const height = Math.ceil(
    Math.max(...validElements.map((element) => element.getBoundingClientRect().height)),
  );

  if (height <= 0) {
    return;
  }

  validElements.forEach((element) => {
    element.style.setProperty(SYNCED_HEIGHT_PROPERTY, `${height}px`);
    element.setAttribute(SYNCED_HEIGHT_ATTRIBUTE, '');
  });
};

const syncItemHeights = (itemLayouts) => {
  itemLayouts.forEach(({ rows, top }) => {
    clearSyncedHeight(top);
    rows.forEach(clearSyncedHeight);
  });

  if (getItemsPerView() <= 1 || itemLayouts.length < 2) {
    return;
  }

  setSyncedHeight(itemLayouts.map(({ top }) => top));

  const rowCount = Math.max(
    0,
    ...itemLayouts.map(({ rows }) => rows.length),
  );

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    setSyncedHeight(itemLayouts.map(({ rows }) => rows[rowIndex]));
  }
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
  const itemLayouts = items.map(getItemLayout);

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
  let touchStartX = null;
  let touchStartY = null;
  let wheelAccumulator = 0;
  let wheelGestureHandled = false;
  let wheelResetTimer = null;

  const resetWheelGesture = () => {
    if (wheelResetTimer !== null) {
      window.clearTimeout(wheelResetTimer);
    }

    wheelAccumulator = 0;
    wheelGestureHandled = false;
    wheelResetTimer = null;
  };

  const scheduleWheelReset = (delay) => {
    if (wheelResetTimer !== null) {
      window.clearTimeout(wheelResetTimer);
    }

    wheelResetTimer = window.setTimeout(resetWheelGesture, delay);
  };

  const setTrackPosition = (position) => {
    const x = Math.max(0, position) * -1;

    if (gsapApi) {
      gsapApi.set(track, { x });
      return;
    }

    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

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

  const refreshLayout = () => {
    resizeFrame = null;
    gsapApi?.killTweensOf(track);

    if (!setItemWidth(track, items)) {
      syncItemHeights(itemLayouts);
      setOverflowState(false);
      syncControls();
      return;
    }

    syncItemHeights(itemLayouts);
    positions = getTrackPositions(track, items);
    setOverflowState(
      getMaxOffset(track) > OFFSET_EPSILON && positions.length > 1,
    );

    if (!hasOverflow) {
      activeIndex = 0;
    } else {
      activeIndex = clampIndex(activeIndex, positions.length);
    }

    setTrackPosition(positions[activeIndex] || 0);

    slider.dataset.activeSlide = String(activeIndex + 1);
    syncControls();
  };

  const scheduleRefresh = () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(refreshLayout);
  };

  const animateToPosition = (position) => {
    gsapApi?.killTweensOf(track);

    if (reducedMotionMedia.matches) {
      setTrackPosition(position);
      return;
    }

    void getGsap()
      .then((gsap) => {
        gsap.killTweensOf(track);
        gsap.to(track, {
          duration: ANIMATION_DURATION,
          ease: ANIMATION_EASE,
          overwrite: 'auto',
          x: Math.max(0, position) * -1,
        });
      })
      .catch(() => {
        setTrackPosition(position);
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
    animateToPosition(positions[activeIndex] || 0);
  };

  setupControl(controls[0], PREV_LABEL, () => goTo(activeIndex - 1));
  setupControl(controls[1], NEXT_LABEL, () => goTo(activeIndex + 1));

  track.addEventListener(
    'wheel',
    (event) => {
      if (!hasOverflow) {
        resetWheelGesture();
        return;
      }

      const delta = getHorizontalWheelDelta(event, track.clientWidth);

      if (!delta) {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          resetWheelGesture();
        }

        return;
      }

      event.preventDefault();

      if (wheelGestureHandled) {
        return;
      }

      if (
        wheelAccumulator !== 0 &&
        Math.sign(delta) !== Math.sign(wheelAccumulator)
      ) {
        wheelAccumulator = 0;
      }

      wheelAccumulator += delta;

      if (Math.abs(wheelAccumulator) < WHEEL_GESTURE_THRESHOLD) {
        scheduleWheelReset(WHEEL_GESTURE_IDLE);
        return;
      }

      wheelGestureHandled = true;
      goTo(activeIndex + (wheelAccumulator > 0 ? 1 : -1));
      wheelAccumulator = 0;
      scheduleWheelReset(WHEEL_GESTURE_COOLDOWN);
    },
    { passive: false },
  );

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
