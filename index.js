const API_LINK = 'https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=22dd0fdacd20bf222b19ecd6396b194c&page=1';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCH_API = "https://api.themoviedb.org/3/search/movie?&api_key=22dd0fdacd20bf222b19ecd6396b194c&query=";

const moviesGridContainer = document.getElementById("movies-grid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get("search");

if (searchParam) {
  searchInput.value = searchParam;
  returnMovies(SEARCH_API + searchParam);
} else {
  returnMovies(API_LINK);
}

function returnMovies(url) {
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
        movieThumbnail.src = IMG_PATH + movieData.poster_path;
        movieThumbnail.onerror = function() {
          this.src = '../images/no-image.jpg';
        };
      } else {
        movieThumbnail.src = '../images/no-image.jpg';
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
  });
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  moviesGridContainer.innerHTML = '';

  const searchTerm = searchInput.value;

  if (searchTerm) {
    returnMovies(SEARCH_API + searchTerm);
    searchInput.value = "";
  }
});