import { prisma } from "@/lib/db/prisma";
import { timeToMinutes } from "@/lib/validation/schemas";

export interface SchedulingConflict {
  type: "FACILITATOR_CLASH" | "VENUE_CLASH" | "COHORT_CLASH" | "TIME_INVALID";
  severity: "ERROR" | "WARNING";
  message: string;
  conflictingEntryId?: string;
  courseCode?: string;
  courseName?: string;
  facilitatorName?: string;
  venue?: string;
  dayOfWeek?: string;
  timeRange?: string;
  timetableId?: string;
  programmeName?: string;
  levelName?: string;
}

export function checkIntervalOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const minStartA = timeToMinutes(startA);
  const minEndA = timeToMinutes(endA);
  const minStartB = timeToMinutes(startB);
  const minEndB = timeToMinutes(endB);

  return Math.max(minStartA, minStartB) < Math.min(minEndA, minEndB);
}

export interface CandidateEntry {
  id?: string; // If editing an existing entry, ignore itself
  timetableVersionId: string;
  courseId: string;
  facilitatorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
}

/**
 * Validates a candidate entry against all relevant business rules:
 * 1. Time range validity (endTime > startTime)
 * 2. Cohort overlap (two sessions at same time in this timetable version)
 * 3. Facilitator double-booking across the academic period
 * 4. Venue/Room clash across the academic period
 */
