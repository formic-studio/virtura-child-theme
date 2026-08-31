const PAGINATION_SELECTOR = '.virtura-archive-pagination[data-query-element-id]';
const ARCHIVE_GRID_SELECTOR = '.archive-grid';
const QUERY_TRAIL_SELECTOR = '.brx-query-trail[data-query-element-id][data-query-vars]';
const ARCHIVE_POST_TYPES = new Set(['post', 'realizacja']);

const PREVIOUS_LABEL = 'Poprzednia strona';
const NEXT_LABEL = 'Następna strona';
const PAGE_LABEL = 'Strona';

const getQueryVariables = (queryTrail) => {
  try {
    return JSON.parse(queryTrail.dataset.queryVars || '{}');
  } catch {
    return {};
  }
};

const getArchiveQueryTrail = (archiveGrid) =>
  Array.from(archiveGrid.querySelectorAll(QUERY_TRAIL_SELECTOR)).find((queryTrail) => {
    const queryVariables = getQueryVariables(queryTrail);
    const postTypes = Array.isArray(queryVariables.post_type)
      ? queryVariables.post_type
      : [queryVariables.post_type];

    return postTypes.some((postType) => ARCHIVE_POST_TYPES.has(postType));
  });

const findPagination = (queryId) =>
  Array.from(document.querySelectorAll(PAGINATION_SELECTOR)).find(
    (pagination) => pagination.dataset.queryElementId === queryId,
  );

const createPagination = (archiveGrid, queryId) => {
  const pagination = document.createElement('nav');

  pagination.className = 'virtura-archive-pagination';
  pagination.dataset.queryElementId = queryId;
  pagination.setAttribute('aria-label', 'Paginacja archiwum');
  archiveGrid.insertAdjacentElement('afterend', pagination);

  return pagination;
};

const createScreenReaderText = (text) => {
  const label = document.createElement('span');

  label.className = 'screen-reader-text';
  label.textContent = text;

  return label;
};

const createChevron = (direction) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  path.setAttribute(
    'd',
    direction === 'previous' ? 'M10.5 3.5 6 8l4.5 4.5' : 'M5.5 3.5 10 8l-4.5 4.5',
  );
  svg.append(path);

  return svg;
};

const getPageUrl = (page) => {
  const url = new URL(window.location.href);

  url.pathname = url.pathname.replace(/\/page\/\d+\/?$/, '/');

  if (page > 1) {
    url.searchParams.set('paged', String(page));
  } else {
    url.searchParams.delete('paged');
  }

  return url.toString();
};

const createControl = ({ direction, page, disabled = false }) => {
  const control = document.createElement(disabled ? 'span' : 'a');
  const label = direction === 'previous' ? PREVIOUS_LABEL : NEXT_LABEL;

  control.className = `${direction === 'previous' ? 'prev' : 'next'} page-numbers`;
  control.append(createScreenReaderText(label), createChevron(direction));

  if (disabled) {
    control.classList.add('is-disabled');
    control.setAttribute('aria-disabled', 'true');
  } else {
    control.href = getPageUrl(page);
  }

  return control;
};

const createPageLink = (page, currentPage) => {
  const isCurrent = page === currentPage;
  const link = document.createElement(isCurrent ? 'span' : 'a');

  link.className = `page-numbers${isCurrent ? ' current' : ''}`;
  link.append(createScreenReaderText(`${PAGE_LABEL} `), String(page));

  if (isCurrent) {
    link.setAttribute('aria-current', 'page');
  } else {
    link.href = getPageUrl(page);
  }

  return link;
};

const getVisiblePages = (currentPage, totalPages) => {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
};

const appendListItem = (list, content) => {
  const item = document.createElement('li');

  item.append(content);
  list.append(item);
};

const renderPagination = (pagination, currentPage, totalPages) => {
  if (totalPages < 2) {
    pagination.hidden = true;
    return;
  }

  const list = document.createElement('ul');
  const pages = getVisiblePages(currentPage, totalPages);

  pagination.hidden = false;
  list.className = 'page-numbers';
  appendListItem(
    list,
    createControl({
      direction: 'previous',
      page: currentPage - 1,
      disabled: currentPage <= 1,
    }),
  );

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      const dots = document.createElement('span');

      dots.className = 'page-numbers dots';
      dots.setAttribute('aria-hidden', 'true');
      dots.textContent = '…';
      appendListItem(list, dots);
    }

    appendListItem(list, createPageLink(page, currentPage));
  });

  appendListItem(
    list,
    createControl({
      direction: 'next',
      page: currentPage + 1,
      disabled: currentPage >= totalPages,
    }),
  );

  pagination.replaceChildren(list);
};

const syncPagination = (pagination, queryTrail = null) => {
  const queryId = pagination.dataset.queryElementId;
  const queryInstance = window.bricksData?.queryLoopInstances?.[queryId];
  const currentPage = Math.max(
    1,
    Number.parseInt(queryInstance?.page ?? queryTrail?.dataset.page, 10) || 1,
  );
  const totalPages = Math.max(
    0,
    Number.parseInt(queryInstance?.maxPages ?? queryTrail?.dataset.maxPages, 10) || 0,
  );

  renderPagination(pagination, currentPage, totalPages);
};

const ensureArchivePaginations = (updatedQueryId = '') => {
  document.querySelectorAll(ARCHIVE_GRID_SELECTOR).forEach((archiveGrid) => {
    const queryTrail = getArchiveQueryTrail(archiveGrid);
    const queryId = queryTrail?.dataset.queryElementId;

    if (!queryId || (updatedQueryId && updatedQueryId !== queryId)) {
      return;
    }

    const totalPages = Math.max(0, Number.parseInt(queryTrail.dataset.maxPages, 10) || 0);
    let pagination = findPagination(queryId);

    if (!pagination && totalPages > 1) {
      pagination = createPagination(archiveGrid, queryId);
    }

    if (pagination) {
      syncPagination(pagination, queryTrail);
    }
  });
};

export const initArchivePagination = () => {
  window.requestAnimationFrame(() => ensureArchivePaginations());

  document.addEventListener('bricks/ajax/query_result/displayed', (event) => {
    window.requestAnimationFrame(() => ensureArchivePaginations(event.detail?.queryId));
  });
};
