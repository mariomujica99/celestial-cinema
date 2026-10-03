const IMAGES_TMDB_BASE_URL = 'https://image.tmdb.org/t/p';
const IMAGES_THUMB_SIZE = 'w500';
const IMAGES_GRID_SIZE = 'w780';
const IMAGES_GALLERY_SIZE = 'w1280';
const IMAGES_STRIP_LIMIT = 10;
const IMAGES_SWIPE_THRESHOLD_PX = 50;

function buildImageUrl(filePath, size) {
  return `${IMAGES_TMDB_BASE_URL}/${size}${filePath}`;
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

  try {
    const res = await fetch(imagesUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const { backdrops = [] } = await res.json();
    if (backdrops.length === 0) return;

    renderImageStrip(section, backdrops);
    bindImagesViewAll(section, { imageCount: backdrops.length, mediaId, mediaType, mediaTitle });
    section.style.display = 'block';
  } catch (error) {
    console.error('Error fetching images:', error);
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
  viewAllBtn.addEventListener('click', () => {
    window.location.href =
      `../media images/mediaImages.html?id=${mediaId}&type=${mediaType}&title=${encodeURIComponent(mediaTitle)}`;
  });
}

function createImageThumb(backdrop, size) {
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'image-thumb-wrap';

  const thumbImg = document.createElement('img');
  thumbImg.className = 'image-thumb';
  thumbImg.src = buildImageUrl(backdrop.file_path, size);
  thumbImg.alt = 'Backdrop';
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

function createImageGridCard(backdrops, index) {
  const card = document.createElement('div');
  card.className = 'image-grid-card';
  card.appendChild(createImageThumb(backdrops[index], IMAGES_GRID_SIZE));
  card.addEventListener('click', () => openImageGallery(backdrops, index));
  return card;
}

/**
 * Renders every backdrop into the full-page grid (used by mediaImages.js).
 * @param {HTMLElement} gridContainer
 * @param {object[]} backdrops
 */
function renderImageGrid(gridContainer, backdrops) {
  const fragment = document.createDocumentFragment();
  backdrops.forEach((_, index) => fragment.appendChild(createImageGridCard(backdrops, index)));
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

function bindGallerySwipe(overlay, onPrevious, onNext) {
  let touchStartX = 0;

  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) < IMAGES_SWIPE_THRESHOLD_PX) return;

    if (deltaX > 0) {
      onPrevious();
    } else {
      onNext();
    }
  }, { passive: true });
}

function bindGalleryControls(overlay, { onPrevious, onNext, onClose }) {
  overlay.querySelector('.image-gallery-prev').addEventListener('click', onPrevious);
  overlay.querySelector('.image-gallery-next').addEventListener('click', onNext);
  overlay.querySelector('.image-gallery-close').addEventListener('click', onClose);
  bindGallerySwipe(overlay, onPrevious, onNext);
}

/**
 * Opens a full-screen gallery starting at the given image.
 * Supports prev/next buttons, swipe, arrow keys, and a close button / Escape.
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

  bindGalleryControls(overlay, {
    onPrevious: () => showImage(currentIndex - 1),
    onNext: () => showImage(currentIndex + 1),
    onClose: closeGallery
  });

  document.addEventListener('keydown', handleGalleryKeydown);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  showImage(startIndex);
}