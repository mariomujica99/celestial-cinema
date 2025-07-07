const url = new URL(location.href);
const tvId = url.searchParams.get("id")
const tvTitle = url.searchParams.get("title")

const API_KEY = '22dd0fdacd20bf222b19ecd6396b194c';

const API_LINKS = {
  REVIEWS: 'http://localhost:8000/api/v1/reviews/',
  TV_DETAILS: `https://api.themoviedb.org/3/tv/${tvId}?api_key=${API_KEY}&append_to_response=content_ratings,external_ids`,
  TV_CREDITS: `https://api.themoviedb.org/3/tv/${tvId}/credits?api_key=${API_KEY}`,
  TV_SEASONS: `https://api.themoviedb.org/3/tv/${tvId}?api_key=${API_KEY}`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const reviewsContainer = document.getElementById("reviews-container");
const tvTitleElement = document.getElementById("tv-title");
const tvPosterElement = document.getElementById("tv-poster")

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

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
      console.log(tvData);
      
      setBackdropBackground(tvData.backdrop_path);
      
      if (tvData.poster_path) {
        tvPosterElement.src = API_LINKS.IMG_PATH + tvData.poster_path;
        tvPosterElement.onerror = function() {
          this.src = '../images/no-image.jpg';
        };
      } else {
        tvPosterElement.src = '../images/no-image.jpg';
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
    mediaContainer.style.background = `linear-gradient(90deg, rgba(45, 27, 61, 0.7), rgba(45, 27, 61, 0.8))`;
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
      console.log('TV Credits:', creditsData);
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
    
    castContainer.appendChild(castMember);
  });
}

const newReviewForm = document.createElement('div');
newReviewForm.innerHTML = `
  <div class="review-item">
    <div class="review-column">
      <div class="review-card">
        <p class="new-review">New Review
          <button type="button" onclick="saveReview('new-review-input', 'new-user-input', '', 'new-rating-input')">Save</button>
        </p>
        <p class="user-text">User 
          <input class="user-input" type="text" id="new-user-input" value="" placeholder="Enter your name">
        </p>
        <p class="rating-text">Rating
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
        </p>
        <p class="review-text"> 
          <textarea class="review-input" id="new-review-input" placeholder="Write your review"></textarea>
        </p>
      </div>
    </div>
  </div>
`;

reviewsContainer.appendChild(newReviewForm);

returnReviews(API_LINKS.REVIEWS);

function returnReviews(url) {
  fetch(url + "media/" + tvId).then(res => res.json()).then(function(reviewsData) {
    console.log(reviewsData);      
    reviewsData.forEach(reviewData => {
      const reviewCard = document.createElement('div');
      
      const escapedReview = escapeHtml(reviewData.review);
      const escapedUser = escapeHtml(reviewData.user);
      const rating = reviewData.rating || 0;
      
      reviewCard.innerHTML = `
        <div class="review-item">
          <div class="review-column">
            <div class="review-card" id="${reviewData._id}">
              <p class="user-review">${reviewData.user}</p>
              <div class="rating-display">
                <img src="../images/star.png" alt="Star" class="star-icon">
                <span class="rating-score">${rating}/10</span>
              </div>
              <p class="review-review">${reviewData.review}</p>                
              <p>
                <button type="button" onclick="editReview('${reviewData._id}')">Edit</button> 
                <button type="button" onclick="deleteReview('${reviewData._id}')">Delete</button>
              </p>
            </div>
          </div>
        </div>
      `;
      
      const cardElement = reviewCard.querySelector('.review-card');
      cardElement.setAttribute('data-original-review', reviewData.review);
      cardElement.setAttribute('data-original-user', reviewData.user);
      cardElement.setAttribute('data-original-rating', rating);
      
      reviewsContainer.appendChild(reviewCard);
    });
  }).catch(error => {
    console.error('Error fetching reviews:', error);
    showErrorMessage('Failed to load reviews. Please check your connection.');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function editReview(reviewId) {
  console.log('Editing review:', reviewId);
  const reviewElement = document.getElementById(reviewId);
  
  if (!reviewElement) {
    console.error('Review element not found with ID:', reviewId);
    return;
  }
  
  const originalReview = reviewElement.getAttribute('data-original-review') || '';
  const originalUser = reviewElement.getAttribute('data-original-user') || '';
  const originalRating = reviewElement.getAttribute('data-original-rating') || '0';
  
  const reviewInputId = "review-edit-" + reviewId;
  const userInputId = "user-edit-" + reviewId;
  const ratingInputId = "rating-edit-" + reviewId;
  
  let ratingOptions = '';
  for (let i = 0; i <= 10; i++) {
    const selected = i == originalRating ? 'selected' : '';
    ratingOptions += `<option value="${i}" ${selected}>${i}</option>`;
  }
  
  reviewElement.innerHTML = `
    <p class="user-text">User 
      <input class="user-input" type="text" id="${userInputId}" value="${escapeHtml(originalUser)}">
    </p>
    <p class="rating-text">Rating
      <img src="../images/star.png" alt="Star" class="star-icon">  
      <select class="rating-select" id="${ratingInputId}">
        ${ratingOptions}
      </select>
    </p>
    <p class="review-text"> 
      <textarea class="review-input" id="${reviewInputId}">${escapeHtml(originalReview)}</textarea>
    </p>
    <p>
      <button type="button" onclick="saveReview('${reviewInputId}', '${userInputId}', '${reviewId}', '${ratingInputId}')">Save</button>
      <button type="button" onclick="location.reload()">Cancel</button>
    </p>
  `;
}

function saveReview(reviewInputId, userInputId, reviewId="", ratingInputId="") {
  const reviewText = document.getElementById(reviewInputId).value;
  const userName = document.getElementById(userInputId).value;
  const rating = ratingInputId ? parseInt(document.getElementById(ratingInputId).value) : 0;

  if (reviewId) {
    fetch(API_LINKS.REVIEWS + reviewId, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": userName, "review": reviewText, "rating": rating})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    });
  } else {
      fetch(API_LINKS.REVIEWS + "new", {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": userName, "review": reviewText, "tvId": tvId, "rating": rating})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
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
}

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
    color: white;
    padding: 15px 15px 13px 15px;
    margin: 25px;
    border-radius: 8px;
    text-align: center;
    font-family: "Rollbox", "Montserrat", sans-serif, arial;
    text-transform: uppercase;
    font-size: 1.001rem;
  `;
  errorDiv.textContent = message;
  
  const mediaContainer = document.querySelector('.current-tv-container');
  mediaContainer.parentNode.insertBefore(errorDiv, mediaContainer.nextSibling);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}