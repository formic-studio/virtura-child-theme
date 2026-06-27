const STACK_SELECTOR = '.section_category .category-wrapper';
const CARD_CLASS = 'category-block';
const READY_CLASS = 'virtura-category-stack-ready';
const EXITING_CLASS = 'virtura-category-stack-exiting';
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';
const EXIT_THRESHOLD = 0.5;

let categoryStackInitialized = false;

const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);

const getCards = (wrapper) => Array.from(wrapper.children)
  .filter((child) => child.classList.contains(CARD_CLASS));

const getStickyTop = (card) => {
  const top = Number.parseFloat(window.getComputedStyle(card).top);

  return Number.isFinite(top) ? top : 0;
};

const resetStack = (stack) => {
  stack.wrapper.classList.remove(READY_CLASS, EXITING_CLASS);

  stack.cards.forEach((card) => {
    card.style.removeProperty('--virtura-category-stack-index');
    card.style.removeProperty('--virtura-category-stack-exit-y');
  });
};

const createStack = (wrapper) => {
  const cards = getCards(wrapper);

  if (cards.length < 2) {
    return null;
  }

  wrapper.classList.add(READY_CLASS);

  cards.forEach((card, index) => {
    card.style.setProperty('--virtura-category-stack-index', String(index + 1));
    card.style.removeProperty('--virtura-category-stack-exit-y');
  });

  return {
    appliedOffsets: new Array(cards.length).fill(0),
    cards,
    stickyTops: cards.map(getStickyTop),
    wrapper,
  };
};

const updateStack = (stack) => {
  const lastIndex = stack.cards.length - 1;
  const lastCard = stack.cards[lastIndex];
  const lastTop = stack.stickyTops[lastIndex];
  const lastRect = lastCard.getBoundingClientRect();
  const groupOffset = Math.min(0, lastRect.top - lastTop);

  if (Math.abs(groupOffset) <= EXIT_THRESHOLD) {
    stack.wrapper.classList.remove(EXITING_CLASS);

    stack.cards.forEach((card, index) => {
      stack.appliedOffsets[index] = 0;
      card.style.removeProperty('--virtura-category-stack-exit-y');
    });

    return;
  }

  stack.wrapper.classList.add(EXITING_CLASS);

  stack.cards.slice(0, lastIndex).forEach((card, index) => {
    const nativeTop = card.getBoundingClientRect().top - stack.appliedOffsets[index];
    const targetTop = stack.stickyTops[index] + groupOffset;
    const nextOffset = targetTop - nativeTop;

    stack.appliedOffsets[index] = nextOffset;
    card.style.setProperty('--virtura-category-stack-exit-y', `${nextOffset}px`);
  });
};

export const initCategoryStack = () => {
  if (categoryStackInitialized) {
    return;
  }

  const wrappers = Array.from(document.querySelectorAll(STACK_SELECTOR));

  if (!wrappers.length) {
    return;
  }

  categoryStackInitialized = true;

  let stacks = [];
  let animationFrame = null;
  let resizeObserver = null;

  const update = () => {
    animationFrame = null;

    if (!desktopMedia.matches) {
      return;
    }

    stacks.forEach(updateStack);
  };

  const requestUpdate = () => {
    if (animationFrame) {
      return;
    }

    animationFrame = window.requestAnimationFrame(update);
  };

  const refresh = () => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    stacks.forEach(resetStack);
    stacks = [];

    if (!desktopMedia.matches) {
      return;
    }

    stacks = wrappers
      .map(createStack)
      .filter(Boolean);

    requestUpdate();
  };

  refresh();

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', refresh);

  if ('addEventListener' in desktopMedia) {
    desktopMedia.addEventListener('change', refresh);
  } else {
    desktopMedia.addListener(refresh);
  }

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(refresh);
    wrappers.forEach((wrapper) => {
      resizeObserver.observe(wrapper);
      getCards(wrapper).forEach((card) => resizeObserver.observe(card));
    });
  }

  wrappers.forEach((wrapper) => {
    wrapper.querySelectorAll('img').forEach((image) => {
      if (!image.complete) {
        image.addEventListener('load', refresh, { once: true });
      }
    });
  });
};
