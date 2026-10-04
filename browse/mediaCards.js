import { buildDetailPageUrl } from '../home/homeHelpers.js';

const API_LINKS = {
  IMG_PATH: 'https://image.tmdb.org/t/p/w1280'
};

const FALLBACK_IMAGES = {
  POSTER: 'images/no-image.jpg',
  PROFILE: 'images/no-image-cast.jpg'
};

function createCardImage(imagePath, fallbackSrc) {
  const cardImage = document.createElement('img');
  cardImage.className = 'media-thumbnail';
  cardImage.src = imagePath ? API_LINKS.IMG_PATH + imagePath : fallbackSrc;
  cardImage.addEventListener('error', () => { cardImage.src = fallbackSrc; }, { once: true });
  return cardImage;
}

function createCardTitle(titleText) {
  const cardTitle = document.createElement('p');
  cardTitle.textContent = titleText;
  return cardTitle;
}

function createCardInfo(...infoElements) {
  const cardInfo = document.createElement('div');
  cardInfo.className = 'card-info';
  cardInfo.append(...infoElements);
  return cardInfo;
}

function createCardLink(mediaCard, href) {
  const cardLink = document.createElement('a');
  cardLink.href = href;
  cardLink.style.textDecoration = 'none';
  cardLink.style.color = 'inherit';
  cardLink.appendChild(mediaCard);
  return cardLink;
}

function createMediaColumn(cardLink) {
  const mediaColumn = document.createElement('div');
  mediaColumn.className = 'media-column';
  mediaColumn.appendChild(cardLink);
  return mediaColumn;
}

function createMediaItem(mediaColumn) {
  const mediaItem = document.createElement('div');
  mediaItem.className = 'media-item';
  mediaItem.appendChild(mediaColumn);
  return mediaItem;
}

export function createMediaCard(itemData, mediaType, savedMediaIds) {
  const title = itemData.title || itemData.name || '';
  const mediaCard = document.createElement('div');
  mediaCard.className = 'media-card media-card--poster';
  mediaCard.className = 'media-card';
  mediaCard.append(
    createCardImage(itemData.poster_path, FALLBACK_IMAGES.POSTER),
    createCardInfo(
      createCardScoreRow(itemData.vote_average, { mediaId: itemData.id, mediaType }),
      createCardTitle(title)
    )
  );

  const cardLink = createCardLink(mediaCard, buildDetailPageUrl(itemData.id, mediaType, title));
  const mediaColumn = createMediaColumn(cardLink);
  const watchlistItem = buildWatchlistItem(itemData, mediaType);
  mediaColumn.appendChild(createWatchlistCardButton(watchlistItem, savedMediaIds));
  return createMediaItem(mediaColumn);
}

function getTopKnownForTitle(personData) {
  const topKnownFor = personData.known_for?.[0];
  return topKnownFor ? (topKnownFor.title || topKnownFor.name || '') : '';
}

function createDepartmentBadge(personData) {
  const departmentBadge = document.createElement('div');
  departmentBadge.className = 'person-department-badge';
  const department = personData.known_for_department || 'Unknown';
  const topKnownFor = getTopKnownForTitle(personData);

  departmentBadge.innerHTML = `
    <span class="person-department-main">${escapeHtml(department)}</span>
    ${topKnownFor ? `<span class="person-knownfor">${escapeHtml(topKnownFor)}</span>` : ''}
  `;
  return departmentBadge;
}

export function createPersonCard(personData, pathPrefix = '') {
  const personName = personData.name || '';
  const mediaCard = document.createElement('div');
  mediaCard.className = 'media-card';
  mediaCard.append(
    createCardImage(personData.profile_path, `${pathPrefix}${FALLBACK_IMAGES.PROFILE}`),
    createCardInfo(createCardTitle(personName), createDepartmentBadge(personData))
  );

  const personUrl = `${pathPrefix}people/castMember.html?id=${personData.id}&name=${encodeURIComponent(personName)}`;
  const personLink = createCardLink(mediaCard, personUrl);
  personLink.style.display = 'block';
  personLink.style.width = '100%';

  const mediaColumn = createMediaColumn(personLink);
  mediaColumn.style.overflow = 'hidden';
  mediaColumn.style.width = '100%';
  return createMediaItem(mediaColumn);
}