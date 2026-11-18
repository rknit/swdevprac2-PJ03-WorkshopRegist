// Date helpers shared by the workshop and registration controllers.
// The application runs for users in Asia/Bangkok (UTC+7, no DST). All
// "today" comparisons use the Bangkok calendar day so that a workshop's
// date and the registration cutoff line up with the users' local date.

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Bangkok is a fixed UTC+7

// Returns a Date at 00:00:00 Bangkok time on the current Bangkok day.
function bangkokTodayStart(now = new Date()) {
  const shifted = new Date(now.getTime() + BKK_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  // Midnight of that calendar day in Bangkok, expressed as a UTC timestamp.
  return new Date(Date.UTC(y, m, d) - BKK_OFFSET_MS);
}

// Parses a "YYYY-MM-DD" string and returns { error } when it is not a real,
// valid calendar date, otherwise { date } as a UTC-midnight Date.
function parseWorkshopDate(workshopDate) {
  if (typeof workshopDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(workshopDate)) {
    return { error: "A valid workshopDate in YYYY-MM-DD format is required" };
  }
  const date = new Date(`${workshopDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== workshopDate) {
    return { error: "Invalid workshop date" };
  }
  return { date };
}

module.exports = { bangkokTodayStart, parseWorkshopDate };