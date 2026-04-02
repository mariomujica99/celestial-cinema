// Shared hamburger + side-menu for all pages.
// Dynamically inserts the button into .topnav and builds the overlay.
(function () {

  // ── Path resolution ──────────────────────────────────────────
  // Use the script's own src attribute as ground truth: if it starts
  // with '../', this page lives one directory below the repo root.
  const scriptSrc = (document.currentScript || {}).getAttribute?.('src') || '';
  const prefix = scriptSrc.startsWith('../') ? '../' : '';

  // ── Genre data ───────────────────────────────────────────────
  const MOVIE_GENRES = [
    { name: 'Action',          id: 28    },
    { name: 'Animation',       id: 16    },
    { name: 'Comedy',          id: 35    },
    { name: 'Drama',           id: 18    },
    { name: 'Horror',          id: 27    },
    { name: 'Mystery',         id: 9648  },
    { name: 'Romance',         id: 10749 },
    { name: 'Science Fiction', id: 878   },
  ];

  const TV_GENRES = [
    { name: 'Action',          id: 10759 },
    { name: 'Animation',       id: 16    },
    { name: 'Comedy',          id: 35    },
    { name: 'Drama',           id: 18    },
    { name: 'Horror',          id: 27    },
    { name: 'Mystery',         id: 9648  },
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

  function buildGenreSection(sectionTitle, genres, mediaType) {
    const section = document.createElement('div');
    section.className = 'side-menu-section';

    const header = document.createElement('p');
    header.className = 'side-menu-header';
    header.textContent = sectionTitle;
    section.appendChild(header);

    genres.forEach(genre => {
      const item = document.createElement('p');
      item.className = 'side-menu-item';
      item.textContent = genre.name;
      item.addEventListener('click', () => {
        window.location.href =
          `${prefix}index.html?genre=${genre.id}&type=${mediaType}&name=${encodeURIComponent(genre.name)}`;
      });
      section.appendChild(item);
    });

    return section;
  }

  function buildSideMenu() {
    const overlay = document.createElement('div');
    overlay.id = 'side-menu-overlay';
    overlay.className = 'side-menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'side-menu-panel';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'side-menu-close-btn';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.textContent = '✕';
    panel.appendChild(closeBtn);

    panel.appendChild(buildGenreSection('Movies', MOVIE_GENRES, 'movie'));
    panel.appendChild(buildGenreSection('TV Shows', TV_GENRES, 'tv'));

    const peopleSection = document.createElement('div');
    peopleSection.className = 'side-menu-section';
    const peopleHeader = document.createElement('p');
    peopleHeader.className = 'side-menu-header side-menu-header--link';
    peopleHeader.textContent = 'Popular People';
    peopleHeader.addEventListener('click', () => {
      window.location.href = `${prefix}people/popularPeople.html`;
    });
    peopleSection.appendChild(peopleHeader);
    panel.appendChild(peopleSection);

    overlay.appendChild(panel);
    return { overlay, closeBtn };
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    const topnav = document.querySelector('.topnav');
    if (!topnav) return;

    const hamburgerBtn = buildHamburgerBtn();
    const { overlay, closeBtn } = buildSideMenu();

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
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();