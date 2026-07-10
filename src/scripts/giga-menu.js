const HEADER_SELECTOR = '#brx-header';
const NAV_ROOT_SELECTOR = '.section_nav';
const NAV_WRAPPER_SELECTOR = '.nav-wrapper';
const PANEL_SELECTOR = '.giga-menu, .mega-menu, [data-giga-menu]';
const ITEMS_TARGET_SELECTOR =
  '.giga-menu-items, .mega-menu-items, [data-giga-menu-items]';
const TRIGGER_SELECTOR =
  '.bricks-nav-menu > .giga-menu-trigger, .bricks-nav-menu > [data-giga-menu-trigger], .bricks-nav-menu > .menu-item-454';
const TRIGGER_CONTROL_SELECTOR =
  ':scope > a, :scope > button, :scope > .brx-submenu-toggle > a, :scope > .brx-submenu-toggle > button';

const BUILDER_OPEN_CLASS = 'giga-menu-builder-open';
const NAV_ACTIVE_CLASS = 'header-nav-active';
const ROOT_OPEN_CLASS = 'giga-menu-open';
const PANEL_OPEN_CLASS = 'is-open';
const TRIGGER_OPEN_CLASS = 'is-giga-menu-open';
const ITEMS_WIDTH_PROPERTY = '--giga-menu-items-width';
const MOBILE_BREAKPOINT_QUERY = '(max-width: 991px)';
const MOBILE_NAV_SELECTOR = '.brxe-nav-menu';
const MOBILE_MENU_WRAPPER_SELECTOR = '.bricks-mobile-menu-wrapper';
const MOBILE_MENU_CLASS = 'virtura-mobile-giga-menu';
const MOBILE_BACKDROP_CLASS = 'virtura-mobile-menu-backdrop';
const MOBILE_OPEN_CLASS = 'mobile-giga-menu-open';
const MOBILE_PANEL_OPEN_CLASS = 'mobile-giga-menu-panel-open';
const MOBILE_MENU_MAX_HEIGHT_PROPERTY = '--virtura-mobile-menu-max-height';
const MOBILE_MENU_MIN_HEIGHT = 160;
const MOBILE_HEADER_REVEAL_DURATION = 320;
const MOBILE_PANEL_HIDE_DURATION = 460;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MOBILE_CATEGORY_ORDER = ['detailing', 'design', 'selection', 'tuning'];

let mobileMenuInstanceCount = 0;

const getNumber = (value) => {
  const number = Number.parseFloat(value);

  return Number.isFinite(number) ? number : 0;
};

const getTriggerControl = (trigger) =>
  trigger.querySelector(TRIGGER_CONTROL_SELECTOR) || trigger;

const alignItemsTarget = (panel, trigger) => {
  const target = panel.querySelector(ITEMS_TARGET_SELECTOR);

  if (!target) {
    return;
  }

  target.style.removeProperty(ITEMS_WIDTH_PROPERTY);

  const panelRect = panel.getBoundingClientRect();
  const triggerRect = getTriggerControl(trigger).getBoundingClientRect();

  if (!panelRect.width || !triggerRect.width) {
    return;
  }

  const panelStyle = window.getComputedStyle(panel);
  const contentRight = panelRect.right - getNumber(panelStyle.paddingRight);
  const contentLeft = panelRect.left + getNumber(panelStyle.paddingLeft);
  const targetLeft = Math.max(contentLeft, Math.min(triggerRect.left, contentRight));
  const targetWidth = Math.max(0, contentRight - targetLeft);

  if (targetWidth > 0) {
    target.style.setProperty(ITEMS_WIDTH_PROPERTY, `${targetWidth}px`);
  }
};

const setExpanded = (trigger, isExpanded) => {
  trigger
    .querySelectorAll(':scope > .brx-submenu-toggle > button, :scope > button')
    .forEach((button) => {
      button.setAttribute('aria-expanded', String(isExpanded));
    });
};

const preventPlaceholderClick = (event, trigger) => {
  const control = event.target.closest('a, button');

  if (!control || !trigger.contains(control)) {
    return;
  }

  if (control.matches('button, a[href="#"], a[data-brx-anchor="true"]')) {
    event.preventDefault();
  }
};

const getTriggerLabel = (trigger) =>
  trigger
    .querySelector(':scope > a, :scope > .brx-submenu-toggle > a')
    ?.textContent.trim()
    .toLowerCase();

