const API_LINKS = {
  REVIEWS: 'https://celestial-cinema-backend.onrender.com/api/v1/reviews/',
  MOVIE_DETAILS: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/details/',
  TV_DETAILS: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/',
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const reviewsContainer = document.getElementById("reviews-container");
const loadMoreBtn = document.getElementById("load-more-btn");
const userFilterInput = document.getElementById("user-filter");
const mediaFilterInput = document.getElementById("media-filter");
const clearFiltersBtn = document.getElementById("clear-filters");
const searchFiltersBtn = document.getElementById("search-filters-btn");
const searchFiltersEl = document.getElementById("search-filters");
const searchFiltersToggleBtn = document.getElementById("search-filters-toggle");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");
const reviewCountSpan = document.getElementById("review-count");

const trendingTodayButton = document.querySelector(".trending-today-button");
const popularButton = document.querySelector(".popular-button");
const nowPlayingButton = document.querySelector(".now-playing-button");
const topRatedButton = document.querySelector(".top-rated-button");
const reviewsButton = document.querySelector(".reviews-button");
const watchlistButton = document.querySelector(".watchlist-button");
const reviewsActionButton = document.querySelector(".reviews-action-button");
const watchlistActionButton = document.querySelector(".watchlist-action-button");
const sortFilterInput = document.getElementById("sort-filter");
const filtersNav = document.getElementById('filters-nav');
const moviesToggleBtn = document.getElementById('toggle-movies');
const tvToggleBtn = document.getElementById('toggle-tv');

let currentPage = 1;
let hasMoreReviews = true;
let isLoading = false;
let allReviews = [];
let mediaCache = {};
let totalReviewCount = 0;
let filteredReviewCount = 0;

let remainingFilteredResults = [];

let currentFilters = {
  user: '',
  media: '',
  sort: 'date-newest'
};
let isFiltering = false;

initSearchRedirect(searchForm, searchInput);

userFilterInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});

mediaFilterInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSearch();
});

searchFiltersBtn.addEventListener("click", triggerSearch);

searchFiltersToggleBtn.addEventListener("click", () => {
  searchFiltersEl.classList.toggle("is-open");
});

sortFilterInput.addEventListener("change", () => {
  currentFilters.user = userFilterInput.value.trim();
  currentFilters.media = mediaFilterInput.value.trim();
  currentFilters.sort = sortFilterInput.value;
  clearReviewCount();
  applyFilters();
});

clearFiltersBtn.addEventListener("click", () => {
  userFilterInput.value = "";
  mediaFilterInput.value = "";
  sortFilterInput.value = "date-newest";
  currentFilters = {
    user: '',
    media: '',
    sort: 'date-newest'
  };
  isFiltering = false;
  
  requestAnimationFrame(() => {
    loadInitialReviews();
  });
});

loadMoreBtn.addEventListener("click", () => {
  if (isFiltering) {
    currentPage++;
    loadFilteredReviews(true);
  } else {
    loadMoreReviews();
  }
});

function setActiveButton(activeButton) {
  document.querySelectorAll('.filters button:not(.toggle-option), .action-row button').forEach(btn => {
    btn.classList.remove('active');
  });
  activeButton.classList.add('active');
}

function updateToggleUI() {
  const currentToggle = localStorage.getItem('ccMediaToggle') || 'movie';
  moviesToggleBtn.classList.toggle('active', currentToggle === 'movie');
  tvToggleBtn.classList.toggle('active', currentToggle === 'tv');
  document.documentElement.classList.toggle('media-toggle-movie', currentToggle === 'movie');
  document.documentElement.classList.toggle('media-toggle-tv', currentToggle === 'tv');
}

updateToggleUI();

moviesToggleBtn.addEventListener('click', () => {
  localStorage.setItem('ccMediaToggle', 'movie');
  window.location.href = '../index.html?filter=trending';
});

tvToggleBtn.addEventListener('click', () => {
  localStorage.setItem('ccMediaToggle', 'tv');
  window.location.href = '../index.html?filter=shows';
});

setActiveButton(reviewsButton);
reviewsActionButton.classList.add('active');

trendingTodayButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=trending";
});

popularButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=popular";
});

nowPlayingButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=now-playing";
});

topRatedButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=top-rated";
});

reviewsButton.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(reviewsButton);
    reviewsActionButton.classList.add('active');
    requestAnimationFrame(() => {
        location.reload();
    });
});

watchlistButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../watchlist/watchlist.html";
});

reviewsActionButton.addEventListener("click", () => {
  storeScrollPosition();
  requestAnimationFrame(() => {
    location.reload();
  });
});

watchlistActionButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "../watchlist/watchlist.html";
});

function storeScrollPosition() {
  const filtersNav = document.getElementById('filters-nav');
  if (filtersNav) {
    sessionStorage.setItem('filtersScrollPosition', filtersNav.scrollLeft);
  }
}

loadInitialReviews();

function updateReviewCount(count) {
  reviewCountSpan.textContent = `| ${count}`;
}

function clearReviewCount() {
  reviewCountSpan.textContent = '';
}

function loadInitialReviews() {
  currentPage = 1;
  hasMoreReviews = true;
  isFiltering = false;
  currentFilters = {
    user: '',
    media: '',
    sort: 'date-newest'
  };
  loadMoreBtn.style.display = 'none';
  
  requestAnimationFrame(() => {
    returnReviews(API_LINKS.REVIEWS + `?page=${currentPage}&limit=24`);
  });
}

function loadMoreReviews() {
  if (isLoading || !hasMoreReviews) return;
  currentPage++;
  isLoading = true;
  loadMoreBtn.textContent = '';
  loadMoreBtn.disabled = true;
  returnReviews(API_LINKS.REVIEWS + `?page=${currentPage}&limit=24`, true);
}