export async function detectSchedulingConflicts(
  candidate: CandidateEntry
): Promise<SchedulingConflict[]> {
  const conflicts: SchedulingConflict[] = [];

  // 1. Time Validity Check
  const startMin = timeToMinutes(candidate.startTime);
  const endMin = timeToMinutes(candidate.endTime);
  if (endMin <= startMin) {
    conflicts.push({
      type: "TIME_INVALID",
      severity: "ERROR",
      message: `Invalid time range: End time (${candidate.endTime}) must be strictly after start time (${candidate.startTime}).`,
    });
    return conflicts; // Fatal error, cannot proceed with interval math
  }

  // Retrieve current version with its timetable and academic period
  const currentVersion = await prisma.timetableVersion.findUnique({
    where: { id: candidate.timetableVersionId },
    include: {
      timetable: {
        include: {
          programme: true,
          programmeLevel: true,
          academicPeriod: true,
        },
      },
    },
  });

  if (!currentVersion) {
    throw new Error(`Timetable version ${candidate.timetableVersionId} not found.`);
  }

  const { academicPeriodId } = currentVersion.timetable;

  // 2. Cohort Conflict Check: Check all other entries within THIS version
  const versionEntries = await prisma.timetableEntry.findMany({
    where: {
      timetableVersionId: candidate.timetableVersionId,
      ...(candidate.id ? { id: { not: candidate.id } } : {}),
      dayOfWeek: candidate.dayOfWeek,
    },
    include: {
      course: true,
      facilitator: true,
    },
  });

  for (const existing of versionEntries) {
    if (checkIntervalOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)) {
      conflicts.push({
        type: "COHORT_CLASH",
        severity: "ERROR",
        message: `Student Cohort Conflict: ${currentVersion.timetable.programme.code} ${currentVersion.timetable.programmeLevel.levelCode} already has "${existing.course.code} - ${existing.course.name}" scheduled on ${existing.dayOfWeek} from ${existing.startTime} to ${existing.endTime}.`,
        conflictingEntryId: existing.id,
        courseCode: existing.course.code,
        courseName: existing.course.name,
        facilitatorName: existing.facilitator.name,
        venue: existing.venue,
        dayOfWeek: existing.dayOfWeek,
        timeRange: `${existing.startTime} - ${existing.endTime}`,
      });
    }
  }

  // 3 & 4. Facilitator and Venue Conflicts across the ENTIRE Academic Period
  // We check published versions and active draft versions in the same academic period
  const periodEntries = await prisma.timetableEntry.findMany({
    where: {
      dayOfWeek: candidate.dayOfWeek,
      ...(candidate.id ? { id: { not: candidate.id } } : {}),
      timetableVersion: {
        timetable: {
          academicPeriodId: academicPeriodId,
        },
        // We check entries in PUBLISHED versions or the version we are currently editing
        OR: [
          { status: "PUBLISHED" },
          { id: candidate.timetableVersionId },
        ],
      },
      OR: [
        { facilitatorId: candidate.facilitatorId },
        { venue: { equals: candidate.venue.trim() } },
      ],
    },
    include: {
      course: true,
      facilitator: true,
      timetableVersion: {
        include: {
          timetable: {
            include: {
              programme: true,
              programmeLevel: true,
            },
          },
        },
      },
    },
  });

  for (const existing of periodEntries) {
    // Check if intervals overlap
    if (checkIntervalOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)) {
      // Facilitator Clash
      if (existing.facilitatorId === candidate.facilitatorId) {
        conflicts.push({
          type: "FACILITATOR_CLASH",
          severity: "ERROR",
          message: `Facilitator Conflict: ${existing.facilitator.name} is already assigned to "${existing.course.code}" (${existing.timetableVersion.timetable.programme.code} ${existing.timetableVersion.timetable.programmeLevel.levelCode}) on ${existing.dayOfWeek} from ${existing.startTime} to ${existing.endTime} in ${existing.venue}.`,
          conflictingEntryId: existing.id,
          courseCode: existing.course.code,
          courseName: existing.course.name,
          facilitatorName: existing.facilitator.name,
          venue: existing.venue,
          dayOfWeek: existing.dayOfWeek,
          timeRange: `${existing.startTime} - ${existing.endTime}`,
          programmeName: existing.timetableVersion.timetable.programme.name,
          levelName: existing.timetableVersion.timetable.programmeLevel.levelName,
        });
      }

      // Venue Clash (case-insensitive check)
      if (existing.venue.trim().toLowerCase() === candidate.venue.trim().toLowerCase()) {
        conflicts.push({
          type: "VENUE_CLASH",
          severity: "ERROR",
          message: `Venue Conflict: Room "${existing.venue}" is already booked by "${existing.course.code}" (${existing.timetableVersion.timetable.programme.code}) on ${existing.dayOfWeek} from ${existing.startTime} to ${existing.endTime}.`,
          conflictingEntryId: existing.id,
          courseCode: existing.course.code,
          courseName: existing.course.name,
          facilitatorName: existing.facilitator.name,
          venue: existing.venue,
          dayOfWeek: existing.dayOfWeek,
          timeRange: `${existing.startTime} - ${existing.endTime}`,
          programmeName: existing.timetableVersion.timetable.programme.name,
          levelName: existing.timetableVersion.timetable.programmeLevel.levelName,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Validates an entire timetable version to ensure all entries are conflict-free
 * before transitioning to VALIDATED or PUBLISHED status.
 */
export async function validateEntireTimetableVersion(
  versionId: string
): Promise<{ isValid: boolean; conflicts: SchedulingConflict[] }> {
  const version = await prisma.timetableVersion.findUnique({
    where: { id: versionId },
    include: {
      entries: {
        include: {
          course: true,
          facilitator: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error(`Timetable version ${versionId} not found.`);
  }

  const allConflicts: SchedulingConflict[] = [];

  for (const entry of version.entries) {
    const entryConflicts = await detectSchedulingConflicts({
      id: entry.id,
      timetableVersionId: version.id,
      courseId: entry.courseId,
      facilitatorId: entry.facilitatorId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      venue: entry.venue,
    });

    allConflicts.push(...entryConflicts);
  }

  // Deduplicate conflicts
  const uniqueMessages = new Set<string>();
  const deduplicated = allConflicts.filter((c) => {
    if (uniqueMessages.has(c.message)) return false;
    uniqueMessages.add(c.message);
    return true;
  });

  return {
    isValid: deduplicated.length === 0,
    conflicts: deduplicated,
  };
}
