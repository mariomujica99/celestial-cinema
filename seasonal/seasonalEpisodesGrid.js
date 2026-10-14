import { SKELETON_COUNT } from '../home/rails.js';
import { buildEpisodeCard, buildEpisodeSkeleton } from './seasonalEpisodeRail.js';

const API_LINKS = {
  SEASONAL: 'https://celestial-cinema-backend.onrender.com/api/v1/seasonal/'
};

const DEFAULT_PAGE_TITLE = 'Episodes';
const SEASON_KEY_PATTERN = /^[a-z-]+$/;

const gridContainer = document.getElementById('episodes-grid');
const gridTitle = document.getElementById('episodes-grid-title');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');

const urlParams = new URLSearchParams(location.search);
const seasonKey = urlParams.get('season') || '';
const pageTitle = urlParams.get('name') || DEFAULT_PAGE_TITLE;
const SCROLL_STATE_KEY = `episodes-${seasonKey}`;

function renderTitle() {
  gridTitle.textContent = pageTitle;
  document.title = `${pageTitle} | Celestial Cinema`;
}

function showSkeletons() {
  gridContainer.replaceChildren(...Array.from({ length: SKELETON_COUNT }, buildEpisodeSkeleton));
}

function renderEpisodes(episodes) {
  if (episodes.length === 0) {
    gridContainer.replaceChildren(createTextElement('p', 'episodes-grid-empty', 'No episodes yet.'));
    return;
  }
  gridContainer.replaceChildren(...episodes.map(buildEpisodeCard));
}

async function loadEpisodes() {
  try {
    const data = await fetchJsonOrThrow(`${API_LINKS.SEASONAL}${seasonKey}/episodes`);
    renderEpisodes(data.results || []);
  } catch (error) {
    console.error('Error loading episode grid:', error);
    gridContainer.replaceChildren();
    showErrorMessage('Failed to load episodes | Please try again later');
  }
}

function bindScrollStateSaving() {
  window.addEventListener('pagehide', () => saveScrollState(SCROLL_STATE_KEY));
}

async function initEpisodesGrid() {
  if (!SEASON_KEY_PATTERN.test(seasonKey)) {
    showErrorMessage('This episode list is not available | Go back and try again');
    return;
  }
  history.scrollRestoration = 'manual';
  const savedState = readSavedScrollState(SCROLL_STATE_KEY);
  bindScrollStateSaving();

  renderTitle();
  showSkeletons();
  await loadEpisodes();
  if (savedState) restoreScrollPosition(savedState.scrollY);
}

initSearchRedirect(searchForm, searchInput, 'browse.html');
initEpisodesGrid();