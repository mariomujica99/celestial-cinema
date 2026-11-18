import { RAIL_ITEM_LIMIT, observeOnce } from '../home/rails.js';
import { buildMediaToggle, createPosterLoader, fetchListResults, updateToggleState } from '../home/switchRail.js';

const API_LINKS = {
  SEASONAL: 'https://celestial-cinema-backend.onrender.com/api/v1/seasonal/'
};

const MAX_RAIL_PAGES = 3;

// ── URLs ─────────────────────────────────────────────────────

function buildRailUrl(seasonKey, railKey, mediaType, page) {
  return `${API_LINKS.SEASONAL}${seasonKey}/rail/${railKey}?type=${mediaType}&page=${page}`;
}

function buildBrowseUrl(seasonKey, railData, mediaType) {
  const browseParams = new URLSearchParams({
    seasonal: seasonKey,
    rail: railData.key,
    type: mediaType,
    name: railData.title
  });
  return `browse.html?${browseParams.toString()}`;
}

// ── Markup ───────────────────────────────────────────────────

function buildTitleLink(railTitle) {
  const chevron = document.createElement('span');
  chevron.className = 'home-rail-chevron';
  chevron.setAttribute('aria-hidden', 'true');

  const titleLink = document.createElement('a');
  titleLink.className = 'home-rail-title-link';
  titleLink.append(createTextElement('h2', 'home-rail-title', railTitle), chevron);
  return titleLink;
}

export function buildRailSection(railData) {
  const railHeading = document.createElement('div');
  railHeading.className = 'home-rail-heading';
  railHeading.appendChild(buildTitleLink(railData.title));

  const railHeader = document.createElement('header');
  railHeader.className = 'home-rail-header home-rail-header--with-controls';
  railHeader.appendChild(railHeading);

  const railTrack = document.createElement('div');
  railTrack.className = 'home-rail-track';

  const railSection = document.createElement('section');
  railSection.className = 'home-rail';
  railSection.id = `rail-${railData.key}`;
  railSection.append(railHeader, railTrack);
  return railSection;
}

// ── Items + dedupe ───────────────────────────────────────────

/**
 * Fetches a rail's raw pages per media type. Titles already shown in other rails
 * are dropped only when the rail claims its items at render time, so two rails
 * loading at once cannot both claim the same title. Keys include the media type
 * because TMDB movie and TV ids can collide.
 */
function createRailItemSource({ seasonKey, railKey, shownTitleKeys }) {
  const rawItemsByType = new Map();

  const getDedupeKey = (itemData, mediaType) => `${mediaType}:${itemData.id}`;
  const isUnseen = (itemData, mediaType) => !shownTitleKeys.has(getDedupeKey(itemData, mediaType));

  function countUnseen(rawItems, mediaType) {
    return rawItems.filter(itemData => isUnseen(itemData, mediaType)).length;
  }

  async function fetchRawItems(mediaType) {
    const rawItems = [];
    for (let page = 1; page <= MAX_RAIL_PAGES; page += 1) {
      const pageResults = await fetchListResults(buildRailUrl(seasonKey, railKey, mediaType, page));
      if (pageResults.length === 0) break;
      rawItems.push(...pageResults);
      if (countUnseen(rawItems, mediaType) >= RAIL_ITEM_LIMIT) break;
    }
    return rawItems;
  }

  function getRawItems(mediaType) {
    if (!rawItemsByType.has(mediaType)) {
      rawItemsByType.set(mediaType, fetchRawItems(mediaType));
    }
    return rawItemsByType.get(mediaType);
  }

  async function countUnseenItems(mediaType) {
    return countUnseen(await getRawItems(mediaType), mediaType);
  }

  // Synchronous on purpose: filter and mark in one step so no other rail can claim the same title
  function claimUnseenItems(rawItems, mediaType) {
    const claimedItems = rawItems.filter(itemData => isUnseen(itemData, mediaType)).slice(0, RAIL_ITEM_LIMIT);
    claimedItems.forEach(itemData => shownTitleKeys.add(getDedupeKey(itemData, mediaType)));
    return claimedItems;
  }

  return { getRawItems, countUnseenItems, claimUnseenItems };
}

