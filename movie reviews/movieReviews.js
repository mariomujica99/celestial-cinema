const url = new URL(location.href);
const movieId = url.searchParams.get("id")
const movieTitle = url.searchParams.get("title")

const REVIEWS_API_LINK = 'http://localhost:8000/api/v1/reviews/';
const MOVIE_DETAILS_API = `https://api.themoviedb.org/3/movie/${movieId}?api_key=22dd0fdacd20bf222b19ecd6396b194c&append_to_response=release_dates`;
const MOVIE_CREDITS_API = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=22dd0fdacd20bf222b19ecd6396b194c`;
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCH_API = "https://api.themoviedb.org/3/search/movie?&api_key=22dd0fdacd20bf222b19ecd6396b194c&query=";

const reviewsContainer = document.getElementById("reviews-container");
const movieTitleElement = document.getElementById("movie-title");
const moviePosterElement = document.getElementById("movie-poster")

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

returnMovieDetails(MOVIE_DETAILS_API);

function returnMovieDetails(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(movieData) {
      console.log(movieData);
      
      setBackdropBackground(movieData.backdrop_path);
      
      if (movieData.poster_path) {
        moviePosterElement.src = IMG_PATH + movieData.poster_path;
        moviePosterElement.onerror = function() {
          this.src = '../images/no-image.jpg';
        };
      } else {
        moviePosterElement.src = '../images/no-image.jpg';
      }
      
      const releaseYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : '';
      
      movieTitleElement.innerHTML = `${movieData.title || 'Unknown Title'} ${releaseYear ? `(${releaseYear})` : ''}`;
      
      createMovieDetailsSection(movieData);
      
      returnMovieCredits(MOVIE_CREDITS_API);
      
    })
    .catch(error => {
      console.error('Error fetching movie details:', error);
      movieTitleElement.innerHTML = movieTitle || 'MOVIE TITLE';
      moviePosterElement.src = '../images/no-image.jpg';
      showErrorMessage('Failed to load movie details. Please try again later.');
    });
}

function createMovieDetailsSection(movieData) {
  let movieDetailsContainer = document.querySelector('.current-media-details');
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
    <p class="title" id="movie-title">${movieData.title || 'Unknown Title'} ${releaseYear ? `(${releaseYear})` : ''}</p>
    
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
  const mediaContainer = document.querySelector('.current-media-container');
  if (mediaContainer && backdropPath) {
    const backdropUrl = `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${backdropPath}`;
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

function returnMovieCredits(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(creditsData) {
      console.log('Credits:', creditsData);
      updateCreditsSection(creditsData);
    })
    .catch(error => {
      console.error('Error fetching movie credits:', error);
      const creditsSection = document.getElementById('movie-credits-section');
      if (creditsSection) {
        creditsSection.innerHTML = '<div class="credits-loading">Credits unavailable</div>';
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
}

const newReviewForm = document.createElement('div');
newReviewForm.innerHTML = `
  <div class="review-item">
    <div class="review-column">
      <div class="review-card">
        <p class="new-review">New Review</p>
        <p class="user-text">User 
          <input class="user-input" type="text" id="new-user-input" value="" placeholder="Enter your name">
        </p>
        <p class="review-text">Review 
          <textarea class="review-input" id="new-review-input" placeholder="Write your review"></textarea>
        </p>        
        <p><button type="button" onclick="saveReview('new-review-input', 'new-user-input')">Save</button></p>
      </div>
    </div>
  </div>
`;

reviewsContainer.appendChild(newReviewForm);

returnReviews(REVIEWS_API_LINK);

function returnReviews(url) {
  fetch(url + "movie/" + movieId).then(res => res.json()).then(function(reviewsData) {
    console.log(reviewsData);      
    reviewsData.forEach(reviewData => {
      const reviewCard = document.createElement('div');
      
      const escapedReview = escapeHtml(reviewData.review);
      const escapedUser = escapeHtml(reviewData.user);
      
      reviewCard.innerHTML = `
        <div class="review-item">
          <div class="review-column">
            <div class="review-card" id="${reviewData._id}">
              <p class="user-review">${reviewData.user}</p>
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

function unescapeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
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
  
  const reviewInputId = "review-edit-" + reviewId;
  const userInputId = "user-edit-" + reviewId;
  
  reviewElement.innerHTML = `
    <p class="user-text">User 
      <input class="user-input" type="text" id="${userInputId}" value="${escapeHtml(originalUser)}">
    </p>
    <p class="review-text">Review 
      <textarea class="review-input" id="${reviewInputId}">${escapeHtml(originalReview)}</textarea>
    </p>
    <p>
      <button type="button" onclick="saveReview('${reviewInputId}', '${userInputId}', '${reviewId}')">Save</button>
      <button type="button" onclick="location.reload()">Cancel</button>
    </p>
  `;
}

function saveReview(reviewInputId, userInputId, reviewId="") {
  const reviewText = document.getElementById(reviewInputId).value;
  const userName = document.getElementById(userInputId).value;

  if (reviewId) {
    fetch(REVIEWS_API_LINK + reviewId, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": userName, "review": reviewText})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    });
  } else {
      fetch(REVIEWS_API_LINK + "new", {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": userName, "review": reviewText, "movieId": movieId})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    });
  }
}

function deleteReview(reviewId) {
  fetch(REVIEWS_API_LINK + reviewId, {
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
  
  const mediaContainer = document.querySelector('.current-media-container');
  mediaContainer.parentNode.insertBefore(errorDiv, mediaContainer.nextSibling);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}