// Shared season calendar. Pure functions only: every function that needs "today"
// takes a date argument so any day can be tested. Used by the homepage strip and
// the seasonal hub. The backend never computes windows.

const OVERRIDE_STORAGE_KEY = 'ccSeasonOverride';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_AWARENESS_DAYS = 5;
const PREFERRED_AWARENESS_DAYS = 7;
const SUNDAY = 0;
const MONDAY = 1;
const THURSDAY = 4;

// Seasons allowed to show on the normal (non-override) path. A season is added here only
// after its backend config is deployed. Awareness months stay out until Part B launches them.
// Rollback: remove the key from this set.
const LAUNCHED_SEASON_KEYS = new Set(['halloween']);

// ── Date helpers (all dates are local midnight) ──────────────

function createDate(year, monthIndex, dayOfMonth) {
  return new Date(year, monthIndex, dayOfMonth);
}

function startOfDay(date) {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, dayCount) {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate() + dayCount);
}

function diffInDays(laterDate, earlierDate) {
  return Math.round((startOfDay(laterDate) - startOfDay(earlierDate)) / MS_PER_DAY);
}

function getNthWeekday(year, monthIndex, weekday, occurrence) {
  const firstOfMonth = createDate(year, monthIndex, 1);
  const daysToFirstMatch = (weekday - firstOfMonth.getDay() + 7) % 7;
  return createDate(year, monthIndex, 1 + daysToFirstMatch + (occurrence - 1) * 7);
}

function getLastWeekday(year, monthIndex, weekday) {
  const lastOfMonth = createDate(year, monthIndex + 1, 0);
  const daysSinceMatch = (lastOfMonth.getDay() - weekday + 7) % 7;
  return addDays(lastOfMonth, -daysSinceMatch);
}

// Anonymous Gregorian algorithm.
export function calculateEasterSunday(year) {
  const goldenNumber = year % 19;
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const centuryLeapDays = Math.floor(century / 4);
  const centuryRemainder = century % 4;
  const moonCorrection = Math.floor((century + 8) / 25);
  const moonOffset = Math.floor((century - moonCorrection + 1) / 3);
  const epact = (19 * goldenNumber + century - centuryLeapDays - moonOffset + 15) % 30;
  const yearLeapDays = Math.floor(yearInCentury / 4);
  const yearRemainder = yearInCentury % 4;
  const weekdayOffset = (32 + 2 * centuryRemainder + 2 * yearLeapDays - epact - yearRemainder) % 7;
  const monthCorrection = Math.floor((goldenNumber + 11 * epact + 22 * weekdayOffset) / 451);
  const monthAndDay = epact + weekdayOffset - 7 * monthCorrection + 114;
  return createDate(year, Math.floor(monthAndDay / 31) - 1, (monthAndDay % 31) + 1);
}

function getThanksgiving(year) {
  return getNthWeekday(year, 10, THURSDAY, 4);
}

// ── Season definitions ───────────────────────────────────────

function buildWindow(holidayDate, startDate, endDate) {
  return { holidayDate, startDate, endDate };
}

function buildWeekBeforeWindow(holidayDate) {
  return buildWindow(holidayDate, addDays(holidayDate, -7), holidayDate);
}

