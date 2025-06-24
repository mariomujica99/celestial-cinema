const url = new URL(location.href);
const movieId = url.searchParams.get("id")
const movieTitle = url.searchParams.get("title")

const REVIEWS_APILINK = 'http://localhost:8000/api/v1/reviews/';
const MOVIE_DETAILS_API = `https://api.themoviedb.org/3/movie/${movieId}?api_key=22dd0fdacd20bf222b19ecd6396b194c`;
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCHAPI = "https://api.themoviedb.org/3/search/movie?&api_key=22dd0fdacd20bf222b19ecd6396b194c&query=";

const review = document.getElementById("review");

const main = document.getElementById("section");

const title = document.getElementById("title");
title.innerText = movieTitle;

const image = document.getElementById("image")

returnMovieDetails(MOVIE_DETAILS_API);

  function returnMovieDetails(url) {
    fetch(url).then(res => res.json()).then(function(data) {
      console.log(data);
      image.src = IMG_PATH + data.poster_path;
      }).catch(error => {
        console.error('Error fetching movie image', error);
    });
  }

const div_new = document.createElement('div');
div_new.innerHTML = `
  <div class="row">
    <div class="column">
      <div class="card">
        New Review
        <p>Review: 
          <input type="text" id="new_review" value="">
        </p>
        <p>User: 
          <input type="text" id="new_user" value="">
        </p>
        <p><a href="#" onclick="saveReview('new_review', 'new_user')">Save</a></p>
      </div>
    </div>
  </div>
`;

main.appendChild(div_new);

const form = document.getElementById("form");
const search = document.getElementById("query");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchItem = search.value;

  if (searchItem) {
    window.location.href = `../index.html?search=${(searchItem)}`;
  }
})

returnReviews(REVIEWS_APILINK);

  function returnReviews(url) {
    fetch(url + "movie/" + movieId).then(res => res.json()).then(function(data) {
      console.log(data);
      data.forEach(review => {
        const div_card = document.createElement('div');
        div_card.innerHTML = `
          <div class="row">
            <div class="column">
              <div class="card" id="${review._id}">
                <p>Review: ${review.review}</p>
                <p>User: ${review.user}</p>
                <p><a href="#" onclick="editReview('${review._id}', '${review.review}', '${review.user}')">Edit</a> <a href="#" onclick="deleteReview('${review._id}')">Delete</a></p>
              </div>
            </div>
          </div>
        `;
        main.appendChild(div_card);
      });
    });
  }

function editReview(id, review, user) {
  console.log(review);
  const element = document.getElementById(id);
  console.log(element);
  const reviewInputId = "review" + id;
  const userInputId = "user" + id;

  element.innerHTML = `
    <p>Review: 
      <input type="text" id="${reviewInputId}" value="${review}">
    </p>
    <p>User: 
      <input type="text" id="${userInputId}" value="${user}">
    </p>
    <p><a href="#" onclick="saveReview('${reviewInputId}', '${userInputId}', '${id}')">Save</a></p>
  `;
}

function saveReview(reviewInputId, userInputId, id="") {
  const review = document.getElementById(reviewInputId).value;
  const user = document.getElementById(userInputId).value;

  if (id) {
    fetch(REVIEWS_APILINK + id, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": user, "review": review})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    });
  } else {
      fetch(REVIEWS_APILINK + "new", {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"user": user, "review": review, "movieId": movieId})
    }).then(res => res.json()).then(res => {
      console.log(res);
      location.reload();
    });
  }
}

function deleteReview(id) {
  fetch(REVIEWS_APILINK + id, {
    method: 'DELETE'
  }).then(res => res.json()).then(res => {
    console.log(res);
    location.reload();
  })
}