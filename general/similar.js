/**
 * Fetches and renders the Similar section on media detail pages
 * using the custom content-based similarity algorithm endpoint.
 * Hides the entire section if no results are returned.
 *
 * @param {string} mediaId
 * @param {string} mediaType  - 'movie' | 'tv'
 * @param {string} imgPath    - Base URL for poster images
 * @param {Set<string>} savedMediaIds
 */
async function loadSimilarSection(mediaId, mediaType, imgPath, savedMediaIds = new Set()) {
  const section = document.querySelector('.similar-section');
  if (!section) return;

  const SIMILAR_API = 'https://celestial-cinema-backend.onrender.com/api/v1/similar';
  const container = document.getElementById('similar-container');
  if (!container) return;

  // Show skeletons immediately — section is already visible
  showSkeletonCards(container, 10, 'similar');

  try {
    const res = await fetch(`${SIMILAR_API}/${mediaType}/${mediaId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const results = data.results || [];

    hideSkeletonCards(container);

    if (results.length === 0) {
      section.style.display = 'none';
      return;
    }

    container.innerHTML = '';

    results.forEach(item => {
      const title     = item.title || '';
      const year      = item.releaseDate
        ? new Date(item.releaseDate).getFullYear()
        : '';
      const typeLabel = item.mediaType === 'tv' ? 'Show' : 'Movie';
      const posterUrl = item.posterPath
        ? `${imgPath}${item.posterPath}`
        : '../images/no-image.jpg';
      const detailUrl = item.mediaType === 'tv'
        ? `../tv reviews/tvReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`
        : `../movie reviews/movieReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`;
      const mediaIdStr = String(item.id);

      const el = document.createElement('div');
      el.className = 'known-for-item';

      const posterWrapper = document.createElement('div');
      posterWrapper.className = 'watchlist-item-poster-wrapper';
      posterWrapper.style.cssText = 'position:relative;width:100%;';

      const posterImg = document.createElement('img');
      posterImg.className = 'known-for-poster';
      posterImg.src = posterUrl;
      posterImg.alt = escapeHtml(title);
      posterImg.onerror = function() { this.src = '../images/no-image.jpg'; };

      const watchlistBtn = document.createElement('button');
      watchlistBtn.className = 'watchlist-remove-btn';

      const updateBtn = (inList) => {
        watchlistBtn.innerHTML = `<img src="../images/${inList ? 'watchlist-saved' : 'watchlist-add'}.svg" class="watchlist-remove-icon" alt="${inList ? 'Remove from watchlist' : 'Add to watchlist'}">`;
        watchlistBtn.setAttribute('aria-label', inList ? 'Remove from watchlist' : 'Add to watchlist');
      };

      updateBtn(savedMediaIds.has(mediaIdStr));

      const watchlistItem = {
        id:          mediaIdStr,
        title,
        year:        year || '',
        mediaType:   item.mediaType,
        posterPath:  item.posterPath  || '',
        voteAverage: item.voteAverage ?? null
      };

      watchlistBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isInList = savedMediaIds.has(mediaIdStr);

        const doToggle = async (username) => {
          try {
            const itemToSave = isInList ? watchlistItem : await hydrateGridWatchlistItem(watchlistItem);
            const status = await toggleWatchlistAPI(username, itemToSave);
            const nowInList = status === 'added';
            if (nowInList) savedMediaIds.add(mediaIdStr);
            else savedMediaIds.delete(mediaIdStr);
            updateBtn(nowInList);
          } catch (err) {
            console.error('Watchlist toggle failed:', err);
            showErrorMessage('Failed to update watchlist. Please try again.');
          }
        };

        if (isInList) {
          const cachedName = localStorage.getItem('ccLastName');
          if (cachedName) {
            doToggle(cachedName);
          } else {
            showNameModal({ title: 'Remove from Watchlist', confirmText: 'Remove', onConfirm: doToggle });
          }
        } else {
          showNameModal({ title: 'Save to Watchlist', confirmText: 'Save', onConfirm: doToggle });
        }
      });

      posterWrapper.appendChild(posterImg);
      posterWrapper.appendChild(watchlistBtn);
      el.appendChild(posterWrapper);

      const detailsDiv = document.createElement('div');
      detailsDiv.innerHTML = `
        <div class="known-for-title-text">${escapeHtml(title)}</div>
        <div class="known-for-info">${year ? year + ' \u2022 ' : ''}${typeLabel}</div>
        <div class="user-score-grid">${formatScore(item.voteAverage)}</div>
      `;
      el.appendChild(detailsDiv);

      el.addEventListener('click', () => {
        window.location.href = detailUrl;
      });

      container.appendChild(el);
    });

  } catch (error) {
    console.error('Error fetching similar media:', error);
    hideSkeletonCards(container);
    section.style.display = 'none';
  }
}