const YOUTUBE_THUMB_BASE = 'https://img.youtube.com/vi';
const YOUTUBE_WATCH_BASE = 'https://www.youtube.com/watch?v=';

function getPrimaryVideo(videos) {
  if (!videos || videos.length === 0) return null;

  const official = videos.find(v =>
    v.type === "Trailer" &&
    v.name?.toLowerCase().includes("official")
  );

  const trailer = videos.find(v => v.type === "Trailer");

  return official || trailer || videos[0];
}

/**
 * Fetches trailers and renders the horizontal video strip on detail pages.
 * The .videos-section must start with style="display:none;" in HTML.
 * It is revealed only when trailers are found.
 *
 * @param {string} videosUrl  - Full backend API URL for this media's videos
 * @param {string} mediaId    - TMDB media ID
 * @param {string} mediaType  - 'movie' | 'tv'
 * @param {string} mediaTitle - Used in the View All navigation URL
 */
async function loadVideoStrip(videosUrl, mediaId, mediaType, mediaTitle) {
  const section = document.querySelector('.videos-section');
  if (!section) return;

  try {
    const res = await fetch(videosUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const allTrailers = data.results || [];

    if (allTrailers.length === 0) return;

    const isSmallMobile = window.matchMedia('(max-width: 450px)').matches;

    let trailers = allTrailers;

    if (isSmallMobile) {
      const primary = getPrimaryVideo(allTrailers);
      trailers = primary ? [primary] : [];
    }

    if (trailers.length === 0) return;

    const container = document.getElementById('videos-container');
    if (!container) return;
    container.innerHTML = '';

    trailers.forEach(video => container.appendChild(createVideoStripCard(video)));

    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.style.display = 'block';
      viewAllBtn.textContent = `View All (${allTrailers.length})`;
      viewAllBtn.onclick = () => {
        window.location.href =
          `../media videos/mediaVideos.html?id=${mediaId}&type=${mediaType}&title=${encodeURIComponent(mediaTitle)}`;
      };
    }

    section.style.display = 'block';

    const mobileQuery = window.matchMedia('(max-width: 450px)');

    if (!section.dataset.videoResizeBound) {
      mobileQuery.addEventListener('change', () => {
        loadVideoStrip(videosUrl, mediaId, mediaType, mediaTitle);
      });

      section.dataset.videoResizeBound = 'true';
    }

  } catch (error) {
    console.error('Error fetching videos:', error);
  }
}

/**
 * Creates a thumbnail card for the horizontal strip.
 * @param {object} video - TMDB video object
 * @returns {HTMLElement}
 */
function createVideoStripCard(video) {
  const card = document.createElement('div');
  card.className = 'video-strip-card';

  const thumbUrl = `${YOUTUBE_THUMB_BASE}/${video.key}/mqdefault.jpg`;

  card.innerHTML = `
    <div class="video-strip-link">
      <div class="video-thumb-wrap">
        <img class="video-thumb"
             src="${thumbUrl}"
             alt="${escapeHtml(video.name)}"
             onerror="this.parentElement.style.background='linear-gradient(135deg,#2d3748,#1a2332)'">
        <div class="video-play-overlay"></div>
      </div>
      <p class="video-strip-title">${escapeHtml(video.name)}</p>
    </div>
  `;

  card.querySelector('.video-strip-link').addEventListener('click', () => {
    openVideoModal(video.key, video.name);
  });

  return card;
}

/**
 * Creates a video card for the full-page 2-column grid.
 * @param {object} video - TMDB video object
 * @returns {HTMLElement}
 */
function createVideoGridCard(video) {
  const card = document.createElement('div');
  card.className = 'video-grid-card';

  const thumbUrl = `${YOUTUBE_THUMB_BASE}/${video.key}/mqdefault.jpg`;

  const publishedDate = video.published_at
    ? new Date(video.published_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : '';

  card.innerHTML = `
    <div class="video-grid-link">
      <div class="video-thumb-wrap">
        <img class="video-thumb"
             src="${thumbUrl}"
             alt="${escapeHtml(video.name)}"
             onerror="this.parentElement.style.background='linear-gradient(135deg,#2d3748,#1a2332)'">
        <div class="video-play-overlay"></div>
      </div>
      <div class="video-grid-info">
        <p class="video-grid-title">${escapeHtml(video.name)}</p>
        <p class="video-grid-meta">${escapeHtml(video.type)}${publishedDate ? ` • ${publishedDate}` : ''}</p>
      </div>
    </div>
  `;

  card.querySelector('.video-grid-link').addEventListener('click', () => {
    openVideoModal(video.key, video.name);
  });

  return card;
}

/**
 * Opens a centered modal with an embedded YouTube player.
 * Clears the iframe src on close to stop playback.
 *
 * @param {string} videoKey   - YouTube video ID
 * @param {string} videoTitle - Display title shown in the modal header
 */
function openVideoModal(videoKey, videoTitle) {
  const existing = document.getElementById('video-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'video-modal-overlay';
  overlay.className = 'video-modal-overlay';

  overlay.innerHTML = `
    <div class="video-modal">
      <div class="video-modal-header">
        <p class="video-modal-title">${escapeHtml(videoTitle)}</p>
        <button class="video-modal-close" aria-label="Close video">✕</button>
      </div>
      <div class="video-modal-body">
        <iframe
          class="video-modal-iframe"
          src="https://www.youtube.com/embed/${videoKey}?autoplay=1"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const closeModal = () => {
    overlay.querySelector('iframe').src = '';
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.querySelector('.video-modal-close').addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}