const getTrigger = (root) => {
  const explicitTrigger = root.querySelector(TRIGGER_SELECTOR);

  if (explicitTrigger) {
    return explicitTrigger;
  }

  const dropdownItems = Array.from(
    root.querySelectorAll('.bricks-nav-menu > .menu-item-has-children')
  );
  const servicesItem = dropdownItems.find((item) => {
    const label = getTriggerLabel(item);

    return label === 'usługi' || label === 'usługi+';
  });

  return servicesItem || (dropdownItems.length === 1 ? dropdownItems[0] : null);
};

const getDirectSubmenuItems = (item) =>
  Array.from(item.querySelectorAll(':scope > .sub-menu > .menu-item'));

const getDirectLink = (item) =>
  item.querySelector(':scope > a, :scope > .brx-submenu-toggle > a');

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();

const getMobileCategoryLabel = (sourceLink) =>
  normalizeText(sourceLink?.textContent || '').replace(/^VC\s+/i, '');

const getMobileCategorySortIndex = (item) => {
  const link = getDirectLink(item);
  const label = getMobileCategoryLabel(link).toLowerCase();
  const index = MOBILE_CATEGORY_ORDER.indexOf(label);

  return index === -1 ? MOBILE_CATEGORY_ORDER.length : index;
};

const getMobileServiceItems = (trigger) =>
  getDirectSubmenuItems(trigger)
    .map((item, index) => ({ index, item }))
    .sort((first, second) => {
      const firstOrder = getMobileCategorySortIndex(first.item);
      const secondOrder = getMobileCategorySortIndex(second.item);

      return firstOrder === secondOrder
        ? first.index - second.index
        : firstOrder - secondOrder;
    })
    .map(({ item }) => item);

const getMobileTopLevelItems = (root, trigger) =>
  Array.from(root.querySelectorAll('.bricks-nav-menu > .menu-item')).filter(
    (item) => item !== trigger && getDirectLink(item)?.href
  );

const createLink = (sourceLink, className) => {
  const link = document.createElement('a');

  link.className = className;
  link.href = sourceLink.href;
  link.textContent = sourceLink.textContent.trim();

  if (sourceLink.target) {
    link.target = sourceLink.target;
  }

  if (sourceLink.rel) {
    link.rel = sourceLink.rel;
  }

  if (sourceLink.getAttribute('aria-current')) {
    link.setAttribute('aria-current', sourceLink.getAttribute('aria-current'));
  }

  return link;
};

const setPanelHeight = (panel, height) => {
  panel.style.height =
    typeof height === 'number' ? `${Math.max(0, height)}px` : height;
};

const setMobileAccordionOpen = (item, isOpen, { immediate = false } = {}) => {
  if (!item.button || !item.panel) {
    return;
  }

  window.clearTimeout(item.closeTimer);
  item.button.setAttribute('aria-expanded', String(isOpen));

  if (immediate) {
    item.element.classList.toggle('is-open', isOpen);
    item.panel.hidden = !isOpen;
    setPanelHeight(item.panel, isOpen ? 'auto' : 0);
    return;
  }

  if (isOpen) {
    item.panel.hidden = false;
    item.element.classList.add('is-open');
    setPanelHeight(item.panel, 0);

    window.requestAnimationFrame(() => {
      setPanelHeight(item.panel, item.panel.scrollHeight);
    });

    const finishOpen = (event) => {
      if (event.target !== item.panel || event.propertyName !== 'height') {
        return;
      }

      item.panel.removeEventListener('transitionend', finishOpen);

      if (item.button?.getAttribute('aria-expanded') === 'true') {
        setPanelHeight(item.panel, 'auto');
      }
    };

    item.panel.addEventListener('transitionend', finishOpen);

    return;
  }

  if (item.panel.hidden) {
    item.element.classList.remove('is-open');
    setPanelHeight(item.panel, 0);
    return;
  }

  setPanelHeight(
    item.panel,
    item.panel.getBoundingClientRect().height || item.panel.scrollHeight
  );
  item.panel.offsetHeight;
  item.element.classList.remove('is-open');

  window.requestAnimationFrame(() => {
    setPanelHeight(item.panel, 0);
  });

  item.closeTimer = window.setTimeout(() => {
    if (item.button?.getAttribute('aria-expanded') !== 'true') {
      item.panel.hidden = true;
    }
  }, 320);
};

