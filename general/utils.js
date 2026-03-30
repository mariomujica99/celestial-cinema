function formatTimestamp(dateString) {
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - reviewDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours < 24) {
        if (diffHours < 1) {
            return diffMinutes <= 1 ? '1min ago' : `${diffMinutes}min ago`;
        }
        return diffHours === 1 ? '1hr ago' : `${diffHours}hrs ago`;
    }

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[reviewDate.getMonth()];
    const day = reviewDate.getDate();
    const year = reviewDate.getFullYear();

    return `${month} ${day} ${year}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function generateRatingOptions(selectedRating) {
    let options = '';
    for (let i = 0; i <= 10; i++) {
        const selected = i == selectedRating ? 'selected' : '';
        options += `<option value="${i}" ${selected}>${i}</option>`;
    }
    return options;
}

/**
 * @param {HTMLElement|null} anchorElement - Insert after this element. If null, appends to body.
 */
function showErrorMessage(message, anchorElement = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-red';
    errorDiv.textContent = message;

    if (anchorElement) {
        anchorElement.parentNode.insertBefore(errorDiv, anchorElement.nextSibling);
    } else {
        document.body.appendChild(errorDiv);
    }

    setTimeout(() => {
        if (errorDiv.parentNode) errorDiv.remove();
    }, 5000);
}

/**
 * @param {HTMLElement} containerEl
 * @param {string|null} backdropPath - TMDB path string
 * @param {string} backdropBaseUrl - Base URL for backdrop images
 * @param {string} fallbackImagePath - Relative path to fallback image
 * @param {number[]} overlayOpacity - [startOpacity, endOpacity] for the gradient overlay
 */
function setBackdropBackground(
    containerEl,
    backdropPath,
    backdropBaseUrl,
    fallbackImagePath,
    overlayOpacity = [0.7, 0.8]
) {
    if (!containerEl) return;
    const [start, end] = overlayOpacity;

    if (backdropPath) {
        containerEl.style.backgroundImage =
            `linear-gradient(rgba(19, 23, 32, ${start}), rgba(19, 23, 32, ${end})), ` +
            `url('${backdropBaseUrl}${backdropPath}')`;
    } else {
        containerEl.style.backgroundImage =
            `linear-gradient(rgba(19, 23, 32, 0.4), rgba(19, 23, 32, 0.5)), ` +
            `url('${fallbackImagePath}')`;
    }
    containerEl.style.backgroundSize = 'cover';
    containerEl.style.backgroundPosition = 'center';
    containerEl.style.backgroundRepeat = 'no-repeat';
}

/**
 * Registers the standard search-redirect submit handler used on all detail pages.
 * Defaults to ../index.html
 */
function initSearchRedirect(formElement, inputElement, indexPath = '../index.html') {
    formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = inputElement.value.trim();
        if (searchTerm) {
            window.location.href = `${indexPath}?search=${encodeURIComponent(searchTerm)}`;
        }
    });
}

const WATCHLIST_API = 'https://celestial-cinema-backend.onrender.com/api/v1/watchlist';

async function toggleWatchlistAPI(username, item) {
  try {
    const res = await fetch(`${WATCHLIST_API}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        mediaId: String(item.id),
        title: item.title || '',
        year: item.year || '',
        mediaType: item.mediaType || 'movie',
        posterPath: item.posterPath || ''
      })
    });
    const data = await res.json();
    return data.status; // 'added' | 'removed'
  } catch (e) {
    console.error('Watchlist toggle failed:', e);
    return null;
  }
}

async function checkWatchlistAPI(username, mediaId) {
  try {
    const res = await fetch(`${WATCHLIST_API}/check?username=${encodeURIComponent(username)}&mediaId=${mediaId}`);
    return await res.json(); // { inWatchlist: bool, id: string|null }
  } catch (e) {
    console.error('Watchlist check failed:', e);
    return { inWatchlist: false, id: null };
  }
}

/**
 * Shows the shared name-picker modal.
 * @param {object} options
 * @param {string} options.title       - Modal heading text
 * @param {string} [options.confirmText] - Confirm button label (default 'Confirm')
 * @param {function} options.onConfirm - Called with the chosen name string
 * @param {function} [options.onCancel]
 */
function showNameModal({ title, confirmText = 'Confirm', onConfirm, onCancel }) {
  const existing = document.getElementById('name-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'name-modal-overlay';
  overlay.className = 'name-modal-overlay';

  overlay.innerHTML = `
    <div class="name-modal">
      <p class="name-modal-title">${title}</p>
      <button class="name-preset-btn" data-name="mario">Mario</button>
      <button class="name-preset-btn" data-name="monse">Monse</button>
      <input type="text" class="name-modal-input" id="name-modal-input"
          placeholder="Other name...">
      <div class="name-modal-actions">
        <button class="name-modal-cancel">Cancel</button>
        <button class="name-modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#name-modal-input');

  overlay.querySelectorAll('.name-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('ccLastName', btn.dataset.name);
      overlay.remove();
      onConfirm(btn.dataset.name);
  });
});

  const confirmBtn = overlay.querySelector('.name-modal-confirm');
  const cancelBtn = overlay.querySelector('.name-modal-cancel');

  confirmBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    localStorage.setItem('ccLastName', name);
    overlay.remove();
    onConfirm(name);
  });

  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });

  requestAnimationFrame(() => input.focus());
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Pages are either at repo root or exactly one level deep.
    const swPath = location.pathname.split('/').filter(Boolean).length > 2
      ? '../sw.js'
      : './sw.js';
    navigator.serviceWorker.register(swPath).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  });
}