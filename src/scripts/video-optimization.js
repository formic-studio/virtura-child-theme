const LAZY_VIDEO_SELECTOR = 'video[data-virtura-video-lazy="true"]';
const MAX_CONCURRENT_VIDEO_STARTS = 2;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const VIDEO_START_TIMEOUT = 10000;
const VIDEO_AUTOPLAY_HOLD_ATTRIBUTE = 'data-virtura-video-autoplay-hold';
const reducedMotionMedia = window.matchMedia(REDUCED_MOTION_QUERY);
const initializedVideos = new WeakSet();
const queuedVideos = new WeakSet();
const videoStartQueue = [];
let activeVideoStarts = 0;
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

const isVideoAutoplayHeld = (video) => (
  video.hasAttribute(VIDEO_AUTOPLAY_HOLD_ATTRIBUTE)
);

export const ensureVideoLoaded = (
  video,
  { allowAutoplay = true, preload = 'metadata' } = {},
) => {
  if (!(video instanceof HTMLVideoElement)) {
    return false;
  }

  revealPoster(video);

  const sourcesChanged = restoreVideoSources(video);

  if (sourcesChanged) {
    video.preload = preload;
    video.load();
  }

  video.dataset.virturaVideoLoaded = 'true';

  if (
    allowAutoplay
    && !reducedMotionMedia.matches
    && !isVideoAutoplayHeld(video)
    && video.dataset.virturaVideoAutoplay === 'true'
  ) {
    video.autoplay = true;
    void video.play().catch(() => {});
  }

  return sourcesChanged;
};

const waitForFirstFrame = (video) => {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', finish);
      video.removeEventListener('error', finish);
      video.removeEventListener('abort', finish);
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    video.addEventListener('abort', finish, { once: true });
    timeoutId = window.setTimeout(finish, VIDEO_START_TIMEOUT);
  });
};

const drainVideoStartQueue = () => {
  while (
    activeVideoStarts < MAX_CONCURRENT_VIDEO_STARTS
    && videoStartQueue.length
  ) {
    const video = videoStartQueue.shift();

    queuedVideos.delete(video);

    if (
      !(video instanceof HTMLVideoElement)
      || video.dataset.virturaVideoNear !== 'true'
      || reducedMotionMedia.matches
    ) {
      continue;
    }

    if (video.dataset.virturaVideoLoaded === 'true') {
      ensureVideoLoaded(video);
      continue;
    }

    activeVideoStarts += 1;

    const frameReady = waitForFirstFrame(video);

    ensureVideoLoaded(video);

    void frameReady.finally(() => {
      activeVideoStarts = Math.max(0, activeVideoStarts - 1);
      drainVideoStartQueue();
    });
  }
};

const queueVideoStart = (video) => {
  if (
    !(video instanceof HTMLVideoElement)
    || queuedVideos.has(video)
    || reducedMotionMedia.matches
  ) {
    return;
  }

  queuedVideos.add(video);
  videoStartQueue.push(video);
  drainVideoStartQueue();
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
    const video = entry.target;

    if (!entry.isIntersecting) {
      video.dataset.virturaVideoNear = 'false';

      if (video.dataset.virturaVideoAutoplay === 'true') {
        video.autoplay = false;
        video.removeAttribute('autoplay');
        video.pause();
      }

      return;
    }

    video.dataset.virturaVideoNear = 'true';
    revealPoster(video);

    if (!reducedMotionMedia.matches) {
      queueVideoStart(video);
    }
  });
};

const getObserver = () => {
  if (observer || !('IntersectionObserver' in window)) {
    return observer;
  }

  observer = new IntersectionObserver(handleIntersection, {
    rootMargin: '100px 0px',
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
    video.dataset.virturaVideoNear = 'true';
    queueVideoStart(video);
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

    if (
      video.dataset.virturaVideoAutoplay === 'true'
      && !isVideoAutoplayHeld(video)
    ) {
      video.autoplay = true;
    }

    if (video.dataset.virturaVideoNear === 'true') {
      queueVideoStart(video);
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
