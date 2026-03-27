const url = new URL(location.href);
const tvId = url.searchParams.get("id");
const seasonNumber = url.searchParams.get("season");
const tvTitle = url.searchParams.get("title");

const API_LINKS = {
  TV_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${tvId}`,
  TV_EPISODES: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/season/${tvId}/${seasonNumber}`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const episodesContainer = document.getElementById("episodes-container");
const seasonTitleElement = document.getElementById("season-title");
const backButton = document.getElementById("back-button");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

initSearchRedirect(searchForm, searchInput);

backButton.addEventListener("click", () => {
  window.location.href = `tvReviews.html?id=${tvId}&title=${encodeURIComponent(tvTitle || '')}`;
});

loadTVDetails();
loadEpisodes();

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

function loadEpisodes() {
  fetch(API_LINKS.TV_EPISODES)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(data) {
      displayEpisodes(data.episodes || []);
    })
    .catch(error => {
      console.error('Error fetching episodes:', error);
      showErrorMessage('Failed to load episodes. Please try again later.', document.querySelector('.episodes-header'));
    });
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
    
    let stillUrl;
    if (episode.still_path) {
      stillUrl = `${API_LINKS.IMG_PATH}${episode.still_path}`;
    } else {
      const hasAired = episode.air_date && new Date(episode.air_date) <= new Date();
      
      if (window.tvBackdropPath) {
        stillUrl = `${API_LINKS.BACKDROP_PATH}${window.tvBackdropPath}`;
      } else {
        stillUrl = '../images/no-image-episode.jpg';
      }
    }
    
    const airDate = episode.air_date ? new Date(episode.air_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : '';
    
    const userScore = episode.vote_average ? Math.round(episode.vote_average * 10) : 0;
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
          <span class="episode-score">${userScore}%</span>
          <span class="episode-date">${airDate}</span>
          ${runtime ? `<span class="episode-runtime">${runtime}</span>` : ''}
        </div>
        <div class="episode-overview">
          ${episode.overview || 'No description available.'}
        </div>
      </div>
    `;
    
    episodesContainer.appendChild(episodeCard);
  });
}