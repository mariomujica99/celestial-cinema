const API_KEY = '22dd0fdacd20bf222b19ecd6396b194c';

const API_LINKS = {
  TRENDING_WEEK: `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`,
  TRENDING_DAY: `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`,
  POPULAR: `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&page=1`,
  NOW_PLAYING: `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&page=1`,
  UPCOMING: `https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}&page=1`,
  TOP_RATED: `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&page=1`,
  POPULAR_TV: `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&page=1`,
  SEARCH_MULTI: `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=`,
  IMG_PATH: `https://image.tmdb.org/t/p/w1280`
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

const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get("search");

let currentContentType = 'movie';

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    const filtersSection = document.querySelector('.filters');
    filtersSection.style.display = 'none';
    
    const filterButtons = document.querySelectorAll('.filters button');
    filterButtons.forEach(button => {
      button.classList.remove('active');
    });
    
    returnMedia(API_LINKS.SEARCH_MULTI + searchTerm, 'multi');
    searchInput.value = "";
  }
});

if (searchParam) {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'none';
  searchInput.value = searchParam;
  returnMedia(API_LINKS.SEARCH_MULTI + searchParam, 'multi');
} else {
  returnMedia(API_LINKS.TRENDING_WEEK, 'movie');
}

function returnMedia(url, contentType = 'movie') {
  mediaGridContainer.innerHTML = '';
  currentContentType = contentType;
  
  fetch(url).then(res => res.json()).then(function(data) {
    console.log(data.results);
    data.results.forEach(itemData => {
      if (contentType === 'multi' && itemData.media_type === 'person') {
        return;
      }
      
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
          this.src = '/images/no-image.jpg';
        };
      } else {
        mediaThumbnail.src = '/images/no-image.jpg';
      }    

      const mediaTitle = document.createElement('p');
      mediaTitle.setAttribute('id', 'media-title');
      const title = itemData.title || itemData.name;
      mediaTitle.innerHTML = `${title}`;

      mediaCard.appendChild(mediaThumbnail);
      mediaCard.appendChild(mediaTitle);
      
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
  }).catch(error => {
    console.error('Error fetching content:', error);
    showErrorMessage('Failed to load content. Please try again later.');
  });
}

function setActiveButton(activeButton) {
  const filterButtons = document.querySelectorAll('.filters button');
  filterButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  activeButton.classList.add('active');
}

trendingTodayButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(trendingTodayButton);
  returnMedia(API_LINKS.TRENDING_DAY, 'movie');
});

popularButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(popularButton);
  returnMedia(API_LINKS.POPULAR, 'movie');
});

nowPlayingButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(nowPlayingButton);
  returnMedia(API_LINKS.NOW_PLAYING, 'movie');
});

upcomingButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(upcomingButton);
  returnMedia(API_LINKS.UPCOMING, 'movie');
});

topRatedButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(topRatedButton);
  returnMedia(API_LINKS.TOP_RATED, 'movie');
});

showsButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(showsButton);
  returnMedia(API_LINKS.POPULAR_TV, 'tv');
});

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
  
  const mediaContainer = document.getElementById('media-grid');
  mediaContainer.parentNode.insertBefore(errorDiv, mediaContainer);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}