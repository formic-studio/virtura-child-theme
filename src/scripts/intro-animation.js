import { loadGsap } from './motion.js';

const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

const HEADER_SURFACE_SELECTOR = '.header-overlay';
const HERO_SECTION_SELECTOR = '.section_hero';
const HERO_HEADING_SELECTOR = '.section_hero .hero-heading:is(h1, .brxe-heading), .section_hero .hero-heading :is(h1, .brxe-heading)';
const HERO_IMAGE_SELECTOR = '.section_hero .hero-img';
const HERO_ARROW_SELECTOR = '#brxe-rigtwk';
const NAV_LOGO_SELECTOR = '#brxe-cimskf';
const NAV_LOGO_FALLBACK_SELECTOR = '#brx-header .svg-link';
const INTRO_PATHS = new Set(['/', '/strona-glowna/']);
const LOGO_WIDTH = 147;
const LOGO_MARK_WIDTH = 42;
const LOGO_NAME_WIDTH = 97;
const LOGO_MARK_CENTER_OFFSET = LOGO_WIDTH / 2 - LOGO_MARK_WIDTH / 2;
const INTRO_CENTER_SCALE = 2.2;

const ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="38" viewBox="0 0 42 38" fill="none" aria-hidden="true" focusable="false">
    <path d="M7.74658 11.0096C7.74658 11.0363 8.6017 11.7846 8.6017 11.7846C9.0827 12.2121 9.72404 12.4526 10.3921 12.4526H30.8347C31.4761 12.4526 32.0907 12.2389 32.5984 11.8113L33.507 11.0363C34.7095 9.99417 34.7896 8.15033 33.6406 7.05471L27.2807 0.774949C26.7729 0.267224 26.1049 0 25.3834 0H15.9504C15.2556 0 14.5608 0.267224 14.0531 0.774949L7.63969 7.05471C6.51735 8.15033 6.5708 9.96745 7.74658 11.0096Z" fill="white"/>
    <path d="M7.96036 14.6973C7.61297 14.1629 7.07852 13.762 6.4639 13.575L5.31484 13.2276C3.79167 12.7733 2.21504 13.7086 1.86765 15.2585L0.0505301 23.9967C-0.0830819 24.6915 0.05053 25.413 0.424644 26.0009L5.5019 33.9374C5.87601 34.5253 6.49063 34.9529 7.18541 35.1132L15.9236 37.1174C17.4468 37.4648 18.97 36.4493 19.2105 34.8994L19.3708 33.7771C19.4777 33.1358 19.3174 32.4677 18.97 31.9065L7.96036 14.6973Z" fill="white"/>
    <path d="M41.2565 23.9967L39.4393 15.2585C39.1187 13.7086 37.5153 12.7733 35.9921 13.2276L34.8431 13.575C34.2285 13.762 33.694 14.1629 33.3466 14.6973L22.337 31.9065C21.9896 32.4677 21.856 33.109 21.9362 33.7771L22.0965 34.8994C22.337 36.4493 23.8335 37.4915 25.3834 37.1174L34.1216 35.1132C34.8164 34.9529 35.4043 34.5253 35.8051 33.9374L40.8824 26.0009C41.2565 25.413 41.3901 24.6915 41.2565 23.9967Z" fill="white"/>
  </svg>
