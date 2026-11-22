export type Locale = "ar" | "en";

export type Localized = {
  ar: string;
  en: string;
};

export type Category = {
  id: string;
  icon: string;
  name: Localized;
};

export type PackageView = {
  id: number;
  code: string;
  label: Localized;
  price: number;
  oldPrice?: number;
  image?: string;
  defaultImage?: string;
};

export type ProductView = {
  id: number;
  category: string;
  image?: string;
  defaultImage?: string;
  name: Localized;
  description: Localized;
  delivery: Localized;
  requiresPlayerId: boolean;
  hidden?: boolean;
  packages: PackageView[];
};

export type Banner = {
  enabled: boolean;
  text: Localized;
};

export type DiscountCode = {
  percent: number;
  category?: string;
  active?: boolean;
};

export type OfferView = {
  id: number;
  title: Localized;
  description: Localized;
  image?: string;
  productId: number;
  packageId: number;
  packageIndex: number;
  packageCode: string;
  salePrice: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  sortOrder: number;
};

export type PointsRules = {
  redeemBlock: number;
  egpPerBlock: number;
  maxShare: number;
  maxDiscountEgp: number;
  earnEveryEgp: number;
};

export type StoreSettings = {
  whatsapp: string;
  vodafone: string;
  instapay: string;
  bank: string;
  paymentNoteAr: string;
  paymentNoteEn: string;
};

export type PublicCatalog = {
  categories: Category[];
  products: ProductView[];
  banner: Banner;
  offers: OfferView[];
  whatsapp: string;
  paymentNote: Localized;
};

export type AdminCatalog = {
  categories: Category[];
  products: ProductView[];
  discountCodes: Record<string, DiscountCode>;
  banner: Banner;
  offers: OfferView[];
  settings: StoreSettings;
  pointsRules: PointsRules;
};

export type CartItem = {
  key: string;
  productId: number;
  packageIndex: number;
  quantity: number;
  playerId: string;
};

export type QuoteLine = {
  productId: number;
  packageIndex: number;
  packageId: number;
  packageCode: string;
  quantity: number;
  playerId: string;
  category: string;
  catalogPrice: number;
  unitPrice: number;
  offerId: number | null;
  label: Localized;
  productName: Localized;
  image: string;
};

export type CartQuote = {
  catalogSubtotal: number;
  chargedSubtotal: number;
  offerDiscount: number;
  couponDiscount: number;
  couponPercent: number;
  pointsUsed: number;
  pointsDiscount: number;
  totalDiscount: number;
  total: number;
  lines: QuoteLine[];
};

export const DEFAULT_POINTS_RULES: PointsRules = {
  redeemBlock: 10,
  egpPerBlock: 1,
  maxShare: 0.5,
  maxDiscountEgp: 50,
  earnEveryEgp: 10,
};
