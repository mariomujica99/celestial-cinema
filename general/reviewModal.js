/**
 * Shared review/rating modal.
 *
 * @param {object}   options
 * @param {string}   options.title             - Text displayed at top of modal
 * @param {string}   options.mediaType         - 'movie' | 'tv'
 * @param {boolean}  [options.posterSection]   - Show image header (episodes page only)
 * @param {string}   [options.backdropPath]    - TMDB path for image header
 * @param {string}   [options.backdropBaseUrl] - Base URL for backdrop
 * @param {string}   [options.fallbackImage]   - Fallback image path
 * @param {Array}    [options.seasonsData]     - TV season array for selectable dropdowns
 * @param {Function} [options.fetchEpisodes]   - async fn(seasonNum) → Episode[]
 * @param {number}   [options.lockedSeason]    - Pre-set season, suppresses dropdown
 * @param {number}   [options.lockedEpisode]   - Pre-set episode, suppresses dropdown
 * @param {object}   [options.editData]        - Pre-fill: { user, rating, review, season, episode }
 * @param {Function} options.onSave            - async fn({ user, rating, review, season, episode })
 *                                               Should throw on failure so modal re-enables Save.
 */
function showReviewModal(options) {
  const {
    title = '',
    mediaType = 'movie',
    posterSection = false,
    backdropPath = null,
    backdropBaseUrl = '',
    fallbackImage = '',
    seasonsData = [],
    fetchEpisodes = null,
    lockedSeason = null,
    lockedEpisode = null,
    editData = null,
    onSave
  } = options;

  const existing = document.getElementById('review-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'review-modal-overlay';
  overlay.className = 'review-modal-overlay';

  const hasSelectableSeasons = mediaType === 'tv' && seasonsData.length > 0 && lockedSeason === null;

  const posterHTML = posterSection ? `
    <div class="rm-poster-wrap">
      <div class="rm-rating-overlay" id="rm-rating-display">0</div>
    </div>
  ` : '';

  const seasonEpisodeHTML = hasSelectableSeasons ? `
    <div class="rm-season-episode-group">
      <select class="rm-season-select" id="rm-season-select">
        <option value="">Entire Series</option>
        ${seasonsData
          .filter(s => s.season_number > 0 && s.episode_count > 0)
          .sort((a, b) => a.season_number - b.season_number)
          .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`)
          .join('')}
      </select>
      <select class="rm-episode-select" id="rm-episode-select" disabled>
        <option value="">Entire Season</option>
      </select>
    </div>
  ` : '';

  const starsHTML = Array.from({ length: 10 }, (_, i) =>
    `<img src="../images/star.png" alt="Star ${i + 1}" class="rm-star" data-index="${i + 1}">`
  ).join('');

  overlay.innerHTML = `
    <div class="review-modal">
      ${posterHTML}
      <p class="rm-title">${escapeHtml(title)}</p>
      <div class="rm-stars" id="rm-stars">${starsHTML}</div>

      ${seasonEpisodeHTML}
      <input type="text" class="rm-name-input" id="rm-name-input" placeholder="name">
      <div class="rm-presets">
        <button class="name-preset-btn rm-preset" data-name="mario">mario</button>
        <button class="name-preset-btn rm-preset" data-name="monse">monse</button>
      </div>

      <div class="rm-review-section">
        <button class="rm-review-toggle-btn" id="rm-review-toggle">
          Write a Review <span class="toggle-chevron">▾</span>
        </button>
        <textarea class="rm-review-textarea" id="rm-review-textarea" placeholder=""></textarea>
      </div>
      <div class="rm-actions">
        <button class="rm-cancel-btn">Cancel</button>
        <button class="rm-save-btn">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  if (posterSection) {
    setBackdropBackground(
      overlay.querySelector('.rm-poster-wrap'),
      backdropPath,
      backdropBaseUrl,
      fallbackImage
    );
  }

  document.body.style.overflow = 'hidden';

  const ratingDisplay = overlay.querySelector('#rm-rating-display');
  const nameInput     = overlay.querySelector('#rm-name-input');
  const starsContainer = overlay.querySelector('#rm-stars');
  const starImgs      = overlay.querySelectorAll('.rm-star');
  const reviewToggle  = overlay.querySelector('#rm-review-toggle');
  const reviewTextarea = overlay.querySelector('#rm-review-textarea');
  const cancelBtn     = overlay.querySelector('.rm-cancel-btn');
  const saveBtn       = overlay.querySelector('.rm-save-btn');

  let currentRating = 0;
  let selectedPreset = null;
  let isDragging = false;
  let mouseDownIndex = 0;

  // Pre-fill for edit mode
  if (editData) {
    nameInput.value = editData.review ? '' : ''; // set below
    nameInput.value = editData.user || '';
    currentRating   = editData.rating || 0;
    reviewTextarea.value = editData.review || '';
    if (editData.review) {
      reviewTextarea.classList.add('is-open');
      reviewToggle.querySelector('.toggle-chevron').style.transform = 'rotate(180deg)';
    }
  }

  const closeModal = () => {
    document.removeEventListener('keydown', handleEsc);
    overlay.remove();
    document.body.style.overflow = '';
  };

  // Stars
  function renderStars(count) {
    starImgs.forEach((img, i) => { img.style.opacity = i < count ? '0.88' : '0.25'; });
    if (ratingDisplay) ratingDisplay.textContent = count;
  }

  function getStarIndex(clientX) {
    const rect = starsContainer.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return Math.min(10, Math.max(1, Math.ceil(relX / (rect.width / 10))));
  }

  renderStars(currentRating);

  starsContainer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDragging = true;
    mouseDownIndex = getStarIndex(e.clientX);
    starsContainer.setPointerCapture(e.pointerId);
    renderStars(mouseDownIndex);
  });

  starsContainer.addEventListener('pointermove', (e) => {
    renderStars(getStarIndex(e.clientX));
  });

  starsContainer.addEventListener('pointerleave', () => {
    if (!isDragging) renderStars(currentRating);
  });

  starsContainer.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const upIndex = getStarIndex(e.clientX);
    currentRating = (upIndex === currentRating && upIndex === mouseDownIndex) ? 0 : upIndex;
    renderStars(currentRating);
  });

  starsContainer.addEventListener('pointercancel', () => {
    isDragging = false;
    renderStars(currentRating);
  });

  // Name presets
  overlay.querySelectorAll('.rm-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedPreset === btn) {
        btn.classList.remove('is-selected');
        selectedPreset = null;
      } else {
        if (selectedPreset) selectedPreset.classList.remove('is-selected');
        btn.classList.add('is-selected');
        selectedPreset = btn;
        nameInput.value = '';
      }
    });
  });

  nameInput.addEventListener('input', () => {
    if (selectedPreset) {
      selectedPreset.classList.remove('is-selected');
      selectedPreset = null;
    }
  });

  // Season / episode dropdowns
  if (hasSelectableSeasons) {
    const seasonSelect  = overlay.querySelector('#rm-season-select');
    const episodeSelect = overlay.querySelector('#rm-episode-select');

    seasonSelect.addEventListener('change', () => {
      const seasonNum = seasonSelect.value;
      if (seasonNum) {
        episodeSelect.disabled = false;
        loadEpisodesIntoSelect(seasonNum, episodeSelect, fetchEpisodes);
      } else {
        episodeSelect.disabled = true;
        episodeSelect.innerHTML = '<option value="">Entire Season</option>';
      }
    });

    // Pre-fill edit data
    if (editData?.season) {
      seasonSelect.value = editData.season;
      episodeSelect.disabled = false;
      loadEpisodesIntoSelect(editData.season, episodeSelect, fetchEpisodes, editData.episode);
    }
  }

  // Review toggle
  reviewToggle.addEventListener('click', () => {
    const isOpen = reviewTextarea.classList.toggle('is-open');
    reviewToggle.querySelector('.toggle-chevron').style.transform = isOpen ? 'rotate(180deg)' : '';
  });

  // Close handlers
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', handleEsc);

  // Save
  saveBtn.addEventListener('click', async () => {
    const name = selectedPreset ? selectedPreset.dataset.name : nameInput.value.trim();

    if (!name) {
      nameInput.style.borderColor = '#e53e3e';
      nameInput.focus();
      setTimeout(() => { nameInput.style.borderColor = ''; }, 2000);
      return;
    }
    if (!currentRating) {
      starsContainer.classList.add('rm-stars-error');
      setTimeout(() => starsContainer.classList.remove('rm-stars-error'), 2000);
      return;
    }

    let season  = lockedSeason  ?? null;
    let episode = lockedEpisode ?? null;

    if (hasSelectableSeasons) {
      const seasonSelect  = overlay.querySelector('#rm-season-select');
      const episodeSelect = overlay.querySelector('#rm-episode-select');
      season  = seasonSelect.value  ? parseInt(seasonSelect.value)  : null;
      episode = (season && episodeSelect.value) ? parseInt(episodeSelect.value) : null;
    }

    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      await onSave({ user: name, rating: currentRating, review: reviewTextarea.value.trim(), season, episode });
      closeModal();
    } catch (err) {
      console.error('Error saving review:', err);
      showErrorMessage('Failed to save review. Please try again.');
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  });
}

/**
 * Populates an episode <select> element, fetching data if needed.
 * @param {string|number} seasonNumber
 * @param {HTMLSelectElement} episodeSelect
 * @param {Function|null} fetchEpisodes - async fn(seasonNum) → Episode[]
 * @param {number|null} [selectedEpisode]
 */
async function loadEpisodesIntoSelect(seasonNumber, episodeSelect, fetchEpisodes, selectedEpisode = null) {
  episodeSelect.innerHTML = '<option value="">Entire Season</option>';
  if (!fetchEpisodes) return;

  try {
    const episodes = await fetchEpisodes(seasonNumber);
    episodes.forEach(ep => {
      const option = document.createElement('option');
      option.value = ep.episode_number;
      option.textContent = `Episode ${ep.episode_number}: ${ep.name || 'Untitled'}`;
      if (selectedEpisode != null && ep.episode_number == selectedEpisode) option.selected = true;
      episodeSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading episodes into select:', err);
  }
}