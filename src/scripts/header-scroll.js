const HEADER_SELECTOR = '#brx-header';
const CONTENT_SECTION_SELECTOR = '#brx-content .brxe-section';
const DEFAULT_HIDE_OFFSET = 360;
const DIRECTION_DELTA = 12;
const HIDE_DISTANCE = 24;
const HERO_IMAGE_SELECTOR = '.hero-img';
const HERO_MOTION_QUERY = '(min-width: 768px)';
const HERO_SECTION_SELECTOR = '.section_hero';
const INTENT_TTL = 2000;
const SHOW_DISTANCE = 28;
const TOUCH_DELTA = 8;
const MOBILE_NAV_QUERY = '(max-width: 991px)';

const DOWN_KEYS = new Set(['ArrowDown', 'End', 'PageDown', 'Space']);
const UP_KEYS = new Set(['ArrowUp', 'Home', 'PageUp']);
const heroMotionMedia = window.matchMedia(HERO_MOTION_QUERY);
const mobileNavMedia = window.matchMedia(MOBILE_NAV_QUERY);

const getConfiguredHideOffset = (header) => {
  const value = Number.parseFloat(header.getAttribute('data-header-hide-offset'));

  return Number.isFinite(value) && value >= 0 ? value : null;
};

const getHeroExitTarget = () => {
  const heroSection = document.querySelector(HERO_SECTION_SELECTOR);

  if (!heroSection?.querySelector(HERO_IMAGE_SELECTOR)) {
    return null;
  }

  const sections = Array.from(document.querySelectorAll(CONTENT_SECTION_SELECTOR));
  const heroIndex = sections.indexOf(heroSection);

  return heroIndex >= 0 ? sections[heroIndex + 1] || null : null;
};

const getHideOffset = (configuredOffset, heroExitTarget) => {
  if (configuredOffset !== null) {
    return configuredOffset;
  }

  if (heroMotionMedia.matches && heroExitTarget?.isConnected) {
    // The GSAP pin spacer changes this position after header initialization.
    const sectionStart =
      heroExitTarget.getBoundingClientRect().top + window.scrollY;

    if (Number.isFinite(sectionStart)) {
      return Math.max(0, sectionStart - HIDE_DISTANCE);
    }
  }

  return DEFAULT_HIDE_OFFSET;
};

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable]'));
};

export const initHeaderScroll = () => {
  const header = document.querySelector(HEADER_SELECTOR);

  if (!header) {
    return;
  }

  const configuredHideOffset = getConfiguredHideOffset(header);
  const heroExitTarget = getHeroExitTarget();
  let previousY = window.scrollY;
  let peakY = previousY;
  let frame = null;
  let isHidden = header.classList.contains('header-scroll-hidden');
  let lastIntent = null;
  let lastIntentAt = 0;
  let touchY = null;

  header.classList.add('header-scroll-ready');

  const setIntent = (direction) => {
    lastIntent = direction;
    lastIntentAt = window.performance.now();
  };

  const showHeader = () => {
    header.classList.remove('header-scroll-hidden');
    isHidden = false;
  };

  const hideHeader = () => {
    header.classList.add('header-scroll-hidden');
    isHidden = true;
  };

  const updateHeader = () => {
    frame = null;

    const currentY = Math.max(0, window.scrollY);
    const hideOffset = getHideOffset(configuredHideOffset, heroExitTarget);
    const now = window.performance.now();
    const delta = currentY - previousY;
    const recentIntent = now - lastIntentAt <= INTENT_TTL ? lastIntent : null;
    const measuredDirection =
      Math.abs(delta) >= DIRECTION_DELTA ? (delta > 0 ? 'down' : 'up') : null;
    const direction = recentIntent || measuredDirection;
    const activeElement = document.activeElement;
    const hasClosedMobileNavFocus =
      mobileNavMedia.matches &&
      activeElement instanceof Element &&
      Boolean(activeElement.closest('#brx-header .brxe-nav-menu')) &&
      !activeElement.closest('#brx-header .brxe-nav-menu.show-mobile-menu');
    const hasHeaderFocus =
      header.contains(activeElement) && !hasClosedMobileNavFocus;
    const hasVisibleNavActivity =
      !isHidden && header.classList.contains('header-nav-active');
    const shouldKeepVisible =
      currentY <= hideOffset ||
      header.classList.contains('giga-menu-open') ||
      hasHeaderFocus ||
      hasVisibleNavActivity;

    if (shouldKeepVisible) {
      showHeader();
      previousY = currentY;
      peakY = currentY;
      return;
    }

    if (isHidden) {
      peakY = Math.max(peakY, currentY);

      if (direction === 'up' && peakY - currentY >= SHOW_DISTANCE) {
        showHeader();
      }
    } else if (direction === 'down' && currentY >= hideOffset + HIDE_DISTANCE) {
      peakY = currentY;
      hideHeader();
    }

    if (recentIntent || measuredDirection) {
      previousY = currentY;
    }
  };

  const scheduleUpdate = () => {
    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(updateHeader);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
  window.addEventListener(
    'wheel',
    (event) => {
      if (Math.abs(event.deltaY) < 1) {
        return;
      }

      setIntent(event.deltaY > 0 ? 'down' : 'up');
    },
    { passive: true }
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        setIntent(event.shiftKey ? 'up' : 'down');
        return;
      }

      if (DOWN_KEYS.has(event.key)) {
        setIntent('down');
      } else if (UP_KEYS.has(event.key)) {
        setIntent('up');
      }
    },
    { passive: true }
  );
  window.addEventListener(
    'touchstart',
    (event) => {
      touchY = event.touches[0]?.clientY ?? null;
    },
    { passive: true }
  );
  window.addEventListener(
    'touchmove',
    (event) => {
      const currentTouchY = event.touches[0]?.clientY;

      if (!Number.isFinite(currentTouchY) || touchY === null) {
        return;
      }

      const touchDelta = touchY - currentTouchY;

      if (Math.abs(touchDelta) >= TOUCH_DELTA) {
        setIntent(touchDelta > 0 ? 'down' : 'up');
        touchY = currentTouchY;
      }
    },
    { passive: true }
  );
  window.addEventListener('touchend', () => {
    touchY = null;
  });

  scheduleUpdate();
};
