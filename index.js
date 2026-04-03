const API_LINKS = {
  TRENDING_WEEK:        'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/week',
  TRENDING_DAY:         'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/day',
  POPULAR:              'https://celestial-cinema-backend.onrender.com/api/v1/movies/popular',
  NOW_PLAYING:          'https://celestial-cinema-backend.onrender.com/api/v1/movies/now-playing',
  TOP_RATED:            'https://celestial-cinema-backend.onrender.com/api/v1/movies/top-rated',
  POPULAR_TV:           'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/popular',
  TRENDING_TV_WEEK:     'https://celestial-cinema-backend.onrender.com/api/v1/movies/trending/tv/week',
  TV_AIRING_TODAY:      'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/airing-today',
  TV_TOP_RATED:         'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/top-rated',
  MOVIE_GENRE:          'https://celestial-cinema-backend.onrender.com/api/v1/movies/genre/',
  TV_GENRE:             'https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/genre/',
  SEARCH_MULTI:         'https://celestial-cinema-backend.onrender.com/api/v1/movies/search?query=',
  SEARCH_CATEGORIZED:   'https://celestial-cinema-backend.onrender.com/api/v1/movies/search/categorized?query=',
  IMG_PATH:             'https://image.tmdb.org/t/p/w1280'
};

const mediaGridContainer = document.getElementById("media-grid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const trendingTodayButton = document.querySelector(".trending-today-button");
const popularButton = document.querySelector(".popular-button");
const nowPlayingButton = document.querySelector(".now-playing-button");
const topRatedButton = document.querySelector(".top-rated-button");
const moviesToggleBtn = document.getElementById('toggle-movies');
const tvToggleBtn = document.getElementById('toggle-tv');
const watchlistButton = document.querySelector(".watchlist-button");
const reviewsActionButton = document.querySelector(".reviews-action-button");
const watchlistActionButton = document.querySelector(".watchlist-action-button");
const reviewsButton = document.querySelector(".reviews-button");

const filtersNav = document.getElementById('filters-nav');

const loadMoreBtn = document.getElementById("load-more-btn");
const loadMoreContainer = document.getElementById("load-more-container");
const genrePageTitle = document.getElementById('genre-page-title');

const categoryTabsContainer = document.getElementById('category-tabs');
const tabMoviesBtn = document.getElementById('tab-movies');
const tabTvshowsBtn = document.getElementById('tab-tvshows');
const tabPeopleBtn = document.getElementById('tab-people');
const countMoviesEl = document.getElementById('count-movies');
const countTvshowsEl = document.getElementById('count-tvshows');
const countPeopleEl = document.getElementById('count-people');

loadMoreBtn.addEventListener("click", loadMoreMedia);

const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get("search");
const filterParam = urlParams.get("filter");
const genreParam  = urlParams.get("genre");
const genreType   = urlParams.get("type") || 'movie';
const genreName   = urlParams.get("name") || '';

let currentContentType = 'movie';
let currentPage = 1;
let hasMoreMedia = true;
let isLoadingMedia = false;
let currentSearchTerm = '';
let currentApiUrl = '';
let categorizedResults = { movies: [], tvShows: [], people: [] };
let activeCategoryTab = 'movies';
let isSearchActive = false;
let currentSearchPage = 1;
let searchTotalCounts = { movies: 0, tvshows: 0, people: 0 };
let savedMediaIds = new Set();
let currentMediaToggle = localStorage.getItem('ccMediaToggle') || 'movie';

if (genreParam) {
  hideFiltersForGenre();
  showGenreTitle(genreName, genreType);
}

async function loadSavedMediaIds() {
  try {
    const res = await fetch('https://celestial-cinema-backend.onrender.com/api/v1/watchlist');
    if (!res.ok) return;
    const data = await res.json();
    savedMediaIds = new Set(
      (data.items || []).map(item => String(item.mediaId))
    );
  } catch (e) {
    console.error('Failed to load saved media ids:', e);
  }
}

function setActiveButton(activeButton) {
  document.querySelectorAll('.filters button:not(.toggle-option), .action-row button').forEach(btn => {
    btn.classList.remove('active');
  });
  activeButton.classList.add('active');
}

const FILTER_LABELS = {
  movie: { nowPlaying: 'Now Playing' },
  tv:    { nowPlaying: 'Airing Today' }
};

const FILTER_CONFIGS = {
  movie: {
    trending:   { url: () => API_LINKS.TRENDING_WEEK,    contentType: 'movie' },
    popular:    { url: () => API_LINKS.POPULAR,          contentType: 'movie' },
    nowPlaying: { url: () => API_LINKS.NOW_PLAYING,      contentType: 'movie' },
    topRated:   { url: () => API_LINKS.TOP_RATED,        contentType: 'movie' }
  },
  tv: {
    trending:   { url: () => API_LINKS.TRENDING_TV_WEEK, contentType: 'tv' },
    popular:    { url: () => API_LINKS.POPULAR_TV,       contentType: 'tv' },
    nowPlaying: { url: () => API_LINKS.TV_AIRING_TODAY,  contentType: 'tv' },
    topRated:   { url: () => API_LINKS.TV_TOP_RATED,     contentType: 'tv' }
  }
};

updateToggleUI();

function getFilterConfig(filterName) {
  const cfg = FILTER_CONFIGS[currentMediaToggle][filterName];
  return { url: cfg.url(), contentType: cfg.contentType };
}

function updateFilterButtonLabels() {
  nowPlayingButton.textContent = FILTER_LABELS[currentMediaToggle].nowPlaying;
}

function updateToggleUI() {
  moviesToggleBtn.classList.toggle('active', currentMediaToggle === 'movie');
  tvToggleBtn.classList.toggle('active', currentMediaToggle === 'tv');
  document.documentElement.classList.toggle('media-toggle-movie', currentMediaToggle === 'movie');
  document.documentElement.classList.toggle('media-toggle-tv', currentMediaToggle === 'tv');
  updateFilterButtonLabels();
}

function ensureFiltersVisible() {
  filtersNav.style.display = 'flex';
  document.getElementById('action-row').style.removeProperty('display');
  categoryTabsContainer.style.display = 'none';
  isSearchActive = false;
  hideGenreTitle();
}

function hideFiltersForSearch() {
  filtersNav.style.display = 'none';
  document.getElementById('action-row').style.display = 'none';

  const filterButtons = document.querySelectorAll('.filters button');
  filterButtons.forEach(button => button.classList.remove('active'));

  isSearchActive = true;
}

function hideFiltersForGenre() {
  filtersNav.style.display = 'none';
  document.getElementById('action-row').style.display = 'none';
  categoryTabsContainer.style.display = 'none';
  document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
  isSearchActive = false;
}

function showGenreTitle(name, type) {
  if (!genrePageTitle) return;
  const typeLabel = type === 'tv' ? 'TV Shows' : 'Movies';
  genrePageTitle.textContent = `${name} ${typeLabel}`;
  genrePageTitle.style.display = 'block';
}

function hideGenreTitle() {
  if (!genrePageTitle) return;
  genrePageTitle.style.display = 'none';
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    searchCategorized(searchTerm);
    searchInput.value = "";
  }
});

