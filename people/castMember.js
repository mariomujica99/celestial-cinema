const url = new URL(location.href);
const castId = url.searchParams.get("id");
const castName = url.searchParams.get("name");

const API_LINKS = {
    CAST_DETAILS: `http://localhost:8000/api/v1/movies/person/${castId}`,
    CAST_CREDITS: `http://localhost:8000/api/v1/movies/person/${castId}/credits`,
    IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
    BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const castMemberPhotoElement = document.getElementById("cast-member-photo");
const castMemberNameElement = document.getElementById("cast-member-name");
const biographyTextElement = document.getElementById("biography-text");
const knownForContainer = document.getElementById("known-for-container");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const searchTerm = searchInput.value.trim();

  if (searchTerm) {
    window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
  }
});

returnCastDetails(API_LINKS.CAST_DETAILS);

function returnCastDetails(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(castData) {      
      if (castData.profile_path) {
        castMemberPhotoElement.src = API_LINKS.IMG_PATH + castData.profile_path;
        castMemberPhotoElement.onload = function() {
          this.classList.add('loaded');
        };
        castMemberPhotoElement.onerror = function() {
          this.src = '../images/no-image-cast.jpg';
          this.classList.add('loaded');
        };
      } else {
        castMemberPhotoElement.src = '../images/no-image-cast.jpg';
        castMemberPhotoElement.onload = function() {
          this.classList.add('loaded');
        };
      }
      
      castMemberNameElement.innerHTML = castData.name || castName || 'Unknown Name';
      
      biographyTextElement.innerHTML = castData.biography || 'No biography available.';
      
      returnCastCredits(API_LINKS.CAST_CREDITS);
      
    })
    .catch(error => {
      console.error('Error fetching cast details:', error);
      castMemberNameElement.innerHTML = castName || 'Unknown Name';
      castMemberPhotoElement.src = '../images/no-image-cast.jpg';
      biographyTextElement.innerHTML = 'Biography unavailable.';
      showErrorMessage('Failed to load cast member details. Please try again later.');
    });
}

function returnCastCredits(url) {
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(function(creditsData) {
      displayKnownFor(creditsData);
    })
    .catch(error => {
      console.error('Error fetching cast credits:', error);
      knownForContainer.innerHTML = '<div class="known-for-loading">Known for information unavailable</div>';
    });
}

function displayKnownFor(creditsData) {
  if (!knownForContainer) return;
  
  const allCredits = [
    ...(creditsData.cast || []),
    ...(creditsData.crew || [])
  ];
  
  const uniqueCredits = allCredits.reduce((acc, credit) => {
    const existingCredit = acc.find(c => c.id === credit.id);
    if (!existingCredit) {
      acc.push(credit);
    }
    return acc;
  }, []);
  
  const topCredits = uniqueCredits
    .map(credit => {
      const voteAverage = credit.vote_average || 0;
      const voteCount = credit.vote_count || 0;
      const popularity = credit.popularity || 0;
      
      const relevanceScore = (voteAverage * Math.min(voteCount / 100, 10)) + (popularity / 100);
      
      return { ...credit, relevanceScore };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 15)
    .filter((credit, index) => {
      if (index < 5) return true;
      return credit.poster_path || credit.backdrop_path;
    })
    .slice(0, 10);
  
  if (topCredits.length === 0) {
    knownForContainer.innerHTML = '<div class="known-for-loading">No known for information available</div>';
    return;
  }
  
  knownForContainer.innerHTML = '';
  
  topCredits.forEach(credit => {
    const knownForItem = document.createElement('div');
    knownForItem.className = 'known-for-item';
    
    const posterUrl = credit.poster_path 
      ? `${API_LINKS.IMG_PATH}${credit.poster_path}`
      : '../images/no-image-season.jpg';
    
    const title = credit.title || credit.name || 'Unknown Title';
    const releaseYear = credit.release_date 
      ? new Date(credit.release_date).getFullYear() 
      : (credit.first_air_date ? new Date(credit.first_air_date).getFullYear() : '');
    
    const mediaType = credit.media_type === 'tv' ? 'TV' : 'Movie';
    
    knownForItem.innerHTML = `
      <img class="known-for-poster" src="${posterUrl}" alt="${title}" onerror="this.src='../images/no-image-season.jpg'">
      <div class="known-for-title-text">${title}</div>
      <div class="known-for-info">${releaseYear ? `${releaseYear} • ` : ''}${mediaType}</div>
    `;

    knownForItem.addEventListener('click', () => {
      if (credit.media_type === 'tv') {
        window.location.href = `../tv reviews/tvReviews.html?id=${credit.id}&title=${encodeURIComponent(title)}`;
      } else {
        window.location.href = `../movie reviews/movieReviews.html?id=${credit.id}&title=${encodeURIComponent(title)}`;
      }
    });
    
    knownForContainer.appendChild(knownForItem);
  });
}

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message-red';
  errorDiv.textContent = message;
  const castMemberContainer = document.querySelector('.cast-member-container');
  castMemberContainer.parentNode.insertBefore(errorDiv, castMemberContainer.nextSibling);

  setTimeout(() => {
      if (errorDiv.parentNode) {
          errorDiv.remove();
      }
  }, 5000);
}