const HOLIDAY_SEASONS = [
  {
    key: 'new-years', name: "New Year's Day", greeting: 'Happy New Year!',
    label: 'Celestial Countdown', subtitle: 'Ring in the new year with movies & shows',
    getWindow: (year) => buildWindow(createDate(year, 0, 1), createDate(year - 1, 11, 26), createDate(year, 0, 3))
  },
  {
    key: 'valentines', name: "Valentine's Day", greeting: "Happy Valentine's Day!",
    label: 'Celestial Crush', subtitle: 'Romance movies & shows',
    getWindow: (year) => buildWindow(createDate(year, 1, 14), createDate(year, 0, 28), createDate(year, 1, 15))
  },
  {
    key: 'st-patricks', name: "St. Patrick's Day", greeting: "Happy St. Patrick's Day!",
    label: 'Luck of the Stream', subtitle: 'Irish movies & shows',
    getWindow: (year) => buildWindow(createDate(year, 2, 17), createDate(year, 2, 8), createDate(year, 2, 18))
  },
  {
    key: 'easter', name: 'Easter', greeting: 'Happy Easter!',
    label: 'Hop to It', subtitle: 'Family favorites & faith stories',
    getWindow: (year) => {
      const easterSunday = calculateEasterSunday(year);
      return buildWindow(easterSunday, addDays(easterSunday, -12), addDays(easterSunday, 1));
    }
  },
  {
    key: 'earth-day', name: 'Earth Day', greeting: 'Happy Earth Day!',
    label: 'Planet Watch', subtitle: 'Nature, climate & wildlife',
    getWindow: (year) => buildWindow(createDate(year, 3, 22), createDate(year, 3, 15), createDate(year, 3, 23))
  },
  {
    key: 'mothers-day', name: "Mother's Day", greeting: "Happy Mother's Day!",
    label: "Mom's Pick", subtitle: 'Movies & shows about moms',
    getWindow: (year) => buildWeekBeforeWindow(getNthWeekday(year, 4, SUNDAY, 2))
  },
  {
    key: 'memorial-day', name: 'Memorial Day', greeting: 'Today is Memorial Day',
    label: 'Honor & Remembrance', subtitle: 'War stories & true service',
    getWindow: (year) => buildWeekBeforeWindow(getLastWeekday(year, 4, MONDAY))
  },
  {
    key: 'fathers-day', name: "Father's Day", greeting: "Happy Father's Day!",
    label: "Dad's Pick", subtitle: 'Movies & shows about dads',
    getWindow: (year) => buildWeekBeforeWindow(getNthWeekday(year, 5, SUNDAY, 3))
  },
  {
    key: 'fourth-of-july', name: '4th of July', greeting: 'Happy 4th of July!',
    label: 'Stars & Streams', subtitle: 'Action, history & summer blockbusters',
    getWindow: (year) => buildWindow(createDate(year, 6, 4), createDate(year, 5, 25), createDate(year, 6, 5))
  },
  {
    key: 'halloween', name: 'Halloween', greeting: 'Happy Halloween!',
    label: 'Celestial Fright Night', subtitle: 'Browse Halloween movies & shows',
    getWindow: (year) => buildWindow(createDate(year, 9, 31), createDate(year, 9, 1), createDate(year, 10, 1))
  },
  {
    key: 'veterans-day', name: 'Veterans Day', greeting: 'Today is Veterans Day',
    label: 'Salute', subtitle: 'Stories of service',
    getWindow: (year) => buildWindow(createDate(year, 10, 11), createDate(year, 10, 8), createDate(year, 10, 13))
  },
  {
    key: 'thanksgiving', name: 'Thanksgiving', greeting: 'Happy Thanksgiving!',
    label: 'Stuffed & Streaming', subtitle: 'Comfort watches for the whole family',
    getWindow: (year) => buildWindow(getThanksgiving(year), createDate(year, 10, 14), getThanksgiving(year))
  },
  {
    key: 'christmas', name: 'Christmas', greeting: 'Merry Christmas!',
    label: 'Jingle All the Stream', subtitle: 'Browse Christmas movies & shows',
    getWindow: (year) => buildWindow(createDate(year, 11, 25), addDays(getThanksgiving(year), 1), createDate(year, 11, 25))
  }
];

