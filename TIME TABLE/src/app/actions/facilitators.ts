"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { facilitatorSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function getFacilitatorsAction() {
  try {
    const facilitators = await prisma.facilitator.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });
    return { success: true, data: facilitators };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load facilitators" };
  }
}

export async function createFacilitatorAction(formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      name: formData.get("name"),
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      department: formData.get("department") || null,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = facilitatorSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid facilitator data",
      };
    }

    const { name, email, phone, department, isActive } = parsed.data;

    const facilitator = await prisma.facilitator.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        department: department || null,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "CREATE_FACILITATOR",
        entityType: "FACILITATOR",
        entityId: facilitator.id,
        details: JSON.stringify({ name, department }),
      },
    });

    revalidatePath("/admin/facilitators");
    revalidatePath("/admin/timetables");
    return { success: true, data: facilitator };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create facilitator" };
  }
}

export async function updateFacilitatorAction(id: string, formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      name: formData.get("name"),
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      department: formData.get("department") || null,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = facilitatorSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid facilitator data",
      };
    }

    const { name, email, phone, department, isActive } = parsed.data;

    const updated = await prisma.facilitator.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        department: department || null,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE_FACILITATOR",
        entityType: "FACILITATOR",
        entityId: id,
        details: JSON.stringify({ name, department, isActive }),
      },
    });

    revalidatePath("/admin/facilitators");
    revalidatePath("/admin/timetables");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update facilitator" };
  }
}

export async function toggleFacilitatorStatusAction(id: string) {
  try {
    const admin = await requireAdmin();

    const facilitator = await prisma.facilitator.findUnique({ where: { id } });
    if (!facilitator) return { success: false, error: "Facilitator not found" };

    const updated = await prisma.facilitator.update({
      where: { id },
      data: { isActive: !facilitator.isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: updated.isActive ? "ACTIVATE_FACILITATOR" : "DEACTIVATE_FACILITATOR",
        entityType: "FACILITATOR",
        entityId: id,
        details: JSON.stringify({ name: updated.name, isActive: updated.isActive }),
      },
    });

    revalidatePath("/admin/facilitators");
    revalidatePath("/admin/timetables");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle facilitator status" };
  }
}
