// Shared topnav search: trending suggestions + live "quick search" dropdown.
(function () {

  const scriptSrc = (document.currentScript || {}).getAttribute?.('src') || '';
  const prefix = scriptSrc.startsWith('../') ? '../' : '';

  const API_LINKS = {
    TRENDING_ALL_DAY:   'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/all/day',
    SEARCH_CATEGORIZED: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/search/categorized?query=',
    IMG_PATH:           'https://image.tmdb.org/t/p/w185'
  };

  const QUICK_RESULT_LIMIT = 8;
  const MOBILE_SEARCH_ANIMATION_MS = 200;

  let trendingCache = null;
  let trendingPromise = null;
  let searchRequestToken = 0;
  let searchCommitted = false;

  function fetchTrending() {
    if (trendingCache) return Promise.resolve(trendingCache);
    if (trendingPromise) return trendingPromise;

    trendingPromise = fetch(API_LINKS.TRENDING_ALL_DAY)
      .then(res => res.json())
      .then(data => {
        trendingCache = (data.results || []).slice(0, QUICK_RESULT_LIMIT);
        return trendingCache;
      })
      .catch(error => {
        console.error('Failed to load trending suggestions:', error);
        trendingCache = [];
        return trendingCache;
      });

    return trendingPromise;
  }

  const NOTABLE_POPULARITY_THRESHOLD = 5;

  function matchTier(item, query) {
    const text = (item.title || item.name || '').toLowerCase();
    const q = query.toLowerCase();
    let tier;
    if (text === q) tier = 0;
    else if (text.startsWith(q)) tier = 1;
    else if (text.includes(q)) tier = 2;
    else tier = 3;

    if (tier <= 1 && (item.popularity || 0) < NOTABLE_POPULARITY_THRESHOLD) {
      tier = 2;
    }
    return tier;
  }

  function recencyBoost(item) {
    const dateStr = item.release_date || item.first_air_date || '';
    if (!dateStr) return 0;
    const year = new Date(dateStr).getFullYear();
    const currentYear = new Date().getFullYear();
    return year >= currentYear - 1 ? 20 : 0;
  }

  function mergeByRelevanceAndPopularity(movies, tvShows, people, query) {
    const tagged = [
      ...movies.map(m  => ({ ...m, media_type: 'movie'  })),
      ...tvShows.map(t => ({ ...t, media_type: 'tv'     })),
      ...people.map(p  => ({ ...p, media_type: 'person' }))
    ];
    return tagged.sort((a, b) => {
      const tierDiff = matchTier(a, query) - matchTier(b, query);
      if (tierDiff !== 0) return tierDiff;
      const scoreA = (a.popularity || 0) + recencyBoost(a);
      const scoreB = (b.popularity || 0) + recencyBoost(b);
      return scoreB - scoreA;
    });
  }

  function getYear(item) {
    const dateStr = item.release_date || item.first_air_date || '';
    return dateStr ? new Date(dateStr).getFullYear() : '';
  }

  function getDetailUrl(item) {
    const title = item.title || item.name || '';
    if (item.media_type === 'person') {
      return `${prefix}people/castMember.html?id=${item.id}&name=${encodeURIComponent(title)}`;
    }
    if (item.media_type === 'tv') {
      return `${prefix}tv reviews/tvReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`;
    }
    return `${prefix}movie reviews/movieReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`;
  }

  function buildMediaRow(item) {
    const title = item.title || item.name || '';
    const posterUrl = item.poster_path
      ? `${API_LINKS.IMG_PATH}${item.poster_path}`
      : `${prefix}images/no-image.jpg`;
    const typeLabel = item.media_type === 'tv' ? 'Show' : 'Movie';
    const infoLineParts = [getYear(item) || null];

    const row = document.createElement('div');
    row.className = 'search-result-item';
    row.innerHTML = `
      <img class="search-result-poster" src="${posterUrl}" alt="${escapeHtml(title)}" onerror="this.src='${prefix}images/no-image.jpg'">
      <div class="search-result-details">
        <p class="search-result-title">${escapeHtml(title)}</p>
        <div class="search-result-info-line">${buildInfoLineHTML(infoLineParts)}</div>
        <div class="search-result-badges">
          <span class="search-result-type">${typeLabel}</span>
          <div class="search-result-score-pill">
            <span class="search-result-score-value">${formatScore(item.vote_average)}</span>
            <span class="search-result-score-label">TMDB</span>
          </div>
        </div>
      </div>
    `;
    row.addEventListener('click', () => { window.location.href = getDetailUrl(item); });
    return row;
  }

  function buildPersonRow(item) {
    const name = item.name || '';
    const photoUrl = item.profile_path
      ? `${API_LINKS.IMG_PATH}${item.profile_path}`
      : `${prefix}images/no-image-cast.jpg`;
    const department = item.known_for_department || 'Unknown';
    const top = (item.known_for && item.known_for[0]) || null;
    const topKnownFor = top ? (top.title || top.name || '') : '';

    const row = document.createElement('div');
    row.className = 'search-result-item search-result-person';
    row.innerHTML = `
      <img class="search-result-poster" src="${photoUrl}" alt="${escapeHtml(name)}" onerror="this.src='${prefix}images/no-image-cast.jpg'">
      <div class="search-result-details">
        <p class="search-result-title">${escapeHtml(name)}</p>
        <div class="search-result-person-badge">
          <span class="search-result-person-department">${escapeHtml(department)}</span>
          ${topKnownFor ? `<span class="search-result-person-knownfor">${escapeHtml(topKnownFor)}</span>` : ''}
        </div>
      </div>
    `;
    row.addEventListener('click', () => { window.location.href = getDetailUrl(item); });
    return row;
  }

  function buildTrendingRow(item) {
    const title = item.title || item.name || '';
    const row = document.createElement('div');
    row.className = 'search-trending-item';
    row.innerHTML = `
      <img src="${prefix}images/trending-icon.svg" class="trending-icon" alt="">
      <span class="search-trending-title">${escapeHtml(title)}</span>
    `;
    row.addEventListener('click', () => { window.location.href = getDetailUrl(item); });
    return row;
  }

  function buildRow(item) {
    return item.media_type === 'person' ? buildPersonRow(item) : buildMediaRow(item);
  }

  function init() {
    const topnav = document.querySelector('.topnav');
    const searchContainer = document.querySelector('.search-container');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-query');
    if (!topnav || !searchContainer || !searchForm || !searchInput) return;

    const searchTriggerBtn = document.createElement('button');
    searchTriggerBtn.className = 'search-trigger-btn';
    searchTriggerBtn.setAttribute('aria-label', 'Open search');
    searchTriggerBtn.innerHTML = `<img src="${prefix}images/search-icon.svg" alt="" class="search-trigger-icon">`;

    const searchCloseBtn = document.createElement('button');
    searchCloseBtn.className = 'search-close-btn';
    searchCloseBtn.setAttribute('aria-label', 'Close search');
    searchCloseBtn.textContent = '✕';

    const searchFormIcon = document.createElement('img');
    searchFormIcon.src = `${prefix}images/search-icon.svg`;
    searchFormIcon.alt = '';
    searchFormIcon.className = 'search-form-icon';

    const searchClearBtn = document.createElement('button');
    searchClearBtn.type = 'button';
    searchClearBtn.className = 'search-clear-btn';
    searchClearBtn.setAttribute('aria-label', 'Clear search');
    searchClearBtn.innerHTML = `<img src="${prefix}images/close-icon.svg" alt="">`;
    searchForm.appendChild(searchClearBtn);

    topnav.insertBefore(searchFormIcon, searchContainer);
    topnav.appendChild(searchTriggerBtn);
    topnav.appendChild(searchCloseBtn);

    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown-panel';
    topnav.appendChild(dropdown);

    function positionDropdown() {
      const topnavRect = topnav.getBoundingClientRect();
      if (window.innerWidth <= 650) {
        dropdown.style.left = '0px';
        dropdown.style.top = topnavRect.height + 'px';
        dropdown.style.width = topnavRect.width + 'px';
      } else {
        const containerRect = searchContainer.getBoundingClientRect();
        dropdown.style.left = (containerRect.left - topnavRect.left) + 'px';
        dropdown.style.top = (containerRect.bottom - topnavRect.top) + 'px';
        dropdown.style.width = containerRect.width + 'px';
      }
    }

    function openDropdown() {
      positionDropdown();
      dropdown.classList.add('is-open');
      searchContainer.classList.add('dropdown-open');
    }
    function closeDropdown() {
      dropdown.classList.remove('is-open');
      searchContainer.classList.remove('dropdown-open');
    }

    function openMobileSearch() {
      const first = searchTriggerBtn.getBoundingClientRect();
      const topnavRect = topnav.getBoundingClientRect();

      searchTriggerBtn.style.position = 'absolute';
      searchTriggerBtn.style.left = (first.left - topnavRect.left) + 'px';
      searchTriggerBtn.style.top = (first.top - topnavRect.top) + 'px';
      searchTriggerBtn.style.margin = '0';

      topnav.classList.add('search-active');

      const last = searchFormIcon.getBoundingClientRect();
      const dx = last.left - first.left;
      const dy = last.top - first.top;

      requestAnimationFrame(() => {
        searchTriggerBtn.style.transition = `transform ${MOBILE_SEARCH_ANIMATION_MS}ms ease, opacity ${MOBILE_SEARCH_ANIMATION_MS}ms ease`;
        searchTriggerBtn.style.transform = `translate(${dx}px, ${dy}px)`;
        searchTriggerBtn.style.opacity = '0';
        topnav.classList.add('search-form-icon-visible');
      });

      searchInput.focus({ preventScroll: true });
    }

    function closeMobileSearch() {
      searchCommitted = false;
      topnav.classList.remove('search-active');
      topnav.classList.remove('search-form-icon-visible');
      searchForm.classList.remove('has-value');
      searchInput.value = '';
      searchTriggerBtn.style.position = '';
      searchTriggerBtn.style.left = '';
      searchTriggerBtn.style.top = '';
      searchTriggerBtn.style.margin = '';
      searchTriggerBtn.style.transition = '';
      searchTriggerBtn.style.transform = '';
      searchTriggerBtn.style.opacity = '';
      searchInput.blur();
      closeDropdown();
    }

    searchTriggerBtn.addEventListener('click', openMobileSearch);
    searchCloseBtn.addEventListener('click', closeMobileSearch);

    function renderTrending() {
      if (searchCommitted) return;
      dropdown.innerHTML = `<p class="search-dropdown-section-title">Trending</p>`;
      const sectionEl = dropdown.firstElementChild;
      fetchTrending().then(items => {
        if (searchCommitted || searchInput.value.trim() || dropdown.firstElementChild !== sectionEl) return;
        items.forEach(item => dropdown.appendChild(buildTrendingRow(item)));
      });
      openDropdown();
    }

    function renderQuickResults(query) {
      if (searchCommitted) return;
      const requestToken = ++searchRequestToken;
      fetch(API_LINKS.SEARCH_CATEGORIZED + encodeURIComponent(query))
        .then(res => res.json())
        .then(data => {
          if (searchCommitted) return;
          if (requestToken !== searchRequestToken) return;
          if (searchInput.value.trim() !== query) return;

          const combined = mergeByRelevanceAndPopularity(
            data.movies  || [],
            data.tvShows || [],
            data.people  || [],
            query
          ).slice(0, QUICK_RESULT_LIMIT);

          dropdown.innerHTML = '';
          if (combined.length === 0) {
            dropdown.innerHTML = '<p class="search-dropdown-empty">No results found</p>';
          } else {
            combined.forEach(item => dropdown.appendChild(buildRow(item)));
          }
          openDropdown();
        })
        .catch(error => console.error('Quick search failed:', error));
    }

    const debouncedQuickSearch = debounce((query) => {
      query ? renderQuickResults(query) : renderTrending();
    }, 300);

    function updateClearBtnVisibility() {
      searchForm.classList.toggle('has-value', searchInput.value.trim().length > 0);
    }

    searchClearBtn.addEventListener('click', () => {
      searchCommitted = false;
      searchInput.value = '';
      updateClearBtnVisibility();
      renderTrending();
      searchInput.focus();
    });

    searchInput.addEventListener('focus', () => {
      searchCommitted = false;
      const query = searchInput.value.trim();
      query ? renderQuickResults(query) : renderTrending();
    });

    searchInput.addEventListener('input', () => {
      searchCommitted = false;
      updateClearBtnVisibility();
      debouncedQuickSearch(searchInput.value.trim());
    });

    window.addEventListener('resize', () => {
      if (dropdown.classList.contains('is-open')) positionDropdown();
    });

    document.addEventListener('click', (e) => {
      const isOutside = !searchContainer.contains(e.target)
        && !dropdown.contains(e.target)
        && !searchTriggerBtn.contains(e.target)
        && !searchCloseBtn.contains(e.target);
      if (!isOutside) return;

      closeDropdown();
      if (window.innerWidth <= 650) closeMobileSearch();
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
        if (window.innerWidth <= 650) closeMobileSearch();
      }
    });

    searchForm.addEventListener('submit', () => {
      searchCommitted = true;
      updateClearBtnVisibility();
      closeDropdown();
      searchInput.blur();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();