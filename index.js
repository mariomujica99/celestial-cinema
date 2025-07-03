const API_KEY = '22dd0fdacd20bf222b19ecd6396b194c';

const API_LINKS = {
  TRENDING_WEEK: `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`,
  TRENDING_DAY: `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`,
  POPULAR: `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&page=1`,
  NOW_PLAYING: `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&page=1`,
  UPCOMING: `https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}&page=1`,
  TOP_RATED: `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&page=1`,
  SEARCH: `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`,
  IMG_PATH: `https://image.tmdb.org/t/p/w1280`
};

const moviesGridContainer = document.getElementById("movies-grid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const trendingTodayButton = document.querySelector(".trending-today-button");
const popularButton = document.querySelector(".popular-button");
const nowPlayingButton = document.querySelector(".now-playing-button");
const upcomingButton = document.querySelector(".upcoming-button");
const topRatedButton = document.querySelector(".top-rated-button");

const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get("search");

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
    
    returnMovies(API_LINKS.SEARCH + searchTerm);
    searchInput.value = "";
  }
});

if (searchParam) {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'none';
  searchInput.value = searchParam;
  returnMovies(API_LINKS.SEARCH + searchParam);
} else {
  returnMovies(API_LINKS.TRENDING_WEEK);
}

function returnMovies(url) {
  moviesGridContainer.innerHTML = '';
  
  fetch(url).then(res => res.json()).then(function(data) {
    console.log(data.results);
    data.results.forEach(movieData => {
      const movieItemWrapper = document.createElement('div');
      movieItemWrapper.setAttribute('class', 'movie-item');

      const movieColumnWrapper = document.createElement('div');
      movieColumnWrapper.setAttribute('class', 'movie-column');

      const movieCard = document.createElement('div');
      movieCard.setAttribute('class', 'movie-card');

      const movieThumbnail = document.createElement('img');
      movieThumbnail.setAttribute('class', 'movie-thumbnail');
      movieThumbnail.setAttribute('id', 'image');

      if (movieData.poster_path) {
        movieThumbnail.src = API_LINKS.IMG_PATH + movieData.poster_path;
        movieThumbnail.onerror = function() {
          this.src = '/images/no-image.jpg';
        };
      } else {
        movieThumbnail.src = '/images/no-image.jpg';
      }    

      const movieTitle = document.createElement('p');
      movieTitle.setAttribute('id', 'movie-title');
      movieTitle.innerHTML = `${movieData.title}`;

      movieCard.appendChild(movieThumbnail);
      movieCard.appendChild(movieTitle);
      
      const reviewsLink = document.createElement('a');
      reviewsLink.href = `movie reviews/movieReviews.html?id=${movieData.id}&title=${encodeURIComponent(movieData.title)}`;
      reviewsLink.style.textDecoration = "none";
      reviewsLink.style.color = "inherit";
      
      reviewsLink.appendChild(movieCard);
      movieColumnWrapper.appendChild(reviewsLink);
      movieItemWrapper.appendChild(movieColumnWrapper);
      moviesGridContainer.appendChild(movieItemWrapper);
    });
  }).catch(error => {
    console.error('Error fetching movies:', error);
    showErrorMessage('Failed to load movies. Please try again later.');
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
  returnMovies(API_LINKS.TRENDING_DAY);
});

popularButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(popularButton);
  returnMovies(API_LINKS.POPULAR);
});

nowPlayingButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(nowPlayingButton);
  returnMovies(API_LINKS.NOW_PLAYING);
});

upcomingButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(upcomingButton);
  returnMovies(API_LINKS.UPCOMING);
});

topRatedButton.addEventListener("click", () => {
  const filtersSection = document.querySelector('.filters');
  filtersSection.style.display = 'block';
  setActiveButton(topRatedButton);
  returnMovies(API_LINKS.TOP_RATED);
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
  
  const mediaContainer = document.querySelector('.current-movie-container');
  mediaContainer.parentNode.insertBefore(errorDiv, mediaContainer.nextSibling);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}