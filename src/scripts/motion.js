import { loadGsap } from './animation-runtime.js';
import { addSmoothScrollListener } from './smooth-scroll.js';

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = [];

const HERO_MEDIA_SELECTOR = '.section_hero .hero-video:not(.virtura-hero-video-placeholder)';
const HERO_SECTION_SELECTOR = '.section_hero';
const HERO_PLACEHOLDER_CLASS = 'virtura-hero-video-placeholder';
const HERO_FLOATING_CLASS = 'virtura-hero-video-floating';
const HERO_ACTIVE_CLASS = 'virtura-hero-video-motion-active';
const HERO_DOCKED_CLASS = 'virtura-hero-video-motion-docked';
const HERO_TARGET_OVERSCAN = '6rem';
const MOBILE_L_MEDIA_QUERY = '(max-width: 767px)';
const CATEGORY_BLOCK_SELECTOR = '.section_category .category-block';
const CATEGORY_HEADER_SELECTOR = '.category-heading-block';
const CATEGORY_HEADING_SELECTOR = ':is(h1, h2, h3, h4, h5, h6, .brxe-heading)';
const CATEGORY_BUTTON_SELECTOR = '.btn';
const CATEGORY_BUTTON_REVEAL_DURATION = 1.25;
const CATEGORY_BUTTON_START_BUFFER = 48;
const CATEGORY_IMAGE_REVEAL_DURATION = 1.4;
const CATEGORY_IMAGE_REVEAL_START = 'top 94%';
const CATEGORY_IMAGE_SELECTOR = '.category-img';
const CATEGORY_REVEAL_END = 'top 65%';
const CATEGORY_REVEAL_SCRUB = 0.85;
const CATEGORY_REVEAL_START = 'top 95%';
const CATEGORY_SUBCATEGORY_BUTTON_REVEAL_DURATION = 1.1;
const CATEGORY_SUBCATEGORY_BUTTON_REVEAL_START = 'top 92%';
const CATEGORY_SUBCATEGORY_BUTTON_SELECTOR = '.subcategory-block .btn';
const OPTION_BLOCK_SELECTOR = '.option-block';
const OPTION_CARD_SELECTOR = '.offer-block';
const OPTION_BUTTON_SELECTOR = '.btn';
const OPTION_MEDIA_FRAME_SELECTOR = '.offer-img-block';
const OPTION_MEDIA_SELECTOR = 'img, video';
const OPTION_MEDIA_EXCLUDE_SELECTOR = [
  '.btn',
  '.svg-arrow-block',
  '.spec-level',
  '.level-dot',
  'svg',
].join(', ');
const OPTION_BUTTON_CLASS = 'virtura-option-button';
const OPTION_MEDIA_FRAME_CLASS = 'virtura-option-media-frame';
const OPTION_MEDIA_RADIUS_ATTR = 'data-virtura-option-media-radius';
const OPTION_MEDIA_TARGET_CLASS = 'virtura-option-media-target';
const OPTION_MEDIA_PAIR_SELECTOR = '.ppf-img-default, .ppf-img-hover';
const OPTION_MEDIA_MIN_AREA = 12000;
const OPTION_BUTTON_REVEAL_DURATION = 0.85;
const OPTION_BUTTON_REVEAL_START = 'top 92%';
const OPTION_MEDIA_PARALLAX_DISTANCE = 8.5;
const OPTION_MEDIA_SCALE = 1.18;

let motionInitialized = false;
let motionInitializing = false;
let heroMediaScrollTrigger;
let removeSmoothScrollListener;

const mobileLMedia = window.matchMedia(MOBILE_L_MEDIA_QUERY);
const userAgent = window.navigator.userAgent || '';
const isFirefox = /Firefox|FxiOS/i.test(userAgent);
const isSafari = /Safari/i.test(userAgent)
  && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(userAgent);
const supportsReliableFixedHeroPin = !isFirefox && !isSafari;

export const getHeroMediaScrollTrigger = () => heroMediaScrollTrigger;

