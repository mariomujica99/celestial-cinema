const url = new URL(location.href);
const movieId = url.searchParams.get("id")
const movieTitle = url.searchParams.get("title")

const API_LINKS = {
  REVIEWS: 'https://celestial-cinema-backend.onrender.com/api/v1/reviews/',
  MOVIE_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/details/${movieId}`,
  MOVIE_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/credits/${movieId}`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const reviewsContainer = document.getElementById("reviews-container");
const movieTitleElement = document.getElementById("movie-title");
const moviePosterElement = document.getElementById("movie-poster")

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const loadMoreBtn = document.getElementById("load-more-btn");

let currentPage = 1;
let hasMoreReviews = true;
let isLoading = false;
let allMovieReviews = [];

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

returnMovieDetails(API_LINKS.MOVIE_DETAILS);

function returnMovieDetails(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(movieData) {     
      setBackdropBackground(movieData.backdrop_path);
      
      if (movieData.poster_path) {
        moviePosterElement.src = API_LINKS.IMG_PATH + movieData.poster_path;
        moviePosterElement.onload = function() {
          this.classList.add('loaded');
        };
        moviePosterElement.onerror = function() {
          this.src = '../images/no-image.jpg';
          this.classList.add('loaded');
        };
      } else {
        moviePosterElement.src = '../images/no-image.jpg';
        moviePosterElement.onload = function() {
          this.classList.add('loaded');
        };
      }
      
      const releaseYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : '';
      
      movieTitleElement.innerHTML = `${movieData.title || 'Unknown Title'} ${releaseYear ? `(${releaseYear})` : ''}`;
      
      createMovieDetailsSection(movieData);
      
      returnMovieCredits(API_LINKS.MOVIE_CREDITS);
      
    })
    .catch(error => {
      console.error('Error fetching movie details:', error);
      movieTitleElement.innerHTML = movieTitle || '';
      moviePosterElement.src = '../images/no-image.jpg';
      showErrorMessage('Failed to load movie details. Please try again later.');
    });
}

function createMovieDetailsSection(movieData) {
  let movieDetailsContainer = document.querySelector('.current-movie-details');
  if (!movieDetailsContainer) {
    console.error('Movie details container not found');
    return;
  }
  
  const releaseDate = movieData.release_date ? new Date(movieData.release_date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }) : '';
  
  const runtime = movieData.runtime ? `${Math.floor(movieData.runtime / 60)}h ${movieData.runtime % 60}m` : '';
  
  const genres = movieData.genres ? movieData.genres.map(genre => genre.name).join(', ') : '';
  
  const userScore = movieData.vote_average ? Math.round(movieData.vote_average * 10) : 0;
  
  let contentRating = '';
  if (movieData.release_dates && movieData.release_dates.results) {
    const usRelease = movieData.release_dates.results.find(release => release.iso_3166_1 === 'US');
    if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
      const theatricalRelease = usRelease.release_dates.find(rd => rd.type === 3) || usRelease.release_dates[0];
      contentRating = theatricalRelease.certification || '';
    }
  }
  
  const releaseYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : '';
  
  movieDetailsContainer.innerHTML = `
    <p class="movie-title" id="movie-title">${movieData.title || 'Unknown Title'} ${releaseYear ? `(${releaseYear})` : ''}</p>
    
    <div class="movie-info-line">
      ${contentRating ? `<span class="content-rating">${contentRating}</span>` : ''}
      ${releaseDate ? `<span class="release-date">${releaseDate} (US)</span>` : ''}
      ${genres ? `<span class="genres">${genres}</span>` : ''}
      ${runtime ? `<span class="runtime">${runtime}</span>` : ''}
    </div>
    
    <div class="user-score-container">
      <span class="user-score-label">User Score</span>
      <span class="user-score">${userScore}%</span>
    </div>
    
    <div class="overview-section">
      <p class="overview-title">Overview</p>
      <p class="overview-text">${movieData.overview || 'No overview available.'}</p>
    </div>
    
    <div class="credits-section" id="movie-credits-section">
      <div class="credits-loading"></div>
    </div>
    
    ${movieData.imdb_id ? `<div class="imdb-link-container">
      <a href="https://www.imdb.com/title/${movieData.imdb_id}/" target="_blank" class="imdb-link">
        View on IMDB
      </a>
    </div>` : ''}
  `;
}

