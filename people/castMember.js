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
const castMemberContainer = document.querySelector('.cast-member-container');
const expandCollapseBtn = document.getElementById('expand-collapse-btn');
let savedMediaIds = new Set();

initSearchRedirect(
  document.getElementById("search-form"),
  document.getElementById("search-query")
);

initCompactToggle();

loadSavedMediaIds().then(ids => { savedMediaIds = ids; });

returnCastDetails(API_LINKS.CAST_DETAILS);

function renderCastMemberMeta(birthday, department, gender) {
  const existing = document.getElementById('cast-member-meta');
  if (existing) existing.remove();

  const formattedDate = birthday
    ? (() => {
        const [year, month, day] = birthday.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      })()
    : null;

  if (!formattedDate && !department) return;

  const metaEl = document.createElement('div');
  metaEl.id = 'cast-member-meta';
  metaEl.className = 'cast-member-meta';

  const departmentLabel = (() => {
    if ((department || '').toLowerCase() === 'acting') {
      if (gender === 1) return 'Actress';
      if (gender === 2) return 'Actor';
      return 'Actor/Actress';
    }
    return department || '';
  })();

  metaEl.innerHTML = `
    <span class="meta-department">${departmentLabel}</span>
    <span class="meta-born">
      ${formattedDate ? `<strong>Born</strong> ${formattedDate}` : ''}
    </span>
  `;

  castMemberNameElement.insertAdjacentElement('afterend', metaEl);
}

function initCompactToggle() {
  if (!expandCollapseBtn || !castMemberContainer) return;

  expandCollapseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isExpanded = castMemberContainer.classList.toggle('is-expanded');

    expandCollapseBtn.firstChild.textContent = isExpanded ? 'COLLAPSE ' : 'EXPAND ';

    // If collapsing, scroll to top
    if (!isExpanded) {
      // wait for layout to reflow before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        });
      });
    }
  });
}

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

      renderCastMemberMeta(castData.birthday, castData.known_for_department, castData.gender);

      biographyTextElement.innerHTML =
        castData.biography || 'No biography available';

      returnCastCredits(API_LINKS.CAST_CREDITS, castData.known_for_department || '', castData.gender ?? 0);
    })
    .catch(() => {
      castMemberNameElement.innerHTML = castName || 'Unknown Name';
      castMemberPhotoElement.src = '../images/no-image-cast.jpg';
      biographyTextElement.innerHTML = 'Biography unavailable.';
    });
}

// FETCH CREDITS
function returnCastCredits(url, knownForDepartment = '', gender = 0) {
  fetch(url)
    .then(res => res.json())
    .then(data => displayKnownFor(data, knownForDepartment, gender))
    .catch(() => {
      knownForContainer.innerHTML =
        '<div class="known-for-loading">Unavailable</div>';
    });
}

