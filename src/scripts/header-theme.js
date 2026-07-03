const HEADER_SELECTOR = '#brx-header';
const NAV_THEME_SELECTOR =
  '.nav-light, .nav-dark, [data-nav-theme], [data-header-theme]';

const normalizeTheme = (value) => {
  const theme = value?.toLowerCase();

  if (theme === 'light' || theme === 'white') {
    return 'light';
  }

  if (theme === 'dark' || theme === 'black') {
    return 'dark';
  }

  return null;
};

const getElementTheme = (element) => {
  const attributeTheme =
    normalizeTheme(element.getAttribute('data-nav-theme')) ||
    normalizeTheme(element.getAttribute('data-header-theme'));

  if (attributeTheme) {
    return attributeTheme;
  }

  if (element.classList.contains('nav-light')) {
    return 'light';
  }

  if (element.classList.contains('nav-dark')) {
    return 'dark';
  }

  return null;
};

const getThemeZone = (element, header) => {
  if (!(element instanceof Element) || header.contains(element)) {
    return null;
  }

  const zone = element.closest(NAV_THEME_SELECTOR);

  return zone && !header.contains(zone) ? zone : null;
};

const getHeaderSamplePoint = (header) => {
  const rect = header.getBoundingClientRect();
  const x = Math.min(
    window.innerWidth - 1,
    Math.max(0, rect.left + rect.width / 2)
  );
  const y = Math.min(
    window.innerHeight - 1,
    Math.max(0, rect.top + rect.height / 2)
  );

  return { x, y };
};

const getThemeFromPoint = (header) => {
  if (!document.elementsFromPoint) {
    return null;
  }

  const { x, y } = getHeaderSamplePoint(header);
  const elements = document.elementsFromPoint(x, y);

  for (const element of elements) {
    const zone = getThemeZone(element, header);
    const theme = zone ? getElementTheme(zone) : null;

    if (theme) {
      return theme;
    }
  }

  return null;
};

const getThemeFromSectionBounds = (header) => {
  const { y } = getHeaderSamplePoint(header);
  const zones = Array.from(document.querySelectorAll(NAV_THEME_SELECTOR));
  let previousTheme = null;

  for (const zone of zones) {
    if (header.contains(zone)) {
      continue;
    }

    const theme = getElementTheme(zone);
    const rect = zone.getBoundingClientRect();

    if (!theme) {
      continue;
    }

    if (rect.top <= y && rect.bottom > y) {
      return theme;
    }

    if (rect.top <= y) {
      previousTheme = theme;
    }
  }

  return previousTheme;
};

const applyHeaderTheme = (header, theme) => {
  if (!theme || header.dataset.navThemeCurrent === theme) {
    return;
  }

  header.dataset.navThemeCurrent = theme;
  header.classList.toggle('header-theme-light', theme === 'light');
  header.classList.toggle('header-theme-dark', theme === 'dark');
};

export const initHeaderTheme = () => {
  const header = document.querySelector(HEADER_SELECTOR);

  if (!header) {
    return;
  }

  const defaultTheme =
    normalizeTheme(header.getAttribute('data-nav-theme-default')) ||
    (header.classList.contains('header-theme-light') ? 'light' : 'dark');
  let frame = null;

  const updateTheme = () => {
    frame = null;

    const theme =
      getThemeFromPoint(header) ||
      getThemeFromSectionBounds(header) ||
      defaultTheme;

    applyHeaderTheme(header, theme);
  };

  const scheduleUpdate = () => {
    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(updateTheme);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  scheduleUpdate();
};
