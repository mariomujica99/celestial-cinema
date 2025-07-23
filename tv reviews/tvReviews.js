const url = new URL(location.href);
const tvId = url.searchParams.get("id")
const tvTitle = url.searchParams.get("title")

const API_LINKS = {
  REVIEWS: 'https://celestial-cinema-backend.onrender.com/api/v1/reviews/',
  TV_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${tvId}`,
  TV_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/credits/${tvId}`,
  TV_SEASONS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/seasons/${tvId}`,
  TV_EPISODES: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/season/${tvId}/`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const reviewsContainer = document.getElementById("reviews-container");
const tvTitleElement = document.getElementById("tv-title");
const tvPosterElement = document.getElementById("tv-poster")

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const loadMoreBtn = document.getElementById("load-more-btn");

let currentPage = 1;
let hasMoreReviews = true;
let isLoading = false;
let allFilteredReviews = [];
let displayedReviews = [];
let displayedReviewsCount = 8;
let seasonsData = [];
let episodesData = {};

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

returnTVDetails(API_LINKS.TV_DETAILS);

function returnTVDetails(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(tvData) {      
      setBackdropBackground(tvData.backdrop_path);
      
      if (tvData.poster_path) {
        tvPosterElement.src = API_LINKS.IMG_PATH + tvData.poster_path;
        tvPosterElement.onload = function() {
          this.classList.add('loaded');
        };
        tvPosterElement.onerror = function() {
          this.src = '../images/no-image.jpg';
          this.classList.add('loaded');
        };
      } else {
        tvPosterElement.src = '../images/no-image.jpg';
        tvPosterElement.onload = function() {
          this.classList.add('loaded');
        };
      }
      
      const firstAirYear = tvData.first_air_date ? new Date(tvData.first_air_date).getFullYear() : '';
      
      tvTitleElement.innerHTML = `${tvData.name || 'Unknown Title'} ${firstAirYear ? `(${firstAirYear})` : ''}`;
      
      createTVDetailsSection(tvData);
      
      displaySeasons(tvData);
      
      returnTVCredits(API_LINKS.TV_CREDITS);
      
    })
    .catch(error => {
      console.error('Error fetching TV details:', error);
      tvTitleElement.innerHTML = tvTitle || '';
      tvPosterElement.src = '../images/no-image.jpg';
      showErrorMessage('Failed to load TV show details. Please try again later.');
    });
}

function createTVDetailsSection(tvData) {
  let tvDetailsContainer = document.querySelector('.current-tv-details');
  if (!tvDetailsContainer) {
    console.error('TV details container not found');
    return;
  }
  
  const firstAirDate = tvData.first_air_date ? new Date(tvData.first_air_date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }) : '';
  
  const genres = tvData.genres ? tvData.genres.map(genre => genre.name).join(', ') : '';
  
  const userScore = tvData.vote_average ? Math.round(tvData.vote_average * 10) : 0;
  
  let contentRating = '';
  if (tvData.content_ratings && tvData.content_ratings.results) {
    const usRating = tvData.content_ratings.results.find(rating => rating.iso_3166_1 === 'US');
    if (usRating) {
      contentRating = usRating.rating || '';
    }
  }
  
  const firstAirYear = tvData.first_air_date ? new Date(tvData.first_air_date).getFullYear() : '';
  const lastAirYear = tvData.last_air_date ? new Date(tvData.last_air_date).getFullYear() : '';
  const yearRange = firstAirYear ? (lastAirYear && lastAirYear !== firstAirYear ? `${firstAirYear}-${lastAirYear}` : `${firstAirYear}`) : '';
  
  const numberOfSeasons = tvData.number_of_seasons || 0;
  const numberOfEpisodes = tvData.number_of_episodes || 0;
  
  tvDetailsContainer.innerHTML = `
    <p class="tv-title" id="tv-title">${tvData.name || 'Unknown Title'} ${yearRange ? `(${yearRange})` : ''}</p>
    
    <div class="tv-info-line">
      ${contentRating ? `<span class="content-rating">${contentRating}</span>` : ''}
      ${firstAirDate ? `<span class="release-date">${firstAirDate} (US)</span>` : ''}
      ${genres ? `<span class="genres">${genres}</span>` : ''}
    </div>
    
    <div class="user-score-container">
      <span class="user-score-label">User Score</span>
      <span class="user-score">${userScore}%</span>
    </div>
    
    <div class="overview-section">
      <p class="overview-title">Overview</p>
      <p class="overview-text">${tvData.overview || 'No overview available.'}</p>
    </div>
    
    <div class="credits-section" id="tv-credits-section">
      <div class="credits-loading"></div>
    </div>

    ${tvData.external_ids && tvData.external_ids.imdb_id ? `<div class="imdb-link-container">
      <a href="https://www.imdb.com/title/${tvData.external_ids.imdb_id}/" target="_blank" class="imdb-link">
          View on IMDB
      </a>
    </div>` : ''}
  `;
}