`;

const WORDMARK_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="97" height="38" viewBox="0 0 97 38" fill="none" aria-hidden="true" focusable="false">
    <path d="M16.0294 18.749C15.8736 18.749 15.7717 18.6472 15.7717 18.4915V5.83436C15.7717 5.67862 15.8736 5.57679 16.0294 5.57679H18.3785C18.5343 5.57679 18.6362 5.67862 18.6362 5.83436V18.4915C18.6362 18.6472 18.5343 18.749 18.3785 18.749H16.0294ZM15.562 3.04896V0.257574C15.562 0.101832 15.6639 0 15.8197 0H18.6122C18.768 0 18.8699 0.101832 18.8699 0.257574V3.04896C18.8699 3.20471 18.768 3.30654 18.6122 3.30654H15.8197C15.6639 3.30654 15.562 3.20471 15.562 3.04896Z" fill="white"/>
    <path d="M21.1 18.749C20.9442 18.749 20.8423 18.6471 20.8423 18.4914V9.32055C20.8423 6.89456 22.1607 5.57673 24.5877 5.57673H28.4948C28.6506 5.57673 28.7525 5.67857 28.7525 5.83431V7.74515C28.7525 7.90089 28.6506 8.00273 28.4948 8.00273H23.7067V18.4854C23.7067 18.6411 23.6049 18.743 23.4491 18.743H21.1V18.749Z" fill="white"/>
    <path d="M34.4866 18.7485C32.0596 18.7485 30.7413 17.4307 30.7413 15.0047V8.00827H28.494C28.3382 8.00827 28.2364 7.8705 28.2364 7.71476V5.83986C28.2364 5.68411 28.3382 5.58228 28.494 5.58228H30.7413V1.96426C30.7413 1.80852 30.8431 1.70668 30.9989 1.70668H33.348C33.5038 1.70668 33.6057 1.80852 33.6057 1.96426V5.58228H36.7818C36.9376 5.58228 37.0395 5.68411 37.0395 5.83986V7.71476C37.0395 7.8705 36.9376 7.97233 36.7818 7.97233H33.6057V16.4783H36.7818C36.9376 16.4783 37.0395 16.5801 37.0395 16.7359V18.491C37.0395 18.6467 36.9376 18.7485 36.7818 18.7485H34.4806H34.4866Z" fill="white"/>
    <path d="M44.2306 18.9045C40.3834 18.9045 38.4718 16.9697 38.4718 13.0701V5.84005C38.4718 5.68431 38.5736 5.58247 38.7294 5.58247H41.0785C41.2343 5.58247 41.3362 5.68431 41.3362 5.84005V13.4834C41.3362 15.4961 42.3669 16.5803 44.2306 16.5803C46.0943 16.5803 47.149 15.55 47.149 13.4834V5.84005C47.149 5.68431 47.2509 5.58247 47.4067 5.58247H49.7558C49.9116 5.58247 50.0135 5.68431 50.0135 5.84005V13.0701C50.0135 16.9697 48.1019 18.9045 44.2247 18.9045H44.2306Z" fill="white"/>
    <path d="M52.207 18.749C52.0512 18.749 51.9493 18.6471 51.9493 18.4914V9.32055C51.9493 6.89456 53.2677 5.57673 55.6947 5.57673H59.3622C59.518 5.57673 59.6199 5.67857 59.6199 5.83431V7.74515C59.6199 7.90089 59.518 8.00273 59.3622 8.00273H54.8138V18.4854C54.8138 18.6411 54.7119 18.743 54.5561 18.743H52.207V18.749Z" fill="white"/>
    <path d="M65.8467 18.9044C62.2811 18.9044 60.0099 16.2688 60.0099 12.1895C60.0099 8.11024 62.2811 5.42068 65.8467 5.42068C67.5546 5.42068 69.1546 6.24731 70.0595 7.5891H70.1614V5.834C70.1614 5.67825 70.2632 5.57642 70.419 5.57642H72.7681C72.9239 5.57642 73.0258 5.67825 73.0258 5.834V16.4724H74.4461C74.6019 16.4724 74.7037 16.5743 74.7037 16.73V18.4851C74.7037 18.6408 74.6019 18.7427 74.4461 18.7427H72.5344C71.0123 18.7427 70.2872 18.1257 70.2872 16.8558V16.754H70.1853C69.3044 18.0718 67.6265 18.8984 65.8467 18.8984V18.9044ZM62.9283 12.1895C62.9283 14.927 64.3485 16.5802 66.6497 16.5802C68.9509 16.5802 70.2692 14.927 70.2692 12.1895C70.2692 9.45202 68.9029 7.74484 66.6497 7.74484C64.3965 7.74484 62.9283 9.42207 62.9283 12.1895Z" fill="white"/>
    <path d="M8.6955 37.1383C4.66249 37.1383 2.05572 34.5026 2.05572 30.4234C2.05572 26.3441 4.74039 23.6545 8.6955 23.6545C11.9255 23.6545 14.1967 25.4635 14.5862 28.1711C14.6102 28.3508 14.4843 28.4526 14.3285 28.4526H12.0573C11.8776 28.4526 11.8236 28.3747 11.7757 28.195C11.4401 26.6735 10.3794 25.9727 8.7015 25.9727C6.3524 25.9727 4.9801 27.6799 4.9801 30.4174C4.9801 33.1548 6.37637 34.8081 8.7015 34.8081C10.4813 34.8081 11.494 34.1612 11.9075 32.5618C11.9315 32.4061 12.0394 32.3282 12.1892 32.3282H14.4604C14.6162 32.3282 14.742 32.4061 14.7181 32.5618C14.2806 35.2993 12.0573 37.1323 8.6955 37.1323V37.1383Z" fill="white"/>
    <path d="M21.7525 37.1383C17.9053 37.1383 15.9936 35.2035 15.9936 31.304V24.0739C15.9936 23.9182 16.0955 23.8163 16.2513 23.8163H18.6004C18.7562 23.8163 18.8581 23.9182 18.8581 24.0739V31.7173C18.8581 33.73 19.8888 34.8142 21.7525 34.8142C23.6162 34.8142 24.6709 33.7839 24.6709 31.7173V24.0739C24.6709 23.9182 24.7728 23.8163 24.9286 23.8163H27.2777C27.4335 23.8163 27.5354 23.9182 27.5354 24.0739V31.304C27.5354 35.2035 25.6237 37.1383 21.7465 37.1383H21.7525Z" fill="white"/>
    <path d="M34.4806 37.1383C31.1967 37.1383 29.2371 35.6647 28.9794 33.0051C28.9554 32.8254 29.0573 32.7236 29.2131 32.7236H31.4843C31.6641 32.7236 31.718 32.8254 31.742 32.9572C32.0236 34.3529 32.8506 34.922 34.4806 34.922C35.8229 34.922 36.7039 34.305 36.7039 33.3465C36.7039 32.442 36.1585 32.0287 34.7922 31.7712L32.9585 31.4357C30.4536 30.9685 29.2611 29.7824 29.2611 27.5901C29.2611 25.212 31.1487 23.6665 34.145 23.6665C37.1413 23.6665 38.8971 25.0622 39.1848 27.4882C39.2088 27.6679 39.1069 27.7698 38.9511 27.7698H36.6799C36.5001 27.7698 36.4222 27.638 36.3982 27.5361C36.1405 26.3501 35.4694 25.8829 34.151 25.8829C32.8326 25.8829 32.0836 26.428 32.0836 27.4343C32.0836 28.237 32.4431 28.7282 33.8394 28.9858L35.805 29.3452C38.6455 29.8603 39.5264 30.9745 39.5264 33.1908C39.5264 35.7246 37.7166 37.1443 34.4866 37.1443L34.4806 37.1383Z" fill="white"/>
    <path d="M46.4245 36.9829C43.9975 36.9829 42.6792 35.6651 42.6792 33.2391V26.0869H40.4319C40.2761 26.0869 40.1743 25.9851 40.1743 25.8293V24.0742C40.1743 23.9185 40.2761 23.8167 40.4319 23.8167H42.6792V20.1986C42.6792 20.0429 42.781 19.9411 42.9369 19.9411H45.2859C45.4418 19.9411 45.5436 20.0429 45.5436 20.1986V23.8167H48.7197C48.8755 23.8167 48.9774 23.9185 48.9774 24.0742V25.8293C48.9774 25.9851 48.8755 26.0869 48.7197 26.0869H45.5436V34.7127H48.7197C48.8755 34.7127 48.9774 34.8145 48.9774 34.9702V36.7253C48.9774 36.8811 48.8755 36.9829 48.7197 36.9829H46.4185H46.4245Z" fill="white"/>
    <path d="M56.102 37.1383C52.1769 37.1383 49.5161 34.4247 49.5161 30.4234C49.5161 26.422 52.2008 23.6545 56.102 23.6545C60.0032 23.6545 62.7418 26.392 62.7418 30.4234C62.7418 34.4547 60.0571 37.1383 56.102 37.1383ZM52.4345 30.4234C52.4345 33.1608 53.8068 34.8141 56.102 34.8141C58.3972 34.8141 59.8234 33.1608 59.8234 30.4234C59.8234 27.6859 58.4271 25.9787 56.102 25.9787C53.7769 25.9787 52.4345 27.6559 52.4345 30.4234Z" fill="white"/>
    <path d="M64.5515 36.9825C64.3957 36.9825 64.2938 36.8807 64.2938 36.7249V24.0679C64.2938 23.9121 64.3957 23.8103 64.5515 23.8103H66.7748C66.9306 23.8103 67.0324 23.9121 67.0324 24.0679V25.823H67.1343C68.0392 24.4033 69.4355 23.6545 71.1673 23.6545C72.8992 23.6545 74.1876 24.3793 74.9666 25.823H75.0685C76.1532 24.4273 77.8071 23.6545 79.6948 23.6545C82.6132 23.6545 84.2132 25.6672 84.2132 29.5967V36.7249C84.2132 36.8807 84.1113 36.9825 83.9555 36.9825H81.6064C81.4506 36.9825 81.3487 36.8807 81.3487 36.7249V29.5967C81.3487 27.1707 80.4678 26.0865 78.5083 26.0865C76.5487 26.0865 75.6917 27.1947 75.6917 29.5967V36.7249C75.6917 36.8807 75.5899 36.9825 75.4341 36.9825H73.085C72.9292 36.9825 72.8273 36.8807 72.8273 36.7249V29.5967C72.8273 27.1707 71.9464 26.0865 70.0108 26.0865C68.0752 26.0865 67.1703 27.1947 67.1703 29.5967V36.7249C67.1703 36.8807 67.0684 36.9825 66.9126 36.9825H64.5515Z" fill="white"/>
    <path d="M91.153 37.1383C87.869 37.1383 85.9094 35.6647 85.6518 33.0051C85.6278 32.8254 85.7297 32.7236 85.8855 32.7236H88.1567C88.3364 32.7236 88.3904 32.8254 88.4143 32.9572C88.696 34.3529 89.523 34.922 91.153 34.922C92.4953 34.922 93.3762 34.305 93.3762 33.3465C93.3762 32.442 92.8309 32.0287 91.4646 31.7712L89.6308 31.4357C87.1259 30.9685 85.9334 29.7824 85.9334 27.5901C85.9334 25.212 87.8211 23.6665 90.8174 23.6665C93.8137 23.6665 95.5695 25.0622 95.8571 27.4882C95.8811 27.6679 95.7792 27.7698 95.6234 27.7698H93.3522C93.1725 27.7698 93.0946 27.638 93.0706 27.5361C92.8129 26.3501 92.1417 25.8829 90.8234 25.8829C89.505 25.8829 88.7559 26.428 88.7559 27.4343C88.7559 28.237 89.1155 28.7282 90.5117 28.9858L92.4773 29.3452C95.3178 29.8603 96.1987 30.9745 96.1987 33.1908C96.1987 35.7246 94.3889 37.1443 91.1589 37.1443L91.153 37.1383Z" fill="white"/>
    <path d="M11.7696 5.80416L8.27594 15.5321C8.24598 15.6219 8.03025 16.197 7.38904 16.191C6.74783 16.185 6.5321 15.6219 6.50214 15.5321L2.9725 5.80416C2.93055 5.68435 2.82269 5.60648 2.69684 5.60648H0.293815C0.0960594 5.60648 -0.0477627 5.80416 0.0181558 5.98985L4.72234 17.5987C5.22572 19.246 9.6063 19.4496 10.2475 17.5987L14.73 5.98985C14.7899 5.79817 14.6521 5.60648 14.4543 5.60648H12.0513C11.9254 5.60648 11.8116 5.68435 11.7756 5.80416H11.7696Z" fill="white"/>
  </svg>
`;

