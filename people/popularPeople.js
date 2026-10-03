import { PAGES_PER_LOGICAL_PAGE, buildPageUrl, fetchAdditionalPages } from '../browse/pagination.js';
import { createPersonCard } from '../browse/mediaCards.js';

const API_LINKS = {
  POPULAR_PEOPLE: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/people/popular'
};

const PATH_PREFIX = '../';

const mediaGridContainer = document.getElementById('media-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');

let currentTmdbPage = 1;
let hasMorePeople = true;
let isLoadingPeople = false;
let renderedPeopleIds = new Set();

initSearchRedirect(searchForm, searchInput);

function setLoadMoreButton(label, isDisabled) {
  loadMoreBtn.textContent = label;
  loadMoreBtn.disabled = isDisabled;
}

function updateLoadMoreVisibility() {
  loadMoreContainer.style.display = hasMorePeople ? 'flex' : 'none';
  setLoadMoreButton('Load More', false);
}

/**
 * Renders one TMDB page of people. TMDB can repeat items across
 * consecutive pages, so already-rendered ids are skipped.
 */
function renderPeoplePage(pageData, shouldShowEmptyMessage) {
  const results = pageData.results || [];
  if (results.length === 0) {
    if (shouldShowEmptyMessage) {
      mediaGridContainer.innerHTML = '<div class="no-media">No people found</div>';
    }
    return;
  }

  results
    .filter(personData => !renderedPeopleIds.has(personData.id))
    .forEach(personData => {
      renderedPeopleIds.add(personData.id);
      mediaGridContainer.appendChild(createPersonCard(personData, PATH_PREFIX));
    });
}

function loadFollowUpPeoplePages(pageData, firstTmdbPage) {
  const totalPages = pageData.total_pages || Infinity;
  if (firstTmdbPage >= totalPages) {
    currentTmdbPage = firstTmdbPage + 1;
    hasMorePeople = false;
    isLoadingPeople = false;
    updateLoadMoreVisibility();
    return;
  }

  fetchAdditionalPages({
    baseUrl: API_LINKS.POPULAR_PEOPLE,
    firstTmdbPage,
    onPageLoaded: (extraPageData) => renderPeoplePage(extraPageData, false),
    onComplete: (finalTotalPages) => {
      currentTmdbPage = Math.min(firstTmdbPage + PAGES_PER_LOGICAL_PAGE, finalTotalPages + 1);
      hasMorePeople = currentTmdbPage <= finalTotalPages;
      isLoadingPeople = false;
      updateLoadMoreVisibility();
    }
  });
}

function handlePeopleLoadError(error, isAppend) {
  console.error('Error fetching popular people:', error);
  isLoadingPeople = false;

  if (isAppend) {
    setLoadMoreButton('Load More', false);
    showErrorMessage('Failed to load more people. Please try again.');
    return;
  }

  mediaGridContainer.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
  loadMoreContainer.style.display = 'none';
}

async function loadPeople(isAppend = false) {
  if (isLoadingPeople || !hasMorePeople) return;
  isLoadingPeople = true;
  const firstTmdbPage = currentTmdbPage;
  if (isAppend) setLoadMoreButton('Loading', true);

  try {
    const pageData = await fetchJsonOrThrow(buildPageUrl(API_LINKS.POPULAR_PEOPLE, firstTmdbPage));
    renderPeoplePage(pageData, !isAppend);
    loadFollowUpPeoplePages(pageData, firstTmdbPage);
  } catch (error) {
    handlePeopleLoadError(error, isAppend);
  }
}

loadMoreBtn.addEventListener('click', () => loadPeople(true));

loadPeople();