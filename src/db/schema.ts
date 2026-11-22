import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  icon: text("icon").notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: integer("id").primaryKey(),
  categoryId: text("category_id").notNull(),
  imageId: text("image_id"),
  defaultImageId: text("default_image_id"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  deliveryAr: text("delivery_ar").notNull().default(""),
  deliveryEn: text("delivery_en").notNull().default(""),
  requiresPlayerId: boolean("requires_player_id").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  code: text("code").notNull(),
  labelAr: text("label_ar").notNull(),
  labelEn: text("label_en").notNull(),
  price: integer("price").notNull(),
  oldPrice: integer("old_price"),
  imageId: text("image_id"),
  defaultImageId: text("default_image_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const discountCodes = pgTable("discount_codes", {
  code: text("code").primaryKey(),
  percent: integer("percent").notNull(),
  category: text("category"),
  active: boolean("active").notNull().default(true),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  imageId: text("image_id"),
  productId: integer("product_id").notNull(),
  packageId: integer("package_id").notNull(),
  salePrice: integer("sale_price").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  userId: integer("user_id"),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  paymentMethod: text("payment_method").notNull(),
  locale: text("locale").notNull().default("ar"),
  discountCode: text("discount_code").notNull().default(""),
  discountPercent: integer("discount_percent").notNull().default(0),
  discountAmount: integer("discount_amount").notNull().default(0),
  pointsUsed: integer("points_used").notNull().default(0),
  pointsDiscount: integer("points_discount").notNull().default(0),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  subtotal: integer("subtotal").notNull(),
  offerDiscount: integer("offer_discount").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("received"),
  message: text("message").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  packageIndex: integer("package_index").notNull(),
  packageCode: text("package_code").notNull().default(""),
  quantity: integer("quantity").notNull(),
  playerId: text("player_id").notNull().default(""),
  unitPrice: integer("unit_price").notNull(),
  catalogPrice: integer("catalog_price").notNull(),
  labelAr: text("label_ar").notNull(),
  labelEn: text("label_en").notNull(),
  productNameAr: text("product_name_ar").notNull(),
  productNameEn: text("product_name_en").notNull(),
  image: text("image").notNull().default(""),
  offerId: integer("offer_id"),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const pointsLedger = pgTable("points_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  orderNumber: text("order_number").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
