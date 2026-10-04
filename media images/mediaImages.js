const url = new URL(location.href);
const mediaId = url.searchParams.get("id");
const mediaType = url.searchParams.get("type");
const mediaTitle = url.searchParams.get("title");

const API_LINKS = {
  MOVIE_IMAGES:  `https://celestial-cinema-backend.onrender.com/api/v1/movies/images/${mediaId}`,
  TV_IMAGES:     `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/images/${mediaId}`,
  MOVIE_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/details/${mediaId}`,
  TV_DETAILS:    `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${mediaId}`,
  BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const imagesGrid = document.getElementById('images-grid');
const postersGrid = document.getElementById('posters-grid');
const imagesPageTitle = document.getElementById('images-page-title');
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

initSearchRedirect(searchForm, searchInput);

if (mediaTitle) {
  imagesPageTitle.textContent = `${mediaTitle} - Images`;
}

loadMediaDetails();
loadAllImages();

async function loadMediaDetails() {
  const detailsUrl = mediaType === 'tv' ? API_LINKS.TV_DETAILS : API_LINKS.MOVIE_DETAILS;

  try {
    const res = await fetch(detailsUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const mediaData = await res.json();

    setBackdropBackground(
      document.querySelector('.videos-page-header'),
      mediaData.backdrop_path,
      API_LINKS.BACKDROP_PATH,
      '../images/no-image-backdrop.jpg',
      [0.8, 0.9]
    );
    const title = mediaData.title || mediaData.name || mediaTitle || '';
    if (title) imagesPageTitle.textContent = `${title} - Images`;
  } catch (error) {
    console.error('Error fetching media details:', error);
  }
}

async function loadAllImages() {
  const imagesUrl = mediaType === 'tv' ? API_LINKS.TV_IMAGES : API_LINKS.MOVIE_IMAGES;

  try {
    const res = await fetch(imagesUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const { backdrops = [], posters = [] } = await res.json();
    const galleryImages = [...backdrops, ...posters];

    if (galleryImages.length === 0) {
      imagesGrid.innerHTML = '<div class="videos-loading">No images available</div>';
      return;
    }

    renderImageGrid(imagesGrid, galleryImages, { end: backdrops.length });
    renderImageGrid(postersGrid, galleryImages, { start: backdrops.length });
  } catch (error) {
    console.error('Error fetching images:', error);
    imagesGrid.innerHTML = '';
    showErrorMessage('Failed to load images | Please try again later', imagesGrid);
  }
}