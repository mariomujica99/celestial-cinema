import { createMediaCard } from './browse/mediaCards.js';
import { PAGES_PER_LOGICAL_PAGE, buildPageUrl, fetchAdditionalPages } from './browse/pagination.js';
import { initBrowseSearch, searchCategorized, loadMoreSearchResults } from './browse/browseSearch.js';

const API_LINKS = {
  TRENDING_WEEK:    'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/week',
  POPULAR:          'https://celestial-cinema-backend.onrender.com/api/v1/movies/popular',
  NOW_PLAYING:      'https://celestial-cinema-backend.onrender.com/api/v1/movies/now-playing?region=US',
  UPCOMING:         'https://celestial-cinema-backend.onrender.com/api/v1/movies/upcoming?region=US',
  TOP_RATED:        'https://celestial-cinema-backend.onrender.com/api/v1/movies/top-rated',
  BOX_OFFICE:       'https://celestial-cinema-backend.onrender.com/api/v1/movies/box-office',
  TRENDING_TV_WEEK: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/tv/week',
  POPULAR_TV:       'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/popular',
  TV_AIRING_TODAY:  'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/airing-today',
  TV_TOP_RATED:     'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/top-rated',
  TV_UPCOMING:      'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/upcoming',
  MOVIE_GENRE:      'https://celestial-cinema-backend.onrender.com/api/v1/movies/genre/',
  TV_GENRE:         'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/genre/',
  STREAMING:        'https://celestial-cinema-backend.onrender.com/api/v1/movies/streaming/'
};

const DEFAULT_LIST_KEY = 'trending';

const MEDIA_TYPE_LABELS = { movie: 'Movies', tv: 'TV Shows' };

const LIST_CONFIGS = {
  movie: {
    'trending':    { url: API_LINKS.TRENDING_WEEK,    title: 'Trending Movies' },
    'popular':     { url: API_LINKS.POPULAR,          title: 'Popular Movies' },
    'now-playing': { url: API_LINKS.NOW_PLAYING,      title: 'Now Playing Movies' },
    'upcoming':    { url: API_LINKS.UPCOMING,         title: 'Upcoming Movies' },
    'top-rated':   { url: API_LINKS.TOP_RATED,        title: 'Top Rated Movies' },
    'box-office':  { url: API_LINKS.BOX_OFFICE,       title: 'Top Box Office' }
  },
  tv: {
    'trending':     { url: API_LINKS.TRENDING_TV_WEEK, title: 'Trending TV Shows' },
    'popular':      { url: API_LINKS.POPULAR_TV,       title: 'Popular TV Shows' },
    'airing-today': { url: API_LINKS.TV_AIRING_TODAY,  title: 'Airing Today TV Shows' },
    'upcoming':     { url: API_LINKS.TV_UPCOMING,      title: 'Upcoming TV Shows' },
    'top-rated':    { url: API_LINKS.TV_TOP_RATED,     title: 'Top Rated TV Shows' }
  }
};

