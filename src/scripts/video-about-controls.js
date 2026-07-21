const VIDEO_ABOUT_SELECTOR = '.video-about';
const VIDEO_SELECTOR = 'video';
const PLAYING_CLASS = 'is-video-playing';
const PAUSED_CLASS = 'is-video-paused';

const isBricksBuilder = () => (
  document.body.classList.contains('bricks-is-builder')
  || document.documentElement.classList.contains('bricks-is-builder')
);

const syncVideoState = (container, video) => {
  const isPlaying = !video.paused && !video.ended;

  container.classList.toggle(PLAYING_CLASS, isPlaying);
  container.classList.toggle(PAUSED_CLASS, !isPlaying);
  container.setAttribute(
    'aria-label',
    isPlaying ? 'Zatrzymaj film' : 'Odtwórz film',
  );
};

const toggleVideo = async (container, video) => {
  if (!video.paused && !video.ended) {
    video.pause();
    return;
  }

  if (video.ended) {
    video.currentTime = 0;
  }

  try {
    await video.play();
  } catch {
    syncVideoState(container, video);
  }
};

const initVideoAboutControl = (container) => {
  if (container.dataset.virturaVideoControls === 'true') {
    return;
  }

  const video = container.querySelector(VIDEO_SELECTOR);

  if (!(video instanceof HTMLVideoElement)) {
    return;
  }

  container.dataset.virturaVideoControls = 'true';
  video.removeAttribute('onclick');
  video.onclick = null;

  if (!container.matches('a[href], button')) {
    container.setAttribute('role', 'button');

    if (!container.hasAttribute('tabindex')) {
      container.tabIndex = 0;
    }
  }

  const syncState = () => syncVideoState(container, video);

  ['play', 'playing', 'pause', 'ended', 'emptied', 'loadeddata'].forEach(
    (eventName) => video.addEventListener(eventName, syncState),
  );

  container.addEventListener('click', (event) => {
    if (event instanceof MouseEvent && event.button !== 0) {
      return;
    }

    void toggleVideo(container, video);
  });

  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
      return;
    }

    event.preventDefault();
    void toggleVideo(container, video);
  });

  syncState();
};

export const initVideoAboutControls = () => {
  if (isBricksBuilder()) {
    return;
  }

  document.querySelectorAll(VIDEO_ABOUT_SELECTOR).forEach(initVideoAboutControl);
};
