const APILINK = 'https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=22dd0fdacd20bf222b19ecd6396b194c&page=1';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCHAPI = "https://api.themoviedb.org/3/search/movie?&api_key=22dd0fdacd20bf222b19ecd6396b194c&query=";

const main = document.getElementById("section");
const form = document.getElementById("form");
const search = document.getElementById("query");


returnMovies(APILINK)
function returnMovies(url) {
  fetch(url).then(res => res.json())
  .then(funtion(data)) {
    console.log(data.results);
    data.results.forEach(element => {
      const div_card = document.createElement('div');
      const div_row = document.createElement('div');
      const div_column = document.createElement('div');
      const div_image = document.createElement('img');
      const div_title = document.createElement('h3');
    });
  });
}