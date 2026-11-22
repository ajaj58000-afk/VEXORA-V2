import { adminUnauthorized, requireAdmin, verifyAdminPassword } from "@/lib/auth";
import { hashSecret } from "@/lib/auth";
import { saveSettings } from "@/lib/catalog";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { jsonError } from "@/lib/http";
import type { PointsRules, StoreSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const body = (await request.json()) as {
      settings?: StoreSettings;
      pointsRules?: PointsRules;
      currentPassword?: string;
      nextPassword?: string;
    };
    if (!body.settings || !body.pointsRules) {
      return Response.json({ error: "بيانات الإعدادات غير مكتملة." }, { status: 400 });
    }
    if (body.nextPassword) {
      if (!(await verifyAdminPassword(body.currentPassword ?? ""))) {
        return Response.json({ error: "كلمة المرور الحالية غير صحيحة." }, { status: 400 });
      }
      if (body.nextPassword.length < 8) {
        return Response.json({ error: "كلمة المرور الجديدة 8 حروف على الأقل." }, { status: 400 });
      }
      await db
        .insert(settings)
        .values({ key: "admin_password_hash", value: await hashSecret(body.nextPassword) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: await hashSecret(body.nextPassword) },
        });
    }
    return Response.json({ catalog: await saveSettings(body.settings, body.pointsRules) });
  } catch (error) {
    return jsonError(error, "تعذر حفظ الإعدادات");
  }
}
