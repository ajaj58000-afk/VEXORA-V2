import { adminUnauthorized, requireAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/catalog";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const body = (await request.json()) as { dataUrl?: string };
    return Response.json(await saveImage(body.dataUrl ?? ""));
  } catch (error) {
    return jsonError(error, "تعذر رفع الصورة");
  }
}
