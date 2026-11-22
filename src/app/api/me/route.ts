import { getSessionUser } from "@/lib/auth";
import { getPointsRules } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ loggedIn: false });
  return Response.json({
    loggedIn: true,
    name: user.name,
    phone: user.phone ?? "",
    email: user.email ?? "",
    points: user.points,
    rules: await getPointsRules(),
  });
}
