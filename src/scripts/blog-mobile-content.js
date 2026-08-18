const BLOG_LAYOUT_SELECTOR = '.blog-grid-top';
const RICH_TEXT_SELECTOR = '.blog-rich-text';
const FEATURED_TEXT_SELECTOR = '.font-color-violet';
const RELATED_LAYOUT_SELECTOR = '.blog-grid-bottom';
const RELATED_HEADING_SELECTOR = '.font-size-tittle-big';
const RELATED_TAGS_SELECTOR = '.blog-tags';
const MOBILE_QUERY = '(max-width: 767px)';
const INSERTED_CLASS = 'virtura-blog-mobile-insert';
const RELATED_HEADING_CLASS = 'virtura-blog-mobile-related-heading';

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

const getRelatedHeading = (layout) =>
  Array.from(layout.children).find(
    (child) => isElement(child) && child.matches(RELATED_HEADING_SELECTOR),
  ) || null;

const createRelatedState = (layout) => {
  const heading = getRelatedHeading(layout);
  const tags = layout.querySelector(RELATED_TAGS_SELECTOR);

  if (!isElement(heading) || !isElement(tags)) {
    return null;
  }

  const placeholder = document.createComment('virtura-blog-related-heading');
  heading.before(placeholder);

  return {
    heading,
    placeholder,
    tags,
  };
};

const moveHeadingBeforeTags = ({ heading, tags }) => {
  tags.prepend(heading);
  heading.classList.add(RELATED_HEADING_CLASS);
};

const restoreRelatedHeading = ({ heading, placeholder }) => {
  if (!placeholder.isConnected) {
    return;
  }

  placeholder.after(heading);
  heading.classList.remove(RELATED_HEADING_CLASS);
};

export const initBlogMobileContent = () => {
  if (
    document.documentElement.classList.contains('bricks-is-builder') ||
    document.body.classList.contains('bricks-is-builder')
  ) {
    return;
  }

  const featuredStates = Array.from(document.querySelectorAll(BLOG_LAYOUT_SELECTOR))
    .map(createLayoutState)
    .filter(Boolean);
  const relatedStates = Array.from(document.querySelectorAll(RELATED_LAYOUT_SELECTOR))
    .map(createRelatedState)
    .filter(Boolean);

  if (!featuredStates.length && !relatedStates.length) {
    return;
  }

  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  const syncLayout = () => {
    featuredStates.forEach((state) => {
      if (mediaQuery.matches) {
        moveInsideRichText(state);
        return;
      }

      restoreOriginalPosition(state);
    });

    relatedStates.forEach((state) => {
      if (mediaQuery.matches) {
        moveHeadingBeforeTags(state);
        return;
      }

      restoreRelatedHeading(state);
    });
  };

  syncLayout();

  if ('addEventListener' in mediaQuery) {
    mediaQuery.addEventListener('change', syncLayout);
  } else {
    mediaQuery.addListener(syncLayout);
  }
};
