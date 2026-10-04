import {
  buildDetailPageUrl,
  formatMoney,
  formatRuntime
} from './homeHelpers.js';
import { observeOnce } from './rails.js';

const API_LINKS = {
  BOX_OFFICE:  'https://celestial-cinema-backend.onrender.com/api/v1/movies/home/box-office',
  POSTER_PATH: 'https://image.tmdb.org/t/p/w342'
};

const NO_POSTER_IMAGE = 'images/no-image.jpg';
const MIN_BAR_PERCENT = 2;
const PLACEHOLDER_BUDGET_LIMIT = 1000;

// ── Data ─────────────────────────────────────────────────────

function normalizeEntry(rawEntry) {
  return {
    id: rawEntry.id,
    title: rawEntry.title || '',
    posterPath: rawEntry.posterPath ?? rawEntry.poster_path ?? '',
    voteAverage: rawEntry.voteAverage ?? rawEntry.vote_average ?? null,
    releaseDate: rawEntry.releaseDate ?? rawEntry.release_date ?? '',
    runtime: rawEntry.runtime ?? null,
    budget: rawEntry.budget ?? 0,
    revenue: rawEntry.revenue ?? 0,
    overview: rawEntry.overview || ''
  };
}

function hasPlaceholderBudget(entry) {
  return entry.budget > 0 && entry.budget < PLACEHOLDER_BUDGET_LIMIT;
}

async function attachCcmdbRatings(entries) {
  try {
    const ratingKeys = entries.map(entry => `movie:${entry.id}`);
    const ratingsByKey = await fetchCcmdbRatings(ratingKeys);
    return entries.map(entry => ({
      ...entry,
      ccmdbRating: ratingsByKey[`movie:${entry.id}`]?.average ?? null
    }));
  } catch (error) {
    console.error('Failed to load CCMDb ratings:', error);
    return entries.map(entry => ({ ...entry, ccmdbRating: null }));
  }
}

function selectRankedEntries(boxOfficeData) {
  return (boxOfficeData.results || [])
    .map(normalizeEntry)
    .filter(entry => entry.revenue > 0 && !hasPlaceholderBudget(entry))
    .sort((firstEntry, secondEntry) => secondEntry.revenue - firstEntry.revenue);
}

// ── Featured panel ───────────────────────────────────────────

function buildFeaturedPoster(entry, detailUrl, savedMediaIds) {
  const posterImage = document.createElement('img');
  posterImage.className = 'box-office-poster';
  posterImage.alt = '';
  posterImage.src = entry.posterPath ? `${API_LINKS.POSTER_PATH}${entry.posterPath}` : NO_POSTER_IMAGE;
  posterImage.addEventListener('error', () => { posterImage.src = NO_POSTER_IMAGE; }, { once: true });

  const posterLink = document.createElement('a');
  posterLink.href = detailUrl;
  posterLink.appendChild(posterImage);

  const watchlistItem = buildWatchlistItem({
    id: entry.id,
    title: entry.title,
    release_date: entry.releaseDate,
    poster_path: entry.posterPath,
    vote_average: entry.voteAverage
  }, 'movie');

  const posterWrap = document.createElement('div');
  posterWrap.className = 'box-office-poster-wrap';
  posterWrap.append(posterLink, createWatchlistCardButton(watchlistItem, savedMediaIds));
  return posterWrap;
}

function buildMetaLine(entry) {
  const releaseYear = getMediaYear({ release_date: entry.releaseDate });
  const metaLine = document.createElement('div');
  metaLine.className = 'box-office-meta';
  metaLine.innerHTML = [
    buildInfoLineHTML([formatScore(entry.voteAverage)]),
    buildCcmdbMetaItemHTML(entry.ccmdbRating),
    buildInfoLineHTML([releaseYear, formatRuntime(entry.runtime)])
  ].join('');
  return metaLine;
}

function buildMoneyLine(entry) {
  const budgetText = entry.budget ? ` · Budget ${formatMoney(entry.budget)}` : '';
  const moneyLine = document.createElement('p');
  moneyLine.className = 'box-office-money';
  moneyLine.append(
    createTextElement('strong', 'box-office-gross', formatMoney(entry.revenue)),
    ` worldwide${budgetText}`
  );
  return moneyLine;
}