const createMobileAccordionItem = (sourceItem, index, instanceId) => {
  const sourceLink = getDirectLink(sourceItem);

  if (!sourceLink) {
    return null;
  }

  const childItems = getDirectSubmenuItems(sourceItem);
  const element = document.createElement('div');
  const categoryLabel = getMobileCategoryLabel(sourceLink);

  element.className = 'virtura-mobile-giga-menu__item';

  if (!childItems.length) {
    element.append(
      createLink(sourceLink, 'virtura-mobile-giga-menu__category-link')
    );

    return {
      button: null,
      closeTimer: 0,
      element,
      panel: null,
    };
  }

  const category = document.createElement('div');
  const link = createLink(sourceLink, 'virtura-mobile-giga-menu__category-link');
  const button = document.createElement('button');
  const icon = document.createElement('span');
  const panel = document.createElement('div');
  const list = document.createElement('ul');
  const buttonId = `virtura-mobile-giga-menu-button-${instanceId}-${index}`;
  const labelId = `virtura-mobile-giga-menu-label-${instanceId}-${index}`;
  const panelId = `virtura-mobile-giga-menu-panel-${instanceId}-${index}`;

  category.className = 'virtura-mobile-giga-menu__category';

  link.id = labelId;
  link.textContent = categoryLabel;

  button.className = 'virtura-mobile-giga-menu__category-toggle';
  button.id = buttonId;
  button.type = 'button';
  button.setAttribute('aria-label', `Pokaż podkategorie: ${categoryLabel}`);
  button.setAttribute('aria-controls', panelId);
  button.setAttribute('aria-expanded', 'false');

  icon.className = 'virtura-mobile-giga-menu__category-icon';
  icon.setAttribute('aria-hidden', 'true');

  button.append(icon);
  category.append(link, button);

  panel.className = 'virtura-mobile-giga-menu__panel';
  panel.hidden = true;
  panel.id = panelId;
  panel.setAttribute('aria-labelledby', labelId);
  panel.setAttribute('role', 'region');

  list.className = 'virtura-mobile-giga-menu__links';

  childItems.forEach((childItem) => {
    const childLink = getDirectLink(childItem);

    if (!childLink) {
      return;
    }

    const listItem = document.createElement('li');

    listItem.className = 'virtura-mobile-giga-menu__link-item';
    listItem.append(createLink(childLink, 'virtura-mobile-giga-menu__link'));
    list.append(listItem);
  });

  panel.append(list);
  element.append(category, panel);

  return {
    button,
    closeTimer: 0,
    element,
    panel,
  };
};

const createMobileLinkItem = (sourceItem) => {
  const sourceLink = getDirectLink(sourceItem);

  if (!sourceLink) {
    return null;
  }

  const element = document.createElement('div');

  element.className = 'virtura-mobile-giga-menu__item';
  element.append(
    createLink(sourceLink, 'virtura-mobile-giga-menu__category-link')
  );

  return {
    button: null,
    closeTimer: 0,
    element,
    panel: null,
  };
};

const sanitizeClonedMenuContent = (element) => {
  element.removeAttribute('id');
  element.removeAttribute('data-script-id');
  element.removeAttribute('data-brx-loop-start');

  element
    .querySelectorAll('[id], [data-script-id], [data-brx-loop-start]')
    .forEach((node) => {
      node.removeAttribute('id');
      node.removeAttribute('data-script-id');
      node.removeAttribute('data-brx-loop-start');
    });

  element.querySelectorAll('.brx-query-trail').forEach((node) => node.remove());

  element.querySelectorAll('video').forEach((video) => {
    video.removeAttribute('autoplay');
    video.preload = 'metadata';
  });
};

const createMobileFeaturedSection = (panel) => {
  const source =
    panel.querySelector(':scope > .brxe-block:not(.giga-menu-items)') ||
    panel.firstElementChild;

  if (!source) {
    return null;
  }

  const section = document.createElement('div');
  const clone = source.cloneNode(true);

  section.className = 'virtura-mobile-giga-menu__featured';
  clone.classList.add('virtura-mobile-giga-menu__featured-content');
  sanitizeClonedMenuContent(clone);
  section.append(clone);

  return section;
};

const findMenuUrlByLabel = (root, label) => {
  const normalizedLabel = label.toLowerCase();
  const links = Array.from(
    root.querySelectorAll('.bricks-nav-menu a[href], .bricks-mobile-menu a[href]')
  );
  const match = links.find(
    (link) => normalizeText(link.textContent).toLowerCase() === normalizedLabel
  );

  return match?.href || '';
};

