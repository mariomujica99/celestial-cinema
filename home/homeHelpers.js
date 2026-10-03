export function buildPersonPageUrl(personId, personName = '') {
  return `people/castMember.html?id=${personId}&name=${encodeURIComponent(personName)}`;
}

export function getTodayIsoDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export function formatShortDate(isoDate) {
  if (!isoDate) return '';
  return new Date(`${isoDate}T00:00:00`)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

export function buildDetailPageUrl(mediaId, mediaType, mediaTitle = '') {
  const detailPage = mediaType === 'tv'
    ? 'tv reviews/tvReviews.html'
    : 'movie reviews/movieReviews.html';
  return `${detailPage}?id=${mediaId}&title=${encodeURIComponent(mediaTitle)}`;
}

function formatCompactNumber(value) {
  return Number(value.toFixed(1));
}

export function formatMoney(amount) {
  if (!amount) return '';
  if (amount >= 1e9) return `$${formatCompactNumber(amount / 1e9)}B`;
  if (amount >= 1e6) return `$${formatCompactNumber(amount / 1e6)}M`;
  return `$${Math.round(amount / 1e3)}K`;
}

export function formatRuntime(totalMinutes) {
  if (!totalMinutes) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}