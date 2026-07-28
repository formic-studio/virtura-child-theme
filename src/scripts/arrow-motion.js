const ARROW_BLOCK_SELECTOR = '.svg-arrow-block';
const READY_CLASS = 'virtura-arrow-motion-ready';
const SOURCE_CLASS = 'virtura-arrow-source';
const CLONE_CLASS = 'virtura-arrow-clone';

let arrowObserver;

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
