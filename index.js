const API_LINKS = {
  TRENDING_WEEK: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/week',
  TRENDING_DAY: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/day',
  POPULAR: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/popular',
  NOW_PLAYING: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/now-playing',
  UPCOMING: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/upcoming',
  TOP_RATED: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/top-rated',
  POPULAR_TV: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/popular',
  SEARCH_MULTI: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/search?query=',
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const mediaGridContainer = document.getElementById("media-grid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const trendingTodayButton = document.querySelector(".trending-today-button");
const popularButton = document.querySelector(".popular-button");
const nowPlayingButton = document.querySelector(".now-playing-button");
const upcomingButton = document.querySelector(".upcoming-button");
const topRatedButton = document.querySelector(".top-rated-button");
const showsButton = document.querySelector(".shows-button");
const reviewsButton = document.querySelector(".reviews-button");

const filtersNav = document.getElementById('filters-nav');
const scrollArrowLeft = document.getElementById('scroll-arrow-left');
const scrollArrowRight = document.getElementById('scroll-arrow-right');

const loadMoreBtn = document.getElementById("load-more-btn");
const loadMoreContainer = document.getElementById("load-more-container");

loadMoreBtn.addEventListener("click", loadMoreMedia);

const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get("search");
const filterParam = urlParams.get("filter");

let currentContentType = 'movie';
let currentPage = 1;
let hasMoreMedia = true;
let isLoadingMedia = false;
let currentSearchTerm = '';
let currentApiUrl = '';

function setActiveButton(activeButton) {
  const filterButtons = document.querySelectorAll('.filters button');
  filterButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  activeButton.classList.add('active');
}

function ensureFiltersVisible() {
  const filtersSection = document.querySelector('.filters');
  if (filtersSection.style.display === 'none') {
    filtersSection.style.display = 'flex';
  }
}

function hideFiltersForSearch() {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'none';
  
  const filterButtons = document.querySelectorAll('.filters button');
  filterButtons.forEach(button => {
    button.classList.remove('active');
  });
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    hideFiltersForSearch();
    currentSearchTerm = searchTerm;
    returnMedia(API_LINKS.SEARCH_MULTI + searchTerm, 'multi');
    searchInput.value = "";
  }
});

if (searchParam) {
  hideFiltersForSearch();
  searchInput.value = searchParam;
  returnMedia(API_LINKS.SEARCH_MULTI + searchParam, 'multi');
} else if (filterParam) {
  ensureFiltersVisible();
  
  switch (filterParam) {
    case 'trending':
      setActiveButton(trendingTodayButton);
      returnMedia(API_LINKS.TRENDING_DAY, 'movie');
      break;
    case 'popular':
      setActiveButton(popularButton);
      returnMedia(API_LINKS.POPULAR, 'movie');
      break;
    case 'now-playing':
      setActiveButton(nowPlayingButton);
      returnMedia(API_LINKS.NOW_PLAYING, 'movie');
      break;
    case 'upcoming':
      setActiveButton(upcomingButton);
      returnMedia(API_LINKS.UPCOMING, 'movie');
      break;
    case 'top-rated':
      setActiveButton(topRatedButton);
      returnMedia(API_LINKS.TOP_RATED, 'movie');
      break;
    case 'shows':
      setActiveButton(showsButton);
      returnMedia(API_LINKS.POPULAR_TV, 'tv');
      break;
    default:
      returnMedia(API_LINKS.TRENDING_WEEK, 'movie');
  }
} else {
  ensureFiltersVisible();
  returnMedia(API_LINKS.TRENDING_WEEK, 'movie');
}

