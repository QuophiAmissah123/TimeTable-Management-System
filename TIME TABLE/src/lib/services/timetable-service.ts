import { prisma } from "@/lib/db/prisma";
import {
  detectSchedulingConflicts,
  validateEntireTimetableVersion,
  CandidateEntry,
  SchedulingConflict,
} from "@/lib/conflict/conflict-engine";
import { TimetableEntryInput } from "@/lib/validation/schemas";

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  conflicts?: SchedulingConflict[];
}

/**
 * Creates a new timetable for a specific Programme, Level, and Academic Period
 * along with an initial DRAFT Version (v1).
 */
export async function createTimetable(
  programmeId: string,
  programmeLevelId: string,
  academicPeriodId: string,
  userId?: string
): Promise<ServiceResult> {
  try {
    // Check if a timetable already exists for this exact combination
    const existing = await prisma.timetable.findUnique({
      where: {
        programmeId_programmeLevelId_academicPeriodId: {
          programmeId,
          programmeLevelId,
          academicPeriodId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error:
          "A timetable already exists for this Programme, Level, and Academic Period.",
      };
    }

    const timetable = await prisma.$transaction(async (tx) => {
      const created = await tx.timetable.create({
        data: {
          programmeId,
          programmeLevelId,
          academicPeriodId,
          status: "DRAFT",
          versions: {
            create: {
              versionNumber: 1,
              status: "DRAFT",
              notes: "Initial Draft Version",
            },
          },
        },
        include: {
          versions: true,
          programme: true,
          programmeLevel: true,
          academicPeriod: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          timetableId: created.id,
          action: "CREATE_TIMETABLE",
          entityType: "TIMETABLE",
          entityId: created.id,
          details: JSON.stringify({
            programme: created.programme.name,
            level: created.programmeLevel.levelName,
            period: `${created.academicPeriod.academicYear} ${created.academicPeriod.semester}`,
          }),
        },
      });

      return created;
    });

    return { success: true, data: timetable };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create timetable" };
  }
}

/**
 * Adds or updates a timetable entry in a DRAFT version.
 * Strictly verifies version immutability and runs the conflict detection engine.
 */
export async function saveTimetableEntry(
  input: TimetableEntryInput & { id?: string },
  userId?: string
): Promise<ServiceResult> {
  try {
    // 1. Verify target version exists and is mutable
    const version = await prisma.timetableVersion.findUnique({
      where: { id: input.timetableVersionId },
      include: { timetable: true },
    });

    if (!version) {
      return { success: false, error: "Timetable version not found." };
    }

    if (version.status === "PUBLISHED" || version.status === "SUPERSEDED") {
      return {
        success: false,
        error:
          "Published and superseded versions are immutable. Create a new draft revision to make edits.",
      };
    }

    // 2. Run Conflict Detection Engine
    const conflicts = await detectSchedulingConflicts(input as CandidateEntry);
    if (conflicts.length > 0) {
      return {
        success: false,
        error: "Scheduling conflicts detected.",
        conflicts,
      };
    }

    // 3. Save Entry
    let entry;
    if (input.id) {
      entry = await prisma.timetableEntry.update({
        where: { id: input.id },
        data: {
          courseId: input.courseId,
          facilitatorId: input.facilitatorId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          venue: input.venue.trim(),
        },
        include: { course: true, facilitator: true },
      });
    } else {
      entry = await prisma.timetableEntry.create({
        data: {
          timetableVersionId: input.timetableVersionId,
          courseId: input.courseId,
          facilitatorId: input.facilitatorId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          venue: input.venue.trim(),
        },
        include: { course: true, facilitator: true },
      });
    }

    // If version was in VALIDATED state, modifying an entry reverts it back to DRAFT
    if (version.status === "VALIDATED") {
      await prisma.timetableVersion.update({
        where: { id: version.id },
        data: { status: "DRAFT" },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        timetableId: version.timetableId,
        action: input.id ? "UPDATE_ENTRY" : "CREATE_ENTRY",
        entityType: "ENTRY",
        entityId: entry.id,
        details: JSON.stringify({
          course: entry.course.code,
          day: entry.dayOfWeek,
          time: `${entry.startTime}-${entry.endTime}`,
          venue: entry.venue,
        }),
      },
    });

    return { success: true, data: entry };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save entry" };
  }
}

/**
 * Removes an entry from a mutable timetable version.
 */
export async function deleteTimetableEntry(
  entryId: string,
  userId?: string
): Promise<ServiceResult> {
  try {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id: entryId },
      include: {
        timetableVersion: { include: { timetable: true } },
        course: true,
      },
    });

    if (!entry) {
      return { success: false, error: "Entry not found." };
    }

    if (
      entry.timetableVersion.status === "PUBLISHED" ||
      entry.timetableVersion.status === "SUPERSEDED"
    ) {
      return {
        success: false,
        error: "Cannot delete entries from immutable published versions.",
      };
    }

    await prisma.timetableEntry.delete({
      where: { id: entryId },
    });

    // Revert VALIDATED back to DRAFT if an entry is removed
    if (entry.timetableVersion.status === "VALIDATED") {
      await prisma.timetableVersion.update({
        where: { id: entry.timetableVersion.id },
        data: { status: "DRAFT" },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        timetableId: entry.timetableVersion.timetableId,
        action: "DELETE_ENTRY",
        entityType: "ENTRY",
        entityId: entryId,
        details: JSON.stringify({
          course: entry.course.code,
          time: `${entry.startTime}-${entry.endTime}`,
        }),
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete entry" };
  }
}

/**
 * Validates a timetable version. If zero conflicts exist, advances status to VALIDATED.
 */
export async function validateTimetableVersion(
  versionId: string,
  userId?: string
): Promise<ServiceResult> {
  try {
    const { isValid, conflicts } = await validateEntireTimetableVersion(versionId);

    if (!isValid) {
      return {
        success: false,
        error: "Validation failed: Scheduling conflicts detected.",
        conflicts,
      };
    }

    const updated = await prisma.timetableVersion.update({
      where: { id: versionId },
      data: { status: "VALIDATED" },
      include: { timetable: true },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        timetableId: updated.timetableId,
        action: "VALIDATE_VERSION",
        entityType: "VERSION",
        entityId: versionId,
        details: JSON.stringify({ versionNumber: updated.versionNumber }),
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to validate version" };
  }
}

/**
 * Publishes a timetable version.
 * Ensures version is conflict-free, seals it as PUBLISHED, marks any prior published
 * version as SUPERSEDED, and atomically updates the parent Timetable.
 */
export async function publishTimetableVersion(
  versionId: string,
  notes?: string | null,
  userId?: string
): Promise<ServiceResult> {
  try {
    // 1. Enforce validation before publication
    const { isValid, conflicts } = await validateEntireTimetableVersion(versionId);
    if (!isValid) {
      return {
        success: false,
        error: "Cannot publish: Version contains unresolved scheduling conflicts.",
        conflicts,
      };
    }

    const version = await prisma.timetableVersion.findUnique({
      where: { id: versionId },
      include: { timetable: true },
    });

    if (!version) {
      return { success: false, error: "Timetable version not found." };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark any currently published version of this timetable as SUPERSEDED
      await tx.timetableVersion.updateMany({
        where: {
          timetableId: version.timetableId,
          status: "PUBLISHED",
        },
        data: {
          status: "SUPERSEDED",
        },
      });

      // Mark this version as PUBLISHED
      const published = await tx.timetableVersion.update({
        where: { id: versionId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedById: userId,
          notes: notes || version.notes,
        },
        include: {
          entries: {
            include: { course: true, facilitator: true },
          },
        },
      });

      // Update parent Timetable
      await tx.timetable.update({
        where: { id: version.timetableId },
        data: {
          status: "PUBLISHED",
          currentPublishedVersionId: versionId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          timetableId: version.timetableId,
          action: "PUBLISH_TIMETABLE",
          entityType: "VERSION",
          entityId: versionId,
          details: JSON.stringify({
            versionNumber: published.versionNumber,
            entriesCount: published.entries.length,
            notes,
          }),
        },
      });

      return published;
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to publish version" };
  }
}

/**
 * Forks a new DRAFT version from an existing published timetable.
 * Copies all entries over into the new version so the published version remains immutable.
 */
export async function createDraftRevision(
  timetableId: string,
  userId?: string
): Promise<ServiceResult> {
  try {
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            entries: true,
          },
        },
      },
    });

    if (!timetable || timetable.versions.length === 0) {
      return { success: false, error: "Timetable or base version not found." };
    }

    const latestVersion = timetable.versions[0];
    const newVersionNumber = latestVersion.versionNumber + 1;

    const newVersion = await prisma.$transaction(async (tx) => {
      const createdVersion = await tx.timetableVersion.create({
        data: {
          timetableId,
          versionNumber: newVersionNumber,
          status: "DRAFT",
          notes: `Draft revision branched from Version ${latestVersion.versionNumber}`,
        },
      });

      // Copy entries
      if (latestVersion.entries.length > 0) {
        await tx.timetableEntry.createMany({
          data: latestVersion.entries.map((entry) => ({
            timetableVersionId: createdVersion.id,
            courseId: entry.courseId,
            facilitatorId: entry.facilitatorId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            venue: entry.venue,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          timetableId,
          action: "CREATE_DRAFT_REVISION",
          entityType: "VERSION",
          entityId: createdVersion.id,
          details: JSON.stringify({
            fromVersion: latestVersion.versionNumber,
            newVersion: newVersionNumber,
            copiedEntries: latestVersion.entries.length,
          }),
        },
      });

      return createdVersion;
    });

    return { success: true, data: newVersion };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create draft revision" };
  }
}

async function resolveAuditUserId(userId?: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user ? user.id : null;
  } catch {
    return null;
  }
}

/**
 * Schedules a timetable version for automated publication at a specified future date/time.
 * Automatically verifies that the version has zero scheduling conflicts.
 */
export async function scheduleVersionPublication(
  versionId: string,
  scheduledPublishAt: Date | string,
  userId?: string
): Promise<ServiceResult> {
  try {
    const version = await prisma.timetableVersion.findUnique({
      where: { id: versionId },
      include: { timetable: true },
    });

    if (!version) {
      return { success: false, error: "Timetable version not found." };
    }

    if (version.status === "PUBLISHED" || version.status === "SUPERSEDED") {
      return {
        success: false,
        error: "Cannot schedule an already published or superseded version.",
      };
    }

    const scheduledDate = new Date(scheduledPublishAt);
    if (isNaN(scheduledDate.getTime())) {
      return { success: false, error: "Invalid schedule date and time." };
    }

    // Ensure zero conflicts before scheduling
    const { isValid, conflicts } = await validateEntireTimetableVersion(versionId);
    if (!isValid) {
      return {
        success: false,
        error: "Cannot schedule publication: Version has unresolved scheduling conflicts.",
        conflicts,
      };
    }

    const validUserId = await resolveAuditUserId(userId);

    const updated = await prisma.timetableVersion.update({
      where: { id: versionId },
      data: {
        scheduledPublishAt: scheduledDate,
        scheduledById: validUserId,
        status: "VALIDATED",
      },
      include: { timetable: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        timetableId: version.timetableId,
        action: "SCHEDULE_PUBLICATION",
        entityType: "VERSION",
        entityId: versionId,
        details: JSON.stringify({
          scheduledPublishAt: scheduledDate.toISOString(),
          versionNumber: version.versionNumber,
        }),
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to schedule publication" };
  }
}

/**
 * Cancels a previously scheduled publication for a timetable version.
 */
export async function cancelScheduledPublication(
  versionId: string,
  userId?: string
): Promise<ServiceResult> {
  try {
    const version = await prisma.timetableVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return { success: false, error: "Timetable version not found." };
    }

    const validUserId = await resolveAuditUserId(userId);

    const updated = await prisma.timetableVersion.update({
      where: { id: versionId },
      data: {
        scheduledPublishAt: null,
        scheduledById: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        timetableId: version.timetableId,
        action: "CANCEL_SCHEDULED_PUBLICATION",
        entityType: "VERSION",
        entityId: versionId,
        details: JSON.stringify({
          versionNumber: version.versionNumber,
        }),
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to cancel scheduled publication" };
  }
}

/**
 * Checks for any timetables scheduled to publish that are due now or overdue.
 * Designed to be called automatically on admin dashboard/page load.
 */
export async function processScheduledPublications(): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  try {
    const now = new Date();
    const dueVersions = await prisma.timetableVersion.findMany({
      where: {
        scheduledPublishAt: {
          lte: now,
          not: null,
        },
        status: {
          notIn: ["PUBLISHED", "SUPERSEDED"],
        },
      },
      include: {
        timetable: true,
      },
    });

    for (const version of dueVersions) {
      try {
        const pubResult = await publishTimetableVersion(
          version.id,
          version.notes
            ? `${version.notes} (Auto-published on schedule)`
            : "Auto-published on schedule",
          version.scheduledById || undefined
        );

        if (pubResult.success) {
          await prisma.timetableVersion.update({
            where: { id: version.id },
            data: {
              scheduledPublishAt: null,
            },
          });
          processed++;
        } else {
          errors.push(`Version ${version.id} publication failed: ${pubResult.error}`);
        }
      } catch (err: any) {
        errors.push(`Version ${version.id} error: ${err.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Scheduled processing failed: ${error.message}`);
  }

  return { processed, errors };
}

export interface CsvImportRow {
  courseCode: string;
  courseName?: string;
  facilitatorName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  conflicts: SchedulingConflict[];
}

const VALID_DAYS_MAP: Record<string, string> = {
  MONDAY: "MONDAY",
  MON: "MONDAY",
  TUESDAY: "TUESDAY",
  TUE: "TUESDAY",
  TUES: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  WED: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  THU: "THURSDAY",
  THUR: "THURSDAY",
  THURS: "THURSDAY",
  FRIDAY: "FRIDAY",
  FRI: "FRIDAY",
  SATURDAY: "SATURDAY",
  SAT: "SATURDAY",
  SUNDAY: "SUNDAY",
  SUN: "SUNDAY",
};

function normalizeTimeString(timeStr: string): string {
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return timeStr.trim();
  const hours = parts[0].padStart(2, "0");
  const minutes = parts[1].padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Imports timetable sessions from parsed CSV rows into a DRAFT timetable version.
 * Runs the conflict detection engine against each row and records conflicting or invalid entries.
 */
export async function importTimetableFromCsv(
  versionId: string,
  rows: CsvImportRow[],
  userId?: string
): Promise<ServiceResult<CsvImportResult>> {
  try {
    const version = await prisma.timetableVersion.findUnique({
      where: { id: versionId },
      include: { timetable: true },
    });

    if (!version) {
      return { success: false, error: "Timetable version not found." };
    }

    if (version.status === "PUBLISHED" || version.status === "SUPERSEDED") {
      return {
        success: false,
        error:
          "Published and superseded versions are immutable. Create a new draft revision to import.",
      };
    }

    // Cache existing courses and facilitators
    const existingCourses = await prisma.course.findMany();
    const existingFacilitators = await prisma.facilitator.findMany();

    const courseMap = new Map<string, typeof existingCourses[0]>();
    for (const c of existingCourses) {
      courseMap.set(c.code.toUpperCase().replace(/\s+/g, ""), c);
    }

    const facilitatorMap = new Map<string, typeof existingFacilitators[0]>();
    for (const f of existingFacilitators) {
      facilitatorMap.set(f.name.toLowerCase().trim(), f);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const allConflicts: SchedulingConflict[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required columns
      if (
        !row.courseCode?.trim() ||
        !row.facilitatorName?.trim() ||
        !row.dayOfWeek?.trim() ||
        !row.startTime?.trim() ||
        !row.endTime?.trim() ||
        !row.venue?.trim()
      ) {
        errors.push(`Row ${rowNum}: Missing required fields (Course, Facilitator, Day, Time, or Venue).`);
        skipped++;
        continue;
      }

      // Validate Day of Week
      const normalizedDayInput = row.dayOfWeek.trim().toUpperCase();
      const validDay = VALID_DAYS_MAP[normalizedDayInput];
      if (!validDay) {
        errors.push(`Row ${rowNum}: Invalid day of week "${row.dayOfWeek}". Expected Monday-Sunday.`);
        skipped++;
        continue;
      }

      // Normalize & Validate Times
      const normStart = normalizeTimeString(row.startTime);
      const normEnd = normalizeTimeString(row.endTime);
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(normStart) || !timeRegex.test(normEnd)) {
        errors.push(`Row ${rowNum}: Invalid time format. Expected HH:mm (e.g. 08:30).`);
        skipped++;
        continue;
      }

      // Match or Create Course
      const cleanCourseCode = row.courseCode.trim().toUpperCase().replace(/\s+/g, "");
      let course = courseMap.get(cleanCourseCode);
      if (!course) {
        course = await prisma.course.create({
          data: {
            code: cleanCourseCode,
            name: row.courseName?.trim() || `Course ${cleanCourseCode}`,
            creditHours: 3,
          },
        });
        courseMap.set(cleanCourseCode, course);
      }

      // Match or Create Facilitator
      const cleanFacName = row.facilitatorName.trim();
      const facKey = cleanFacName.toLowerCase();
      let facilitator = facilitatorMap.get(facKey);
      if (!facilitator) {
        facilitator = await prisma.facilitator.create({
          data: {
            name: cleanFacName,
            department: "Academic Department",
          },
        });
        facilitatorMap.set(facKey, facilitator);
      }

      // Run Conflict Detection
      const candidate: CandidateEntry = {
        timetableVersionId: versionId,
        courseId: course.id,
        facilitatorId: facilitator.id,
        dayOfWeek: validDay,
        startTime: normStart,
        endTime: normEnd,
        venue: row.venue.trim(),
      };

      const conflicts = await detectSchedulingConflicts(candidate);
      if (conflicts.length > 0) {
        allConflicts.push(...conflicts);
        errors.push(`Row ${rowNum} (${cleanCourseCode} on ${validDay}): ${conflicts[0].message}`);
        skipped++;
        continue;
      }

      // Insert valid entry
      await prisma.timetableEntry.create({
        data: candidate,
      });
      imported++;
    }

    // If version was in VALIDATED state, modifying an entry reverts it back to DRAFT
    if (imported > 0 && version.status === "VALIDATED") {
      await prisma.timetableVersion.update({
        where: { id: version.id },
        data: { status: "DRAFT" },
      });
    }

    if (imported > 0) {
      const validUserId = await resolveAuditUserId(userId);
      await prisma.auditLog.create({
        data: {
          userId: validUserId,
          timetableId: version.timetableId,
          action: "IMPORT_CSV",
          entityType: "VERSION",
          entityId: versionId,
          details: JSON.stringify({
            imported,
            skipped,
            totalRows: rows.length,
          }),
        },
      });
    }

    return {
      success: true,
      data: {
        imported,
        skipped,
        errors,
        conflicts: allConflicts,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to import timetable from CSV" };
  }
}

