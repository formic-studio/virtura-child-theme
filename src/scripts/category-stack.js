const STACK_SELECTOR = '.section_category .category-wrapper';
const CARD_CLASS = 'category-block';
const READY_CLASS = 'virtura-category-stack-ready';
const EXITING_CLASS = 'virtura-category-stack-exiting';
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';
const EXIT_THRESHOLD = 0.5;
const STACK_LIFT_BOTTOM_MARGIN = 24;
const STACK_LIFT_ENTRY_MAX = 160;
const STACK_LIFT_ENTRY_MIN = 80;
const STACK_LIFT_ENTRY_VIEWPORT_RATIO = 0.16;
const STACK_LIFT_MAX_VIEWPORT_RATIO = 0.24;

let categoryStackInitialized = false;

const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getCards = (wrapper) => Array.from(wrapper.children)
  .filter((child) => child.classList.contains(CARD_CLASS));

const getStickyTop = (card) => {
  const top = Number.parseFloat(window.getComputedStyle(card).top);

  return Number.isFinite(top) ? top : 0;
};

const resetStack = (stack) => {
  stack.wrapper.classList.remove(READY_CLASS, EXITING_CLASS);
  stack.wrapper.style.removeProperty('--virtura-category-stack-layout-y');

  stack.cards.forEach((card) => {
    card.style.removeProperty('--virtura-category-stack-index');
    card.style.removeProperty('--virtura-category-stack-exit-y');
    card.style.removeProperty('--virtura-category-stack-lift-y');
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
    card.style.removeProperty('--virtura-category-stack-lift-y');
  });

  const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
  const stickyTops = cards.map(getStickyTop);

  return {
    appliedOffsets: new Array(cards.length).fill(0),
    appliedStackLifts: new Array(cards.length).fill(0),
    cardHeights: cards.map((card) => card.getBoundingClientRect().height),
    cards,
    liftStartScroll: null,
    stickyTops,
    stickyScrolls: cards.map((card, index) => (
      wrapperTop + card.offsetTop - stickyTops[index]
    )),
    wrapper,
  };
};

const getStackLiftLimit = (stack) => {
  const viewportHeight = window.innerHeight;
  const maxLift = viewportHeight * STACK_LIFT_MAX_VIEWPORT_RATIO;
  const requiredLift = stack.cardHeights.reduce((lift, cardHeight, index) => {
    const visibleOverflow = stack.stickyTops[index]
      + cardHeight
      + STACK_LIFT_BOTTOM_MARGIN
      - viewportHeight;

    return Math.max(lift, visibleOverflow);
  }, 0);

  return clamp(requiredLift, 0, maxLift);
};

const getCardTopWithoutTransforms = (stack, cardIndex, stackLifts) => (
  stack.cards[cardIndex].getBoundingClientRect().top
  - (stackLifts[cardIndex] ?? 0)
  - (stack.appliedOffsets[cardIndex] ?? 0)
);

const getStackLiftProgress = (stack, stackLifts) => {
  const startIndex = 1;
  const start = stack.stickyScrolls[startIndex];
  const end = stack.stickyScrolls[stack.stickyScrolls.length - 1];
  const plannedDistance = end - start;

  if (!stack.cards[startIndex] || !Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  const startCardTop = getCardTopWithoutTransforms(stack, startIndex, stackLifts);
  const isSecondCardStacked = startCardTop <= stack.stickyTops[startIndex] + EXIT_THRESHOLD;

  if (!isSecondCardStacked) {
    stack.liftStartScroll = null;
    return 0;
  }

  if (!Number.isFinite(stack.liftStartScroll)) {
    stack.liftStartScroll = window.scrollY;
  }

  const activeDistance = end - stack.liftStartScroll;
  const distance = activeDistance > 0
    ? activeDistance
    : Math.max(plannedDistance, window.innerHeight * 0.5);

  if (distance <= 0) {
    return 0;
  }

  return clamp((window.scrollY - stack.liftStartScroll) / distance, 0, 1);
};

const getCardStackLift = (stack, cardIndex, stackLift) => {
  if (Math.abs(stackLift) <= EXIT_THRESHOLD) {
    return 0;
  }

  if (cardIndex <= 1) {
    return stackLift;
  }

  const stickyScroll = stack.stickyScrolls[cardIndex];

  if (!Number.isFinite(stickyScroll)) {
    return 0;
  }

  const entryDistance = clamp(
    window.innerHeight * STACK_LIFT_ENTRY_VIEWPORT_RATIO,
    STACK_LIFT_ENTRY_MIN,
    STACK_LIFT_ENTRY_MAX,
  );
  const entryProgress = clamp(
    (window.scrollY - stickyScroll) / entryDistance,
    0,
    1,
  );

  return stackLift * entryProgress;
};

const applyStackLift = (stack, stackLift) => {
  stack.cards.forEach((card, index) => {
    const cardLift = getCardStackLift(stack, index, stackLift);

    stack.appliedStackLifts[index] = cardLift;

    if (Math.abs(cardLift) <= EXIT_THRESHOLD) {
      card.style.removeProperty('--virtura-category-stack-lift-y');
      return;
    }

    card.style.setProperty('--virtura-category-stack-lift-y', `${cardLift}px`);
  });

  const layoutOffset = stack.appliedStackLifts[stack.appliedStackLifts.length - 1] ?? 0;

  if (Math.abs(layoutOffset) <= EXIT_THRESHOLD) {
    stack.wrapper.style.removeProperty('--virtura-category-stack-layout-y');
    return;
  }

  stack.wrapper.style.setProperty('--virtura-category-stack-layout-y', `${layoutOffset}px`);
};

const updateStack = (stack) => {
  const lastIndex = stack.cards.length - 1;
  const lastCard = stack.cards[lastIndex];
  const lastTop = stack.stickyTops[lastIndex];
  const previousStackLifts = [...stack.appliedStackLifts];
  const stackLift = -1 * getStackLiftLimit(stack) * getStackLiftProgress(stack, previousStackLifts);
  const nativeLastTop = getCardTopWithoutTransforms(stack, lastIndex, previousStackLifts);
  const groupOffset = Math.min(0, nativeLastTop - lastTop);

  if (Math.abs(groupOffset) <= EXIT_THRESHOLD) {
    stack.wrapper.classList.remove(EXITING_CLASS);

    stack.cards.forEach((card, index) => {
      stack.appliedOffsets[index] = 0;
      card.style.removeProperty('--virtura-category-stack-exit-y');
    });

    applyStackLift(stack, stackLift);

    return;
  }

  stack.wrapper.classList.add(EXITING_CLASS);

  stack.cards.slice(0, lastIndex).forEach((card, index) => {
    const nativeTop = getCardTopWithoutTransforms(stack, index, previousStackLifts);
    const targetTop = stack.stickyTops[index] + groupOffset;
    const nextOffset = targetTop - nativeTop;

    stack.appliedOffsets[index] = nextOffset;
    card.style.setProperty('--virtura-category-stack-exit-y', `${nextOffset}px`);
  });

  applyStackLift(stack, stackLift);
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
