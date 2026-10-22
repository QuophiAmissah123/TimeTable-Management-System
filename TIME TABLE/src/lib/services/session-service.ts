import { prisma } from "@/lib/db/prisma";
import { timeToMinutes } from "@/lib/validation/schemas";

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Converts a Date object or UTC ISO string to YYYY-MM-DD
 */
export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns uppercase Day of Week matching TimetableEntry dayOfWeek enum
 */
export function getDayOfWeekName(date: Date = new Date()): string {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return days[date.getDay()];
}

/**
 * Format duration in seconds to human readable HH:MM:SS
 */
export function formatDurationSeconds(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Starts recording a scheduled class session.
 * Enforces server timestamping, authorized operator identity, and duplicate prevention.
 */
export async function startTeachingSession(
  timetableEntryId: string,
  userId: string,
  overrideDate?: string,
  facilitatorPresent?: string
): Promise<ServiceResult> {
  try {
    const sessionDate = overrideDate || formatDateKey(new Date());

    // 1. Verify timetable entry existence and published status
    const entry = await prisma.timetableEntry.findUnique({
      where: { id: timetableEntryId },
      include: {
        timetableVersion: {
          include: { timetable: true },
        },
        course: true,
        facilitator: true,
      },
    });

    if (!entry) {
      return { success: false, error: "Scheduled class record not found." };
    }

    if (entry.timetableVersion.status !== "PUBLISHED") {
      return {
        success: false,
        error: "Sessions can only be started for published official timetables.",
      };
    }

    // 2. Prevent duplicate active sessions for the exact scheduled occurrence
    const existingActiveSession = await prisma.teachingSession.findFirst({
      where: {
        timetableEntryId,
        sessionDate,
        status: "IN_PROGRESS",
      },
    });

    if (existingActiveSession) {
      return {
        success: false,
        error: "An active teaching session is already in progress for this class occurrence.",
        data: existingActiveSession,
      };
    }

    // 3. Atomically create session and audit log
    const session = await prisma.$transaction(async (tx) => {
      const serverNow = new Date(); // Server-generated UTC instant
      const resolvedFacilitatorPresent =
        facilitatorPresent?.trim() || entry.facilitator.name;

      const created = await tx.teachingSession.create({
        data: {
          timetableEntryId,
          sessionDate,
          status: "IN_PROGRESS",
          startedAt: serverNow,
          startedById: userId,
          lecturerPresent: true,
          facilitatorPresent: resolvedFacilitatorPresent,
          flaggedForReview: false,
        },
        include: {
          startedBy: { select: { id: true, fullName: true, email: true } },
          timetableEntry: {
            include: {
              course: true,
              facilitator: true,
              timetableVersion: {
                include: {
                  timetable: {
                    include: {
                      programme: true,
                      programmeLevel: true,
                      academicPeriod: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          timetableId: entry.timetableVersion.timetableId,
          action: "START_CLASS_SESSION",
          entityType: "SESSION",
          entityId: created.id,
          details: JSON.stringify({
            course: entry.course.code,
            facilitator: entry.facilitator.name,
            sessionDate,
            startedAt: serverNow.toISOString(),
            operatorId: userId,
            notice: "Presence recorded by authorized operator; no biometric verification claimed.",
          }),
        },
      });

      return created;
    });

    return { success: true, data: session };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to start teaching session" };
  }
}

/**
 * Stops an in-progress teaching session.
 * Computes exact duration from server timestamps, checks for overtime review flags,
 * and ensures idempotency against concurrent submissions.
 */
export async function stopTeachingSession(
  sessionId: string,
  userId: string,
  notes?: string,
  studentsPresent?: number | null,
  studentsEnrolled?: number | null,
  facilitatorPresent?: string | null
): Promise<ServiceResult> {
  try {
    // 1. Fetch current session state
    const existing = await prisma.teachingSession.findUnique({
      where: { id: sessionId },
      include: {
        timetableEntry: {
          include: {
            course: true,
            facilitator: true,
            timetableVersion: { include: { timetable: true } },
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "Teaching session not found." };
    }

    // Idempotency: Prevent concurrent or repeated stop requests from overwriting
    if (existing.status === "COMPLETED") {
      return {
        success: false,
        error: "This session has already been completed and cannot be stopped again.",
        data: existing,
      };
    }

    if (existing.status !== "IN_PROGRESS") {
      return {
        success: false,
        error: `Cannot stop session in '${existing.status}' status.`,
      };
    }

    // 2. Capture server end timestamp
    const serverEnd = new Date();
    let serverStart = new Date(existing.startedAt);

    // Invariant: handle clock adjustments / skew gracefully instead of bricking the session
    let clockSkewReconciled = false;
    if (serverEnd.getTime() < serverStart.getTime()) {
      serverStart = serverEnd;
      clockSkewReconciled = true;
    }

    // 3. Calculate duration in seconds
    const durationSeconds = Math.max(
      0,
      Math.floor((serverEnd.getTime() - serverStart.getTime()) / 1000)
    );

    // 4. Overtime / review check: Check if session significantly exceeded scheduled duration
    const entryStartMins = timeToMinutes(existing.timetableEntry.startTime);
    const entryEndMins = timeToMinutes(existing.timetableEntry.endTime);
    const scheduledDurationSeconds = (entryEndMins - entryStartMins) * 60;

    let flaggedForReview = false;
    let reviewReason: string | null = null;

    // If actual teaching duration exceeds scheduled duration by more than 45 minutes (2700s)
    if (scheduledDurationSeconds > 0 && durationSeconds > scheduledDurationSeconds + 2700) {
      flaggedForReview = true;
      reviewReason = `Session duration (${Math.round(durationSeconds / 60)}m) significantly exceeded scheduled allocation (${Math.round(scheduledDurationSeconds / 60)}m). Requires departmental review.`;
    }

    // Sanitize student attendance inputs
    const validStudentsPresent =
      typeof studentsPresent === "number" && !isNaN(studentsPresent) && studentsPresent >= 0
        ? Math.round(studentsPresent)
        : null;
    const validStudentsEnrolled =
      typeof studentsEnrolled === "number" && !isNaN(studentsEnrolled) && studentsEnrolled >= 0
        ? Math.round(studentsEnrolled)
        : null;

    const resolvedFacilitatorPresent =
      facilitatorPresent?.trim() ||
      existing.facilitatorPresent ||
      existing.timetableEntry.facilitator.name;

    // 5. Atomic database transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.teachingSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          startedAt: clockSkewReconciled ? serverEnd : existing.startedAt,
          endedAt: serverEnd,
          endedById: userId,
          durationSeconds,
          flaggedForReview,
          reviewReason,
          facilitatorPresent: resolvedFacilitatorPresent,
          studentsPresent: validStudentsPresent !== null ? validStudentsPresent : existing.studentsPresent,
          studentsEnrolled: validStudentsEnrolled !== null ? validStudentsEnrolled : existing.studentsEnrolled,
          notes: notes
            ? notes.trim()
            : clockSkewReconciled
            ? "Session completed (system clock adjustment reconciled)"
            : existing.notes,
        },
        include: {
          startedBy: { select: { id: true, fullName: true, email: true } },
          endedBy: { select: { id: true, fullName: true, email: true } },
          timetableEntry: {
            include: {
              course: true,
              facilitator: true,
              timetableVersion: {
                include: {
                  timetable: {
                    include: {
                      programme: true,
                      programmeLevel: true,
                      academicPeriod: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          timetableId: existing.timetableEntry.timetableVersion.timetableId,
          action: "STOP_CLASS_SESSION",
          entityType: "SESSION",
          entityId: sessionId,
          details: JSON.stringify({
            course: existing.timetableEntry.course.code,
            leadFacilitator: existing.timetableEntry.facilitator.name,
            facilitatorPresent: resolvedFacilitatorPresent,
            durationSeconds,
            studentsPresent: validStudentsPresent,
            endedAt: serverEnd.toISOString(),
            flaggedForReview,
            reviewReason,
            operatorId: userId,
          }),
        },
      });

      return result;
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to stop teaching session" };
  }
}

/**
 * Manually update student headcount attendance and facilitator present for a teaching session
 */
export async function updateSessionAttendance(
  sessionId: string,
  userId: string,
  studentsPresent: number,
  facilitatorPresent?: string | null,
  studentsEnrolled?: number | null
): Promise<ServiceResult> {
  try {
    const existing = await prisma.teachingSession.findUnique({
      where: { id: sessionId },
      include: {
        timetableEntry: {
          include: {
            timetableVersion: { include: { timetable: true } },
            facilitator: true,
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "Teaching session not found." };
    }

    const validStudentsPresent = Math.max(0, Math.round(studentsPresent));
    const validStudentsEnrolled =
      typeof studentsEnrolled === "number" && !isNaN(studentsEnrolled) && studentsEnrolled >= 0
        ? Math.round(studentsEnrolled)
        : null;

    const resolvedFacilitatorPresent =
      facilitatorPresent?.trim() ||
      existing.facilitatorPresent ||
      existing.timetableEntry.facilitator.name;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.teachingSession.update({
        where: { id: sessionId },
        data: {
          studentsPresent: validStudentsPresent,
          facilitatorPresent: resolvedFacilitatorPresent,
          studentsEnrolled: validStudentsEnrolled !== null ? validStudentsEnrolled : existing.studentsEnrolled,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          timetableId: existing.timetableEntry.timetableVersion.timetableId,
          action: "UPDATE_STUDENT_ATTENDANCE",
          entityType: "SESSION",
          entityId: sessionId,
          details: JSON.stringify({
            studentsPresent: validStudentsPresent,
            facilitatorPresent: resolvedFacilitatorPresent,
            operatorId: userId,
          }),
        },
      });

      return result;
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update attendance" };
  }
}

export const updateSessionStudentAttendance = updateSessionAttendance;

/**
 * Retrieves today's scheduled classes from official published timetables,
 * augmented with their current session tracking status (SCHEDULED, IN_PROGRESS, COMPLETED).
 */
export async function getTodayScheduledClasses(targetDate?: string): Promise<ServiceResult> {
  try {
    const sessionDate = targetDate || formatDateKey(new Date());
    // Parse target date to get the day of the week
    const [y, m, d] = sessionDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = getDayOfWeekName(dateObj);

    // 1. Find all active entries for this day from currently PUBLISHED timetables
    const entries = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek,
        timetableVersion: {
          status: "PUBLISHED",
          timetable: {
            status: "PUBLISHED",
          },
        },
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
                academicPeriod: true,
              },
            },
          },
        },
        teachingSessions: {
          where: { sessionDate },
          orderBy: { startedAt: "desc" },
          include: {
            startedBy: { select: { id: true, fullName: true, email: true } },
            endedBy: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: [{ startTime: "asc" }],
    });

    // 2. Map entries with their session state
    const scheduledClasses = entries.map((entry) => {
      // Find latest session for this date
      const activeSession = entry.teachingSessions.find((s) => s.status === "IN_PROGRESS");
      const completedSession = entry.teachingSessions.find((s) => s.status === "COMPLETED");
      const latestSession = entry.teachingSessions[0] || null;

      let displayStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "REQUIRES_REVIEW" = "SCHEDULED";
      if (activeSession) {
        displayStatus = "IN_PROGRESS";
      } else if (completedSession) {
        displayStatus = completedSession.flaggedForReview ? "REQUIRES_REVIEW" : "COMPLETED";
      }

      return {
        entry,
        sessionDate,
        dayOfWeek,
        displayStatus,
        activeSession: activeSession || null,
        completedSession: completedSession || null,
        latestSession,
      };
    });

    return { success: true, data: scheduledClasses };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load today's scheduled classes" };
  }
}

/**
 * Retrieves teaching session records with comprehensive multi-criteria filtering.
 */
export async function getTeachingSessionsReport(filters?: {
  startDate?: string;
  endDate?: string;
  facilitatorId?: string;
  programmeId?: string;
  status?: string;
}): Promise<ServiceResult> {
  try {
    const where: any = {};

    if (filters?.startDate && filters?.endDate) {
      where.sessionDate = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    } else if (filters?.startDate) {
      where.sessionDate = { gte: filters.startDate };
    } else if (filters?.endDate) {
      where.sessionDate = { lte: filters.endDate };
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.facilitatorId && filters.facilitatorId !== "ALL") {
      where.timetableEntry = {
        ...where.timetableEntry,
        facilitatorId: filters.facilitatorId,
      };
    }

    if (filters?.programmeId && filters.programmeId !== "ALL") {
      where.timetableEntry = {
        ...where.timetableEntry,
        timetableVersion: {
          timetable: {
            programmeId: filters.programmeId,
          },
        },
      };
    }

    const sessions = await prisma.teachingSession.findMany({
      where,
      orderBy: [{ sessionDate: "desc" }, { startedAt: "desc" }],
      include: {
        startedBy: { select: { id: true, fullName: true, email: true } },
        endedBy: { select: { id: true, fullName: true, email: true } },
        timetableEntry: {
          include: {
            course: true,
            facilitator: true,
            timetableVersion: {
              include: {
                timetable: {
                  include: {
                    programme: true,
                    programmeLevel: true,
                    academicPeriod: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return { success: true, data: sessions };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load session reports" };
  }
}

/**
 * Generates an institutional RFC 4180 CSV export of teaching sessions with UTF-8 BOM.
 */
export async function generateSessionsCsv(filters?: {
  startDate?: string;
  endDate?: string;
  facilitatorId?: string;
  programmeId?: string;
  status?: string;
}): Promise<string> {
  const result = await getTeachingSessionsReport(filters);
  const sessions = result.data || [];

  const headers = [
    "Session Date",
    "Academic Period",
    "Programme",
    "Level",
    "Course Code",
    "Course Name",
    "Lead Facilitator (Timetable)",
    "Facilitator Present",
    "Department",
    "Scheduled Day",
    "Scheduled Time",
    "Venue",
    "Recorded Start (UTC)",
    "Recorded End (UTC)",
    "Duration (Seconds)",
    "Duration (HH:MM:SS)",
    "Duration (Minutes)",
    "Lecturer Present",
    "Students Present",
    "Session Status",
    "Recorded By (Operator)",
    "Flagged for Review",
    "Review Reason",
    "Notes",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = sessions.map((s: any) => {
    const entry = s.timetableEntry;
    const timetable = entry?.timetableVersion?.timetable;
    const course = entry?.course;
    const facilitator = entry?.facilitator;
    const period = timetable?.academicPeriod;

    const durationSec = s.durationSeconds || 0;
    const formattedDuration = formatDurationSeconds(durationSec);
    const durationMinutes = Math.round(durationSec / 60);

    const studentsPresent = s.studentsPresent !== null && s.studentsPresent !== undefined ? s.studentsPresent : "";
    const facilitatorPresent = s.facilitatorPresent || facilitator?.name || "Unassigned";

    return [
      escapeCsv(s.sessionDate),
      escapeCsv(`${period?.academicYear || ""} ${period?.semester || ""}`.trim()),
      escapeCsv(timetable?.programme?.name || ""),
      escapeCsv(timetable?.programmeLevel?.levelName || ""),
      escapeCsv(course?.code || ""),
      escapeCsv(course?.name || ""),
      escapeCsv(facilitator?.name || ""),
      escapeCsv(facilitatorPresent),
      escapeCsv(facilitator?.department || "Unassigned"),
      escapeCsv(entry?.dayOfWeek || ""),
      escapeCsv(`${entry?.startTime} - ${entry?.endTime}`),
      escapeCsv(entry?.venue || ""),
      escapeCsv(s.startedAt ? new Date(s.startedAt).toISOString() : ""),
      escapeCsv(s.endedAt ? new Date(s.endedAt).toISOString() : "In Progress"),
      escapeCsv(durationSec),
      escapeCsv(formattedDuration),
      escapeCsv(durationMinutes),
      escapeCsv(s.lecturerPresent ? "YES" : "NO"),
      escapeCsv(studentsPresent),
      escapeCsv(s.status),
      escapeCsv(s.startedBy?.fullName || s.startedBy?.email || "System Operator"),
      escapeCsv(s.flaggedForReview ? "YES" : "NO"),
      escapeCsv(s.reviewReason || ""),
      escapeCsv(s.notes || ""),
    ].join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) for immediate, flawless Excel recognition
  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}
