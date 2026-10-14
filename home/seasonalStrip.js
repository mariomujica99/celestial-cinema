import { getActiveSeason } from '../general/seasons.js';

const SEASONAL_HUB_PAGE = 'seasonalHub.html';

const stripLink = document.getElementById('seasonal-strip');
const stripLabel = stripLink?.querySelector('.seasonal-strip-label');
const stripSubtitle = stripLink?.querySelector('.seasonal-strip-subtitle');

export function initSeasonalStrip() {
  if (!stripLink) return;

  const activeSeason = getActiveSeason();
  if (!activeSeason) return;

  stripLink.dataset.season = activeSeason.key;
  stripLink.href = `${SEASONAL_HUB_PAGE}?season=${encodeURIComponent(activeSeason.key)}`;
  stripLink.setAttribute('aria-label', `${activeSeason.label}: ${activeSeason.subtitle}`);
  stripLabel.textContent = activeSeason.label;
  stripSubtitle.textContent = activeSeason.subtitle;
  stripLink.hidden = false;
}