function loadFilteredReviews(append = false) {
  if (isLoading) return;
  
  isLoading = true;
  if (!append) {
    loadMoreBtn.textContent = 'Loading';
    loadMoreBtn.disabled = true;
    remainingFilteredResults = [];
  }
  
  if (currentFilters.media.trim() && append && remainingFilteredResults.length > 0) {
    const displayData = remainingFilteredResults.slice(0, 24);
    remainingFilteredResults = remainingFilteredResults.slice(24);
    
    displayReviews(displayData, true);
    
    if (remainingFilteredResults.length > 0) {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.textContent = 'Load More Reviews';
      hasMoreReviews = true;
    } else {
      loadMoreBtn.style.display = hasMoreReviews ? 'block' : 'none';
      loadMoreBtn.textContent = 'Load More Reviews';
    }
    
    isLoading = false;
    loadMoreBtn.disabled = false;
    return;
  }
  
  const params = new URLSearchParams({
    page: currentPage,
    limit: currentFilters.media.trim() ? 48 : 24,
    sort: currentFilters.sort
  });
  
  if (currentFilters.user) {
    params.append('user', currentFilters.user);
  }
  
  const url = `${API_LINKS.REVIEWS}?${params.toString()}`;
  
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(async function(data) {
      if (!append) {
        reviewsContainer.innerHTML = '';
        allReviews = [];
        remainingFilteredResults = [];
        filteredReviewCount = 0;
      }
      
      if (data.reviews && data.reviews.length > 0) {
        let filteredData = data.reviews;
        
        if (currentFilters.media.trim()) {
          const mediaFilterPromises = filteredData.map(async (review) => {
            const mediaId = review.mediaId || review.movieId;
            const mediaInfo = await getMediaInfo(mediaId, review.mediaType || 'movie');
            const matchesMedia = mediaInfo.title.toLowerCase().includes(currentFilters.media.toLowerCase());
            return matchesMedia ? review : null;
          });
          
          const resolvedFilters = await Promise.all(mediaFilterPromises);
          filteredData = resolvedFilters.filter(review => review !== null);
        }
        
        if (filteredData.length > 0) {
          let displayData;
          
          if (currentFilters.media.trim()) {
            if (!append) {
              displayData = filteredData.slice(0, 24);
              remainingFilteredResults = filteredData.slice(24);
              filteredReviewCount = filteredData.length;
            } else {
              remainingFilteredResults = [...remainingFilteredResults, ...filteredData];
              displayData = remainingFilteredResults.slice(0, 24);
              remainingFilteredResults = remainingFilteredResults.slice(24);
              filteredReviewCount += filteredData.length;
            }
          } else {
            displayData = filteredData;
            if (!append) {
              filteredReviewCount = data.totalCount || displayData.length;
            }
          }
          
          allReviews = append ? [...allReviews, ...displayData] : displayData;
          await displayReviews(displayData, append);
          
          const serverHasMore = data.hasMore === true;
          
          if (currentFilters.media.trim()) {
            if (remainingFilteredResults.length > 0) {
              loadMoreBtn.style.display = 'block';
              loadMoreBtn.textContent = 'Load More Reviews';
              hasMoreReviews = true;
            } else if (serverHasMore) {
              loadMoreBtn.style.display = 'block';
              loadMoreBtn.textContent = 'Load More Reviews';
              hasMoreReviews = true;
            } else {
              loadMoreBtn.style.display = 'none';
              hasMoreReviews = false;
            }
            
            const currentDisplayCount = reviewsContainer.querySelectorAll('.review-item').length;
            if (currentDisplayCount < 24 && serverHasMore && remainingFilteredResults.length === 0 && currentPage < 20) {
              currentPage++;
              isLoading = false;
              loadFilteredReviews(true);
              return;
            }
          } else {
            if (serverHasMore) {
              loadMoreBtn.style.display = 'block';
              loadMoreBtn.textContent = 'Load More Reviews';
              hasMoreReviews = true;
            } else {
              loadMoreBtn.style.display = 'none';
              hasMoreReviews = false;
            }
          }
          
        } else {
          if (currentFilters.media.trim() && data.hasMore && currentPage < 20) {
            currentPage++;
            isLoading = false;
            loadFilteredReviews(append);
            return;
          } else {
            if (!append) {
              reviewsContainer.innerHTML = '<div class="no-reviews">No reviews found matching your filters</div>';
            }
            hasMoreReviews = false;
            loadMoreBtn.style.display = 'none';
          }
        }
      } else {
        if (!append) {
          reviewsContainer.innerHTML = '<div class="no-reviews">No reviews found matching your filters</div>';
        }
        hasMoreReviews = false;
        loadMoreBtn.style.display = 'none';
      }

      isLoading = false;
      loadMoreBtn.textContent = 'Load More Reviews';
      loadMoreBtn.disabled = false;
    })
    .catch(error => {
      console.error('Error fetching filtered reviews:', error);
      if (!append) {
        reviewsContainer.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
      }
      isLoading = false;
      loadMoreBtn.textContent = 'Load More Reviews';
      loadMoreBtn.disabled = false;
    });
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
    if (!append) {
      allReviews = [];
      reviewsContainer.innerHTML = '';
      totalReviewCount = data.totalCount || 0;
      updateReviewCount(totalReviewCount);
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
      reviewsContainer.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
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
    
    const mediaId = reviewData.mediaId || reviewData.movieId;
    const mediaInfo = await getMediaInfo(mediaId, reviewData.mediaType || 'movie');
    
    const actualMediaType = mediaInfo.mediaType;
    
    const escapedReview = escapeHtml(reviewData.review);
    const escapedUser = escapeHtml(reviewData.user);
    const rating = reviewData.rating || 0;

    let seasonEpisodeDisplay = '';
    if (actualMediaType === 'tv' && reviewData.season) {
      if (reviewData.episode) {
        seasonEpisodeDisplay = `<div class="season-episode-info">Season ${reviewData.season} | Episode ${reviewData.episode}</div>`;
      } else {
        seasonEpisodeDisplay = `<div class="season-episode-info">Season ${reviewData.season} (Full Season)</div>`;
      }
    }
  
    reviewCard.innerHTML = `
      <div class="review-column">
        <div class="review-card" id="${reviewData._id}">
          <div class="review-header">
            <p class="user-review">${reviewData.user}</p>
            <div class="media-info" onclick="navigateToMediaDetails('${mediaId}', '${actualMediaType}')">
              <img class="media-thumbnail-small" src="${mediaInfo.posterUrl}" alt="${mediaInfo.title}" onerror="this.src='images/no-image.jpg'">
              <div class="media-details">
                <p class="media-title-small">${mediaInfo.title}</p>
                <p class="media-year">${mediaInfo.year}</p>
              </div>
            </div>
          </div>
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
    `;
    
    const cardElement = reviewCard.querySelector('.review-card');
    cardElement.setAttribute('data-original-review', reviewData.review);
    cardElement.setAttribute('data-original-user', reviewData.user);
    cardElement.setAttribute('data-original-rating', rating);
    cardElement.setAttribute('data-media-title', mediaInfo.title);
    cardElement.setAttribute('data-media-id', mediaId);
    cardElement.setAttribute('data-media-type', actualMediaType);
    reviewsContainer.appendChild(reviewCard);
  }
}

