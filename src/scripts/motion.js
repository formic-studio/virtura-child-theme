const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = [];

const HERO_IMAGE_SELECTOR = '.section_hero .hero-img';
const HERO_SECTION_SELECTOR = '.section_hero';
const HERO_CLONE_CLASS = 'virtura-hero-img-clone';
const HERO_SOURCE_HIDDEN_CLASS = 'virtura-hero-img-source-hidden';
const HERO_ACTIVE_CLASS = 'virtura-hero-img-motion-active';
const HERO_DOCKED_CLASS = 'virtura-hero-img-motion-docked';
const HERO_TARGET_MAX_BLOCK_PADDING = '12rem';
const CATEGORY_WRAPPER_SELECTOR = '.category-wrapper';
const CATEGORY_BLOCK_SELECTOR = '.category-block';
const CATEGORY_HEADING_SELECTOR = '.category-heading-block';
const CATEGORY_STACK_TOP_OFFSET = 'var(--space-72, 7.2rem)';
const CATEGORY_STACK_HEADING_GAP = 'var(--space-8, 0.8rem)';
const CATEGORY_STACK_END_GAP = 'var(--space-16, 1.6rem)';
const CATEGORY_STACK_OVERLAP = '-1rem';

let gsapApiPromise;
let motionInitialized = false;
let categoryStackInitialized = false;
let categoryStackRefreshFrame;

export const loadGsap = async () => {
  if (!gsapApiPromise) {
    gsapApiPromise = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapModule, scrollTriggerModule]) => {
      const gsap = gsapModule.gsap || gsapModule.default;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;

      gsap.registerPlugin(ScrollTrigger);

      return { gsap, ScrollTrigger };
    });
  }

  return gsapApiPromise;
};

const getMotionElements = () => Array.from(document.querySelectorAll('[data-motion]'));

const getHeroImage = () => document.querySelector(HERO_IMAGE_SELECTOR);

const getHeroSection = (image) => image?.closest(HERO_SECTION_SELECTOR);

const getCategoryStackWrappers = () => Array
  .from(document.querySelectorAll(CATEGORY_WRAPPER_SELECTOR))
  .filter((wrapper) => getCategoryStackBlocks(wrapper).length > 1);

const getCategoryStackBlocks = (wrapper) => Array
  .from(wrapper.children)
  .filter((child) => child.classList.contains(CATEGORY_BLOCK_SELECTOR.slice(1)));

const getCssLengthInPixels = (value) => {
  if (!value) {
    return 0;
  }

  const probe = document.createElement('div');

  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.width = value;

  document.body.appendChild(probe);

  const width = probe.getBoundingClientRect().width;

  probe.remove();

  return Number.isFinite(width) ? width : 0;
};

const getRootRemInPixels = () => {
  const rootFontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );

  return Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16;
};

const toRemValue = (pixels) => `${Number.parseFloat(
  (pixels / getRootRemInPixels()).toFixed(4),
)}rem`;

const getGlobalPaddingFromCssVariable = () => {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const globalPadding = rootStyles.getPropertyValue('--padding-global').trim();
  const globalPaddingPixels = getCssLengthInPixels(globalPadding);

  return {
    left: globalPaddingPixels,
    right: globalPaddingPixels,
  };
};

const getNearestHorizontalPadding = (element, stopElement) => {
  let currentElement = element?.parentElement;

  while (currentElement && currentElement !== document.body) {
    const styles = window.getComputedStyle(currentElement);
    const left = Number.parseFloat(styles.paddingLeft) || 0;
    const right = Number.parseFloat(styles.paddingRight) || 0;

    if (left > 0 || right > 0) {
      return { left, right };
    }

    if (currentElement === stopElement) {
      break;
    }

    currentElement = currentElement.parentElement;
  }

  return getGlobalPaddingFromCssVariable();
};

const getHeroTargetRect = (image, section) => {
  const inlinePadding = getNearestHorizontalPadding(image, section);
  const leftPadding = Math.max(0, inlinePadding.left);
  const rightPadding = Math.max(0, inlinePadding.right);
  const maxBlockPadding = getCssLengthInPixels(HERO_TARGET_MAX_BLOCK_PADDING);
  const blockPadding = Math.min(maxBlockPadding, window.innerHeight * 0.18);
  const availableWidth = Math.max(1, window.innerWidth - leftPadding - rightPadding);
  const availableHeight = Math.max(1, window.innerHeight - blockPadding * 2);
  const sourceRect = image.getBoundingClientRect();
  const sourceWidth = image.naturalWidth || sourceRect.width || availableWidth;
  const sourceHeight = image.naturalHeight || sourceRect.height || availableHeight;
  const aspectRatio = sourceWidth / sourceHeight;

  let width = availableWidth;
  let height = width / aspectRatio;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * aspectRatio;
  }

  return {
    height,
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
  };
};

const isPlaceholderImageSource = (src) => !src || src.startsWith('data:image/svg+xml');

const getImageSource = (image) => {
  if (!isPlaceholderImageSource(image.currentSrc)) {
    return image.currentSrc;
  }

  if (!isPlaceholderImageSource(image.getAttribute('src'))) {
    return image.getAttribute('src');
  }

  return image.dataset.src || image.getAttribute('data-src') || '';
};

