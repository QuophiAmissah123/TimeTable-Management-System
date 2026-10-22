import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const SESSION_COOKIE_NAME = "timetable_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "college-timetable-default-secret-change-in-prod-32c";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

// -------------------------------------------------------------
// PASSWORD UTILITIES
// -------------------------------------------------------------
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(
  plainText: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

// -------------------------------------------------------------
// SIGNED TOKEN UTILITIES (Web Crypto HMAC-SHA256)
// -------------------------------------------------------------
async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signPayload(payload: object): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days expiration
  });

  const b64Data = Buffer.from(data).toString("base64url");
  const key = await getKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(b64Data)
  );
  const b64Signature = Buffer.from(signatureBuffer).toString("base64url");

  return `${b64Data}.${b64Signature}`;
}

export async function verifySignedToken<T = any>(
  token: string
): Promise<T | null> {
  try {
    const [b64Data, b64Signature] = token.split(".");
    if (!b64Data || !b64Signature) return null;

    const encoder = new TextEncoder();
    const key = await getKey();
    const signatureBytes = Buffer.from(b64Signature, "base64url");

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(b64Data)
    );

    if (!isValid) return null;

    const decoded = JSON.parse(
      Buffer.from(b64Data, "base64url").toString("utf-8")
    );

    if (decoded.exp && Date.now() > decoded.exp) {
      return null; // Expired
    }

    return decoded as T;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// COOKIE & SESSION ACCESSORS
// -------------------------------------------------------------
export async function createSessionCookie(user: SessionUser): Promise<void> {
  const token = await signPayload({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) return null;

    const verified = await verifySignedToken<SessionUser>(sessionCookie.value);
    if (!verified || !verified.id) return null;

    // Verify user still exists and is active in database
    const dbUser = await prisma.user.findUnique({
      where: { id: verified.id },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED: Administrator privileges required.");
  }
  return user;
}
