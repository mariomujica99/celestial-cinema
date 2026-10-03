import { observeOnce } from './rails.js';
import { buildMediaToggle, createPosterLoader, fetchListResults, updateToggleState } from './switchRail.js';

const API_LINKS = {
  TOP_RATED_MOVIE: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/top-rated',
  TOP_RATED_TV:    'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/top-rated'
};

const TOP_RATED_URLS = {
  movie: API_LINKS.TOP_RATED_MOVIE,
  tv: API_LINKS.TOP_RATED_TV
};

export function initTopRated(savedMediaIdsPromise) {
  const railSection = document.getElementById('rail-top-rated');
  if (!railSection) return;

  const titleLink = railSection.querySelector('.home-rail-title-link');
  const railHeader = railSection.querySelector('.home-rail-header');
  const posterLoader = createPosterLoader(railSection, savedMediaIdsPromise);

  let activeMediaType = 'movie';

  function showActiveSelection() {
    titleLink.href = `browse.html?list=top-rated&type=${activeMediaType}`;
    posterLoader.load({
      cacheKey: activeMediaType,
      fetchResults: () => fetchListResults(TOP_RATED_URLS[activeMediaType]),
      mediaType: activeMediaType
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