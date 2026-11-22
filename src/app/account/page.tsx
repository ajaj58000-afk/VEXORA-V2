import { redirect } from "next/navigation";
import AccountApp from "@/components/account/AccountApp";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AccountApp />;
}
