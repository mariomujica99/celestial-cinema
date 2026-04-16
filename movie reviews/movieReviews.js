const url = new URL(location.href);
const movieId = url.searchParams.get("id")
const movieTitle = url.searchParams.get("title")

const API_LINKS = {
  REVIEWS: 'https://celestial-cinema-backend.onrender.com/api/v1/reviews/',
  MOVIE_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/details/${movieId}`,
  MOVIE_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/credits/${movieId}`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces',
  WATCH_PROVIDERS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/watch-providers/${movieId}`,
  MOVIE_VIDEOS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/videos/${movieId}`,
  SIMILAR_MOVIES: `https://celestial-cinema-backend.onrender.com/api/v1/movies/similar/${movieId}`
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
let movieBackdropPath = null;

initSearchRedirect(searchForm, searchInput);

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
      setBackdropBackground(
          document.querySelector('.current-movie-container'),
          movieData.backdrop_path,
          API_LINKS.BACKDROP_PATH,
          '../images/no-image-backdrop.jpg'
      );
      movieBackdropPath = movieData.backdrop_path || null;
      
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
      loadWatchProviders();
      loadVideoStrip(API_LINKS.MOVIE_VIDEOS, movieId, 'movie', movieData.title || '');
      loadSimilarSection(API_LINKS.SIMILAR_MOVIES, 'movie', API_LINKS.IMG_PATH);
      
    })
    .catch(error => {
      console.error('Error fetching movie details:', error);
      movieTitleElement.innerHTML = movieTitle || '';
      moviePosterElement.src = '../images/no-image.jpg';
      showErrorMessage('Failed to load | Please try again later', document.querySelector('.current-movie-container'));
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
  
  const userScore = formatScore(movieData.vote_average);
  
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
      ${runtime ? `<span class="runtime">${runtime}</span>` : ''}
    </div>
    
    ${genres ? `<div class="genres-line"><span class="genres">${genres}</span></div>` : ''}
    
    <div class="user-score-container">
      <span class="user-score-label">User Score</span>
      <span class="user-score">${userScore}</span>
    </div>

    <div class="watchlist-detail-section">
      <button class="watchlist-detail-btn" id="watchlist-detail-btn">
        <img src="../images/watchlist-add.svg" class="watchlist-detail-icon" alt="">
        Add to Watchlist
      </button>
    </div>

    <div class="overview-section">
      <p class="overview-text">${movieData.overview || 'No overview available'}</p>
    </div>
    
    <div class="credits-section" id="movie-credits-section">
      <div class="credits-loading"></div>
    </div>

    <button class="expand-collapse-btn" id="media-expand-btn">EXPAND <span class="toggle-chevron">▾</span></button>
    
    ${movieData.imdb_id ? `<div class="imdb-link-container">
      <a href="https://www.imdb.com/title/${movieData.imdb_id}/" target="_blank" class="imdb-link">
        VIEW ON IMDb
      </a>
    </div>` : ''}
  `;

  initWatchlistDetailBtn({
      id: String(movieId),
      title: movieData.title || '',
      year: movieData.release_date ? new Date(movieData.release_date).getFullYear() : '',
      mediaType: 'movie',
      posterPath: movieData.poster_path || ''
    });

  initMediaCompactToggle();
}

async function loadWatchProviders() {
  try {
    const res = await fetch(API_LINKS.WATCH_PROVIDERS);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    displayWatchProviders(data);
  } catch (error) {
    console.error('Error fetching watch providers:', error);
  }
}

function displayWatchProviders(data) {
  const section = document.getElementById('providers-section');
  if (!section) return;

  const LOGO_BASE = 'https://image.tmdb.org/t/p/original';

  const seenIds = new Set();
  const streamingProviders = [];
  [...(data.flatrate || []), ...(data.free || [])].forEach(p => {
    if (!seenIds.has(p.provider_id)) {
      seenIds.add(p.provider_id);
      streamingProviders.push(p);
    }
  });

  const rentBuyIds = new Set();
  const rentBuyProviders = [];
  [...(data.rent || []), ...(data.buy || [])].forEach(p => {
    if (!rentBuyIds.has(p.provider_id)) {
      rentBuyIds.add(p.provider_id);
      rentBuyProviders.push(p);
    }
  });

  if (streamingProviders.length === 0 && rentBuyProviders.length === 0) return;

  const buildStrip = (providers) =>
    providers.map(p => `
      <div class="provider-logo-wrap">
        <img class="provider-logo"
             src="${LOGO_BASE}${p.logo_path}"
             alt="${escapeHtml(p.provider_name)}"
             title="${escapeHtml(p.provider_name)}"
             onerror="this.parentElement.style.display='none'">
      </div>
    `).join('');

  const streamingGroup = streamingProviders.length > 0 ? `
    <div class="providers-group">
      <p class="providers-group-title">Streaming</p>
      <div class="providers-strip">${buildStrip(streamingProviders)}</div>
    </div>
  ` : '';

  const rentBuyGroup = rentBuyProviders.length > 0 ? `
    <div class="providers-group">
      <p class="providers-group-title">Rent / Buy</p>
      <div class="providers-strip">${buildStrip(rentBuyProviders)}</div>
    </div>
  ` : '';

  section.innerHTML = `
    <div class="providers-scroll">
      <div class="providers-inner">
        ${streamingGroup}${rentBuyGroup}
      </div>
    </div>
  `;

  section.style.display = 'block';
}

function initWatchlistDetailBtn(item) {
  const btn = document.getElementById('watchlist-detail-btn');
  if (!btn) return;

  const updateBtnState = (inList) => {
    btn.classList.toggle('in-watchlist', inList);
    btn.innerHTML = `<img src="../images/${inList ? 'watchlist-saved' : 'watchlist-add'}.svg" class="watchlist-detail-icon" alt=""> ${inList ? 'Added to Watchlist' : 'Add to Watchlist'}`;
  };

  const cachedName = localStorage.getItem('ccLastName');
  if (cachedName) {
    checkWatchlistAPI(cachedName, item.id)
      .then(data => updateBtnState(data.inWatchlist))
      .catch(() => updateBtnState(false));
  } else {
    updateBtnState(false);
  }

  btn.addEventListener('click', () => {
    const isInList = btn.classList.contains('in-watchlist');

    if (isInList) {
      const cachedName = localStorage.getItem('ccLastName');
      if (cachedName) {
        toggleWatchlistAPI(cachedName, item)
          .then(status => updateBtnState(status === 'added'))
          .catch(e => {
            console.error('Watchlist toggle failed:', e);
            showErrorMessage('Failed to update watchlist. Please try again.', document.querySelector('.current-movie-container'));
          });
      } else {
        showNameModal({
          title: 'Remove from Watchlist',
          confirmText: 'Remove',
          onConfirm: async (username) => {
            try {
              const status = await toggleWatchlistAPI(username, item);
              updateBtnState(status === 'added');
            } catch (e) {
              console.error('Watchlist toggle failed:', e);
              showErrorMessage('Failed to update watchlist. Please try again.', document.querySelector('.current-movie-container'));
            }
          }
        });
      }
    } else {
      showNameModal({
        title: 'Save to Watchlist',
        confirmText: 'Save',
        onConfirm: async (username) => {
          try {
            const status = await toggleWatchlistAPI(username, item);
            updateBtnState(status === 'added');
          } catch (e) {
            console.error('Watchlist toggle failed:', e);
            showErrorMessage('Failed to update watchlist. Please try again.', document.querySelector('.current-movie-container'));
          }
        }
      });
    }
  });
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

  displayTopCast(creditsData, movieId, API_LINKS.IMG_PATH);
}

loadMoreBtn.addEventListener('click', loadMoreMovieReviews);

document.getElementById('new-review-btn').addEventListener('click', () => {
  showReviewModal({
    title: document.getElementById('movie-title')?.textContent || movieTitle || '',
    mediaType: 'movie',
    posterSection: true,
    backdropPath: movieBackdropPath,
    backdropBaseUrl: API_LINKS.BACKDROP_PATH,
    fallbackImage: '../images/no-image-backdrop.jpg',
    onSave: async ({ user, rating, review }) => {
      const res = await fetch(API_LINKS.REVIEWS + 'new', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, review, rating, movieId: movieId, mediaType: 'movie' })
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      location.reload();
    }
  });
});

returnReviews(API_LINKS.REVIEWS);

function returnReviews(url) {
  fetch(url + "media/" + movieId).then(res => res.json()).then(function(reviewsData) {
    allMovieReviews = reviewsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    updateReviewsTitle(reviewsData);
    
    displayMovieReviews(reviewsData.slice(0, 8));
    
    if (reviewsData.length > 8) {
      loadMoreBtn.style.display = 'block';
    }
  }).catch(error => {
    console.error('Error fetching reviews:', error);
    showErrorMessage('Failed to load | Please try again later');
  });
}

function loadMoreMovieReviews() {
  const reviewsPerPage = 8;
  const currentDisplayed = reviewsContainer.querySelectorAll('.review-item').length;
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
    reviewsContainer.innerHTML = '';
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

function editReview(reviewId) {
  const reviewElement = document.getElementById(reviewId);
  if (!reviewElement) {
    console.error('Review element not found with ID:', reviewId);
    return;
  }

  showReviewModal({
    title: document.getElementById('movie-title')?.textContent || movieTitle || '',
    mediaType: 'movie',
    posterSection: true,
    backdropPath: movieBackdropPath,
    backdropBaseUrl: API_LINKS.BACKDROP_PATH,
    fallbackImage: '../images/no-image-backdrop.jpg',
    editData: {
      user:   reviewElement.getAttribute('data-original-user') || '',
      review: reviewElement.getAttribute('data-original-review') || '',
      rating: parseInt(reviewElement.getAttribute('data-original-rating') || '0')
    },
    onSave: async ({ user, rating, review }) => {
      const res = await fetch(API_LINKS.REVIEWS + reviewId, {
        method: 'PUT',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, review, rating, mediaType: 'movie' })
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      location.reload();
    }
  });
}

function saveReview(reviewInputId, userInputId, reviewId="", ratingInputId="") {
  const reviewText = document.getElementById(reviewInputId).value;
  const userName = document.getElementById(userInputId).value;
  const rating = ratingInputId ? parseInt(document.getElementById(ratingInputId).value) : 0;

  if (!userName || userName.length < 1) {
    showValidateMessage('Please enter your name', document.querySelector('.reviews-left'));
    return;
  }

  if (rating === null || isNaN(rating)) {
    showValidateMessage('Please select a rating', document.querySelector('.reviews-left'));
    return;
  }

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
      showErrorMessage('Failed to save review. Please try again.', document.querySelector('.current-movie-container'));
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
      showErrorMessage('Failed to save review. Please try again.', document.querySelector('.current-movie-container'));
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
      showErrorMessage('Failed to delete review. Please try again.', document.querySelector('.current-movie-container'));
  });
}