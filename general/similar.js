/**
 * Fetches and renders the Similar section on media detail pages.
 * Hides the entire section if no results are returned.
 *
 * @param {string} apiUrl    - Full backend URL for similar media
 * @param {string} mediaType - 'movie' | 'tv'
 * @param {string} imgPath   - Base URL for poster images
 */
async function loadSimilarSection(apiUrl, mediaType, imgPath, savedMediaIds = new Set()) {
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
      const title      = item.title || item.name || 'Unknown';
      const year       = (item.release_date || item.first_air_date)
        ? new Date(item.release_date || item.first_air_date).getFullYear()
        : '';
      const typeLabel  = mediaType === 'tv' ? 'Show' : 'Movie';
      const posterUrl  = item.poster_path
        ? `${imgPath}${item.poster_path}`
        : '../images/no-image.jpg';
      const detailUrl  = mediaType === 'tv'
        ? `../tv reviews/tvReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`
        : `../movie reviews/movieReviews.html?id=${item.id}&title=${encodeURIComponent(title)}`;
      const mediaIdStr = String(item.id);

      const el = document.createElement('div');
      el.className = 'known-for-item';

      // Poster wrapper with watchlist button
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
        mediaType,
        posterPath:  item.poster_path || '',
        voteAverage: item.vote_average ?? null
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
        <div class="user-score-grid">${formatScore(item.vote_average)}</div>
      `;
      el.appendChild(detailsDiv);

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