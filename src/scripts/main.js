import '../styles/main.css';
import { initCategoryStack } from './category-stack.js';
import { initMotion } from './motion.js';
import { initSmoothScroll } from './smooth-scroll.js';

const initTheme = () => {
  void initSmoothScroll();
  initCategoryStack();
  void initMotion();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
