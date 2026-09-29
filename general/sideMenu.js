// Shared hamburger + side-menu for all pages.
// Dynamically inserts the button into .topnav and builds the overlay.
(function () {

  // ── Path resolution ──────────────────────────────────────────
  // Use the script's own src attribute as ground truth: if it starts
  // with '../', this page lives one directory below the repo root.
  const scriptSrc = (document.currentScript || {}).getAttribute?.('src') || '';
  const prefix = scriptSrc.startsWith('../') ? '../' : '';
  const MOBILE_MAX_WIDTH_PX = 650;
  const SWIPE_MIN_DISTANCE_PX = 60;
  const SWIPE_HORIZONTAL_RATIO = 1.5;
  const SWIPE_BLOCKED_SELECTOR =
    'input, textarea, select, .name-modal-overlay, .review-modal-overlay, .video-modal-overlay';
  // ── Genre data ───────────────────────────────────────────────
const MOVIE_GENRES = [
  { name: 'Action',          id: 28    },
  { name: 'Animation',       id: 16    },
  { name: 'Comedy',          id: 35    },
  { name: 'Crime',           id: 80    },
  { name: 'Documentary',     id: 99    },
  { name: 'Drama',           id: 18    },
  { name: 'Family',          id: 10751 },
  { name: 'Horror',          id: 27    },
  { name: 'Mystery',         id: 9648  },
  { name: 'Romance',         id: 10749 },
  { name: 'Science Fiction', id: 878   },
];

const TV_GENRES = [
  { name: 'Action',          id: 10759 },
  { name: 'Animation',       id: 16    },
  { name: 'Comedy',          id: 35    },
  { name: 'Crime',           id: 80    },
  { name: 'Documentary',     id: 99    },
  { name: 'Drama',           id: 18    },
  { name: 'Family',          id: 10751 },
  { name: 'Mystery',         id: 9648  },
  { name: 'Reality',         id: 10764 },
  { name: 'Romance',         id: 10749 },
  { name: 'Science Fiction', id: 10765 },
];

  // ── DOM builders ─────────────────────────────────────────────
  function buildHamburgerBtn() {
    const btn = document.createElement('button');
    btn.id = 'hamburger-btn';
    btn.className = 'hamburger-btn';
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML =
      '<span class="hamburger-bar"></span>' +
      '<span class="hamburger-bar"></span>' +
      '<span class="hamburger-bar"></span>';
    return btn;
  }

  function buildMenuSection(sectionTitle, menuItems) {
    const section = document.createElement('div');
    section.className = 'side-menu-section';

    const header = document.createElement('p');
    header.className = 'side-menu-header';
    header.textContent = sectionTitle;
    header.addEventListener('click', () => section.classList.toggle('is-open'));
    section.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'side-menu-items';

    menuItems.forEach(menuItem => {
      const item = document.createElement('p');
      item.className = 'side-menu-item';
      item.textContent = menuItem.name;
      item.addEventListener('click', () => { window.location.href = menuItem.url; });
      itemsContainer.appendChild(item);
    });

    section.appendChild(itemsContainer);
    return section;
  }

  function buildGenreSection(sectionTitle, genres, mediaType) {
    const menuItems = genres.map(genre => ({
      name: genre.name,
      url: `${prefix}index.html?genre=${genre.id}&type=${mediaType}&name=${encodeURIComponent(genre.name)}`
    }));
    return buildMenuSection(sectionTitle, menuItems);
  }

  function buildSideMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'side-menu-overlay';
    overlay.className = 'side-menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'side-menu-panel';

    panel.appendChild(buildGenreSection('Movies', MOVIE_GENRES, 'movie'));
    panel.appendChild(buildGenreSection('TV Shows', TV_GENRES, 'tv'));

    panel.appendChild(buildMenuSection('People', [
      { name: 'Popular People', url: `${prefix}people/popularPeople.html` }
    ]));

    overlay.appendChild(panel);
    return overlay;
  }

  // ── Swipe gesture ────────────────────────────────────────────
  function isInsideHorizontalScroller(element) {
    let node = element;
    while (node && node !== document.body) {
      const { overflowX } = getComputedStyle(node);
      const canScrollX = overflowX === 'auto' || overflowX === 'scroll';
      if (canScrollX && node.scrollWidth > node.clientWidth) return true;
      node = node.parentElement;
    }
    return false;
  }

  function isSwipeBlocked(target) {
    return Boolean(target.closest(SWIPE_BLOCKED_SELECTOR)) || isInsideHorizontalScroller(target);
  }

  function initSwipeGesture(overlay, openMenu, closeMenu) {
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
    let swipeStart = null;

    document.addEventListener('touchstart', (e) => {
      const isOpen = overlay.classList.contains('is-open');
      const canStart = mobileQuery.matches
        && e.touches.length === 1
        && (isOpen || !isSwipeBlocked(e.target));
      const touch = e.touches[0];
      swipeStart = canStart ? { x: touch.clientX, y: touch.clientY, isOpen } : null;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!swipeStart) return;
      const deltaX = e.touches[0].clientX - swipeStart.x;
      const deltaY = e.touches[0].clientY - swipeStart.y;

      if (Math.abs(deltaY) > SWIPE_MIN_DISTANCE_PX) {
        swipeStart = null;
        return;
      }
      if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX) return;
      if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_HORIZONTAL_RATIO) return;

      if (deltaX > 0 && !swipeStart.isOpen) openMenu();
      if (deltaX < 0 && swipeStart.isOpen) closeMenu();
      swipeStart = null;
    }, { passive: true });

    const resetSwipe = () => { swipeStart = null; };
    document.addEventListener('touchend', resetSwipe, { passive: true });
    document.addEventListener('touchcancel', resetSwipe, { passive: true });
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    const topnav = document.querySelector('.topnav');
    if (!topnav) return;

    const hamburgerBtn = buildHamburgerBtn();
    const overlay = buildSideMenu();
    // Append hamburger after search-container so it groups with it on desktop
    topnav.appendChild(hamburgerBtn);
    document.body.appendChild(overlay);

    const openMenu = () => {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    hamburgerBtn.addEventListener('click', openMenu);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    initSwipeGesture(overlay, openMenu, closeMenu);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();