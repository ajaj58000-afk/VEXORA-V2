import { adminUnauthorized, requireAdmin } from "@/lib/auth";
import { saveOffers } from "@/lib/catalog";
import { jsonError } from "@/lib/http";
import type { OfferView } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const body = (await request.json()) as { offers?: OfferView[] };
    return Response.json({ catalog: await saveOffers(body.offers ?? []) });
  } catch (error) {
    return jsonError(error, "تعذر حفظ العروض");
  }
}