loadSavedMediaIds().then(() => {
  if (filterParam === 'shows') {
    currentMediaToggle = 'tv';
    localStorage.setItem('ccMediaToggle', 'tv');
  }
  updateToggleUI();

  if (searchParam) {
    searchInput.value = searchParam;
    searchCategorized(searchParam);
  } else if (genreParam) {
    hideFiltersForGenre();
    showGenreTitle(genreName, genreType);
    const genreApiUrl = genreType === 'tv'
      ? `${API_LINKS.TV_GENRE}${genreParam}`
      : `${API_LINKS.MOVIE_GENRE}${genreParam}`;
    returnMedia(genreApiUrl, genreType);
  } else if (filterParam) {
    ensureFiltersVisible();
    switch (filterParam) {
      case 'trending':
        setActiveButton(trendingTodayButton);
        break;
      case 'popular':
        setActiveButton(popularButton);
        break;
      case 'now-playing':
        setActiveButton(nowPlayingButton);
        break;
      case 'top-rated':
        setActiveButton(topRatedButton);
        break;
      case 'shows':
        setActiveButton(trendingTodayButton);
        break;
      default:
        break;
    }
    const filterMap = {
      'trending':   'trending',
      'popular':    'popular',
      'now-playing':'nowPlaying',
      'top-rated':  'topRated',
      'shows':      'trending'
    };
    const key = filterMap[filterParam] || 'trending';
    const { url, contentType } = getFilterConfig(key);
    returnMedia(url, contentType);
  } else {
    ensureFiltersVisible();
    const { url, contentType } = getFilterConfig('trending');
    returnMedia(url, contentType);
  }
});

