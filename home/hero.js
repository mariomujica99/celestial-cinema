import { buildDetailPageUrl } from './homeHelpers.js';

const API_LINKS = {
  HERO:             'https://celestial-cinema-backend.onrender.com/api/v1/movies/home/hero',
  POSTER_PATH:      'https://image.tmdb.org/t/p/w342',
  BACKDROP_SMALL:   'https://image.tmdb.org/t/p/w780',
  BACKDROP_LARGE:   'https://image.tmdb.org/t/p/w1280',
  UP_NEXT_THUMB:    'https://image.tmdb.org/t/p/w300'
};

const NO_POSTER_IMAGE = 'images/no-image.jpg';
const AUTOPLAY_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 50;
const WHEEL_THRESHOLD_PX = 60;
const WHEEL_GESTURE_END_MS = 150;
const MEDIA_TYPE_LABELS = { movie: 'Movie', tv: 'TV Show' };

const heroSection = document.getElementById('home-hero');
const heroSkeleton = document.getElementById('hero-skeleton');
const heroTrack = document.getElementById('hero-track');
const heroNavLayer = document.getElementById('hero-nav-layer');
const heroPrevBtn = document.getElementById('hero-prev-btn');
const heroNextBtn = document.getElementById('hero-next-btn');
const heroUpNext = document.getElementById('hero-up-next');
const heroUpNextList = document.getElementById('hero-up-next-list');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let heroSlides = [];
let activeSlideIndex = 0;
let autoplayTimeoutId = null;
let isAutoplayPaused = false;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartIndex = 0;
let wheelGestureStartIndex = null;
let wheelDeltaTotal = 0;
let isWheelGestureHandled = false;
let wheelGestureTimeoutId = null;

// ── Slide data ───────────────────────────────────────────────

function getSlideVideoKey(slide) {
  return getPrimaryVideo(slide.trailers || [])?.key;
}

function buildSlidePlayerUrl(slide) {
  return buildVideoPlayerUrl({
    mediaId: slide.id,
    mediaType: slide.mediaType,
    videoKey: getSlideVideoKey(slide),
    source: 'hero'
  });
}

function buildSlideWatchlistItem(slide) {
  return buildWatchlistItem({
    id: slide.id,
    title: slide.title,
    name: slide.title,
    poster_path: slide.posterPath,
    vote_average: slide.voteAverage,
    release_date: slide.releaseDate
  }, slide.mediaType);
}

// ── Slide rendering ──────────────────────────────────────────

function buildBackdropImage(slide, isFirstSlide) {
  const backdropImage = document.createElement('img');
  backdropImage.className = 'hero-backdrop';
  backdropImage.alt = '';
  backdropImage.src = `${API_LINKS.BACKDROP_SMALL}${slide.backdropPath}`;
  backdropImage.srcset = `${API_LINKS.BACKDROP_SMALL}${slide.backdropPath} 780w, ${API_LINKS.BACKDROP_LARGE}${slide.backdropPath} 1280w`;
  backdropImage.sizes = '(min-width: 1112px) 70vw, 100vw';
  backdropImage.loading = isFirstSlide ? 'eager' : 'lazy';
  if (isFirstSlide) backdropImage.fetchPriority = 'high';
  return backdropImage;
}

function buildStage(slide, isFirstSlide) {
  const playButton = document.createElement('span');
  playButton.className = 'hero-play';
  playButton.setAttribute('aria-hidden', 'true');

  const stageLink = document.createElement('a');
  stageLink.className = 'hero-stage';
  stageLink.href = buildSlidePlayerUrl(slide);
  stageLink.setAttribute('aria-label', `Play ${slide.title} trailer`);
  stageLink.append(buildBackdropImage(slide, isFirstSlide), playButton);
  return stageLink;
}

function buildPosterImage(posterPath) {
  const posterImage = document.createElement('img');
  posterImage.className = 'hero-poster';
  posterImage.alt = '';
  posterImage.src = `${API_LINKS.POSTER_PATH}${posterPath}`;
  posterImage.addEventListener('error', () => { posterImage.src = NO_POSTER_IMAGE; }, { once: true });
  return posterImage;
}

function buildPosterWrap(slide, detailUrl, savedMediaIds) {
  if (!slide.posterPath) return null;

  const posterLink = document.createElement('a');
  posterLink.href = detailUrl;
  posterLink.appendChild(buildPosterImage(slide.posterPath));

  const posterWrap = document.createElement('div');
  posterWrap.className = 'hero-poster-wrap';
  posterWrap.append(
    posterLink,
    createWatchlistCardButton(buildSlideWatchlistItem(slide), savedMediaIds)
  );
  return posterWrap;
}

