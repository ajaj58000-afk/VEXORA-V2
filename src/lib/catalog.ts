import { randomBytes } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  discountCodes,
  images,
  offers,
  packages,
  products,
  settings,
} from "@/db/schema";
import { DEFAULT_WHATSAPP } from "@/lib/constants";
import { hashSecret } from "@/lib/auth";
import type {
  AdminCatalog,
  Banner,
  Category,
  DiscountCode,
  Localized,
  OfferView,
  PackageView,
  PointsRules,
  ProductView,
  PublicCatalog,
  StoreSettings,
} from "@/lib/types";
import { DEFAULT_POINTS_RULES } from "@/lib/types";
import seedFile from "@/data/catalog.json";

type SeedPackage = {
  label: Localized;
  price: number;
  oldPrice?: number;
};

type SeedProduct = {
  id: number;
  category: string;
  image?: string;
  name: Localized;
  description: Localized;
  delivery: Localized;
  requiresPlayerId: boolean;
  packages: SeedPackage[];
};

type SeedCatalog = {
  categories: Category[];
  products: SeedProduct[];
  banner?: Banner;
};

const seed = seedFile as SeedCatalog;

const DEFAULT_SETTINGS: StoreSettings = {
  whatsapp: DEFAULT_WHATSAPP,
  vodafone: "",
  instapay: "",
  bank: "",
  paymentNoteAr: "لم يتم تأكيد أي دفعة بعد. أرسل الطلب عبر واتساب لإتمام الدفع، والحالة: في انتظار الدفع.",
  paymentNoteEn:
    "No payment confirmed yet. Send the order via WhatsApp to complete payment. Status: Awaiting Payment.",
};

function imageUrl(id: string | null | undefined) {
  return id ? `/api/img/${id}` : "";
}