const createMobileCta = (root) => {
  const source = root.querySelector('.nav-btn, .nav-cta');
  const sourceLink =
    source?.matches('a[href]') ? source : source?.querySelector('a[href]');
  const label = normalizeText(source?.textContent || '');

  if (!label) {
    return null;
  }

  const link = document.createElement('a');

  link.className = 'virtura-mobile-giga-menu__cta';
  link.href = sourceLink?.href || findMenuUrlByLabel(root, 'kontakt') || '#';
  link.textContent = label;

  return link;
};

const getMobileBackdrop = () => {
  const existingBackdrop = document.querySelector(`.${MOBILE_BACKDROP_CLASS}`);

  if (existingBackdrop) {
    return existingBackdrop;
  }

  const backdrop = document.createElement('div');

  backdrop.className = MOBILE_BACKDROP_CLASS;
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);

  return backdrop;
};

const syncMobileMenuBounds = (wrapper, mediaQuery) => {
  if (!mediaQuery.matches) {
    wrapper.style.removeProperty(MOBILE_MENU_MAX_HEIGHT_PROPERTY);
    return;
  }

  const viewport = window.visualViewport;
  const viewportHeight =
    viewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight;
  const viewportTop = viewport?.offsetTop || 0;
  const wrapperRect = wrapper.getBoundingClientRect();
  const wrapperStyle = window.getComputedStyle(wrapper);
  const bottomGap = Math.max(
    getNumber(wrapperStyle.paddingBottom),
    getNumber(wrapperStyle.borderBottomLeftRadius),
    24
  );
  const availableHeight =
    viewportTop + viewportHeight - wrapperRect.top - bottomGap;
  const maxHeight = Math.max(MOBILE_MENU_MIN_HEIGHT, availableHeight);

  wrapper.style.setProperty(
    MOBILE_MENU_MAX_HEIGHT_PROPERTY,
    `${Math.floor(maxHeight)}px`
  );
};

