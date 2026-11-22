import type {
  CartItem,
  CartQuote,
  DiscountCode,
  OfferView,
  PackageView,
  PointsRules,
  ProductView,
  QuoteLine,
} from "@/lib/types";
import { DEFAULT_POINTS_RULES } from "@/lib/types";

export function isLiveOffer(offer: OfferView, now = Date.now()) {
  if (!offer.active) return false;
  const start = new Date(offer.startsAt).getTime();
  const end = new Date(offer.endsAt).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && end >= now;
}

export function bestOfferForPackage(
  offers: OfferView[],
  productId: number,
  packageId: number,
  catalogPrice: number,
  now = Date.now(),
) {
  const matches = offers.filter(
    (offer) =>
      offer.productId === productId &&
      offer.packageId === packageId &&
      offer.salePrice > 0 &&
      offer.salePrice < catalogPrice &&
      isLiveOffer(offer, now),
  );
  if (!matches.length) return null;
  return matches.reduce((best, offer) => (offer.salePrice < best.salePrice ? offer : best));
}

export function strikePrice(pkg: PackageView, offer: OfferView | null) {
  if (offer && offer.salePrice < pkg.price) return pkg.price;
  if (pkg.oldPrice && pkg.oldPrice > pkg.price) return pkg.oldPrice;
  return null;
}

export function discountPercent(from: number, to: number) {
  if (from <= 0 || to >= from) return 0;
  return Math.round((1 - to / from) * 100);
}

export function packageImage(product: ProductView, pkg: PackageView) {
  return pkg.image || product.image || "";
}

export function buildQuote(
  products: ProductView[],
  offers: OfferView[],
  items: CartItem[],
  coupon: (DiscountCode & { code: string }) | null,
  points: { balance: number; rules: PointsRules; use: boolean } | null,
  now = Date.now(),
): CartQuote {
  const lines: QuoteLine[] = [];
  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId && !entry.hidden);
    const pkg = product?.packages[item.packageIndex];
    if (!product || !pkg) continue;
    const quantity = Math.min(20, Math.max(1, Math.floor(item.quantity)));
    const offer = bestOfferForPackage(offers, product.id, pkg.id, pkg.price, now);
    lines.push({
      productId: product.id,
      packageIndex: item.packageIndex,
      packageId: pkg.id,
      packageCode: pkg.code,
      quantity,
      playerId: item.playerId,
      category: product.category,
      catalogPrice: pkg.price,
      unitPrice: offer ? offer.salePrice : pkg.price,
      offerId: offer?.id ?? null,
      label: pkg.label,
      productName: product.name,
      image: packageImage(product, pkg),
    });
  }

  const catalogSubtotal = lines.reduce((sum, line) => sum + line.catalogPrice * line.quantity, 0);
  const chargedSubtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const offerDiscount = Math.max(0, catalogSubtotal - chargedSubtotal);
  const couponApplies =
    coupon &&
    coupon.percent > 0 &&
    coupon.active !== false &&
    lines.some((line) => !coupon.category || line.category === coupon.category);
  const eligibleBase = couponApplies
    ? lines.reduce(
        (sum, line) =>
          sum + (!coupon!.category || line.category === coupon!.category ? line.unitPrice * line.quantity : 0),
        0,
      )
    : 0;
  const couponDiscount = couponApplies ? Math.round((eligibleBase * coupon!.percent) / 100) : 0;
  const afterCoupon = Math.max(0, chargedSubtotal - couponDiscount);
  const rules = points?.rules ?? DEFAULT_POINTS_RULES;
  let pointsUsed = 0;
  let pointsDiscount = 0;
  if (points?.use && points.balance > 0 && afterCoupon > 0 && rules.redeemBlock > 0 && rules.egpPerBlock > 0) {
    const blocks =
      Math.max(
        0,
        Math.min(
          Math.floor(points.balance / rules.redeemBlock),
          Math.floor((afterCoupon * rules.maxShare) / rules.egpPerBlock),
          Math.floor((rules.maxDiscountEgp ?? 10) / rules.egpPerBlock),
        ),
      ) * rules.redeemBlock;
    pointsUsed = blocks;
    pointsDiscount = Math.min(afterCoupon, (blocks / rules.redeemBlock) * rules.egpPerBlock);
  }
  const totalDiscount = offerDiscount + couponDiscount + pointsDiscount;
  const total = Math.max(0, catalogSubtotal - totalDiscount);
  return {
    catalogSubtotal,
    chargedSubtotal,
    offerDiscount,
    couponDiscount,
    couponPercent: couponApplies ? coupon!.percent : 0,
    pointsUsed,
    pointsDiscount,
    totalDiscount,
    total,
    lines,
  };
}
