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
const OPTION_BLOCK_SELECTOR = '.option-block';
const OPTION_CARD_SELECTOR = '.offer-block';
const OPTION_TEXT_SELECTOR = [
  ':scope :is(h1, h2, h3, h4, h5, h6, .brxe-heading)',
  ':scope :is(.brxe-text-basic, .brxe-text-link)',
  ':scope .brxe-list .title',
].join(', ');
const OPTION_TEXT_EXCLUDE_SELECTOR = [
  '.btn',
  '.svg-arrow-block',
  '.brxe-image',
  '.brxe-video',
  'picture',
  'figure',
  'svg',
].join(', ');
const OPTION_DOT_SELECTOR = ':scope .brxe-list .icon, :scope .brxe-list .dot';
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
const OPTION_LINE_READY_CLASS = 'virtura-option-line-ready';
const OPTION_LINE_CLASS = 'virtura-option-line';
const OPTION_DOT_CLASS = 'virtura-option-dot';
const OPTION_BUTTON_CLASS = 'virtura-option-button';
const OPTION_MEDIA_FRAME_CLASS = 'virtura-option-media-frame';
const OPTION_MEDIA_RADIUS_ATTR = 'data-virtura-option-media-radius';
const OPTION_MEDIA_TARGET_CLASS = 'virtura-option-media-target';
const OPTION_MEDIA_MIN_AREA = 12000;
const OPTION_TEXT_REVEAL_START = 'top 86%';
const OPTION_TEXT_REVEAL_DURATION = 1.24;
const OPTION_TEXT_REVEAL_STAGGER = 0.08;
const OPTION_BUTTON_REVEAL_DURATION = 0.85;
const OPTION_BUTTON_REVEAL_START = 'top 92%';
const OPTION_MEDIA_PARALLAX_DISTANCE = 8.5;
const OPTION_MEDIA_SCALE = 1.18;

let gsapApiPromise;
let splitTextApiPromise;
let fontsReadyPromise;
let motionInitialized = false;
const optionTextSplits = new Map();

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

const waitForFonts = () => {
  if (!fontsReadyPromise) {
    fontsReadyPromise =
      document.fonts?.ready?.catch(() => {}) || Promise.resolve();
  }

  return fontsReadyPromise;
};

export const loadSplitText = async (gsap) => {
  if (!splitTextApiPromise) {
    splitTextApiPromise = Promise.all([
      import('gsap/SplitText'),
      waitForFonts(),
    ]).then(([splitTextModule]) => {
      const SplitText = splitTextModule.SplitText || splitTextModule.default;

      gsap.registerPlugin(SplitText);

      return SplitText;
    });
  }

  return splitTextApiPromise;
};

const getMotionElements = () => Array.from(document.querySelectorAll('[data-motion]'));

const getCategoryBlocks = () => Array.from(document.querySelectorAll(CATEGORY_BLOCK_SELECTOR));

const getOptionBlocks = () => Array.from(document.querySelectorAll(OPTION_BLOCK_SELECTOR));

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

  optionTextSplits.forEach((split) => split.revert());
  optionTextSplits.clear();
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
  document.querySelectorAll(`.${OPTION_LINE_READY_CLASS}`).forEach((element) => {
    element.classList.remove(OPTION_LINE_READY_CLASS);
  });

  document.querySelectorAll(`.${OPTION_DOT_CLASS}`).forEach((element) => {
    element.classList.remove(OPTION_DOT_CLASS);
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
    element.style.removeProperty('visibility');
  });

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

const hasReadableText = (element) =>
  Boolean(element.textContent?.replace(/\s+/g, ' ').trim());

const getOptionTextElements = (block) => Array.from(block.querySelectorAll(OPTION_TEXT_SELECTOR))
  .filter((element) => {
    if (!hasReadableText(element)) {
      return false;
    }

    return !element.closest(OPTION_TEXT_EXCLUDE_SELECTOR);
  });

const getOptionDotElements = (block) => Array.from(block.querySelectorAll(OPTION_DOT_SELECTOR))
  .filter((element) => !element.closest(OPTION_TEXT_EXCLUDE_SELECTOR));

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

const splitOptionTextLines = (SplitText, element) => {
  const existingSplit = optionTextSplits.get(element);

  if (existingSplit) {
    existingSplit.revert();
    optionTextSplits.delete(element);
  }

  const split = SplitText.create(element, {
    aria: 'auto',
    linesClass: OPTION_LINE_CLASS,
    mask: 'lines',
    type: 'lines',
  });

  optionTextSplits.set(element, split);
  element.classList.add(OPTION_LINE_READY_CLASS);

  return split.lines || [];
};

const sortElementsByDocumentOrder = (elements) => elements.sort((first, second) => {
  if (first === second) {
    return 0;
  }

  return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_PRECEDING
    ? 1
    : -1;
});

const initOptionTextReveal = (gsap, SplitText, block) => {
  const lines = getOptionTextElements(block)
    .flatMap((element) => splitOptionTextLines(SplitText, element));
  const dots = getOptionDotElements(block);
  const revealItems = sortElementsByDocumentOrder([...lines, ...dots]);

  if (!revealItems.length) {
    return;
  }

  dots.forEach((dot) => dot.classList.add(OPTION_DOT_CLASS));

  gsap.set(revealItems, {
    autoAlpha: 0,
    yPercent: 112,
  });

  const timeline = gsap.timeline({
    scrollTrigger: {
      invalidateOnRefresh: true,
      start: OPTION_TEXT_REVEAL_START,
      toggleActions: 'play none none reverse',
      trigger: block,
    },
  });

  timeline.to(revealItems, {
    autoAlpha: 1,
    duration: OPTION_TEXT_REVEAL_DURATION,
    ease: 'power4.out',
    stagger: OPTION_TEXT_REVEAL_STAGGER,
    yPercent: 0,
  });

  storeAnimation(timeline);
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

  frame.classList.add(OPTION_MEDIA_FRAME_CLASS);
  applyOptionMediaFrameRadius(frame, media);
  media.classList.add(OPTION_MEDIA_TARGET_CLASS);

  if (media instanceof HTMLImageElement && !media.complete) {
    media.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }

  storeAnimation(
    gsap.fromTo(
      media,
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

const initOptionBlockMotion = async (gsap, ScrollTrigger, optionBlocks) => {
  if (!optionBlocks.length) {
    return;
  }

  const SplitText = await loadSplitText(gsap);

  optionBlocks.forEach((block) => {
    initOptionTextReveal(gsap, SplitText, block);
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
  const optionBlocks = getOptionBlocks();

  if (!motionElements.length && !heroImage && !categoryBlocks.length && !optionBlocks.length) {
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

  const { gsap, ScrollTrigger } = await loadGsap();

  if (reducedMotionMedia.matches) {
    document.documentElement.classList.remove('virtura-motion-ready');
    clearAnimations();
    resetMotionElements();
    resetCategoryRevealElements();
    resetOptionMotionElements();
    return;
  }

  initHeroImageScale(gsap, ScrollTrigger);
  initScrollReveal(gsap, motionElements);
  initCategoryBlockReveal(gsap, categoryBlocks);
  await initOptionBlockMotion(gsap, ScrollTrigger, optionBlocks);

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
