import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { loadGsap } from './motion.js';

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

let smoothScrollInstance;
let gsapTickerCallback;

const isBricksBuilder = () => (
  document.body.classList.contains('bricks-is-builder')
  || document.documentElement.classList.contains('bricks-is-builder')
);

const createLenis = () => new Lenis({
  anchors: true,
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  gestureOrientation: 'vertical',
  infinite: false,
  orientation: 'vertical',
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 2,
  wheelMultiplier: 1,
});

export const destroySmoothScroll = () => {
  if (gsapTickerCallback) {
    void loadGsap().then(({ gsap }) => {
      gsap.ticker.remove(gsapTickerCallback);
    });
  }

  gsapTickerCallback = undefined;
  smoothScrollInstance?.destroy();
  smoothScrollInstance = undefined;
};

export const initSmoothScroll = async () => {
  if (smoothScrollInstance || reducedMotionMedia.matches || isBricksBuilder()) {
    return smoothScrollInstance;
  }

  const { gsap, ScrollTrigger } = await loadGsap();

  if (reducedMotionMedia.matches || isBricksBuilder()) {
    return undefined;
  }

  smoothScrollInstance = createLenis();
  smoothScrollInstance.on('scroll', ScrollTrigger.update);

  gsapTickerCallback = (time) => {
    smoothScrollInstance?.raf(time * 1000);
  };

  gsap.ticker.add(gsapTickerCallback);
  gsap.ticker.lagSmoothing(0);

  return smoothScrollInstance;
};

if ('addEventListener' in reducedMotionMedia) {
  reducedMotionMedia.addEventListener('change', () => {
    if (reducedMotionMedia.matches) {
      destroySmoothScroll();
      return;
    }

    void initSmoothScroll();
  });
}
