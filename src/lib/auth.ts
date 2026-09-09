import bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";

export const ROLES = ["OWNER","MANAGER","CASHIER","WAITER","KITCHEN_STAFF","KITCHEN_MANAGER","CHEF","DELIVERY_MANAGER"] as const;
export type Role = typeof ROLES[number];

export interface SessionPayload {
  staffId: string;
  email: string;
  role: Role;
  name: string;
  restaurantId: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-32-char-random-secret-dev-only";
const secretKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "restroerp_session";
const MAX_AGE = 60 * 60 * 8; // 8h

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: Omit<SessionPayload,"iat"|"exp">) {
  const token = await new jose.SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function hasRole(session: SessionPayload | null, allowed: Role[]) {
  if (!session) return false;
  return allowed.includes(session.role);
}

export async function requireSession(allowed?: Role[]) {
  const s = await getSession();
  if (!s) return null;
  if (allowed && !allowed.includes(s.role)) return null;
  return s;
}

export function getCookieName() { return COOKIE_NAME; }
