"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { programmeSchema, programmeLevelSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function getProgrammesAction() {
  try {
    const programmes = await prisma.programme.findMany({
      orderBy: { name: "asc" },
      include: {
        levels: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { timetables: true },
        },
      },
    });
    return { success: true, data: programmes };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load programmes" };
  }
}

export async function createProgrammeAction(formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") || null,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = programmeSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid programme data",
      };
    }

    const { code, name, description, isActive } = parsed.data;

    // Check duplicate code
    const existing = await prisma.programme.findUnique({
      where: { code },
    });

    if (existing) {
      return {
        success: false,
        error: `Programme with code "${code}" already exists.`,
      };
    }

    const programme = await prisma.$transaction(async (tx) => {
      const created = await tx.programme.create({
        data: {
          code,
          name,
          description,
          isActive,
          levels: {
            create: [
              { levelCode: "100", levelName: "Level 100 / First Year", sortOrder: 1, isActive: true },
              { levelCode: "200", levelName: "Level 200 / Second Year", sortOrder: 2, isActive: true },
              { levelCode: "300", levelName: "Level 300 / Third Year", sortOrder: 3, isActive: true },
              { levelCode: "400", levelName: "Level 400 / Final Year", sortOrder: 4, isActive: true },
            ],
          },
        },
        include: { levels: true },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "CREATE_PROGRAMME",
          entityType: "PROGRAMME",
          entityId: created.id,
          details: JSON.stringify({ code, name }),
        },
      });

      return created;
    });

    revalidatePath("/admin/programmes");
    revalidatePath("/admin/timetables");
    revalidatePath("/admin");
    return { success: true, data: programme };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create programme" };
  }
}

export async function updateProgrammeAction(id: string, formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") || null,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = programmeSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid programme data",
      };
    }

    const { code, name, description, isActive } = parsed.data;

    const updated = await prisma.programme.update({
      where: { id },
      data: { code, name, description, isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE_PROGRAMME",
        entityType: "PROGRAMME",
        entityId: id,
        details: JSON.stringify({ code, name, isActive }),
      },
    });

    revalidatePath("/admin/programmes");
    revalidatePath("/admin/timetables");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update programme" };
  }
}

export async function toggleProgrammeStatusAction(id: string) {
  try {
    const admin = await requireAdmin();

    const programme = await prisma.programme.findUnique({ where: { id } });
    if (!programme) return { success: false, error: "Programme not found" };

    const updated = await prisma.programme.update({
      where: { id },
      data: { isActive: !programme.isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: updated.isActive ? "ACTIVATE_PROGRAMME" : "DEACTIVATE_PROGRAMME",
        entityType: "PROGRAMME",
        entityId: id,
        details: JSON.stringify({ code: updated.code, isActive: updated.isActive }),
      },
    });

    revalidatePath("/admin/programmes");
    revalidatePath("/admin/timetables");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle programme status" };
  }
}

export async function addProgrammeLevelAction(programmeId: string, formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      programmeId,
      levelCode: formData.get("levelCode"),
      levelName: formData.get("levelName"),
      sortOrder: formData.get("sortOrder") || 1,
      isActive: true,
    };

    const parsed = programmeLevelSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid level data",
      };
    }

    const { levelCode, levelName, sortOrder } = parsed.data;

    const level = await prisma.programmeLevel.create({
      data: {
        programmeId,
        levelCode,
        levelName,
        sortOrder,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "CREATE_PROGRAMME_LEVEL",
        entityType: "PROGRAMME_LEVEL",
        entityId: level.id,
        details: JSON.stringify({ programmeId, levelCode, levelName }),
      },
    });

    revalidatePath("/admin/programmes");
    return { success: true, data: level };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to add level" };
  }
}
