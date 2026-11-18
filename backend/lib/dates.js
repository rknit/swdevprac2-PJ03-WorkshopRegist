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

// Parses an optional "HH:mm" (24-hour, Bangkok time) start time.
// undefined means "not given"; null or "" clears the time.
function parseStartTime(startTime) {
  if (startTime === undefined) return { given: false };
  if (startTime === null || startTime === "") return { given: true, startTime: null };
  if (typeof startTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { error: "startTime must use HH:mm (24-hour) format" };
  }
  return { given: true, startTime };
}

// Checks a start/end pair: an end time needs a start time and must be later.
function checkTimeRange(startTime, endTime) {
  if (endTime && !startTime) return { error: "Set a start time before the end time" };
  if (startTime && endTime && endTime <= startTime) return { error: "End time must be later than start time" };
  return {};
}

// Parses an optional banner image URL. undefined means "not given";
// null or "" clears it. Only http(s) URLs are accepted.
function parseCoverImage(coverImage) {
  if (coverImage === undefined) return { given: false };
  if (coverImage === null || coverImage === "") return { given: true, coverImage: null };
  if (typeof coverImage !== "string") return { error: "coverImage must be an http(s) URL" };
  const value = coverImage.trim();
  if (value.length > 2048 || !/^https?:\/\/\S+$/i.test(value)) return { error: "coverImage must be an http(s) URL" };
  try {
    new URL(value);
  } catch {
    return { error: "coverImage must be an http(s) URL" };
  }
  return { given: true, coverImage: value };
}

module.exports = { bangkokTodayStart, parseWorkshopDate, parseStartTime, parseCoverImage, checkTimeRange };