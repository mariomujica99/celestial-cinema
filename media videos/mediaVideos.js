const url = new URL(location.href);
const mediaId = url.searchParams.get("id");
const mediaType = url.searchParams.get("type");
const mediaTitle = url.searchParams.get("title");

const API_LINKS = {
  MOVIE_VIDEOS:  `https://celestial-cinema-backend.onrender.com/api/v1/movies/videos/${mediaId}`,
  TV_VIDEOS:     `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/videos/${mediaId}`,
  MOVIE_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/details/${mediaId}`,
  TV_DETAILS:    `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${mediaId}`,
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const videosGrid = document.getElementById('videos-grid');
const videosPageTitle = document.getElementById('videos-page-title');
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

initSearchRedirect(searchForm, searchInput);

if (mediaTitle) {
  videosPageTitle.textContent = `${mediaTitle} - Videos`;
}

loadMediaDetails();
loadAllVideos();

function loadMediaDetails() {
  const detailsUrl = mediaType === 'tv' ? API_LINKS.TV_DETAILS : API_LINKS.MOVIE_DETAILS;

  fetch(detailsUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      setBackdropBackground(
        document.querySelector('.videos-page-header'),
        data.backdrop_path,
        API_LINKS.BACKDROP_PATH,
        '../images/no-image-backdrop.jpg',
        [0.8, 0.9]
      );
      const title = data.title || data.name || mediaTitle || '';
      if (title) videosPageTitle.textContent = `${title} - Videos`;
    })
    .catch(error => {
      console.error('Error fetching media details:', error);
    });
}

async function loadAllVideos() {
  const videosUrl = mediaType === 'tv' ? API_LINKS.TV_VIDEOS : API_LINKS.MOVIE_VIDEOS;

  try {
    const res = await fetch(videosUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const trailers = data.results || [];

    if (trailers.length === 0) {
      videosGrid.innerHTML = '<div class="videos-loading">No trailers available</div>';
      return;
    }

    videosGrid.innerHTML = '';
    trailers.forEach(video => videosGrid.appendChild(createVideoGridCard(video)));

  } catch (error) {
    console.error('Error fetching videos:', error);
    videosGrid.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
  }
}