const url = new URL(location.href);
const movieId = url.searchParams.get("id")
const movieTitle = url.searchParams.get("title")

const REVIEWS_APILINK = 'http://localhost:8000/api/v1/reviews/';
const MOVIE_DETAILS_API = `https://api.themoviedb.org/3/movie/${movieId}?api_key=22dd0fdacd20bf222b19ecd6396b194c&append_to_response=release_dates`;
const MOVIE_CREDITS_API = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=22dd0fdacd20bf222b19ecd6396b194c`;
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCHAPI = "https://api.themoviedb.org/3/search/movie?&api_key=22dd0fdacd20bf222b19ecd6396b194c&query=";

const review = document.getElementById("review");
const main = document.getElementById("section");
const title = document.getElementById("title");
const image = document.getElementById("image")

const form = document.getElementById("form");
const search = document.getElementById("query");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchItem = search.value.trim();

  if (searchItem) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchItem)}`;
  }
});

returnMovieDetails(MOVIE_DETAILS_API);

function returnMovieDetails(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(data) {
      console.log(data);
      
      setBackdropBackground(data.backdrop_path);
      
      if (data.poster_path) {
        image.src = IMG_PATH + data.poster_path;
        image.onerror = function() {
          this.src = '../no-image.jpg';
        };
      } else {
        image.src = '../no-image.jpg';
      }
      
      const releaseYear = data.release_date ? new Date(data.release_date).getFullYear() : '';
      
      title.innerHTML = `${data.title || 'Unknown Title'} ${releaseYear ? `(${releaseYear})` : ''}`;
      
      createMovieDetailsSection(data);
      
      returnMovieCredits(MOVIE_CREDITS_API);
      
    })
    .catch(error => {
      console.error('Error fetching movie details:', error);
      title.innerHTML = movieTitle || 'MOVIE TITLE';
      image.src = '../no-image.jpg';
      showErrorMessage('Failed to load movie details. Please try again later.');
    });
}

function createMovieDetailsSection(movieData) {
  let movieInfoContainer = document.querySelector('.current-media-details');
  if (!movieInfoContainer) {
    console.error('Movie details container not found');
    return;
  }
  
  const releaseDate = movieData.release_date ? new Date(movieData.release_date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }) : '';
  
  const runtime = movieData.runtime ? `${Math.floor(movieData.runtime / 60)}h ${movieData.runtime % 60}m` : '';
  
  const genres = movieData.genres ? movieData.genres.map(genre => genre.name).join(', ') : '';
  
  const userScore = movieData.vote_average ? Math.round(movieData.vote_average * 10) : 0;
  
  let contentRating = '';
  if (movieData.release_dates && movieData.release_dates.results) {
    const usRelease = movieData.release_dates.results.find(release => release.iso_3166_1 === 'US');
    if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {

      const theatricalRelease = usRelease.release_dates.find(rd => rd.type === 3) || usRelease.release_dates[0];
      contentRating = theatricalRelease.certification || '';
    }
  }
  
  const releaseYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : '';
  
  movieInfoContainer.innerHTML = `
    <p class="title" id="title">${movieData.title || 'Unknown Title'} ${releaseYear ? `(${releaseYear})` : ''}</p>
    
    <div class="movie-info-line">
      ${contentRating ? `<span class="content-rating">${contentRating}</span>` : ''}
      ${releaseDate ? `<span class="release-date">${releaseDate} (US)</span>` : ''}
      ${genres ? `<span class="genres">${genres}</span>` : ''}
      ${runtime ? `<span class="runtime">${runtime}</span>` : ''}
    </div>
    
    <div class="user-score-container">
      <span class="user-score-label">User Score</span>
      <span class="user-score">${userScore}%</span>
    </div>
    
    <div class="overview-section">
      <p class="overview-title">Overview</p>
      <p class="overview-text">${movieData.overview || 'No overview available.'}</p>
    </div>
    
    <div class="credits-section" id="credits-section">
      <div class="credits-loading"></div>
    </div>
    
    ${movieData.imdb_id ? `<div class="imdb-link-container">
      <a href="https://www.imdb.com/title/${movieData.imdb_id}/" target="_blank" class="imdb-link">
        View on IMDB
      </a>
    </div>` : ''}
  `;
}

function setBackdropBackground(backdropPath) {
  const container = document.querySelector('.current-media-container');
  if (container && backdropPath) {
    const backdropUrl = `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${backdropPath}`;
    container.style.backgroundImage = `linear-gradient(rgba(19, 23, 32, 0.7), rgba(19, 23, 32, 0.8)), url('${backdropUrl}')`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    container.style.backgroundRepeat = 'no-repeat';
  } else {
    container.style.background = `linear-gradient(90deg, rgba(45, 27, 61, 0.7), rgba(45, 27, 61, 0.8))`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    container.style.backgroundRepeat = 'no-repeat';
  }
}

function returnMovieCredits(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(data) {
      console.log('Credits:', data);
      updateCreditsSection(data);
    })
    .catch(error => {
      console.error('Error fetching movie credits:', error);
      const creditsSection = document.getElementById('credits-section');
      if (creditsSection) {
        creditsSection.innerHTML = '<div class="credits-loading">Credits unavailable</div>';
      }
    });
}

