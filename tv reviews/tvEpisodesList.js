const url = new URL(location.href);
const tvId = url.searchParams.get("id");
const seasonNumber = url.searchParams.get("season");
const tvTitle = url.searchParams.get("title");

const API_LINKS = {
    TV_DETAILS: `http://localhost:8000/api/v1/movies/tv/details/${tvId}`,
    TV_EPISODES: `http://localhost:8000/api/v1/movies/tv/season/${tvId}/${seasonNumber}`,
    IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
    BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const episodesContainer = document.getElementById("episodes-container");
const seasonTitleElement = document.getElementById("season-title");
const backButton = document.getElementById("back-button");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

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
      setBackdropBackground(tvData.backdrop_path);
      
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
      console.log('Episodes data:', data);
      displayEpisodes(data.episodes || []);
    })
    .catch(error => {
      console.error('Error fetching episodes:', error);
      showErrorMessage('Failed to load episodes. Please try again later.');
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

function setBackdropBackground(backdropPath) {
  window.tvBackdropPath = backdropPath;
  
  const episodesHeader = document.querySelector('.episodes-header');
  if (episodesHeader && backdropPath) {
    const backdropUrl = `${API_LINKS.BACKDROP_PATH}${backdropPath}`;
    episodesHeader.style.backgroundImage = `linear-gradient(rgba(19, 23, 32, 0.8), rgba(19, 23, 32, 0.9)), url('${backdropUrl}')`;
    episodesHeader.style.backgroundSize = 'cover';
    episodesHeader.style.backgroundPosition = 'center';
    episodesHeader.style.backgroundRepeat = 'no-repeat';
  } else if (episodesHeader) {
    episodesHeader.style.background = `linear-gradient(rgba(19, 23, 32, 0.4), rgba(19, 23, 32, 0.5)), url('${'../images/no-image-backdrop.jpg'}')`;
    episodesHeader.style.backgroundSize = 'cover';
    episodesHeader.style.backgroundPosition = 'center';
    episodesHeader.style.backgroundRepeat = 'no-repeat';
  }
}

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message-red';
  errorDiv.textContent = message;
  const episodesHeader = document.querySelector('.episodes-header');
  episodesHeader.parentNode.insertBefore(errorDiv, episodesHeader.nextSibling);

  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}