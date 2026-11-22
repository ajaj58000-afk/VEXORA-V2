import { eq } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { ready } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = (body?.code ?? "").trim().toUpperCase();
  if (!code) return Response.json({ error: "Invalid discount code" }, { status: 404 });
  const rows = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  const row = rows[0];
  if (!row || !row.active || row.percent <= 0) {
    return Response.json({ error: "Invalid discount code" }, { status: 404 });
  }
  return Response.json({
    code: row.code,
    percent: row.percent,
    category: row.category ?? undefined,
  });
}
