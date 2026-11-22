import { adminUnauthorized, requireAdmin } from "@/lib/auth";
import { getAdminCatalog, saveAdminCatalog } from "@/lib/catalog";
import { jsonError } from "@/lib/http";
import type { AdminCatalog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    return Response.json({ catalog: await getAdminCatalog() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const body = (await request.json()) as AdminCatalog;
    const catalog = await saveAdminCatalog(body);
    return Response.json({ catalog });
  } catch (error) {
    return jsonError(error, "تعذر الحفظ");
  }
}
