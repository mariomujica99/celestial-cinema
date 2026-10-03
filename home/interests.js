import { observeOnce } from './rails.js';
import { buildMediaToggle, updateToggleState } from './switchRail.js';

const API_LINKS = {
  GENRE_BACKDROPS: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/home/genre-backdrops',
  BACKDROP_PATH:   'https://image.tmdb.org/t/p/w780'
};

const GENRES_BY_MEDIA_TYPE = { movie: MOVIE_GENRES, tv: TV_GENRES };

function buildGenreUrl(genre, mediaType) {
  const genreParams = new URLSearchParams({ genre: genre.id, type: mediaType, name: genre.name });
  return `browse.html?${genreParams.toString()}`;
}

function buildGenreTile(genre, mediaType) {
  const tileImage = document.createElement('img');
  tileImage.className = 'interest-tile-image';
  tileImage.alt = '';
  tileImage.addEventListener('load', () => tileImage.classList.add('is-loaded'), { once: true });

  const imageWrap = document.createElement('div');
  imageWrap.className = 'interest-tile-image-wrap';
  imageWrap.appendChild(tileImage);

  const tileLink = document.createElement('a');
  tileLink.className = 'interest-tile';
  tileLink.href = buildGenreUrl(genre, mediaType);
  tileLink.append(imageWrap, createTextElement('p', 'interest-tile-label', genre.name));
  return { tileLink, tileImage };
}

// Accepts { results: [{ genreId, backdropPath }] } or a plain { genreId: backdropPath } map.
function mapBackdropsByGenre(backdropData) {
  return new Map(
    Object.entries(backdropData.backdrops || {}).map(([genreId, backdropPath]) => [Number(genreId), backdropPath])
  );
}

async function fetchGenreBackdrops(mediaType) {
  const genreIds = GENRES_BY_MEDIA_TYPE[mediaType].map(genre => genre.id).join(',');
  const backdropData = await fetchJsonOrThrow(
    `${API_LINKS.GENRE_BACKDROPS}?ids=${genreIds}&type=${mediaType}`
  );
  return mapBackdropsByGenre(backdropData);
}

export function initInterests() {
  const railSection = document.getElementById('rail-interests');
  if (!railSection) return;

  const railHeader = railSection.querySelector('.home-rail-header');
  const railTrack = railSection.querySelector('.home-rail-track');
  const backdropCache = new Map();
  let tileImages = new Map();
  let activeMediaType = 'movie';
  let hasStartedLoading = false;
  let latestRequestId = 0;

  function renderTiles() {
    tileImages = new Map();
    const tileLinks = GENRES_BY_MEDIA_TYPE[activeMediaType].map(genre => {
      const { tileLink, tileImage } = buildGenreTile(genre, activeMediaType);
      tileImages.set(genre.id, tileImage);
      return tileLink;
    });
    railTrack.replaceChildren(...tileLinks);
    railTrack.scrollLeft = 0;
  }

  async function applyBackdrops() {
    const requestId = ++latestRequestId;
    const mediaType = activeMediaType;

    try {
      if (!backdropCache.has(mediaType)) {
        backdropCache.set(mediaType, await fetchGenreBackdrops(mediaType));
      }
      if (requestId !== latestRequestId) return;

      backdropCache.get(mediaType).forEach((backdropPath, genreId) => {
        const tileImage = tileImages.get(genreId);
        if (tileImage && backdropPath) tileImage.src = `${API_LINKS.BACKDROP_PATH}${backdropPath}`;
      });
    } catch (error) {
      console.error('Error loading genre backdrops:', error);
    }
  }

  const mediaToggle = buildMediaToggle(activeMediaType, (mediaType) => {
    if (mediaType === activeMediaType) return;
    activeMediaType = mediaType;
    updateToggleState(mediaToggle, activeMediaType);
    renderTiles();
    if (hasStartedLoading) applyBackdrops();
  });

  railHeader.appendChild(mediaToggle);
  renderTiles();
  observeOnce(railSection, () => {
    hasStartedLoading = true;
    applyBackdrops();
  });
}