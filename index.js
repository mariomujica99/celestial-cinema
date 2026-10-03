import { initHero } from './home/hero.js';
import { initRails } from './home/rails.js';
import { initStreaming } from './home/streaming.js';
import { initInterests } from './home/interests.js';
import { initTopRated } from './home/topRated.js';
import { initBoxOffice } from './home/boxOffice.js';
import { initUpcoming } from './home/upcoming.js';

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-query');

initSearchRedirect(searchForm, searchInput, 'browse.html');

const savedMediaIdsPromise = loadSavedMediaIds();

initHero(savedMediaIdsPromise);
initRails(savedMediaIdsPromise);
initUpcoming(savedMediaIdsPromise);
initStreaming(savedMediaIdsPromise);
initInterests();
initTopRated(savedMediaIdsPromise);
initBoxOffice(savedMediaIdsPromise);