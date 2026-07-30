const LAZY_VIDEO_SELECTOR = 'video[data-virtura-video-lazy="true"]';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const reducedMotionMedia = window.matchMedia(REDUCED_MOTION_QUERY);
const initializedVideos = new WeakSet();
let observer = null;
let mutationObserver = null;

const restoreAttribute = (element, name) => {
  const dataName = `data-${name}`;
  const value = element.getAttribute(dataName);

  if (!value || element.hasAttribute(name)) {
    return false;
  }

  element.setAttribute(name, value);
  element.removeAttribute(dataName);

  return true;
};

const revealPoster = (video) => {
  restoreAttribute(video, 'poster');
};

const restoreVideoSources = (video) => {
  let changed = restoreAttribute(video, 'src');

  video.querySelectorAll('source[data-src]').forEach((source) => {
    changed = restoreAttribute(source, 'src') || changed;
  });

  return changed;
};

export const ensureVideoLoaded = (video, { allowAutoplay = true } = {}) => {
  if (!(video instanceof HTMLVideoElement)) {
    return false;
  }

  revealPoster(video);

  const sourcesChanged = restoreVideoSources(video);

  if (sourcesChanged) {
    video.preload = video.dataset.virturaVideoAutoplay === 'true' ? 'auto' : 'metadata';
    video.load();
  }

  video.dataset.virturaVideoLoaded = 'true';

  if (
    allowAutoplay
    && !reducedMotionMedia.matches
    && video.dataset.virturaVideoAutoplay === 'true'
  ) {
    video.autoplay = true;
    void video.play().catch(() => {});
  }

  return sourcesChanged;
};

const pauseForReducedMotion = (video) => {
  if (video.hasAttribute('autoplay')) {
    video.dataset.virturaVideoAutoplay = 'true';
  }

  video.autoplay = false;
  video.removeAttribute('autoplay');
  video.pause();
};

const handleIntersection = (entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }

    const video = entry.target;

    video.dataset.virturaVideoNear = 'true';
    revealPoster(video);

    if (!reducedMotionMedia.matches) {
      ensureVideoLoaded(video);
    }

    observer?.unobserve(video);
  });
};

const getObserver = () => {
  if (observer || !('IntersectionObserver' in window)) {
    return observer;
  }

  observer = new IntersectionObserver(handleIntersection, {
    rootMargin: '600px 0px',
    threshold: 0.01,
  });

  return observer;
};

const initVideo = (video) => {
  if (!(video instanceof HTMLVideoElement) || initializedVideos.has(video)) {
    return;
  }

  initializedVideos.add(video);

  if (reducedMotionMedia.matches) {
    pauseForReducedMotion(video);
  }

  const videoObserver = getObserver();

  if (videoObserver) {
    videoObserver.observe(video);
    return;
  }

  revealPoster(video);

  if (!reducedMotionMedia.matches) {
    ensureVideoLoaded(video);
  }
};

const initVideos = (root = document) => {
  if (root instanceof HTMLVideoElement && root.matches(LAZY_VIDEO_SELECTOR)) {
    initVideo(root);
  }

  root.querySelectorAll?.(LAZY_VIDEO_SELECTOR).forEach(initVideo);

  root.querySelectorAll?.('video[autoplay]').forEach((video) => {
    if (reducedMotionMedia.matches) {
      pauseForReducedMotion(video);
    }
  });
};

const getInteractedVideo = (target) => {
  if (!(target instanceof Element)) {
    return null;
  }

  if (target instanceof HTMLVideoElement) {
    return target;
  }

  return target.closest('.video-about, .brxe-video')?.querySelector('video') || null;
};

const handleUserIntent = (event) => {
  const video = getInteractedVideo(event.target);

  if (video?.matches(LAZY_VIDEO_SELECTOR)) {
    ensureVideoLoaded(video, { allowAutoplay: false });
  }
};

const handleReducedMotionChange = (event) => {
  document.querySelectorAll('video').forEach((video) => {
    if (event.matches) {
      pauseForReducedMotion(video);
      return;
    }

    if (video.dataset.virturaVideoAutoplay === 'true') {
      video.autoplay = true;
    }

    if (video.dataset.virturaVideoNear === 'true') {
      ensureVideoLoaded(video);
    }
  });
};

export const initVideoOptimization = () => {
  initVideos();

  document.addEventListener('pointerdown', handleUserIntent, true);
  document.addEventListener('keydown', handleUserIntent, true);

  if ('MutationObserver' in window && document.body && !mutationObserver) {
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            initVideos(node);
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (typeof reducedMotionMedia.addEventListener === 'function') {
    reducedMotionMedia.addEventListener('change', handleReducedMotionChange);
  } else {
    reducedMotionMedia.addListener(handleReducedMotionChange);
  }
};
