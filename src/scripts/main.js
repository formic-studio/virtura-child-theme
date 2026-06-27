import '../styles/main.css';
import { initMotion } from './motion.js';
import { initSmoothScroll } from './smooth-scroll.js';

const initTheme = () => {
  void initSmoothScroll();
  void initMotion();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
