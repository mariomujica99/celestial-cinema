const IMAGES_TMDB_BASE_URL = 'https://image.tmdb.org/t/p';
const IMAGES_THUMB_SIZE = 'w500';
const IMAGES_GRID_SIZE = 'w780';
const IMAGES_POSTER_GRID_SIZE = 'w500';
const IMAGES_GALLERY_SIZE = 'w1280';
const IMAGES_STRIP_LIMIT = 6;
const IMAGES_SWIPE_THRESHOLD_PX = 50;
const IMAGES_MAX_ZOOM = 4;
const IMAGES_DOUBLE_TAP_ZOOM = 2.5;
const IMAGES_DOUBLE_TAP_MS = 300;
const IMAGES_TAP_MAX_MOVE_PX = 10;
const IMAGES_WHEEL_ZOOM_SPEED = 0.002;
const IMAGES_PINCH_WHEEL_ZOOM_SPEED = 0.01;
const IMAGES_WHEEL_SWIPE_THRESHOLD_PX = 60;
const IMAGES_WHEEL_IDLE_MS = 150;
const IMAGES_WHEEL_NEW_SWIPE_MIN_DELTA = 8;
const IMAGES_WHEEL_DECAY_RATIO = 0.5;
const IMAGES_ZOOMED_MIN_SCALE = 1.05;

function buildImageUrl(filePath, size) {
  return `${IMAGES_TMDB_BASE_URL}/${size}${filePath}`;
}

function isPosterImage(image) {
  return image.height > image.width;
}

function showImageStripSkeleton(section) {
  const container = section.querySelector('.images-container');
  if (!container) return;

  showSkeletonCards(container, IMAGES_STRIP_LIMIT, 'image');
  section.style.display = 'block';
}

/**
 * Fetches backdrops and renders the horizontal image strip on detail pages.
 * The .images-section must start with style="display:none;" in HTML.
 * It is revealed only when backdrops are found.
 *
 * @param {object} options
 * @param {string} options.imagesUrl  - Full backend API URL for this media's images
 * @param {string} options.mediaId    - TMDB media ID
 * @param {string} options.mediaType  - 'movie' | 'tv'
 * @param {string} options.mediaTitle - Used in the View All navigation URL
 */
