const TAB_OPTIONS_SELECTOR = '.tab-options';
const ACTIVE_CLASS = 'is-active';
const READY_CLASS = 'virtura-tabs-ready';

const getOptions = (tabs) =>
  Array.from(tabs.children).filter((child) => child instanceof HTMLElement);

const clampIndex = (index, options) =>
  Math.min(options.length - 1, Math.max(0, index));

const slugify = (value, fallback) => {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || fallback;
};

const getOptionKey = (option, index) => {
  const fallbackKey = slugify(option.textContent || '', `tab-${index + 1}`);
  return option.dataset.tab || option.dataset.tabsOption || fallbackKey;
};

const getInitialIndex = (tabs, options) => {
  const activeIndex = options.findIndex(
    (option) =>
      option.classList.contains(ACTIVE_CLASS) ||
      option.getAttribute('aria-selected') === 'true' ||
      option.dataset.active === 'true',
  );

  if (activeIndex >= 0) {
    return activeIndex;
  }

  const datasetIndex = Number.parseInt(tabs.dataset.activeIndex || '', 10);
  if (Number.isFinite(datasetIndex)) {
    return clampIndex(datasetIndex, options);
  }

  return 0;
};

const getPanels = (tabs) => {
  const wrapper = tabs.closest('.tabs-wrapper') || tabs.parentElement;

  if (!wrapper) {
    return [];
  }

  return Array.from(wrapper.querySelectorAll('[data-tab-panel], [data-tabs-panel]')).filter(
    (panel) => panel instanceof HTMLElement && !tabs.contains(panel),
  );
};

const panelMatches = (panel, key, index) => {
  const panelKey = panel.dataset.tabPanel || panel.dataset.tabsPanel || '';
  return panelKey === key || panelKey === String(index);
};

const updateIndicator = (tabs, option) => {
  const tabsRect = tabs.getBoundingClientRect();
  const optionRect = option.getBoundingClientRect();

  tabs.style.setProperty('--virtura-tabs-indicator-x', `${optionRect.left - tabsRect.left}px`);
  tabs.style.setProperty('--virtura-tabs-indicator-width', `${optionRect.width}px`);
};

const initTabs = (tabs) => {
  if (tabs.classList.contains(READY_CLASS)) {
    return;
  }

  const options = getOptions(tabs);

  if (options.length < 2) {
    return;
  }

  const panels = getPanels(tabs);
  let activeIndex = getInitialIndex(tabs, options);

  tabs.setAttribute('role', 'tablist');

  const setActive = (nextIndex, shouldFocus = false) => {
    activeIndex = clampIndex(nextIndex, options);
    const activeOption = options[activeIndex];
    const activeKey = getOptionKey(activeOption, activeIndex);

    options.forEach((option, index) => {
      const isActive = index === activeIndex;
      const optionKey = getOptionKey(option, index);

      option.classList.toggle(ACTIVE_CLASS, isActive);
      option.setAttribute('aria-selected', String(isActive));
      option.setAttribute('role', 'tab');
      option.setAttribute('tabindex', isActive ? '0' : '-1');
      option.dataset.tabValue = optionKey;
    });

    panels.forEach((panel) => {
      panel.hidden = !panelMatches(panel, activeKey, activeIndex);
    });

    updateIndicator(tabs, activeOption);

    if (shouldFocus) {
      activeOption.focus({ preventScroll: true });
    }

    tabs.dispatchEvent(
      new CustomEvent('virtura:tab-change', {
        bubbles: true,
        detail: {
          index: activeIndex,
          key: activeKey,
          option: activeOption,
        },
      }),
    );
  };

  options.forEach((option, index) => {
    option.addEventListener('click', () => setActive(index));
  });

  tabs.addEventListener('keydown', (event) => {
    const currentIndex = options.indexOf(document.activeElement);

    if (currentIndex < 0) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((currentIndex + 1) % options.length, true);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((currentIndex - 1 + options.length) % options.length, true);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActive(0, true);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActive(options.length - 1, true);
    }
  });

  setActive(activeIndex);
  tabs.classList.add(READY_CLASS);

  const refresh = () => updateIndicator(tabs, options[activeIndex]);

  window.addEventListener('resize', refresh, { passive: true });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(tabs);
    options.forEach((option) => resizeObserver.observe(option));
  }
};

export const initTrainingTabs = () => {
  document.querySelectorAll(TAB_OPTIONS_SELECTOR).forEach(initTabs);
};