function returnMedia(url, contentType = 'movie', append = false) {
  if (!append) {
    mediaGridContainer.innerHTML = '';
    currentPage = 1;
    hasMoreMedia = true;
    currentApiUrl = url;
  }
  
  currentContentType = contentType;
  isLoadingMedia = true;
  
  if (append) {
    loadMoreBtn.textContent = 'Loading';
    loadMoreBtn.disabled = true;
  }
  
  const pageUrl = url.includes('?') ? `${url}&page=${currentPage}` : `${url}?page=${currentPage}`;
  
  fetch(pageUrl).then(res => res.json()).then(function(data) {
    if (!data.results || data.results.length === 0) {
      if (!append) {
        mediaGridContainer.innerHTML = '<div class="no-media">No media found matching your search</div>';
        loadMoreContainer.style.display = 'none';
      } else {
        hasMoreMedia = false;
        loadMoreContainer.style.display = 'none';
      }
      return;
    }
    
    const validResults = data.results.filter(itemData => {
      if (contentType === 'multi' && itemData.media_type === 'person') {
        return false;
      }
      return true;
    });
    
    if (validResults.length === 0) {
      if (!append) {
        mediaGridContainer.innerHTML = '<div class="no-media">No media found matching your search</div>';
        loadMoreContainer.style.display = 'none';
      } else {
        hasMoreMedia = false;
        loadMoreContainer.style.display = 'none';
      }
      return;
    }
    
    validResults.forEach(itemData => {
      let itemContentType = contentType;
      if (contentType === 'multi') {
        itemContentType = itemData.media_type;
      }
      mediaGridContainer.appendChild(createMediaCard(itemData, itemContentType));
    });
    
    hasMoreMedia = data.total_pages ? currentPage < data.total_pages : validResults.length >= 20;
    
    if (hasMoreMedia) {
      loadMoreContainer.style.display = 'flex';
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    } else {
      loadMoreContainer.style.display = 'none';
    }
    
    isLoadingMedia = false;
    
  }).catch(error => {
    console.error('Error fetching content:', error);
    if (!append) {
      mediaGridContainer.innerHTML = '<div class="error-message">Failed to load content. Please try again later.</div>';
    }
    loadMoreContainer.style.display = 'none';
    isLoadingMedia = false;
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.disabled = false;
  });
}

function searchCategorized(query) {
  hideFiltersForSearch();
  mediaGridContainer.innerHTML = '';
  currentSearchPage = 1;
  loadMoreContainer.style.display = 'none';
  categoryTabsContainer.style.display = 'none';
  currentSearchTerm = query;

  fetch(API_LINKS.SEARCH_CATEGORIZED + encodeURIComponent(query))
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.json();
    })
    .then(data => {
      categorizedResults = {
        movies:  data.movies  || [],
        tvShows: data.tvShows || [],
        people:  data.people  || []
      };

      const { movieCount = 0, tvCount = 0, peopleCount = 0 } = data;

      if (!movieCount && !tvCount && !peopleCount) {
        mediaGridContainer.innerHTML = '<div class="no-media">No results found matching your search</div>';
        return;
      }

      showCategoryTabs(movieCount, tvCount, peopleCount);
    })
    .catch(error => {
      console.error('Error fetching search results:', error);
      mediaGridContainer.innerHTML = '<div class="error-message">Failed to load search results. Please try again.</div>';
    });
}

function showCategoryTabs(movieCount, tvCount, peopleCount) {
  countMoviesEl.textContent  = Math.min(movieCount,  999);
  countTvshowsEl.textContent = Math.min(tvCount,     999);
  countPeopleEl.textContent  = Math.min(peopleCount, 999);
  searchTotalCounts = { movies: movieCount, tvshows: tvCount, people: peopleCount };

  tabMoviesBtn.disabled  = movieCount  === 0;
  tabTvshowsBtn.disabled = tvCount     === 0;
  tabPeopleBtn.disabled  = peopleCount === 0;

  const tabsByCount = [
    { btn: tabMoviesBtn,  count: movieCount  },
    { btn: tabTvshowsBtn, count: tvCount     },
    { btn: tabPeopleBtn,  count: peopleCount }
  ].sort((a, b) => b.count - a.count);

  tabsByCount.forEach(({ btn }) => categoryTabsContainer.appendChild(btn));

  categoryTabsContainer.style.display = 'flex';
  setActiveCategoryTab(getBestTab(movieCount, tvCount, peopleCount));
}

function getBestTab(movieCount, tvCount, peopleCount) {
  // Highest count wins; tiebreaker priority: movies > tvShows > people
  if (movieCount >= tvCount && movieCount >= peopleCount) return 'movies';
  if (tvCount >= peopleCount) return 'tvshows';
  return 'people';
}

