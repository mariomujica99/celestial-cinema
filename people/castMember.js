const url = new URL(location.href);
const castId = url.searchParams.get("id");
const castName = url.searchParams.get("name");

const API_LINKS = {
  CAST_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/person/${castId}`,
  CAST_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/person/${castId}/credits`,
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const castMemberPhotoElement = document.getElementById("cast-member-photo");
const castMemberNameElement = document.getElementById("cast-member-name");
const biographyTextElement = document.getElementById("biography-text");
const knownForContainer = document.getElementById("known-for-container");
const knownForSection = document.querySelector(".known-for-section");

initSearchRedirect(
  document.getElementById("search-form"),
  document.getElementById("search-query")
);

returnCastDetails(API_LINKS.CAST_DETAILS);

// FETCH DETAILS
function returnCastDetails(url) {
  fetch(url)
    .then(res => res.json())
    .then(castData => {
      castMemberPhotoElement.src = castData.profile_path
        ? API_LINKS.IMG_PATH + castData.profile_path
        : '../images/no-image-cast.jpg';

      castMemberPhotoElement.onload = () =>
        castMemberPhotoElement.classList.add('loaded');

      castMemberNameElement.innerHTML =
        castData.name || castName || 'Unknown Name';

      biographyTextElement.innerHTML =
        castData.biography || 'No biography available';

      returnCastCredits(API_LINKS.CAST_CREDITS);
    })
    .catch(() => {
      castMemberNameElement.innerHTML = castName || 'Unknown Name';
      castMemberPhotoElement.src = '../images/no-image-cast.jpg';
      biographyTextElement.innerHTML = 'Biography unavailable';
    });
}

// FETCH CREDITS
function returnCastCredits(url) {
  fetch(url)
    .then(res => res.json())
    .then(displayKnownFor)
    .catch(() => {
      knownForContainer.innerHTML =
        '<div class="known-for-loading">Unavailable</div>';
    });
}

// CAREER DETECTION
function detectPrimaryCareer(castCredits) {
  let acting = 0;
  let self = 0;

  castCredits.forEach(c => {
    const char = (c.character || '').toLowerCase();
    if (char.includes('self') || char.includes('host')) self++;
    else acting++;
  });

  return self > acting ? 'host' : 'actor';
}

// HOST OWNERSHIP CHECK
function isPrimaryShow(credit, personName) {
  const title = (credit.title || credit.name || '').toLowerCase();
  const char = (credit.character || '').toLowerCase();

  if (char.includes('host') || char.includes('presenter')) return true;
  if (personName && title.includes(personName.toLowerCase())) return true;
  if (credit.episode_count && credit.episode_count > 50) return true;

  return false;
}

// MAIN KNOWN FOR LOGIC
function displayKnownFor(data) {
  if (!knownForContainer) return;

  const cast = data.cast || [];
  const crew = data.crew || [];

  const careerType = detectPrimaryCareer(cast);

  const filteredCast = cast.filter(c => {
    const char = (c.character || '').toLowerCase();

    if (char.includes('uncredited')) return false;

    if (careerType === 'actor') {
      if (
        char.includes('self') ||
        char.includes('himself') ||
        char.includes('herself')
      ) return false;

      if (c.order !== undefined && c.order > 12) return false;
    }

    if (careerType === 'host') {
      if (!isPrimaryShow(c, castName)) return false;
    }

    return true;
  });

  const filteredCrew = crew.filter(c => c.job === 'Director');

  const map = new Map();
  [...filteredCast, ...filteredCrew].forEach(c => {
    if (!map.has(c.id)) map.set(c.id, c);
  });

  const uniqueCredits = Array.from(map.values());

  const scored = uniqueCredits.map(c => {
    const voteAverage = c.vote_average || 0;
    const voteCount = c.vote_count || 0;
    const popularity = c.popularity || 0;

    const actingWeight = c.character ? 20 : 5;

    const roleWeight = c.order !== undefined
      ? Math.max(15 - c.order, 0) * 3
      : 5;

    if (c.media_type === 'tv' && c.episode_count < 5) {
      return { ...c, score: -Infinity };
    }

    let episodeWeight = 0;

    if (c.media_type === 'tv') {
      if (c.episode_count >= 20) episodeWeight = 50;
      else if (c.episode_count >= 10) episodeWeight = 30;
      else if (c.episode_count >= 5) episodeWeight = 10;
    }

    let cameoPenalty = 0;
    if (c.media_type === 'tv') {
      if (!c.episode_count || c.episode_count <= 2) {
        cameoPenalty = -25;
      }
    }

    let score =
      (voteAverage * 2) +
      (Math.log10(voteCount + 1) * 5) +
      (popularity * 0.2) +
      actingWeight +
      roleWeight +
      episodeWeight +
      cameoPenalty;

    if (careerType === 'host' && isPrimaryShow(c, castName)) {
      score += 50;
    }

    return { ...c, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!top.length) {
    if (knownForSection) {
      knownForSection.remove();
    }
    return;
  }

  knownForContainer.innerHTML = '';

  top.forEach(c => {
    const el = document.createElement('div');
    el.className = 'known-for-item';

    const poster = c.poster_path
      ? `${API_LINKS.IMG_PATH}${c.poster_path}`
      : '../images/no-image-season.jpg';

    const title = c.title || c.name || 'Unknown';
    const year = c.release_date
      ? new Date(c.release_date).getFullYear()
      : (c.first_air_date
        ? new Date(c.first_air_date).getFullYear()
        : '');

    const mediaType = c.media_type === 'tv' ? 'TV' : 'Movie';

    el.innerHTML = `
      <img class="known-for-poster" src="${poster}" alt="${title}">
      <div class="known-for-title-text">${title}</div>
      <div class="known-for-info">
        ${year ? year + ' • ' : ''}${mediaType}
      </div>
    `;

    el.addEventListener('click', () => {
      if (c.media_type === 'tv') {
        window.location.href =
          `../tv reviews/tvReviews.html?id=${c.id}&title=${encodeURIComponent(title)}`;
      } else {
        window.location.href =
          `../movie reviews/movieReviews.html?id=${c.id}&title=${encodeURIComponent(title)}`;
      }
    });

    knownForContainer.appendChild(el);
  });
}