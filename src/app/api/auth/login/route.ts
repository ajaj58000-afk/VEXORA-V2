import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, rateLimit, verifySecret } from "@/lib/auth";
import { ready } from "@/lib/bootstrap";
import { normalizeStoredPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  if (!rateLimit(`login:${request.headers.get("x-forwarded-for") ?? "local"}`, 12)) {
    return Response.json({ error: "محاولات كثيرة. حاول بعد قليل." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { identifier?: string; password?: string } | null;
  const identifier = (body?.identifier ?? "").trim();
  const password = body?.password ?? "";
  if (!identifier || !password) {
    return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  const email = identifier.toLowerCase();
  const phone = normalizeStoredPhone(identifier);
  const rows = await db
    .select()
    .from(users)
    .where(identifier.includes("@") ? eq(users.email, email) : or(eq(users.phone, phone), eq(users.email, email)))
    .limit(1);
  const user = rows[0];
  if (!user || !(await verifySecret(password, user.passwordHash))) {
    return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ ok: true, name: user.name });
}