function setBackdropBackground(backdropPath) {
  const mediaContainer = document.querySelector('.current-movie-container');
  if (mediaContainer && backdropPath) {
    const backdropUrl = `${API_LINKS.BACKDROP_PATH}${backdropPath}`;
    mediaContainer.style.backgroundImage = `linear-gradient(rgba(19, 23, 32, 0.7), rgba(19, 23, 32, 0.8)), url('${backdropUrl}')`;
    mediaContainer.style.backgroundSize = 'cover';
    mediaContainer.style.backgroundPosition = 'center';
    mediaContainer.style.backgroundRepeat = 'no-repeat';
  } else {
    mediaContainer.style.background = `linear-gradient(rgba(19, 23, 32, 0.4), rgba(19, 23, 32, 0.5)), url('${'../images/no-image-backdrop.jpg'}')`;
    mediaContainer.style.backgroundSize = 'cover';
    mediaContainer.style.backgroundPosition = 'center';
    mediaContainer.style.backgroundRepeat = 'no-repeat';
  }
}

function returnMovieCredits(url) {
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
      console.error('Error fetching movie credits:', error);
      const creditsSection = document.getElementById('movie-credits-section');
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
  const creditsSection = document.getElementById('movie-credits-section');
  if (!creditsSection) return;
  
  const director = creditsData.crew.filter(person => person.job === 'Director');
  const screenplay = creditsData.crew.filter(person => person.job === 'Screenplay');
  const story = creditsData.crew.filter(person => person.job === 'Story');
  const characters = creditsData.crew.filter(person => person.job === 'Characters');
  
  let creditsHTML = '<div class="credits-grid">';
  
  creditsHTML += '<div class="credits-row">';
  
  if (screenplay.length > 0 || story.length > 0) {
    const screenplayNames = screenplay.map(p => p.name);
    const storyNames = story.map(p => p.name);
    const combinedNames = [...new Set([...screenplayNames, ...storyNames])];
    
    if (combinedNames[0]) {
      creditsHTML += '<div class="credits-person">';
      creditsHTML += `<div class="person-name">${combinedNames[0]}</div>`;
      
      const jobs = [];
      if (screenplay.some(p => p.name === combinedNames[0])) jobs.push('Screenplay');
      if (story.some(p => p.name === combinedNames[0])) jobs.push('Story');
      creditsHTML += `<div class="person-job">${jobs.join(', ')}</div>`;
      creditsHTML += '</div>';
    }
    
    if (combinedNames[1]) {
      creditsHTML += '<div class="credits-person">';
      creditsHTML += `<div class="person-name">${combinedNames[1]}</div>`;
      
      const jobs2 = [];
      if (screenplay.some(p => p.name === combinedNames[1])) jobs2.push('Screenplay');
      if (story.some(p => p.name === combinedNames[1])) jobs2.push('Story');
      creditsHTML += `<div class="person-job">${jobs2.join(', ')}</div>`;
      creditsHTML += '</div>';
    }
  }
  
  if (characters.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${characters[0].name}</div>`;
    creditsHTML += '<div class="person-job">Characters</div>';
    creditsHTML += '</div>';
  }
  
  creditsHTML += '</div>';
  
  creditsHTML += '<div class="credits-row">';
  
  if (director.length > 0) {
    director.forEach(dir => {
      creditsHTML += '<div class="credits-person">';
      creditsHTML += `<div class="person-name">${dir.name}</div>`;
      creditsHTML += '<div class="person-job">Director</div>';
      creditsHTML += '</div>';
    });
  }
  
  const additionalStory = story.filter(p => !screenplay.some(s => s.name === p.name));
  if (additionalStory.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${additionalStory[0].name}</div>`;
    creditsHTML += '<div class="person-job">Story</div>';
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
    
    window.location.href = `../people/castList.html?id=${movieId}&type=${mediaType}&title=${encodeURIComponent(title)}`;
}

const newReviewForm = document.createElement('div');
newReviewForm.innerHTML = `
  <div class="review-item">
    <div class="review-column">
      <div class="review-card">
        <p class="new-review">New Review
          <button type="button" onclick="saveReview('new-review-input', 'new-user-input', '', 'new-rating-input')">Save</button>
        </p>
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

loadMoreBtn.addEventListener('click', loadMoreMovieReviews);

returnReviews(API_LINKS.REVIEWS);

function returnReviews(url) {
  fetch(url + "media/" + movieId).then(res => res.json()).then(function(reviewsData) {
    allMovieReviews = reviewsData;
    updateReviewsTitle(reviewsData);
    
    displayMovieReviews(reviewsData.slice(0, 8));
    
    if (reviewsData.length > 8) {
      loadMoreBtn.style.display = 'block';
    }
  }).catch(error => {
    console.error('Error fetching reviews:', error);
    showErrorMessage('Failed to load reviews. Please check your connection.');
  });
}

function loadMoreMovieReviews() {
  const reviewsPerPage = 8;
  const currentDisplayed = reviewsContainer.querySelectorAll('.review-item').length - 1;
  const nextBatch = allMovieReviews.slice(currentDisplayed, currentDisplayed + reviewsPerPage);
  
  if (nextBatch.length === 0) {
    loadMoreBtn.style.display = 'none';
    return;
  }
  
  displayMovieReviews(nextBatch, true);
  
  if (currentDisplayed + nextBatch.length >= allMovieReviews.length) {
    loadMoreBtn.style.display = 'none';
  }
}

function displayMovieReviews(reviewsData, append = false) {
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
    
    reviewCard.innerHTML = `
      <div class="review-item">
        <div class="review-column">
          <div class="review-card" id="${reviewData._id}">
            <p class="user-review">${reviewData.user}</p>
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
    
    reviewsContainer.appendChild(reviewCard);
  });
}