function setActiveCategoryTab(category) {
  activeCategoryTab = category;

  [tabMoviesBtn, tabTvshowsBtn, tabPeopleBtn].forEach(btn => btn.classList.remove('active'));

  const tabMap = { movies: tabMoviesBtn, tvshows: tabTvshowsBtn, people: tabPeopleBtn };
  if (tabMap[category]) tabMap[category].classList.add('active');

  renderCategoryResults(category);
}

function renderCategoryResults(category) {
  mediaGridContainer.innerHTML = '';

  const resultMap = {
    movies:  { data: categorizedResults.movies,  contentType: 'movie' },
    tvshows: { data: categorizedResults.tvShows, contentType: 'tv'    },
    people:  { data: categorizedResults.people,  contentType: 'person'}
  };

  const { data, contentType } = resultMap[category];

  if (!data || data.length === 0) {
    mediaGridContainer.innerHTML = '<div class="no-media">No results in this category</div>';
    return;
  }

  data.forEach(itemData => {
    const card = contentType === 'person'
      ? createPersonCard(itemData)
      : createMediaCard(itemData, contentType);
    mediaGridContainer.appendChild(card);
  });

  const total = searchTotalCounts[category];
  if (data.length < total) {
    loadMoreContainer.style.display = 'flex';
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.disabled = false;
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

function createMediaCard(itemData, contentType) {
  const mediaItemWrapper = document.createElement('div');
  mediaItemWrapper.setAttribute('class', 'media-item');

  const mediaColumnWrapper = document.createElement('div');
  mediaColumnWrapper.setAttribute('class', 'media-column');

  const mediaCard = document.createElement('div');
  mediaCard.setAttribute('class', 'media-card');

  const mediaThumbnail = document.createElement('img');
  mediaThumbnail.setAttribute('class', 'media-thumbnail');
  mediaThumbnail.setAttribute('id', 'image');

  if (itemData.poster_path) {
    mediaThumbnail.src = API_LINKS.IMG_PATH + itemData.poster_path;
    mediaThumbnail.onerror = function() { this.src = 'images/no-image.jpg'; };
  } else {
    mediaThumbnail.src = 'images/no-image.jpg';
  }

  const mediaTitle = document.createElement('p');
  mediaTitle.setAttribute('id', 'media-title');
  const title = itemData.title || itemData.name || '';
  mediaTitle.innerHTML = title;

  const userScore = document.createElement('div');
  userScore.setAttribute('class', 'user-score-grid');
  userScore.innerHTML = formatScore(itemData.vote_average);

  mediaCard.appendChild(mediaThumbnail);
  mediaCard.appendChild(mediaTitle);
  mediaCard.appendChild(userScore);

  const reviewsLink = document.createElement('a');
  reviewsLink.href = contentType === 'tv'
    ? `tv reviews/tvReviews.html?id=${itemData.id}&title=${encodeURIComponent(title)}`
    : `movie reviews/movieReviews.html?id=${itemData.id}&title=${encodeURIComponent(title)}`;
  reviewsLink.style.textDecoration = 'none';
  reviewsLink.style.color = 'inherit';

  reviewsLink.appendChild(mediaCard);
  mediaColumnWrapper.appendChild(reviewsLink);

  if (contentType !== 'person') {
    const watchlistItem = {
      id: String(itemData.id),
      title: title,
      year: itemData.release_date
        ? new Date(itemData.release_date).getFullYear()
        : (itemData.first_air_date ? new Date(itemData.first_air_date).getFullYear() : ''),
      mediaType: contentType === 'tv' ? 'tv' : 'movie',
      posterPath: itemData.poster_path || ''
    };

    const watchlistBtn = document.createElement('button');
    watchlistBtn.className = 'watchlist-card-btn';

    const updateWatchlistCardBtn = (inList) => {
      watchlistBtn.innerHTML = `<img src="images/${inList ? 'watchlist-saved' : 'watchlist-add'}.svg" class="watchlist-icon" alt="${inList ? 'Remove from watchlist' : 'Add to watchlist'}">`;
      watchlistBtn.setAttribute('aria-label', inList ? 'Remove from watchlist' : 'Add to watchlist');
    };

    updateWatchlistCardBtn(savedMediaIds.has(String(itemData.id)));

    watchlistBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isInList = savedMediaIds.has(String(watchlistItem.id));

      if (isInList) {
        const cachedName = localStorage.getItem('ccLastName');
        if (cachedName) {
          toggleWatchlistAPI(cachedName, watchlistItem)
            .then(status => {
              const nowInList = status === 'added';
              if (nowInList) savedMediaIds.add(String(watchlistItem.id));
              else savedMediaIds.delete(String(watchlistItem.id));
              updateWatchlistCardBtn(nowInList);
            })
            .catch(err => {
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
                if (nowInList) savedMediaIds.add(String(watchlistItem.id));
                else savedMediaIds.delete(String(watchlistItem.id));
                updateWatchlistCardBtn(nowInList);
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
              if (nowInList) savedMediaIds.add(String(watchlistItem.id));
              else savedMediaIds.delete(String(watchlistItem.id));
              updateWatchlistCardBtn(nowInList);
            } catch (err) {
              console.error('Watchlist toggle failed:', err);
              showErrorMessage('Failed to update watchlist. Please try again.');
            }
          }
        });
      }
    });

    mediaColumnWrapper.appendChild(watchlistBtn);
  }
  mediaItemWrapper.appendChild(mediaColumnWrapper);

  return mediaItemWrapper;
}