function displaySeasons(tvData) {
  const seasonsContainer = document.getElementById('seasons-container');
  if (!seasonsContainer) return;
  
  const seasons = tvData.seasons || [];

  const seasonsTitleElement = document.querySelector('.seasons-title');
  if (seasonsTitleElement && tvData.number_of_seasons && tvData.number_of_episodes) {
    const numberOfSeasons = tvData.number_of_seasons;
    const numberOfEpisodes = tvData.number_of_episodes;
    seasonsTitleElement.textContent = `Seasons (${numberOfSeasons} Season${numberOfSeasons > 1 ? 's' : ''} | ${numberOfEpisodes} Episode${numberOfEpisodes > 1 ? 's' : ''})`;
  }
  
  const filteredSeasons = seasons.filter(season => season.season_number > 0).sort((a, b) => a.season_number - b.season_number);
  
  if (filteredSeasons.length === 0) {
    seasonsContainer.innerHTML = '<div class="seasons-loading">No seasons information available</div>';
    return;
  }
  
  seasonsContainer.innerHTML = '';
  
  filteredSeasons.forEach(season => {
    const seasonCard = document.createElement('div');
    seasonCard.className = 'season-card';
    
    const posterUrl = season.poster_path 
      ? `${API_LINKS.IMG_PATH}${season.poster_path}`
      : '../images/no-image-season.jpg';
    
    const airDate = season.air_date ? new Date(season.air_date).getFullYear() : '';
    const episodeCount = season.episode_count || 0;
    
    seasonCard.innerHTML = `
      <img class="season-poster" src="${posterUrl}" alt="Season ${season.season_number}" onerror="this.src='../images/no-image-season.jpg'">
      <div class="season-title">Season ${season.season_number}</div>
      <div class="season-info">${airDate ? `${airDate} • ` : ''}${episodeCount} Episode${episodeCount !== 1 ? 's' : ''}</div>
    `;

    seasonCard.addEventListener('click', () => {
      const showTitle = tvData.name || tvTitle || 'Unknown Title';
      window.location.href = `tvEpisodesList.html?id=${tvId}&season=${season.season_number}&title=${encodeURIComponent(showTitle)}`;
    });
    
    seasonsContainer.appendChild(seasonCard);
  });
}

function setBackdropBackground(backdropPath) {
  const mediaContainer = document.querySelector('.current-tv-container');
  if (mediaContainer && backdropPath) {
    const backdropUrl = `${API_LINKS.BACKDROP_PATH}${backdropPath}`;
    mediaContainer.style.backgroundImage = `linear-gradient(rgba(19, 23, 32, 0.7), rgba(19, 23, 32, 0.8)), url('${backdropUrl}')`;
    mediaContainer.style.backgroundSize = 'cover';
    mediaContainer.style.backgroundPosition = 'center';
    mediaContainer.style.backgroundRepeat = 'no-repeat';
  } else {
    mediaContainer.style.backgroundImage = `linear-gradient(rgba(19, 23, 32, 0.4), rgba(19, 23, 32, 0.5)), url('${'../images/no-image-backdrop.jpg'}')`;
    mediaContainer.style.backgroundSize = 'cover';
    mediaContainer.style.backgroundPosition = 'center';
    mediaContainer.style.backgroundRepeat = 'no-repeat';
  }
}

