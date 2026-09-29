function formatTimestamp(dateString) {
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - reviewDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours < 24) {
        if (diffHours < 1) {
            return diffMinutes <= 1 ? '1min ago' : `${diffMinutes}min ago`;
        }
        return diffHours === 1 ? '1hr ago' : `${diffHours}hrs ago`;
    }

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[reviewDate.getMonth()];
    const day = reviewDate.getDate();
    const year = reviewDate.getFullYear();

    return `${month} ${day} ${year}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function buildInfoLineHTML(parts) {
    return parts.filter(Boolean).map(p => `<span>${escapeHtml(String(p))}</span>`).join('');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function generateRatingOptions(selectedRating) {
    let options = '';
    for (let i = 0; i <= 10; i++) {
        const selected = i == selectedRating ? 'selected' : '';
        options += `<option value="${i}" ${selected}>${i}</option>`;
    }
    return options;
}

function formatScore(voteAverage) {
  if (!voteAverage) return 'NR';
  return `${Math.round(voteAverage * 10)}%`;
}

function calculateAverageRating(reviewsData) {
  const totalRating = reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
  return (totalRating / reviewsData.length).toFixed(1);
}

function buildStarSvgHTML(className) {
  return `
    <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  `;
}

function buildUserRatingHTML() {
  return `
    <div class="user-rating" id="user-rating" hidden>
      <span class="score-value">
        ${buildStarSvgHTML('user-rating-star')}
        <span id="user-rating-value"></span>
      </span>
      <span class="score-label">CCMDb</span>
    </div>
  `;
}

function updateUserRating(reviewsData) {
  const userRatingElement = document.getElementById('user-rating');
  const userRatingValueElement = document.getElementById('user-rating-value');
  if (!userRatingElement || !userRatingValueElement) return;

  if (reviewsData.length === 0) {
    userRatingElement.hidden = true;
    return;
  }

  const averageRating = calculateAverageRating(reviewsData);
  userRatingValueElement.textContent = averageRating;
  userRatingElement.hidden = false;
}

function initUserRatingToggle() {
  const userRatingElement = document.getElementById('user-rating');
  const userScoreContainer = userRatingElement?.closest('.user-score-container');
  if (!userRatingElement || !userScoreContainer) return;

  const narrowQuery = window.matchMedia('(max-width: 389px)');

  userRatingElement.addEventListener('click', () => {
    const mediaContainer = userRatingElement.closest('.current-movie-container, .current-tv-container');
    if (!narrowQuery.matches || mediaContainer?.classList.contains('is-expanded')) return;

    userScoreContainer.classList.toggle('is-rating-expanded');
  });
}

function buildDetailActionsHTML(imdbId) {
  const imdbLinkHTML = imdbId
    ? `<a href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer" class="detail-quick-action imdb-link">
        <span class="detail-quick-action-icon imdb-wordmark">IMDb</span>
        <span class="detail-quick-action-label">view</span>
      </a>`
    : '';

  return `
    <div class="detail-actions">
      <button class="watchlist-detail-btn" id="watchlist-detail-btn">
        <img src="../images/watchlist-add.svg" class="watchlist-detail-icon" alt="">
        Add to Watchlist
      </button>
      <div class="detail-quick-actions">
        ${imdbLinkHTML}
        <button type="button" class="detail-quick-action rate-this-btn" id="rate-this-btn">
          <span class="detail-quick-action-icon">
            <svg class="rate-this-star" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
          <span class="detail-quick-action-label">rate this</span>
        </button>
      </div>
    </div>
  `;
}

function initRateThisBtn() {
  const rateThisBtn = document.getElementById('rate-this-btn');
  const newReviewBtn = document.getElementById('new-review-btn');
  if (!rateThisBtn || !newReviewBtn) return;

  rateThisBtn.addEventListener('click', () => newReviewBtn.click());
}

function updateRateButtonState(hasReviews) {
  const rateThisBtn = document.getElementById('rate-this-btn');
  if (!rateThisBtn) return;

  rateThisBtn.classList.toggle('is-rated', hasReviews);
}

function rankSearchCategories(movieCount, tvCount, peopleCount) {
  return [
    { key: 'movies',  count: movieCount  },
    { key: 'tvshows', count: tvCount     },
    { key: 'people',  count: peopleCount }
  ].sort((a, b) => b.count - a.count).map(c => c.key);
}

/**
 * @param {HTMLElement|null} anchorElement - Insert after this element. If null, appends to body.
 */
function showErrorMessage(message, anchorElement = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-red';
    errorDiv.textContent = message;

    if (anchorElement) {
        anchorElement.parentNode.insertBefore(errorDiv, anchorElement.nextSibling);
    } else {
        document.body.appendChild(errorDiv);
    }

    setTimeout(() => {
        if (errorDiv.parentNode) errorDiv.remove();
    }, 5000);
}

function showValidateMessage(message, anchorElement = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validate-message';
    errorDiv.textContent = message;

    if (anchorElement) {
        anchorElement.parentNode.insertBefore(errorDiv, anchorElement.nextSibling);
    } else {
        document.body.appendChild(errorDiv);
    }

    setTimeout(() => {
        if (errorDiv.parentNode) errorDiv.remove();
    }, 5000);
}

/**
 * @param {HTMLElement} containerEl
 * @param {string|null} backdropPath - TMDB path string
 * @param {string} backdropBaseUrl - Base URL for backdrop images
 * @param {string} fallbackImagePath - Relative path to fallback image
 * @param {number[]} overlayOpacity - [startOpacity, endOpacity] for the gradient overlay
 */
function setBackdropBackground(
    containerEl,
    backdropPath,
    backdropBaseUrl,
    fallbackImagePath,
    overlayOpacity = [0.7, 0.8]
) {
    if (!containerEl) return;
    const [start, end] = overlayOpacity;

    if (backdropPath) {
        containerEl.style.backgroundImage =
            `linear-gradient(rgba(19, 23, 32, ${start}), rgba(19, 23, 32, ${end})), ` +
            `url('${backdropBaseUrl}${backdropPath}')`;
    } else {
        containerEl.style.backgroundImage =
            `linear-gradient(rgba(19, 23, 32, 0.4), rgba(19, 23, 32, 0.5)), ` +
            `url('${fallbackImagePath}')`;
    }
    containerEl.style.backgroundSize = 'cover';
    containerEl.style.backgroundPosition = 'center';
    containerEl.style.backgroundRepeat = 'no-repeat';
}

/**
 * Registers the standard search-redirect submit handler used on all detail pages.
 * Defaults to ../index.html
 */
function initSearchRedirect(formElement, inputElement, indexPath = '../index.html') {
    formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = inputElement.value.trim();
        if (searchTerm) {
            window.location.href = `${indexPath}?search=${encodeURIComponent(searchTerm)}`;
        }
    });
}

const WATCHLIST_API = 'https://celestial-cinema-backend.onrender.com/api/v1/watchlist';

async function toggleWatchlistAPI(username, item) {
  try {
    const res = await fetch(`${WATCHLIST_API}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        mediaId:       String(item.id),
        title:         item.title        || '',
        year:          item.year         || '',
        mediaType:     item.mediaType    || 'movie',
        posterPath:    item.posterPath   || '',
        voteAverage:   item.voteAverage  ?? null,
        runtime:       item.runtime      ?? null,
        contentRating: item.contentRating ?? null
      })
    });
    const data = await res.json();
    return data.status;
  } catch (e) {
    console.error('Watchlist toggle failed:', e);
    return null;
  }
}