function buildMetaLine(slide) {
  const releaseYear = getMediaYear({ release_date: slide.releaseDate });
  const scoreText = slide.voteAverage ? formatScore(slide.voteAverage) : '';

  const metaLine = document.createElement('div');
  metaLine.className = 'hero-slide-meta';
  metaLine.innerHTML = buildInfoLineHTML([MEDIA_TYPE_LABELS[slide.mediaType], releaseYear, scoreText]);
  return metaLine;
}

async function addCcmdbRatings() {
  try {
    const getRatingKey = slide => `${slide.mediaType}:${slide.id}`;
    const ratingsByKey = await fetchCcmdbRatings(heroSlides.map(getRatingKey));
    const metaLines = heroTrack.querySelectorAll('.hero-slide-meta');

    heroSlides.forEach((slide, slideIndex) => {
      const averageRating = ratingsByKey[getRatingKey(slide)]?.average ?? null;
      metaLines[slideIndex].insertAdjacentHTML('beforeend', buildCcmdbMetaItemHTML(averageRating));
    });
  } catch (error) {
    console.error('Failed to load CCMDb ratings:', error);
  }
}

function buildSlideText(slide, detailUrl) {
  const titleLink = createTextElement('a', 'hero-slide-title', slide.title);
  titleLink.href = detailUrl;

  const textWrap = document.createElement('div');
  textWrap.className = 'hero-slide-text';
  textWrap.append(
    titleLink,
    createTextElement('p', 'hero-slide-subtitle', 'Watch the Trailer'),
    buildMetaLine(slide)
  );
  return textWrap;
}

function buildSlide(slide, slideIndex, savedMediaIds) {
  const detailUrl = buildDetailPageUrl(slide.id, slide.mediaType, slide.title);

  const slideInfo = document.createElement('div');
  slideInfo.className = 'hero-slide-info';
  slideInfo.append(
    ...[buildPosterWrap(slide, detailUrl, savedMediaIds), buildSlideText(slide, detailUrl)].filter(Boolean)
  );

  const slideElement = document.createElement('article');
  slideElement.className = 'hero-slide';
  slideElement.append(buildStage(slide, slideIndex === 0), slideInfo);
  return slideElement;
}

// ── Up next (desktop) ────────────────────────────────────────

function buildUpNextItem(slide) {
  const thumbImage = document.createElement('img');
  thumbImage.className = 'hero-up-next-thumb';
  thumbImage.alt = '';
  thumbImage.loading = 'lazy';
  thumbImage.src = `${API_LINKS.UP_NEXT_THUMB}${slide.backdropPath}`;

  const itemText = document.createElement('div');
  itemText.className = 'hero-up-next-text';
  itemText.append(
    createTextElement('p', 'hero-up-next-item-title', slide.title),
    createTextElement('p', 'hero-up-next-item-subtitle', MEDIA_TYPE_LABELS[slide.mediaType])
  );

  const itemLink = document.createElement('a');
  itemLink.className = 'hero-up-next-item';
  itemLink.href = buildSlidePlayerUrl(slide);
  itemLink.append(thumbImage, itemText);
  return itemLink;
}

function renderUpNext() {
  const upNextItems = [];

  for (let offset = 1; offset < heroSlides.length; offset++) {
    const upNextSlide = heroSlides[(activeSlideIndex + offset) % heroSlides.length];
    upNextItems.push(buildUpNextItem(upNextSlide));
  }
  heroUpNextList.replaceChildren(...upNextItems);
}

// ── Navigation ───────────────────────────────────────────────

function scrollToSlide(slideIndex) {
  const slideCount = heroSlides.length;
  const targetIndex = (slideIndex + slideCount) % slideCount;
  heroTrack.scrollTo({ left: targetIndex * heroTrack.clientWidth, behavior: 'smooth' });
}

function handleTrackScroll() {
  const scrolledIndex = Math.round(heroTrack.scrollLeft / heroTrack.clientWidth);
  if (scrolledIndex === activeSlideIndex) return;

  activeSlideIndex = scrolledIndex;
  renderUpNext();
  scheduleAutoplay();
}

// ── Edge swipe (wrap first <-> last) ─────────────────────────

function wrapAtEdge(isForward, fromIndex) {
  const lastIndex = heroSlides.length - 1;
  if (isForward && fromIndex === lastIndex) scrollToSlide(0);
  if (!isForward && fromIndex === 0) scrollToSlide(lastIndex);
}

