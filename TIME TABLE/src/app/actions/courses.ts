"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { courseSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function getCoursesAction() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });
    return { success: true, data: courses };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load courses" };
  }
}

export async function createCourseAction(formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      code: formData.get("code"),
      name: formData.get("name"),
      creditHours: formData.get("creditHours") || 3,
      description: formData.get("description") || null,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = courseSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid course data",
      };
    }

    const { code, name, creditHours, description, isActive } = parsed.data;

    // Check duplicate code
    const existing = await prisma.course.findUnique({
      where: { code },
    });

    if (existing) {
      return {
        success: false,
        error: `Course with code "${code}" already exists.`,
      };
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        creditHours,
        description,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "CREATE_COURSE",
        entityType: "COURSE",
        entityId: course.id,
        details: JSON.stringify({ code, name, creditHours }),
      },
    });

    revalidatePath("/admin/courses");
    revalidatePath("/admin/timetables");
    return { success: true, data: course };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create course" };
  }
}

export async function updateCourseAction(id: string, formData: FormData) {
  try {
    const admin = await requireAdmin();

    const rawData = {
      code: formData.get("code"),
      name: formData.get("name"),
      creditHours: formData.get("creditHours") || 3,
      description: formData.get("description") || null,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = courseSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid course data",
      };
    }

    const { code, name, creditHours, description, isActive } = parsed.data;

    const updated = await prisma.course.update({
      where: { id },
      data: { code, name, creditHours, description, isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE_COURSE",
        entityType: "COURSE",
        entityId: id,
        details: JSON.stringify({ code, name, creditHours, isActive }),
      },
    });

    revalidatePath("/admin/courses");
    revalidatePath("/admin/timetables");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update course" };
  }
}

export async function toggleCourseStatusAction(id: string) {
  try {
    const admin = await requireAdmin();

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return { success: false, error: "Course not found" };

    const updated = await prisma.course.update({
      where: { id },
      data: { isActive: !course.isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: updated.isActive ? "ACTIVATE_COURSE" : "DEACTIVATE_COURSE",
        entityType: "COURSE",
        entityId: id,
        details: JSON.stringify({ code: updated.code, isActive: updated.isActive }),
      },
    });

    revalidatePath("/admin/courses");
    revalidatePath("/admin/timetables");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle course status" };
  }
}
