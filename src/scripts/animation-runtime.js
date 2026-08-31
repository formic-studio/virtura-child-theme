let gsapApiPromise;
let splitTextApiPromise;
let fontsReadyPromise;

const waitForFonts = () => {
  if (!fontsReadyPromise) {
    fontsReadyPromise =
      document.fonts?.ready?.catch(() => {}) || Promise.resolve();
  }

  return fontsReadyPromise;
};

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
