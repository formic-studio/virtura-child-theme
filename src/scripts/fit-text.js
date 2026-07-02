const FIT_TEXT_SELECTOR = '.text-overview, .fit-text-to-box, [data-fit-text]';

const getNumberAttribute = (element, name, fallback) => {
  const value = Number.parseFloat(element.getAttribute(name));

  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getInnerWidth = (element) => {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const paddingX =
    Number.parseFloat(styles.paddingLeft) +
    Number.parseFloat(styles.paddingRight);

  return Math.max(0, rect.width - paddingX);
};

const fitTextElement = (element) => {
  const target = element.classList.contains('fit-text-to-box')
    ? element.parentElement || element
    : element;
  const targetWidth = getInnerWidth(target);

  if (!targetWidth) {
    return;
  }

  const minSize = getNumberAttribute(element, 'data-fit-text-min', 8);
  const maxSize = getNumberAttribute(
    element,
    'data-fit-text-max',
    Math.max(1200, targetWidth * 2)
  );
  let low = minSize;
  let high = maxSize;

  element.style.fontSize = `${minSize}px`;

  for (let i = 0; i < 18; i += 1) {
    const middle = (low + high) / 2;

    element.style.fontSize = `${middle}px`;

    if (element.scrollWidth <= targetWidth + 0.5) {
      low = middle;
    } else {
      high = middle;
    }
  }

  element.style.fontSize = `${low.toFixed(2)}px`;
};

export const initFitText = () => {
  const elements = Array.from(document.querySelectorAll(FIT_TEXT_SELECTOR));

  if (!elements.length) {
    return;
  }

  let frame = null;

  const fitAll = () => {
    frame = null;
    elements.forEach(fitTextElement);
  };

  const scheduleFit = () => {
    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(fitAll);
  };

  const resizeObserver =
    'ResizeObserver' in window ? new ResizeObserver(scheduleFit) : null;

  elements.forEach((element) => {
    resizeObserver?.observe(element);

    if (element.parentElement) {
      resizeObserver?.observe(element.parentElement);
    }
  });

  window.addEventListener('resize', scheduleFit, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }

  scheduleFit();
};
