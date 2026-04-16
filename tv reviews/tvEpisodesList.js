const url = new URL(location.href);
const tvId = url.searchParams.get("id");
const seasonNumber = url.searchParams.get("season");
const tvTitle = url.searchParams.get("title");

const API_LINKS = {
  TV_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${tvId}`,
  TV_EPISODES: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/season/${tvId}/${seasonNumber}`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces',
  REVIEWS: 'https://celestial-cinema-backend.onrender.com/api/v1/reviews/'
};

const episodesContainer = document.getElementById("episodes-container");
const seasonTitleElement = document.getElementById("season-title");
const backButton = document.getElementById("back-button");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

let seasonReviews = {};

initSearchRedirect(searchForm, searchInput);

backButton.addEventListener("click", () => {
  window.location.href = `tvReviews.html?id=${tvId}&title=${encodeURIComponent(tvTitle || '')}`;
});

loadTVDetails();
initEpisodesPage();

function loadTVDetails() {
  fetch(API_LINKS.TV_DETAILS)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(tvData) {
      window.tvBackdropPath = tvData.backdrop_path;
      setBackdropBackground(
          document.querySelector('.episodes-header'),
          tvData.backdrop_path,
          API_LINKS.BACKDROP_PATH,
          '../images/no-image-backdrop.jpg',
          [0.8, 0.9]
      );
      
      const firstAirYear = tvData.first_air_date ? new Date(tvData.first_air_date).getFullYear() : '';
      const showTitle = `${tvData.name || tvTitle || 'Unknown Title'} ${firstAirYear ? `(${firstAirYear})` : ''}`;
      
      seasonTitleElement.innerHTML = `${showTitle} - Season ${seasonNumber}`;
    })
    .catch(error => {
      console.error('Error fetching TV details:', error);
      seasonTitleElement.innerHTML = `${tvTitle || 'Unknown Title'} - Season ${seasonNumber}`;
    });
}

async function initEpisodesPage() {
  const [, episodesResult] = await Promise.allSettled([
    loadSeasonReviews(),
    fetchEpisodeData()
  ]);
  if (episodesResult.status === 'rejected') {
    console.error('Error fetching episodes:', episodesResult.reason);
    showErrorMessage('Failed to load | Please try again later', document.querySelector('.episodes-header'));
    return;
  }
  displayEpisodes(episodesResult.value);
}

async function loadSeasonReviews() {
  try {
    const res = await fetch(`${API_LINKS.REVIEWS}media/${tvId}?season=${seasonNumber}`);
    if (!res.ok) return;
    const reviews = await res.json();
    reviews.forEach(r => {
      if (r.episode != null) {
        if (!seasonReviews[r.episode]) seasonReviews[r.episode] = [];
        seasonReviews[r.episode].push(r);
      }
    });
  } catch (e) {
    console.error('Error loading season reviews:', e);
  }
}

async function fetchEpisodeData() {
  const res = await fetch(API_LINKS.TV_EPISODES);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  return data.episodes || [];
}