function buildInfoColumn(entry, detailUrl) {
  const titleLink = createTextElement('a', 'box-office-title', entry.title);
  titleLink.href = detailUrl;

  const trailerLink = createTextElement('a', 'rail-card-trailer', 'Trailer');
  trailerLink.href = buildVideoPlayerUrl({ mediaId: entry.id, mediaType: 'movie' });

  const infoColumn = document.createElement('div');
  infoColumn.className = 'box-office-info';
  infoColumn.append(titleLink, buildMetaLine(entry), buildMoneyLine(entry), trailerLink);
  return infoColumn;
}

function renderFeatured(featuredPanel, entry, savedMediaIds) {
  const detailUrl = buildDetailPageUrl(entry.id, 'movie', entry.title);
  const topRow = document.createElement('div');
  topRow.className = 'box-office-featured-top';
  topRow.append(buildFeaturedPoster(entry, detailUrl, savedMediaIds), buildInfoColumn(entry, detailUrl));

  featuredPanel.replaceChildren(topRow);
  if (entry.overview) {
    featuredPanel.appendChild(createTextElement('p', 'box-office-overview', entry.overview));
  }
}

// ── Ranked bars ──────────────────────────────────────────────

function buildBarRow(entry, maxRevenue, onSelect) {
  const rowHead = document.createElement('span');
  rowHead.className = 'box-office-row-head';
  rowHead.append(
    createTextElement('span', 'box-office-row-title', entry.title),
    createTextElement('span', 'box-office-row-amount', formatMoney(entry.revenue))
  );

  const barPercent = Math.max(MIN_BAR_PERCENT, Math.round((entry.revenue / maxRevenue) * 100));
  const barFill = document.createElement('span');
  barFill.className = 'box-office-bar-fill';
  barFill.style.setProperty('--bar-width', `${barPercent}%`);

  const bar = document.createElement('span');
  bar.className = 'box-office-bar';
  bar.appendChild(barFill);

  const rowButton = document.createElement('button');
  rowButton.type = 'button';
  rowButton.className = 'box-office-row';
  rowButton.append(rowHead, bar);
  rowButton.addEventListener('click', onSelect);

  const rowItem = document.createElement('li');
  rowItem.appendChild(rowButton);
  return { rowItem, rowButton };
}

function renderBoxOffice(layoutElement, entries, savedMediaIds) {
  const featuredPanel = document.createElement('article');
  featuredPanel.className = 'box-office-featured';

  const barList = document.createElement('ol');
  barList.className = 'box-office-list';

  const rowButtons = [];
  const maxRevenue = entries[0].revenue;

  function selectEntry(selectedIndex) {
    renderFeatured(featuredPanel, entries[selectedIndex], savedMediaIds);
    rowButtons.forEach((rowButton, rowIndex) => {
      const isActive = rowIndex === selectedIndex;
      rowButton.classList.toggle('is-active', isActive);
      rowButton.setAttribute('aria-pressed', String(isActive));
    });
  }

  entries.forEach((entry, entryIndex) => {
    const { rowItem, rowButton } = buildBarRow(entry, maxRevenue, () => selectEntry(entryIndex));
    rowButtons.push(rowButton);
    barList.appendChild(rowItem);
  });

  layoutElement.replaceChildren(featuredPanel, barList);
  selectEntry(0);
}

// ── Init ─────────────────────────────────────────────────────

async function loadBoxOffice(railSection, layoutElement, savedMediaIdsPromise) {
  try {
    const [boxOfficeData, savedMediaIds] = await Promise.all([
      fetchJsonOrThrow(API_LINKS.BOX_OFFICE),
      savedMediaIdsPromise
    ]);
    const entries = await attachCcmdbRatings(selectRankedEntries(boxOfficeData));

    if (entries.length === 0) {
      railSection.hidden = true;
      return;
    }
    renderBoxOffice(layoutElement, entries, savedMediaIds);
  } catch (error) {
    console.error('Error loading box office:', error);
    railSection.hidden = true;
    showErrorMessage('Failed to load a section | Please try again later', railSection);
  }
}

export function initBoxOffice(savedMediaIdsPromise) {
  const railSection = document.getElementById('rail-box-office');
  if (!railSection) return;

  const layoutElement = railSection.querySelector('.box-office-layout');
  const skeletonBlock = document.createElement('div');
  skeletonBlock.className = 'skeleton-block box-office-skeleton';
  skeletonBlock.setAttribute('aria-hidden', 'true');
  layoutElement.replaceChildren(skeletonBlock);

  observeOnce(railSection, () => loadBoxOffice(railSection, layoutElement, savedMediaIdsPromise));
}