const initMobileGigaMenu = (root, header, panel, trigger) => {
  const navMenu = root.querySelector(MOBILE_NAV_SELECTOR);
  const wrapper = navMenu?.querySelector(MOBILE_MENU_WRAPPER_SELECTOR);

  if (!navMenu || !wrapper || !trigger || navMenu.dataset.virturaMobileGigaMenu) {
    return;
  }

  const serviceItems = getMobileServiceItems(trigger);
  const topLevelItems = getMobileTopLevelItems(root, trigger);

  if (!serviceItems.length && !topLevelItems.length) {
    return;
  }

  mobileMenuInstanceCount += 1;

  const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
  const backdrop = getMobileBackdrop();
  const menu = document.createElement('div');
  const list = document.createElement('div');
  const entries = [];

  menu.className = MOBILE_MENU_CLASS;
  list.className = 'virtura-mobile-giga-menu__list';

  serviceItems.forEach((item, index) => {
    const entry = createMobileAccordionItem(
      item,
      index,
      mobileMenuInstanceCount
    );

    if (!entry) {
      return;
    }

    entries.push(entry);
    list.append(entry.element);
  });

  topLevelItems.forEach((item) => {
    const entry = createMobileLinkItem(item);

    if (!entry) {
      return;
    }

    entries.push(entry);
    list.append(entry.element);
  });

  entries.forEach((entry) => {
    if (!entry.button) {
      return;
    }

    entry.button.addEventListener('click', () => {
      const shouldOpen = entry.button.getAttribute('aria-expanded') !== 'true';

      entries.forEach((otherEntry) =>
        setMobileAccordionOpen(otherEntry, false)
      );
      setMobileAccordionOpen(entry, shouldOpen);
    });
  });

  menu.append(list);

  const featuredSection = createMobileFeaturedSection(panel);
  const cta = createMobileCta(root);

  if (featuredSection) {
    menu.append(featuredSection);
  }

  if (cta) {
    menu.append(cta);
  }

  wrapper.append(menu);
  navMenu.dataset.virturaMobileGigaMenu = 'true';

  let boundsFrame = null;
  let chromeCloseTimer = null;
  let panelOpenTimer = null;
  let mobileMenuOpen = null;
  const reducedMotionMedia = window.matchMedia(REDUCED_MOTION_QUERY);
  const scheduleMobileMenuBounds = () => {
    if (boundsFrame !== null) {
      window.cancelAnimationFrame(boundsFrame);
    }

    boundsFrame = window.requestAnimationFrame(() => {
      boundsFrame = null;
      syncMobileMenuBounds(wrapper, mediaQuery);
    });
  };
  const syncState = () => {
    const shouldOpen =
      mediaQuery.matches && navMenu.classList.contains('show-mobile-menu');

    if (shouldOpen !== mobileMenuOpen) {
      mobileMenuOpen = shouldOpen;

      if (panelOpenTimer !== null) {
        window.clearTimeout(panelOpenTimer);
        panelOpenTimer = null;
      }

      if (chromeCloseTimer !== null) {
        window.clearTimeout(chromeCloseTimer);
        chromeCloseTimer = null;
      }

      if (shouldOpen) {
        const chromeAlreadyOpen = header.classList.contains(MOBILE_OPEN_CLASS);
        const revealDelay =
          reducedMotionMedia.matches || chromeAlreadyOpen
            ? 0
            : MOBILE_HEADER_REVEAL_DURATION;

        header.classList.add(MOBILE_OPEN_CLASS);
        root.classList.add(MOBILE_OPEN_CLASS);
        backdrop.classList.add('is-open');

        panelOpenTimer = window.setTimeout(() => {
          panelOpenTimer = null;

          if (
            mediaQuery.matches &&
            navMenu.classList.contains('show-mobile-menu')
          ) {
            header.classList.add(MOBILE_PANEL_OPEN_CLASS);
            root.classList.add(MOBILE_PANEL_OPEN_CLASS);
          }
        }, revealDelay);
      } else {
        const hideDuration = reducedMotionMedia.matches
          ? 0
          : MOBILE_PANEL_HIDE_DURATION;

        header.classList.remove(MOBILE_PANEL_OPEN_CLASS, NAV_ACTIVE_CLASS);
        root.classList.remove(MOBILE_PANEL_OPEN_CLASS, NAV_ACTIVE_CLASS);
        backdrop.classList.remove('is-open');

        if (
          document.activeElement instanceof HTMLElement &&
          navMenu.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }

        chromeCloseTimer = window.setTimeout(() => {
          chromeCloseTimer = null;

          if (
            !mediaQuery.matches ||
            !navMenu.classList.contains('show-mobile-menu')
          ) {
            header.classList.remove(MOBILE_OPEN_CLASS);
            root.classList.remove(MOBILE_OPEN_CLASS);
            entries.forEach((entry) =>
              setMobileAccordionOpen(entry, false, { immediate: true })
            );
          }
        }, hideDuration);
      }
    }

    scheduleMobileMenuBounds();
  };
  const classObserver = new MutationObserver(syncState);

  classObserver.observe(navMenu, {
    attributeFilter: ['class'],
    attributes: true,
  });

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', syncState);
  } else {
    mediaQuery.addListener(syncState);
  }

  window.addEventListener('resize', syncState, { passive: true });
  window.addEventListener('orientationchange', syncState, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncState, {
      passive: true,
    });
    window.visualViewport.addEventListener('scroll', syncState, {
      passive: true,
    });
  }

  navMenu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !navMenu.classList.contains('show-mobile-menu')) {
      return;
    }

    const toggle = navMenu.querySelector('.bricks-mobile-menu-toggle');

    toggle?.click();
    toggle?.focus();
  });

  syncState();
};

const renderGigaMenuItems = (panel, trigger) => {
  const target = panel.querySelector(ITEMS_TARGET_SELECTOR);

  if (!target) {
    return;
  }

  const topLevelItems = getDirectSubmenuItems(trigger);

  target.replaceChildren();

  topLevelItems.forEach((item) => {
    const link = getDirectLink(item);

    if (!link) {
      return;
    }

    const column = document.createElement('div');
    const childItems = getDirectSubmenuItems(item);

    column.className = 'giga-menu-column';
    column.append(createLink(link, 'giga-menu-heading'));

    if (childItems.length) {
      const list = document.createElement('ul');

      list.className = 'giga-menu-list';

      childItems.forEach((childItem) => {
        const childLink = getDirectLink(childItem);

        if (!childLink) {
          return;
        }

        const listItem = document.createElement('li');

        listItem.className = 'giga-menu-list-item';
        listItem.append(createLink(childLink, 'giga-menu-link'));
        list.append(listItem);
      });

      column.append(list);
    }

    target.append(column);
  });
};

