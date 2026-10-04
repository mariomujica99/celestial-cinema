import { RAIL_ITEM_LIMIT, SKELETON_COUNT, buildPosterCard } from './rails.js';

const MEDIA_TYPE_OPTIONS = [
  { mediaType: 'movie', label: 'Movies' },
  { mediaType: 'tv', label: 'Shows' }
];

export function updateToggleState(toggleGroup, activeMediaType) {
  toggleGroup.querySelectorAll('.rail-toggle-option').forEach(optionButton => {
    const isActive = optionButton.dataset.mediaType === activeMediaType;
    optionButton.classList.toggle('is-active', isActive);
    optionButton.setAttribute('aria-pressed', String(isActive));
  });
}

export function buildMediaToggle(activeMediaType, onSelect) {
  const toggleGroup = document.createElement('div');
  toggleGroup.className = 'rail-toggle';
  toggleGroup.setAttribute('role', 'group');

  MEDIA_TYPE_OPTIONS.forEach(({ mediaType, label }) => {
    const optionButton = document.createElement('button');
    optionButton.type = 'button';
    optionButton.className = 'rail-toggle-option';
    optionButton.dataset.mediaType = mediaType;
    optionButton.textContent = label;
    optionButton.addEventListener('click', () => onSelect(mediaType));
    toggleGroup.appendChild(optionButton);
  });

  updateToggleState(toggleGroup, activeMediaType);
  return toggleGroup;
}

export async function fetchListResults(listUrl) {
  const listData = await fetchJsonOrThrow(listUrl);
  return listData.results || [];
}

function buildPosterCards(results, mediaType, savedMediaIds) {
  return results
    .slice(0, RAIL_ITEM_LIMIT)
    .map(itemData => buildPosterCard(itemData, mediaType, savedMediaIds));
}

function renderRailCards(railTrack, railCards) {
  if (railCards.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-media';
    emptyMessage.textContent = 'Nothing to show here';
    railTrack.replaceChildren(emptyMessage);
    return;
  }
  railTrack.replaceChildren(...railCards);
}

/**
 * Loads poster cards into a rail track, caching each selection by key.
 * Only the most recent load() call may render, so fast tab changes can't
 * paint a stale response.
 */
export function createPosterLoader(railSection, savedMediaIdsPromise, skeletonVariant = 'rail') {
  const railTrack = railSection.querySelector('.home-rail-track');
  const resultsCache = new Map();
  let latestRequestId = 0;

  function showPlaceholders() {
    showSkeletonCards(railTrack, SKELETON_COUNT, skeletonVariant);
  }

  async function load({ cacheKey, fetchResults, mediaType, buildCards = buildPosterCards }) {
    const requestId = ++latestRequestId;
    showPlaceholders();
    railTrack.scrollLeft = 0;

    try {
      if (!resultsCache.has(cacheKey)) {
        resultsCache.set(cacheKey, await fetchResults());
      }
      const savedMediaIds = await savedMediaIdsPromise;
      if (requestId !== latestRequestId) return;

      renderRailCards(railTrack, buildCards(resultsCache.get(cacheKey), mediaType, savedMediaIds));
      loadCcmdbPills(railTrack);    
    } catch (error) {
      console.error(`Error loading ${railSection.id}:`, error);
      if (requestId !== latestRequestId) return;

      railTrack.replaceChildren();
      showErrorMessage('Failed to load this list | Please try again later', railSection);
    }
  }

  return { showPlaceholders, load };
}