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
const sortFilterInput = document.getElementById("sort-filter");

const filtersNav = document.getElementById('filters-nav');
const scrollArrowLeft = document.getElementById('scroll-arrow-left');
const scrollArrowRight = document.getElementById('scroll-arrow-right');

let currentPage = 1;
let hasMoreReviews = true;
let isLoading = false;
let allReviews = [];
let filteredReviews = [];
let mediaCache = {};

let currentFilters = {
  user: '',
  media: '',
  sort: 'date-newest'
};
let isFiltering = false;

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

userFilterInput.addEventListener("input", debounce(() => {
  currentFilters.user = userFilterInput.value.trim();
  applyFilters();
}, 300));

mediaFilterInput.addEventListener("input", debounce(() => {
  currentFilters.media = mediaFilterInput.value.trim();
  applyFilters();
}, 300));

sortFilterInput.addEventListener("change", () => {
  currentFilters.sort = sortFilterInput.value;
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
  const filterButtons = document.querySelectorAll('.filters button');
  filterButtons.forEach(button => {
    button.classList.remove('active');
  });
  activeButton.classList.add('active');
}

setActiveButton(reviewsButton);

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

upcomingButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=upcoming";
});

topRatedButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=top-rated";
});

showsButton.addEventListener("click", () => {
    storeScrollPosition();
    window.location.href = "../index.html?filter=shows";
});

reviewsButton.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(reviewsButton);
    requestAnimationFrame(() => {
        location.reload();
    });
});

function storeScrollPosition() {
  const filtersNav = document.getElementById('filters-nav');
  if (filtersNav) {
    sessionStorage.setItem('filtersScrollPosition', filtersNav.scrollLeft);
  }
}

loadInitialReviews();

function loadInitialReviews() {
  currentPage = 1;
  hasMoreReviews = true;
  isFiltering = false;
  currentFilters = {
    user: '',
    media: '',
    sort: 'date-newest'
  };
  reviewsContainer.innerHTML = '<div class="reviews-loading">Loading</div>';
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
  }
  
  const params = new URLSearchParams({
    page: currentPage,
    limit: 24,
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
      console.log('Filtered reviews data:', data);
      
      if (!append) {
        reviewsContainer.innerHTML = '';
        allReviews = [];
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
          if (currentFilters.sort === 'title-az' || currentFilters.sort === 'title-za') {
            await sortReviews(filteredData, currentFilters.sort);
          }
          
          allReviews = append ? [...allReviews, ...filteredData] : filteredData;
          await displayReviews(filteredData, append);
          
          const serverHasMore = data.hasMore === true;
          const currentDisplayCount = reviewsContainer.querySelectorAll('.review-item').length;
          
          if (currentFilters.media.trim()) {
            if (serverHasMore && currentDisplayCount >= 24) {
              loadMoreBtn.style.display = 'block';
              loadMoreBtn.textContent = 'Load More Reviews';
              hasMoreReviews = true;
            } else if (serverHasMore && currentDisplayCount < 24 && currentPage < 15) {
              currentPage++;
              isLoading = false;
              loadFilteredReviews(true);
              return;
            } else {
              loadMoreBtn.style.display = 'none';
              hasMoreReviews = false;
            }
          } else {
            if (serverHasMore && currentDisplayCount > 0) {
              loadMoreBtn.style.display = 'block';
              loadMoreBtn.textContent = 'Load More Reviews';
              hasMoreReviews = true;
            } else {
              loadMoreBtn.style.display = 'none';
              hasMoreReviews = false;
            }
          }
          
        } else {
          if (currentFilters.media.trim() && data.hasMore && currentPage < 15) {
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
        reviewsContainer.innerHTML = '<div class="error-message">Failed to load reviews. Please try again later.</div>';
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

function applyFilters() {
  const hasUserFilter = currentFilters.user.trim() !== '';
  const hasMediaFilter = currentFilters.media.trim() !== '';
  const hasSortFilter = currentFilters.sort !== 'date-newest';
  
  isFiltering = hasUserFilter || hasMediaFilter || hasSortFilter;
  
  currentPage = 1;
  hasMoreReviews = true;
  allReviews = [];
  mediaCache = {};
  
  reviewsContainer.innerHTML = '<div class="reviews-loading">Loading</div>';
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

async function sortReviews(reviews, sortBy) {
  switch (sortBy) {
    case 'date-newest':
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'date-oldest':
      reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'rating-highest':
      reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'rating-lowest':
      reviews.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      break;
    case 'title-az':
    case 'title-za':
      const mediaInfoPromises = reviews.map(async (review) => {
        const mediaId = review.mediaId || review.movieId;
        const mediaInfo = await getMediaInfo(mediaId, review.mediaType || 'movie');
        return { review, title: mediaInfo.title || '' };
      });
      
      const reviewsWithTitles = await Promise.all(mediaInfoPromises);
      
      reviewsWithTitles.sort((a, b) => {
        if (sortBy === 'title-az') {
          return a.title.localeCompare(b.title);
        } else {
          return b.title.localeCompare(a.title);
        }
      });
      
      for (let i = 0; i < reviews.length; i++) {
        reviews[i] = reviewsWithTitles[i].review;
      }
      break;
    default:
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

function getMediaTitleFromReview(review) {
  const reviewCard = document.querySelector(`[id="${review._id}"]`);
  if (reviewCard) {
    return reviewCard.getAttribute('data-media-title') || '';
  }
  return '';
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

function updateScrollArrows() {
  const scrollLeft = filtersNav.scrollLeft;
  const scrollWidth = filtersNav.scrollWidth;
  const clientWidth = filtersNav.clientWidth;
  
  if (scrollLeft > 0) {
    scrollArrowLeft.classList.add('visible');
  } else {
    scrollArrowLeft.classList.remove('visible');
  }
  
  if (scrollLeft < scrollWidth - clientWidth - 1) {
    scrollArrowRight.classList.add('visible');
  } else {
    scrollArrowRight.classList.remove('visible');
  }
}

filtersNav.addEventListener('scroll', updateScrollArrows);
window.addEventListener('resize', updateScrollArrows);

updateScrollArrows();

function restoreScrollPosition() {
  const savedPosition = sessionStorage.getItem('filtersScrollPosition');
  if (savedPosition !== null) {
    const filtersNav = document.getElementById('filters-nav');
    if (filtersNav) {
      requestAnimationFrame(() => {
        filtersNav.scrollLeft = parseInt(savedPosition);
        updateScrollArrows();
        sessionStorage.removeItem('filtersScrollPosition');
      });
    }
  }
}

window.addEventListener('load', restoreScrollPosition);

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