// Display and date-rule helpers. The backend applies every "today" rule on
// the Asia/Bangkok calendar day, so the UI uses the same time zone. A browser
// in another zone then shows the same day the server checks.

import type { Workshop } from "./api";

const TZ = "Asia/Bangkok";

// "YYYY-MM-DD" of an instant, on the Bangkok calendar.
export function bkkDay(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    typeof value === "string" ? new Date(value) : value,
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function bkkToday(): string {
  return bkkDay(new Date());
}

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options }).format(new Date(iso));

// "DEC"
export const monthShort = (iso: string) => fmt(iso, { month: "short" }).toUpperCase();
// "05"
export const dayTwoDigit = (iso: string) => fmt(iso, { day: "2-digit" });
// "5 Dec 2026"
export const dateShort = (iso: string) => fmt(iso, { day: "numeric", month: "short", year: "numeric" });
// "Fri 5 Dec 2026"
export const dateWithWeekday = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(",", "");
// "Friday 5 December 2026"
export const dateLong = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", "");
// "Mon 8 Dec"
export const dateDialog = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");

// "Fri 5 Dec 2026 · 13:00", or the date alone when the workshop has no start time.
export function whenLabel(w: Pick<Workshop, "workshopDate" | "startTime">): string {
  const date = dateWithWeekday(w.workshopDate);
  return w.startTime ? `${date} · ${w.startTime}` : date;
}

// Time card value: "13:00 – 16:00", "13:00", or "To be announced".
export function timeRange(w: Pick<Workshop, "startTime" | "endTime">): string {
  if (!w.startTime) return "To be announced";
  return w.endTime ? `${w.startTime} – ${w.endTime}` : w.startTime;
}

// Attendance can be recorded from the workshop day on (Bangkok calendar).
export const attendanceOpen = (w: Pick<Workshop, "workshopDate">, today: string) => Boolean(today) && bkkDay(w.workshopDate) <= today;

export const ATTENDANCE_LABEL = { registered: "Registered", attended: "Attended", "no-show": "No-show" } as const;

// A workshop is past when its Bangkok day is before today. This matches the
// backend: registration closes after the workshop day.
export const isPast = (w: Pick<Workshop, "workshopDate">, today: string) => bkkDay(w.workshopDate) < today;

export const seatsTaken = (w: Pick<Workshop, "registeredCount">) => w.registeredCount ?? 0;
export const seatsLeft = (w: Pick<Workshop, "registeredCount" | "capacity">) => Math.max(0, w.capacity - seatsTaken(w));
export const isFull = (w: Pick<Workshop, "registeredCount" | "capacity">) => seatsLeft(w) === 0;
export const fillRatio = (w: Pick<Workshop, "registeredCount" | "capacity">) => (w.capacity > 0 ? Math.min(1, seatsTaken(w) / w.capacity) : 0);
// The bar turns coral when 10% or fewer seats are left (design: 28/30 and 40/40 are coral, 18/25 is violet).
export const isNearlyFull = (w: Pick<Workshop, "registeredCount" | "capacity">) => seatsLeft(w) <= Math.floor(w.capacity * 0.1);

// Stable palette slot for one id, so a workshop keeps its colour on every page.
// FNV-1a with a final mix step: ids that differ in only the last characters
// (MongoDB ObjectIds made one after another) still spread over all colours.
export function paletteIndex(id: string, size: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % size;
}

// Cover colours, in the order the design uses them. A workshop without a
// banner image shows its colour alone.
export const COVERS = [
  { bg: "var(--violet)" },
  { bg: "var(--sun)" },
  { bg: "var(--coral)" },
  { bg: "var(--mint)" },
  { bg: "var(--sky)" },
  { bg: "var(--mist)" },
] as const;

export const coverFor = (id: string) => COVERS[paletteIndex(id, COVERS.length)];

// Text colour that reads on each cover colour (violet uses white, as in the design).
export const onCover = (bg: string) => (bg === "var(--violet)" ? "var(--white)" : "var(--ink)");

const AVATAR_COLOURS = ["var(--pink)", "var(--sun)", "var(--mint)", "var(--sky)", "var(--violet)"];
export const avatarColour = (id: string) => AVATAR_COLOURS[paletteIndex(id, AVATAR_COLOURS.length)];

// "MS" from "Mali Srisawat".
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// "Mali S." from "Mali Srisawat".
export function shortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name.trim();
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
