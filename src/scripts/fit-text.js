const FIT_TEXT_SELECTOR = '.text-overview, .fit-text-to-box, [data-fit-text]';
const fitTextStates = new WeakMap();

const getNumberAttribute = (element, name, fallback) => {
  const value = Number.parseFloat(element.getAttribute(name));

  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getViewportWidth = () =>
  window.visualViewport?.width ||
  document.documentElement.clientWidth ||
  window.innerWidth ||
  0;

const getInnerWidth = (element) => {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const paddingX =
    Number.parseFloat(styles.paddingLeft) +
    Number.parseFloat(styles.paddingRight);
  const innerWidth = Math.max(0, rect.width - paddingX);
  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, getViewportWidth()) - Math.max(rect.left, 0) - paddingX
  );

  return visibleWidth ? Math.min(innerWidth, visibleWidth) : innerWidth;
};

const getCssLengthValue = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const pixelValue = Number.parseFloat(trimmedValue);

  if (!Number.isFinite(pixelValue)) {
    return null;
  }

  if (trimmedValue.endsWith('px')) {
    return pixelValue;
  }

  const probe = document.createElement('div');
  const probeChild = document.createElement('div');

  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;';
  probeChild.style.width = trimmedValue;
  probe.appendChild(probeChild);
  document.body.appendChild(probe);

  const resolvedValue = probeChild.getBoundingClientRect().width;

  probe.remove();

  return Number.isFinite(resolvedValue) && resolvedValue > 0
    ? resolvedValue
    : null;
};

const getFitState = (element) => {
  const existingState = fitTextStates.get(element);

  if (existingState) {
    return existingState;
  }

  const state = {
    inlineFontSize: element.style.fontSize,
    inlineLetterSpacing: element.style.letterSpacing,
  };

  fitTextStates.set(element, state);

  return state;
};

const restoreBaseStyles = (element) => {
  const { inlineFontSize, inlineLetterSpacing } = getFitState(element);

  if (inlineFontSize) {
    element.style.fontSize = inlineFontSize;
  } else {
    element.style.removeProperty('font-size');
  }

  if (inlineLetterSpacing) {
    element.style.letterSpacing = inlineLetterSpacing;
  } else {
    element.style.removeProperty('letter-spacing');
  }
};

const getBaseTextMetrics = (element) => {
  restoreBaseStyles(element);

  const styles = window.getComputedStyle(element);
  const fontSize = Number.parseFloat(styles.fontSize);
  const letterSpacing =
    styles.letterSpacing === 'normal'
      ? Number.NaN
      : Number.parseFloat(styles.letterSpacing);
  const letterSpacingBaseFontSize =
    getCssLengthValue(
      styles.getPropertyValue('--fit-text-letter-spacing-base-font-size')
    ) || fontSize;

  return {
    fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : null,
    letterSpacingBaseFontSize:
      Number.isFinite(letterSpacingBaseFontSize) &&
      letterSpacingBaseFontSize > 0
        ? letterSpacingBaseFontSize
        : null,
    letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : null,
  };
};

const setFitTextStyles = (element, fontSize, baseMetrics) => {
  element.style.fontSize = `${fontSize}px`;

  if (
    baseMetrics.fontSize === null ||
    baseMetrics.letterSpacingBaseFontSize === null ||
    baseMetrics.letterSpacing === null
  ) {
    return;
  }

  const letterSpacing =
    (baseMetrics.letterSpacing * fontSize) /
    baseMetrics.letterSpacingBaseFontSize;

  element.style.letterSpacing = `${letterSpacing.toFixed(3)}px`;
};

const getFitTarget = (element) => {
  const targetSelector = element.getAttribute('data-fit-text-target');

  if (targetSelector) {
    const target = element.closest(targetSelector);

    if (target) {
      return target;
    }
  }

  if (element.classList.contains('text-overview')) {
    return (
      element.closest('.padding-global') ||
      element.closest('.brxe-container') ||
      element.closest('.parent') ||
      element.parentElement ||
      element
    );
  }

  if (element.classList.contains('fit-text-to-box')) {
    return element.parentElement || element;
  }

  return element;
};

const fitTextElement = (element) => {
  const target = getFitTarget(element);
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
  const baseMetrics = getBaseTextMetrics(element);
  let low = minSize;
  let high = maxSize;

  setFitTextStyles(element, minSize, baseMetrics);

  for (let i = 0; i < 18; i += 1) {
    const middle = (low + high) / 2;

    setFitTextStyles(element, middle, baseMetrics);

    if (element.scrollWidth <= targetWidth + 0.5) {
      low = middle;
    } else {
      high = middle;
    }
  }

  setFitTextStyles(element, Number.parseFloat(low.toFixed(2)), baseMetrics);
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
    resizeObserver?.observe(getFitTarget(element));
  });

  window.addEventListener('resize', scheduleFit, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }

  scheduleFit();
};