async function loadImageStrip({ imagesUrl, mediaId, mediaType, mediaTitle }) {
  const section = document.querySelector('.images-section');
  if (!section) return;

  showImageStripSkeleton(section);

  try {
    const res = await fetch(imagesUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const { backdrops = [], posters = [] } = await res.json();

    if (backdrops.length === 0) {
      section.style.display = 'none';
      return;
    }

    renderImageStrip(section, backdrops);
    bindImagesViewAll(section, {
      imageCount: backdrops.length + posters.length,
      mediaId,
      mediaType,
      mediaTitle
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    section.style.display = 'none';
  }
}

function renderImageStrip(section, backdrops) {
  const container = section.querySelector('.images-container');
  if (!container) return;

  container.innerHTML = '';
  backdrops.slice(0, IMAGES_STRIP_LIMIT).forEach((_, index) => {
    container.appendChild(createImageStripCard(backdrops, index));
  });
}

function bindImagesViewAll(section, { imageCount, mediaId, mediaType, mediaTitle }) {
  const viewAllBtn = section.querySelector('.view-all-btn');
  if (!viewAllBtn) return;

  setViewAllLabel(viewAllBtn, imageCount);
  viewAllBtn.style.display = '';
  viewAllBtn.addEventListener('click', () => {
    window.location.href =
      `../media images/mediaImages.html?id=${mediaId}&type=${mediaType}&title=${encodeURIComponent(mediaTitle)}`;
  });
}

function createImageThumb(image, size) {
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'image-thumb-wrap';
  thumbWrap.classList.toggle('is-poster', isPosterImage(image));

  const thumbImg = document.createElement('img');
  thumbImg.className = 'image-thumb';
  thumbImg.src = buildImageUrl(image.file_path, size);
  thumbImg.alt = isPosterImage(image) ? 'Poster' : 'Backdrop';
  thumbImg.loading = 'lazy';

  thumbWrap.appendChild(thumbImg);
  return thumbWrap;
}

/**
 * @param {object[]} backdrops - Full backdrops array (gallery navigates all of them)
 * @param {number} index       - Index of this card's image
 */
function createImageStripCard(backdrops, index) {
  const card = document.createElement('div');
  card.className = 'image-strip-card';
  card.appendChild(createImageThumb(backdrops[index], IMAGES_THUMB_SIZE));
  card.addEventListener('click', () => openImageGallery(backdrops, index));
  return card;
}

function createImageGridCard(galleryImages, index) {
  const image = galleryImages[index];
  const thumbSize = isPosterImage(image) ? IMAGES_POSTER_GRID_SIZE : IMAGES_GRID_SIZE;

  const card = document.createElement('div');
  card.className = 'image-grid-card';
  card.appendChild(createImageThumb(image, thumbSize));
  card.addEventListener('click', () => openImageGallery(galleryImages, index));
  return card;
}

/**
 * Renders a slice of the gallery images into a full-page grid (used by mediaImages.js).
 * The gallery always navigates the full list, so cards keep their index in it.
 *
 * @param {HTMLElement} gridContainer
 * @param {object[]} galleryImages - Backdrops followed by posters
 * @param {{ start?: number, end?: number }} [range] - Slice of galleryImages to render
 */
function renderImageGrid(gridContainer, galleryImages, { start = 0, end = galleryImages.length } = {}) {
  const fragment = document.createDocumentFragment();
  for (let index = start; index < end; index++) {
    fragment.appendChild(createImageGridCard(galleryImages, index));
  }
  gridContainer.innerHTML = '';
  gridContainer.appendChild(fragment);
}

function buildImageGalleryOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'image-gallery-overlay';
  overlay.className = 'image-gallery-overlay';
  overlay.innerHTML = `
    <div class="image-gallery-header">
      <button class="image-gallery-close" aria-label="Close gallery">✕ Close</button>
      <span class="image-gallery-counter"></span>
    </div>
    <button class="image-gallery-nav image-gallery-prev" aria-label="Previous image">‹</button>
    <div class="image-gallery-stage">
      <img class="image-gallery-image" alt="" draggable="false">
    </div>
    <button class="image-gallery-nav image-gallery-next" aria-label="Next image">›</button>
  `;
  return overlay;
}

function renderGalleryImage(overlay, backdrops, index) {
  overlay.querySelector('.image-gallery-image').src =
    buildImageUrl(backdrops[index].file_path, IMAGES_GALLERY_SIZE);
  overlay.querySelector('.image-gallery-counter').textContent =
    `${index + 1} of ${backdrops.length}`;
}

function bindGalleryControls(overlay, { onPrevious, onNext, onClose }) {
  overlay.querySelector('.image-gallery-prev').addEventListener('click', onPrevious);
  overlay.querySelector('.image-gallery-next').addEventListener('click', onNext);
  overlay.querySelector('.image-gallery-close').addEventListener('click', onClose);
}

function createGalleryView(overlay, { onPrevious, onNext }) {
  return {
    overlay,
    imageElement: overlay.querySelector('.image-gallery-image'),
    onPrevious,
    onNext,
    scale: 1,
    x: 0,
    y: 0,
    pointers: new Map(),
    startPoint: { x: 0, y: 0 },
    wasMultiTouch: false,
    lastTapTime: 0,
    pinchDistance: 1,
    pinchScale: 1,
    pinchCenter: { x: 0, y: 0 },
    chromeToggleTimer: null,
    wheelDeltaX: 0,
    wheelPeakDelta: 0,
    hasWheelDecayed: false,
    isWheelSwiping: false,
    isWheelSwipeLocked: false,
    wheelIdleTimer: null
  };
}

function getPanLimits(galleryView, scale) {
  const { overlay, imageElement } = galleryView;
  if (!imageElement.naturalWidth) return { maxX: 0, maxY: 0 };

  const fitRatio = Math.min(
    imageElement.offsetWidth / imageElement.naturalWidth,
    imageElement.offsetHeight / imageElement.naturalHeight
  );
  const zoomedWidth = imageElement.naturalWidth * fitRatio * scale;
  const zoomedHeight = imageElement.naturalHeight * fitRatio * scale;
  return {
    maxX: Math.max(0, (zoomedWidth - overlay.clientWidth) / 2),
    maxY: Math.max(0, (zoomedHeight - overlay.clientHeight) / 2)
  };
}

function updateGalleryView(galleryView, { scale, x, y }) {
  const { maxX, maxY } = getPanLimits(galleryView, scale);
  galleryView.scale = scale;
  galleryView.x = clampValue(x, -maxX, maxX);
  galleryView.y = clampValue(y, -maxY, maxY);
  galleryView.imageElement.style.transform =
    `translate(${galleryView.x}px, ${galleryView.y}px) scale(${scale})`;
}

function resetGalleryView(galleryView) {
  updateGalleryView(galleryView, { scale: 1, x: 0, y: 0 });
}

function panGalleryView(galleryView, delta) {
  updateGalleryView(galleryView, {
    scale: galleryView.scale,
    x: galleryView.x + delta.x,
    y: galleryView.y + delta.y
  });
}

// Zooms while keeping the content under `point` fixed on screen.
function zoomGalleryAt(galleryView, requestedScale, point) {
  const nextScale = clampValue(requestedScale, 1, IMAGES_MAX_ZOOM);
  const offsetX = point.x - galleryView.overlay.clientWidth / 2;
  const offsetY = point.y - galleryView.overlay.clientHeight / 2;
  const ratio = nextScale / galleryView.scale;

  updateGalleryView(galleryView, {
    scale: nextScale,
    x: offsetX - (offsetX - galleryView.x) * ratio,
    y: offsetY - (offsetY - galleryView.y) * ratio
  });
}

function getPointerDistance(pointers) {
  const [first, second] = [...pointers.values()];
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getPointerCenter(pointers) {
  const [first, second] = [...pointers.values()];
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function startGalleryPinch(galleryView) {
  galleryView.wasMultiTouch = true;
  galleryView.pinchDistance = getPointerDistance(galleryView.pointers);
  galleryView.pinchScale = galleryView.scale;
  galleryView.pinchCenter = getPointerCenter(galleryView.pointers);
}

function pinchGalleryView(galleryView) {
  const center = getPointerCenter(galleryView.pointers);
  const distanceRatio = getPointerDistance(galleryView.pointers) / galleryView.pinchDistance;

  panGalleryView(galleryView, {
    x: center.x - galleryView.pinchCenter.x,
    y: center.y - galleryView.pinchCenter.y
  });
  galleryView.pinchCenter = center;
  zoomGalleryAt(galleryView, galleryView.pinchScale * distanceRatio, center);
}

function toggleGalleryChrome(overlay) {
  overlay.classList.toggle('is-chrome-hidden');
}

function isGalleryZoomed(galleryView) {
  return galleryView.scale > IMAGES_ZOOMED_MIN_SCALE;
}

function handleGalleryTap(galleryView, point) {
  const now = Date.now();
  const isDoubleTap = now - galleryView.lastTapTime < IMAGES_DOUBLE_TAP_MS;
  clearTimeout(galleryView.chromeToggleTimer);
  galleryView.lastTapTime = isDoubleTap ? 0 : now;

  if (isDoubleTap) {
    const nextScale = isGalleryZoomed(galleryView) ? 1 : IMAGES_DOUBLE_TAP_ZOOM;
    zoomGalleryAt(galleryView, nextScale, point);
    return;
  }
  galleryView.chromeToggleTimer = setTimeout(
    () => toggleGalleryChrome(galleryView.overlay),
    IMAGES_DOUBLE_TAP_MS
  );
}

function handleGallerySwipe(galleryView, delta) {
  if (isGalleryZoomed(galleryView)) return;
  if (Math.abs(delta.x) < IMAGES_SWIPE_THRESHOLD_PX) return;
  if (Math.abs(delta.x) < Math.abs(delta.y)) return;

  if (delta.x > 0) {
    galleryView.onPrevious();
  } else {
    galleryView.onNext();
  }
}

function handleGesturePointerDown(event, galleryView) {
  if (event.target.closest('button')) return;

  galleryView.overlay.setPointerCapture(event.pointerId);
  galleryView.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (galleryView.pointers.size === 1) {
    galleryView.startPoint = { x: event.clientX, y: event.clientY };
    galleryView.wasMultiTouch = false;
  } else if (galleryView.pointers.size === 2) {
    startGalleryPinch(galleryView);
  }
}

function handleGesturePointerMove(event, galleryView) {
  const previous = galleryView.pointers.get(event.pointerId);
  if (!previous) return;

  galleryView.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (galleryView.pointers.size === 2) {
    pinchGalleryView(galleryView);
  } else if (isGalleryZoomed(galleryView)) {
    panGalleryView(galleryView, { x: event.clientX - previous.x, y: event.clientY - previous.y });
  }
}

function handleGesturePointerEnd(event, galleryView) {
  if (!galleryView.pointers.has(event.pointerId)) return;

  const wasSinglePointer = galleryView.pointers.size === 1;
  galleryView.pointers.delete(event.pointerId);
  if (event.type === 'pointercancel' || !wasSinglePointer || galleryView.wasMultiTouch) return;

  const delta = {
    x: event.clientX - galleryView.startPoint.x,
    y: event.clientY - galleryView.startPoint.y
  };
  if (Math.hypot(delta.x, delta.y) < IMAGES_TAP_MAX_MOVE_PX) {
    handleGalleryTap(galleryView, { x: event.clientX, y: event.clientY });
    return;
  }
  handleGallerySwipe(galleryView, delta);
}

function releaseWheelSwipeLock(galleryView) {
  galleryView.isWheelSwipeLocked = false;
  galleryView.wheelDeltaX = 0;
  galleryView.wheelPeakDelta = 0;
  galleryView.hasWheelDecayed = false;
}

function markWheelSwipeActive(galleryView) {
  galleryView.isWheelSwiping = true;
  clearTimeout(galleryView.wheelIdleTimer);
  galleryView.wheelIdleTimer = setTimeout(() => {
    galleryView.isWheelSwiping = false;
    releaseWheelSwipeLock(galleryView);
  }, IMAGES_WHEEL_IDLE_MS);
}

// While locked, spots a fresh trackpad swipe among the previous swipe's momentum events.
function isNewWheelSwipe(event, galleryView) {
  const deltaX = Math.abs(event.deltaX);
  const isOppositeDirection = Math.sign(event.deltaX) !== Math.sign(galleryView.wheelDeltaX);

  galleryView.wheelPeakDelta = Math.max(galleryView.wheelPeakDelta, deltaX);
  const isDecaying = deltaX < galleryView.wheelPeakDelta * IMAGES_WHEEL_DECAY_RATIO;
  const isReaccelerating = galleryView.hasWheelDecayed && !isDecaying;
  if (isDecaying) galleryView.hasWheelDecayed = true;

  return deltaX >= IMAGES_WHEEL_NEW_SWIPE_MIN_DELTA && (isOppositeDirection || isReaccelerating);
}

function handleGalleryWheelSwipe(event, galleryView) {
  if (isGalleryZoomed(galleryView)) {
    panGalleryView(galleryView, { x: -event.deltaX, y: -event.deltaY });
    return;
  }
  if (galleryView.scale !== 1) resetGalleryView(galleryView);
  if (galleryView.isWheelSwipeLocked) {
    if (!isNewWheelSwipe(event, galleryView)) return;
    releaseWheelSwipeLock(galleryView);
  }

  galleryView.wheelDeltaX += event.deltaX;
  if (Math.abs(galleryView.wheelDeltaX) < IMAGES_WHEEL_SWIPE_THRESHOLD_PX) return;

  galleryView.isWheelSwipeLocked = true;
  if (galleryView.wheelDeltaX > 0) {
    galleryView.onNext();
  } else {
    galleryView.onPrevious();
  }
}

function handleGalleryWheel(event, galleryView) {
  event.preventDefault();
  const isHorizontalSwipe = !event.ctrlKey
    && (galleryView.isWheelSwiping || Math.abs(event.deltaX) > Math.abs(event.deltaY));

  if (isHorizontalSwipe) {
    markWheelSwipeActive(galleryView);
    handleGalleryWheelSwipe(event, galleryView);
    return;
  }

  const speed = event.ctrlKey ? IMAGES_PINCH_WHEEL_ZOOM_SPEED : IMAGES_WHEEL_ZOOM_SPEED;
  const nextScale = galleryView.scale * Math.exp(-event.deltaY * speed);
  zoomGalleryAt(galleryView, nextScale, { x: event.clientX, y: event.clientY });
}

// Binds swipe, pinch, drag-to-pan, double-tap and wheel zoom. Returns a function that resets zoom.
function bindGalleryGestures(overlay, handlers) {
  const galleryView = createGalleryView(overlay, handlers);

  overlay.addEventListener('pointerdown', (event) => handleGesturePointerDown(event, galleryView));
  overlay.addEventListener('pointermove', (event) => handleGesturePointerMove(event, galleryView));
  overlay.addEventListener('pointerup', (event) => handleGesturePointerEnd(event, galleryView));
  overlay.addEventListener('pointercancel', (event) => handleGesturePointerEnd(event, galleryView));
  overlay.addEventListener('wheel', (event) => handleGalleryWheel(event, galleryView), { passive: false });
  ['gesturestart', 'gesturechange'].forEach((gestureType) => {
    overlay.addEventListener(gestureType, (event) => event.preventDefault());
  });

  return () => resetGalleryView(galleryView);
}

/**
 * Opens a full-screen gallery starting at the given image.
 * Supports prev/next buttons, swipe, arrow keys, pinch / wheel / double-tap zoom,
 * drag-to-pan when zoomed, and a close button / Escape.
 *
 * @param {object[]} backdrops  - TMDB backdrop objects ({ file_path })
 * @param {number} startIndex   - Index of the image to show first
 */
function openImageGallery(backdrops, startIndex) {
  document.getElementById('image-gallery-overlay')?.remove();

  const overlay = buildImageGalleryOverlay();
  let currentIndex = startIndex;

  const showImage = (index) => {
    currentIndex = (index + backdrops.length) % backdrops.length;
    resetZoom();
    renderGalleryImage(overlay, backdrops, currentIndex);
  };

  const closeGallery = () => {
    document.removeEventListener('keydown', handleGalleryKeydown);
    overlay.remove();
    document.body.style.overflow = '';
  };

  const handleGalleryKeydown = (e) => {
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  };

  const galleryHandlers = {
    onPrevious: () => showImage(currentIndex - 1),
    onNext: () => showImage(currentIndex + 1),
    onClose: closeGallery
  };
  bindGalleryControls(overlay, galleryHandlers);
  const resetZoom = bindGalleryGestures(overlay, galleryHandlers);

  document.addEventListener('keydown', handleGalleryKeydown);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  showImage(startIndex);
}