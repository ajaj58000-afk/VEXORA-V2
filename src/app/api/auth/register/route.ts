import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashSecret, rateLimit } from "@/lib/auth";
import { ready } from "@/lib/bootstrap";
import { isEgyptianMobile, normalizeStoredPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  if (!rateLimit(`register:${request.headers.get("x-forwarded-for") ?? "local"}`)) {
    return Response.json({ error: "محاولات كثيرة. حاول بعد قليل." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
  } | null;
  const name = body?.name?.trim() ?? "";
  const phone = normalizeStoredPhone(body?.phone ?? "");
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (name.length < 2) return Response.json({ error: "اكتب اسمك" }, { status: 400 });
  if (!isEgyptianMobile(phone)) return Response.json({ error: "رقم الموبايل غير صحيح" }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "الباسورد 8 حروف على الأقل" }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "الإيميل غير صحيح" }, { status: 400 });
  }
  const existing = await db
    .select()
    .from(users)
    .where(email ? or(eq(users.phone, phone), eq(users.email, email)) : eq(users.phone, phone))
    .limit(1);
  if (existing[0]) return Response.json({ error: "الحساب موجود بالفعل" }, { status: 409 });
  const inserted = await db
    .insert(users)
    .values({
      name,
      phone,
      email: email || null,
      passwordHash: await hashSecret(password),
    })
    .returning({ id: users.id });
  await createSession(inserted[0].id);
  return Response.json({ ok: true });
}
