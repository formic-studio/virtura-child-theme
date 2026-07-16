const BLOG_LAYOUT_SELECTOR = '.blog-grid-top';
const RICH_TEXT_SELECTOR = '.blog-rich-text';
const FEATURED_TEXT_SELECTOR = '.font-color-violet';
const MOBILE_QUERY = '(max-width: 767px)';
const INSERTED_CLASS = 'virtura-blog-mobile-insert';

const isElement = (element) => element instanceof HTMLElement;

const getFeaturedBlock = (layout, richText) =>
  Array.from(layout.children).find(
    (child) =>
      isElement(child) &&
      !child.contains(richText) &&
      child.querySelector(FEATURED_TEXT_SELECTOR),
  );

const getSecondHeading = (richText) =>
  Array.from(richText.children).filter(
    (child) => isElement(child) && child.matches('h2'),
  )[1] || null;

const createLayoutState = (layout) => {
  const richText = layout.querySelector(RICH_TEXT_SELECTOR);

  if (!isElement(richText)) {
    return null;
  }

  const featuredBlock = getFeaturedBlock(layout, richText);

  if (!isElement(featuredBlock) || !getSecondHeading(richText)) {
    return null;
  }

  const placeholder = document.createComment('virtura-blog-featured-text');
  featuredBlock.before(placeholder);

  return {
    featuredBlock,
    placeholder,
    richText,
  };
};

const moveInsideRichText = ({ featuredBlock, richText }) => {
  const secondHeading = getSecondHeading(richText);

  if (!secondHeading) {
    return;
  }

  secondHeading.before(featuredBlock);
  featuredBlock.classList.add(INSERTED_CLASS);
};

const restoreOriginalPosition = ({ featuredBlock, placeholder }) => {
  if (!placeholder.isConnected) {
    return;
  }

  placeholder.after(featuredBlock);
  featuredBlock.classList.remove(INSERTED_CLASS);
};

export const initBlogMobileContent = () => {
  if (
    document.documentElement.classList.contains('bricks-is-builder') ||
    document.body.classList.contains('bricks-is-builder')
  ) {
    return;
  }

  const states = Array.from(document.querySelectorAll(BLOG_LAYOUT_SELECTOR))
    .map(createLayoutState)
    .filter(Boolean);

  if (!states.length) {
    return;
  }

  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  const syncLayout = () => {
    states.forEach((state) => {
      if (mediaQuery.matches) {
        moveInsideRichText(state);
        return;
      }

      restoreOriginalPosition(state);
    });
  };

  syncLayout();

  if ('addEventListener' in mediaQuery) {
    mediaQuery.addEventListener('change', syncLayout);
  } else {
    mediaQuery.addListener(syncLayout);
  }
};