const mediaGridContainer = document.getElementById('media-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const pageTitleElement = document.getElementById('page-title');

const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get('search');
const genreParam = urlParams.get('genre');
const providerParam = urlParams.get('provider');
const listParam = urlParams.get('list') || DEFAULT_LIST_KEY;
const nameParam = urlParams.get('name') || '';
const mediaType = urlParams.get('type') === 'tv' ? 'tv' : 'movie';

let activeSource = null;
let currentTmdbPage = 1;
let hasMoreMedia = true;
let isLoadingMedia = false;
let isSearchMode = false;
let mediaRequestToken = 0;
let renderedMediaIds = new Set();
let savedMediaIds = new Set();

function buildListSource() {
  const listConfig = LIST_CONFIGS[mediaType][listParam];
  return listConfig?.url ? { url: listConfig.url, title: listConfig.title } : null;
}

function buildGenreSource() {
  if (!/^\d+$/.test(genreParam)) return null;
  const genreUrl = mediaType === 'tv' ? API_LINKS.TV_GENRE : API_LINKS.MOVIE_GENRE;
  return {
    url: `${genreUrl}${genreParam}`,
    title: `${nameParam} ${MEDIA_TYPE_LABELS[mediaType]}`.trim()
  };
}

function buildProviderSource() {
  if (!/^\d+$/.test(providerParam)) return null;
  return {
    url: `${API_LINKS.STREAMING}${providerParam}?type=${mediaType}`,
    title: `${nameParam || 'Streaming'} ${MEDIA_TYPE_LABELS[mediaType]}`
  };
}

function resolveBrowseSource() {
  if (genreParam) return buildGenreSource();
  if (providerParam) return buildProviderSource();
  return buildListSource();
}

function showPageTitle(title) {
  pageTitleElement.textContent = title;
  pageTitleElement.hidden = false;
}

function setLoadMoreButton(label, isDisabled) {
  loadMoreBtn.textContent = label;
  loadMoreBtn.disabled = isDisabled;
}

function updateLoadMoreVisibility() {
  loadMoreContainer.style.display = hasMoreMedia ? 'flex' : 'none';
  setLoadMoreButton('Load More', false);
}

function resetMediaState() {
  mediaRequestToken++;
  mediaGridContainer.innerHTML = '';
  loadMoreContainer.style.display = 'none';
  currentTmdbPage = 1;
  hasMoreMedia = true;
  renderedMediaIds = new Set();
}

/**
 * Renders one TMDB page's results into the grid. Shared by the initial
 * fetch and each background-loaded follow-up page. TMDB can return the
 * same item across consecutive pages, so already-rendered ids are skipped.
 */
function renderMediaPage(pageData, shouldShowEmptyMessage) {
  const results = pageData.results || [];
  if (results.length === 0) {
    if (shouldShowEmptyMessage) {
      mediaGridContainer.innerHTML = '<div class="no-media">No media found matching your search</div>';
      loadMoreContainer.style.display = 'none';
    }
    return;
  }

  results
    .filter(itemData => !renderedMediaIds.has(itemData.id))
    .forEach(itemData => {
      renderedMediaIds.add(itemData.id);
      mediaGridContainer.appendChild(createMediaCard(itemData, mediaType, savedMediaIds));
    });
    loadCcmdbPills(mediaGridContainer);
}

function loadFollowUpMediaPages(pageData, firstTmdbPage, requestToken) {
  const totalPages = pageData.total_pages || Infinity;
  if (firstTmdbPage >= totalPages) {
    currentTmdbPage = firstTmdbPage + 1;
    hasMoreMedia = false;
    updateLoadMoreVisibility();
    return;
  }

  fetchAdditionalPages({
    baseUrl: activeSource.url,
    firstTmdbPage,
    onPageLoaded: (extraPageData) => {
      if (requestToken === mediaRequestToken) renderMediaPage(extraPageData, false);
    },
    onComplete: (finalTotalPages) => {
      if (requestToken !== mediaRequestToken) return;
      currentTmdbPage = Math.min(firstTmdbPage + PAGES_PER_LOGICAL_PAGE, finalTotalPages + 1);
      hasMoreMedia = currentTmdbPage <= finalTotalPages;
      updateLoadMoreVisibility();
    }
  });
}

function handleMediaLoadError(error, requestToken, isAppend) {
  console.error('Error fetching content:', error);
  if (requestToken !== mediaRequestToken) return;

  isLoadingMedia = false;
  if (isAppend) {
    setLoadMoreButton('Load More', false);
    showErrorMessage('Failed to load more. Please try again.');
    return;
  }

  mediaGridContainer.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
  loadMoreContainer.style.display = 'none';
}

async function loadMedia(isAppend = false) {
  const requestToken = mediaRequestToken;
  const firstTmdbPage = currentTmdbPage;
  isLoadingMedia = true;
  if (isAppend) setLoadMoreButton('Loading', true);

  try {
    const pageData = await fetchJsonOrThrow(buildPageUrl(activeSource.url, firstTmdbPage));
    if (requestToken !== mediaRequestToken) return;

    renderMediaPage(pageData, !isAppend);
    isLoadingMedia = false;
    loadFollowUpMediaPages(pageData, firstTmdbPage, requestToken);
  } catch (error) {
    handleMediaLoadError(error, requestToken, isAppend);
  }
}

function startBrowseSource() {
  const source = resolveBrowseSource();
  if (!source) {
    showErrorMessage('That list is not available. Pick another one from the menu.');
    mediaGridContainer.innerHTML = '<div class="no-media">Nothing to show here</div>';
    return;
  }

  activeSource = source;
  showPageTitle(source.title);
  resetMediaState();
  loadMedia();
}

function startSearch(query) {
  isSearchMode = true;
  mediaRequestToken++;
  pageTitleElement.hidden = true;
  searchCategorized(query);
}

function handleLoadMoreClick() {
  if (isSearchMode) {
    loadMoreSearchResults();
    return;
  }
  if (isLoadingMedia || !hasMoreMedia) return;
  loadMedia(true);
}

function handleSearchSubmit(e) {
  e.preventDefault();
  const searchTerm = searchInput.value.trim();
  if (searchTerm) startSearch(searchTerm);
}

async function initBrowsePage() {
  savedMediaIds = await loadSavedMediaIds();
  initBrowseSearch(savedMediaIds);

  if (searchParam) {
    searchInput.value = searchParam;
    startSearch(searchParam);
    return;
  }
  startBrowseSource();
}

loadMoreBtn.addEventListener('click', handleLoadMoreClick);
searchForm.addEventListener('submit', handleSearchSubmit);

initBrowsePage();