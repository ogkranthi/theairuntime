/**
 * Minimal iCalendar (RFC 5545) builder for The AI Runtime events.
 *
 * Zero dependencies. Emits a VCALENDAR with one VEVENT per event, using the
 * same Eastern (-04:00) local-time assumption as the JSON-LD on event pages,
 * converted to UTC `...Z` instants so calendar apps render the correct time
 * without needing a VTIMEZONE block.
 *
 * Known limitation: the -04:00 offset is EDT (summer). A winter event would be
 * EST (-05:00). The events shipped so far are May/June, so this is correct now.
 */

export interface IcsEvent {
  /** Stable slug without the `boston/` prefix, used for the UID and URL. */
  dateSlug: string;
  title: string;
  date: Date;
  doorsAt?: string;
  startsAt?: string;
  endsAt?: string;
  venueName?: string;
  description?: string;
}

const DOMAIN = 'events.theairuntime.com';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a JS Date as a UTC iCal timestamp: YYYYMMDDTHHMMSSZ. */
function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** All-day date value: YYYYMMDD (in the event's local date). */
function toDateValue(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Parse a frontmatter time like "6:00 PM" against the event date and return a
 * UTC Date, assuming Eastern Daylight Time (-04:00). Returns null if no time.
 */
function easternToUtc(date: Date, time?: string): Date | null {
  if (!time) return null;
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  // Local Eastern (-04:00) means UTC = local + 4h.
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h + 4, min, 0),
  );
}

/** Escape text per RFC 5545 (backslash, comma, semicolon, newlines). */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
    .trim();
}

/** Fold lines longer than 75 octets per RFC 5545. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

function vevent(ev: IcsEvent, origin: string, dtstamp: string): string[] {
  const start = easternToUtc(ev.date, ev.doorsAt ?? ev.startsAt);
  const end = easternToUtc(ev.date, ev.endsAt);
  const url = `${origin}/boston/${ev.dateSlug}`;

  const lines: string[] = ['BEGIN:VEVENT'];
  lines.push(`UID:${ev.dateSlug}@${DOMAIN}`);
  lines.push(`DTSTAMP:${dtstamp}`);
  if (start) {
    lines.push(`DTSTART:${toUtcStamp(start)}`);
    if (end) lines.push(`DTEND:${toUtcStamp(end)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${toDateValue(ev.date)}`);
  }
  lines.push(`SUMMARY:${escapeText(ev.title)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.venueName) lines.push(`LOCATION:${escapeText(ev.venueName)}`);
  lines.push(`URL:${url}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(events: IcsEvent[], origin: string): string {
  const dtstamp = toUtcStamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The AI Runtime//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:The AI Runtime',
  ];
  for (const ev of events) lines.push(...vevent(ev, origin, dtstamp));
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