const isBricksBuilder = () => (
  document.body.classList.contains('bricks-is-builder') ||
  document.documentElement.classList.contains('bricks-is-builder')
);

const getNormalizedPath = () => {
  const path = window.location.pathname || '/';

  return path.endsWith('/') ? path : `${path}/`;
};

const shouldRunIntro = () => (
  INTRO_PATHS.has(getNormalizedPath()) &&
  !window.location.hash &&
  window.scrollY < 24 &&
  !reducedMotionMedia.matches &&
  !isBricksBuilder() &&
  document.querySelector(HERO_SECTION_SELECTOR) &&
  getNavLogoTarget()
);

const getNavLogoTarget = () => (
  document.querySelector(NAV_LOGO_SELECTOR) ||
  document.querySelector(NAV_LOGO_FALLBACK_SELECTOR)
);

const getIntroMarkScale = () => {
  const scaleForWidth = window.innerWidth / 18;
  const scaleForHeight = window.innerHeight / 12;

  return Math.max(48, scaleForWidth, scaleForHeight);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getHeaderRevealClip = (progress) => {
  if (progress <= 0.001) {
    return 'polygon(0% 0%, 0% 0%, 0% 18%, 0% 34%, 0% 52%, 0% 70%, 0% 88%, 0% 100%, 0% 100%)';
  }

  const base = progress * 108;
  const point = (offset) => `${clamp(base + offset, 0, 110).toFixed(2)}%`;

  return [
    'polygon(0% 0%',
    `${point(1)} 0%`,
    `${point(-4)} 18%`,
    `${point(3)} 34%`,
    `${point(-7)} 52%`,
    `${point(5)} 70%`,
    `${point(-2)} 88%`,
    `${point(2)} 100%`,
    '0% 100%)',
  ].join(', ');
};

const setHeaderRevealClip = (surface, progress) => {
  if (!surface) {
    return;
  }

  const clipPath = getHeaderRevealClip(progress);

  surface.style.clipPath = clipPath;
  surface.style.webkitClipPath = clipPath;
};

const getHeroHeading = () => document.querySelector(HERO_HEADING_SELECTOR);

const getHeroImage = () => document.querySelector(HERO_IMAGE_SELECTOR);

const getHeroArrow = () => document.querySelector(HERO_ARROW_SELECTOR);

const waitForImage = (image, timeout = 2200) => new Promise((resolve) => {
  if (!image || image.complete) {
    resolve();
    return;
  }

  let timeoutId;
  const cleanup = () => {
    window.clearTimeout(timeoutId);
    image.removeEventListener('load', cleanup);
    image.removeEventListener('error', cleanup);
    resolve();
  };

  timeoutId = window.setTimeout(cleanup, timeout);
  image.addEventListener('load', cleanup, { once: true });
  image.addEventListener('error', cleanup, { once: true });
});

const createImageSweep = (image, overlay) => {
  if (!image || !overlay) {
    return null;
  }

  const rect = image.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return null;
  }

  const sweep = document.createElement('div');

  sweep.className = 'virtura-intro-image-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  sweep.style.height = `${rect.height}px`;
  sweep.style.left = `${rect.left}px`;
  sweep.style.top = `${rect.top}px`;
  sweep.style.width = `${rect.width}px`;
  overlay.appendChild(sweep);

  return sweep;
};