function getTopKnownForTitle(personData) {
  if (!personData.known_for || personData.known_for.length === 0) {
    return '';
  }

  const top = personData.known_for[0];

  return top.title || top.name || '';
}

function createPersonCard(personData) {
  const mediaItemWrapper = document.createElement('div');
  mediaItemWrapper.setAttribute('class', 'media-item');

  const mediaColumnWrapper = document.createElement('div');
  mediaColumnWrapper.setAttribute('class', 'media-column');

  const mediaCard = document.createElement('div');
  mediaCard.setAttribute('class', 'media-card');

  const profileThumbnail = document.createElement('img');
  profileThumbnail.setAttribute('class', 'media-thumbnail');

  if (personData.profile_path) {
    profileThumbnail.src = API_LINKS.IMG_PATH + personData.profile_path;
    profileThumbnail.onerror = function() { this.src = 'images/no-image-cast.jpg'; };
  } else {
    profileThumbnail.src = 'images/no-image-cast.jpg';
  }

  const personNameEl = document.createElement('p');
  personNameEl.setAttribute('id', 'media-title');
  const name = personData.name || '';
  personNameEl.textContent = name;

  const departmentEl = document.createElement('div');
  departmentEl.setAttribute('class', 'person-department-badge');
  const department = personData.known_for_department || 'Unknown';
  const topKnownFor = getTopKnownForTitle(personData);

  departmentEl.innerHTML = `
    <span class="person-department-main">${department}</span>
    ${topKnownFor ? `<span class="person-knownfor">${topKnownFor}</span>` : ''}
  `;

  mediaCard.appendChild(profileThumbnail);
  mediaCard.appendChild(personNameEl);
  mediaCard.appendChild(departmentEl);

  const personLink = document.createElement('a');
  personLink.href = `people/castMember.html?id=${personData.id}&name=${encodeURIComponent(name)}`;

  personLink.style.display = 'block'; 
  personLink.style.width = '100%';

  personLink.style.textDecoration = 'none';
  personLink.style.color = 'inherit';

  personLink.appendChild(mediaCard);
  mediaColumnWrapper.appendChild(personLink);

  mediaColumnWrapper.style.overflow = 'hidden';
  mediaColumnWrapper.style.width = '100%';
  mediaItemWrapper.appendChild(mediaColumnWrapper);

  return mediaItemWrapper;
}

function storeScrollPosition() {
  const filtersNav = document.getElementById('filters-nav');
  if (filtersNav) {
    sessionStorage.setItem('filtersScrollPosition', filtersNav.scrollLeft);
  }
}

function restoreScrollPosition() {
  const savedPosition = sessionStorage.getItem('filtersScrollPosition');
  if (savedPosition !== null) {
    const filtersNav = document.getElementById('filters-nav');
    if (filtersNav) {
      requestAnimationFrame(() => {
        filtersNav.scrollLeft = parseInt(savedPosition);
        sessionStorage.removeItem('filtersScrollPosition');
      });
    }
  }
}

window.addEventListener('load', restoreScrollPosition);

function loadMoreMedia() {
  if (isSearchActive) {
    loadMoreSearchResults();
    return;
  }
  if (isLoadingMedia || !hasMoreMedia) return;
  currentPage++;
  returnMedia(currentApiUrl, currentContentType, true);
}