function updateReviewsTitle(reviewsData) {
  const reviewsTitleElement = document.querySelector('.reviews-title');
  const reviewsLeftElement = document.querySelector('.reviews-left');
  if (!reviewsTitleElement || !reviewsLeftElement) return;
  
  reviewsTitleElement.textContent = 'REVIEWS';
  
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
  
  const reviewInputId = "review-edit-" + reviewId;
  const userInputId = "user-edit-" + reviewId;
  const ratingInputId = "rating-edit-" + reviewId;
  
  let ratingOptions = '';
  for (let i = 0; i <= 10; i++) {
    const selected = i == originalRating ? 'selected' : '';
    ratingOptions += `<option value="${i}" ${selected}>${i}</option>`;
  }
  
  reviewElement.innerHTML = `
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
      <button type="button" onclick="saveReview('${reviewInputId}', '${userInputId}', '${reviewId}', '${ratingInputId}')">Save</button>
      <button type="button" onclick="location.reload()">Cancel</button>
    </div>
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
      body: JSON.stringify({"user": userName, "review": reviewText, "rating": rating, "mediaType": "movie"})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    })
    .catch(error => {
      console.error('Error saving review:', error);
      showErrorMessage('Failed to save review. Please try again.');
    });
  } else {
      fetch(API_LINKS.REVIEWS + "new", {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": userName, "review": reviewText, "movieId": movieId, "rating": rating, "mediaType": "movie"})
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
  const mediaContainer = document.querySelector('.current-movie-container');
  mediaContainer.parentNode.insertBefore(errorDiv, mediaContainer.nextSibling);

  setTimeout(() => {
      if (errorDiv.parentNode) {
          errorDiv.remove();
      }
  }, 5000);
}