function displayEpisodes(episodes) {
  if (episodes.length === 0) {
    episodesContainer.innerHTML = '<div class="episodes-loading">No episodes available for this season</div>';
    return;
  }

  episodesContainer.innerHTML = '';

  episodes.forEach(episode => {
    const episodeCard = document.createElement('div');
    episodeCard.className = 'episode-card';
    episodeCard.dataset.episode = episode.episode_number;

    let stillUrl;
    if (episode.still_path) {
      stillUrl = `${API_LINKS.IMG_PATH}${episode.still_path}`;
    } else if (window.tvBackdropPath) {
      stillUrl = `${API_LINKS.BACKDROP_PATH}${window.tvBackdropPath}`;
    } else {
      stillUrl = '../images/no-image-episode.jpg';
    }

    const airDate = episode.air_date ? new Date(episode.air_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : '';
    const userScore = formatScore(episode.vote_average);
    const runtime = episode.runtime ? `${episode.runtime}m` : '';

    episodeCard.innerHTML = `
      <div class="episode-image">
        <img class="episode-still" src="${stillUrl}" alt="Episode ${episode.episode_number}"
             onerror="this.src='../images/no-image-episode.jpg'">
      </div>
      <div class="episode-details">
        <div class="episode-title-line">
          <span class="episode-number">${episode.episode_number}</span>
          <span class="episode-title">${episode.name || 'Untitled'}</span>
        </div>
        <div class="episode-info-line">
          <span class="episode-score">${userScore}</span>
          <span class="episode-date">${airDate}</span>
          ${runtime ? `<span class="episode-runtime">${runtime}</span>` : ''}
        </div>
        ${buildRatingLineHTML(seasonReviews[episode.episode_number] || [])}
        <div class="episode-overview">
          ${episode.overview || 'No description available'}
        </div>
      </div>
    `;

    const quickRateBtn = document.createElement('button');
    quickRateBtn.className = 'episode-quick-rate-btn';
    quickRateBtn.setAttribute('aria-label', `Rate episode ${episode.episode_number}`);
    quickRateBtn.innerHTML = `<img src="../images/star-empty.png" alt="Rate" class="episode-quick-rate-star">`;
    quickRateBtn.addEventListener('click', () => showQuickRateModal(episode, stillUrl));
    episodeCard.appendChild(quickRateBtn);

    episodesContainer.appendChild(episodeCard);
  });
}

function buildRatingLineHTML(reviews) {
  if (!reviews || reviews.length === 0) return '';
  const maxDisplay = Math.min(reviews.length, 4);
  let items = '';
  for (let i = 0; i < maxDisplay; i++) {
    const r = reviews[i];
    items += `<span class="episode-rating-item">
      <img src="../images/star.png" alt="star" class="episode-rating-star">
      <span class="episode-rating-score">${r.rating}</span>
      <span class="episode-rating-user">${escapeHtml(r.user)}</span>
    </span>`;
  }
  return `<div class="episode-rating-line">${items}</div>`;
}

function updateEpisodeRatingLine(epNum) {
  const card = episodesContainer.querySelector(`.episode-card[data-episode="${epNum}"]`);
  if (!card) return;
  const existing = card.querySelector('.episode-rating-line');
  if (existing) existing.remove();
  const infoLine = card.querySelector('.episode-info-line');
  if (!infoLine) return;
  const epReviews = seasonReviews[epNum] || [];
  if (epReviews.length > 0) {
    infoLine.insertAdjacentHTML('afterend', buildRatingLineHTML(epReviews));
  }
}

function showQuickRateModal(episode, posterUrl) {
  const existing = document.getElementById('quick-rate-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'quick-rate-overlay';
  overlay.className = 'quick-rate-overlay';

  const starsHTML = Array.from({ length: 10 }, (_, i) =>
    `<img src="../images/star.png" alt="Star ${i + 1}" class="qr-star" data-index="${i + 1}">`
  ).join('');

  overlay.innerHTML = `
    <div class="quick-rate-modal">
      <div class="quick-rate-poster-wrap">
        <div class="quick-rate-rating-overlay" id="qr-rating-display">0</div>
      </div>
      <p class="quick-rate-episode-title">${escapeHtml(`${episode.name || 'Untitled'}`)}</p>

      <div class="quick-rate-name-group">
        <div class="quick-rate-presets">
          <button class="name-preset-btn qr-preset" data-name="mario">mario</button>
          <button class="name-preset-btn qr-preset" data-name="monse">monse</button>
        </div>
        <input type="text" class="quick-rate-name-input" id="qr-name-input" placeholder="name">
      </div>

      <div class="quick-rate-stars" id="qr-stars">${starsHTML}</div>
      <div class="quick-rate-review-section">
        <button class="qr-review-toggle-btn" id="qr-review-toggle">
          Write a Review <span class="toggle-chevron">▾</span>
        </button>
        <textarea class="qr-review-textarea" id="qr-review-textarea" placeholder=""></textarea>
      </div>
      <div class="quick-rate-actions">
        <button class="qr-cancel-btn">Cancel</button>
        <button class="qr-save-btn">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

setBackdropBackground(
  overlay.querySelector('.quick-rate-poster-wrap'),
  episode.still_path || window.tvBackdropPath,
  episode.still_path ? API_LINKS.IMG_PATH : API_LINKS.BACKDROP_PATH,
  '../images/no-image-episode.jpg'
);

  document.body.style.overflow = 'hidden';

  const ratingDisplay = overlay.querySelector('#qr-rating-display');
  const nameInput = overlay.querySelector('#qr-name-input');
  const starsContainer = overlay.querySelector('#qr-stars');
  const starImgs = overlay.querySelectorAll('.qr-star');
  const reviewToggle = overlay.querySelector('#qr-review-toggle');
  const reviewTextarea = overlay.querySelector('#qr-review-textarea');
  const cancelBtn = overlay.querySelector('.qr-cancel-btn');
  const saveBtn = overlay.querySelector('.qr-save-btn');

  let currentRating = 0;
  let selectedPreset = null;
  let isDragging = false;
  let mouseDownIndex = 0;

  const closeModal = () => {
    document.removeEventListener('keydown', handleEsc);
    overlay.remove();
    document.body.style.overflow = '';
  };

  function renderStars(filledCount) {
    starImgs.forEach((img, i) => {
      img.style.opacity = i < filledCount ? '0.88' : '0.25';
    });
    ratingDisplay.textContent = filledCount;
  }

  function getStarIndex(clientX) {
    const rect = starsContainer.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return Math.min(10, Math.max(1, Math.ceil(relX / (rect.width / 10))));
  }

  renderStars(0);

  starsContainer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDragging = true;
    mouseDownIndex = getStarIndex(e.clientX);
    starsContainer.setPointerCapture(e.pointerId);
    renderStars(mouseDownIndex);
  });

  starsContainer.addEventListener('pointermove', (e) => {
    renderStars(getStarIndex(e.clientX));
  });

  starsContainer.addEventListener('pointerleave', () => {
    if (!isDragging) renderStars(currentRating);
  });

  starsContainer.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const upIndex = getStarIndex(e.clientX);
    currentRating = (upIndex === currentRating && upIndex === mouseDownIndex) ? 0 : upIndex;
    renderStars(currentRating);
  });

  starsContainer.addEventListener('pointercancel', () => {
    isDragging = false;
    renderStars(currentRating);
  });

  overlay.querySelectorAll('.qr-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedPreset === btn) {
        btn.classList.remove('is-selected');
        selectedPreset = null;
      } else {
        if (selectedPreset) selectedPreset.classList.remove('is-selected');
        btn.classList.add('is-selected');
        selectedPreset = btn;
        nameInput.value = '';
      }
    });
  });

  nameInput.addEventListener('input', () => {
    if (selectedPreset) {
      selectedPreset.classList.remove('is-selected');
      selectedPreset = null;
    }
  });

  reviewToggle.addEventListener('click', () => {
    const isOpen = reviewTextarea.classList.toggle('is-open');
    reviewToggle.querySelector('.toggle-chevron').style.transform = isOpen ? 'rotate(180deg)' : '';
  });

  cancelBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEsc);

  saveBtn.addEventListener('click', async () => {
    const name = selectedPreset ? selectedPreset.dataset.name : nameInput.value.trim();

    if (!name) {
      nameInput.style.borderColor = '#6A5ACD';
      nameInput.focus();
      setTimeout(() => { nameInput.style.borderColor = ''; }, 2000);
      return;
    }
    if (!currentRating) {
      starsContainer.classList.add('qr-stars-error');
      setTimeout(() => starsContainer.classList.remove('qr-stars-error'), 2000);
      return;
    }

    saveBtn.textContent = 'Saving';
    saveBtn.disabled = true;

    try {
      const res = await fetch(API_LINKS.REVIEWS + 'new', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: tvId,
          user: name,
          review: reviewTextarea.value.trim(),
          rating: currentRating,
          mediaType: 'tv',
          season: parseInt(seasonNumber),
          episode: episode.episode_number
        })
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const ep = episode.episode_number;
      if (!seasonReviews[ep]) seasonReviews[ep] = [];
      seasonReviews[ep].push({
        user: name,
        review: reviewTextarea.value.trim(),
        rating: currentRating,
        episode: ep,
        season: parseInt(seasonNumber),
        createdAt: new Date().toISOString()
      });

      updateEpisodeRatingLine(ep);
      closeModal();
    } catch (e) {
      console.error('Error saving episode review:', e);
      showErrorMessage('Failed to save review. Please try again.', document.querySelector('.episodes-header'));
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  });
}