function loadMoreSearchResults() {
  if (isLoadingMedia) return;
  isLoadingMedia = true;
  currentSearchPage++;
  loadMoreBtn.textContent = 'Loading';
  loadMoreBtn.disabled = true;

  fetch(API_LINKS.SEARCH_CATEGORIZED + encodeURIComponent(currentSearchTerm) + `&page=${currentSearchPage}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.json();
    })
    .then(data => {
      categorizedResults.movies  = [...categorizedResults.movies,  ...(data.movies  || [])];
      categorizedResults.tvShows = [...categorizedResults.tvShows, ...(data.tvShows || [])];
      categorizedResults.people  = [...categorizedResults.people,  ...(data.people  || [])];

      const newItemsMap = {
        movies:  data.movies  || [],
        tvshows: data.tvShows || [],
        people:  data.people  || []
      };
      const contentTypeMap = { movies: 'movie', tvshows: 'tv', people: 'person' };
      const newItems = newItemsMap[activeCategoryTab];
      const contentType = contentTypeMap[activeCategoryTab];

      newItems.forEach(itemData => {
        const card = contentType === 'person'
          ? createPersonCard(itemData)
          : createMediaCard(itemData, contentType);
        mediaGridContainer.appendChild(card);
      });

      const accumulatedMap = {
        movies:  categorizedResults.movies.length,
        tvshows: categorizedResults.tvShows.length,
        people:  categorizedResults.people.length
      };
      const accumulatedCount = accumulatedMap[activeCategoryTab];
      const total = searchTotalCounts[activeCategoryTab];

      if (accumulatedCount < total) {
        loadMoreContainer.style.display = 'flex';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.disabled = false;
      } else {
        loadMoreContainer.style.display = 'none';
      }

      isLoadingMedia = false;
    })
    .catch(error => {
      console.error('Error loading more search results:', error);
      isLoadingMedia = false;
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    });
}

moviesToggleBtn.addEventListener('click', () => {
  if (currentMediaToggle === 'movie') return;
  currentMediaToggle = 'movie';
  localStorage.setItem('ccMediaToggle', 'movie');
  updateToggleUI();
  ensureFiltersVisible();
  setActiveButton(trendingTodayButton);
  loadMoreContainer.style.display = 'none';
  const { url, contentType } = getFilterConfig('trending');
  returnMedia(url, contentType);
});

tvToggleBtn.addEventListener('click', () => {
  if (currentMediaToggle === 'tv') return;
  currentMediaToggle = 'tv';
  localStorage.setItem('ccMediaToggle', 'tv');
  updateToggleUI();
  ensureFiltersVisible();
  setActiveButton(trendingTodayButton);
  loadMoreContainer.style.display = 'none';
  const { url, contentType } = getFilterConfig('trending');
  returnMedia(url, contentType);
});

trendingTodayButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(trendingTodayButton);
  loadMoreContainer.style.display = 'none';
  const { url, contentType } = getFilterConfig('trending');
  returnMedia(url, contentType);
});

popularButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(popularButton);
  loadMoreContainer.style.display = 'none';
  const { url, contentType } = getFilterConfig('popular');
  returnMedia(url, contentType);
});

nowPlayingButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(nowPlayingButton);
  loadMoreContainer.style.display = 'none';
  const { url, contentType } = getFilterConfig('nowPlaying');
  returnMedia(url, contentType);
});

topRatedButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(topRatedButton);
  loadMoreContainer.style.display = 'none';
  const { url, contentType } = getFilterConfig('topRated');
  returnMedia(url, contentType);
});

reviewsButton.addEventListener("click", () => {
  storeScrollPosition();
  ensureFiltersVisible();
  setActiveButton(reviewsButton);
  loadMoreContainer.style.display = 'none';
  requestAnimationFrame(() => {
    window.location.href = `all reviews/allReviews.html`;
  });
});

watchlistButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "watchlist/watchlist.html";
});

reviewsActionButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "all reviews/allReviews.html";
});

watchlistActionButton.addEventListener("click", () => {
  storeScrollPosition();
  window.location.href = "watchlist/watchlist.html";
});

tabMoviesBtn.addEventListener('click', () => {
  if (!tabMoviesBtn.disabled) setActiveCategoryTab('movies');
});

tabTvshowsBtn.addEventListener('click', () => {
  if (!tabTvshowsBtn.disabled) setActiveCategoryTab('tvshows');
});

tabPeopleBtn.addEventListener('click', () => {
  if (!tabPeopleBtn.disabled) setActiveCategoryTab('people');
});