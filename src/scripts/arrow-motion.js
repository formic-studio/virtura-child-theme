const ARROW_BLOCK_SELECTOR = '.svg-arrow-block';
const READY_CLASS = 'virtura-arrow-motion-ready';
const SOURCE_CLASS = 'virtura-arrow-source';
const CLONE_CLASS = 'virtura-arrow-clone';
const SHIFT_PROPERTY = '--virtura-arrow-shift';
const ARROW_TRIGGER_SELECTOR = [
  'a[href]',
  '.btn',
  '.nav-btn',
  '.nav-cta',
  '.footer-btn',
  '.category-link',
  '.img-button',
  '.btn-big',
  '.btn-glass',
  '.btn-wrapper',
  '.bricks-button',
  '.brxe-button',
].join(', ');
const SVG_PAINT_PROPERTIES = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'vector-effect',
];

let arrowObserver;
let arrowResizeObserver;

const syncArrowShift = (block) => {
  const width = block.getBoundingClientRect().width;

  if (width > 0) {
    block.style.setProperty(SHIFT_PROPERTY, `${width}px`);
  }
};

const syncArrowPaint = (source, clone) => {
  const sourceElements = [source, ...source.querySelectorAll('*')];
  const cloneElements = [clone, ...clone.querySelectorAll('*')];

  sourceElements.forEach((sourceElement, index) => {
    const cloneElement = cloneElements[index];

    if (!cloneElement) {
      return;
    }

    const sourceStyles = getComputedStyle(sourceElement);
    const cloneStyles = getComputedStyle(cloneElement);

    SVG_PAINT_PROPERTIES.forEach((property) => {
      const sourceValue = sourceStyles.getPropertyValue(property);
      const cloneValue = cloneStyles.getPropertyValue(property);

      if (sourceValue && sourceValue !== cloneValue) {
        cloneElement.style.setProperty(property, sourceValue);
      }
    });
  });
};

const setupArrow = (block) => {
  if (block.classList.contains(READY_CLASS)) {
    return;
  }

  const source = block.querySelector(`svg:not(.${CLONE_CLASS})`);

  if (!source) {
    return;
  }

  const clone = source.cloneNode(true);

  source.classList.add(SOURCE_CLASS);
  clone.classList.add(CLONE_CLASS);
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('focusable', 'false');
  clone.removeAttribute('id');

  block.append(clone);
  block.classList.add(READY_CLASS);
  const syncPaint = () => syncArrowPaint(source, clone);
  const trigger = block.closest(ARROW_TRIGGER_SELECTOR) || block;

  syncPaint();
  trigger.addEventListener('pointerenter', syncPaint);
  trigger.addEventListener('focusin', syncPaint);
  syncArrowShift(block);
  arrowResizeObserver?.observe(block);
};

const setupArrowsWithin = (root) => {
  if (!(root instanceof Element)) {
    return;
  }

  if (root.matches(ARROW_BLOCK_SELECTOR)) {
    setupArrow(root);
  }

  root.querySelectorAll(ARROW_BLOCK_SELECTOR).forEach(setupArrow);
};

export const initArrowMotion = () => {
  if ('ResizeObserver' in window && !arrowResizeObserver) {
    arrowResizeObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => syncArrowShift(target));
    });
  }

  document.querySelectorAll(ARROW_BLOCK_SELECTOR).forEach(setupArrow);

  if (arrowObserver || !document.body) {
    return;
  }

  arrowObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(setupArrowsWithin);
    });
  });

  arrowObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};
