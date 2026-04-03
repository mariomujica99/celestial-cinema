/**
 * Renders the top-cast scrollable strip
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

        const character = member.roles?.[0]?.character || member.character || 'Unknown Role';
        castMember.innerHTML = `
            <img class="cast-photo" src="${photoUrl}" alt="${member.name}" onerror="this.src='../images/no-image-cast.jpg'">
            <div class="cast-name">${member.name}</div>
            <div class="cast-character">${character}</div>
        `;

        castMember.addEventListener('click', () => {
            window.location.href =
                `../people/castMember.html?id=${member.id}&name=${encodeURIComponent(member.name)}`;
        });

        castContainer.appendChild(castMember);
    });

    const fullCastBtn = document.querySelector('.full-cast-btn');
    if (fullCastBtn) {
        fullCastBtn.addEventListener('click', () => viewFullCast(mediaId));
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