const AWARENESS_SEASONS = [
  {
    key: 'black-history', name: 'Black History Month',
    subtitle: 'Stories, voices & icons on screen',
    getNominalRange: (year) => ({ startDate: createDate(year, 1, 1), endDate: createDate(year, 2, 0) })
  },
  {
    key: 'womens-history', name: "Women's History Month",
    subtitle: 'Stories by and about women',
    getNominalRange: (year) => ({ startDate: createDate(year, 2, 1), endDate: createDate(year, 2, 31) })
  },
  {
    key: 'aapi-heritage', name: 'AAPI Heritage Month',
    subtitle: 'Asian American & Pacific Islander stories',
    getNominalRange: (year) => ({ startDate: createDate(year, 4, 1), endDate: createDate(year, 4, 31) })
  },
  {
    key: 'pride', name: 'Pride Month',
    subtitle: 'Stories celebrating LGBTQ+ lives',
    getNominalRange: (year) => ({ startDate: createDate(year, 5, 1), endDate: createDate(year, 5, 30) })
  },
  {
    key: 'hispanic-heritage', name: 'Hispanic Heritage Month',
    subtitle: 'Latino & Latin American stories',
    getNominalRange: (year) => ({ startDate: createDate(year, 8, 15), endDate: createDate(year, 9, 15) })
  },
  {
    key: 'native-american-heritage', name: 'Native American Heritage Month',
    subtitle: 'Native stories, voices & history on screen',
    getNominalRange: (year) => ({ startDate: createDate(year, 10, 1), endDate: createDate(year, 10, 30) })
  }
];

// ── Holiday windows and the collision rule ───────────────────

function buildHolidayWindows(years) {
  return years.flatMap(year => HOLIDAY_SEASONS.map(season => ({
    key: season.key,
    kind: 'holiday',
    ...season.getWindow(year)
  })));
}

/**
 * Earlier holiday keeps its full window. A later window that starts on or before
 * the previous window's end is moved to the day after it, or dropped if nothing is left.
 */
function resolveHolidayCollisions(windows) {
  const sortedWindows = [...windows].sort((first, second) => first.startDate - second.startDate);
  const resolvedWindows = [];
  let previousEndDate = null;

  sortedWindows.forEach(seasonWindow => {
    const isOverlapping = previousEndDate && seasonWindow.startDate <= previousEndDate;
    const startDate = isOverlapping ? addDays(previousEndDate, 1) : seasonWindow.startDate;
    if (startDate > seasonWindow.endDate) return;

    resolvedWindows.push({ ...seasonWindow, startDate });
    previousEndDate = seasonWindow.endDate;
  });
  return resolvedWindows;
}

// ── Awareness months (fill days no holiday window claims) ────

function isDayClaimed(day, claimedWindows) {
  return claimedWindows.some(seasonWindow => day >= seasonWindow.startDate && day <= seasonWindow.endDate);
}

function listFreeRuns(rangeStartDate, rangeEndDate, claimedWindows) {
  const freeRuns = [];
  let currentRun = null;

  for (let day = rangeStartDate; day <= rangeEndDate; day = addDays(day, 1)) {
    if (isDayClaimed(day, claimedWindows)) {
      currentRun = null;
      continue;
    }
    if (!currentRun) {
      currentRun = { startDate: day, endDate: day };
      freeRuns.push(currentRun);
    }
    currentRun.endDate = day;
  }
  return freeRuns;
}

function getRunLength(run) {
  return diffInDays(run.endDate, run.startDate) + 1;
}

/**
 * First run of at least 7 days; if none, the longest run of at least 5 days.
 * Returns null when nothing qualifies (the month is dropped for that year).
 */
function pickAwarenessRun(freeRuns) {
  const preferredRun = freeRuns.find(run => getRunLength(run) >= PREFERRED_AWARENESS_DAYS);
  if (preferredRun) return preferredRun;

  const longestRun = freeRuns.reduce(
    (longest, run) => (!longest || getRunLength(run) > getRunLength(longest) ? run : longest),
    null
  );
  return longestRun && getRunLength(longestRun) >= MIN_AWARENESS_DAYS ? longestRun : null;
}