function updateCreditsSection(creditsData) {
  const creditsSection = document.getElementById('credits-section');
  if (!creditsSection) return;
  
  const director = creditsData.crew.filter(person => person.job === 'Director');
  const screenplay = creditsData.crew.filter(person => person.job === 'Screenplay');
  const story = creditsData.crew.filter(person => person.job === 'Story');
  const characters = creditsData.crew.filter(person => person.job === 'Characters');
  
  let creditsHTML = '<div class="credits-grid">';
  
  creditsHTML += '<div class="credits-row">';
  
  if (screenplay.length > 0 || story.length > 0) {
    const screenplayNames = screenplay.map(p => p.name);
    const storyNames = story.map(p => p.name);
    const combinedNames = [...new Set([...screenplayNames, ...storyNames])];
    
    if (combinedNames[0]) {
      creditsHTML += '<div class="credits-person">';
      creditsHTML += `<div class="person-name">${combinedNames[0]}</div>`;
      
      const jobs = [];
      if (screenplay.some(p => p.name === combinedNames[0])) jobs.push('Screenplay');
      if (story.some(p => p.name === combinedNames[0])) jobs.push('Story');
      creditsHTML += `<div class="person-job">${jobs.join(', ')}</div>`;
      creditsHTML += '</div>';
    }
    
    if (combinedNames[1]) {
      creditsHTML += '<div class="credits-person">';
      creditsHTML += `<div class="person-name">${combinedNames[1]}</div>`;
      
      const jobs2 = [];
      if (screenplay.some(p => p.name === combinedNames[1])) jobs2.push('Screenplay');
      if (story.some(p => p.name === combinedNames[1])) jobs2.push('Story');
      creditsHTML += `<div class="person-job">${jobs2.join(', ')}</div>`;
      creditsHTML += '</div>';
    }
  }
  
  if (characters.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${characters[0].name}</div>`;
    creditsHTML += '<div class="person-job">Characters</div>';
    creditsHTML += '</div>';
  }
  
  creditsHTML += '</div>';
  
  creditsHTML += '<div class="credits-row">';
  
  if (director.length > 0) {
    director.forEach(dir => {
      creditsHTML += '<div class="credits-person">';
      creditsHTML += `<div class="person-name">${dir.name}</div>`;
      creditsHTML += '<div class="person-job">Director</div>';
      creditsHTML += '</div>';
    });
  }
  
  const additionalStory = story.filter(p => !screenplay.some(s => s.name === p.name));
  if (additionalStory.length > 0) {
    creditsHTML += '<div class="credits-person">';
    creditsHTML += `<div class="person-name">${additionalStory[0].name}</div>`;
    creditsHTML += '<div class="person-job">Story</div>';
    creditsHTML += '</div>';
  }
  
  creditsHTML += '</div>';
  creditsHTML += '</div>';
  
  creditsSection.innerHTML = creditsHTML;
}

const div_new = document.createElement('div');
div_new.innerHTML = `
  <div class="row-review">
    <div class="column-review">
      <div class="card-review">
        <p class="new-review">New Review</p>
        <p class="user-text">User 
          <input class="user-input" type="text" id="new_user" value="" placeholder="Enter your name">
        </p>
        <p class="review-text">Review 
          <textarea class="review-input" id="new_review" placeholder="Write your review"></textarea>
        </p>        
        <p><button type="button" onclick="saveReview('new_review', 'new_user')">Save</button></p>
      </div>
    </div>
  </div>
`;

main.appendChild(div_new);

returnReviews(REVIEWS_APILINK);

function returnReviews(url) {
  fetch(url + "movie/" + movieId).then(res => res.json()).then(function(data) {
    console.log(data);      
    data.forEach(review => {
      const div_card = document.createElement('div');
      
      const escapedReview = escapeHtml(review.review);
      const escapedUser = escapeHtml(review.user);
      
      div_card.innerHTML = `
        <div class="row-review">
          <div class="column-review">
            <div class="card-review" id="${review._id}">
              <p class="user-review">${review.user}</p>
              <p class="review-review">${review.review}</p>                
              <p>
                <button type="button" onclick="editReview('${review._id}')">Edit</button> 
                <button type="button" onclick="deleteReview('${review._id}')">Delete</button>
              </p>
            </div>
          </div>
        </div>
      `;
      
      const cardElement = div_card.querySelector('.card-review');
      cardElement.setAttribute('data-original-review', review.review);
      cardElement.setAttribute('data-original-user', review.user);
      
      main.appendChild(div_card);
    });
  }).catch(error => {
    console.error('Error fetching reviews:', error);
    showErrorMessage('Failed to load reviews. Please check your connection.');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function unescapeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function editReview(id) {
  console.log('Editing review:', id);
  const element = document.getElementById(id);
  
  if (!element) {
    console.error('Element not found with ID:', id);
    return;
  }
  
  const originalReview = element.getAttribute('data-original-review') || '';
  const originalUser = element.getAttribute('data-original-user') || '';
  
  const reviewInputId = "review" + id;
  const userInputId = "user" + id;
  
  element.innerHTML = `
    <p class="user-text">User 
      <input class="user-input" type="text" id="${userInputId}" value="${escapeHtml(originalUser)}">
    </p>
    <p class="review-text">Review 
      <textarea class="review-input" id="${reviewInputId}">${escapeHtml(originalReview)}</textarea>
    </p>
    <p>
      <button type="button" onclick="saveReview('${reviewInputId}', '${userInputId}', '${id}')">Save</button>
      <button type="button" onclick="location.reload()">Cancel</button>
    </p>
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
  
  const container = document.querySelector('.current-media-container');
  container.parentNode.insertBefore(errorDiv, container.nextSibling);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}