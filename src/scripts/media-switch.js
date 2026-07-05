const MEDIA_SWITCH_SELECTOR = '.media-switch, [data-media-switch], .archive-block';
const IMAGE_SELECTOR = '.media-switch-img, [data-media-switch-image]';
const VIDEO_SELECTOR = '.media-switch-video, [data-media-switch-video]';
const HIDDEN_CLASS = 'virtura-media-hidden';

const IMAGE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);

const VIDEO_EXTENSIONS = new Set([
  'avi',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'ogv',
  'webm',
]);

const getCleanExtension = (url) => {
  if (!url || url.startsWith('data:')) {
    return '';
  }

  try {
    const pathname = new URL(url, window.location.href).pathname;
    const filename = pathname.split('/').pop() || '';
    const extension = filename.split('.').pop() || '';

    return extension.toLowerCase();
  } catch {
    const pathname = url.split('?')[0].split('#')[0];
    const extension = pathname.split('.').pop() || '';

    return extension.toLowerCase();
  }
};

const detectMediaType = (url, mimeType = '') => {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.startsWith('image/')) {
    return 'image';
  }

  if (normalizedMimeType.startsWith('video/')) {
    return 'video';
  }

  const extension = getCleanExtension(url);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }

  return '';
};

const getImageElement = (container) => {
  if (container instanceof HTMLImageElement) {
    return container;
  }

  return container.querySelector('img');
};

const getVideoElement = (container) => {
  if (container instanceof HTMLVideoElement) {
    return container;
  }

  return container.querySelector('video');
};

const getImageSource = (container) => {
  const image = getImageElement(container);

  if (!image) {
    return '';
  }

  return (
    image.currentSrc ||
    image.getAttribute('src') ||
    image.dataset.src ||
    image.getAttribute('data-src') ||
    ''
  );
};

const getVideoSource = (container) => {
  const video = getVideoElement(container);

  if (!video) {
    return {
      mimeType: '',
      url: '',
    };
  }

  const source = video.querySelector('source');

  return {
    mimeType: source?.type || video.getAttribute('type') || '',
    url:
      video.currentSrc ||
      video.getAttribute('src') ||
      source?.getAttribute('src') ||
      video.dataset.src ||
      video.getAttribute('data-src') ||
      '',
  };
};

const setHidden = (element, hidden) => {
  if (!element) {
    return;
  }

  element.classList.toggle(HIDDEN_CLASS, hidden);
  element.setAttribute('aria-hidden', String(hidden));
};

const pauseHiddenVideo = (videoContainer) => {
  const video = videoContainer ? getVideoElement(videoContainer) : null;

  if (video && !video.paused) {
    video.pause();
  }
};

const getMediaType = (imageContainer, videoContainer) => {
  const videoSource = getVideoSource(videoContainer);
  const imageSource = getImageSource(imageContainer);
  const videoType = detectMediaType(videoSource.url, videoSource.mimeType);
  const imageType = detectMediaType(imageSource);

  if (videoType) {
    return videoType;
  }

  if (imageType) {
    return imageType;
  }

  return '';
};

const syncMediaSwitch = (container) => {
  const imageContainer = container.querySelector(IMAGE_SELECTOR) ||
    container.querySelector('.archive-img');
  const videoContainer = container.querySelector(VIDEO_SELECTOR) ||
    container.querySelector('.brxe-video');

  if (!imageContainer || !videoContainer) {
    return;
  }

  const mediaType = getMediaType(imageContainer, videoContainer);

  if (mediaType === 'image') {
    setHidden(imageContainer, false);
    setHidden(videoContainer, true);
    pauseHiddenVideo(videoContainer);
    return;
  }

  if (mediaType === 'video') {
    setHidden(imageContainer, true);
    setHidden(videoContainer, false);
    return;
  }

  setHidden(imageContainer, false);
  setHidden(videoContainer, true);
  pauseHiddenVideo(videoContainer);
};

const getMediaSwitchContainers = () => {
  const containers = new Set(document.querySelectorAll(MEDIA_SWITCH_SELECTOR));

  document.querySelectorAll(`${IMAGE_SELECTOR}, ${VIDEO_SELECTOR}`).forEach((element) => {
    const explicitContainer = element.closest(MEDIA_SWITCH_SELECTOR);

    containers.add(explicitContainer || element.parentElement);
  });

  return Array.from(containers).filter((container) => container instanceof HTMLElement);
};

const syncMediaSwitches = () => {
  getMediaSwitchContainers().forEach(syncMediaSwitch);
};

let mediaSwitchFrame = 0;
let mediaSwitchInitialized = false;

const scheduleMediaSwitchSync = () => {
  if (mediaSwitchFrame) {
    return;
  }

  mediaSwitchFrame = window.requestAnimationFrame(() => {
    mediaSwitchFrame = 0;
    syncMediaSwitches();
  });
};

export const initMediaSwitch = () => {
  syncMediaSwitches();

  if (mediaSwitchInitialized) {
    return;
  }

  document.addEventListener('bricks/ajax/query_result/displayed', scheduleMediaSwitchSync);
  document.addEventListener('bricks/ajax/end', scheduleMediaSwitchSync);

  if ('MutationObserver' in window && document.body) {
    const observer = new MutationObserver(scheduleMediaSwitchSync);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  mediaSwitchInitialized = true;
};
