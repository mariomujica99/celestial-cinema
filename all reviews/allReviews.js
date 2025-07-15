const API_LINKS = {
  REVIEWS: 'http://localhost:8000/api/v1/reviews/',
  MOVIE_DETAILS: 'http://localhost:8000/api/v1/movies/details/',
  TV_DETAILS: 'http://localhost:8000/api/v1/movies/tv/details/',
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const reviewsContainer = document.getElementById("reviews-container");
const loadMoreBtn = document.getElementById("load-more-btn");
const userFilterInput = document.getElementById("user-filter");
const mediaFilterInput = document.getElementById("media-filter");
const clearFiltersBtn = document.getElementById("clear-filters");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const trendingTodayButton = document.querySelector(".trending-today-button");
const popularButton = document.querySelector(".popular-button");
const nowPlayingButton = document.querySelector(".now-playing-button");
const upcomingButton = document.querySelector(".upcoming-button");
const topRatedButton = document.querySelector(".top-rated-button");
const showsButton = document.querySelector(".shows-button");
const reviewsButton = document.querySelector(".reviews-button");

let currentPage = 1;
let hasMoreReviews = true;
let isLoading = false;
let allReviews = [];
let filteredReviews = [];
let mediaCache = {};

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

userFilterInput.addEventListener("input", debounce(applyFilters, 300));
mediaFilterInput.addEventListener("input", debounce(applyFilters, 300));

clearFiltersBtn.addEventListener("click", () => {
  userFilterInput.value = "";
  mediaFilterInput.value = "";
  applyFilters();
});

loadMoreBtn.addEventListener("click", () => {
  if (isFiltering()) {
    loadMoreFilteredReviews();
  } else {
    loadMoreReviews();
  }
});

function setActiveButton(activeButton) {
  const filterButtons = document.querySelectorAll('.filters button');
  filterButtons.forEach(button => {
    button.classList.remove('active');
  });
  activeButton.classList.add('active');
}

setActiveButton(reviewsButton);

trendingTodayButton.addEventListener("click", () => {
    window.location.href = "../index.html?filter=trending";
});

popularButton.addEventListener("click", () => {
    window.location.href = "../index.html?filter=popular";
});

nowPlayingButton.addEventListener("click", () => {
    window.location.href = "../index.html?filter=now-playing";
});

upcomingButton.addEventListener("click", () => {
    window.location.href = "../index.html?filter=upcoming";
});

topRatedButton.addEventListener("click", () => {
    window.location.href = "../index.html?filter=top-rated";
});

showsButton.addEventListener("click", () => {
    window.location.href = "../index.html?filter=shows";
});

reviewsButton.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(reviewsButton);
    location.reload();
});

loadInitialReviews();

function loadInitialReviews() {
  currentPage = 1;
  hasMoreReviews = true;
  reviewsContainer.innerHTML = '<div class="reviews-loading"></div>';
  loadMoreBtn.style.display = 'none';
  returnReviews(API_LINKS.REVIEWS + `?page=${currentPage}&limit=24`);
}

function loadMoreReviews() {
  if (isLoading || !hasMoreReviews) return;
  currentPage++;
  isLoading = true;
  loadMoreBtn.textContent = '';
  loadMoreBtn.disabled = true;
  returnReviews(API_LINKS.REVIEWS + `?page=${currentPage}&limit=24`, true);
}

function loadMoreFilteredReviews() {
  const reviewsPerPage = 24;
  const currentDisplayed = reviewsContainer.querySelectorAll('.review-item').length;
  const nextBatch = filteredReviews.slice(currentDisplayed, currentDisplayed + reviewsPerPage);
  
  if (nextBatch.length === 0) {
    loadMoreBtn.style.display = 'none';
    return;
  }
  
  displayReviews(nextBatch, true);
  
  if (currentDisplayed + nextBatch.length >= filteredReviews.length) {
    loadMoreBtn.style.display = 'none';
  }
}