function buildAwarenessWindows(years, holidayWindows) {
  return years.flatMap(year => AWARENESS_SEASONS.flatMap(season => {
    const { startDate, endDate } = season.getNominalRange(year);
    const pickedRun = pickAwarenessRun(listFreeRuns(startDate, endDate, holidayWindows));
    if (!pickedRun) return [];
    return [{ key: season.key, kind: 'awareness', holidayDate: null, ...pickedRun }];
  }));
}

// ── Public API ───────────────────────────────────────────────

export function getSeasonWindows(date = new Date()) {
  const year = date.getFullYear();
  const years = [year - 1, year, year + 1];
  const holidayWindows = resolveHolidayCollisions(buildHolidayWindows(years));
  return [...holidayWindows, ...buildAwarenessWindows(years, holidayWindows)];
}

function findSeasonDetails(seasonKey) {
  const holidaySeason = HOLIDAY_SEASONS.find(season => season.key === seasonKey);
  if (holidaySeason) return holidaySeason;
  const awarenessSeason = AWARENESS_SEASONS.find(season => season.key === seasonKey);
  return { ...awarenessSeason, label: awarenessSeason.name, greeting: '' };
}

function buildActiveSeason(seasonWindow, isOverride = false) {
  const { getWindow, getNominalRange, ...seasonDetails } = findSeasonDetails(seasonWindow.key);
  return { ...seasonDetails, ...seasonWindow, isOverride };
}

function getDistanceToWindow(seasonWindow, today) {
  if (today >= seasonWindow.startDate && today <= seasonWindow.endDate) return 0;
  return Math.min(
    Math.abs(diffInDays(seasonWindow.startDate, today)),
    Math.abs(diffInDays(seasonWindow.endDate, today))
  );
}

// QA only: localStorage key `ccSeasonOverride` forces a season. No URL parameter on purpose.
function readSeasonOverride(today) {
  let overrideKey = null;
  try {
    overrideKey = localStorage.getItem(OVERRIDE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to read season override:', error);
    return null;
  }
  if (!overrideKey) return null;

  const matchingWindows = getSeasonWindows(today).filter(seasonWindow => seasonWindow.key === overrideKey);
  if (matchingWindows.length === 0) return null;

  const nearestWindow = matchingWindows.reduce((nearest, seasonWindow) =>
    getDistanceToWindow(seasonWindow, today) < getDistanceToWindow(nearest, today) ? seasonWindow : nearest
  );
  return buildActiveSeason(nearestWindow, true);
}

export function getActiveSeason(date = new Date()) {
  const today = startOfDay(date);
  const overriddenSeason = readSeasonOverride(today);
  if (overriddenSeason) return overriddenSeason;

  // Collisions are resolved inside getSeasonWindows, so the gate only removes unlaunched
  // seasons after that and never changes the dates of launched ones.
  const activeWindow = getSeasonWindows(today)
    .filter(seasonWindow => LAUNCHED_SEASON_KEYS.has(seasonWindow.key))
    .find(seasonWindow => today >= seasonWindow.startDate && today <= seasonWindow.endDate);
  return activeWindow ? buildActiveSeason(activeWindow) : null;
}

// ── Countdown pill text ──────────────────────────────────────

function formatMonthDay(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getAwarenessCountdownText(season, today) {
  if (diffInDays(season.endDate, today) === 0) return `Last day of ${season.name}`;
  return `${season.name} — featured through ${formatMonthDay(season.endDate)}`;
}

function getHolidayCountdownText(season, today) {
  const daysUntilHoliday = diffInDays(season.holidayDate, today);
  if (daysUntilHoliday > 1) return `${daysUntilHoliday} days until ${season.name}`;
  if (daysUntilHoliday === 1) return `${season.name} is tomorrow`;
  if (daysUntilHoliday === 0) return season.greeting;
  return `${season.name} just ended — last days to browse`;
}

export function getCountdownText(season, date = new Date()) {
  const today = startOfDay(date);
  return season.kind === 'awareness'
    ? getAwarenessCountdownText(season, today)
    : getHolidayCountdownText(season, today);
}
