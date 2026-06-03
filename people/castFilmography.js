const url      = new URL(location.href);
const castId   = url.searchParams.get('id');
const castName = url.searchParams.get('name');
const gender   = parseInt(url.searchParams.get('gender') ?? '0');
const knownForDepartment = url.searchParams.get('department') || '';

const API_LINKS = {
  CAST_CREDITS:  `https://celestial-cinema-backend.onrender.com/api/v1/movies/person/${castId}/credits`,
  MOVIE_DETAILS: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/details/',
  TV_DETAILS:    'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/',
  WATCHLIST:     'https://celestial-cinema-backend.onrender.com/api/v1/watchlist',
  IMG_PATH:      'https://image.tmdb.org/t/p/w1280',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const filmographyContainer = document.getElementById('filmography-container');
const filmographyTitle     = document.getElementById('filmography-title');
const backButton           = document.getElementById('back-button');
const searchInput          = document.getElementById('filmography-search-input');
const searchForm           = document.getElementById('search-form');
const searchQuery          = document.getElementById('search-query');

// State
let isLoading         = false;
let allDepartments    = {};   // { departmentName: [credit, ...] }
let detailsCache      = {};   // keyed by "mediaType_id"
let savedMediaIds     = new Set();

// ── Init ─────────────────────────────────────────────────────────────────────

filmographyTitle.textContent = castName
  ? `${castName} — Filmography`
  : 'Filmography';

backButton.addEventListener('click', () => history.back());
initSearchRedirect(searchForm, searchQuery);

searchInput.addEventListener('input', debounce(() => {
  filterFilmography(searchInput.value.trim().toLowerCase());
}, 250));

loadSavedMediaIds().then(() => loadFilmography());

// ── Watchlist preload ─────────────────────────────────────────────────────────

async function loadSavedMediaIds() {
  try {
    const res = await fetch(API_LINKS.WATCHLIST);
    if (!res.ok) return;
    const data = await res.json();
    savedMediaIds = new Set(
      (data.items || []).map(item => String(item.mediaId))
    );
  } catch (e) {
    console.error('Failed to load saved media ids:', e);
  }
}

// ── Content rating helpers (copied from index.js) ─────────────────────────────

function getMovieContentRating(movieData) {
  const us = movieData.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
  if (!us?.release_dates?.length) return null;
  const theatrical = us.release_dates.find(r => r.type === 3 && r.certification);
  const firstRated = us.release_dates.find(r => r.certification);
  return theatrical?.certification || firstRated?.certification || null;
}

function getTVContentRating(tvData) {
  const us = tvData.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
  return us?.rating || null;
}

// ── Fetch details for a single credit ────────────────────────────────────────

async function fetchDetails(credit) {
  const cacheKey = `${credit.media_type}_${credit.id}`;
  if (detailsCache[cacheKey]) return detailsCache[cacheKey];

  try {
    const detailsUrl = credit.media_type === 'tv'
      ? `${API_LINKS.TV_DETAILS}${credit.id}`
      : `${API_LINKS.MOVIE_DETAILS}${credit.id}`;

    const res = await fetch(detailsUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const hydrated = {
      ...credit,
      runtime:       credit.media_type === 'movie' ? (data.runtime ?? null) : null,
      contentRating: credit.media_type === 'tv'
        ? getTVContentRating(data)
        : getMovieContentRating(data),
      voteAverage:   data.vote_average ?? credit.vote_average ?? null,
      backdropPath:  data.backdrop_path || null,
      posterPath:    data.poster_path   || credit.poster_path || null
    };

    detailsCache[cacheKey] = hydrated;
    return hydrated;
  } catch (e) {
    console.error(`fetchDetails failed for ${credit.media_type} ${credit.id}:`, e);
    detailsCache[cacheKey] = credit;
    return credit;
  }
}

// ── Chunk array into batches ──────────────────────────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Deduplication: prefer cast entry when both cast+crew exist for same title ─

function deduplicateCredits(castArr, crewArr) {
  const map = new Map();

  castArr.forEach(c => {
    const key = `${c.media_type}_${c.id}`;
    map.set(key, { ...c, _source: 'cast' });
  });

  crewArr.forEach(c => {
    const key = `${c.media_type}_${c.id}`;
    if (!map.has(key)) {
      map.set(key, { ...c, _source: 'crew' });
    } else {
      // Both cast and crew — keep cast entry but attach job info
      const existing = map.get(key);
      existing._crewJob = c.job || '';
      existing._crewDepartment = c.department || '';
    }
  });

  return Array.from(map.values());
}

// ── Department grouping ───────────────────────────────────────────────────────

function groupIntoDepartments(castArr, crewArr) {
  const departments = {};

  const addTo = (deptName, credit) => {
    if (!departments[deptName]) departments[deptName] = [];
    departments[deptName].push(credit);
  };

  // Cast → Acting department
  castArr.forEach(c => {
    if (c.character || c.department === 'Acting') {
      addTo('Acting', { ...c, _source: 'cast' });
    }
  });

  // Crew → group by department/job
  crewArr.forEach(c => {
    const job  = c.job  || '';
    const dept = c.department || '';

    if (dept === 'Directing' || job === 'Director') {
      addTo('Directing', { ...c, _source: 'crew' });
    } else if (dept === 'Writing' || ['Writer', 'Screenplay', 'Story'].includes(job)) {
      addTo('Writing', { ...c, _source: 'crew' });
    } else if (dept === 'Production') {
      addTo('Production', { ...c, _source: 'crew' });
    } else if (dept && dept !== 'Acting') {
      addTo(dept, { ...c, _source: 'crew' });
    }
  });

  return departments;
}

// Deduplicate credits within each department by media_type+id
// When duplicates exist, prefer the entry with the longest character/job string
function deduplicateDepartments(departments) {
  const result = {};
  Object.keys(departments).forEach(dept => {
    const seen = new Map();
    departments[dept].forEach(credit => {
      const key = `${credit.media_type}_${credit.id}`;
      if (!seen.has(key)) {
        seen.set(key, { ...credit, _roles: new Set() });
      }
      // For crew credits, prefer job over character
      const role = credit._source === 'crew'
        ? (credit.jobs?.map(j => j.job).join(', ') || credit.job || '').trim()
        : (credit.character || '').trim();
      if (role) seen.get(key)._roles.add(role);
    });

    result[dept] = Array.from(seen.values()).map(credit => {
      const { _roles, ...rest } = credit;
      return {
        ...rest,
        _mergedRole: _roles.size > 0 ? Array.from(_roles).join(' | ') : ''
      };
    });
  });
  return result;
}

// ── Sort departments: knownForDepartment first, then by size desc ─────────────

function sortedDepartmentNames(departments) {
  const names = Object.keys(departments);

  const knownDept = (() => {
    const d = (knownForDepartment || '').toLowerCase();
    if (d === 'acting')   return 'Acting';
    if (d === 'directing') return 'Directing';
    if (d === 'writing')   return 'Writing';
    if (d === 'production') return 'Production';
    // Try direct match
    return names.find(n => n.toLowerCase() === d) || null;
  })();

  const others = names
    .filter(n => n !== knownDept)
    .sort((a, b) => departments[b].length - departments[a].length);

  return knownDept && departments[knownDept]
    ? [knownDept, ...others]
    : others;
}

// ── Date sort helper: newest first, undated to bottom ────────────────────────

function sortByDateDesc(credits) {
  return [...credits].sort((a, b) => {
    const dateA = a.release_date || a.first_air_date || '';
    const dateB = b.release_date || b.first_air_date || '';
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.localeCompare(dateA);
  });
}

// ── Department label for Acting based on gender ───────────────────────────────

function actingDeptLabel() {
  if (gender === 1) return 'Actress';
  if (gender === 2) return 'Actor';
  return 'Actor/Actress';
}

function getDeptLabel(deptName) {
  if (deptName === 'Acting')     return actingDeptLabel();
  if (deptName === 'Directing')  return 'Director';
  if (deptName === 'Writing')    return 'Writer';
  if (deptName === 'Production') return 'Producer';
  return deptName;
}

// ── Credit role text ──────────────────────────────────────────────────────────

function getCreditRole(credit) {
  if (credit._mergedRole !== undefined) return credit._mergedRole;
  if (credit._source === 'cast' && credit.character) return credit.character;
  if (credit.jobs?.length) return credit.jobs.map(j => j.job).join(', ');
  if (credit.job) return credit.job;
  return '';
}

// ── Main load ─────────────────────────────────────────────────────────────────

// Mirrors the Known For scoring from castMember.js — picks the best credit's backdrop
function getBestBackdropPath(castArr) {
  const scored = castArr
    .filter(c => {
      const char = (c.character || '').toLowerCase();
      if (char.includes('uncredited')) return false;
      if (char.includes('self') || char.includes('himself') || char.includes('herself')) return false;
      if (c.order !== undefined && c.order > 12) return false;
      if (c.media_type === 'tv' && c.episode_count < 5) return false;
      return true;
    })
    .map(c => {
      const voteAverage  = c.vote_average  || 0;
      const voteCount    = c.vote_count    || 0;
      const popularity   = c.popularity    || 0;
      const roleWeight   = c.order !== undefined ? Math.max(15 - c.order, 0) * 3 : 5;
      const episodeWeight = c.media_type === 'tv'
        ? (c.episode_count >= 20 ? 50 : c.episode_count >= 10 ? 30 : c.episode_count >= 5 ? 10 : 0)
        : 0;
      const score =
        (voteAverage * 2) +
        (Math.log10(voteCount + 1) * 5) +
        (popularity * 0.2) +
        roleWeight +
        episodeWeight;
      return { ...c, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  return scored.find(c => c.backdrop_path)?.backdrop_path || null;
}

async function loadFilmography() {
  if (isLoading) return;
  isLoading = true;

  try {
    const res = await fetch(API_LINKS.CAST_CREDITS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const castArr = data.cast || [];
    const crewArr = data.crew || [];

    allDepartments = deduplicateDepartments(groupIntoDepartments(castArr, crewArr));

    const orderedNames = sortedDepartmentNames(allDepartments);

    // Pick backdrop from the highest-scored cast credit (mirrors Known For logic)
    const backdropPath = getBestBackdropPath(data.cast || []);
    setBackdropBackground(
      document.querySelector('.filmography-header'),
      backdropPath,
      API_LINKS.BACKDROP_PATH,
      '../images/no-image-backdrop.jpg',
      [0.8, 0.9]
    );

    // Collect all unique credits for batched hydration
    const seen = new Set();
    const allCredits = [];
    orderedNames.forEach(dept => {
      (allDepartments[dept] || []).forEach(c => {
        const key = `${c.media_type}_${c.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allCredits.push(c);
        }
      });
    });

    // Hydrate in batches of 10, render each batch as it resolves
    const chunks = chunkArray(allCredits, 10);
    let backdropSet = false;

    // Clear loading state before first batch renders
    filmographyContainer.innerHTML = '';

    for (const chunk of chunks) {
      const hydratedChunk = await Promise.all(chunk.map(c => fetchDetails(c)));

      // Re-render all departments with now-cached detail data
      renderAllDepartments(orderedNames);
    }

    // Final render pass after all hydration complete
    renderAllDepartments(orderedNames);

  } catch (e) {
    console.error('Failed to load filmography:', e);
    showErrorMessage('Failed to load filmography. Please try again.');
  } finally {
    isLoading = false;
  }
}

// ── Render all departments ────────────────────────────────────────────────────

function renderAllDepartments(orderedNames) {
  filmographyContainer.innerHTML = '';

  let hasContent = false;

  orderedNames.forEach(deptName => {
    const credits = allDepartments[deptName];
    if (!credits || credits.length === 0) return;

    const sorted = sortByDateDesc(credits);
    const section = buildDepartmentSection(deptName, sorted);
    if (section) {
      filmographyContainer.appendChild(section);
      hasContent = true;
    }
  });

  if (!hasContent) {
    const empty = document.createElement('div');
    empty.className = 'cast-loading';
    empty.textContent = 'No filmography found.';
    filmographyContainer.appendChild(empty);
  }
}

// ── Build one department section ──────────────────────────────────────────────

function buildDepartmentSection(deptName, credits) {
  if (!credits.length) return null;

  const section = document.createElement('div');
  section.className = 'department-section';
  section.dataset.dept = deptName;

  const titleEl = document.createElement('h2');
  titleEl.className = 'department-title';
  titleEl.textContent = getDeptLabel(deptName);
  section.appendChild(titleEl);

  const list = document.createElement('div');
  list.className = 'people-container filmography-items';

  credits.forEach(credit => {
    const cacheKey = `${credit.media_type}_${credit.id}`;
    const cached = detailsCache[cacheKey];
    // Preserve _mergedRole from the deduplicated allDepartments entry
    const hydrated = cached
      ? { ...cached, _mergedRole: credit._mergedRole, _source: credit._source }
      : credit;
    const card = buildFilmographyCard(hydrated);
    if (card) list.appendChild(card);
  });

  section.appendChild(list);
  return section;
}

// ── Build one watchlist-style card ────────────────────────────────────────────

function buildFilmographyCard(credit) {
  const title     = credit.title || credit.name || 'Unknown';
  const mediaId   = String(credit.id);
  const mediaType = credit.media_type === 'tv' ? 'tv' : 'movie';
  const typeLabel = mediaType === 'tv' ? 'Show' : 'Movie';

  const rawDate   = credit.release_date || credit.first_air_date || '';
  const year      = rawDate ? new Date(rawDate).getFullYear() : '';

  const posterUrl = (credit.posterPath || credit.poster_path)
    ? `${API_LINKS.IMG_PATH}${credit.posterPath || credit.poster_path}`
    : '../images/no-image.jpg';

  const roleText = getCreditRole(credit);

  const runtimeStr = (() => {
    if (!credit.runtime) return '';
    const h = Math.floor(credit.runtime / 60);
    const m = credit.runtime % 60;
    return h > 0 ? `${h}H ${m}M` : `${m}M`;
  })();

  const scorePct = credit.voteAverage
    ? `${Math.round(credit.voteAverage * 10)}%`
    : null;

  const infoLineParts = [
    year             || null,
    credit.contentRating || null,
    runtimeStr       || null
  ].filter(Boolean);

  const detailUrl = mediaType === 'tv'
    ? `../tv reviews/tvReviews.html?id=${mediaId}&title=${encodeURIComponent(title)}`
    : `../movie reviews/movieReviews.html?id=${mediaId}&title=${encodeURIComponent(title)}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'watchlist-item';
  wrapper.dataset.title      = title.toLowerCase();
  wrapper.dataset.role       = roleText.toLowerCase();
  wrapper.dataset.department = (credit.department || '').toLowerCase();
  wrapper.dataset.mediaType  = mediaType;

  // Poster wrapper (with watchlist toggle button)
  const posterWrapper = document.createElement('div');
  posterWrapper.className = 'watchlist-item-poster-wrapper';

  const posterImg = document.createElement('img');
  posterImg.className = 'watchlist-item-poster';
  posterImg.src = posterUrl;
  posterImg.alt = escapeHtml(title);
  posterImg.onerror = function() { this.src = '../images/no-image.jpg'; };

  // Watchlist toggle button (replaces remove button)
  const watchlistBtn = document.createElement('button');
  watchlistBtn.className = 'watchlist-remove-btn';
  watchlistBtn.setAttribute('aria-label', 'Add to watchlist');

  const updateWatchlistBtn = (inList) => {
    watchlistBtn.innerHTML = `<img src="../images/${inList ? 'watchlist-saved' : 'watchlist-add'}.svg" class="watchlist-remove-icon" alt="${inList ? 'Remove from watchlist' : 'Add to watchlist'}">`;
    watchlistBtn.setAttribute('aria-label', inList ? 'Remove from watchlist' : 'Add to watchlist');
  };

  updateWatchlistBtn(savedMediaIds.has(mediaId));

  const watchlistItem = {
    id:            mediaId,
    title,
    year:          year || '',
    mediaType,
    posterPath:    credit.posterPath || credit.poster_path || '',
    voteAverage:   credit.voteAverage  ?? null,
    runtime:       credit.runtime      ?? null,
    contentRating: credit.contentRating ?? null
  };

  watchlistBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isInList = savedMediaIds.has(mediaId);

    if (isInList) {
      const cachedName = localStorage.getItem('ccLastName');
      if (cachedName) {
        toggleWatchlistAPI(cachedName, watchlistItem).then(status => {
          const nowInList = status === 'added';
          if (nowInList) savedMediaIds.add(mediaId);
          else savedMediaIds.delete(mediaId);
          updateWatchlistBtn(nowInList);
        }).catch(err => {
          console.error('Watchlist toggle failed:', err);
          showErrorMessage('Failed to update watchlist. Please try again.');
        });
      } else {
        showNameModal({
          title: 'Remove from Watchlist',
          confirmText: 'Remove',
          onConfirm: async (username) => {
            try {
              const status = await toggleWatchlistAPI(username, watchlistItem);
              const nowInList = status === 'added';
              if (nowInList) savedMediaIds.add(mediaId);
              else savedMediaIds.delete(mediaId);
              updateWatchlistBtn(nowInList);
            } catch (err) {
              console.error('Watchlist toggle failed:', err);
              showErrorMessage('Failed to update watchlist. Please try again.');
            }
          }
        });
      }
    } else {
      showNameModal({
        title: 'Save to Watchlist',
        confirmText: 'Save',
        onConfirm: async (username) => {
          try {
            const status = await toggleWatchlistAPI(username, watchlistItem);
            const nowInList = status === 'added';
            if (nowInList) savedMediaIds.add(mediaId);
            else savedMediaIds.delete(mediaId);
            updateWatchlistBtn(nowInList);
          } catch (err) {
            console.error('Watchlist toggle failed:', err);
            showErrorMessage('Failed to update watchlist. Please try again.');
          }
        }
      });
    }
  });

  posterWrapper.appendChild(posterImg);
  posterWrapper.appendChild(watchlistBtn);

  // Details column
  const details = document.createElement('div');
  details.className = 'watchlist-item-details';
  details.innerHTML = `
    <p class="watchlist-item-title">${escapeHtml(title)}</p>
    <div class="watchlist-media-info-line">
      ${infoLineParts.map(p => `<span>${escapeHtml(String(p))}</span>`).join('')}
    </div>
    ${roleText ? `<p class="watchlist-item-added-by">${escapeHtml(roleText)}</p>` : ''}
    <div class="watchlist-item-info">
      <span class="watchlist-item-type">${typeLabel}</span>
      ${scorePct ? `
      <div class="watchlist-score-pill">
        <span class="watchlist-score-value">${scorePct}</span>
        <span class="watchlist-score-label">TMDB</span>
      </div>` : `
      <div class="watchlist-score-pill">
        <span class="watchlist-score-value">NR</span>
        <span class="watchlist-score-label">TMDB</span>
      </div>`}
    </div>
  `;

  wrapper.appendChild(posterWrapper);
  wrapper.appendChild(details);

  // Card click → navigate to media detail page
  wrapper.addEventListener('click', () => {
    window.location.href = detailUrl;
  });

  return wrapper;
}

// ── Search / filter ───────────────────────────────────────────────────────────

function filterFilmography(searchTerm) {
  if (!searchTerm) {
    const orderedNames = sortedDepartmentNames(allDepartments);
    renderAllDepartments(orderedNames);
    return;
  }

  filmographyContainer.innerHTML = '';
  let hasResults = false;

  const orderedNames = sortedDepartmentNames(allDepartments);

  orderedNames.forEach(deptName => {
    const credits = allDepartments[deptName] || [];

    const matched = credits.filter(credit => {
      const title      = (credit.title || credit.name || '').toLowerCase();
      const role       = getCreditRole(credit).toLowerCase();
      const dept       = (credit.department || deptName).toLowerCase();
      const jobsStr    = (credit.jobs?.map(j => j.job).join(' ') || '').toLowerCase();

      return (
        title.includes(searchTerm) ||
        role.includes(searchTerm)  ||
        dept.includes(searchTerm)  ||
        jobsStr.includes(searchTerm)
      );
    });

    if (matched.length === 0) return;

    const sorted  = sortByDateDesc(matched);
    const section = buildDepartmentSection(deptName, sorted);
    if (section) {
      filmographyContainer.appendChild(section);
      hasResults = true;
    }
  });

  if (!hasResults) {
    const noResults = document.createElement('div');
    noResults.className = 'cast-loading';
    noResults.textContent = 'No results found';
    filmographyContainer.appendChild(noResults);
  }
}