import StoreApp from "@/components/store/StoreApp";
import { getPublicCatalog } from "@/lib/catalog";
import type { PublicCatalog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let catalog: PublicCatalog | null = null;
  try {
    catalog = await getPublicCatalog();
  } catch {
    catalog = null;
  }
  return <StoreApp initialCatalog={catalog} />;
}
