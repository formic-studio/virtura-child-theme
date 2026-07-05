const SELECT_SELECTOR = '.brxe-filter-select.dropdown';
const READY_CLASS = 'virtura-filter-select-ready';
const NATIVE_CLASS = 'virtura-filter-select-native';
const OPEN_CLASS = 'is-open';

let activeDropdown = null;
let documentListenersReady = false;

const getEnabledOptions = (dropdown) =>
  Array.from(dropdown.querySelectorAll('.virtura-filter-select__option')).filter(
    (option) => option instanceof HTMLButtonElement && !option.disabled,
  );

const closeDropdown = (dropdown, shouldFocus = false) => {
  const button = dropdown.querySelector('.virtura-filter-select__button');

  dropdown.classList.remove(OPEN_CLASS);

  if (button instanceof HTMLButtonElement) {
    button.setAttribute('aria-expanded', 'false');

    if (shouldFocus) {
      button.focus({ preventScroll: true });
    }
  }

  if (activeDropdown === dropdown) {
    activeDropdown = null;
  }
};

const openDropdown = (dropdown, shouldFocusOption = false) => {
  if (activeDropdown && activeDropdown !== dropdown) {
    closeDropdown(activeDropdown);
  }

  const button = dropdown.querySelector('.virtura-filter-select__button');
  const selectedOption =
    dropdown.querySelector('.virtura-filter-select__option[aria-selected="true"]') ||
    getEnabledOptions(dropdown)[0];

  dropdown.classList.add(OPEN_CLASS);
  activeDropdown = dropdown;

  if (button instanceof HTMLButtonElement) {
    button.setAttribute('aria-expanded', 'true');
  }

  if (shouldFocusOption && selectedOption instanceof HTMLButtonElement) {
    selectedOption.focus({ preventScroll: true });
  }
};

const toggleDropdown = (dropdown) => {
  if (dropdown.classList.contains(OPEN_CLASS)) {
    closeDropdown(dropdown);
    return;
  }

  openDropdown(dropdown);
};

const syncDropdown = (select, dropdown) => {
  const label = dropdown.querySelector('.virtura-filter-select__label');
  const selectedOption = select.selectedOptions[0] || select.options[0];
  const value = selectedOption?.value || '';

  if (label instanceof HTMLElement) {
    label.textContent = selectedOption?.textContent?.trim() || '';
  }

  dropdown.dataset.value = value;

  dropdown.querySelectorAll('.virtura-filter-select__option').forEach((option) => {
    if (!(option instanceof HTMLButtonElement)) {
      return;
    }

    option.setAttribute('aria-selected', String(option.dataset.value === value));
  });
};

const dispatchNativeChange = (select) => {
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const selectOption = (select, dropdown, value) => {
  select.value = value;
  dispatchNativeChange(select);
  syncDropdown(select, dropdown);
  closeDropdown(dropdown, true);
};

const focusOption = (options, currentIndex, direction) => {
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  options[nextIndex]?.focus({ preventScroll: true });
};

const handleListKeydown = (event, dropdown) => {
  const options = getEnabledOptions(dropdown);
  const currentIndex = options.indexOf(document.activeElement);

  if (!options.length) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeDropdown(dropdown, true);
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusOption(options, currentIndex, 1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusOption(options, currentIndex, -1);
    return;
  }

  if (event.key === 'Home') {
    event.preventDefault();
    options[0]?.focus({ preventScroll: true });
    return;
  }

  if (event.key === 'End') {
    event.preventDefault();
    options[options.length - 1]?.focus({ preventScroll: true });
  }
};

const buildOptions = (select, dropdown) => {
  const list = dropdown.querySelector('.virtura-filter-select__list');

  if (!(list instanceof HTMLElement)) {
    return;
  }

  list.innerHTML = '';

  Array.from(select.options).forEach((nativeOption) => {
    const option = document.createElement('button');

    option.type = 'button';
    option.className = 'virtura-filter-select__option';
    option.dataset.value = nativeOption.value;
    option.disabled = nativeOption.disabled;
    option.setAttribute('role', 'option');
    option.textContent = nativeOption.textContent.trim();

    option.addEventListener('click', () => {
      if (option.disabled) {
        return;
      }

      selectOption(select, dropdown, nativeOption.value);
    });

    list.append(option);
  });

  syncDropdown(select, dropdown);
};

const createDropdown = (select) => {
  const dropdown = document.createElement('div');
  const button = document.createElement('button');
  const label = document.createElement('span');
  const icon = document.createElement('span');
  const panel = document.createElement('div');
  const list = document.createElement('div');

  dropdown.className = 'virtura-filter-select';
  button.type = 'button';
  button.className = 'virtura-filter-select__button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');

  label.className = 'virtura-filter-select__label';
  icon.className = 'virtura-filter-select__icon';
  icon.setAttribute('aria-hidden', 'true');

  panel.className = 'virtura-filter-select__panel';
  list.className = 'virtura-filter-select__list';
  list.setAttribute('role', 'listbox');

  button.append(label, icon);
  panel.append(list);
  dropdown.append(button, panel);

  button.addEventListener('click', () => toggleDropdown(dropdown));
  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDropdown(dropdown, true);
    }
  });

  list.addEventListener('keydown', (event) => handleListKeydown(event, dropdown));
  select.addEventListener('change', () => syncDropdown(select, dropdown));

  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => buildOptions(select, dropdown));
    observer.observe(select, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  buildOptions(select, dropdown);

  return dropdown;
};

const initSelect = (select) => {
  if (!(select instanceof HTMLSelectElement) || select.classList.contains(READY_CLASS)) {
    return;
  }

  const dropdown = createDropdown(select);

  select.classList.add(READY_CLASS, NATIVE_CLASS);
  select.insertAdjacentElement('afterend', dropdown);
};

const initDocumentListeners = () => {
  if (documentListenersReady) {
    return;
  }

  document.addEventListener('pointerdown', (event) => {
    if (!activeDropdown || activeDropdown.contains(event.target)) {
      return;
    }

    closeDropdown(activeDropdown);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeDropdown) {
      closeDropdown(activeDropdown, true);
    }
  });

  documentListenersReady = true;
};

export const initArchiveFilters = () => {
  document.querySelectorAll(SELECT_SELECTOR).forEach(initSelect);
  initDocumentListeners();

  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => {
      document.querySelectorAll(SELECT_SELECTOR).forEach(initSelect);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
};
