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
  const introPromise = initIntroAnimation().catch((error) => {
    console.error('Virtura intro animation failed.', error);
  });

  void initSmoothScroll();
  initHeaderTheme();
  initHeaderScroll();
  initGigaMenu();
  initFitText();
  initCategoryStack();
  initTrainingTabs();
  void introPromise.then(() => {
    void initMotion();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
