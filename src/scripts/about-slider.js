const SLIDER_SELECTOR = '.about-slider';
const IMAGE_SELECTOR = '.slider-img-item';
const TEXT_SELECTOR = '.slider-text-block';
const CONTROLS_SELECTOR = '.slider-paggination .svg-arrow-block';
const ACTIVE_CLASS = 'is-active';
const READY_CLASS = 'virtura-about-slider-ready';
const PREV_LABEL = 'Poprzedni slajd';
const NEXT_LABEL = 'Następny slajd';
const SWIPE_THRESHOLD = 40;

const normalizeIndex = (index, length) => ((index % length) + length) % length;

const setSlideState = (items, index) => {
  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;

    item.classList.toggle(ACTIVE_CLASS, isActive);
    item.setAttribute('aria-hidden', String(!isActive));
    item.style.transform = `translate3d(${index * -100}%, 0, 0)`;
  });
};

const setupControl = (control, label, onClick) => {
  control.setAttribute('aria-label', label);
  control.setAttribute('role', 'button');
  control.setAttribute('tabindex', '0');

  control.addEventListener('click', onClick);
  control.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onClick();
  });
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

  const goTo = (nextIndex) => {
    activeIndex = normalizeIndex(nextIndex, slideCount);
    slides.forEach((items) => setSlideState(items, activeIndex));
    slider.dataset.activeSlide = String(activeIndex + 1);
  };

  setupControl(controls[0], PREV_LABEL, () => goTo(activeIndex - 1));
  setupControl(controls[1], NEXT_LABEL, () => goTo(activeIndex + 1));

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
  goTo(0);
};

export const initAboutSlider = () => {
  document.querySelectorAll(SLIDER_SELECTOR).forEach(initSlider);
};
