const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = [];

const HERO_IMAGE_SELECTOR = '.section_hero .hero-img';
const HERO_SECTION_SELECTOR = '.section_hero';
const HERO_CLONE_CLASS = 'virtura-hero-img-clone';
const HERO_SOURCE_HIDDEN_CLASS = 'virtura-hero-img-source-hidden';
const HERO_ACTIVE_CLASS = 'virtura-hero-img-motion-active';

let gsapApiPromise;
let motionInitialized = false;

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
  const padding = getNearestHorizontalPadding(image, section);
  const left = Math.max(0, padding.left);
  const right = Math.max(0, padding.right);

  return {
    left,
    top: 0,
    width: Math.max(1, window.innerWidth - left - right),
    height: window.innerHeight,
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

const initHeroImageScale = (gsap, ScrollTrigger) => {
  const image = getHeroImage();
  const section = getHeroSection(image);

  if (!image || !section) {
    return;
  }

  const clone = createHeroImageClone(image);
  let isCloneActive = false;

  const getSourceBorderRadius = () => window.getComputedStyle(image).borderRadius;

  const setCloneToSource = () => {
    const sourceRect = image.getBoundingClientRect();

    gsap.set(clone, {
      autoAlpha: isCloneActive ? 1 : 0,
      borderRadius: getSourceBorderRadius(),
      height: sourceRect.height,
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
    });
  };

  const showClone = () => {
    isCloneActive = true;
    section.classList.add(HERO_ACTIVE_CLASS);
    image.classList.add(HERO_SOURCE_HIDDEN_CLASS);
    gsap.set(clone, { autoAlpha: 1 });
  };

  const hideClone = () => {
    isCloneActive = false;
    section.classList.remove(HERO_ACTIVE_CLASS);
    image.classList.remove(HERO_SOURCE_HIDDEN_CLASS);
    gsap.set(clone, { autoAlpha: 0 });
  };

  setCloneToSource();

  const timeline = gsap.timeline({
    scrollTrigger: {
      anticipatePin: 1,
      end: '+=120%',
      invalidateOnRefresh: true,
      onEnter: showClone,
      onEnterBack: showClone,
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
