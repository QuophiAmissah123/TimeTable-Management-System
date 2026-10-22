"use server";

import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import {
  startTeachingSession,
  stopTeachingSession,
  updateSessionStudentAttendance,
  getTodayScheduledClasses,
  getTeachingSessionsReport,
  generateSessionsCsv,
  ServiceResult,
} from "@/lib/services/session-service";
import { revalidatePath } from "next/cache";

export async function startClassSessionAction(
  timetableEntryId: string,
  sessionDate?: string,
  facilitatorPresent?: string
): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await startTeachingSession(
      timetableEntryId,
      admin.id,
      sessionDate,
      facilitatorPresent
    );

    if (result.success) {
      revalidatePath("/admin/attendance");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to start class session",
    };
  }
}

export async function stopClassSessionAction(
  sessionId: string,
  notes?: string,
  studentsPresent?: number | null,
  facilitatorPresent?: string | null,
  studentsEnrolled?: number | null
): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await stopTeachingSession(
      sessionId,
      admin.id,
      notes,
      studentsPresent,
      studentsEnrolled,
      facilitatorPresent
    );

    if (result.success) {
      revalidatePath("/admin/attendance");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to stop class session",
    };
  }
}

export async function updateSessionStudentAttendanceAction(
  sessionId: string,
  studentsPresent: number,
  facilitatorPresent?: string | null,
  studentsEnrolled?: number | null
): Promise<ServiceResult> {
  try {
    const admin = await requireAdmin();
    const result = await updateSessionStudentAttendance(
      sessionId,
      admin.id,
      studentsPresent,
      facilitatorPresent,
      studentsEnrolled
    );

    if (result.success) {
      revalidatePath("/admin/attendance");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update student attendance",
    };
  }
}

export async function getTodayScheduledClassesAction(
  targetDate?: string
): Promise<ServiceResult> {
  try {
    return await getTodayScheduledClasses(targetDate);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch scheduled classes",
    };
  }
}

export async function getTeachingSessionsReportAction(filters?: {
  startDate?: string;
  endDate?: string;
  facilitatorId?: string;
  programmeId?: string;
  status?: string;
}): Promise<ServiceResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED: Session expired or invalid." };
    }
    return await getTeachingSessionsReport(filters);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to load teaching session report",
    };
  }
}

export async function exportTeachingSessionsCsvAction(filters?: {
  startDate?: string;
  endDate?: string;
  facilitatorId?: string;
  programmeId?: string;
  status?: string;
}): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED: Session expired or invalid." };
    }

    const csv = await generateSessionsCsv(filters);
    const dateStamp = new Date().toISOString().split("T")[0];
    const filename = `teaching-sessions-report-${dateStamp}.csv`;

    return { success: true, csv, filename };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to generate CSV export",
    };
  }
}
