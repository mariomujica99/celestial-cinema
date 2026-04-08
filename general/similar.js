/**
 * Fetches and renders the Similar section on media detail pages.
 * Hides the entire section if no results are returned.
 *
 * @param {string} apiUrl    - Full backend URL for similar media
 * @param {string} mediaType - 'movie' | 'tv'
 * @param {string} imgPath   - Base URL for poster images
 */
async function loadSimilarSection(apiUrl, mediaType, imgPath) {
  const section = document.querySelector('.similar-section');
  if (!section) return;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) return;

    const container = document.getElementById('similar-container');
    if (!container) return;

    container.innerHTML = '';

    results.forEach(item => {
      const title = item.title || item.name || 'Unknown';
      const year = (item.release_date || item.first_air_date)
        ? new Date(item.release_date || item.first_air_date).getFullYear()
        : '';
      const typeLabel = mediaType === 'tv' ? 'Show' : 'Movie';
      const posterUrl = item.poster_path
        ? `${imgPath}${item.poster_path}`
        : '../images/no-image.jpg';
      const detailUrl = mediaType === 'tv'
        ? `../tv reviews/tvReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`
        : `../movie reviews/movieReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`;

      const el = document.createElement('div');
      el.className = 'known-for-item';
      el.innerHTML = `
        <img class="known-for-poster" src="${posterUrl}" alt="${escapeHtml(title)}" onerror="this.src='../images/no-image.jpg'">
        <div class="known-for-title-text">${escapeHtml(title)}</div>
        <div class="known-for-info">${year ? year + ' \u2022 ' : ''}${typeLabel}</div>
        <div class="user-score-grid">${formatScore(item.vote_average)}</div>
      `;

      el.addEventListener('click', () => {
        window.location.href = detailUrl;
      });

      container.appendChild(el);
    });

    section.style.display = 'block';

  } catch (error) {
    console.error('Error fetching similar media:', error);
  }
}