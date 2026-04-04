const API_LINKS = {
  POPULAR_PEOPLE: 'https://celestial-cinema-backend.onrender.com/api/v1/movies/people/popular',
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const mediaGrid = document.getElementById('media-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');

let currentPage = 1;
let hasMorePeople = true;
let isLoadingPeople = false;

initSearchRedirect(searchForm, searchInput);
loadMoreBtn.addEventListener('click', loadMorePeople);

loadPeople();

async function loadPeople(append = false) {
  if (isLoadingPeople || !hasMorePeople) return;
  isLoadingPeople = true;

  if (append) {
    loadMoreBtn.textContent = 'Loading';
    loadMoreBtn.disabled = true;
  }

  try {
    const res = await fetch(`${API_LINKS.POPULAR_PEOPLE}?page=${currentPage}`);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      if (!append) {
        mediaGrid.innerHTML = '<div class="no-media">No people found</div>';
      }
      hasMorePeople = false;
      loadMoreContainer.style.display = 'none';
      return;
    }

    data.results.forEach(person => mediaGrid.appendChild(createPersonCard(person)));

    hasMorePeople = currentPage < (data.total_pages || 1);

    if (hasMorePeople) {
      loadMoreContainer.style.display = 'flex';
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    } else {
      loadMoreContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error fetching popular people:', error);
    if (!append) {
      mediaGrid.innerHTML = '<div class="error-message">Failed to load | Please try again later</div>';
    }
    loadMoreContainer.style.display = 'none';
  } finally {
    isLoadingPeople = false;
  }
}

function loadMorePeople() {
  if (isLoadingPeople || !hasMorePeople) return;
  currentPage++;
  loadPeople(true);
}

function getTopKnownForTitle(personData) {
  if (!personData.known_for || personData.known_for.length === 0) return '';
  const top = personData.known_for[0];
  return top.title || top.name || '';
}

function createPersonCard(personData) {
  const mediaItemWrapper = document.createElement('div');
  mediaItemWrapper.className = 'media-item';

  const mediaColumnWrapper = document.createElement('div');
  mediaColumnWrapper.className = 'media-column';
  mediaColumnWrapper.style.cssText = 'overflow:hidden;width:100%;';

  const mediaCard = document.createElement('div');
  mediaCard.className = 'media-card';

  const profileThumbnail = document.createElement('img');
  profileThumbnail.className = 'media-thumbnail';
  profileThumbnail.src = personData.profile_path
    ? API_LINKS.IMG_PATH + personData.profile_path
    : '../images/no-image-cast.jpg';
  profileThumbnail.onerror = function () { this.src = '../images/no-image-cast.jpg'; };

  const personNameEl = document.createElement('p');
  personNameEl.setAttribute('id', 'media-title');
  personNameEl.textContent = personData.name || '';

  const departmentEl = document.createElement('div');
  departmentEl.className = 'person-department-badge';
  const topKnownFor = getTopKnownForTitle(personData);
  departmentEl.innerHTML =
    `<span class="person-department-main">${escapeHtml(personData.known_for_department || 'Unknown')}</span>` +
    (topKnownFor ? `<span class="person-knownfor">${escapeHtml(topKnownFor)}</span>` : '');

  mediaCard.appendChild(profileThumbnail);
  mediaCard.appendChild(personNameEl);
  mediaCard.appendChild(departmentEl);

  const personLink = document.createElement('a');
  personLink.href = `castMember.html?id=${personData.id}&name=${encodeURIComponent(personData.name || '')}`;
  personLink.style.cssText = 'display:block;width:100%;text-decoration:none;color:inherit;';
  personLink.appendChild(mediaCard);

  mediaColumnWrapper.appendChild(personLink);
  mediaItemWrapper.appendChild(mediaColumnWrapper);

  return mediaItemWrapper;
}