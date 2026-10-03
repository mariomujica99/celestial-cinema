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
  const SWIPE_BLOCKED_SELECTOR = 'input, textarea, select, .name-modal-overlay, .review-modal-overlay';
  
  // ── Menu data ────────────────────────────────────────────────
  const MOVIE_LISTS = [
    { name: 'Trending',    key: 'trending' },
    { name: 'Popular',     key: 'popular' },
    { name: 'Now Playing', key: 'now-playing' },
    { name: 'Upcoming',    key: 'upcoming' },
    { name: 'Top Rated',   key: 'top-rated' }
  ];

  const TV_LISTS = [
    { name: 'Trending',     key: 'trending' },
    { name: 'Popular',      key: 'popular' },
    { name: 'Airing Today', key: 'airing-today' },
    { name: 'Top Rated',    key: 'top-rated' }
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

  function buildMenuItem(menuItem) {
    const item = document.createElement('p');
    item.textContent = menuItem.name;

    if (menuItem.isSubheader) {
      item.className = 'side-menu-subheader';
      return item;
    }

    item.className = 'side-menu-item';
    item.addEventListener('click', () => { window.location.href = menuItem.url; });
    return item;
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
    menuItems.forEach(menuItem => itemsContainer.appendChild(buildMenuItem(menuItem)));

    section.appendChild(itemsContainer);
    return section;
  }

  function buildGenreMenuItems(genres, mediaType) {
    return genres.map(genre => ({
      name: genre.name,
      url: `${prefix}browse.html?genre=${genre.id}&type=${mediaType}&name=${encodeURIComponent(genre.name)}`
    }));
  }

  function buildMediaSection({ title, mediaType, lists, genres }) {
    const listItems = lists.map(list => ({
      name: list.name,
      url: `${prefix}browse.html?list=${list.key}&type=${mediaType}`
    }));

    return buildMenuSection(title, [
      ...listItems,
      { name: 'Genres', isSubheader: true },
      ...buildGenreMenuItems(genres, mediaType)
    ]);
  }

  function buildSideMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'side-menu-overlay';
    overlay.className = 'side-menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'side-menu-panel';

    panel.appendChild(buildMenuSection('Reviews', [
      { name: 'Reviews', url: `${prefix}all reviews/allReviews.html` }
    ]));
    panel.appendChild(buildMenuSection('Watchlist', [
      { name: 'Watchlist', url: `${prefix}watchlist/watchlist.html` }
    ]));
    panel.appendChild(buildMediaSection({
      title: 'Movies', mediaType: 'movie', lists: MOVIE_LISTS, genres: MOVIE_GENRES
    }));
    panel.appendChild(buildMediaSection({
      title: 'TV Shows', mediaType: 'tv', lists: TV_LISTS, genres: TV_GENRES
    }));
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