const playerParams = new URL(location.href).searchParams;
const mediaId = playerParams.get('id');
const mediaType = playerParams.get('type') === 'tv' ? 'tv' : 'movie';
const requestedVideoKey = playerParams.get('key');
const requestedSource = playerParams.get('from');

const API_LINKS = {
  MOVIE_VIDEOS:  `https://celestial-cinema-backend.onrender.com/api/v1/movies/videos/${mediaId}`,
  TV_VIDEOS:     `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/videos/${mediaId}`,
  MOVIE_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/details/${mediaId}`,
  TV_DETAILS:    `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${mediaId}`,
  HOME_HERO:     'https://celestial-cinema-backend.onrender.com/api/v1/movies/home/hero',
  POSTER_PATH:   'https://image.tmdb.org/t/p/w342',
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w780',
  YOUTUBE_EMBED: 'https://www.youtube.com/embed/'
};

const NO_POSTER_IMAGE = '../images/no-image.jpg';

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');
const closeBtn = document.getElementById('video-player-close');
const playerIframe = document.getElementById('video-player-iframe');
const playerEmptyState = document.getElementById('video-player-empty');
const playerEmptyText = document.getElementById('video-player-empty-text');
const playerEmptyBtn = document.getElementById('video-player-empty-btn');
const playerInfo = document.getElementById('video-player-info');
const upNextSection = document.getElementById('up-next-section');
const upNextContainer = document.getElementById('up-next-container');

let savedMediaIds = new Set();

initSearchRedirect(searchForm, searchInput);

// ── Navigation ───────────────────────────────────────────────

function buildDetailPageUrl(mediaTitle = '') {
  const detailPage = mediaType === 'tv'
    ? '../tv reviews/tvReviews.html'
    : '../movie reviews/movieReviews.html';
  return `${detailPage}?id=${mediaId}&title=${encodeURIComponent(mediaTitle)}`;
}

function handleCloseClick() {
  if (document.referrer && history.length > 1) {
    history.back();
    return;
  }
  window.location.href = buildDetailPageUrl();
}

function handleUpNextClick(event) {
  const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;
  if (isModifiedClick) return;

  event.preventDefault();
  window.location.replace(event.currentTarget.href);
}

closeBtn.addEventListener('click', handleCloseClick);
playerEmptyBtn.addEventListener('click', handleCloseClick);

// ── Player ───────────────────────────────────────────────────

function playVideo(videoKey) {
  const embedParams = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0' });
  playerIframe.src = `${API_LINKS.YOUTUBE_EMBED}${encodeURIComponent(videoKey)}?${embedParams.toString()}`;
}

function showEmptyState(message) {
  playerIframe.remove();
  playerEmptyText.textContent = message;
  playerEmptyState.hidden = false;
}

function startResolvedVideo(playlist) {
  if (!playlist) {
    showEmptyState('Failed to load | Please try again later');
    return;
  }
  if (!playlist.currentVideo) {
    showEmptyState('No trailer available');
    return;
  }
  playVideo(playlist.currentVideo.key);
}

// ── Data ─────────────────────────────────────────────────────

function unwrapSettledResult(settledResult, errorMessage) {
  if (settledResult.status === 'fulfilled') return settledResult.value;
  console.error(errorMessage, settledResult.reason);
  return null;
}

function fetchMediaDetails() {
  const detailsUrl = mediaType === 'tv' ? API_LINKS.TV_DETAILS : API_LINKS.MOVIE_DETAILS;
  return fetchJsonOrThrow(detailsUrl);
}

async function fetchMediaTrailers() {
  const videosUrl = mediaType === 'tv' ? API_LINKS.TV_VIDEOS : API_LINKS.MOVIE_VIDEOS;
  const videosData = await fetchJsonOrThrow(videosUrl);
  return videosData.results || [];
}

async function fetchHeroSlides() {
  const heroData = await fetchJsonOrThrow(API_LINKS.HOME_HERO);
  return heroData.results || [];
}

function resolveCurrentVideo(trailers) {
  if (!requestedVideoKey) return getPrimaryVideo(trailers);
  return trailers.find(video => video.key === requestedVideoKey)
    || { key: requestedVideoKey, name: '' };
}

function buildMediaUpNextCards(trailers, currentVideo) {
  return trailers
    .filter(video => video.key !== currentVideo.key)
    .map(video => buildVideoStripCard({
      title: video.name,
      thumbUrl: getVideoThumbUrl(video.key),
      playerUrl: buildVideoPlayerUrl({ mediaId, mediaType, videoKey: video.key, source: 'media' })
    }));
}

async function loadMediaPlaylist() {
  const trailers = await fetchMediaTrailers();
  const currentVideo = resolveCurrentVideo(trailers);
  const upNextCards = currentVideo ? buildMediaUpNextCards(trailers, currentVideo) : [];
  return { currentVideo, upNextCards };
}

function isCurrentSlide(slide) {
  return String(slide.id) === mediaId && slide.mediaType === mediaType;
}

function buildHeroUpNextCards(slides) {
  return slides
    .filter(slide => !isCurrentSlide(slide))
    .map(slide => buildVideoStripCard({
      title: slide.title,
      thumbUrl: `${API_LINKS.BACKDROP_PATH}${slide.backdropPath}`,
      playerUrl: buildVideoPlayerUrl({
        mediaId: slide.id,
        mediaType: slide.mediaType,
        videoKey: getPrimaryVideo(slide.trailers)?.key,
        source: 'hero'
      })
    }));
}

async function loadHeroPlaylist() {
  const slides = await fetchHeroSlides();
  const currentSlide = slides.find(isCurrentSlide);
  const currentVideo = currentSlide?.trailers.find(video => video.key === requestedVideoKey)
    || { key: requestedVideoKey, name: '' };
  return { currentVideo, upNextCards: buildHeroUpNextCards(slides) };
}

function loadPlaylist() {
  const isHeroSource = requestedSource === 'hero' && Boolean(requestedVideoKey);
  return isHeroSource ? loadHeroPlaylist() : loadMediaPlaylist();
}

// ── Up next ──────────────────────────────────────────────────

function renderUpNext(upNextCards) {
  if (upNextCards.length === 0) return;

  upNextCards.forEach(card => {
    card.querySelector('.video-strip-link').addEventListener('click', handleUpNextClick);
    upNextContainer.appendChild(card);
  });
  upNextContainer.classList.toggle('is-single', upNextCards.length === 1);
  upNextSection.hidden = false;
}

// ── Info panel ───────────────────────────────────────────────

function getMediaContentRating(mediaDetails) {
  return mediaType === 'tv'
    ? getTVContentRating(mediaDetails)
    : getMovieContentRating(mediaDetails);
}

function buildMediaMetaText(mediaDetails) {
  const genreNames = (mediaDetails.genres || []).map(genre => genre.name).join(', ');
  return [getMediaContentRating(mediaDetails), genreNames].filter(Boolean).join(' | ');
}

function buildPosterImage(posterPath) {
  const posterImage = document.createElement('img');
  posterImage.className = 'video-player-poster';
  posterImage.alt = '';
  posterImage.src = posterPath ? `${API_LINKS.POSTER_PATH}${posterPath}` : NO_POSTER_IMAGE;
  posterImage.addEventListener('error', () => { posterImage.src = NO_POSTER_IMAGE; }, { once: true });
  return posterImage;
}

function buildPosterWrap(mediaDetails, detailUrl) {
  const posterLink = document.createElement('a');
  posterLink.href = detailUrl;
  posterLink.appendChild(buildPosterImage(mediaDetails.poster_path));

  const watchlistItem = buildWatchlistItem(mediaDetails, mediaType);
  const posterWrap = document.createElement('div');
  posterWrap.className = 'video-player-poster-wrap';
  posterWrap.append(posterLink, createWatchlistCardButton(watchlistItem, savedMediaIds));
  return posterWrap;
}

function buildMediaLink(mediaDetails, mediaTitle, detailUrl) {
  const year = getMediaYear(mediaDetails);
  const textWrap = document.createElement('div');
  textWrap.className = 'video-player-media-text';
  textWrap.append(
    createTextElement('p', 'video-player-media-title', year ? `${mediaTitle} (${year})` : mediaTitle),
    createTextElement('p', 'video-player-media-meta', buildMediaMetaText(mediaDetails))
  );

  const mediaLink = document.createElement('a');
  mediaLink.className = 'video-player-media-link';
  mediaLink.href = detailUrl;
  mediaLink.append(textWrap, createTextElement('span', 'video-player-media-chevron', '›'));
  return mediaLink;
}

function buildMediaRow(mediaDetails) {
  const mediaTitle = mediaDetails.title || mediaDetails.name || '';
  const detailUrl = buildDetailPageUrl(mediaTitle);

  const mediaRow = document.createElement('div');
  mediaRow.className = 'video-player-media';
  mediaRow.append(
    buildPosterWrap(mediaDetails, detailUrl),
    buildMediaLink(mediaDetails, mediaTitle, detailUrl)
  );
  return mediaRow;
}

function buildOverviewToggle(detailsSection) {
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'video-player-overview-toggle';
  toggleBtn.setAttribute('aria-label', 'Show more');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.innerHTML = '<span class="video-player-chevron">▾</span>';

  toggleBtn.addEventListener('click', () => {
    const isExpanded = detailsSection.classList.toggle('is-expanded');
    toggleBtn.setAttribute('aria-expanded', String(isExpanded));
    toggleBtn.setAttribute('aria-label', isExpanded ? 'Show less' : 'Show more');
  });
  return toggleBtn;
}

function buildVideoDetails(videoName, overviewText) {
  if (!videoName && !overviewText) return null;

  const detailsSection = document.createElement('div');
  detailsSection.className = 'video-player-details';
  if (videoName) {
    detailsSection.appendChild(createTextElement('h1', 'video-player-video-title', videoName));
  }
  if (overviewText) {
    detailsSection.append(
      createTextElement('p', 'video-player-overview', overviewText),
      buildOverviewToggle(detailsSection)
    );
  }
  return detailsSection;
}

function updateOverviewToggleVisibility() {
  const overviewElement = playerInfo.querySelector('.video-player-overview');
  const toggleBtn = playerInfo.querySelector('.video-player-overview-toggle');
  if (!overviewElement || !toggleBtn) return;
  if (overviewElement.parentElement.classList.contains('is-expanded')) return;

  toggleBtn.hidden = overviewElement.scrollHeight <= overviewElement.clientHeight + 1;
}

function renderInfoPanel(mediaDetails, videoName) {
  if (mediaDetails) playerInfo.appendChild(buildMediaRow(mediaDetails));

  const videoDetails = buildVideoDetails(videoName, mediaDetails?.overview || '');
  if (videoDetails) playerInfo.appendChild(videoDetails);
  updateOverviewToggleVisibility();
}

// ── Init ─────────────────────────────────────────────────────

async function initPlayerPage() {
  if (!/^\d+$/.test(mediaId || '')) {
    showEmptyState('This video link is not valid');
    return;
  }
  if (requestedVideoKey) playVideo(requestedVideoKey);

  const [detailsResult, playlistResult, savedIdsResult] = await Promise.allSettled([
    fetchMediaDetails(),
    loadPlaylist(),
    loadSavedMediaIds()
  ]);
  savedMediaIds = unwrapSettledResult(savedIdsResult, 'Error loading saved media ids:') || new Set();
  const mediaDetails = unwrapSettledResult(detailsResult, 'Error loading media details:');
  const playlist = unwrapSettledResult(playlistResult, 'Error loading playlist:');

  if (!requestedVideoKey) startResolvedVideo(playlist);
  renderUpNext(playlist?.upNextCards || []);
  renderInfoPanel(mediaDetails, playlist?.currentVideo?.name || '');
}

window.addEventListener('resize', debounce(updateOverviewToggleVisibility, 150));
document.fonts?.ready.then(updateOverviewToggleVisibility);

initPlayerPage();