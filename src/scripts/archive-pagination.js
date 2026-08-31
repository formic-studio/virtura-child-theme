const PAGINATION_SELECTOR = '.virtura-archive-pagination[data-query-element-id]';
const ARCHIVE_GRID_SELECTOR = '.archive-grid';
const QUERY_TRAIL_SELECTOR = '.brx-query-trail[data-query-element-id][data-query-vars]';
const ARCHIVE_POST_TYPES = new Set(['post', 'realizacja']);
const FILTER_CLICK_TYPES = new Set(['active-filters', 'apply', 'reset']);
const pendingPaginationQueries = new Set();
const revealTimers = new Map();
const archiveRequests = new Map();

const PREVIOUS_LABEL = 'Poprzednia strona';
const NEXT_LABEL = 'Następna strona';
const PAGE_LABEL = 'Strona';

const parseQueryVariables = (queryVariables) => {
  try {
    return JSON.parse(queryVariables || '{}');
  } catch {
    return {};
  }
};

const isArchiveQuery = (queryVariables) => {
  const postTypes = Array.isArray(queryVariables.post_type)
    ? queryVariables.post_type
    : [queryVariables.post_type];

  return postTypes.some((postType) => ARCHIVE_POST_TYPES.has(postType));
};

const getArchiveQueryContext = (archiveGrid) => {
  const queryTrail = Array.from(archiveGrid.querySelectorAll(QUERY_TRAIL_SELECTOR)).find(
    (trail) => isArchiveQuery(parseQueryVariables(trail.dataset.queryVars)),
  );

  if (queryTrail) {
    const queryId = queryTrail.dataset.queryElementId;

    return {
      queryId,
      queryInstance: window.bricksData?.queryLoopInstances?.[queryId],
      queryTrail,
    };
  }

  const queryEntry = Object.entries(window.bricksData?.queryLoopInstances || {}).find(
    ([, queryInstance]) =>
      queryInstance?.resultsContainer === archiveGrid &&
      isArchiveQuery(parseQueryVariables(queryInstance.queryVars)),
  );

  if (!queryEntry) {
    return null;
  }

  return {
    queryId: queryEntry[0],
    queryInstance: queryEntry[1],
    queryTrail: null,
  };
};

const getArchiveGridForQuery = (queryId) => {
  const resultsContainer = window.bricksData?.queryLoopInstances?.[queryId]?.resultsContainer;

  if (!(resultsContainer instanceof HTMLElement)) {
    return null;
  }

  return resultsContainer.matches(ARCHIVE_GRID_SELECTOR)
    ? resultsContainer
    : resultsContainer.closest(ARCHIVE_GRID_SELECTOR);
};

const getArchiveItems = (archiveGrid) =>
  archiveGrid.querySelectorAll(
    ':scope > .archive-block, :scope > .bricks-layout-wrapper > .bricks-layout-item',
  );

const getFilterInstance = (filterElement) =>
  Object.values(window.bricksData?.filterInstances || {}).find(
    (filterInstance) => filterInstance.filterElement === filterElement,
  );

const getPageNumberFromUrl = (urlValue = window.location.href) => {
  const url = new URL(urlValue, window.location.href);
  const pathMatch = url.pathname.match(/\/page\/(\d+)\/?$/);

  return Math.max(
    1,
    Number.parseInt(url.searchParams.get('paged') || pathMatch?.[1], 10) || 1,
  );
};

const setQueryPage = (queryId, page) => {
  const queryInstance = window.bricksData?.queryLoopInstances?.[queryId];

  if (!queryInstance) {
    return false;
  }

  const updateQueryVariables = (queryVariables) => {
    const parsedVariables = parseQueryVariables(queryVariables);

    parsedVariables.paged = page;

    return JSON.stringify(parsedVariables);
  };

  queryInstance.queryVars = updateQueryVariables(queryInstance.queryVars);

  if (queryInstance.originalQueryVars && queryInstance.originalQueryVars !== '[]') {
    queryInstance.originalQueryVars = updateQueryVariables(queryInstance.originalQueryVars);
  }

  queryInstance.page = page;

  return true;
};

const getArchivePageUrl = (page) => {
  const url = new URL(window.location.href);
  const basePath = url.pathname.replace(/\/page\/\d+\/?$/, '/').replace(/\/?$/, '/');

  url.pathname = page > 1 ? `${basePath}page/${page}/` : basePath;
  url.searchParams.delete('paged');

  return url;
};

