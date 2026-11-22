import { adminUnauthorized, requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { deleteOrders, listCustomers, listOrders, updateOrderStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const [orders, customers] = await Promise.all([listOrders(), listCustomers()]);
    return Response.json({ orders, customers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const body = (await request.json()) as { number?: string; status?: string; note?: string };
    const order = await updateOrderStatus(body.number ?? "", body.status ?? "", body.note ?? "");
    return Response.json({ order });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin(request))) return adminUnauthorized();
  try {
    const body = (await request.json()) as { scope?: string; number?: string };
    return Response.json(await deleteOrders(body.scope ?? "", body.number));
  } catch (error) {
    return jsonError(error);
  }
}