function imageIdFromUrl(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/\/api\/img\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

async function readSetting(key: string) {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function writeSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getPointsRules(): Promise<PointsRules> {
  const raw = await readSetting("points_rules");
  if (!raw) return DEFAULT_POINTS_RULES;
  try {
    return { ...DEFAULT_POINTS_RULES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_POINTS_RULES;
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const raw = await readSetting("store_settings");
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function loadOffers(packageIndex: Map<number, number>): Promise<OfferView[]> {
  const rows = await db.select().from(offers).orderBy(asc(offers.sortOrder), asc(offers.id));
  return rows.map((row) => ({
    id: row.id,
    title: { ar: row.titleAr, en: row.titleEn },
    description: { ar: row.descriptionAr, en: row.descriptionEn },
    image: imageUrl(row.imageId) || undefined,
    productId: row.productId,
    packageId: row.packageId,
    packageIndex: packageIndex.get(row.packageId) ?? 0,
    packageCode: "",
    salePrice: row.salePrice,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    active: row.active,
    sortOrder: row.sortOrder,
  }));
}

async function loadCatalog(includeHidden: boolean) {
  const categoryRows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  const productRows = await db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id));
  const packageRows = await db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id));
  const codeRows = await db.select().from(discountCodes);
  const packageIndex = new Map<number, number>();
  const grouped = new Map<number, PackageView[]>();
  for (const row of packageRows) {
    const list = grouped.get(row.productId) ?? [];
    packageIndex.set(row.id, list.length);
    list.push({
      id: row.id,
      code: row.code,
      label: { ar: row.labelAr, en: row.labelEn },
      price: row.price,
      oldPrice: row.oldPrice ?? undefined,
      image: imageUrl(row.imageId) || undefined,
      defaultImage: imageUrl(row.defaultImageId) || undefined,
    });
    grouped.set(row.productId, list);
  }
  const productViews: ProductView[] = productRows
    .filter((row) => includeHidden || !row.hidden)
    .map((row) => ({
      id: row.id,
      category: row.categoryId,
      image: imageUrl(row.imageId) || undefined,
      defaultImage: imageUrl(row.defaultImageId) || undefined,
      name: { ar: row.nameAr, en: row.nameEn },
      description: { ar: row.descriptionAr, en: row.descriptionEn },
      delivery: { ar: row.deliveryAr, en: row.deliveryEn },
      requiresPlayerId: row.requiresPlayerId,
      hidden: row.hidden,
      packages: grouped.get(row.id) ?? [],
    }));
  const offerViews = await loadOffers(packageIndex);
  for (const offer of offerViews) {
    const product = productViews.find((item) => item.id === offer.productId) ??
      productRows.find((item) => item.id === offer.productId);
    const pkg = (grouped.get(offer.productId) ?? [])[offer.packageIndex];
    offer.packageCode = pkg?.code ?? "";
    if (!product) continue;
  }
  const bannerRaw = await readSetting("banner");
  const banner: Banner = bannerRaw
    ? JSON.parse(bannerRaw)
    : seed.banner ?? { enabled: false, text: { ar: "", en: "" } };
  const codes: Record<string, DiscountCode> = {};
  for (const row of codeRows) {
    codes[row.code] = {
      percent: row.percent,
      category: row.category ?? undefined,
      active: row.active,
    };
  }
  return {
    categories: categoryRows.map((row) => ({
      id: row.id,
      icon: row.icon,
      name: { ar: row.nameAr, en: row.nameEn },
    })),
    products: productViews,
    discountCodes: codes,
    banner,
    offers: offerViews,
    packageIndex,
  };
}

export async function getPublicCatalog(): Promise<PublicCatalog> {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  const catalog = await loadCatalog(false);
  const storeSettings = await getStoreSettings();
  const now = Date.now();
  return {
    categories: catalog.categories,
    products: catalog.products.map((product) => ({
      ...product,
      hidden: undefined,
      defaultImage: undefined,
      packages: product.packages.map((pkg) => ({ ...pkg, defaultImage: undefined })),
    })),
    banner: catalog.banner,
    offers: catalog.offers
      .filter((offer) => {
        const start = new Date(offer.startsAt).getTime();
        const end = new Date(offer.endsAt).getTime();
        const product = catalog.products.find((item) => item.id === offer.productId);
        const pkg = product?.packages.find((item) => item.id === offer.packageId);
        return offer.active && start <= now && end >= now && !!pkg && offer.salePrice < pkg.price;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    whatsapp: storeSettings.whatsapp || DEFAULT_WHATSAPP,
    paymentNote: { ar: storeSettings.paymentNoteAr, en: storeSettings.paymentNoteEn },
  };
}

export async function getAdminCatalog(): Promise<AdminCatalog> {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  const catalog = await loadCatalog(true);
  return {
    categories: catalog.categories,
    products: catalog.products,
    discountCodes: catalog.discountCodes,
    banner: catalog.banner,
    offers: catalog.offers.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    settings: await getStoreSettings(),
    pointsRules: await getPointsRules(),
  };
}

export async function seedStore() {
  const existing = await db.select().from(settings).where(eq(settings.key, "seeded")).limit(1);
  if (existing[0]?.value === "1") return;
  const client = await db.select().from(categories).limit(1);
  if (client.length) {
    await writeSetting("seeded", "1");
    return;
  }

  for (const [index, category] of seed.categories.entries()) {
    await db.insert(categories).values({
      id: category.id,
      icon: category.icon,
      nameAr: category.name.ar,
      nameEn: category.name.en,
      sortOrder: index,
    });
  }

  for (const [productIndex, product] of seed.products.entries()) {
    const imageKey = product.image?.split("/").pop();
    let imageId: string | null = null;
    if (imageKey) {
      try {
        const file = await readFile(path.join(process.cwd(), "public", "seed-images", `${product.id}.jpg`));
        imageId = imageKey;
        await db.insert(images).values({
          id: imageId,
          mime: "image/jpeg",
          data: file.toString("base64"),
        });
      } catch {
        imageId = null;
      }
    }
    await db.insert(products).values({
      id: product.id,
      categoryId: product.category,
      imageId,
      defaultImageId: imageId,
      nameAr: product.name.ar,
      nameEn: product.name.en,
      descriptionAr: product.description.ar,
      descriptionEn: product.description.en,
      deliveryAr: product.delivery.ar,
      deliveryEn: product.delivery.en,
      requiresPlayerId: product.requiresPlayerId,
      hidden: false,
      sortOrder: productIndex,
    });
    for (const [packageIndex, pkg] of product.packages.entries()) {
      await db.insert(packages).values({
        productId: product.id,
        code: `PKG-${product.id}-${packageIndex}`,
        labelAr: pkg.label.ar,
        labelEn: pkg.label.en,
        price: pkg.price,
        oldPrice: pkg.oldPrice ?? null,
        sortOrder: packageIndex,
      });
    }
  }

  await db.insert(discountCodes).values({
    code: "VEX10",
    percent: 3,
    category: "gaming",
    active: true,
  });
  await writeSetting(
    "banner",
    JSON.stringify(
      seed.banner ?? {
        enabled: true,
        text: { ar: "شحن سيزون ببجي لأول مره ب 60 UC", en: "شحن سيزون ببجي لأول مره ب 60 UC" },
      },
    ),
  );
  await writeSetting("store_settings", JSON.stringify(DEFAULT_SETTINGS));
  await writeSetting("points_rules", JSON.stringify(DEFAULT_POINTS_RULES));
  const adminPassword = process.env.ADMIN_PASSWORD || "VexoraAdmin2026";
  await writeSetting("admin_password_hash", await hashSecret(adminPassword));
  await writeSetting("order_seq", "1000");
  await writeSetting("seeded", "1");
}

function cleanText(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

export async function saveAdminCatalog(input: {
  categories: Category[];
  products: ProductView[];
  discountCodes: Record<string, DiscountCode>;
  banner: Banner;
}) {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  if (!Array.isArray(input.categories) || input.categories.length === 0) {
    throw new Error("أضف قسمًا واحدًا على الأقل.");
  }
  if (!Array.isArray(input.products)) throw new Error("بيانات المنتجات غير صحيحة.");

  const categoryIds = new Set<string>();
  const nextCategories = input.categories.map((category, index) => {
    const id = cleanText(category.id, 40) || `cat-${Date.now().toString(36)}-${index}`;
    if (categoryIds.has(id)) throw new Error("معرّف القسم مكرر.");
    categoryIds.add(id);
    return {
      id,
      icon: cleanText(category.icon, 8) || "🛍️",
      nameAr: cleanText(category.name?.ar, 80),
      nameEn: cleanText(category.name?.en, 80),
      sortOrder: index,
    };
  });

  const existingPackages = await db.select().from(packages);
  const existingById = new Map(existingPackages.map((row) => [row.id, row]));
  const keptPackageIds: number[] = [];
  const keptProductIds: number[] = [];

  await db.transaction(async (tx) => {
    for (const category of nextCategories) {
      await tx
        .insert(categories)
        .values(category)
        .onConflictDoUpdate({
          target: categories.id,
          set: {
            icon: category.icon,
            nameAr: category.nameAr,
            nameEn: category.nameEn,
            sortOrder: category.sortOrder,
          },
        });
    }

    let nextProductId =
      (await tx.select().from(products)).reduce((max, row) => Math.max(max, row.id), 0) + 1;

    for (const [productIndex, product] of input.products.entries()) {
      if (!categoryIds.has(product.category)) throw new Error("قسم المنتج غير موجود.");
      if (!product.packages?.length) throw new Error("كل منتج يحتاج باقة واحدة على الأقل.");
      const id = Number.isInteger(product.id) && product.id > 0 ? product.id : nextProductId++;
      keptProductIds.push(id);
      const imageId = imageIdFromUrl(product.image);
      const defaultImageId = imageIdFromUrl(product.defaultImage) ?? imageId;
      await tx
        .insert(products)
        .values({
          id,
          categoryId: product.category,
          imageId,
          defaultImageId,
          nameAr: cleanText(product.name?.ar, 120),
          nameEn: cleanText(product.name?.en, 120),
          descriptionAr: cleanText(product.description?.ar, 400),
          descriptionEn: cleanText(product.description?.en, 400),
          deliveryAr: cleanText(product.delivery?.ar, 80),
          deliveryEn: cleanText(product.delivery?.en, 80),
          requiresPlayerId: !!product.requiresPlayerId,
          hidden: !!product.hidden,
          sortOrder: productIndex,
        })
        .onConflictDoUpdate({
          target: products.id,
          set: {
            categoryId: product.category,
            imageId,
            defaultImageId,
            nameAr: cleanText(product.name?.ar, 120),
            nameEn: cleanText(product.name?.en, 120),
            descriptionAr: cleanText(product.description?.ar, 400),
            descriptionEn: cleanText(product.description?.en, 400),
            deliveryAr: cleanText(product.delivery?.ar, 80),
            deliveryEn: cleanText(product.delivery?.en, 80),
            requiresPlayerId: !!product.requiresPlayerId,
            hidden: !!product.hidden,
            sortOrder: productIndex,
          },
        });

      for (const [packageIndex, pkg] of product.packages.entries()) {
        const price = Math.max(0, Math.round(Number(pkg.price) || 0));
        const oldPrice = pkg.oldPrice && Number(pkg.oldPrice) > price ? Math.round(Number(pkg.oldPrice)) : null;
        const imageId = imageIdFromUrl(pkg.image);
        const defaultImageId = imageIdFromUrl(pkg.defaultImage);
        const existing = pkg.id ? existingById.get(pkg.id) : undefined;
        if (existing && existing.productId === id) {
          keptPackageIds.push(existing.id);
          await tx
            .update(packages)
            .set({
              labelAr: cleanText(pkg.label?.ar, 120),
              labelEn: cleanText(pkg.label?.en, 120),
              price,
              oldPrice,
              imageId,
              defaultImageId,
              sortOrder: packageIndex,
            })
            .where(eq(packages.id, existing.id));
        } else {
          const inserted = await tx
            .insert(packages)
            .values({
              productId: id,
              code: `PKG-${id}-${Date.now().toString(36)}-${packageIndex}`,
              labelAr: cleanText(pkg.label?.ar, 120),
              labelEn: cleanText(pkg.label?.en, 120),
              price,
              oldPrice,
              imageId,
              defaultImageId,
              sortOrder: packageIndex,
            })
            .returning({ id: packages.id });
          keptPackageIds.push(inserted[0].id);
        }
      }
    }

    const staleProducts = (await tx.select({ id: products.id }).from(products))
      .map((row) => row.id)
      .filter((id) => !keptProductIds.includes(id));
    if (staleProducts.length) {
      await tx.delete(packages).where(inArray(packages.productId, staleProducts));
      await tx.delete(offers).where(inArray(offers.productId, staleProducts));
      await tx.delete(products).where(inArray(products.id, staleProducts));
    }
    const stalePackages = (await tx.select({ id: packages.id }).from(packages))
      .map((row) => row.id)
      .filter((id) => !keptPackageIds.includes(id));
    if (stalePackages.length) {
      await tx.delete(offers).where(inArray(offers.packageId, stalePackages));
      await tx.delete(packages).where(inArray(packages.id, stalePackages));
    }
    const staleCategories = (await tx.select({ id: categories.id }).from(categories))
      .map((row) => row.id)
      .filter((id) => !categoryIds.has(id));
    if (staleCategories.length) {
      const stillUsed = await tx
        .select({ categoryId: products.categoryId })
        .from(products)
        .where(inArray(products.categoryId, staleCategories));
      if (stillUsed.length) throw new Error("فيه منتجات، انقلها الأول");
      await tx.delete(categories).where(inArray(categories.id, staleCategories));
    }

    await tx.delete(discountCodes);
    const codeEntries = Object.entries(input.discountCodes ?? {});
    for (const [rawCode, value] of codeEntries) {
      const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const percent = Math.max(0, Math.min(90, Math.round(Number(value.percent) || 0)));
      if (code.length < 2 || percent <= 0) continue;
      await tx.insert(discountCodes).values({
        code,
        percent,
        category: value.category && categoryIds.has(value.category) ? value.category : null,
        active: value.active !== false,
      });
    }
    await tx
      .insert(settings)
      .values({
        key: "banner",
        value: JSON.stringify({
          enabled: !!input.banner?.enabled,
          text: {
            ar: cleanText(input.banner?.text?.ar, 180),
            en: cleanText(input.banner?.text?.en, 180),
          },
        }),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: JSON.stringify({
            enabled: !!input.banner?.enabled,
            text: {
              ar: cleanText(input.banner?.text?.ar, 180),
              en: cleanText(input.banner?.text?.en, 180),
            },
          }),
        },
      });
  });

  return getAdminCatalog();
}

export async function saveOffers(nextOffers: OfferView[]) {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  const packageRows = await db.select().from(packages);
  const productRows = await db.select().from(products);
  const kept: number[] = [];
  for (const [index, offer] of nextOffers.entries()) {
    const product = productRows.find((row) => row.id === Number(offer.productId));
    const pkg = packageRows.find((row) => row.id === Number(offer.packageId) && row.productId === product?.id);
    if (!product || !pkg) throw new Error("اختر منتجًا وباقة حقيقيين للعرض.");
    const salePrice = Math.round(Number(offer.salePrice));
    if (!Number.isFinite(salePrice) || salePrice <= 0) throw new Error("سعر العرض غير صحيح.");
    if (salePrice >= pkg.price) {
      throw new Error("سعر العرض لازم يكون أقل من سعر الباقة الفعلي حتى لا يظهر خصم وهمي.");
    }
    const startsAt = new Date(offer.startsAt);
    const endsAt = new Date(offer.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new Error("حدد تاريخ بداية ونهاية صحيحين.");
    }
    const values = {
      titleAr: cleanText(offer.title?.ar, 120) || product.nameAr,
      titleEn: cleanText(offer.title?.en, 120) || product.nameEn,
      descriptionAr: cleanText(offer.description?.ar, 240),
      descriptionEn: cleanText(offer.description?.en, 240),
      imageId: imageIdFromUrl(offer.image),
      productId: product.id,
      packageId: pkg.id,
      salePrice,
      startsAt,
      endsAt,
      active: !!offer.active,
      sortOrder: Number.isFinite(Number(offer.sortOrder)) ? Number(offer.sortOrder) : index,
    };
    if (offer.id) {
      const existing = await db.select().from(offers).where(eq(offers.id, offer.id)).limit(1);
      if (existing[0]) {
        await db.update(offers).set(values).where(eq(offers.id, offer.id));
        kept.push(offer.id);
        continue;
      }
    }
    const inserted = await db.insert(offers).values(values).returning({ id: offers.id });
    kept.push(inserted[0].id);
  }
  const stale = (await db.select({ id: offers.id }).from(offers)).map((row) => row.id).filter((id) => !kept.includes(id));
  if (stale.length) await db.delete(offers).where(inArray(offers.id, stale));
  return getAdminCatalog();
}

export async function saveSettings(next: StoreSettings, rules: PointsRules) {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  const whatsapp = next.whatsapp.replace(/\D/g, "");
  if (whatsapp.length < 8 || whatsapp.length > 15) throw new Error("رقم واتساب غير صحيح.");
  const safeRules: PointsRules = {
    redeemBlock: Math.max(1, Math.round(rules.redeemBlock || 10)),
    egpPerBlock: Math.max(1, Math.round(rules.egpPerBlock || 1)),
    maxShare: Math.min(1, Math.max(0, Number(rules.maxShare) || 0)),
    maxDiscountEgp: Math.max(0, Math.round(rules.maxDiscountEgp || 0)),
    earnEveryEgp: Math.max(1, Math.round(rules.earnEveryEgp || 10)),
  };
  await writeSetting(
    "store_settings",
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      ...next,
      whatsapp,
    }),
  );
  await writeSetting("points_rules", JSON.stringify(safeRules));
  return getAdminCatalog();
}

export async function saveImage(dataUrl: string) {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP.");
  const mime = match[1];
  const data = match[2];
  const buffer = Buffer.from(data, "base64");
  if (buffer.length < 32 || buffer.length > 1_200_000) throw new Error("حجم الصورة غير مناسب.");
  const hex = buffer.subarray(0, 12).toString("hex");
  const valid =
    (mime === "image/jpeg" && hex.startsWith("ffd8ff")) ||
    (mime === "image/png" && hex.startsWith("89504e47")) ||
    (mime === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!valid) throw new Error("الملف ليس صورة صالحة.");
  const id = randomBytes(8).toString("hex");
  await db.insert(images).values({ id, mime, data });
  return { url: `/api/img/${id}` };
}

export async function readImage(id: string) {
  const { ready } = await import("@/lib/bootstrap");
  await ready();
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) return null;
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return rows[0] ?? null;
}