const getResponseArchiveContext = (responseDocument, queryId) => {
  const archiveGrid = Array.from(responseDocument.querySelectorAll(ARCHIVE_GRID_SELECTOR)).find(
    (grid) =>
      Array.from(grid.querySelectorAll(QUERY_TRAIL_SELECTOR)).some(
        (queryTrail) => queryTrail.dataset.queryElementId === queryId,
      ),
  );

  if (!archiveGrid) {
    return null;
  }

  const queryTrail = Array.from(archiveGrid.querySelectorAll(QUERY_TRAIL_SELECTOR)).find(
    (trail) => trail.dataset.queryElementId === queryId,
  );

  return queryTrail ? { archiveGrid, queryTrail } : null;
};

const updateQueryInstanceFromTrail = (queryId, queryTrail) => {
  const queryInstance = window.bricksData?.queryLoopInstances?.[queryId];

  if (!queryInstance) {
    return;
  }

  queryInstance.queryVars = queryTrail.dataset.queryVars || queryInstance.queryVars;
  queryInstance.originalQueryVars =
    queryTrail.dataset.originalQueryVars || queryInstance.originalQueryVars;
  queryInstance.page = Number.parseInt(queryTrail.dataset.page, 10) || 1;
  queryInstance.maxPages = Number.parseInt(queryTrail.dataset.maxPages, 10) || 0;
  queryInstance.start = Number.parseInt(queryTrail.dataset.start, 10) || 0;
  queryInstance.end = Number.parseInt(queryTrail.dataset.end, 10) || 0;
};

const replaceArchiveGrid = (queryId, responseContext) => {
  const archiveGrid = getArchiveGridForQuery(queryId);
  const responseGrid = responseContext.archiveGrid.cloneNode(true);
  const responseQueryTrail = Array.from(
    responseGrid.querySelectorAll(QUERY_TRAIL_SELECTOR),
  ).find((trail) => trail.dataset.queryElementId === queryId);

  if (!archiveGrid || !responseQueryTrail) {
    return false;
  }

  updateQueryInstanceFromTrail(queryId, responseQueryTrail);
  responseGrid.querySelectorAll(QUERY_TRAIL_SELECTOR).forEach((queryTrail) => {
    queryTrail.remove();
  });
  archiveGrid.replaceChildren(...responseGrid.childNodes);

  const loopStartElement = Array.from(archiveGrid.querySelectorAll('[data-brx-loop-start]')).find(
    (element) => element.dataset.brxLoopStart === queryId,
  );

  if (loopStartElement) {
    loopStartElement.before(document.createComment(`brx-loop-start-${queryId}`));
    loopStartElement.removeAttribute('data-brx-loop-start');
  }

  document.dispatchEvent(
    new CustomEvent('bricks/ajax/nodes_added', { detail: { queryId } }),
  );

  return true;
};

