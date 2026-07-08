import '../styles/main.css';
import { initArchiveFilters } from './archive-filters.js';
import { initCategoryStack } from './category-stack.js';
import { initFitText } from './fit-text.js';
import { initGigaMenu } from './giga-menu.js';
import { initHeaderScroll } from './header-scroll.js';
import { initHeaderTheme } from './header-theme.js';
import { initIntroAnimation } from './intro-animation.js';
import { initMediaSwitch } from './media-switch.js';
import { initMotion } from './motion.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { initTrainingTabs } from './training-tabs.js';

const initTheme = () => {
  initHeaderTheme();
  initHeaderScroll();
  initGigaMenu();
  const introReady = initIntroAnimation();
  initFitText();
  initCategoryStack();
  initTrainingTabs();
  initArchiveFilters();
  initMediaSwitch();
  void introReady
    .catch(() => {})
    .finally(() => {
      void initSmoothScroll();
      void initMotion();
    });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
