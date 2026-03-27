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