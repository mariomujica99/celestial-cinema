/**
 * Renders the top-cast scrollable strip and "Full Cast" button.
 * Attaches the click handler to the static .cast-title element on the page.
 *
 * @param {object} creditsData - TMDB credits response ({ cast, crew })
 * @param {string} mediaId     - ID passed through to viewFullCast
 * @param {string} imgPath     - Base URL for cast profile images
 */
function displayTopCast(creditsData, mediaId, imgPath) {
    const castContainer = document.getElementById('cast-container');
    if (!castContainer) return;

    const cast = creditsData.cast.slice(0, 10);

    if (cast.length === 0) {
        castContainer.innerHTML = '<div class="cast-loading">No cast information available</div>';
        return;
    }

    castContainer.innerHTML = '';

    cast.forEach(member => {
        const castMember = document.createElement('div');
        castMember.className = 'cast-member';

        const photoUrl = member.profile_path
            ? `${imgPath}${member.profile_path}`
            : '../images/no-image-cast.jpg';

        castMember.innerHTML = `
            <img class="cast-photo" src="${photoUrl}" alt="${member.name}" onerror="this.src='../images/no-image-cast.jpg'">
            <div class="cast-name">${member.name}</div>
            <div class="cast-character">${member.character || 'Unknown Role'}</div>
        `;

        castMember.addEventListener('click', () => {
            window.location.href =
                `../people/castMember.html?id=${member.id}&name=${encodeURIComponent(member.name)}`;
        });

        castContainer.appendChild(castMember);
    });

    const fullCastButton = document.createElement('div');
    fullCastButton.className = 'full-cast-button';
    fullCastButton.innerHTML = `
        <button class="full-cast-btn" onclick="viewFullCast('${mediaId}')">Full Cast →</button>
    `;
    castContainer.appendChild(fullCastButton);

    const castTitle = document.querySelector('.cast-title');
    if (castTitle) {
        castTitle.addEventListener('click', () => viewFullCast(mediaId));
    }
}

/**
 * Navigates to the full cast/crew list page.
 * Detects media type from the current URL path.
 *
 * @param {string} mediaId
 */
function viewFullCast(mediaId) {
    const mediaType = window.location.pathname.includes('tv') ? 'tv' : 'movie';
    const mediaTitle = document.getElementById('tv-title') || document.getElementById('movie-title');
    const title = mediaTitle ? mediaTitle.textContent : '';
    window.location.href =
        `../people/castList.html?id=${mediaId}&type=${mediaType}&title=${encodeURIComponent(title)}`;
}