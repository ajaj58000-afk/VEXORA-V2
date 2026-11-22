import { getPublicCatalog } from "@/lib/catalog";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getPublicCatalog());
  } catch (error) {
    return jsonError(error);
  }
}
