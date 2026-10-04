import {
  buildDetailPageUrl,
  buildPersonPageUrl,
  formatShortDate,
  getTodayIsoDate
} from './homeHelpers.js';

const API_LINKS = {
  NOW_PLAYING:    'https://celestial-cinema-backend.onrender.com/api/v1/movies/now-playing?region=US',
  TRENDING_TV:    'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/tv/week',
  POPULAR_PEOPLE: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/people/popular',
  IMAGE_PATH:     'https://image.tmdb.org/t/p/w500',
  BACKDROP_PATH:  'https://image.tmdb.org/t/p/w780'
};

const NO_POSTER_IMAGE = 'images/no-image.jpg';
const NO_PROFILE_IMAGE = 'images/no-image-cast.jpg';
export const RAIL_ITEM_LIMIT = 15;
const UPCOMING_ITEM_LIMIT = 12;
export const SKELETON_COUNT = 8;
const LAZY_LOAD_MARGIN = '300px 0px';

// ── Helpers ──────────────────────────────────────────────────

function getItemTitle(itemData) {
  return itemData.title || itemData.name || '';
}

function getItemReleaseDate(itemData) {
  return itemData.release_date || itemData.first_air_date || '';
}

async function fetchRailResults(url) {
  const railData = await fetchJsonOrThrow(url);
  return railData.results || [];
}

export function selectUpcomingItems(results) {
  const todayDate = getTodayIsoDate();
  return results
    .filter(itemData => itemData.backdrop_path && getItemReleaseDate(itemData) >= todayDate)
    .sort((firstItem, secondItem) => getItemReleaseDate(firstItem).localeCompare(getItemReleaseDate(secondItem)))
    .slice(0, UPCOMING_ITEM_LIMIT);
}

function buildImageWithFallback(className, imagePath, fallbackSrc) {
  const imageElement = document.createElement('img');
  imageElement.className = className;
  imageElement.alt = '';
  imageElement.loading = 'lazy';
  imageElement.src = imagePath ? `${API_LINKS.IMAGE_PATH}${imagePath}` : fallbackSrc;
  imageElement.addEventListener('error', () => { imageElement.src = fallbackSrc; }, { once: true });
  return imageElement;
}

function buildTitleLink(itemData, detailUrl) {
  const titleLink = createTextElement('a', 'rail-card-title', getItemTitle(itemData));
  titleLink.href = detailUrl;
  return titleLink;
}

// ── Poster card (In theaters, Trending shows) ────────────────

function buildPosterWrap(itemData, mediaType, detailUrl, savedMediaIds) {
  const posterLink = document.createElement('a');
  posterLink.href = detailUrl;
  posterLink.setAttribute('aria-label', getItemTitle(itemData));
  posterLink.appendChild(buildImageWithFallback('rail-card-poster', itemData.poster_path, NO_POSTER_IMAGE));

  const posterWrap = document.createElement('div');
  posterWrap.className = 'rail-card-poster-wrap';
  posterWrap.append(
    posterLink,
    createWatchlistCardButton(buildWatchlistItem(itemData, mediaType), savedMediaIds)
  );
  return posterWrap;
}

function buildPosterBody(itemData, mediaType, detailUrl) {
  const cardBody = document.createElement('div');
  cardBody.className = 'rail-card-body card-info';
  cardBody.append(
    createCardScoreRow(itemData.vote_average, { mediaId: itemData.id, mediaType }),
    buildTitleLink(itemData, detailUrl)
  );
  return cardBody;
}

function buildTrailerLink(mediaId, mediaType) {
  const trailerLink = createTextElement('a', 'rail-card-trailer', 'Trailer');
  trailerLink.href = buildVideoPlayerUrl({ mediaId, mediaType });
  return trailerLink;
}

export function buildPosterCard(itemData, mediaType, savedMediaIds) {
  const detailUrl = buildDetailPageUrl(itemData.id, mediaType, getItemTitle(itemData));
  const cardBody = buildPosterBody(itemData, mediaType, detailUrl);
  cardBody.appendChild(buildTrailerLink(itemData.id, mediaType));

  const posterCard = document.createElement('article');
  posterCard.className = 'rail-card';
  posterCard.append(buildPosterWrap(itemData, mediaType, detailUrl, savedMediaIds), cardBody);
  return posterCard;
}

// ── Backdrop card (Coming soon) ──────────────────────────────

function buildBackdropPlayerLink(itemData, mediaType) {
  const playerLink = document.createElement('a');
  playerLink.className = 'video-strip-link';
  playerLink.href = buildVideoPlayerUrl({ mediaId: itemData.id, mediaType });
  playerLink.setAttribute('aria-label', `Play ${getItemTitle(itemData)} trailer`);
  playerLink.appendChild(
    createVideoThumb(`${API_LINKS.BACKDROP_PATH}${itemData.backdrop_path}`, getItemTitle(itemData))
  );
  return playerLink;
}

