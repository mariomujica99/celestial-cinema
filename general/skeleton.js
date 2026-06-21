/**
 * Injects skeleton placeholder cards into a scrollable container.
 *
 * @param {HTMLElement} container - The flex container to inject into
 * @param {number}      count     - Number of skeleton cards to show
 * @param {string}      variant   - CSS variant suffix: 'similar' | 'cast' | 'season' | 'known-for'
 */
function showSkeletonCards(container, count = 10, variant = 'similar') {
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = `skeleton-card skeleton-card--${variant}`;
    card.setAttribute('aria-hidden', 'true');

    card.innerHTML = `
      <div class="skeleton-block skeleton-poster"></div>
      <div class="skeleton-block skeleton-title"></div>
      <div class="skeleton-block skeleton-info"></div>
      <div class="skeleton-block skeleton-score"></div>
    `;

    container.appendChild(card);
  }
}

/**
 * Removes all skeleton cards from a container.
 * Call this before rendering real content.
 *
 * @param {HTMLElement} container
 */
function hideSkeletonCards(container) {
  if (!container) return;
  const skeletons = container.querySelectorAll('.skeleton-card');
  skeletons.forEach(s => s.remove());
}