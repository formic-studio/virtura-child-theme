import '../styles/admin-video-poster.css';

const config = window.virturaVideoPosterConfig || {};
const activeJobs = new Map();
const autoAttempted = new Set();
const watchedUploads = new WeakSet();
let watchedQueue = null;
const VIDEO_EXTENSIONS = new Set(['m4v', 'mov', 'mp4', 'ogv', 'webm']);

const getMessage = (key, fallback) => config.messages?.[key] || fallback;
const getDecodeError = () => new Error(
  getMessage('decodeError', 'Przeglądarka nie mogła odczytać klatki tego filmu.'),
);

const getExtension = (url = '') => {
  try {
    const pathname = new URL(url, window.location.href).pathname;
    return (pathname.split('.').pop() || '').toLowerCase();
  } catch {
    return (url.split('?')[0].split('.').pop() || '').toLowerCase();
  }
};

const isVideoModel = (model) => {
  const mime = String(model?.get?.('mime') || model?.get?.('mime_type') || '');
  const type = String(model?.get?.('type') || '');
  const url = String(model?.get?.('url') || model?.get?.('filename') || '');

  return mime.startsWith('video/') || type === 'video' || VIDEO_EXTENSIONS.has(getExtension(url));
};

const waitForEvent = (target, eventName, errorEvents = ['error'], timeout = 30000) => (
  new Promise((resolve, reject) => {
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, handleSuccess);
      errorEvents.forEach((name) => target.removeEventListener(name, handleError));
    };

    const handleSuccess = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(getDecodeError());
    };

    target.addEventListener(eventName, handleSuccess, { once: true });
    errorEvents.forEach((name) => target.addEventListener(name, handleError, { once: true }));
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(getDecodeError());
    }, timeout);
  })
);

const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
  const quality = Number(config.quality) || 0.82;

  canvas.toBlob((webpBlob) => {
    if (webpBlob?.type === 'image/webp') {
      resolve(webpBlob);
      return;
    }

    canvas.toBlob((jpegBlob) => {
      if (jpegBlob?.type === 'image/jpeg') {
        resolve(jpegBlob);
        return;
      }

      reject(getDecodeError());
    }, 'image/jpeg', quality);
  }, 'image/webp', quality);
});

const capturePoster = async (videoUrl) => {
  const video = document.createElement('video');
  const sourceUrl = new URL(videoUrl, window.location.href);

  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  if (sourceUrl.origin !== window.location.origin) {
    video.crossOrigin = 'anonymous';
  }

  video.src = sourceUrl.href;

  try {
    await waitForEvent(video, 'loadedmetadata');

    if (!video.videoWidth || !video.videoHeight) {
      throw getDecodeError();
    }

    const requestedTime = Math.max(0, Number(config.captureTime) || 0.1);
    const duration = Number.isFinite(video.duration) ? video.duration : requestedTime;
    const captureTime = Math.min(requestedTime, Math.max(0, duration - 0.01));

    if (captureTime > 0) {
      const frameReady = waitForEvent(video, 'seeked');
      video.currentTime = captureTime;
      await frameReady;
    } else if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForEvent(video, 'loadeddata');
    }

    const maxWidth = Math.max(320, Number(config.maxWidth) || 1920);
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      throw getDecodeError();
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await canvasToBlob(canvas);
  } finally {
    video.removeAttribute('src');
    video.load();
  }
};

const uploadPoster = async (attachmentId, blob) => {
  const formData = new FormData();
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';

  formData.append('action', 'virtura_generate_video_poster');
  formData.append('nonce', config.nonce || '');
  formData.append('attachmentId', String(attachmentId));
  formData.append('poster', blob, `video-poster.${extension}`);

  const response = await fetch(config.ajaxUrl, {
    body: formData,
    credentials: 'same-origin',
    method: 'POST',
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.data?.message || getMessage('error', 'Nie udało się utworzyć postera.'));
  }

  return payload.data;
};

const generatePoster = (attachmentId, videoUrl) => {
  const id = Number(attachmentId);

  if (!id || !videoUrl || !config.ajaxUrl || !config.nonce) {
    return Promise.reject(new Error(getMessage('error', 'Nie udało się utworzyć postera.')));
  }

  if (activeJobs.has(id)) {
    return activeJobs.get(id);
  }

  const job = capturePoster(videoUrl)
    .then((blob) => uploadPoster(id, blob))
    .finally(() => activeJobs.delete(id));

  activeJobs.set(id, job);

  return job;
};

