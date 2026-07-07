const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = [];

const HERO_IMAGE_SELECTOR = '.section_hero .hero-img';
const HERO_SECTION_SELECTOR = '.section_hero';
const HERO_CLONE_CLASS = 'virtura-hero-img-clone';
const HERO_SOURCE_HIDDEN_CLASS = 'virtura-hero-img-source-hidden';
const HERO_ACTIVE_CLASS = 'virtura-hero-img-motion-active';
const HERO_DOCKED_CLASS = 'virtura-hero-img-motion-docked';
const HERO_TARGET_OVERSCAN = '6rem';
const MOBILE_L_MEDIA_QUERY = '(max-width: 767px)';
const CATEGORY_BLOCK_SELECTOR = '.section_category .category-block';
const CATEGORY_HEADER_SELECTOR = '.category-heading-block';
const CATEGORY_HEADING_SELECTOR = ':is(h1, h2, h3, h4, h5, h6, .brxe-heading)';
const CATEGORY_BUTTON_SELECTOR = '.btn';
const CATEGORY_BUTTON_REVEAL_DURATION = 1;
const CATEGORY_BUTTON_START_BUFFER = 48;
const CATEGORY_IMAGE_REVEAL_DURATION = 1.15;
const CATEGORY_IMAGE_REVEAL_START = 'top 94%';
const CATEGORY_IMAGE_SELECTOR = '.category-img';
const CATEGORY_REVEAL_END = 'top 65%';
const CATEGORY_REVEAL_SCRUB = 0.65;
const CATEGORY_REVEAL_START = 'top 95%';
const CATEGORY_SUBCATEGORY_BUTTON_REVEAL_DURATION = 0.85;
const CATEGORY_SUBCATEGORY_BUTTON_REVEAL_START = 'top 92%';
const CATEGORY_SUBCATEGORY_BUTTON_SELECTOR = '.subcategory-block .btn';

let gsapApiPromise;
let motionInitialized = false;

const mobileLMedia = window.matchMedia(MOBILE_L_MEDIA_QUERY);

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

const getCategoryBlocks = () => Array.from(document.querySelectorAll(CATEGORY_BLOCK_SELECTOR));

const getHeroImage = () => document.querySelector(HERO_IMAGE_SELECTOR);

const getHeroSection = (image) => image?.closest(HERO_SECTION_SELECTOR);

const shouldInitHeroImageScale = () => !mobileLMedia.matches;

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

const getHeroTargetRect = (image) => {
  const overscan = Math.max(0, getCssLengthInPixels(HERO_TARGET_OVERSCAN));
  const targetWidth = Math.max(1, window.innerWidth + overscan * 2);
  const targetHeight = Math.max(1, window.innerHeight + overscan * 2);
  const sourceRect = image.getBoundingClientRect();
  const sourceWidth = image.naturalWidth || sourceRect.width || targetWidth;
  const sourceHeight = image.naturalHeight || sourceRect.height || targetHeight;
  const aspectRatio = sourceWidth / sourceHeight;

  let width = targetWidth;
  let height = width / aspectRatio;

  if (height < targetHeight) {
    height = targetHeight;
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
    element.style.removeProperty('filter');
    element.style.removeProperty('transform');
    element.style.removeProperty('visibility');
  });
};

const getCategoryRevealElements = () => getCategoryBlocks()
  .flatMap((block) => {
    const header = block.querySelector(CATEGORY_HEADER_SELECTOR);

    return [
      header?.querySelector(CATEGORY_HEADING_SELECTOR),
      header?.querySelector(CATEGORY_BUTTON_SELECTOR),
      block.querySelector(CATEGORY_IMAGE_SELECTOR),
      ...block.querySelectorAll(CATEGORY_SUBCATEGORY_BUTTON_SELECTOR),
    ];
  })
  .filter(Boolean);

const resetCategoryRevealElements = () => {
  getCategoryRevealElements().forEach((element) => {
    element.style.removeProperty('-webkit-clip-path');
    element.style.removeProperty('clip-path');
    element.style.removeProperty('opacity');
    element.style.removeProperty('filter');
    element.style.removeProperty('transform');
    element.style.removeProperty('visibility');
  });
};

const getCategoryElementStartX = (element, block) => {
  const elementRect = element.getBoundingClientRect();
  const blockRect = block.getBoundingClientRect();
  const distanceToBlockEdge = blockRect.right - elementRect.left;

  return Math.max(distanceToBlockEdge, elementRect.width)
    + elementRect.width
    + CATEGORY_BUTTON_START_BUFFER;
};