// CAREER DETECTION
function detectPrimaryCareer(castCredits, knownForDepartment = '') {
  if (knownForDepartment) {
    const dept = knownForDepartment.toLowerCase();
    if (dept === 'acting') return 'actor';
    if (dept === 'directing') return 'director';
  }

  let acting = 0;
  let self = 0;

  castCredits.forEach(c => {
    const char = (c.character || '').toLowerCase();
    if (char.includes('self') || char.includes('host')) self++;
    else acting++;
  });

  // Require self credits to be a clear majority (>75%) to classify as host
  const total = acting + self;
  return (total > 0 && self / total > 0.75) ? 'host' : 'actor';
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

/**
 * Builds and appends a single Known For / fallback card to the container.
 * Extracted from displayKnownFor so both the scored Known For path and
 * the simple fallback path can reuse identical card markup/behavior.
 *
 * @param {object} c - TMDB credit object (cast or crew)
 */
function buildKnownForCard(c) {
  const posterSrc = c.poster_path
    ? `${API_LINKS.IMG_PATH}${c.poster_path}`
    : '../images/no-image-season.jpg';

  const title = c.title || c.name || 'Unknown';
  const year = c.release_date
    ? new Date(c.release_date).getFullYear()
    : (c.first_air_date ? new Date(c.first_air_date).getFullYear() : '');

  const mediaType  = c.media_type === 'tv' ? 'tv' : 'movie';
  const typeLabel  = mediaType === 'tv' ? 'Show' : 'Movie';
  const mediaIdStr = String(c.id);

  const castCredit = (() => {
    if (c.character) return c.character;
    if (c.job)       return c.job;
    return '';
  })();

  const el = document.createElement('div');
  el.className = 'known-for-item';

  const posterWrapper = document.createElement('div');
  posterWrapper.className = 'watchlist-item-poster-wrapper';
  posterWrapper.style.cssText = 'position:relative;width:100%;';

  const posterImg = document.createElement('img');
  posterImg.className = 'known-for-poster';
  posterImg.src = posterSrc;
  posterImg.alt = escapeHtml(title);
  posterImg.onerror = function() { this.src = '../images/no-image-season.jpg'; };

  const watchlistBtn = document.createElement('button');
  watchlistBtn.className = 'watchlist-remove-btn';

  const updateBtn = (inList) => {
    watchlistBtn.innerHTML = `<img src="../images/${inList ? 'watchlist-saved' : 'watchlist-add'}.svg" class="watchlist-remove-icon" alt="${inList ? 'Remove from watchlist' : 'Add to watchlist'}">`;
    watchlistBtn.setAttribute('aria-label', inList ? 'Remove from watchlist' : 'Add to watchlist');
  };

  updateBtn(savedMediaIds.has(mediaIdStr));

  const watchlistItem = {
    id:          mediaIdStr,
    title,
    year:        year || '',
    mediaType,
    posterPath:  c.poster_path || '',
    voteAverage: c.vote_average ?? null
  };

  watchlistBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isInList = savedMediaIds.has(mediaIdStr);

    const doToggle = async (username) => {
      try {
        const itemToSave = isInList ? watchlistItem : await hydrateGridWatchlistItem(watchlistItem);
        const status = await toggleWatchlistAPI(username, itemToSave);
        const nowInList = status === 'added';
        if (nowInList) savedMediaIds.add(mediaIdStr);
        else savedMediaIds.delete(mediaIdStr);
        updateBtn(nowInList);
      } catch (err) {
        console.error('Watchlist toggle failed:', err);
        showErrorMessage('Failed to update watchlist. Please try again.');
      }
    };

    if (isInList) {
      const cachedName = localStorage.getItem('ccLastName');
      if (cachedName) {
        doToggle(cachedName);
      } else {
        showNameModal({ title: 'Remove from Watchlist', confirmText: 'Remove', onConfirm: doToggle });
      }
    } else {
      showNameModal({ title: 'Save to Watchlist', confirmText: 'Save', onConfirm: doToggle });
    }
  });

  posterWrapper.appendChild(posterImg);
  posterWrapper.appendChild(watchlistBtn);
  el.appendChild(posterWrapper);

  const detailsDiv = document.createElement('div');
  detailsDiv.innerHTML = `
    <div class="known-for-title-text">${escapeHtml(title)}</div>
    <div class="cast-credit">${escapeHtml(castCredit)}</div>
    <div class="known-for-info">${year ? year + ' \u2022 ' : ''}${typeLabel}</div>
    <div class="user-score-grid">${formatScore(c.vote_average)}</div>
  `;
  el.appendChild(detailsDiv);

  el.addEventListener('click', () => {
    window.location.href = mediaType === 'tv'
      ? `../tv reviews/tvReviews.html?id=${c.id}&title=${encodeURIComponent(title)}`
      : `../movie reviews/movieReviews.html?id=${c.id}&title=${encodeURIComponent(title)}`;
  });

  knownForContainer.appendChild(el);
}

/**
 * Fallback/top-up source when the scored Known For algorithm returns
 * fewer than 10 results. Simple popularity sort, cast + any crew job,
 * deduped by id, excludes ids already present in the scored results.
 *
 * @param {Array} cast
 * @param {Array} crew
 * @param {Set} excludeIds - ids already in the scored 'top' list
 * @param {number} needed - how many more items to fetch
 * @returns {Array}
 */
function getFallbackKnownFor(cast, crew, excludeIds, needed) {
  const map = new Map();
  [...cast, ...crew].forEach(c => {
    if (!map.has(c.id) && !excludeIds.has(c.id)) map.set(c.id, c);
  });

  return Array.from(map.values())
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, needed);
}

// MAIN KNOWN FOR LOGIC
function displayKnownFor(data, knownForDepartment = '', gender = 0) {
  if (!knownForContainer) return;

  const cast = data.cast || [];
  const crew = data.crew || [];

  const careerType = detectPrimaryCareer(cast, knownForDepartment);

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

  let top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (top.length < 10) {
    const existingIds = new Set(top.map(c => c.id));
    const fallbackItems = getFallbackKnownFor(cast, crew, existingIds, 10 - top.length);
    top = [...top, ...fallbackItems];
  }

  const knownForHeader = knownForSection.querySelector('.credits-line');
  if (!knownForHeader) {
    const titleEl = knownForSection.querySelector('.known-for-title');
    if (titleEl) {
      const creditsLine = document.createElement('div');
      creditsLine.className = 'credits-line';

      const titleSpan = document.createElement('p');
      titleSpan.className = 'known-for-title';
      titleSpan.textContent = top.length > 0 ? 'Known For' : '';

      const filmographyBtn = document.createElement('button');
      filmographyBtn.className = 'filmography-btn';
      filmographyBtn.textContent = 'Filmography';

      creditsLine.appendChild(titleSpan);
      creditsLine.appendChild(filmographyBtn);
      titleEl.replaceWith(creditsLine);

      filmographyBtn.addEventListener('click', () => {
        window.location.href =
          `castFilmography.html?id=${castId}&name=${encodeURIComponent(castName || '')}&gender=${gender ?? 0}&department=${encodeURIComponent(knownForDepartment || '')}`;
      });
    }
  }

  knownForContainer.innerHTML = '';

  top.forEach(c => buildKnownForCard(c));
}