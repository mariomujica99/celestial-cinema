import { SKELETON_COUNT, observeOnce } from '../home/rails.js';
import { buildRailSection } from './seasonalRails.js';

const API_LINKS = {
  SEASONAL: 'https://celestial-cinema-backend.onrender.com/api/v1/seasonal/'
};

const EPISODE_STILL_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_STILL_URL = 'images/no-image-episode.jpg';
const EPISODE_LIST_PAGE = 'tv reviews/tvEpisodesList.html';
const EPISODES_GRID_PAGE = 'seasonalEpisodes.html';
const EPISODE_RAIL_LIMIT = 20;

// ── Cards ────────────────────────────────────────────────────

function buildEpisodeUrl(episode) {
  const params = new URLSearchParams({
    id: episode.showId,
    season: episode.seasonNumber,
    title: episode.showName ?? '',
    episode: episode.episodeNumber
  });
  return `${EPISODE_LIST_PAGE}?${params.toString()}`;
}

function buildEpisodeStill(episode, episodeUrl) {
  const stillLink = document.createElement('a');
  stillLink.className = 'seasonal-episode-still';
  stillLink.href = episodeUrl;
  stillLink.setAttribute('aria-label', `${episode.showName ?? ''}: ${episode.episodeTitle}`);

  const image = document.createElement('img');
  image.loading = 'lazy';
  image.alt = '';
  image.src = episode.stillPath ? `${EPISODE_STILL_BASE_URL}${episode.stillPath}` : PLACEHOLDER_STILL_URL;
  image.addEventListener('error', () => {
    image.src = PLACEHOLDER_STILL_URL;
  }, { once: true });

  stillLink.appendChild(image);
  return stillLink;
}

export function buildEpisodeCard(episode) {
  const episodeUrl = buildEpisodeUrl(episode);

  const titleLink = document.createElement('a');
  titleLink.className = 'rail-card-title';
  titleLink.href = episodeUrl;
  titleLink.textContent = episode.episodeTitle;

  const cardBody = document.createElement('div');
  cardBody.className = 'rail-card-body';
  cardBody.append(
    createTextElement('p', 'seasonal-episode-show', episode.showName ?? ''),
    createTextElement('p', 'rail-card-date', `S${episode.seasonNumber} · E${episode.episodeNumber}`),
    titleLink
  );

  const episodeCard = document.createElement('article');
  episodeCard.className = 'rail-card rail-card--backdrop';
  episodeCard.append(buildEpisodeStill(episode, episodeUrl), cardBody);
  return episodeCard;
}

export function buildEpisodeSkeleton() {
  const skeletonCard = document.createElement('article');
  skeletonCard.className = 'rail-card rail-card--backdrop';
  skeletonCard.setAttribute('aria-hidden', 'true');

  const skeletonStill = document.createElement('div');
  skeletonStill.className = 'seasonal-episode-still';
  skeletonCard.appendChild(skeletonStill);
  return skeletonCard;
}

function buildEpisodesGridUrl(seasonKey, railData) {
  const params = new URLSearchParams({ season: seasonKey, name: railData.title });
  return `${EPISODES_GRID_PAGE}?${params.toString()}`;
}

/**
 * Keeps the first episode of each show. Input is already most-popular-show first.
 */
function pickOnePerShow(episodes) {
  const seenShowIds = new Set();
  return episodes.filter((episode) => {
    if (seenShowIds.has(episode.showId)) return false;
    seenShowIds.add(episode.showId);
    return true;
  });
}

// ── Rail ─────────────────────────────────────────────────────

/**
 * Episode rail: at most EPISODE_RAIL_LIMIT landscape cards, most popular show first. The header links
 * to the full grid. Lazy-loads like the other rails, hides itself when it has no episodes
 * episodes, and returns the same controller shape the hub expects.
 */
export function createSeasonalEpisodeRail({ seasonKey, railData }) {
  const railSection = buildRailSection(railData);
  const railTrack = railSection.querySelector('.home-rail-track');
  const titleLink = railSection.querySelector('.home-rail-title-link');
  let loadPromise = null;

  titleLink.href = buildEpisodesGridUrl(seasonKey, railData);

  function hideRail() {
    railSection.hidden = true;
  }

  function showSkeletons() {
    railTrack.replaceChildren(...Array.from({ length: SKELETON_COUNT }, buildEpisodeSkeleton));
  }

  async function loadEpisodes() {
    try {
      const data = await fetchJsonOrThrow(`${API_LINKS.SEASONAL}${seasonKey}/episodes`);
      const episodes = pickOnePerShow(data.results || []);
      if (episodes.length === 0) {
        hideRail();
        return;
      }
      railTrack.replaceChildren(...episodes.slice(0, EPISODE_RAIL_LIMIT).map(buildEpisodeCard));
    } catch (error) {
      console.error(`Error loading rail ${railData.key}:`, error);
      hideRail();
    }
  }

  function ensureLoaded() {
    if (!loadPromise) loadPromise = loadEpisodes();
    return loadPromise;
  }

  showSkeletons();
  observeOnce(railSection, ensureLoaded);

  return {
    key: railData.key,
    section: railSection,
    ensureLoaded,
    // Episode rails have no media toggle; the scroll-state save reads this for every rail.
    getMediaType: () => null
  };
}