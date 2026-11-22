import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, settings, users } from "@/db/schema";
import { ready } from "@/lib/bootstrap";

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = "vexora_session";
const SESSION_DAYS = 30;

export async function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(value, salt, 32)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifySecret(value: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = (await scryptAsync(value, salt, 32)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function verifyAdminPassword(password: string) {
  await ready();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && safeEqual(password, envPassword)) return true;
  const row = await db.select().from(settings).where(eq(settings.key, "admin_password_hash")).limit(1);
  if (!row[0]) return false;
  return verifySecret(password, row[0].value);
}

export function adminUnauthorized() {
  return Response.json({ error: "Incorrect admin password." }, { status: 401 });
}

export async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token || !(await verifyAdminPassword(token))) return null;
  return token;
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser() {
  await ready();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const found = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  const session = found[0];
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return rows[0] ?? null;
}

const attempts = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}
