import { initArrowMotion } from './arrow-motion.js';
import { initGigaMenu } from './giga-menu.js';
import { initHeaderScroll } from './header-scroll.js';
import { initHeaderTheme } from './header-theme.js';
import { initMediaSwitch } from './media-switch.js';
import { initVideoOptimization } from './video-optimization.js';

export const initCoreUi = () => {
  initHeaderTheme();
  initHeaderScroll();
  initGigaMenu();
  initArrowMotion();
  initMediaSwitch();
};

export { initVideoOptimization };
