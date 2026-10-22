/**
 * RFC 5545 iCalendar (.ics) Generator and Calendar Link Utilities
 * Formats academic timetable entries into standard calendar events for Google Calendar, Apple Calendar, and Outlook.
 */

const DAY_MAP_ICAL: Record<string, string> = {
  MONDAY: "MO",
  TUESDAY: "TU",
  WEDNESDAY: "WE",
  THURSDAY: "TH",
  FRIDAY: "FR",
  SATURDAY: "SA",
  SUNDAY: "SU",
};

const DAY_INDEX_MAP: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export interface TimetableEntryCalendarItem {
  id: string;
  dayOfWeek: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  venue: string;
  course: {
    code: string;
    name: string;
  };
  facilitator: {
    name: string;
    department?: string | null;
  };
  timetableVersion?: {
    timetable?: {
      programme?: {
        name: string;
        code: string;
      } | null;
      programmeLevel?: {
        levelName: string;
        levelCode: string;
      } | null;
      academicPeriod?: {
        academicYear: string;
        semester: string;
        startDate?: Date | null;
        endDate?: Date | null;
      } | null;
    } | null;
  } | null;
}

/**
 * Calculates the next or baseline date matching the target Day of Week
 */
function getBaselineDateForDay(dayOfWeek: string, referenceDate: Date = new Date()): Date {
  const targetDay = DAY_INDEX_MAP[dayOfWeek.toUpperCase()] ?? 1;
  const currentDay = referenceDate.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7; // Nearest upcoming day

  const result = new Date(referenceDate);
  result.setDate(referenceDate.getDate() + diff);
  return result;
}

function formatIcsDateTime(date: Date, timeStr: string): string {
  const [hours, mins] = timeStr.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours || 0, mins || 0, 0, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return `${year}${month}${day}T${hh}${mm}${ss}`;
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content
 */
export function generateIcsCalendar(
  calendarName: string,
  entries: TimetableEntryCalendarItem[],
  semesterEndDate?: Date | null
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//College Academic Timetable//Lecture Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const nowStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
    now.getUTCHours()
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  for (const entry of entries) {
    const dayCode = DAY_MAP_ICAL[entry.dayOfWeek.toUpperCase()] || "MO";
    const baselineDate = getBaselineDateForDay(entry.dayOfWeek);

    const dtStart = formatIcsDateTime(baselineDate, entry.startTime);
    const dtEnd = formatIcsDateTime(baselineDate, entry.endTime);

    const prog = entry.timetableVersion?.timetable?.programme;
    const level = entry.timetableVersion?.timetable?.programmeLevel;
    const period = entry.timetableVersion?.timetable?.academicPeriod;

    const progInfo = prog ? `${prog.code} (${level?.levelName || ""})` : "";
    const summary = `${entry.course.code}: ${entry.course.name}`;
    const description = `Lecturer: ${entry.facilitator.name}\nDepartment: ${
      entry.facilitator.department || "Faculty"
    }\nVenue: ${entry.venue}\nProgramme: ${progInfo}\nAcademic Period: ${
      period ? `${period.academicYear} ${period.semester}` : ""
    }`;

    // Recurrence rule: repeat weekly until end of academic period (or 16 weeks by default)
    let rrule = `FREQ=WEEKLY;BYDAY=${dayCode}`;
    if (semesterEndDate) {
      const untilDate = formatIcsDateTime(new Date(semesterEndDate), "23:59");
      rrule += `;UNTIL=${untilDate}`;
    } else {
      // Default to 16 weeks duration
      const until = new Date(baselineDate);
      until.setDate(until.getDate() + 16 * 7);
      rrule += `;UNTIL=${formatIcsDateTime(until, "23:59")}`;
    }

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:lecture-${entry.id}@timetable.university.edu`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`RRULE:${rrule}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push(`LOCATION:${escapeIcsText(entry.venue)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 mandates CRLF line breaks
  return lines.join("\r\n") + "\r\n";
}

/**
 * Generates a direct "Add to Google Calendar" web link for a lecture session
 */
export function generateGoogleCalendarUrl(
  entry: TimetableEntryCalendarItem,
  specificDate?: Date
): string {
  const baseDate = specificDate || getBaselineDateForDay(entry.dayOfWeek);
  const dtStart = formatIcsDateTime(baseDate, entry.startTime);
  const dtEnd = formatIcsDateTime(baseDate, entry.endTime);

  const prog = entry.timetableVersion?.timetable?.programme;
  const level = entry.timetableVersion?.timetable?.programmeLevel;
  const progInfo = prog ? ` [${prog.code} ${level?.levelCode || ""}]` : "";

  const title = `${entry.course.code}: ${entry.course.name}${progInfo}`;
  const details = `Lecturer: ${entry.facilitator.name}\nVenue: ${entry.venue}\nCourse: ${entry.course.name} (${entry.course.code})`;
  const dayCode = DAY_MAP_ICAL[entry.dayOfWeek.toUpperCase()] || "MO";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: entry.venue,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${dayCode}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