const createHeroImageClone = (image) => {
  const clone = document.createElement('img');
  const src = getImageSource(image);
  const srcset = image.dataset.srcset || image.getAttribute('srcset');
  const sizes = image.dataset.sizes || image.getAttribute('sizes');

  clone.className = HERO_CLONE_CLASS;
  clone.alt = image.alt || '';
  clone.decoding = 'async';

  if (src) {
    clone.src = src;
  }

  if (srcset) {
    clone.srcset = srcset;
  }

  if (sizes) {
    clone.sizes = sizes;
  }

  document.body.appendChild(clone);

  return clone;
};

const setReducedMotionClass = () => {
  document.documentElement.classList.toggle(
    'virtura-reduced-motion',
    reducedMotionMedia.matches,
  );
};

const storeAnimation = (animation) => {
  activeAnimations.push(animation);
  return animation;
};

const clearAnimations = () => {
  activeAnimations.splice(0).forEach((animation) => {
    if (animation.scrollTrigger) {
      animation.scrollTrigger.kill();
    }

    animation.kill();
  });

  motionInitialized = false;
};

const resetMotionElements = () => {
  getMotionElements().forEach((element) => {
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('visibility');
  });
};

const refreshCategoryStacks = () => {
  const wrappers = getCategoryStackWrappers();

  if (!wrappers.length) {
    return;
  }

  const stackTopOffset = getCssLengthInPixels(CATEGORY_STACK_TOP_OFFSET);
  const headingGap = getCssLengthInPixels(CATEGORY_STACK_HEADING_GAP);
  const endGap = getCssLengthInPixels(CATEGORY_STACK_END_GAP);

  wrappers.forEach((wrapper) => {
    const blocks = getCategoryStackBlocks(wrapper);
    const visibleHeadingHeights = blocks.map((block) => {
      const blockStyles = window.getComputedStyle(block);
      const heading = block.querySelector(CATEGORY_HEADING_SELECTOR);
      const headingHeight = heading?.getBoundingClientRect().height || 0;
      const blockTopPadding = Number.parseFloat(blockStyles.paddingTop) || 0;

      return blockTopPadding + headingHeight;
    });
    const visibleStep = Math.max(...visibleHeadingHeights, 0) + headingGap;
    const lastBlock = blocks[blocks.length - 1];
    const lastBlockHeight = lastBlock?.getBoundingClientRect().height || 0;
    const lastBlockTop = stackTopOffset + visibleStep * (blocks.length - 1);
    const safeEndPullUp = Math.max(0, window.innerHeight - lastBlockTop - lastBlockHeight - endGap);
    const endPullUp = Math.min(visibleStep, safeEndPullUp);

    wrapper.style.setProperty('--category-stack-end-space', toRemValue(visibleStep));
    wrapper.style.setProperty('--category-stack-end-offset', toRemValue(-endPullUp));

    blocks.forEach((block, index) => {
      block.style.setProperty('--category-stack-overlap', index ? CATEGORY_STACK_OVERLAP : '0rem');
      block.style.setProperty('--category-stack-top', toRemValue(stackTopOffset + visibleStep * index));
      block.style.setProperty('--category-stack-z-index', `${10 + index}`);
    });
  });
};

const scheduleCategoryStackRefresh = () => {
  if (categoryStackRefreshFrame) {
    window.cancelAnimationFrame(categoryStackRefreshFrame);
  }

  categoryStackRefreshFrame = window.requestAnimationFrame(() => {
    categoryStackRefreshFrame = null;
    refreshCategoryStacks();
  });
};

const initCategoryStack = () => {
  const wrappers = getCategoryStackWrappers();

  if (!wrappers.length) {
    return false;
  }

  refreshCategoryStacks();

  if (categoryStackInitialized) {
    return true;
  }

  categoryStackInitialized = true;

  window.addEventListener('resize', scheduleCategoryStackRefresh, { passive: true });
  window.addEventListener('load', scheduleCategoryStackRefresh, { once: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleCategoryStackRefresh).catch(() => {});
  }

  wrappers.forEach((wrapper) => {
    wrapper.querySelectorAll('img').forEach((image) => {
      if (!image.complete) {
        image.addEventListener('load', scheduleCategoryStackRefresh, { once: true });
      }
    });
  });

  return true;
};

