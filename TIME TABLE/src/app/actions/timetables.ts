"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import {
  createTimetable,
  saveTimetableEntry,
  deleteTimetableEntry,
  validateTimetableVersion,
  publishTimetableVersion,
  createDraftRevision,
  scheduleVersionPublication,
  cancelScheduledPublication,
  processScheduledPublications,
  importTimetableFromCsv,
  CsvImportRow,
  ServiceResult,
} from "@/lib/services/timetable-service";
import { timetableEntrySchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function getTimetablesAction(filters?: {
  academicPeriodId?: string;
  programmeId?: string;
  status?: string;
}) {
  try {
    const where: any = {};
    if (filters?.academicPeriodId && filters.academicPeriodId !== "all") {
      where.academicPeriodId = filters.academicPeriodId;
    }
    if (filters?.programmeId && filters.programmeId !== "all") {
      where.programmeId = filters.programmeId;
    }
    if (filters?.status && filters.status !== "all") {
      where.status = filters.status;
    }

    const timetables = await prisma.timetable.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        programme: true,
        programmeLevel: true,
        academicPeriod: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: { select: { entries: true } },
          },
        },
      },
    });

    return { success: true, data: timetables };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load timetables" };
  }
}

export async function getTimetableDetailAction(id: string) {
  try {
    const timetable = await prisma.timetable.findUnique({
      where: { id },
      include: {
        programme: true,
        programmeLevel: true,
        academicPeriod: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            publishedBy: { select: { id: true, fullName: true, email: true } },
            entries: {
              include: {
                course: true,
                facilitator: true,
              },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
      },
    });

    if (!timetable) return { success: false, error: "Timetable not found" };

    return { success: true, data: timetable };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load timetable details" };
  }
}

export async function createTimetableAction(formData: FormData): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();

    const programmeId = formData.get("programmeId") as string;
    const programmeLevelId = formData.get("programmeLevelId") as string;
    const academicPeriodId = formData.get("academicPeriodId") as string;

    if (!programmeId || !programmeLevelId || !academicPeriodId) {
      return { success: false, error: "Programme, Level, and Academic Period are all required." };
    }

    const result = await createTimetable(
      programmeId,
      programmeLevelId,
      academicPeriodId,
      admin.id
    );

    if (result.success) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create timetable" };
  }
}

export async function saveTimetableEntryAction(rawData: any): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();

    const parsed = timetableEntrySchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid entry input",
      };
    }

    const result = await saveTimetableEntry(
      { ...parsed.data, id: rawData.id },
      admin.id
    );

    if (result.success) {
      revalidatePath("/admin/timetables");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save entry" };
  }
}

export async function deleteTimetableEntryAction(entryId: string): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await deleteTimetableEntry(entryId, admin.id);

    if (result.success) {
      revalidatePath("/admin/timetables");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete entry" };
  }
}

export async function validateTimetableVersionAction(versionId: string): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await validateTimetableVersion(versionId, admin.id);

    if (result.success) {
      revalidatePath("/admin/timetables");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to validate version" };
  }
}

export async function publishTimetableVersionAction(
  versionId: string,
  notes?: string | null
): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await publishTimetableVersion(versionId, notes, admin.id);

    if (result.success) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin");
      revalidatePath("/timetables");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to publish timetable" };
  }
}

export async function createDraftRevisionAction(timetableId: string): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await createDraftRevision(timetableId, admin.id);

    if (result.success) {
      revalidatePath(`/admin/timetables/${timetableId}`);
      revalidatePath("/admin/timetables");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create draft revision" };
  }
}

/**
 * Public action: Retrieves ONLY the CURRENT PUBLISHED version of a timetable.
 * Draft and superseded versions are never accessible to public viewers.
 */
export async function getPublicTimetablesAction(filters?: {
  academicPeriodId?: string;
  programmeId?: string;
  programmeLevelId?: string;
}) {
  try {
    const where: any = {
      status: "PUBLISHED",
      currentPublishedVersionId: { not: null },
    };

    if (filters?.academicPeriodId && filters.academicPeriodId !== "all") {
      where.academicPeriodId = filters.academicPeriodId;
    }
    if (filters?.programmeId && filters.programmeId !== "all") {
      where.programmeId = filters.programmeId;
    }
    if (filters?.programmeLevelId && filters.programmeLevelId !== "all") {
      where.programmeLevelId = filters.programmeLevelId;
    }

    const timetables = await prisma.timetable.findMany({
      where,
      include: {
        programme: true,
        programmeLevel: true,
        academicPeriod: true,
        versions: {
          where: { status: "PUBLISHED" },
          take: 1,
          include: {
            entries: {
              include: {
                course: true,
                facilitator: true,
              },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
      },
    });

    return { success: true, data: timetables };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load public timetables" };
  }
}

export async function scheduleVersionPublicationAction(
  versionId: string,
  scheduledPublishAt: string
): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await scheduleVersionPublication(versionId, scheduledPublishAt, admin.id);

    if (result.success) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to schedule publication" };
  }
}

export async function cancelScheduledPublicationAction(
  versionId: string
): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await cancelScheduledPublication(versionId, admin.id);

    if (result.success) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to cancel scheduled publication" };
  }
}

export async function processScheduledPublicationsAction() {
  try {
    const result = await processScheduledPublications();
    if (result.processed > 0) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin");
    }
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process schedules" };
  }
}

export async function importTimetableFromCsvAction(
  versionId: string,
  rows: CsvImportRow[]
) {
  try {
    const admin = await requireAdmin();
    const result = await importTimetableFromCsv(versionId, rows, admin.id);

    if (result.success) {
      revalidatePath("/admin/timetables");
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to import timetable from CSV" };
  }
}

export async function importTimetableUniversalFileAction(
  versionId: string,
  formData: FormData
) {
  try {
    const admin = await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided for upload." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { processUniversalTimetableFile } = await import(
      "@/lib/services/timetable-file-importer"
    );

    const result = await processUniversalTimetableFile({
      buffer,
      fileName: file.name,
      versionId,
      userId: admin.id,
    });

    if (result.success) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin/calendar");
      revalidatePath("/admin/attendance");
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to parse external timetable document.",
    };
  }
}

export async function importStandaloneTimetableAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided for upload." };
    }

    const academicPeriodId = (formData.get("academicPeriodId") as string) || undefined;
    const defaultProgrammeName = (formData.get("defaultProgrammeName") as string) || undefined;
    const defaultLevelCode = (formData.get("defaultLevelCode") as string) || undefined;
    const autoPublishVal = formData.get("autoPublish");
    const autoPublish = autoPublishVal === null ? true : autoPublishVal === "true";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { processStandaloneTimetableIntake } = await import(
      "@/lib/services/timetable-file-importer"
    );

    const result = await processStandaloneTimetableIntake({
      buffer,
      fileName: file.name,
      userId: admin.id,
      academicPeriodId: academicPeriodId && academicPeriodId !== "auto" ? academicPeriodId : undefined,
      defaultProgrammeName: defaultProgrammeName?.trim() || undefined,
      defaultLevelCode: defaultLevelCode?.trim() || undefined,
      autoPublish,
    });

    if (result.success) {
      revalidatePath("/admin/timetables");
      revalidatePath("/admin/calendar");
      revalidatePath("/admin/attendance");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to intake external timetable file.",
    };
  }
}