const loadArchivePage = async (queryId, urlValue, { pushHistory = true } = {}) => {
  const queryInstance = window.bricksData?.queryLoopInstances?.[queryId];

  if (!queryInstance) {
    window.location.assign(urlValue);
    return;
  }

  archiveRequests.get(queryId)?.abort();

  const controller = new AbortController();

  archiveRequests.set(queryId, controller);
  queryInstance.isLoading = 1;
  document.dispatchEvent(new CustomEvent('bricks/ajax/start', { detail: { queryId } }));

  try {
    const response = await window.fetch(urlValue, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Archive request failed with status ${response.status}`);
    }

    const responseDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
    const responseContext = getResponseArchiveContext(responseDocument, queryId);

    if (!responseContext || !replaceArchiveGrid(queryId, responseContext)) {
      throw new Error('Archive query was not found in the response');
    }

    if (pushHistory) {
      window.history.pushState(
        { isVirturaArchivePagination: true, queryId },
        '',
        urlValue,
      );
    }

    document.dispatchEvent(
      new CustomEvent('bricks/ajax/query_result/displayed', { detail: { queryId } }),
    );
    document.dispatchEvent(new CustomEvent('bricks/ajax/end', { detail: { queryId } }));
  } catch (error) {
    if (error.name !== 'AbortError') {
      window.location.assign(urlValue);
    }
  } finally {
    if (archiveRequests.get(queryId) === controller) {
      archiveRequests.delete(queryId);
      queryInstance.isLoading = 0;
    }
  }
};

const resetQueryToFirstPage = (queryId) => {
  const queryInstance = window.bricksData?.queryLoopInstances?.[queryId];

  if (!queryInstance || Number.parseInt(queryInstance.page, 10) <= 1) {
    return;
  }

  setQueryPage(queryId, 1);
  window.history.replaceState(window.history.state, '', getArchivePageUrl(1));
};

const startArchiveUpdate = (queryId) => {
  const archiveGrid = getArchiveGridForQuery(queryId);
  const pagination = findPagination(queryId);

  archiveGrid?.classList.remove('is-ajax-revealing');
  archiveGrid?.classList.add('is-ajax-updating');
  pagination?.setAttribute('aria-busy', 'true');
};

const revealArchiveItems = (queryId) => {
  const archiveGrid = getArchiveGridForQuery(queryId);
  const pagination = findPagination(queryId);

  if (!archiveGrid) {
    return;
  }

  const items = getArchiveItems(archiveGrid);
  const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  archiveGrid.classList.remove('is-ajax-updating', 'is-ajax-revealing');
  pagination?.removeAttribute('aria-busy');
  items.forEach((item, index) => {
    item.style.setProperty('--virtura-archive-item-index', String(Math.min(index, 10)));
  });

  if (!shouldReduceMotion && items.length) {
    void archiveGrid.offsetWidth;
    archiveGrid.classList.add('is-ajax-revealing');
    window.clearTimeout(revealTimers.get(queryId));
    revealTimers.set(
      queryId,
      window.setTimeout(() => {
        archiveGrid.classList.remove('is-ajax-revealing');
        revealTimers.delete(queryId);
      }, 850),
    );
  }

  if (pendingPaginationQueries.delete(queryId)) {
    archiveGrid.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
};

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
  return getArchivePageUrl(page).toString();
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
    const queryContext = getArchiveQueryContext(archiveGrid);
    const queryId = queryContext?.queryId;

    if (!queryId || (updatedQueryId && updatedQueryId !== queryId)) {
      return;
    }

    const totalPages = Math.max(
      0,
      Number.parseInt(
        queryContext.queryInstance?.maxPages ?? queryContext.queryTrail?.dataset.maxPages,
        10,
      ) || 0,
    );
    let pagination = findPagination(queryId);

    if (!pagination && totalPages > 1) {
      pagination = createPagination(archiveGrid, queryId);
    }

    if (pagination) {
      syncPagination(pagination, queryContext.queryTrail);
    }
  });
};

const handlePaginationClick = (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  const link = event.target.closest(`${PAGINATION_SELECTOR} a.page-numbers`);

  if (!(link instanceof HTMLAnchorElement)) {
    return;
  }

  const pagination = link.closest(PAGINATION_SELECTOR);
  const queryId = pagination?.dataset.queryElementId;
  const queryInstance = window.bricksData?.queryLoopInstances?.[queryId];

  if (!queryId || !queryInstance || typeof window.fetch !== 'function') {
    return;
  }

  event.preventDefault();

  if (queryInstance.isLoading) {
    return;
  }

  pendingPaginationQueries.add(queryId);
  void loadArchivePage(queryId, link.href);
};

const handleFilterInteraction = (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const filterElement = event.target.closest('[data-brx-filter]');

  if (!(filterElement instanceof HTMLElement)) {
    return;
  }

  const filterInstance = getFilterInstance(filterElement);

  if (
    !filterInstance ||
    (event.type === 'click' && !FILTER_CLICK_TYPES.has(filterInstance.filterType))
  ) {
    return;
  }

  if (getArchiveGridForQuery(filterInstance.targetQueryId)) {
    resetQueryToFirstPage(filterInstance.targetQueryId);
  }
};

const handleBrowserHistory = (event) => {
  if (!event.state?.isVirturaArchivePagination) {
    return;
  }

  const queryId = event.state.queryId;

  if (queryId && getArchiveGridForQuery(queryId)) {
    pendingPaginationQueries.add(queryId);
    void loadArchivePage(queryId, window.location.href, { pushHistory: false });
  }
};

const markInitialArchiveHistory = () => {
  if (getPageNumberFromUrl() <= 1 || window.history.state?.isVirturaArchivePagination) {
    return;
  }

  const archiveGrid = document.querySelector(ARCHIVE_GRID_SELECTOR);
  const queryId = archiveGrid ? getArchiveQueryContext(archiveGrid)?.queryId : '';

  if (queryId) {
    window.history.replaceState(
      { isVirturaArchivePagination: true, queryId },
      '',
      window.location.href,
    );
  }
};

export const initArchivePagination = () => {
  window.requestAnimationFrame(() => {
    ensureArchivePaginations();
    markInitialArchiveHistory();
  });

  document.addEventListener('click', handlePaginationClick);
  document.addEventListener('change', handleFilterInteraction, true);
  document.addEventListener('click', handleFilterInteraction, true);
  window.addEventListener('popstate', handleBrowserHistory);

  document.addEventListener('bricks/ajax/start', (event) => {
    startArchiveUpdate(event.detail?.queryId);
  });

  document.addEventListener('bricks/ajax/query_result/displayed', (event) => {
    const queryId = event.detail?.queryId;

    window.requestAnimationFrame(() => {
      ensureArchivePaginations(queryId);
      revealArchiveItems(queryId);
    });
  });
};