const getMotionElements = () => Array.from(document.querySelectorAll('[data-motion]'));

const getCategoryBlocks = () => Array.from(document.querySelectorAll(CATEGORY_BLOCK_SELECTOR));

const getOptionBlocks = () => Array.from(document.querySelectorAll(OPTION_BLOCK_SELECTOR));

const getHeroMedia = () => document.querySelector(HERO_MEDIA_SELECTOR);

const getHeroSection = (media) => media?.closest(HERO_SECTION_SELECTOR);

// This effect reparents the video to <body> while ScrollTrigger pins the hero.
// WebKit and Gecko can retain a stale fixed-pin offset after the intro removes
// its scroll lock. In those engines keep the hero media in normal document
// flow; all remaining scroll reveals are still initialized.
const shouldInitHeroMediaScale = () => (
  !mobileLMedia.matches && supportsReliableFixedHeroPin
);

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

const getHeroTargetRect = (media) => {
  const overscan = Math.max(0, getCssLengthInPixels(HERO_TARGET_OVERSCAN));
  const targetWidth = Math.max(1, window.innerWidth + overscan * 2);
  const targetHeight = Math.max(1, window.innerHeight + overscan * 2);
  const sourceRect = media.getBoundingClientRect();
  const video = media instanceof HTMLVideoElement
    ? media
    : media.querySelector('video');
  const sourceWidth = video?.videoWidth || sourceRect.width || targetWidth;
  const sourceHeight = video?.videoHeight || sourceRect.height || targetHeight;
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

const resetOptionMotionElements = () => {
  document.querySelectorAll(`.${OPTION_BUTTON_CLASS}`).forEach((element) => {
    element.classList.remove(OPTION_BUTTON_CLASS);
    element.style.removeProperty('-webkit-clip-path');
    element.style.removeProperty('clip-path');
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('visibility');
  });

  document.querySelectorAll(`.${OPTION_MEDIA_FRAME_CLASS}`).forEach((element) => {
    element.classList.remove(OPTION_MEDIA_FRAME_CLASS);

    if (element.hasAttribute(OPTION_MEDIA_RADIUS_ATTR)) {
      element.removeAttribute(OPTION_MEDIA_RADIUS_ATTR);
      element.style.removeProperty('border-radius');
    }
  });

  document.querySelectorAll(`.${OPTION_MEDIA_TARGET_CLASS}`).forEach((element) => {
    element.classList.remove(OPTION_MEDIA_TARGET_CLASS);
    element.style.removeProperty('transform');
    element.style.removeProperty('transform-origin');
    element.style.removeProperty('will-change');
  });
};

const getOptionButton = (block) => {
  const contentBlock = block.parentElement;
  const card = block.closest(OPTION_CARD_SELECTOR);
  const searchRoot = contentBlock || card;

  if (!searchRoot) {
    return null;
  }

  return Array.from(searchRoot.querySelectorAll(OPTION_BUTTON_SELECTOR))
    .find((button) => !block.contains(button)) || null;
};

const getMediaArea = (media) => {
  const rect = media.getBoundingClientRect();
  const attrWidth = Number.parseFloat(media.getAttribute('width') || '');
  const attrHeight = Number.parseFloat(media.getAttribute('height') || '');
  const frameRect = media.closest(OPTION_MEDIA_FRAME_SELECTOR)?.getBoundingClientRect();
  const width = media.naturalWidth
    || media.videoWidth
    || rect.width
    || attrWidth
    || frameRect?.width;
  const height = media.naturalHeight
    || media.videoHeight
    || rect.height
    || attrHeight
    || frameRect?.height;

  return Math.max(0, width) * Math.max(0, height);
};

const getOptionMedia = (block) => {
  const card = block.closest(OPTION_CARD_SELECTOR) || block;
  const candidates = Array.from(card.querySelectorAll(OPTION_MEDIA_SELECTOR))
    .filter((media) => {
      if (media.closest(OPTION_MEDIA_EXCLUDE_SELECTOR)) {
        return false;
      }

      return getMediaArea(media) >= OPTION_MEDIA_MIN_AREA;
    })
    .sort((first, second) => getMediaArea(second) - getMediaArea(first));

  const framedMedia = candidates.find((media) =>
    media.closest(OPTION_MEDIA_FRAME_SELECTOR) && !block.contains(media));
  const externalMedia = candidates.find((media) => !block.contains(media));

  return framedMedia || externalMedia || candidates[0] || null;
};

const getOptionMediaFrame = (media) => {
  const explicitFrame = media.closest(OPTION_MEDIA_FRAME_SELECTOR);

  if (explicitFrame && explicitFrame !== media && !explicitFrame.matches(OPTION_CARD_SELECTOR)) {
    return explicitFrame;
  }

  const wrapper = media.closest('picture, figure, .brxe-video');

  if (wrapper && wrapper !== media) {
    return wrapper;
  }

  const parent = media.parentElement;

  if (!parent || parent === document.body || parent.matches(OPTION_CARD_SELECTOR)) {
    return null;
  }

  if (
    parent.children.length === 1
    || parent.classList.contains('brxe-image')
    || parent.classList.contains('brxe-video')
  ) {
    return parent;
  }

  return null;
};

const getOptionMediaTargets = (frame, media) => {
  if (!media.matches(OPTION_MEDIA_PAIR_SELECTOR)) {
    return [media];
  }

  const pairedMedia = Array.from(frame.children)
    .filter((element) => element.matches(OPTION_MEDIA_PAIR_SELECTOR));

  return pairedMedia.length > 1 ? pairedMedia : [media];
};

const applyOptionMediaFrameRadius = (frame, media) => {
  const frameBorderRadius = window.getComputedStyle(frame).borderRadius;
  const mediaBorderRadius = window.getComputedStyle(media).borderRadius;

  if (
    frameBorderRadius !== '0px'
    || !mediaBorderRadius
    || mediaBorderRadius === '0px'
  ) {
    return;
  }

  frame.setAttribute(OPTION_MEDIA_RADIUS_ATTR, 'true');
  frame.style.borderRadius = mediaBorderRadius;
};

const initOptionButtonReveal = (gsap, block) => {
  const button = getOptionButton(block);

  if (!button) {
    return;
  }

  button.classList.add(OPTION_BUTTON_CLASS);

  storeAnimation(
    gsap.fromTo(
      button,
      {
        autoAlpha: 1,
        clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
        webkitClipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
      },
      {
        autoAlpha: 1,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        duration: OPTION_BUTTON_REVEAL_DURATION,
        ease: 'power3.out',
        scrollTrigger: {
          invalidateOnRefresh: true,
          start: OPTION_BUTTON_REVEAL_START,
          toggleActions: 'play none none reverse',
          trigger: button,
        },
        webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      },
    ),
  );
};

const initOptionMediaMotion = (gsap, ScrollTrigger, block) => {
  const media = getOptionMedia(block);

  if (!media) {
    return;
  }

  const frame = getOptionMediaFrame(media);

  if (!frame) {
    return;
  }

  const card = block.closest(OPTION_CARD_SELECTOR) || block;
  const mediaTargets = getOptionMediaTargets(frame, media);

  frame.classList.add(OPTION_MEDIA_FRAME_CLASS);
  applyOptionMediaFrameRadius(frame, media);
  mediaTargets.forEach((mediaTarget) => {
    mediaTarget.classList.add(OPTION_MEDIA_TARGET_CLASS);

    if (mediaTarget instanceof HTMLImageElement && !mediaTarget.complete) {
      mediaTarget.addEventListener('load', () => ScrollTrigger.refresh(), {
        once: true,
      });
    }
  });

  storeAnimation(
    gsap.fromTo(
      mediaTargets,
      {
        scale: OPTION_MEDIA_SCALE,
        transformOrigin: 'center center',
        xPercent: 0,
        yPercent: OPTION_MEDIA_PARALLAX_DISTANCE,
      },
      {
        ease: 'none',
        scale: OPTION_MEDIA_SCALE,
        scrollTrigger: {
          end: 'bottom top',
          invalidateOnRefresh: true,
          scrub: true,
          start: 'top bottom',
          trigger: card,
        },
        yPercent: -OPTION_MEDIA_PARALLAX_DISTANCE,
      },
    ),
  );
};

const initOptionBlockMotion = (gsap, ScrollTrigger, optionBlocks) => {
  if (!optionBlocks.length) {
    return;
  }

  optionBlocks.forEach((block) => {
    initOptionButtonReveal(gsap, block);
    initOptionMediaMotion(gsap, ScrollTrigger, block);
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

const initHeroMediaScale = (gsap, ScrollTrigger) => {
  const media = getHeroMedia();
  const section = getHeroSection(media);

  if (!media || !section || !shouldInitHeroMediaScale()) {
    return;
  }

  if (
    section.dataset.virturaHeroMotionInitialized === 'true'
    || section.querySelector(`.${HERO_PLACEHOLDER_CLASS}`)
  ) {
    return;
  }

  section.dataset.virturaHeroMotionInitialized = 'true';

  const placeholder = document.createElement('div');
  const nativeVideo = media instanceof HTMLVideoElement
    ? media
    : media.querySelector('video');

  placeholder.className = [
    ...Array.from(media.classList).filter((className) => (
      className !== HERO_PLACEHOLDER_CLASS
      && className !== HERO_FLOATING_CLASS
    )),
    HERO_PLACEHOLDER_CLASS,
  ].join(' ');
  placeholder.setAttribute('aria-hidden', 'true');
  media.before(placeholder);
  media.classList.add(HERO_FLOATING_CLASS);

  const getSourceBorderRadius = () => window.getComputedStyle(media).borderRadius;

  const setMediaFixed = () => {
    if (media.parentElement !== document.body) {
      document.body.appendChild(media);
    }

    section.classList.remove(HERO_DOCKED_CLASS);
    gsap.set(media, { position: 'fixed' });
  };

  const setMediaToSource = () => {
    const sourceRect = placeholder.getBoundingClientRect();

    setMediaFixed();

    gsap.set(media, {
      autoAlpha: 1,
      borderRadius: getSourceBorderRadius(),
      height: sourceRect.height,
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
    });
  };

  const setMediaToTarget = () => {
    const targetRect = getHeroTargetRect(placeholder);

    setMediaFixed();

    gsap.set(media, {
      autoAlpha: 1,
      borderRadius: getSourceBorderRadius(),
      height: targetRect.height,
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
    });
  };

  const activateMedia = () => {
    section.classList.add(HERO_ACTIVE_CLASS);
  };

  const showMediaFromSource = () => {
    activateMedia();
    setMediaFixed();
    gsap.set(media, { autoAlpha: 1 });
  };

  const showMediaFromTarget = () => {
    activateMedia();
    setMediaToTarget();
  };

  const dockMediaInSection = () => {
    const targetRect = getHeroTargetRect(placeholder);

    activateMedia();

    if (media.parentElement !== section) {
      section.appendChild(media);
    }

    section.classList.add(HERO_DOCKED_CLASS);

    gsap.set(media, {
      autoAlpha: 1,
      borderRadius: getSourceBorderRadius(),
      height: targetRect.height,
      left: targetRect.left,
      position: 'absolute',
      top: targetRect.top,
      width: targetRect.width,
    });
  };

  const resetMediaToSource = () => {
    section.classList.remove(HERO_ACTIVE_CLASS);
    section.classList.remove(HERO_DOCKED_CLASS);
    setMediaToSource();
  };

  setMediaToSource();

  const timeline = gsap.timeline({
    scrollTrigger: {
      anticipatePin: 1,
      end: '+=120%',
      invalidateOnRefresh: true,
      onEnter: showMediaFromSource,
      onEnterBack: showMediaFromTarget,
      onLeave: dockMediaInSection,
      onLeaveBack: resetMediaToSource,
      onRefresh: (self) => {
        if (self.progress >= 1) {
          dockMediaInSection();
          return;
        }

        if (self.progress <= 0) {
          resetMediaToSource();
          return;
        }

        showMediaFromSource();
      },
      onRefreshInit: setMediaToSource,
      pin: true,
      scrub: true,
      start: 'top top',
      trigger: section,
    },
  });

  heroMediaScrollTrigger = timeline.scrollTrigger;

  timeline.fromTo(
    media,
    {
      borderRadius: () => getSourceBorderRadius(),
      height: () => placeholder.getBoundingClientRect().height,
      left: () => placeholder.getBoundingClientRect().left,
      top: () => placeholder.getBoundingClientRect().top,
      width: () => placeholder.getBoundingClientRect().width,
    },
    {
      borderRadius: () => getSourceBorderRadius(),
      ease: 'none',
      height: () => getHeroTargetRect(placeholder).height,
      left: () => getHeroTargetRect(placeholder).left,
      top: () => getHeroTargetRect(placeholder).top,
      width: () => getHeroTargetRect(placeholder).width,
    },
  );

  if (nativeVideo && nativeVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
    nativeVideo.addEventListener(
      'loadedmetadata',
      () => ScrollTrigger.refresh(),
      { once: true },
    );
  }

  storeAnimation({
    kill: () => {
      if (heroMediaScrollTrigger === timeline.scrollTrigger) {
        heroMediaScrollTrigger = undefined;
      }

      timeline.scrollTrigger?.kill();
      timeline.kill();
      section.classList.remove(HERO_ACTIVE_CLASS);
      section.classList.remove(HERO_DOCKED_CLASS);
      delete section.dataset.virturaHeroMotionInitialized;
      media.classList.remove(HERO_FLOATING_CLASS);
      placeholder.replaceWith(media);
      gsap.set(media, {
        clearProps: 'borderRadius,height,left,maxWidth,opacity,position,top,visibility,width',
      });
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
  const heroMedia = getHeroMedia();
  const categoryBlocks = getCategoryBlocks();
  const optionBlocks = getOptionBlocks();

  if (!motionElements.length && !heroMedia && !categoryBlocks.length && !optionBlocks.length) {
    return;
  }

  if (reducedMotionMedia.matches) {
    document.documentElement.classList.remove('virtura-motion-ready');
    clearAnimations();
    resetMotionElements();
    resetCategoryRevealElements();
    resetOptionMotionElements();
    return;
  }

  if (motionInitialized) {
    return;
  }

  if (motionInitializing) {
    return;
  }

  motionInitializing = true;

  try {
    const { gsap, ScrollTrigger } = await loadGsap();

    if (!removeSmoothScrollListener) {
      removeSmoothScrollListener = addSmoothScrollListener(ScrollTrigger.update);
    }

    if (reducedMotionMedia.matches) {
      document.documentElement.classList.remove('virtura-motion-ready');
      clearAnimations();
      resetMotionElements();
      resetCategoryRevealElements();
      resetOptionMotionElements();
      return;
    }

    initHeroMediaScale(gsap, ScrollTrigger);
    initScrollReveal(gsap, motionElements);
    initCategoryBlockReveal(gsap, categoryBlocks);
    initOptionBlockMotion(gsap, ScrollTrigger, optionBlocks);

    if (reducedMotionMedia.matches) {
      document.documentElement.classList.remove('virtura-motion-ready');
      clearAnimations();
      resetMotionElements();
      resetCategoryRevealElements();
      resetOptionMotionElements();
      return;
    }

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    document.documentElement.classList.add('virtura-motion-ready');
    motionInitialized = true;
  } finally {
    motionInitializing = false;
  }
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
  resetOptionMotionElements();
  void initMotion();
};

if ('addEventListener' in mobileLMedia) {
  mobileLMedia.addEventListener('change', restartMotion);
} else {
  mobileLMedia.addListener(restartMotion);
}
