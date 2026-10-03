export const PAGES_PER_LOGICAL_PAGE = 3;

export function buildPageUrl(baseUrl, page) {
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${page}`;
}

/**
 * Defers a callback using requestIdleCallback when available, falling back
 * to setTimeout so background page fetches don't compete with on-load
 * requests (watchlist sync, cast, etc.) for bandwidth/priority.
 */
function deferTask(callback) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 300);
  }
}

/**
 * Fetches up to (PAGES_PER_LOGICAL_PAGE - 1) additional TMDB pages in the
 * background, deferred so they don't compete with initial page-load
 * requests. Calls onPageLoaded(data) as each page resolves, and
 * onComplete(lastTotalPages) once all background pages have settled
 * (or fetching stops early due to hitting total_pages).
 *
 * @param {object} options
 * @param {string} options.baseUrl - URL without a page param
 * @param {number} options.firstTmdbPage - the TMDB page already fetched/rendered
 * @param {Function} options.onPageLoaded - fn(data) called per page
 * @param {Function} options.onComplete - fn(lastTotalPages) called when done
 */
export function fetchAdditionalPages({ baseUrl, firstTmdbPage, onPageLoaded, onComplete }) {
  let lastTotalPages = Infinity;

  const fetchNext = (offset) => {
    if (offset >= PAGES_PER_LOGICAL_PAGE) {
      onComplete(lastTotalPages);
      return;
    }

    const tmdbPage = firstTmdbPage + offset;
    if (tmdbPage > lastTotalPages) {
      onComplete(lastTotalPages);
      return;
    }

    deferTask(() => {
      fetch(buildPageUrl(baseUrl, tmdbPage))
        .then(res => res.json())
        .then(data => {
          lastTotalPages = data.total_pages || lastTotalPages;
          onPageLoaded(data);
          fetchNext(offset + 1);
        })
        .catch(error => {
          console.error('Error fetching additional page:', error);
          onComplete(lastTotalPages);
        });
    });
  };

  fetchNext(1);
}