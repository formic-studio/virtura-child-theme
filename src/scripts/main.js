import '../styles/main.css';
import { initCategoryStack } from './category-stack.js';
import { initFitText } from './fit-text.js';
import { initGigaMenu } from './giga-menu.js';
import { initHeaderScroll } from './header-scroll.js';
import { initHeaderTheme } from './header-theme.js';
import { initIntroAnimation } from './intro-animation.js';
import { initMotion } from './motion.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { initTrainingTabs } from './training-tabs.js';

const initTheme = () => {
  void initSmoothScroll();
  initHeaderTheme();
  initHeaderScroll();
  initGigaMenu();
  void initIntroAnimation();
  initFitText();
  initCategoryStack();
  initTrainingTabs();
  void initMotion();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