const createIntroOverlay = () => {
  const overlay = document.createElement('div');

  overlay.className = 'virtura-intro';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="virtura-intro-bg" data-intro-bg></div>
    <div class="virtura-intro-logo" data-intro-logo>
      <span class="virtura-intro-mark" data-intro-mark>${ICON_SVG}</span>
      <span class="virtura-intro-name-clip" data-intro-name-clip>
        <span class="virtura-intro-name" data-intro-name>${WORDMARK_SVG}</span>
      </span>
    </div>
  `;

  document.body.appendChild(overlay);

  return overlay;
};

const getLogoTargetTransform = (gsap, logo, target) => {
  const logoRect = logo.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentX = Number(gsap.getProperty(logo, 'x')) || 0;
  const currentY = Number(gsap.getProperty(logo, 'y')) || 0;
  const currentScale = Number(gsap.getProperty(logo, 'scale')) || 1;
  const logoCenterX = logoRect.left + logoRect.width / 2;
  const logoCenterY = logoRect.top + logoRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const scale = currentScale * (targetRect.width / logoRect.width);

  return {
    scale,
    x: currentX + targetCenterX - logoCenterX,
    y: currentY + targetCenterY - logoCenterY,
  };
};

export const initIntroAnimation = async () => {
  if (!shouldRunIntro()) {
    return;
  }

  const root = document.documentElement;
  const headerSurface = document.querySelector(HEADER_SURFACE_SELECTOR);
  const heroHeading = getHeroHeading();
  const heroImage = getHeroImage();
  const heroArrow = getHeroArrow();
  const navLogo = getNavLogoTarget();
  const overlay = createIntroOverlay();

  root.classList.add('virtura-intro-running');

  const { gsap } = await loadGsap();

  if (reducedMotionMedia.matches) {
    root.classList.remove('virtura-intro-running');
    overlay.remove();
    return;
  }

  const logo = overlay.querySelector('[data-intro-logo]');
  const introBg = overlay.querySelector('[data-intro-bg]');
  const mark = overlay.querySelector('[data-intro-mark]');
  const nameClip = overlay.querySelector('[data-intro-name-clip]');
  const name = overlay.querySelector('[data-intro-name]');
  const imageSweep = createImageSweep(heroImage, overlay);
  const headerRevealState = { progress: 0 };
  const imageReadyPromise = waitForImage(heroImage);
  let imageReady = !heroImage || heroImage.complete;
  let imageRevealed = false;
  let arrowRevealed = false;
  let targetTransform = null;

  const revealArrowWhenReady = () => {
    if (!heroArrow || !imageReady || !imageRevealed || arrowRevealed) {
      return;
    }

    arrowRevealed = true;
    gsap.to(heroArrow, {
      autoAlpha: 1,
      clearProps: 'opacity,visibility,transform',
      duration: 0.65,
      ease: 'power3.out',
      y: 0,
    });
  };

  imageReadyPromise.then(() => {
    imageReady = true;
    revealArrowWhenReady();
  });

  gsap.set(logo, {
    autoAlpha: 1,
    scale: INTRO_CENTER_SCALE,
    x: LOGO_MARK_CENTER_OFFSET,
    xPercent: -50,
    yPercent: -50,
  });
  gsap.set(mark, {
    autoAlpha: 1,
    rotation: 0,
    scale: getIntroMarkScale(),
    transformOrigin: '50% 50%',
  });
  gsap.set(nameClip, { width: 0 });
  gsap.set(name, { autoAlpha: 0, x: -18 });

  if (headerSurface) {
    gsap.set(headerSurface, {
      autoAlpha: 0,
    });
    setHeaderRevealClip(headerSurface, 0);
  }

  if (heroHeading) {
    gsap.set(heroHeading, {
      autoAlpha: 1,
      clipPath: 'inset(0 100% 0 0)',
      webkitClipPath: 'inset(0 100% 0 0)',
    });
  }

  if (heroImage) {
    gsap.set(heroImage, {
      autoAlpha: 0,
      clipPath: 'polygon(0% 0%, 10% 0%, 0% 100%, 0% 100%)',
      filter: 'blur(10px) contrast(1.12) saturate(0.82)',
      scale: 1.035,
      transformOrigin: '50% 50%',
      webkitClipPath: 'polygon(0% 0%, 10% 0%, 0% 100%, 0% 100%)',
    });
  }

  if (heroArrow) {
    gsap.set(heroArrow, {
      autoAlpha: 0,
      scale: 0.96,
      y: -34,
    });
  }

  if (imageSweep) {
    gsap.set(imageSweep, {
      autoAlpha: 0,
      xPercent: -145,
    });
  }

  const getTargetTransform = () => {
    if (!targetTransform) {
      targetTransform = getLogoTargetTransform(gsap, logo, navLogo);
    }

    return targetTransform;
  };

  const timeline = gsap.timeline({
    defaults: {
      ease: 'power3.out',
    },
    onComplete: () => {
      root.classList.remove('virtura-intro-running');
      root.classList.remove('virtura-intro-revealing');
      overlay.remove();

      if (headerSurface) {
        gsap.set(headerSurface, {
          clearProps:
            'clipPath,webkitClipPath,opacity,visibility,transform',
        });
      }

      if (heroHeading) {
        gsap.set(heroHeading, {
          clearProps: 'clipPath,opacity,visibility,webkitClipPath',
        });
      }

      if (heroImage) {
        gsap.set(heroImage, {
          clearProps:
            'clipPath,filter,opacity,scale,transform,visibility,webkitClipPath',
        });
      }
    },
  });

  timeline
    .to(mark, {
      duration: 2.25,
      ease: 'power4.inOut',
      rotation: 360,
      scale: 1,
    })
    .to(
      nameClip,
      {
        duration: 0.92,
        ease: 'power4.inOut',
        width: LOGO_NAME_WIDTH,
      },
      '-=0.22'
    )
    .to(
      name,
      {
        autoAlpha: 1,
        duration: 0.7,
        x: 0,
      },
      '<0.12'
    )
    .to(
      logo,
      {
        duration: 0.92,
        ease: 'power4.inOut',
        x: 0,
      },
      '<'
    )
    .add('dockStart', '+=0.32')
    .to(
      logo,
      {
        duration: 1.2,
        ease: 'power3.inOut',
        scale: () => getTargetTransform().scale,
        x: () => getTargetTransform().x,
        y: () => getTargetTransform().y,
      },
      'dockStart'
    )
    .add(() => {
      if (headerSurface) {
        gsap.set(headerSurface, { autoAlpha: 1 });
        setHeaderRevealClip(headerSurface, 0);
      }

      root.classList.add('virtura-intro-revealing');
      root.classList.remove('virtura-intro-running');
    }, 'dockStart+=0.48')
    .add('headingReveal', 'dockStart+=0.12')
    .to(
      introBg ? [introBg] : [],
      {
        autoAlpha: 0,
        duration: 0.78,
        ease: 'power2.out',
      },
      'dockStart+=0.5'
    )
    .to(
      heroHeading ? [heroHeading] : [],
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.2,
        ease: 'power3.inOut',
        webkitClipPath: 'inset(0 0% 0 0)',
      },
      'headingReveal'
    )
    .add('imageReveal', 'headingReveal+=1.2')
    .to(
      heroImage ? [heroImage] : [],
      {
        autoAlpha: 1,
        duration: 0.18,
        ease: 'none',
      },
      'imageReveal'
    )
    .to(
      heroImage ? [heroImage] : [],
      {
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        duration: 1.05,
        ease: 'power3.out',
        filter: 'blur(0px) contrast(1) saturate(1)',
        scale: 1,
        webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      },
      'imageReveal'
    )
    .to(
      imageSweep ? [imageSweep] : [],
      {
        autoAlpha: 1,
        duration: 0.18,
        ease: 'none',
      },
      'imageReveal+=0.04'
    )
    .to(
      imageSweep ? [imageSweep] : [],
      {
        autoAlpha: 0,
        duration: 0.95,
        ease: 'power2.out',
        xPercent: 140,
      },
      'imageReveal+=0.04'
    )
    .add(() => {
      imageRevealed = true;
      revealArrowWhenReady();
    }, 'imageReveal+=1.05')
    .add('navReveal', 'dockStart+=0.75')
    .to(
      headerRevealState,
      {
        duration: 3,
        ease: 'power2.inOut',
        onUpdate: () => setHeaderRevealClip(
          headerSurface,
          headerRevealState.progress,
        ),
        progress: 1,
      },
      'navReveal'
    )
    .to(
      logo,
      {
        autoAlpha: 0,
        duration: 0.32,
        ease: 'power2.out',
      },
      'navReveal+=0.68'
    )
    .to(
      overlay,
      {
        autoAlpha: 0,
        duration: 0.55,
        ease: 'power2.out',
      },
      'navReveal+=1.2'
    );
};
