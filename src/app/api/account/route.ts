import { getSessionUser } from "@/lib/auth";
import { getPointsRules } from "@/lib/catalog";
import { listUserOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({
    user: {
      name: user.name,
      phone: user.phone ?? "",
      email: user.email ?? "",
      points: user.points,
      createdAt: user.createdAt.toISOString(),
    },
    rules: await getPointsRules(),
    orders: await listUserOrders(user.id),
  });
}
