const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = [];

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

  if (!motionElements.length) {
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

  const { gsap } = await loadGsap();

  if (reducedMotionMedia.matches) {
    document.documentElement.classList.remove('virtura-motion-ready');
    clearAnimations();
    resetMotionElements();
    return;
  }

  initScrollReveal(gsap, motionElements);
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