function returnTVCredits(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(creditsData) {
      updateCreditsSection(creditsData);
    })
    .catch(error => {
      console.error('Error fetching TV credits:', error);
      const creditsSection = document.getElementById('tv-credits-section');
      if (creditsSection) {
        creditsSection.innerHTML = '<div class="credits-loading">Credits unavailable</div>';
      }
      const castContainer = document.getElementById('cast-container');
      if (castContainer) {
        castContainer.innerHTML = '<div class="cast-loading">Cast information unavailable</div>';
      }
    });
}

function updateCreditsSection(creditsData) {
  const creditsSection = document.getElementById('tv-credits-section');
  if (!creditsSection) return;
  
  const creators = creditsData.crew.filter(person => person.job === 'Creator' || person.job === 'Executive Producer');
  const writers = creditsData.crew.filter(person => person.job === 'Writer' || person.job === 'Screenplay');
  const directors = creditsData.crew.filter(person => person.job === 'Director');
  
  let creditsHTML = '<div class="credits-grid">';
  
  creditsHTML += '<div class="credits-row">';
  
  if (creators.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${creators[0].name}</div>`;
    creditsHTML += `<div class="person-job">${creators[0].job}</div>`;
    creditsHTML += '</div>';
  }
  
  if (writers.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${writers[0].name}</div>`;
    creditsHTML += `<div class="person-job">${writers[0].job}</div>`;
    creditsHTML += '</div>';
  }
  
  if (directors.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${directors[0].name}</div>`;
    creditsHTML += `<div class="person-job">${directors[0].job}</div>`;
    creditsHTML += '</div>';
  }
  
  creditsHTML += '</div>';
  creditsHTML += '</div>';
  
  creditsSection.innerHTML = creditsHTML;

  displayCast(creditsData);

  const castTitle = document.querySelector('.cast-title');
  if (castTitle) {
      castTitle.addEventListener('click', viewFullCast);
  }
}

function displayCast(creditsData) {
  const castContainer = document.getElementById('cast-container');
  if (!castContainer) return;
  
  const cast = creditsData.cast.slice(0, 10);
  
  if (cast.length === 0) {
    castContainer.innerHTML = '<div class="cast-loading">No cast information available</div>';
    return;
  }
  
  castContainer.innerHTML = '';
  
  cast.forEach(member => {
    const castMember = document.createElement('div');
    castMember.className = 'cast-member';
    
    const photoUrl = member.profile_path 
      ? `${API_LINKS.IMG_PATH}${member.profile_path}`
      : '../images/no-image-cast.jpg';
    
    castMember.innerHTML = `
      <img class="cast-photo" src="${photoUrl}" alt="${member.name}" onerror="this.src='../images/no-image-cast.jpg'">
      <div class="cast-name">${member.name}</div>
      <div class="cast-character">${member.character || 'Unknown Role'}</div>
    `;

    castMember.addEventListener('click', () => {
      window.location.href = `../people/castMember.html?id=${member.id}&name=${encodeURIComponent(member.name)}`;
    });
    
    castContainer.appendChild(castMember);
  });

  const fullCastButton = document.createElement('div');
  fullCastButton.className = 'full-cast-button';
  fullCastButton.innerHTML = `
    <button class="full-cast-btn" onclick="viewFullCast()">Full Cast →</button>
  `;
  castContainer.appendChild(fullCastButton);
}

function viewFullCast() {
    const mediaType = window.location.pathname.includes('tv') ? 'tv' : 'movie';
    const mediaTitle = document.getElementById('tv-title') || document.getElementById('movie-title');
    const title = mediaTitle ? mediaTitle.textContent : '';
    
    window.location.href = `../people/castList.html?id=${tvId || movieId}&type=${mediaType}&title=${encodeURIComponent(title)}`;
}

const newReviewForm = document.createElement('div');
newReviewForm.innerHTML = `
  <div class="review-item">
    <div class="review-column">
      <div class="review-card">
        <p class="new-review">New Review
          <button type="button" onclick="saveReview('new-review-input', 'new-user-input', '', 'new-rating-input', 'new-season-input', 'new-episode-input')">Save</button>
        </p>
        <div class="episodes-line">
          <div class="season-line">
            <p class="season-text"></p>
            <select class="season-select" id="new-season-input" onchange="handleSeasonChange(this)">
              <option value="">Select Season</option>
            </select>
          </div>
          <div class="episode-line">
            <p class="episode-text"></p>
            <select class="episode-select" id="new-episode-input" disabled>
              <option value="all">All Episodes (Season Review)</option>
            </select>
          </div>
        </div>
        <div class="user-line">
          <p class="user-text">User</p>
          <input class="user-input" type="text" id="new-user-input" value="" placeholder="Enter your name">
        </div>
        <div class="rating-line">
          <p class="rating-text">Rating</p>
          <img src="../images/star.png" alt="Star" class="star-icon"> 
          <select class="rating-select" id="new-rating-input">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
          </select>
        </div>
        <p class="review-text"> 
          <textarea class="review-input" id="new-review-input" placeholder="Write your review"></textarea>
        </p>
      </div>
    </div>
  </div>
`;

reviewsContainer.appendChild(newReviewForm);

loadMoreBtn.addEventListener('click', loadMoreFilteredReviews);
fetchSeasonsForDropdown();

returnReviews(API_LINKS.REVIEWS);

function returnReviews(url) {
  fetch(url + "media/" + tvId).then(res => res.json()).then(function(reviewsData) {
    allReviewsData = reviewsData;
    allFilteredReviews = reviewsData;

    updateReviewsTitle(reviewsData);
    displayFilteredReviews(reviewsData.slice(0, 8));
    displayedReviewsCount = Math.min(8, reviewsData.length);

    if (reviewsData.length > 8) {
      loadMoreBtn.style.display = 'block';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }).catch(error => {
    console.error('Error fetching reviews:', error);
    showErrorMessage('Failed to load reviews. Please check your connection.');
  });
}

function updateReviewsTitle(reviewsData, selectedSeason = 'all') {
  const reviewsTitleElement = document.querySelector('.reviews-title');
  const reviewsLeftElement = document.querySelector('.reviews-left');
  if (!reviewsTitleElement || !reviewsLeftElement) return;
  
  let titleText = 'REVIEWS';
  if (selectedSeason !== 'all') {
    titleText = `REVIEWS FOR SEASON ${selectedSeason}`;
  } else {
    titleText = 'REVIEWS FOR ALL SEASONS';
  }
  
  reviewsTitleElement.textContent = titleText;
  
  const existingRatingInfo = reviewsLeftElement.querySelector('.rating-info');
  if (existingRatingInfo) {
    existingRatingInfo.remove();
  }
  
  if (reviewsData.length > 0) {
    const totalRating = reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = (totalRating / reviewsData.length).toFixed(1);
    const reviewCount = reviewsData.length;
    
    const ratingInfoElement = document.createElement('div');
    ratingInfoElement.className = 'rating-info';
    ratingInfoElement.innerHTML = `
      <img src="../images/star.png" alt="Star" class="star-icon">
      ${averageRating}/10 (${reviewCount})
    `;
    
    reviewsLeftElement.appendChild(ratingInfoElement);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function editReview(reviewId) {
  const reviewElement = document.getElementById(reviewId);
  
  if (!reviewElement) {
    console.error('Review element not found with ID:', reviewId);
    return;
  }
  
  const originalReview = reviewElement.getAttribute('data-original-review') || '';
  const originalUser = reviewElement.getAttribute('data-original-user') || '';
  const originalRating = reviewElement.getAttribute('data-original-rating') || '0';
  const originalSeason = reviewElement.getAttribute('data-original-season') || '';
  const originalEpisode = reviewElement.getAttribute('data-original-episode') || 'all';
  
  const reviewInputId = "review-edit-" + reviewId;
  const userInputId = "user-edit-" + reviewId;
  const ratingInputId = "rating-edit-" + reviewId;
  const seasonInputId = "season-edit-" + reviewId;
  const episodeInputId = "episode-edit-" + reviewId;
  
  let ratingOptions = '';
  for (let i = 0; i <= 10; i++) {
    const selected = i == originalRating ? 'selected' : '';
    ratingOptions += `<option value="${i}" ${selected}>${i}</option>`;
  }
  
  reviewElement.innerHTML = `
    <div class="episodes-line">
      <div class="season-line">
        <p class="season-text"></p>
        <select class="season-select" id="${seasonInputId}" onchange="handleSeasonChange(this)">
          <option value="">Select Season</option>
        </select>
      </div>
      <div class="episode-line">
        <p class="episode-text"></p>
        <select class="episode-select" id="${episodeInputId}" disabled>
          <option value="all">All Episodes (Season Review)</option>
        </select>
      </div>
    </div>
    <div class="user-line">
      <p class="user-text">User</p>
      <input class="user-input" type="text" id="${userInputId}" value="${escapeHtml(originalUser)}">
    </div>
    <div class="rating-line">
      <p class="rating-text">Rating</p>
      <img src="../images/star.png" alt="Star" class="star-icon">  
      <select class="rating-select" id="${ratingInputId}">
        ${ratingOptions}
      </select>
    </div>
    <p class="review-text"> 
      <textarea class="review-input" id="${reviewInputId}">${escapeHtml(originalReview)}</textarea>
    </p>
    <div class="review-actions">
      <button type="button" onclick="saveReview('${reviewInputId}', '${userInputId}', '${reviewId}', '${ratingInputId}', '${seasonInputId}', '${episodeInputId}')">Save</button>
      <button type="button" onclick="location.reload()">Cancel</button>
    </div>
  `;
  
  populateSeasonDropdown();
  setTimeout(() => {
    const seasonSelect = document.getElementById(seasonInputId);
    const episodeSelect = document.getElementById(episodeInputId);
    
    if (seasonSelect && originalSeason) {
      seasonSelect.value = originalSeason;
      episodeSelect.disabled = false;
      fetchEpisodesForSeason(originalSeason);
      
      setTimeout(() => {
        if (episodeSelect) {
          episodeSelect.value = originalEpisode;
        }
      }, 100);
    }
  }, 100);
}

function saveReview(reviewInputId, userInputId, reviewId="", ratingInputId="", seasonInputId="", episodeInputId="") {
  const reviewTextElement = document.getElementById(reviewInputId);
  const userNameElement = document.getElementById(userInputId);
  const ratingElement = ratingInputId ? document.getElementById(ratingInputId) : null;
  
  if (!reviewTextElement || !userNameElement) {
    console.error('Required form elements not found');
    showErrorMessage('Form elements missing. Please try again.');
    return;
  }
  
  const reviewText = reviewTextElement.value;
  const userName = userNameElement.value;
  const rating = ratingElement ? parseInt(ratingElement.value) : 0;
  
  let season = null;
  let episode = null;
  
  if (seasonInputId) {
    const seasonElement = document.getElementById(seasonInputId);
    if (seasonElement) {
      const seasonValue = seasonElement.value;
      season = seasonValue ? parseInt(seasonValue) : null;
    }
  }
  
  if (episodeInputId && season) {
    const episodeElement = document.getElementById(episodeInputId);
    if (episodeElement) {
      const episodeValue = episodeElement.value;
      episode = episodeValue === "all" ? null : parseInt(episodeValue);
    }
  }

  const requestBody = {
    "user": userName, 
    "review": reviewText, 
    "rating": rating, 
    "mediaType": "tv"
  };
  
  if (season !== null) {
    requestBody.season = season;
  }
  
  if (episode !== null) {
    requestBody.episode = episode;
  }

  if (reviewId) {
    fetch(API_LINKS.REVIEWS + reviewId, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    })
    .catch(error => {
      console.error('Error saving review:', error);
      showErrorMessage('Failed to save review. Please try again.');
    });
  } else {
    requestBody.movieId = tvId;
    
    fetch(API_LINKS.REVIEWS + "new", {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    })
    .catch(error => {
      console.error('Error saving review:', error);
      showErrorMessage('Failed to save review. Please try again.');
    });
  }
}

function deleteReview(reviewId) {
  fetch(API_LINKS.REVIEWS + reviewId, {
    method: 'DELETE'
  }).then(res => res.json()).then(res => {
    console.log(res);
    location.reload();
  })
  .catch(error => {
    console.error('Error deleting review:', error);
    showErrorMessage('Failed to delete review. Please try again.');
  });
}

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message-red';
  errorDiv.textContent = message;
  const mediaContainer = document.querySelector('.current-tv-container');
  mediaContainer.parentNode.insertBefore(errorDiv, mediaContainer.nextSibling);

  setTimeout(() => {
      if (errorDiv.parentNode) {
          errorDiv.remove();
      }
  }, 5000);
}

function fetchSeasonsForDropdown() {
    fetch(API_LINKS.TV_SEASONS)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(function(data) {
            seasonsData = data.seasons || [];
            populateSeasonDropdown();
            populateSeasonFilter();
        })
        .catch(error => {
            console.error('Error fetching seasons:', error);
        });
}

function fetchEpisodesForSeason(seasonNumber) {
    if (episodesData[seasonNumber]) {
        populateEpisodeDropdown(seasonNumber);
        return;
    }
    
    fetch(API_LINKS.TV_EPISODES + seasonNumber)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(function(data) {
            episodesData[seasonNumber] = data.episodes || [];
            populateEpisodeDropdown(seasonNumber);
        })
        .catch(error => {
            console.error('Error fetching episodes:', error);
        });
}

function populateSeasonDropdown() {
    const seasonSelects = document.querySelectorAll('.season-select');
    seasonSelects.forEach(select => {
        select.innerHTML = '<option value="">Select Season</option>';
        seasonsData.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `Season ${season.season_number}`;
            select.appendChild(option);
        });
    });
}

function populateEpisodeDropdown(seasonNumber) {
    const episodeSelects = document.querySelectorAll('.episode-select');
    episodeSelects.forEach(select => {
        select.innerHTML = '<option value="all">All Episodes (Season Review)</option>';
        
        if (episodesData[seasonNumber]) {
            episodesData[seasonNumber].forEach(episode => {
                const option = document.createElement('option');
                option.value = episode.episode_number;
                option.textContent = `Episode ${episode.episode_number}: ${episode.name || 'Untitled'}`;
                select.appendChild(option);
            });
        }
    });
}

function handleSeasonChange(seasonSelect) {
    const seasonNumber = seasonSelect.value;
    const episodeSelect = seasonSelect.closest('.review-card').querySelector('.episode-select');
    
    if (seasonNumber) {
        episodeSelect.disabled = false;
        fetchEpisodesForSeason(seasonNumber);
    } else {
        episodeSelect.disabled = true;
        episodeSelect.innerHTML = '<option value="all">All Episodes (Season Review)</option>';
    }
}

let allReviewsData = [];

function populateSeasonFilter() {
  const seasonFilter = document.getElementById('season-filter');
  if (!seasonFilter) return;
  
  seasonFilter.innerHTML = '<option value="all">All Seasons</option>';

  seasonsData.forEach(season => {
    if (season.season_number > 0) {
      const option = document.createElement('option');
      option.value = season.season_number;
      option.textContent = `Season ${season.season_number}`;
      seasonFilter.appendChild(option);
    }
  });
}

function filterReviewsBySeason() {
  const seasonFilter = document.getElementById('season-filter');
  const selectedSeason = seasonFilter.value;
  
  const reviewsContainer = document.getElementById('reviews-container');
  const newReviewForm = reviewsContainer.firstElementChild;
  reviewsContainer.innerHTML = '';
  reviewsContainer.appendChild(newReviewForm);
  
  let filteredReviews = allReviewsData;
  if (selectedSeason !== 'all') {
    filteredReviews = allReviewsData.filter(review => 
      review.season && review.season.toString() === selectedSeason
    );
  }

  allFilteredReviews = filteredReviews;
  displayedReviewsCount = Math.min(8, filteredReviews.length);
  updateReviewsTitle(filteredReviews, selectedSeason);
  displayFilteredReviews(filteredReviews.slice(0, 8));

  if (filteredReviews.length > 8) {
    loadMoreBtn.style.display = 'block';
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

function displayFilteredReviews(reviewsData, append = false) {
  const reviewsContainer = document.getElementById('reviews-container');
  
  if (!append) {
    const newReviewForm = reviewsContainer.firstElementChild;
    reviewsContainer.innerHTML = '';
    reviewsContainer.appendChild(newReviewForm);
  }
  
  reviewsData.forEach(reviewData => {
    const reviewCard = document.createElement('div');
    
    const escapedReview = escapeHtml(reviewData.review);
    const escapedUser = escapeHtml(reviewData.user);
    const rating = reviewData.rating || 0;
    
    let seasonEpisodeDisplay = '';
    if (reviewData.season) {
      if (reviewData.episode) {
        seasonEpisodeDisplay = `<div class="season-episode-info">Season ${reviewData.season} | Episode ${reviewData.episode}</div>`;
      } else {
        seasonEpisodeDisplay = `<div class="season-episode-info">Season ${reviewData.season} (Full Season)</div>`;
      }
    }
    
    reviewCard.innerHTML = `
      <div class="review-item">
        <div class="review-column">
          <div class="review-card" id="${reviewData._id}">
            <p class="user-review">${reviewData.user}</p>
            ${seasonEpisodeDisplay}
            <div class="rating-display">
                <div class="rating-left">
                    <img src="../images/star.png" alt="Star" class="star-icon">
                    <span class="rating-score">${rating}/10</span>
                </div>
                <div class="timestamp">
                    ${formatTimestamp(reviewData.createdAt)}
                </div>
            </div>
            <p class="review-review">${reviewData.review}</p>                
            <div class="review-actions">
                <button type="button" onclick="editReview('${reviewData._id}')">Edit</button> 
                <button type="button" onclick="deleteReview('${reviewData._id}')">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const cardElement = reviewCard.querySelector('.review-card');
    cardElement.setAttribute('data-original-review', reviewData.review);
    cardElement.setAttribute('data-original-user', reviewData.user);
    cardElement.setAttribute('data-original-rating', rating);
    cardElement.setAttribute('data-original-season', reviewData.season || '');
    cardElement.setAttribute('data-original-episode', reviewData.episode || 'all');
    
    reviewsContainer.appendChild(reviewCard);
  });
}

function loadMoreFilteredReviews() {
  const reviewsPerPage = 8;
  const nextBatch = allFilteredReviews.slice(displayedReviewsCount, displayedReviewsCount + reviewsPerPage);
  
  if (nextBatch.length === 0) {
    loadMoreBtn.style.display = 'none';
    return;
  }
  
  displayFilteredReviews(nextBatch, true);
  displayedReviewsCount += nextBatch.length;
  
  if (displayedReviewsCount >= allFilteredReviews.length) {
    loadMoreBtn.style.display = 'none';
  }
}