const updateControl = (control, state, message = '', posterUrl = '') => {
  if (!(control instanceof HTMLElement)) {
    return;
  }

  const button = control.querySelector('[data-virtura-video-poster-generate]');
  const status = control.querySelector('[data-virtura-video-poster-status]');
  const preview = control.querySelector('[data-virtura-video-poster-preview]');
  const image = preview?.querySelector('img');

  control.dataset.state = state;

  if (button instanceof HTMLButtonElement) {
    button.disabled = state === 'loading';

    if (state === 'success') {
      button.textContent = 'Wygeneruj ponownie';
    }
  }

  if (status) {
    status.textContent = message;
  }

  if (posterUrl && preview && image instanceof HTMLImageElement) {
    image.src = posterUrl;
    preview.hidden = false;
  }
};

const generateFromControl = async (control) => {
  const attachmentId = Number(control.dataset.attachmentId);
  const videoUrl = control.dataset.videoUrl || '';

  updateControl(control, 'loading', getMessage('creating', 'Tworzę poster…'));

  try {
    const result = await generatePoster(attachmentId, videoUrl);
    updateControl(
      control,
      'success',
      result.message || getMessage('ready', 'Poster został zapisany.'),
      result.posterUrl || '',
    );
  } catch (error) {
    updateControl(
      control,
      'error',
      error instanceof Error ? error.message : getMessage('error', 'Nie udało się utworzyć postera.'),
    );
  }
};

const handleControlClick = (event) => {
  const button = event.target.closest?.('[data-virtura-video-poster-generate]');

  if (!button) {
    return;
  }

  const control = button.closest('[data-virtura-video-poster-control]');

  if (control instanceof HTMLElement) {
    void generateFromControl(control);
  }
};

const tryAutoGenerate = (model) => {
  if (!isVideoModel(model)) {
    return;
  }

  const attachmentId = Number(model.get('id'));
  const videoUrl = String(model.get('url') || '');
  const poster = model.get('virturaVideoPoster');
  const isUploading = model.get('uploading') === true;

  if (
    !attachmentId
    || !videoUrl
    || isUploading
    || Number(poster?.id) > 0
    || activeJobs.has(attachmentId)
    || autoAttempted.has(attachmentId)
  ) {
    return;
  }

  autoAttempted.add(attachmentId);

  void generatePoster(attachmentId, videoUrl)
    .then((result) => {
      model.set('virturaVideoPoster', {
        id: Number(result.posterId) || 0,
        url: result.posterUrl || '',
      });

      document
        .querySelectorAll(`[data-virtura-video-poster-control][data-attachment-id="${attachmentId}"]`)
        .forEach((control) => {
          updateControl(
            control,
            'success',
            result.message || getMessage('ready', 'Poster został zapisany.'),
            result.posterUrl || '',
          );
        });
    })
    .catch((error) => {
      document
        .querySelectorAll(`[data-virtura-video-poster-control][data-attachment-id="${attachmentId}"]`)
        .forEach((control) => {
          updateControl(
            control,
            'error',
            error instanceof Error ? error.message : getMessage('error', 'Nie udało się utworzyć postera.'),
          );
        });
    });
};

const watchUpload = (model) => {
  if (!model?.on || watchedUploads.has(model)) {
    return;
  }

  watchedUploads.add(model);

  const check = () => window.setTimeout(() => tryAutoGenerate(model), 0);

  model.on('change:id change:url change:mime change:type change:uploading sync', check);
  check();
};

const watchWordPressUploader = () => {
  const queue = window.wp?.Uploader?.queue;

  if (!queue?.on || watchedQueue === queue) {
    return Boolean(queue?.on);
  }

  watchedQueue = queue;
  queue.on('add', watchUpload);
  queue.each?.(watchUpload);

  return true;
};

const initializeUploaderWatch = () => {
  watchWordPressUploader();

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;

    if (watchWordPressUploader() || attempts >= 40) {
      window.clearInterval(timer);
    }
  }, 500);
};

document.addEventListener('click', (event) => {
  watchWordPressUploader();
  handleControlClick(event);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUploaderWatch, { once: true });
} else {
  initializeUploaderWatch();
}
