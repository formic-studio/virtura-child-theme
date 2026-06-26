import '../styles/main.css';
import { initMotion } from './motion.js';

const initTheme = () => {
  void initMotion();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}