function navigateToMediaDetails(mediaId, mediaType) {
  const reviewCard = document.querySelector(`[data-media-id="${mediaId}"]`);
  const title = reviewCard ? reviewCard.getAttribute('data-media-title') : 'Unknown';
  
  if (mediaType === 'tv') {
    window.location.href = `../tv reviews/tvReviews.html?id=${mediaId}&title=${encodeURIComponent(title)}`;
  } else {
    window.location.href = `../movie reviews/movieReviews.html?id=${mediaId}&title=${encodeURIComponent(title)}`;
  }
}

async function getMediaInfo(mediaId, mediaType = 'movie') {
  const cacheKey = `${mediaType}_${mediaId}`;
  if (mediaCache[cacheKey]) {
      return mediaCache[cacheKey];
  }
  
  try {
      let data;
      let detectedMediaType = mediaType;
      
      let url;
      if (mediaType === 'tv') {
        url = `${API_LINKS.TV_DETAILS}${mediaId}`;
      } else {
        url = `${API_LINKS.MOVIE_DETAILS}${mediaId}`;
      }
      
      let response = await fetch(url);
      
      if (response.ok) {
        data = await response.json();
        detectedMediaType = mediaType;
      } else {
        if (mediaType === 'tv') {
          url = `${API_LINKS.MOVIE_DETAILS}${mediaId}`;
          response = await fetch(url);
          if (response.ok) {
            data = await response.json();
            detectedMediaType = 'movie';
          }
        } else {
          url = `${API_LINKS.TV_DETAILS}${mediaId}`;
          response = await fetch(url);
          if (response.ok) {
            data = await response.json();
            detectedMediaType = 'tv';
          }
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const mediaInfo = {
        title: data.title || data.name || '',
        year: data.release_date || data.first_air_date 
          ? new Date(data.release_date || data.first_air_date).getFullYear()
          : '',
        posterUrl: data.poster_path 
          ? `${API_LINKS.IMG_PATH}${data.poster_path}`
          : 'images/no-image.jpg',
        mediaType: detectedMediaType
      };
    
      mediaCache[cacheKey] = mediaInfo;
      
      return mediaInfo;

  } catch (error) {
    console.error('Error fetching media info:', error);
    const fallbackInfo = {
      title: '',
      year: '',
      posterUrl: 'images/no-image.jpg',
      mediaType: mediaType
    };
    mediaCache[cacheKey] = fallbackInfo;
    return fallbackInfo;
  }
}

function triggerSearch() {
  currentFilters.user = userFilterInput.value.trim();
  currentFilters.media = mediaFilterInput.value.trim();
  currentFilters.sort = sortFilterInput.value;
  clearReviewCount();
  applyFilters();
}

function applyFilters() {
  const hasUserFilter = currentFilters.user.trim() !== '';
  const hasMediaFilter = currentFilters.media.trim() !== '';
  const hasSortFilter = currentFilters.sort !== 'date-newest';
  
  isFiltering = hasUserFilter || hasMediaFilter || hasSortFilter;
  
  currentPage = 1;
  hasMoreReviews = true;
  allReviews = [];
  remainingFilteredResults = [];
  mediaCache = {};
  
  loadMoreBtn.style.display = 'none';
  
  if (!isFiltering) {
    requestAnimationFrame(() => {
      returnReviews(API_LINKS.REVIEWS + `?page=${currentPage}&limit=24`);
    });
  } else {
    requestAnimationFrame(() => {
      loadFilteredReviews();
    });
  }
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
  
  const ratingOptions = generateRatingOptions(originalRating);
  
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

  const editUserInput = document.getElementById(userInputId);
  editUserInput.readOnly = true;
  editUserInput.style.cursor = 'pointer';
  editUserInput.addEventListener('click', () => {
    showNameModal({
      title: 'Sign Your Review',
      confirmText: 'Confirm',
      onConfirm: (name) => { editUserInput.value = name; }
    });
  });
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

function restoreScrollPosition() {
  const savedPosition = sessionStorage.getItem('filtersScrollPosition');
  if (savedPosition !== null) {
    const filtersNav = document.getElementById('filters-nav');
    if (filtersNav) {
      requestAnimationFrame(() => {
        filtersNav.scrollLeft = parseInt(savedPosition);
        sessionStorage.removeItem('filtersScrollPosition');
      });
    }
  }
}