function handleSwipeStart(touchEvent) {
  const { clientX, clientY } = touchEvent.touches[0];
  swipeStartX = clientX;
  swipeStartY = clientY;
  swipeStartIndex = activeSlideIndex;
  pauseAutoplay();
}

function handleSwipeEnd(touchEvent) {
  const { clientX, clientY } = touchEvent.changedTouches[0];
  const deltaX = clientX - swipeStartX;
  const deltaY = clientY - swipeStartY;
  resumeAutoplay();

  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) return;
  wrapAtEdge(deltaX < 0, swipeStartIndex);
}

function resetWheelGesture() {
  wheelGestureStartIndex = null;
  wheelDeltaTotal = 0;
  isWheelGestureHandled = false;
}

function handleTrackWheel(wheelEvent) {
  if (Math.abs(wheelEvent.deltaX) <= Math.abs(wheelEvent.deltaY)) return;

  if (wheelGestureStartIndex === null) wheelGestureStartIndex = activeSlideIndex;
  clearTimeout(wheelGestureTimeoutId);
  wheelGestureTimeoutId = setTimeout(resetWheelGesture, WHEEL_GESTURE_END_MS);

  wheelDeltaTotal += wheelEvent.deltaX;
  if (isWheelGestureHandled || Math.abs(wheelDeltaTotal) < WHEEL_THRESHOLD_PX) return;

  isWheelGestureHandled = true;
  wrapAtEdge(wheelDeltaTotal > 0, wheelGestureStartIndex);
}

// ── Autoplay ─────────────────────────────────────────────────

function scheduleAutoplay() {
  clearTimeout(autoplayTimeoutId);
  if (isAutoplayPaused || prefersReducedMotion.matches) return;

  autoplayTimeoutId = setTimeout(() => scrollToSlide(activeSlideIndex + 1), AUTOPLAY_INTERVAL_MS);
}

function pauseAutoplay() {
  isAutoplayPaused = true;
  clearTimeout(autoplayTimeoutId);
}

function resumeAutoplay() {
  isAutoplayPaused = false;
  scheduleAutoplay();
}

function initAutoplay() {
  heroSection.addEventListener('pointerenter', (pointerEvent) => {
    if (pointerEvent.pointerType === 'mouse') pauseAutoplay();
  });
  heroSection.addEventListener('pointerleave', (pointerEvent) => {
    if (pointerEvent.pointerType === 'mouse') resumeAutoplay();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAutoplay();
    else resumeAutoplay();
  });
  scheduleAutoplay();
}

// ── Navigation ───────────────────────────────────────────────

function initNavigation() {
  heroPrevBtn.addEventListener('click', () => scrollToSlide(activeSlideIndex - 1));
  heroNextBtn.addEventListener('click', () => scrollToSlide(activeSlideIndex + 1));
  heroTrack.addEventListener('scroll', handleTrackScroll, { passive: true });
  heroTrack.addEventListener('touchstart', handleSwipeStart, { passive: true });
  heroTrack.addEventListener('touchend', handleSwipeEnd, { passive: true });
  heroTrack.addEventListener('touchcancel', resumeAutoplay, { passive: true });
  heroTrack.addEventListener('wheel', handleTrackWheel, { passive: true });
}

// ── Init ─────────────────────────────────────────────────────

function hideHero() {
  heroSection.hidden = true;
}

function showSlides(savedMediaIds) {
  const slideElements = heroSlides.map((slide, slideIndex) => buildSlide(slide, slideIndex, savedMediaIds));
  heroTrack.replaceChildren(...slideElements);
  heroSkeleton.hidden = true;
  heroTrack.hidden = false;
  addCcmdbRatings();

  if (heroSlides.length < 2) return;
  heroNavLayer.hidden = false;
  heroUpNext.hidden = false;
  renderUpNext();
  initNavigation();
  initAutoplay();
}

export async function initHero(savedMediaIdsPromise) {
  try {
    const [heroData, savedMediaIds] = await Promise.all([
      fetchJsonOrThrow(API_LINKS.HERO),
      savedMediaIdsPromise
    ]);
    heroSlides = (heroData.results || []).filter(slide => getSlideVideoKey(slide));

    if (heroSlides.length === 0) {
      hideHero();
      return;
    }
    showSlides(savedMediaIds);
  } catch (error) {
    console.error('Error loading hero:', error);
    hideHero();
  }
}