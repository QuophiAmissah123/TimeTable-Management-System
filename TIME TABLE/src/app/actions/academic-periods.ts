"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { academicPeriodSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function getAcademicPeriodsAction() {
  try {
    const periods = await prisma.academicPeriod.findMany({
      orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { timetables: true },
        },
      },
    });
    return { success: true, data: periods };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load academic periods" };
  }
}

export async function createAcademicPeriodAction(formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      academicYear: formData.get("academicYear"),
      semester: formData.get("semester"),
      startDate: formData.get("startDate") || null,
      endDate: formData.get("endDate") || null,
      isCurrent: formData.get("isCurrent") === "true" || formData.get("isCurrent") === "on",
    };

    const parsed = academicPeriodSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input data",
      };
    }

    const { academicYear, semester, startDate, endDate, isCurrent } = parsed.data;

    // Check duplicate
    const existing = await prisma.academicPeriod.findUnique({
      where: {
        academicYear_semester: {
          academicYear,
          semester,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Academic period "${academicYear} - ${semester}" already exists.`,
      };
    }

    const period = await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        // Unset any current period
        await tx.academicPeriod.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      const created = await tx.academicPeriod.create({
        data: {
          academicYear,
          semester,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          isCurrent,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "CREATE_ACADEMIC_PERIOD",
          entityType: "ACADEMIC_PERIOD",
          entityId: created.id,
          details: JSON.stringify({ academicYear, semester, isCurrent }),
        },
      });

      return created;
    });

    revalidatePath("/admin/academic-periods");
    revalidatePath("/admin/timetables");
    revalidatePath("/admin");
    return { success: true, data: period };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create academic period" };
  }
}

export async function setCurrentAcademicPeriodAction(id: string) {
  try {
    const admin = await requireAdmin();

    await prisma.$transaction(async (tx) => {
      await tx.academicPeriod.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });

      const updated = await tx.academicPeriod.update({
        where: { id },
        data: { isCurrent: true },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "SET_CURRENT_ACADEMIC_PERIOD",
          entityType: "ACADEMIC_PERIOD",
          entityId: id,
          details: JSON.stringify({
            period: `${updated.academicYear} ${updated.semester}`,
          }),
        },
      });
    });

    revalidatePath("/admin/academic-periods");
    revalidatePath("/admin/timetables");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to set active period" };
  }
}
