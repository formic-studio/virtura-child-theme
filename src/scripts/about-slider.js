const SLIDER_SELECTOR = '.about-slider';
const IMAGE_SELECTOR = '.slider-img-item';
const TEXT_SELECTOR = '.slider-text-block';
const CONTROLS_SELECTOR = '.slider-paggination .svg-arrow-block';
const ACTIVE_CLASS = 'is-active';
const DISABLED_CLASS = 'is-disabled';
const READY_CLASS = 'virtura-about-slider-ready';
const GSAP_CLASS = 'virtura-about-slider-gsap';
const PREV_LABEL = 'Poprzedni slajd';
const NEXT_LABEL = 'Następny slajd';
const ANIMATION_DURATION = 0.92;
const ANIMATION_EASE = 'power3.out';
const SWIPE_THRESHOLD = 40;

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

let gsapPromise;

const loadSliderGsap = async () => {
  if (!gsapPromise) {
    gsapPromise = import('gsap').then((gsapModule) => gsapModule.gsap || gsapModule.default);
  }

  return gsapPromise;
};

const clampIndex = (index, length) => Math.min(Math.max(index, 0), length - 1);

const setSlideState = (items, index, { animate = true } = {}) => {
  const xPercent = index * -100;

  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;

    item.classList.toggle(ACTIVE_CLASS, isActive);
    item.setAttribute('aria-hidden', String(!isActive));
  });

  if (!animate || reducedMotionMedia.matches) {
    items.forEach((item) => {
      item.style.transform = `translate3d(${xPercent}%, 0, 0)`;
    });

    return;
  }

  void loadSliderGsap()
    .then((gsap) => {
      const slider = items[0]?.closest(SLIDER_SELECTOR);

      slider?.classList.add(GSAP_CLASS);
      gsap.to(items, {
        duration: ANIMATION_DURATION,
        ease: ANIMATION_EASE,
        force3D: true,
        overwrite: 'auto',
        xPercent,
      });
    })
    .catch(() => {
      items.forEach((item) => {
        item.style.transform = `translate3d(${xPercent}%, 0, 0)`;
      });
    });
};

const setControlState = (control, isDisabled) => {
  control.classList.toggle(DISABLED_CLASS, isDisabled);
  control.setAttribute('aria-disabled', String(isDisabled));
  control.setAttribute('tabindex', isDisabled ? '-1' : '0');
};

const setupControl = (control, label, onClick) => {
  control.setAttribute('aria-label', label);
  control.setAttribute('role', 'button');
  control.setAttribute('tabindex', '0');

  control.addEventListener('click', onClick);
  control.addEventListener('keydown', (event) => {
    if (control.getAttribute('aria-disabled') === 'true') {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onClick();
  });
};

const updateControls = (controls, activeIndex, slideCount) => {
  setControlState(controls[0], activeIndex === 0);
  setControlState(controls[1], activeIndex === slideCount - 1);
};

const initSlider = (slider) => {
  if (slider.classList.contains(READY_CLASS)) {
    return;
  }

  const images = Array.from(slider.querySelectorAll(IMAGE_SELECTOR));
  const textBlocks = Array.from(slider.querySelectorAll(TEXT_SELECTOR));
  const controls = Array.from(slider.querySelectorAll(CONTROLS_SELECTOR));
  const slideCount = Math.min(images.length, textBlocks.length);

  if (slideCount < 2 || controls.length < 2) {
    return;
  }

  const slides = [images.slice(0, slideCount), textBlocks.slice(0, slideCount)];
  let activeIndex = 0;
  let touchStartX = null;

  const goTo = (nextIndex, options) => {
    const clampedIndex = clampIndex(nextIndex, slideCount);

    if (clampedIndex === activeIndex && options?.force !== true) {
      return;
    }

    activeIndex = clampedIndex;
    slides.forEach((items) => setSlideState(items, activeIndex, options));
    updateControls(controls, activeIndex, slideCount);
    slider.dataset.activeSlide = String(activeIndex + 1);
  };

  setupControl(controls[0], PREV_LABEL, () => {
    if (activeIndex > 0) {
      goTo(activeIndex - 1);
    }
  });

  setupControl(controls[1], NEXT_LABEL, () => {
    if (activeIndex < slideCount - 1) {
      goTo(activeIndex + 1);
    }
  });

  slider.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0]?.clientX ?? null;
  }, { passive: true });

  slider.addEventListener('touchend', (event) => {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = touchEndX - touchStartX;

    touchStartX = null;

    if (Math.abs(distance) < SWIPE_THRESHOLD) {
      return;
    }

    goTo(distance < 0 ? activeIndex + 1 : activeIndex - 1);
  }, { passive: true });

  slider.classList.add(READY_CLASS);
  slider.setAttribute('aria-roledescription', 'carousel');
  goTo(0, { animate: false, force: true });
};

export const initAboutSlider = () => {
  document.querySelectorAll(SLIDER_SELECTOR).forEach(initSlider);
};