// ── Rail ─────────────────────────────────────────────────────

/**
 * Builds one lazy-loading seasonal rail. The rail hides itself on error, or when
 * the selected media type has no titles left after dedupe. No other minimum applies.
 *
 * @param {object} options
 * @param {string} options.seasonKey
 * @param {object} options.railData - One entry of the /seasonal/:season rails list
 * @param {Promise<Set<string>>} options.savedMediaIdsPromise
 * @param {Set<string>} options.shownTitleKeys - Dedupe set shared by every rail on the page
 * @param {string} [options.initialMediaType] - Restored toggle state
 * @returns {{key: string, section: HTMLElement, ensureLoaded: () => Promise<void>, getMediaType: () => string}}
 */
export function createSeasonalRail({ seasonKey, railData, savedMediaIdsPromise, shownTitleKeys, initialMediaType }) {
  const railSection = buildRailSection(railData);
  const titleLink = railSection.querySelector('.home-rail-title-link');
  const posterLoader = createPosterLoader(railSection, savedMediaIdsPromise);
  const itemSource = createRailItemSource({ seasonKey, railKey: railData.key, shownTitleKeys });

  let activeMediaType = railData.types.includes(initialMediaType) ? initialMediaType : railData.types[0];
  let mediaToggle = null;
  let loadPromise = null;

  function hideRail() {
    railSection.hidden = true;
  }

  function syncSelectionControls() {
    titleLink.href = buildBrowseUrl(seasonKey, railData, activeMediaType);
    if (mediaToggle) updateToggleState(mediaToggle, activeMediaType);
  }

  async function fetchItemsToShow(mediaType) {
    try {
      const rawItems = await itemSource.getRawItems(mediaType);
      const claimedItems = itemSource.claimUnseenItems(rawItems, mediaType);
      if (claimedItems.length === 0) hideRail();
      return claimedItems;
    } catch (error) {
      console.error(`Error loading rail ${railData.key}:`, error);
      hideRail();
      return [];
    }
  }

  function showActiveSelection() {
    syncSelectionControls();
    return posterLoader.load({
      cacheKey: activeMediaType,
      fetchResults: () => fetchItemsToShow(activeMediaType),
      mediaType: activeMediaType
    });
  }

  async function pickStartingMediaType() {
    const candidateTypes = [activeMediaType, ...railData.types.filter(type => type !== activeMediaType)];
    for (const mediaType of candidateTypes) {
      const unseenCount = await itemSource.countUnseenItems(mediaType);
      if (unseenCount > 0) return mediaType;
    }
    return null;
  }

  async function loadStartingSelection() {
    try {
      const startingMediaType = await pickStartingMediaType();
      if (!startingMediaType) {
        hideRail();
        return;
      }
      activeMediaType = startingMediaType;
      await showActiveSelection();
    } catch (error) {
      console.error(`Error loading rail ${railData.key}:`, error);
      hideRail();
    }
  }

  function handleMediaTypeChange(mediaType) {
    if (mediaType === activeMediaType) return;
    activeMediaType = mediaType;
    showActiveSelection();
  }

  function ensureLoaded() {
    if (!loadPromise) loadPromise = loadStartingSelection();
    return loadPromise;
  }

  if (railData.allowToggle) {
    mediaToggle = buildMediaToggle(activeMediaType, handleMediaTypeChange);
    railSection.querySelector('.home-rail-header').appendChild(mediaToggle);
  }
  syncSelectionControls();
  posterLoader.showPlaceholders();
  observeOnce(railSection, ensureLoaded);

  return { key: railData.key, section: railSection, ensureLoaded, getMediaType: () => activeMediaType };
}