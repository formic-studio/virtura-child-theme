const HEADER_SELECTOR = '#brx-header';
const DEFAULT_HIDE_OFFSET = 360;
const SCROLL_DELTA = 6;

const getHideOffset = (header) => {
  const value = Number.parseFloat(header.getAttribute('data-header-hide-offset'));

  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_HIDE_OFFSET;
};

export const initHeaderScroll = () => {
  const header = document.querySelector(HEADER_SELECTOR);

  if (!header) {
    return;
  }

  const hideOffset = getHideOffset(header);
  let previousY = window.scrollY;
  let frame = null;

  header.classList.add('header-scroll-ready');

  const showHeader = () => {
    header.classList.remove('header-scroll-hidden');
  };

  const hideHeader = () => {
    header.classList.add('header-scroll-hidden');
  };

  const updateHeader = () => {
    frame = null;

    const currentY = Math.max(0, window.scrollY);
    const delta = currentY - previousY;
    const shouldKeepVisible =
      currentY <= hideOffset ||
      header.classList.contains('giga-menu-open') ||
      header.classList.contains('header-nav-active');

    if (shouldKeepVisible) {
      showHeader();
      previousY = currentY;
      return;
    }

    if (Math.abs(delta) < SCROLL_DELTA) {
      return;
    }

    if (delta > SCROLL_DELTA) {
      hideHeader();
    } else {
      showHeader();
    }

    previousY = currentY;
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

  scheduleUpdate();
};
