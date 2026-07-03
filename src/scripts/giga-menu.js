const HEADER_SELECTOR = '#brx-header';
const NAV_ROOT_SELECTOR = '.section_nav';
const NAV_WRAPPER_SELECTOR = '.nav-wrapper';
const PANEL_SELECTOR = '.giga-menu, .mega-menu, [data-giga-menu]';
const TRIGGER_SELECTOR =
  '.bricks-nav-menu > .giga-menu-trigger, .bricks-nav-menu > [data-giga-menu-trigger], .bricks-nav-menu > .menu-item-454';
const TRIGGER_CONTROL_SELECTOR =
  ':scope > a, :scope > button, :scope > .brx-submenu-toggle > a, :scope > .brx-submenu-toggle > button';

const NAV_ACTIVE_CLASS = 'header-nav-active';
const ROOT_OPEN_CLASS = 'giga-menu-open';
const PANEL_OPEN_CLASS = 'is-open';
const TRIGGER_OPEN_CLASS = 'is-giga-menu-open';

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

  return Array.from(
    root.querySelectorAll('.bricks-nav-menu > .menu-item-has-children')
  ).find((item) => {
    const label = getTriggerLabel(item);

    return label === 'usługi' || label === 'usługi+';
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

  const activateNav = () => {
    header.classList.add(NAV_ACTIVE_CLASS);
    root.classList.add(NAV_ACTIVE_CLASS);
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

    isOpen = true;
    header.classList.add(ROOT_OPEN_CLASS);
    root.classList.add(ROOT_OPEN_CLASS);
    trigger.classList.add(TRIGGER_OPEN_CLASS);
    panel.classList.add(PANEL_OPEN_CLASS);
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    setExpanded(trigger, true);
  };

  const closeMenu = () => {
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
};

export const initGigaMenu = () => {
  document.querySelectorAll(NAV_ROOT_SELECTOR).forEach(initNavRoot);
};