const initHeroImageScale = (gsap, ScrollTrigger) => {
  const image = getHeroImage();
  const section = getHeroSection(image);

  if (!image || !section) {
    return;
  }

  const clone = createHeroImageClone(image);
  let isCloneActive = false;

  const getSourceBorderRadius = () => window.getComputedStyle(image).borderRadius;

  const setCloneFixed = () => {
    if (clone.parentElement !== document.body) {
      document.body.appendChild(clone);
    }

    section.classList.remove(HERO_DOCKED_CLASS);
    gsap.set(clone, { position: 'fixed' });
  };

  const setCloneToSource = () => {
    const sourceRect = image.getBoundingClientRect();

    setCloneFixed();

    gsap.set(clone, {
      autoAlpha: isCloneActive ? 1 : 0,
      borderRadius: getSourceBorderRadius(),
      height: sourceRect.height,
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
    });
  };

  const setCloneToTarget = () => {
    const targetRect = getHeroTargetRect(image, section);

    setCloneFixed();

    gsap.set(clone, {
      autoAlpha: 1,
      borderRadius: getSourceBorderRadius(),
      height: targetRect.height,
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
    });
  };

  const activateClone = () => {
    isCloneActive = true;
    section.classList.add(HERO_ACTIVE_CLASS);
    image.classList.add(HERO_SOURCE_HIDDEN_CLASS);
  };

  const showCloneFromSource = () => {
    activateClone();
    setCloneFixed();
    gsap.set(clone, { autoAlpha: 1 });
  };

  const showCloneFromTarget = () => {
    activateClone();
    setCloneToTarget();
  };

  const dockCloneInSection = () => {
    const targetRect = getHeroTargetRect(image, section);
    const sectionRect = section.getBoundingClientRect();

    activateClone();

    if (clone.parentElement !== section) {
      section.appendChild(clone);
    }

    section.classList.add(HERO_DOCKED_CLASS);

    gsap.set(clone, {
      autoAlpha: 1,
      borderRadius: getSourceBorderRadius(),
      height: targetRect.height,
      left: Math.max(0, targetRect.left - sectionRect.left),
      position: 'absolute',
      top: Math.max(0, targetRect.top - sectionRect.top),
      width: targetRect.width,
    });
  };

  const hideClone = () => {
    isCloneActive = false;
    section.classList.remove(HERO_ACTIVE_CLASS);
    section.classList.remove(HERO_DOCKED_CLASS);
    image.classList.remove(HERO_SOURCE_HIDDEN_CLASS);
    setCloneFixed();
    gsap.set(clone, { autoAlpha: 0 });
  };

  setCloneToSource();

  const timeline = gsap.timeline({
    scrollTrigger: {
      anticipatePin: 1,
      end: '+=120%',
      invalidateOnRefresh: true,
      onEnter: showCloneFromSource,
      onEnterBack: showCloneFromTarget,
      onLeave: dockCloneInSection,
      onLeaveBack: hideClone,
      onRefreshInit: setCloneToSource,
      pin: true,
      scrub: true,
      start: 'top top',
      trigger: section,
    },
  });

  timeline.fromTo(
    clone,
    {
      borderRadius: () => getSourceBorderRadius(),
      height: () => image.getBoundingClientRect().height,
      left: () => image.getBoundingClientRect().left,
      top: () => image.getBoundingClientRect().top,
      width: () => image.getBoundingClientRect().width,
    },
    {
      borderRadius: () => getSourceBorderRadius(),
      ease: 'none',
      height: () => getHeroTargetRect(image, section).height,
      left: () => getHeroTargetRect(image, section).left,
      top: () => getHeroTargetRect(image, section).top,
      width: () => getHeroTargetRect(image, section).width,
    },
  );

  if (!image.complete) {
    image.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }

  storeAnimation({
    kill: () => {
      timeline.kill();
      clone.remove();
      section.classList.remove(HERO_ACTIVE_CLASS);
      section.classList.remove(HERO_DOCKED_CLASS);
      image.classList.remove(HERO_SOURCE_HIDDEN_CLASS);
    },
  });
};

const initScrollReveal = (gsap, motionElements) => {
  motionElements
    .filter((element) => element.getAttribute('data-motion') === 'fade-up')
    .forEach((element) => {
      storeAnimation(
        gsap.fromTo(
          element,
          {
            autoAlpha: 0,
            y: 32,
          },
          {
            autoAlpha: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 85%',
              once: true,
            },
            y: 0,
          },
        ),
      );
    });
};

export const initMotion = async () => {
  document.documentElement.classList.add('virtura-js');
  setReducedMotionClass();

  const motionElements = getMotionElements();
  const heroImage = getHeroImage();
  const hasCategoryStack = initCategoryStack();

  if (!motionElements.length && !heroImage && !hasCategoryStack) {
    return;
  }

  if (!motionElements.length && !heroImage) {
    return;
  }

  if (reducedMotionMedia.matches) {
    document.documentElement.classList.remove('virtura-motion-ready');
    clearAnimations();
    resetMotionElements();
    return;
  }

  if (motionInitialized) {
    return;
  }

  const { gsap, ScrollTrigger } = await loadGsap();

  if (reducedMotionMedia.matches) {
    document.documentElement.classList.remove('virtura-motion-ready');
    clearAnimations();
    resetMotionElements();
    return;
  }

  initScrollReveal(gsap, motionElements);
  initHeroImageScale(gsap, ScrollTrigger);
  document.documentElement.classList.add('virtura-motion-ready');
  motionInitialized = true;
};

if ('addEventListener' in reducedMotionMedia) {
  reducedMotionMedia.addEventListener('change', () => {
    void initMotion();
  });
} else {
  reducedMotionMedia.addListener(() => {
    void initMotion();
  });
}
