import { buildBackdropCard, observeOnce, selectUpcomingItems } from './rails.js';
import { buildMediaToggle, createPosterLoader, fetchListResults, updateToggleState } from './switchRail.js';

const API_LINKS = {
  UPCOMING_MOVIE: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/upcoming?region=US',
  UPCOMING_TV:    'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/upcoming'
};

const UPCOMING_URLS = {
  movie: API_LINKS.UPCOMING_MOVIE,
  tv: API_LINKS.UPCOMING_TV
};

function buildUpcomingCards(results, mediaType) {
  return selectUpcomingItems(results).map(itemData => buildBackdropCard(itemData, mediaType));
}

export function initUpcoming(savedMediaIdsPromise) {
  const railSection = document.getElementById('rail-upcoming');
  if (!railSection) return;

  const titleLink = railSection.querySelector('.home-rail-title-link');
  const railHeader = railSection.querySelector('.home-rail-header');
  const posterLoader = createPosterLoader(railSection, savedMediaIdsPromise, 'backdrop');

  let activeMediaType = 'movie';

  function showActiveSelection() {
    titleLink.href = `browse.html?list=upcoming&type=${activeMediaType}`;
    posterLoader.load({
      cacheKey: activeMediaType,
      fetchResults: () => fetchListResults(UPCOMING_URLS[activeMediaType]),
      mediaType: activeMediaType,
      buildCards: buildUpcomingCards
    });
  }

  const mediaToggle = buildMediaToggle(activeMediaType, (mediaType) => {
    if (mediaType === activeMediaType) return;
    activeMediaType = mediaType;
    updateToggleState(mediaToggle, activeMediaType);
    showActiveSelection();
  });

  railHeader.appendChild(mediaToggle);
  posterLoader.showPlaceholders();
  observeOnce(railSection, showActiveSelection);
}