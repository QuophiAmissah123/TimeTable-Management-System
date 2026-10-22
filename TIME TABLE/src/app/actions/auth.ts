"use server";

import { prisma } from "@/lib/db/prisma";
import {
  verifyPassword,
  createSessionCookie,
  clearSessionCookie,
  getCurrentUser,
} from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

export async function loginAction(prevState: any, formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const parsed = loginSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input data",
      };
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    const passwordsMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordsMatch) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    await createSessionCookie({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unexpected error occurred during login.",
    };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getMeAction() {
  return getCurrentUser();
}