const initHeroImageScale = (gsap, ScrollTrigger) => {
  const image = getHeroImage();
  const section = getHeroSection(image);

  if (!image || !section || !shouldInitHeroImageScale()) {
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
    const targetRect = getHeroTargetRect(image);

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
    const targetRect = getHeroTargetRect(image);

    activateClone();

    if (clone.parentElement !== section) {
      section.appendChild(clone);
    }

    section.classList.add(HERO_DOCKED_CLASS);

    gsap.set(clone, {
      autoAlpha: 1,
      borderRadius: getSourceBorderRadius(),
      height: targetRect.height,
      left: targetRect.left,
      position: 'absolute',
      top: targetRect.top,
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
      onRefresh: (self) => {
        if (self.progress >= 1) {
          dockCloneInSection();
          return;
        }

        if (self.progress <= 0) {
          hideClone();
          return;
        }

        showCloneFromSource();
      },
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
      height: () => getHeroTargetRect(image).height,
      left: () => getHeroTargetRect(image).left,
      top: () => getHeroTargetRect(image).top,
      width: () => getHeroTargetRect(image).width,
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

const initCategoryBlockReveal = (gsap, categoryBlocks) => {
  categoryBlocks.forEach((block) => {
    const header = block.querySelector(CATEGORY_HEADER_SELECTOR);
    const heading = header?.querySelector(CATEGORY_HEADING_SELECTOR);
    const button = header?.querySelector(CATEGORY_BUTTON_SELECTOR);
    const image = block.querySelector(CATEGORY_IMAGE_SELECTOR);
    const subcategoryButtons = Array.from(
      block.querySelectorAll(CATEGORY_SUBCATEGORY_BUTTON_SELECTOR),
    );

    if (!header || (!heading && !button && !image && !subcategoryButtons.length)) {
      return;
    }

    if (heading) {
      storeAnimation(
        gsap.fromTo(
          heading,
          {
            autoAlpha: 0,
            filter: 'blur(5px)',
            y: '1rem',
          },
          {
            autoAlpha: 1,
            ease: 'power3.out',
            filter: 'blur(0px)',
            scrollTrigger: {
              end: CATEGORY_REVEAL_END,
              invalidateOnRefresh: true,
              scrub: CATEGORY_REVEAL_SCRUB,
              start: CATEGORY_REVEAL_START,
              trigger: header,
            },
            y: 0,
          },
        ),
      );
    }

    if (button) {
      storeAnimation(
        gsap.fromTo(
          button,
          {
            x: () => getCategoryElementStartX(button, block),
          },
          {
            duration: CATEGORY_BUTTON_REVEAL_DURATION,
            ease: 'power3.out',
            scrollTrigger: {
              invalidateOnRefresh: true,
              start: CATEGORY_REVEAL_START,
              toggleActions: 'play none none reverse',
              trigger: header,
            },
            x: 0,
          },
        ),
      );
    }

    if (image) {
      storeAnimation(
        gsap.fromTo(
          image,
          {
            x: () => getCategoryElementStartX(image, block),
          },
          {
            duration: CATEGORY_IMAGE_REVEAL_DURATION,
            ease: 'power3.out',
            scrollTrigger: {
              invalidateOnRefresh: true,
              start: CATEGORY_IMAGE_REVEAL_START,
              toggleActions: 'play none none reverse',
              trigger: image,
            },
            x: 0,
          },
        ),
      );
    }

    subcategoryButtons.forEach((subcategoryButton) => {
      storeAnimation(
        gsap.fromTo(
          subcategoryButton,
          {
            autoAlpha: 1,
            clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
            webkitClipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
          },
          {
            autoAlpha: 1,
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            duration: CATEGORY_SUBCATEGORY_BUTTON_REVEAL_DURATION,
            ease: 'power3.out',
            scrollTrigger: {
              invalidateOnRefresh: true,
              start: CATEGORY_SUBCATEGORY_BUTTON_REVEAL_START,
              toggleActions: 'play none none reverse',
              trigger: subcategoryButton,
            },
            webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          },
        ),
      );
    });
  });
};

export const initMotion = async () => {
  document.documentElement.classList.add('virtura-js');
  setReducedMotionClass();

  const motionElements = getMotionElements();
  const heroImage = getHeroImage();
  const categoryBlocks = getCategoryBlocks();

  if (!motionElements.length && !heroImage && !categoryBlocks.length) {
    return;
  }

  if (reducedMotionMedia.matches) {
    document.documentElement.classList.remove('virtura-motion-ready');
    clearAnimations();
    resetMotionElements();
    resetCategoryRevealElements();
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
    resetCategoryRevealElements();
    return;
  }

  initHeroImageScale(gsap, ScrollTrigger);
  initScrollReveal(gsap, motionElements);
  initCategoryBlockReveal(gsap, categoryBlocks);
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
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

const restartMotion = () => {
  document.documentElement.classList.remove('virtura-motion-ready');
  clearAnimations();
  resetMotionElements();
  resetCategoryRevealElements();
  void initMotion();
};

if ('addEventListener' in mobileLMedia) {
  mobileLMedia.addEventListener('change', restartMotion);
} else {
  mobileLMedia.addListener(restartMotion);
}
