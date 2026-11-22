import { jsonError } from "@/lib/http";
import { trackOrder } from "@/lib/orders";
import { ready } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ready();
    const body = (await request.json()) as { number?: string; phone?: string };
    return Response.json(await trackOrder(body.number ?? "", body.phone ?? ""));
  } catch (error) {
    return jsonError(error);
  }
}