async function checkWatchlistAPI(username, mediaId) {
  try {
    const res = await fetch(`${WATCHLIST_API}/check?username=${encodeURIComponent(username)}&mediaId=${mediaId}`);
    return await res.json(); // { inWatchlist: bool, id: string|null }
  } catch (e) {
    console.error('Watchlist check failed:', e);
    return { inWatchlist: false, id: null };
  }
}

function suppressNextClick() {
  const handler = (e) => {
    e.stopPropagation();
    e.preventDefault();
    document.removeEventListener('click', handler, true);
    clearTimeout(timeout);
  };
  const timeout = setTimeout(() => {
    document.removeEventListener('click', handler, true);
  }, 600);
  document.addEventListener('click', handler, true);
}

/**
 * Shows the shared name-picker modal.
 * @param {object} options
 * @param {string} options.title       - Modal heading text
 * @param {string} [options.confirmText] - Confirm button label (default 'Confirm')
 * @param {function} options.onConfirm - Called with the chosen name string
 * @param {function} [options.onCancel]
 */
function showNameModal({ title, confirmText = 'Confirm', onConfirm, onCancel }) {
  const existing = document.getElementById('name-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'name-modal-overlay';
  overlay.className = 'name-modal-overlay';

  overlay.innerHTML = `
    <div class="name-modal">
      <p class="name-modal-title">${title}</p>
      <button class="name-preset-btn" data-name="mario">mario</button>
      <button class="name-preset-btn" data-name="monse">monse</button>
      <input type="text" class="name-modal-input" id="name-modal-input"
          placeholder="name">
      <div class="name-modal-actions">
        <button class="name-modal-cancel">Cancel</button>
        <button class="name-modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modal = overlay.querySelector('.name-modal');
  modal.style.pointerEvents = 'none';
  setTimeout(() => { modal.style.pointerEvents = ''; }, 500);

  const input = overlay.querySelector('#name-modal-input');

  overlay.querySelectorAll('.name-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('ccLastName', btn.dataset.name);
      suppressNextClick();
      overlay.remove();
      onConfirm(btn.dataset.name);
    });
  });

  const confirmBtn = overlay.querySelector('.name-modal-confirm');
  const cancelBtn = overlay.querySelector('.name-modal-cancel');

  confirmBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    localStorage.setItem('ccLastName', name);
    suppressNextClick();
    overlay.remove();
    onConfirm(name);
  });

  cancelBtn.addEventListener('click', () => {
    suppressNextClick();
    overlay.remove();
    if (onCancel) onCancel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      suppressNextClick();
      overlay.remove();
      if (onCancel) onCancel();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });
}

/**
 * Initializes compact/expand toggle for media detail pages.
 * Works on both movie and TV detail pages by finding whichever
 * container is present in the DOM.
 */
function scrollToTopAfterCollapse() {
  suppressNextClick();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/**
 * Initializes compact/expand toggle for media detail pages.
 * Works on both movie and TV detail pages by finding whichever
 * container is present in the DOM. Tapping the expand button,
 * the overview text, or the poster toggles the compact layout (≤450px only).
 */
function initMediaCompactToggle() {
  const expandBtn = document.getElementById('media-expand-btn');
  const container = document.querySelector('.current-movie-container')
    || document.querySelector('.current-tv-container');
  if (!expandBtn || !container) return;

  const compactQuery = window.matchMedia('(max-width: 450px)');

  const handleCompactToggle = (e) => {
    if (!compactQuery.matches) return;
    e.preventDefault();
    e.stopPropagation();

    const isExpanded = container.classList.toggle('is-expanded');
    expandBtn.firstChild.textContent = isExpanded ? 'COLLAPSE ' : 'EXPAND ';

    if (!isExpanded) scrollToTopAfterCollapse();
  };

  const toggleTargets = [
    expandBtn,
    container.querySelector('.overview-text'),
    container.querySelector('.movie-poster, .tv-poster')
  ];
  toggleTargets.filter(Boolean).forEach(el => el.addEventListener('click', handleCompactToggle));
}

// Shared watchlist helpers
async function loadSavedMediaIds() {
  try {
    const res = await fetch('https://celestial-cinema-backend.onrender.com/api/v1/watchlist');
    if (!res.ok) return new Set();
    const data = await res.json();
    return new Set((data.items || []).map(item => String(item.mediaId)));
  } catch (e) {
    console.error('Failed to load saved media ids:', e);
    return new Set();
  }
}

function initFixedTopnavOffset() {
  const topnav = document.querySelector('.topnav');
  if (!topnav) return;

  const setOffset = () => {
    document.documentElement.style.setProperty('--topnav-height', `${topnav.offsetHeight}px`);
  };

  setOffset();

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(setOffset).observe(topnav);
  } else {
    window.addEventListener('resize', setOffset);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFixedTopnavOffset);
} else {
  initFixedTopnavOffset();
}

function getMovieContentRating(movieData) {
  const us = movieData.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
  if (!us?.release_dates?.length) return null;
  const theatrical = us.release_dates.find(r => r.type === 3 && r.certification);
  const firstRated = us.release_dates.find(r => r.certification);
  return theatrical?.certification || firstRated?.certification || null;
}

function getTVContentRating(tvData) {
  const us = tvData.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
  return us?.rating || null;
}

async function hydrateGridWatchlistItem(item) {
  const MOVIE_DETAILS = 'https://celestial-cinema-backend.onrender.com/api/v1/movies/details/';
  const TV_DETAILS    = 'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/';
  const detailsUrl = item.mediaType === 'tv'
    ? `${TV_DETAILS}${item.id}`
    : `${MOVIE_DETAILS}${item.id}`;
  try {
    const res = await fetch(detailsUrl);
    if (!res.ok) return item;
    const details = await res.json();
    return {
      ...item,
      runtime: item.mediaType === 'movie' ? (details.runtime ?? null) : null,
      contentRating: item.mediaType === 'tv'
        ? getTVContentRating(details)
        : getMovieContentRating(details)
    };
  } catch (e) {
    console.error('Failed to hydrate watchlist item:', e);
    return item;
  }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Pages are either at repo root or exactly one level deep.
    const swPath = location.pathname.split('/').filter(Boolean).length > 2
      ? '../sw.js'
      : './sw.js';
    navigator.serviceWorker.register(swPath).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
    
    let hasReloadedForNewWorker = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForNewWorker) return;
      hasReloadedForNewWorker = true;
      window.location.reload();
    });
  });
}