function returnMedia(url, contentType = 'movie', append = false) {
  if (!append) {
    mediaGridContainer.innerHTML = '';
    currentPage = 1;
    hasMoreMedia = true;
    currentApiUrl = url;
  }
  
  currentContentType = contentType;
  isLoadingMedia = true;
  
  if (append) {
    loadMoreBtn.textContent = 'Loading';
    loadMoreBtn.disabled = true;
  }
  
  const pageUrl = url.includes('?') ? `${url}&page=${currentPage}` : `${url}?page=${currentPage}`;
  
  fetch(pageUrl).then(res => res.json()).then(function(data) {
    if (!data.results || data.results.length === 0) {
      if (!append) {
        mediaGridContainer.innerHTML = '<div class="no-media">No media found matching your search</div>';
        loadMoreContainer.style.display = 'none';
      } else {
        hasMoreMedia = false;
        loadMoreContainer.style.display = 'none';
      }
      return;
    }
    
    const validResults = data.results.filter(itemData => {
      if (contentType === 'multi' && itemData.media_type === 'person') {
        return false;
      }
      return true;
    });
    
    if (validResults.length === 0) {
      if (!append) {
        mediaGridContainer.innerHTML = '<div class="no-media">No media found matching your search</div>';
        loadMoreContainer.style.display = 'none';
      } else {
        hasMoreMedia = false;
        loadMoreContainer.style.display = 'none';
      }
      return;
    }
    
    validResults.forEach(itemData => {
      const mediaItemWrapper = document.createElement('div');
      mediaItemWrapper.setAttribute('class', 'media-item');

      const mediaColumnWrapper = document.createElement('div');
      mediaColumnWrapper.setAttribute('class', 'media-column');

      const mediaCard = document.createElement('div');
      mediaCard.setAttribute('class', 'media-card');

      const mediaThumbnail = document.createElement('img');
      mediaThumbnail.setAttribute('class', 'media-thumbnail');
      mediaThumbnail.setAttribute('id', 'image');

      if (itemData.poster_path) {
        mediaThumbnail.src = API_LINKS.IMG_PATH + itemData.poster_path;
        mediaThumbnail.onerror = function() {
          this.src = 'images/no-image.jpg';
        };
      } else {
        mediaThumbnail.src = 'images/no-image.jpg';
      }    

      const mediaTitle = document.createElement('p');
      mediaTitle.setAttribute('id', 'media-title');
      const title = itemData.title || itemData.name;
      mediaTitle.innerHTML = `${title}`;

      mediaCard.appendChild(mediaThumbnail);
      mediaCard.appendChild(mediaTitle);

      const userScore = document.createElement('div');
      userScore.setAttribute('class', 'user-score-grid');
      const scoreValue = itemData.vote_average ? Math.round(itemData.vote_average * 10) : 0;
      userScore.innerHTML = `${scoreValue}%`;

      mediaCard.appendChild(mediaThumbnail);
      mediaCard.appendChild(mediaTitle);
      mediaCard.appendChild(userScore);
      
      const reviewsLink = document.createElement('a');
      
      let itemContentType = contentType;
      if (contentType === 'multi') {
        itemContentType = itemData.media_type;
      }
      
      if (itemContentType === 'tv') {
        reviewsLink.href = `tv reviews/tvReviews.html?id=${itemData.id}&title=${encodeURIComponent(title)}`;
      } else {
        reviewsLink.href = `movie reviews/movieReviews.html?id=${itemData.id}&title=${encodeURIComponent(title)}`;
      }
      reviewsLink.style.textDecoration = "none";
      reviewsLink.style.color = "inherit";
      
      reviewsLink.appendChild(mediaCard);
      mediaColumnWrapper.appendChild(reviewsLink);
      mediaItemWrapper.appendChild(mediaColumnWrapper);
      mediaGridContainer.appendChild(mediaItemWrapper);
    });
    
    hasMoreMedia = data.total_pages ? currentPage < data.total_pages : validResults.length >= 20;
    
    if (hasMoreMedia) {
      loadMoreContainer.style.display = 'flex';
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    } else {
      loadMoreContainer.style.display = 'none';
    }
    
    isLoadingMedia = false;
    
  }).catch(error => {
    console.error('Error fetching content:', error);
    if (!append) {
      mediaGridContainer.innerHTML = '<div class="error-message">Failed to load content. Please try again later.</div>';
    }
    loadMoreContainer.style.display = 'none';
    isLoadingMedia = false;
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.disabled = false;
  });
}

function storeScrollPosition() {
  const filtersNav = document.getElementById('filters-nav');
  if (filtersNav) {
    sessionStorage.setItem('filtersScrollPosition', filtersNav.scrollLeft);
  }
}

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

function loadMoreMedia() {
  if (isLoadingMedia || !hasMoreMedia) return;
  
  currentPage++;
  returnMedia(currentApiUrl, currentContentType, true);
}

trendingTodayButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(trendingTodayButton);
  loadMoreContainer.style.display = 'none';
  returnMedia(API_LINKS.TRENDING_DAY, 'movie');
});

popularButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(popularButton);
  loadMoreContainer.style.display = 'none';
  returnMedia(API_LINKS.POPULAR, 'movie');
});

nowPlayingButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(nowPlayingButton);
  loadMoreContainer.style.display = 'none';
  returnMedia(API_LINKS.NOW_PLAYING, 'movie');
});

upcomingButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(upcomingButton);
  loadMoreContainer.style.display = 'none';
  returnMedia(API_LINKS.UPCOMING, 'movie');
});

topRatedButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(topRatedButton);
  loadMoreContainer.style.display = 'none';
  returnMedia(API_LINKS.TOP_RATED, 'movie');
});

showsButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(showsButton);
  loadMoreContainer.style.display = 'none';
  returnMedia(API_LINKS.POPULAR_TV, 'tv');
});

reviewsButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(reviewsButton);
  loadMoreContainer.style.display = 'none';
  requestAnimationFrame(() => {
    window.location.href = `all reviews/allReviews.html`;
  });
});

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