import { observeOnce } from './rails.js';
import { buildMediaToggle, createPosterLoader, fetchListResults, updateToggleState } from './switchRail.js';

const API_LINKS = {
  STREAMING: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/streaming/'
};

// First ID is primary. A tab can combine several TMDB provider IDs (merged by popularity).
// Verify with /watch/providers/movie?watch_region=US and add variant IDs as needed.
const STREAMING_PROVIDERS = [
  { name: 'Netflix',     providerIds: [8] },
  { name: 'Prime Video', providerIds: [9, 119] },
  { name: 'Disney+',     providerIds: [337] },
  { name: 'Hulu',        providerIds: [15] },
  { name: 'HBO Max',     providerIds: [1899] },
  { name: 'Apple TV',    providerIds: [350] },
  { name: 'Peacock',     providerIds: [386] },
  { name: 'Paramount+',  providerIds: [2303, 2616] }
];

function buildBrowseUrl(provider, mediaType, extraBrowseParams = {}) {
  const browseParams = new URLSearchParams({
    provider: getPrimaryId(provider),
    type: mediaType,
    name: provider.name,
    ...extraBrowseParams
  });
  return `browse.html?${browseParams.toString()}`;
}

function getPrimaryId(provider) {
  return provider.providerIds[0];
}

function mergeByPopularity(titles) {
  const uniqueTitles = new Map(titles.map(titleData => [titleData.id, titleData]));
  return [...uniqueTitles.values()]
    .sort((firstTitle, secondTitle) => (secondTitle.popularity || 0) - (firstTitle.popularity || 0));
}

async function fetchProviderResults(provider, mediaType, streamingUrl) {
  const settledLists = await Promise.allSettled(
    provider.providerIds.map(providerId =>
      fetchListResults(`${streamingUrl}${providerId}?type=${mediaType}`))
  );
  const fulfilledLists = settledLists
    .filter(settledList => settledList.status === 'fulfilled')
    .map(settledList => settledList.value);

  if (fulfilledLists.length === 0) throw settledLists[0].reason;
  return mergeByPopularity(fulfilledLists.flat());
}

function updateTabState(tabList, activeProviderId) {
  tabList.querySelectorAll('.rail-tab').forEach(tabButton => {
    const isActive = Number(tabButton.dataset.providerId) === activeProviderId;
    tabButton.classList.toggle('is-active', isActive);
    tabButton.setAttribute('aria-selected', String(isActive));
  });
}

function buildProviderTabs(activeProviderId, onSelect) {
  const tabList = document.createElement('div');
  tabList.className = 'rail-tabs';
  tabList.setAttribute('role', 'tablist');

  STREAMING_PROVIDERS.forEach(provider => {
    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.className = 'rail-tab';
    tabButton.setAttribute('role', 'tab');
    tabButton.dataset.providerId = getPrimaryId(provider);
    tabButton.textContent = provider.name;
    tabButton.addEventListener('click', () => onSelect(getPrimaryId(provider)));
    tabList.appendChild(tabButton);
  });

  updateTabState(tabList, activeProviderId);
  return tabList;
}

function isValidSelection(selection) {
  return Boolean(selection)
    && STREAMING_PROVIDERS.some(provider => getPrimaryId(provider) === selection.providerId)
    && ['movie', 'tv'].includes(selection.mediaType);
}

/**
 * @param {Promise<Set<string>>} savedMediaIdsPromise
 * @param {object} [streamingOptions]
 * @param {string} [streamingOptions.streamingUrl] - Endpoint prefix ending in '/'; defaults to the homepage streaming endpoint
 * @param {(provider: object) => object} [streamingOptions.getBrowseParams] - Extra "view all" URL params for a provider
 * @param {{providerId: number, mediaType: string}} [streamingOptions.initialSelection] - Restored tab and toggle
 * @returns {{getSelection: () => {providerId: number, mediaType: string}}|null}
 */
export function initStreaming(savedMediaIdsPromise, streamingOptions = {}) {
  const railSection = document.getElementById('rail-streaming');
  if (!railSection) return null;

  const {
    streamingUrl = API_LINKS.STREAMING,
    getBrowseParams = () => ({}),
    initialSelection = null
  } = streamingOptions;

  const titleLink = railSection.querySelector('.home-rail-title-link');
  const railHeader = railSection.querySelector('.home-rail-header');
  const railTrack = railSection.querySelector('.home-rail-track');
  const posterLoader = createPosterLoader(railSection, savedMediaIdsPromise);

  const startSelection = isValidSelection(initialSelection)
    ? initialSelection
    : { providerId: getPrimaryId(STREAMING_PROVIDERS[0]), mediaType: 'movie' };
  let activeProviderId = startSelection.providerId;
  let activeMediaType = startSelection.mediaType;

  function showActiveSelection() {
    const activeProvider = STREAMING_PROVIDERS.find(provider => getPrimaryId(provider) === activeProviderId);
    titleLink.href = buildBrowseUrl(activeProvider, activeMediaType, getBrowseParams(activeProvider));
    posterLoader.load({
      cacheKey: `${activeProviderId}_${activeMediaType}`,
      fetchResults: () => fetchProviderResults(activeProvider, activeMediaType, streamingUrl),
      mediaType: activeMediaType
    });
  }

  const providerTabs = buildProviderTabs(activeProviderId, (providerId) => {
    if (providerId === activeProviderId) return;
    activeProviderId = providerId;
    updateTabState(providerTabs, activeProviderId);
    showActiveSelection();
  });

  const mediaToggle = buildMediaToggle(activeMediaType, (mediaType) => {
    if (mediaType === activeMediaType) return;
    activeMediaType = mediaType;
    updateToggleState(mediaToggle, activeMediaType);
    showActiveSelection();
  });

  railHeader.appendChild(mediaToggle);
  railTrack.before(providerTabs);
  posterLoader.showPlaceholders();
  observeOnce(railSection, showActiveSelection);

  return { getSelection: () => ({ providerId: activeProviderId, mediaType: activeMediaType }) };
}