// Shared watchlist bookmark button for poster cards (browse grid, home rails).
const WATCHLIST_ICON_BASE = `${(document.currentScript?.getAttribute('src') || '').startsWith('../') ? '../' : ''}images/`;

function buildWatchlistItem(itemData, mediaType) {
  return {
    id: String(itemData.id),
    title: itemData.title || itemData.name || '',
    year: getMediaYear(itemData),
    mediaType: mediaType === 'tv' ? 'tv' : 'movie',
    posterPath: itemData.poster_path || '',
    voteAverage: itemData.vote_average ?? null
  };
}

function updateWatchlistCardBtn(watchlistBtn, isInList) {
  const iconName = isInList ? 'watchlist-saved' : 'watchlist-add';
  const label = isInList ? 'Remove from watchlist' : 'Add to watchlist';
  watchlistBtn.innerHTML = `<img src="${WATCHLIST_ICON_BASE}${iconName}.svg" class="watchlist-icon" alt="${label}">`;
  watchlistBtn.setAttribute('aria-label', label);
}

function requestWatchlistUsername(isInList, onConfirm) {
  const cachedName = localStorage.getItem('ccLastName');
  if (isInList && cachedName) {
    onConfirm(cachedName);
    return;
  }

  showNameModal({
    title: isInList ? 'Remove from Watchlist' : 'Save to Watchlist',
    confirmText: isInList ? 'Remove' : 'Save',
    onConfirm
  });
}

async function toggleWatchlistForUser(username, watchlistItem, savedMediaIds) {
  const itemId = String(watchlistItem.id);
  const wasInList = savedMediaIds.has(itemId);
  const itemToSend = wasInList ? watchlistItem : await hydrateGridWatchlistItem(watchlistItem);
  const status = await toggleWatchlistAPI(username, itemToSend);

  if (!status) {
    showErrorMessage('Failed to update watchlist. Please try again.');
    return wasInList;
  }

  if (status === 'added') savedMediaIds.add(itemId);
  else savedMediaIds.delete(itemId);
  return status === 'added';
}

function createWatchlistCardButton(watchlistItem, savedMediaIds) {
  const watchlistBtn = document.createElement('button');
  watchlistBtn.className = 'watchlist-card-btn';
  updateWatchlistCardBtn(watchlistBtn, savedMediaIds.has(String(watchlistItem.id)));

  watchlistBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isInList = savedMediaIds.has(String(watchlistItem.id));
    requestWatchlistUsername(isInList, async (username) => {
      try {
        const nowInList = await toggleWatchlistForUser(username, watchlistItem, savedMediaIds);
        updateWatchlistCardBtn(watchlistBtn, nowInList);
      } catch (error) {
        console.error('Watchlist toggle failed:', error);
        showErrorMessage('Failed to update watchlist. Please try again.');
      }
    });
  });

  return watchlistBtn;
}