import { getSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createOrder } from "@/lib/orders";
import type { CartItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerName?: string;
      phone?: string;
      email?: string;
      paymentMethod?: string;
      discountCode?: string;
      locale?: string;
      usePoints?: boolean;
      items?: CartItem[];
    };
    const user = await getSessionUser();
    const order = await createOrder({
      customerName: body.customerName ?? "",
      phone: body.phone ?? "",
      email: body.email,
      paymentMethod: body.paymentMethod ?? "",
      discountCode: body.discountCode,
      locale: body.locale,
      usePoints: body.usePoints,
      items: body.items ?? [],
      userId: user?.id ?? null,
    });
    return Response.json(order);
  } catch (error) {
    return jsonError(error);
  }
}