export function buildBackdropCard(itemData, mediaType) {
  const detailUrl = buildDetailPageUrl(itemData.id, mediaType, getItemTitle(itemData));
  const cardBody = document.createElement('div');
  cardBody.className = 'rail-card-body';
  cardBody.append(
    createTextElement('p', 'rail-card-date', formatShortDate(getItemReleaseDate(itemData))),
    buildTitleLink(itemData, detailUrl)
  );

  const backdropCard = document.createElement('article');
  backdropCard.className = 'rail-card rail-card--backdrop';
  backdropCard.append(buildBackdropPlayerLink(itemData, mediaType), cardBody);
  return backdropCard;
}

// ── Person card (Popular people) ─────────────────────────────

function getKnownForTitle(personData) {
  const topKnownFor = personData.known_for?.[0];
  return topKnownFor ? getItemTitle(topKnownFor) : '';
}

function buildKnownFor(knownForTitle) {
  const knownForBlock = document.createElement('div');
  knownForBlock.className = 'rail-person-known-for';
  knownForBlock.append(
    createTextElement('p', 'rail-person-known-for-label', 'Known for'),
    createTextElement('p', 'rail-person-known-for-title', knownForTitle)
  );
  return knownForBlock;
}

function buildPersonCard(personData) {
  const personName = personData.name || '';
  const knownForTitle = getKnownForTitle(personData);

  const personBody = document.createElement('div');
  personBody.className = 'rail-person-body card-info';
  personBody.appendChild(createTextElement('p', 'rail-person-name', personName));
  if (knownForTitle) personBody.appendChild(buildKnownFor(knownForTitle));

  const personLink = document.createElement('a');
  personLink.className = 'rail-person';
  personLink.href = buildPersonPageUrl(personData.id, personName);
  personLink.append(
    buildImageWithFallback('rail-person-photo', personData.profile_path, NO_PROFILE_IMAGE),
    personBody
  );
  return personLink;
}

// ── Rail configs ─────────────────────────────────────────────

const RAIL_CONFIGS = [
  {
    sectionId: 'rail-theaters',
    url: API_LINKS.NOW_PLAYING,
    skeletonVariant: 'rail',
    buildCards: (results, savedMediaIds) => results
      .slice(0, RAIL_ITEM_LIMIT)
      .map(movieData => buildPosterCard(movieData, 'movie', savedMediaIds))
  },
  {
    sectionId: 'rail-trending-shows',
    url: API_LINKS.TRENDING_TV,
    skeletonVariant: 'rail',
    buildCards: (results, savedMediaIds) => results
      .slice(0, RAIL_ITEM_LIMIT)
      .map(showData => buildPosterCard(showData, 'tv', savedMediaIds))
  },
  {
    sectionId: 'rail-popular-people',
    url: API_LINKS.POPULAR_PEOPLE,
    skeletonVariant: 'rail',
    buildCards: (results) => results.slice(0, RAIL_ITEM_LIMIT).map(buildPersonCard)
  }
];

// ── Loading ──────────────────────────────────────────────────

export function observeOnce(targetElement, onVisible) {
  if (!('IntersectionObserver' in window)) {
    onVisible();
    return;
  }

  const visibilityObserver = new IntersectionObserver((entries) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    visibilityObserver.disconnect();
    onVisible();
  }, { rootMargin: LAZY_LOAD_MARGIN });
  visibilityObserver.observe(targetElement);
}

async function loadRail(railSection, railConfig, savedMediaIdsPromise) {
  try {
    const [results, savedMediaIds] = await Promise.all([
      fetchRailResults(railConfig.url),
      savedMediaIdsPromise
    ]);
    const railCards = railConfig.buildCards(results, savedMediaIds);

    if (railCards.length === 0) {
      railSection.hidden = true;
      return;
    }
    railSection.querySelector('.home-rail-track').replaceChildren(...railCards);
    loadCcmdbPills(railSection);
  } catch (error) {
    console.error(`Error loading ${railConfig.sectionId}:`, error);
    railSection.hidden = true;
    showErrorMessage('Failed to load a section | Please try again later', railSection);
  }
}

export function initRails(savedMediaIdsPromise) {
  RAIL_CONFIGS.forEach(railConfig => {
    const railSection = document.getElementById(railConfig.sectionId);
    if (!railSection) return;

    const railTrack = railSection.querySelector('.home-rail-track');
    showSkeletonCards(railTrack, SKELETON_COUNT, railConfig.skeletonVariant);
    observeOnce(railSection, () => loadRail(railSection, railConfig, savedMediaIdsPromise));
  });
}