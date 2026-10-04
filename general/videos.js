const YOUTUBE_THUMB_BASE = 'https://img.youtube.com/vi';
const YOUTUBE_WATCH_BASE = 'https://www.youtube.com/watch?v=';
const PRIMARY_VIDEO_KEYWORDS = ['official', 'final', 'main', 'theatrical', 'teaser'];
const MAX_STRIP_VIDEOS = 6;
const VIDEO_TYPE_ORDER = ['Trailer', 'Clip', 'Teaser', 'Featurette', 'Behind the Scenes'];
const VIDEO_PLAYER_PAGE = `${(document.currentScript?.getAttribute('src') || '').startsWith('../') ? '../' : ''}media videos/mediaVideoPlayer.html`;

function findKeywordMatch(videos) {
  for (const keyword of PRIMARY_VIDEO_KEYWORDS) {
    const match = videos.find(video => video.name?.toLowerCase().includes(keyword));
    if (match) return match;
  }
  return null;
}

function moveKeywordMatchFirst(videos) {
  const primaryVideo = findKeywordMatch(videos) || videos[0];
  if (!primaryVideo) return [];
  return [primaryVideo, ...videos.filter(video => video !== primaryVideo)];
}

/**
 * Orders videos by VIDEO_TYPE_ORDER, horizontal videos first and vertical
 * (letterboxed) videos last. Within each horizontal type group the keyword
 * match goes first; TMDB order is kept for the rest and for vertical groups.
 *
 * @param {object[]} videos - TMDB video objects (non-trailers may carry isVertical)
 * @returns {object[]}
 */
function sortVideos(videos) {
  const horizontalVideos = videos.filter(video => !video.isVertical);
  const verticalVideos = videos.filter(video => video.isVertical);

  const orderedHorizontal = VIDEO_TYPE_ORDER.flatMap(type =>
    moveKeywordMatchFirst(horizontalVideos.filter(video => video.type === type))
  );
  const orderedVertical = VIDEO_TYPE_ORDER.flatMap(type =>
    verticalVideos.filter(video => video.type === type)
  );
  return [...orderedHorizontal, ...orderedVertical];
}

function getPrimaryVideo(videos) {
  if (!videos || videos.length === 0) return null;
  return sortVideos(videos)[0];
}

function showVideoStripSkeleton(section, container) {
  const viewAllBtn = section.querySelector('.view-all-btn');
  if (viewAllBtn) viewAllBtn.hidden = true;

  container.classList.remove('is-single');
  showSkeletonCards(container, MAX_STRIP_VIDEOS, 'video');
  section.style.display = 'block';
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
  const container = document.getElementById('videos-container');
  if (!section || !container) return;

  showVideoStripSkeleton(section, container);

  try {
    const res = await fetch(videosUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const allVideos = data.results || [];

    if (allVideos.length === 0) {
      section.style.display = 'none';
      return;
    }

    container.innerHTML = '';
    container.classList.toggle('is-single', allVideos.length === 1);

    const orderedVideos = sortVideos(allVideos).slice(0, MAX_STRIP_VIDEOS);

    const playerContext = { mediaId, mediaType };
    orderedVideos.forEach(video => container.appendChild(createVideoStripCard(video, playerContext)));

    const viewAllBtn = section.querySelector('.view-all-btn');
    if (viewAllBtn && allVideos.length > 1) {
      setViewAllLabel(viewAllBtn, allVideos.length);
      viewAllBtn.hidden = false;
      viewAllBtn.onclick = () => {
        window.location.href =
          `../media videos/mediaVideos.html?id=${mediaId}&type=${mediaType}&title=${encodeURIComponent(mediaTitle)}`;
      };
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
    section.style.display = 'none';
  }
}

function getVideoThumbUrl(videoKey) {
  return `${YOUTUBE_THUMB_BASE}/${encodeURIComponent(videoKey)}/hqdefault.jpg`;
}

/**
 * Builds the URL of the video player page.
 *
 * @param {object} options
 * @param {string} options.mediaId
 * @param {string} options.mediaType - 'movie' | 'tv'
 * @param {string} [options.videoKey] - YouTube key; the player picks the primary trailer when omitted
 * @param {string} [options.source] - 'media' (up next = this media's videos) | 'hero' (up next = hero trailers)
 * @returns {string}
 */
function buildVideoPlayerUrl({ mediaId, mediaType, videoKey, source = 'media' }) {
  const playerParams = new URLSearchParams({ id: mediaId, type: mediaType, from: source });
  if (videoKey) playerParams.set('key', videoKey);
  return `${VIDEO_PLAYER_PAGE}?${playerParams.toString()}`;
}

function createVideoThumb(thumbUrl, title) {
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'video-thumb-wrap';

  const thumbImage = document.createElement('img');
  thumbImage.className = 'video-thumb';
  thumbImage.src = thumbUrl;
  thumbImage.alt = title;
  thumbImage.loading = 'lazy';
  thumbImage.addEventListener('error', () => {
    thumbWrap.style.background = 'linear-gradient(135deg, #2d3748, #1a2332)';
  }, { once: true });

  const playOverlay = document.createElement('div');
  playOverlay.className = 'video-play-overlay';

  thumbWrap.append(thumbImage, playOverlay);
  return thumbWrap;
}

/**
 * Creates a thumbnail card for the horizontal strip (detail pages, player up next).
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.thumbUrl
 * @param {string} options.playerUrl - Where the card links to
 * @returns {HTMLElement}
 */
function buildVideoStripCard({ title, thumbUrl, playerUrl }) {
  const stripLink = document.createElement('a');
  stripLink.className = 'video-strip-link';
  stripLink.href = playerUrl;
  stripLink.append(createVideoThumb(thumbUrl, title), createTextElement('p', 'video-strip-title', title));

  const stripCard = document.createElement('div');
  stripCard.className = 'video-strip-card';
  stripCard.appendChild(stripLink);
  return stripCard;
}

/**
 * Creates a strip card for one of a media item's videos.
 * @param {object} video - TMDB video object
 * @param {{ mediaId: string, mediaType: string }} playerContext
 * @returns {HTMLElement}
 */
function createVideoStripCard(video, playerContext) {
  return buildVideoStripCard({
    title: video.name,
    thumbUrl: getVideoThumbUrl(video.key),
    playerUrl: buildVideoPlayerUrl({ ...playerContext, videoKey: video.key })
  });
}

function createVideoGridInfo(video) {
  const publishedDate = video.published_at
    ? new Date(video.published_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : '';

  const gridInfo = document.createElement('div');
  gridInfo.className = 'video-grid-info';
  gridInfo.append(
    createTextElement('p', 'video-grid-title', video.name),
    createTextElement('p', 'video-grid-meta', `${video.type}${publishedDate ? ` • ${publishedDate}` : ''}`)
  );
  return gridInfo;
}

/**
 * Creates a video card for the full-page 2-column grid.
 * @param {object} video - TMDB video object
 * @param {{ mediaId: string, mediaType: string }} playerContext
 * @returns {HTMLElement}
 */
function createVideoGridCard(video, playerContext) {
  const gridLink = document.createElement('a');
  gridLink.className = 'video-grid-link';
  gridLink.href = buildVideoPlayerUrl({ ...playerContext, videoKey: video.key });
  gridLink.append(
    createVideoThumb(getVideoThumbUrl(video.key), video.name),
    createVideoGridInfo(video)
  );

  const gridCard = document.createElement('div');
  gridCard.className = 'video-grid-card';
  gridCard.appendChild(gridLink);
  return gridCard;
}