const API_LINKS = {
  WATCHLIST: 'https://celestial-cinema-backend.onrender.com/api/v1/watchlist',
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");
const watchlistContainer = document.getElementById("watchlist-container");

const trendingTodayButton = document.querySelector(".trending-today-button");
const popularButton = document.querySelector(".popular-button");
const nowPlayingButton = document.querySelector(".now-playing-button");
const topRatedButton = document.querySelector(".top-rated-button");
const reviewsButton = document.querySelector(".reviews-button");
const watchlistButton = document.querySelector(".watchlist-button");
const reviewsActionButton = document.querySelector(".reviews-action-button");
const watchlistActionButton = document.querySelector(".watchlist-action-button");
const filtersNav = document.getElementById('filters-nav');
const moviesToggleBtn = document.getElementById('toggle-movies');
const tvToggleBtn = document.getElementById('toggle-tv');

initSearchRedirect(searchForm, searchInput, '../index.html');

function setActiveButton(activeButton) {
  document.querySelectorAll('.filters button:not(.toggle-option), .action-row button').forEach(btn => {
    btn.classList.remove('active');
  });
  activeButton.classList.add('active');
}

function updateToggleUI() {
  const currentToggle = localStorage.getItem('ccMediaToggle') || 'movie';
  moviesToggleBtn.classList.toggle('active', currentToggle === 'movie');
  tvToggleBtn.classList.toggle('active', currentToggle === 'tv');
  document.documentElement.classList.toggle('media-toggle-movie', currentToggle === 'movie');
  document.documentElement.classList.toggle('media-toggle-tv', currentToggle === 'tv');
}

updateToggleUI();

moviesToggleBtn.addEventListener('click', () => {
  localStorage.setItem('ccMediaToggle', 'movie');
  window.location.href = '../index.html?filter=trending';
});

tvToggleBtn.addEventListener('click', () => {
  localStorage.setItem('ccMediaToggle', 'tv');
  window.location.href = '../index.html?filter=shows';
});

setActiveButton(watchlistButton);
watchlistActionButton.classList.add('active');

function storeScrollPosition() {
  if (filtersNav) {
    sessionStorage.setItem('filtersScrollPosition', filtersNav.scrollLeft);
  }
}

trendingTodayButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../index.html?filter=trending";
});

popularButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../index.html?filter=popular";
});

nowPlayingButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../index.html?filter=now-playing";
});

topRatedButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../index.html?filter=top-rated";
});

reviewsButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../all reviews/allReviews.html";
});

watchlistButton.addEventListener("click", (e) => {
  e.preventDefault();
  setActiveButton(watchlistButton);
  watchlistActionButton.classList.add('active');
  requestAnimationFrame(() => location.reload());
});

reviewsActionButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../all reviews/allReviews.html";
});

watchlistActionButton.addEventListener("click", (e) => {
  e.preventDefault();
  setActiveButton(watchlistButton);
  watchlistActionButton.classList.add('active');
  requestAnimationFrame(() => location.reload());
});

// ── Render ────────────────────────────────────────────────

async function loadWatchlist() {
  try {
    const res = await fetch(API_LINKS.WATCHLIST);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    renderWatchlist(data.items || []);
  } catch (e) {
    console.error('Failed to load watchlist:', e);
    watchlistContainer.innerHTML = '<div class="watchlist-empty">Failed to load | Please try again later</div>';
  }
}

function renderWatchlist(items) {
  watchlistContainer.innerHTML = '';
  
  const countElement = document.getElementById('watchlist-count');
  const titleElement = document.querySelector('.watchlist-page-title');

  if (countElement) {
    countElement.textContent = items.length > 0 ? ` | ${items.length}` : '';
  }

  if (titleElement) {
    titleElement.style.display = 'block';
  }

  if (items.length === 0) {
    watchlistContainer.innerHTML = '<div class="watchlist-empty">The watchlist is empty. Start adding movies and shows</div>';
    return;
  }

  items.forEach(item => {
    watchlistContainer.appendChild(createWatchlistItem(item));
  });
}

function createWatchlistItem(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'watchlist-item';

  const posterUrl = item.posterPath
    ? `${API_LINKS.IMG_PATH}${item.posterPath}`
    : '../images/no-image.jpg';

  const typeLabel = item.mediaType === 'tv' ? 'Show' : 'Movie';
  const detailUrl = item.mediaType === 'tv'
    ? `../tv reviews/tvReviews.html?id=${item.mediaId}&title=${encodeURIComponent(item.title)}`
    : `../movie reviews/movieReviews.html?id=${item.mediaId}&title=${encodeURIComponent(item.title)}`;

  const posterWrapper = document.createElement('div');
  posterWrapper.className = 'watchlist-item-poster-wrapper';

  const posterImg = document.createElement('img');
  posterImg.className = 'watchlist-item-poster';
  posterImg.src = posterUrl;
  posterImg.alt = item.title;
  posterImg.onerror = function() { this.src = '../images/no-image.jpg'; };

  const removeBtn = document.createElement('button');
  removeBtn.className = 'watchlist-remove-btn';
  removeBtn.setAttribute('aria-label', 'Remove from watchlist');
  removeBtn.innerHTML = `<img src="../images/watchlist-saved.svg" class="watchlist-remove-icon" alt="Remove from watchlist">`;

  removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const res = await fetch(`${API_LINKS.WATCHLIST}/${item._id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        
        wrapper.remove();
        
        const remainingItems = document.querySelectorAll('.watchlist-item').length;
        const countElement = document.getElementById('watchlist-count');
        if (countElement) {
          countElement.textContent = remainingItems > 0 ? ` | ${remainingItems}` : '';
        }

        if (remainingItems === 0) {
          watchlistContainer.innerHTML = '<div class="watchlist-empty">The watchlist is empty. Start adding movies and shows</div>';
        }
      } catch (e) {
        console.error('Failed to remove watchlist item:', e);
        showErrorMessage('Failed to remove item. Please try again.');
      }
  });

  posterWrapper.appendChild(posterImg);
  posterWrapper.appendChild(removeBtn);

  const displayName = item.username || '';

  const details = document.createElement('div');
  details.className = 'watchlist-item-details';
  details.innerHTML = `
    <p class="watchlist-item-title">${escapeHtml(item.title)}</p>
    ${item.year ? `<p class="watchlist-item-year">${item.year}</p>` : ''}
    <span class="watchlist-item-type">${typeLabel}</span>
    ${displayName ? `<p class="watchlist-item-added-by">Added by ${escapeHtml(displayName)}</p>` : ''}
  `;

  wrapper.appendChild(posterWrapper);
  wrapper.appendChild(details);

  wrapper.addEventListener('click', () => {
    window.location.href = detailUrl;
  });

  return wrapper;
}

loadWatchlist();