const initNavRoot = (root) => {
  const header =
    root.closest(HEADER_SELECTOR) || document.querySelector(HEADER_SELECTOR);
  const navWrapper = root.querySelector(NAV_WRAPPER_SELECTOR);
  const panel = root.querySelector(PANEL_SELECTOR);
  const trigger = getTrigger(root);

  if (!header || !navWrapper) {
    return;
  }

  let isOpen = false;
  let isBuilderForcedOpen = root.classList.contains(BUILDER_OPEN_CLASS);
  let alignFrame = null;

  const scheduleItemsAlignment = () => {
    if (!panel || !trigger || !isOpen) {
      return;
    }

    if (alignFrame !== null) {
      window.cancelAnimationFrame(alignFrame);
    }

    alignFrame = window.requestAnimationFrame(() => {
      alignFrame = null;
      alignItemsTarget(panel, trigger);
    });
  };

  const activateNav = () => {
    header.classList.add(NAV_ACTIVE_CLASS);
    root.classList.add(NAV_ACTIVE_CLASS);
  };

  const setOpenState = () => {
    if (!panel || !trigger) {
      return;
    }

    isOpen = true;
    header.classList.add(ROOT_OPEN_CLASS);
    root.classList.add(ROOT_OPEN_CLASS);
    trigger.classList.add(TRIGGER_OPEN_CLASS);
    panel.classList.add(PANEL_OPEN_CLASS);
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    setExpanded(trigger, true);
    alignItemsTarget(panel, trigger);
    scheduleItemsAlignment();
  };

  const releaseNav = () => {
    header.classList.remove(NAV_ACTIVE_CLASS);
    root.classList.remove(NAV_ACTIVE_CLASS);
  };

  const openMenu = () => {
    activateNav();

    if (!panel || !trigger || isOpen) {
      return;
    }

    setOpenState();
  };

  const closeMenu = () => {
    if (root.classList.contains(BUILDER_OPEN_CLASS)) {
      return;
    }

    if (panel && trigger) {
      isOpen = false;
      header.classList.remove(ROOT_OPEN_CLASS);
      root.classList.remove(ROOT_OPEN_CLASS);
      trigger.classList.remove(TRIGGER_OPEN_CLASS);
      panel.classList.remove(PANEL_OPEN_CLASS);
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
      setExpanded(trigger, false);
    }

    releaseNav();
  };

  navWrapper.addEventListener('mouseenter', activateNav);
  navWrapper.addEventListener('focusin', activateNav);
  root.addEventListener('mouseleave', closeMenu);

  root.addEventListener('focusout', () => {
    window.requestAnimationFrame(() => {
      if (!root.contains(document.activeElement)) {
        closeMenu();
      }
    });
  });

  if (!panel || !trigger) {
    return;
  }

  trigger.classList.add('giga-menu-trigger');
  trigger.setAttribute('aria-haspopup', 'true');
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  renderGigaMenuItems(panel, trigger);
  initMobileGigaMenu(root, header, panel, trigger);

  const syncBuilderOpenState = ({ force = false } = {}) => {
    const shouldForceOpen = root.classList.contains(BUILDER_OPEN_CLASS);

    if (!force && shouldForceOpen === isBuilderForcedOpen) {
      return;
    }

    isBuilderForcedOpen = shouldForceOpen;

    if (!shouldForceOpen) {
      closeMenu();
      return;
    }

    activateNav();
    setOpenState();
  };

  const classObserver = new MutationObserver(syncBuilderOpenState);

  classObserver.observe(root, {
    attributeFilter: ['class'],
    attributes: true,
  });

  syncBuilderOpenState({ force: true });

  trigger.addEventListener('mouseenter', openMenu);
  trigger.addEventListener('focusin', openMenu);
  trigger.addEventListener('click', (event) => {
    preventPlaceholderClick(event, trigger);
    openMenu();
  });

  trigger.querySelectorAll(TRIGGER_CONTROL_SELECTOR).forEach((control) => {
    control.addEventListener('click', (event) => {
      preventPlaceholderClick(event, trigger);
      openMenu();
    });
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      trigger.querySelector('a, button')?.focus();
    }
  });

  window.addEventListener('resize', scheduleItemsAlignment, { passive: true });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(scheduleItemsAlignment);

    resizeObserver.observe(navWrapper);
    resizeObserver.observe(panel);
    resizeObserver.observe(trigger);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleItemsAlignment).catch(() => {});
  }
};

export const initGigaMenu = () => {
  document.querySelectorAll(NAV_ROOT_SELECTOR).forEach(initNavRoot);
};
