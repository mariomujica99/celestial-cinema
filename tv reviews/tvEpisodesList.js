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
    quickRateBtn.addEventListener('click', () => {
      const imagePath   = episode.still_path || window.tvBackdropPath;
      const imageBase   = episode.still_path ? API_LINKS.IMG_PATH : API_LINKS.BACKDROP_PATH;

      showReviewModal({
        title:           episode.name || 'Untitled',
        posterSection:   true,
        backdropPath:    imagePath || null,
        backdropBaseUrl: imageBase,
        fallbackImage:   '../images/no-image-episode.jpg',
        mediaType:       'tv',
        lockedSeason:    parseInt(seasonNumber),
        lockedEpisode:   episode.episode_number,
        onSave: async ({ user, rating, review }) => {
          const res = await fetch(API_LINKS.REVIEWS + 'new', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              movieId:   tvId,
              user,
              review,
              rating,
              mediaType: 'tv',
              season:    parseInt(seasonNumber),
              episode:   episode.episode_number
            })
          });
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

          const ep = episode.episode_number;
          if (!seasonReviews[ep]) seasonReviews[ep] = [];
          seasonReviews[ep].push({
            user, review, rating,
            episode: ep,
            season:  parseInt(seasonNumber),
            createdAt: new Date().toISOString()
          });
          updateEpisodeRatingLine(ep);
        }
      });
    });
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

