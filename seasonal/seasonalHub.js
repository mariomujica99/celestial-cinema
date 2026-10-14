import { getActiveSeason, getCountdownText } from '../general/seasons.js';
import { initHero } from '../home/hero.js';
import { initStreaming } from '../home/streaming.js';
import { createSeasonalRail } from './seasonalRails.js';
import { createSeasonalEpisodeRail } from './seasonalEpisodeRail.js';

const API_LINKS = {
  SEASONAL: 'https://celestial-cinema-backend.onrender.com/api/v1/seasonal/'
};

const HOME_PAGE = 'index.html';

const hubSection = document.getElementById('seasonal-hub');
const hubTitle = document.getElementById('seasonal-hub-title');
const countdownPill = document.getElementById('seasonal-pill');
const railsContainer = document.getElementById('seasonal-rails');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');

let railControllers = [];
let streamingControls = null;

// ── Header ───────────────────────────────────────────────────

function getRequestedSeasonKey() {
  return new URLSearchParams(location.search).get('season');
}

function renderSeasonHeader(activeSeason) {
  hubSection.dataset.season = activeSeason.key;
  hubTitle.textContent = activeSeason.label;
  countdownPill.textContent = getCountdownText(activeSeason);
  document.title = `${activeSeason.label} | Celestial Cinema`;
  hubSection.hidden = false;
}

// ── Rails ────────────────────────────────────────────────────

async function fetchRailList(seasonKey) {
  const seasonData = await fetchJsonOrThrow(`${API_LINKS.SEASONAL}${seasonKey}`);
  return seasonData.rails || [];
}

function createRailController({ seasonKey, railData, savedMediaIdsPromise, shownTitleKeys, savedState }) {
  if (railData.isEpisodeRail) {
    return createSeasonalEpisodeRail({ seasonKey, railData });
  }
  return createSeasonalRail({
    seasonKey,
    railData,
    savedMediaIdsPromise,
    shownTitleKeys,
    initialMediaType: savedState?.railTypes?.[railData.key]
  });
}

function renderRails({ seasonKey, railList, savedMediaIdsPromise, savedState }) {
  const shownTitleKeys = new Set();
  const controllers = railList.map(railData => createRailController({
    seasonKey, railData, savedMediaIdsPromise, shownTitleKeys, savedState
  }));

  railsContainer.append(...controllers.map(railController => railController.section));
  return controllers;
}

async function loadRails(options) {
  try {
    const railList = await fetchRailList(options.seasonKey);
    return renderRails({ ...options, railList });
  } catch (error) {
    console.error('Error loading seasonal rails:', error);
    showErrorMessage(`Failed to load ${options.seasonName} | Please try again later`);
    return [];
  }
}

// ── Scroll state ─────────────────────────────────────────────

/**
 * The saved position is "which section is at the top of the screen, and how far
 * into it", not a pixel value: sections that were still skeletons when the page
 * was left have a different height once loaded.
 */
function getScrollAnchor() {
  const visibleSections = railsContainer.querySelectorAll(':scope > section:not([hidden])');
  const anchorSection = [...visibleSections].find(section => section.getBoundingClientRect().bottom > 0);
  if (!anchorSection) return null;
  return { sectionId: anchorSection.id, offset: -anchorSection.getBoundingClientRect().top };
}

function bindScrollStateSaving(seasonKey) {
  window.addEventListener('pagehide', () => {
    saveScrollState(seasonKey, {
      anchor: getScrollAnchor(),
      railTypes: Object.fromEntries(railControllers.map(railController => [railController.key, railController.getMediaType()])),
      streaming: streamingControls?.getSelection() ?? null
    });
  });
}

/**
 * Rails load lazily, so every rail above the anchor is loaded first (in order,
 * which keeps dedupe stable) and only then is the page scrolled back.
 */
async function restoreSavedScroll(savedState) {
  const anchorSection = document.getElementById(savedState.anchor?.sectionId);
  if (!anchorSection || anchorSection.hidden) {
    restoreScrollPosition(savedState.scrollY);
    return;
  }

  for (const railController of railControllers) {
    if (railController.section === anchorSection) break;
    await railController.ensureLoaded();
  }
  const anchorTop = anchorSection.getBoundingClientRect().top + window.scrollY;
  restoreScrollPosition(anchorTop + savedState.anchor.offset);
}

// ── Init ─────────────────────────────────────────────────────

async function initSeasonalHub() {
  try {
    const activeSeason = getActiveSeason();
    if (!activeSeason || activeSeason.key !== getRequestedSeasonKey()) {
      location.replace(HOME_PAGE);
      return;
    }
    await loadSeasonalPage(activeSeason);
  } catch (error) {
    console.error('Error initializing seasonal hub:', error);
    showErrorMessage('Failed to load this page | Please try again later');
  }
}

async function loadSeasonalPage(activeSeason) {
  history.scrollRestoration = 'manual';
  renderSeasonHeader(activeSeason);

  const seasonKey = activeSeason.key;
  const savedState = readSavedScrollState(seasonKey);
  const savedMediaIdsPromise = loadSavedMediaIds();

  initHero(savedMediaIdsPromise, { heroUrl: `${API_LINKS.SEASONAL}${seasonKey}/hero`, seasonalKey: seasonKey });
  streamingControls = initStreaming(savedMediaIdsPromise, {
    streamingUrl: `${API_LINKS.SEASONAL}${seasonKey}/streaming/`,
    getBrowseParams: provider => ({ seasonal: seasonKey, name: `${provider.name} ${activeSeason.name}` }),
    initialSelection: savedState?.streaming
  });

  bindScrollStateSaving(seasonKey);
  railControllers = await loadRails({
    seasonKey, seasonName: activeSeason.name, savedMediaIdsPromise, savedState
  });
  if (savedState) await restoreSavedScroll(savedState);
}

initSearchRedirect(searchForm, searchInput, 'browse.html');
initSeasonalHub();