function returnReviews(url, append = false) {
  fetch(url)
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(function(data) {
    console.log('Reviews data:', data);
    
    if (!append) {
      allReviews = [];
      reviewsContainer.innerHTML = '';
    }
    
    if (data.reviews && data.reviews.length > 0) {
      allReviews = [...allReviews, ...data.reviews];
      displayReviews(data.reviews, append);
      
      hasMoreReviews = data.hasMore === true;
      
      if (hasMoreReviews) {
        loadMoreBtn.style.display = 'block';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    } else {
      if (!append) {
        reviewsContainer.innerHTML = '<div class="no-reviews">No reviews found</div>';
      }
      hasMoreReviews = false;
      loadMoreBtn.style.display = 'none';
    }

    isLoading = false;
    loadMoreBtn.textContent = 'Load More Reviews';
    loadMoreBtn.disabled = false;
  })
  .catch(error => {
    console.error('Error fetching reviews:', error);
    if (!append) {
      reviewsContainer.innerHTML = '<div class="error-message">Failed to load reviews. Please try again later.</div>';
    }
    isLoading = false;
    loadMoreBtn.textContent = 'Load More Reviews';
    loadMoreBtn.disabled = false;
  });
}

async function displayReviews(reviews, append = false) {
  if (!append) {
    reviewsContainer.innerHTML = '';
  }
  
  for (const reviewData of reviews) {
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-item';
    
    const mediaInfo = await getMediaInfo(reviewData.movieId, reviewData.mediaType || 'movie');
    
    const actualMediaType = mediaInfo.mediaType;
    
    const escapedReview = escapeHtml(reviewData.review);
    const escapedUser = escapeHtml(reviewData.user);
    const rating = reviewData.rating || 0;
    
    reviewCard.innerHTML = `
      <div class="review-column">
        <div class="review-card" id="${reviewData._id}">
          <div class="review-header">
            <p class="user-review">${reviewData.user}</p>
            <div class="media-info" onclick="navigateToMediaDetails('${reviewData.movieId}', '${actualMediaType}')">
              <img class="media-thumbnail-small" src="${mediaInfo.posterUrl}" alt="${mediaInfo.title}" onerror="this.src='images/no-image.jpg'">
              <div class="media-details">
                <p class="media-title-small">${mediaInfo.title}</p>
                <p class="media-year">${mediaInfo.year}</p>
              </div>
            </div>
          </div>
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
    `;
    
    const cardElement = reviewCard.querySelector('.review-card');
    cardElement.setAttribute('data-original-review', reviewData.review);
    cardElement.setAttribute('data-original-user', reviewData.user);
    cardElement.setAttribute('data-original-rating', rating);
    cardElement.setAttribute('data-media-title', mediaInfo.title);
    cardElement.setAttribute('data-movie-id', reviewData.movieId);
    cardElement.setAttribute('data-media-type', actualMediaType);
    reviewsContainer.appendChild(reviewCard);
  }
}

function navigateToMediaDetails(movieId, mediaType) {
  const reviewCard = document.querySelector(`[data-movie-id="${movieId}"]`);
  const title = reviewCard ? reviewCard.getAttribute('data-media-title') : 'Unknown';
  
  if (mediaType === 'tv') {
    window.location.href = `../tv reviews/tvReviews.html?id=${movieId}&title=${encodeURIComponent(title)}`;
  } else {
    window.location.href = `../movie reviews/movieReviews.html?id=${movieId}&title=${encodeURIComponent(title)}`;
  }
}

async function getMediaInfo(movieId, mediaType = 'movie') {
  const cacheKey = `${mediaType}_${movieId}`;
  if (mediaCache[cacheKey]) {
      return mediaCache[cacheKey];
  }
  
  try {
      let detectedMediaType = 'movie';
      let data;
      
      let url = `${API_LINKS.MOVIE_DETAILS}${movieId}`;
      let response = await fetch(url);
      
      if (response.ok) {
        data = await response.json();
        detectedMediaType = 'movie';
      } else {
        url = `${API_LINKS.TV_DETAILS}${movieId}`;
        response = await fetch(url);
        
        if (response.ok) {
          data = await response.json();
          detectedMediaType = 'tv';
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const mediaInfo = {
        title: data.title || data.name || 'Unknown Title',
        year: data.release_date || data.first_air_date 
          ? new Date(data.release_date || data.first_air_date).getFullYear()
          : '',
        posterUrl: data.poster_path 
          ? `${API_LINKS.IMG_PATH}${data.poster_path}`
          : 'images/no-image.jpg',
        mediaType: detectedMediaType
      };
      
      mediaCache[`movie_${movieId}`] = mediaInfo;
      mediaCache[`tv_${movieId}`] = mediaInfo;
      
      return mediaInfo;

  } catch (error) {
    console.error('Error fetching media info:', error);
    const fallbackInfo = {
      title: '',
      year: '',
      posterUrl: 'images/no-image.jpg',
      mediaType: 'movie'
    };
    mediaCache[cacheKey] = fallbackInfo;
    return fallbackInfo;
  }
}

function applyFilters() {
  const userFilter = userFilterInput.value.trim().toLowerCase();
  const mediaFilter = mediaFilterInput.value.trim().toLowerCase();
  
  if (!userFilter && !mediaFilter) {
    filteredReviews = [];
    displayReviews(allReviews);
    
    if (hasMoreReviews) {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.textContent = 'Load More Reviews';
    } else {
      loadMoreBtn.style.display = 'none';
    }
    return;
  }
  
  filteredReviews = allReviews.filter(review => {
    const matchesUser = !userFilter || review.user.toLowerCase().includes(userFilter);
    
    let matchesMedia = true;
    if (mediaFilter) {
      const reviewCard = document.querySelector(`[id="${review._id}"]`);
      if (reviewCard) {
        const mediaTitle = reviewCard.getAttribute('data-media-title') || '';
        matchesMedia = mediaTitle.toLowerCase().includes(mediaFilter);
      } else {
        matchesMedia = false;
      }
    }
    
    return matchesUser && matchesMedia;
  });
  
  const reviewsToShow = filteredReviews.slice(0, 24);
  displayReviews(reviewsToShow);
  
  if (filteredReviews.length > 24) {
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.textContent = 'Load More Reviews';
  } else {
    loadMoreBtn.style.display = 'none';
  }
  
  if (filteredReviews.length === 0) {
    reviewsContainer.innerHTML = '<div class="no-reviews">No reviews found matching your filters</div>';
  }
}

function isFiltering() {
  return userFilterInput.value.trim() || mediaFilterInput.value.trim();
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

function saveReview(reviewInputId, userInputId, reviewId, ratingInputId) {
  const reviewText = document.getElementById(reviewInputId).value;
  const userName = document.getElementById(userInputId).value;
  const rating = parseInt(document.getElementById(ratingInputId).value);

  fetch(API_LINKS.REVIEWS + reviewId, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({"user": userName, "review": reviewText, "rating": rating})
  })
  .then(res => res.json())
  .then(res => {
    console.log(res);
    location.reload();
  })
  .catch(error => {
    console.error('Error saving review:', error);
    showErrorMessage('Failed to save review. Please try again.');
  });
}

function deleteReview(reviewId) {
  fetch(API_LINKS.REVIEWS + reviewId, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(res => {
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
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}