const url = new URL(location.href);
const movieId = url.searchParams.get("id")
const movieTitle = url.searchParams.get("title")

const REVIEWS_APILINK = 'http://localhost:8000/api/v1/reviews/';
const MOVIE_DETAILS_API = `https://api.themoviedb.org/3/movie/${movieId}?api_key=22dd0fdacd20bf222b19ecd6396b194c`;
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCHAPI = "https://api.themoviedb.org/3/search/movie?&api_key=22dd0fdacd20bf222b19ecd6396b194c&query=";