import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const fastScrollEasing = (progress) => 1 - Math.pow(1 - progress, 4);

let smoothScrollInstance;
const smoothScrollListeners = new Set();

const isBricksBuilder = () => (
  document.body.classList.contains('bricks-is-builder')
  || document.documentElement.classList.contains('bricks-is-builder')
);

const createLenis = () => new Lenis({
  anchors: true,
  autoRaf: true,
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

export const addSmoothScrollListener = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  smoothScrollListeners.add(listener);
  smoothScrollInstance?.on('scroll', listener);

  return () => {
    smoothScrollListeners.delete(listener);
    smoothScrollInstance?.off('scroll', listener);
  };
};

export const scrollToPosition = (
  target,
  {
    duration = 0.8,
    immediate = reducedMotionMedia.matches,
    onComplete,
  } = {},
) => {
  if (!Number.isFinite(target)) {
    return false;
  }

  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const destination = Math.min(Math.max(0, target), maxScroll);

  if (immediate) {
    window.scrollTo(0, destination);
    onComplete?.();
    return true;
  }

  if (smoothScrollInstance) {
    smoothScrollInstance.resize();
    smoothScrollInstance.scrollTo(destination, {
      duration,
      easing: fastScrollEasing,
      force: true,
      lock: true,
      onComplete,
    });
    return true;
  }

  window.scrollTo({
    behavior: 'smooth',
    left: 0,
    top: destination,
  });
  window.setTimeout(() => onComplete?.(), duration * 1000);

  return true;
};

export const destroySmoothScroll = () => {
  smoothScrollInstance?.destroy();
  smoothScrollInstance = undefined;
};

export const initSmoothScroll = async () => {
  if (smoothScrollInstance || reducedMotionMedia.matches || isBricksBuilder()) {
    return smoothScrollInstance;
  }

  smoothScrollInstance = createLenis();
  smoothScrollListeners.forEach((listener) => {
    smoothScrollInstance.on('scroll', listener);
  });

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
