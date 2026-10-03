import { PAGES_PER_LOGICAL_PAGE, fetchAdditionalPages } from './pagination.js';
import { createMediaCard, createPersonCard } from './mediaCards.js';

const API_LINKS = {
  SEARCH_CATEGORIZED: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/search/categorized?query='
};

const CATEGORY_CONFIGS = {
  movies:  { responseKey: 'movies',  mediaType: 'movie' },
  tvshows: { responseKey: 'tvShows', mediaType: 'tv' },
  people:  { responseKey: 'people',  mediaType: 'person' }
};

const mediaGridContainer = document.getElementById('media-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const categoryTabsContainer = document.getElementById('category-tabs');

const categoryTabs = {
  movies:  { button: document.getElementById('tab-movies'),  badge: document.getElementById('count-movies') },
  tvshows: { button: document.getElementById('tab-tvshows'), badge: document.getElementById('count-tvshows') },
  people:  { button: document.getElementById('tab-people'),  badge: document.getElementById('count-people') }
};

let savedMediaIds = new Set();
let categorizedResults = { movies: [], tvshows: [], people: [] };
let renderedSearchIds = createEmptyIdSets();
let searchTotalCounts = { movies: 0, tvshows: 0, people: 0 };
let activeCategoryTab = 'movies';
let currentSearchTerm = '';
let currentSearchPage = 1;
let searchRequestToken = 0;
let isLoadingSearch = false;

function createEmptyIdSets() {
  return { movies: new Set(), tvshows: new Set(), people: new Set() };
}

function getSearchCounts(searchData) {
  return {
    movies: searchData.movieCount || 0,
    tvshows: searchData.tvCount || 0,
    people: searchData.peopleCount || 0
  };
}

function hasUnloadedResults() {
  return Object.keys(searchTotalCounts)
    .some(category => categorizedResults[category].length < searchTotalCounts[category]);
}

/**
 * Merges a categorized-search page into categorizedResults, skipping any
 * item whose id was already added. TMDB can repeat items across
 * consecutive result pages.
 */
function mergeUniqueCategorized(searchData) {
  Object.entries(CATEGORY_CONFIGS).forEach(([category, { responseKey }]) => {
    (searchData[responseKey] || []).forEach(item => {
      if (renderedSearchIds[category].has(item.id)) return;
      renderedSearchIds[category].add(item.id);
      categorizedResults[category].push(item);
    });
  });
}

function appendSearchCards(items, category) {
  const { mediaType } = CATEGORY_CONFIGS[category];
  items.forEach(itemData => {
    const card = mediaType === 'person'
      ? createPersonCard(itemData)
      : createMediaCard(itemData, mediaType, savedMediaIds);
    mediaGridContainer.appendChild(card);
  });
}

function appendNewSearchItems(searchData) {
  const previousCount = categorizedResults[activeCategoryTab].length;
  mergeUniqueCategorized(searchData);
  appendSearchCards(categorizedResults[activeCategoryTab].slice(previousCount), activeCategoryTab);
}

function updateSearchLoadMore() {
  const hasMoreResults = categorizedResults[activeCategoryTab].length < searchTotalCounts[activeCategoryTab];
  loadMoreContainer.style.display = hasMoreResults && !isLoadingSearch ? 'flex' : 'none';
  loadMoreBtn.textContent = 'Load More';
  loadMoreBtn.disabled = false;
}

function renderCategoryResults(category) {
  mediaGridContainer.innerHTML = '';
  const items = categorizedResults[category];

  if (items.length === 0) {
    mediaGridContainer.innerHTML = '<div class="no-media">No results in this category</div>';
    loadMoreContainer.style.display = 'none';
    return;
  }

  appendSearchCards(items, category);
  updateSearchLoadMore();
}

function setActiveCategoryTab(category) {
  activeCategoryTab = category;
  Object.entries(categoryTabs).forEach(([tabCategory, { button }]) => {
    button.classList.toggle('active', tabCategory === category);
  });
  renderCategoryResults(category);
}

function showCategoryTabs(counts) {
  const rankedCategories = rankSearchCategories(counts.movies, counts.tvshows, counts.people);

  rankedCategories.forEach(category => {
    const { button, badge } = categoryTabs[category];
    badge.textContent = Math.min(counts[category], 999);
    button.disabled = counts[category] === 0;
    categoryTabsContainer.appendChild(button);
  });

  categoryTabsContainer.style.display = 'flex';
  setActiveCategoryTab(rankedCategories[0]);
}

function loadFollowUpSearchPages(firstPage, requestToken) {
  fetchAdditionalPages({
    baseUrl: `${API_LINKS.SEARCH_CATEGORIZED}${encodeURIComponent(currentSearchTerm)}`,
    firstTmdbPage: firstPage,
    onPageLoaded: (pageData) => {
      if (requestToken === searchRequestToken) appendNewSearchItems(pageData);
    },
    onComplete: () => {
      if (requestToken !== searchRequestToken) return;
      currentSearchPage = firstPage + PAGES_PER_LOGICAL_PAGE - 1;
      isLoadingSearch = false;
      updateSearchLoadMore();
    }
  });
}

async function fetchSearchPage(query, page) {
  return fetchJsonOrThrow(`${API_LINKS.SEARCH_CATEGORIZED}${encodeURIComponent(query)}&page=${page}`);
}

function resetSearchState(query) {
  categorizedResults = { movies: [], tvshows: [], people: [] };
  renderedSearchIds = createEmptyIdSets();
  searchTotalCounts = { movies: 0, tvshows: 0, people: 0 };
  currentSearchTerm = query;
  currentSearchPage = 1;
  isLoadingSearch = false;
  mediaGridContainer.innerHTML = '';
  loadMoreContainer.style.display = 'none';
  categoryTabsContainer.style.display = 'none';
}

function handleFirstSearchPage(searchData, requestToken) {
  const counts = getSearchCounts(searchData);
  if (Object.values(counts).every(count => count === 0)) {
    mediaGridContainer.innerHTML = '<div class="no-media">No results found matching your search</div>';
    return;
  }

  searchTotalCounts = counts;
  mergeUniqueCategorized(searchData);
  isLoadingSearch = hasUnloadedResults();
  showCategoryTabs(counts);
  if (isLoadingSearch) loadFollowUpSearchPages(1, requestToken);
}

export async function searchCategorized(query) {
  searchRequestToken++;
  const requestToken = searchRequestToken;
  resetSearchState(query);

  try {
    const searchData = await fetchSearchPage(query, 1);
    if (requestToken !== searchRequestToken) return;
    handleFirstSearchPage(searchData, requestToken);
  } catch (error) {
    if (requestToken !== searchRequestToken) return;
    console.error('Error fetching search results:', error);
    mediaGridContainer.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
  }
}

export async function loadMoreSearchResults() {
  if (isLoadingSearch) return;
  isLoadingSearch = true;
  loadMoreBtn.textContent = 'Loading';
  loadMoreBtn.disabled = true;

  const requestToken = searchRequestToken;
  const firstPage = currentSearchPage + 1;

  try {
    const searchData = await fetchSearchPage(currentSearchTerm, firstPage);
    if (requestToken !== searchRequestToken) return;
    appendNewSearchItems(searchData);
    loadFollowUpSearchPages(firstPage, requestToken);
  } catch (error) {
    if (requestToken !== searchRequestToken) return;
    console.error('Error loading more search results:', error);
    isLoadingSearch = false;
    updateSearchLoadMore();
    showErrorMessage('Failed to load more results. Please try again.');
  }
}

export function initBrowseSearch(loadedSavedMediaIds) {
  savedMediaIds = loadedSavedMediaIds;
  Object.entries(categoryTabs).forEach(([category, { button }]) => {
    button.addEventListener('click', () => {
      if (!button.disabled) setActiveCategoryTab(category);
    });
  });
}