import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  discountCodes,
  orderEvents,
  orderItems,
  orders,
  pointsLedger,
  users,
} from "@/db/schema";
import { PAYMENT_METHODS, STATUS_NEXT } from "@/lib/constants";
import { cleanPhoneInput, isCheckoutPhone, normalizeStoredPhone, paymentLabel, statusLabel } from "@/lib/format";
import { buildQuote } from "@/lib/pricing";
import { getPointsRules, getPublicCatalog, getStoreSettings } from "@/lib/catalog";
import type { CartItem, Locale } from "@/lib/types";

type OrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  paymentMethod: string;
  discountCode?: string;
  locale?: string;
  usePoints?: boolean;
  items: CartItem[];
  userId?: number | null;
};

function localeOf(value: string | undefined): Locale {
  return value === "en" ? "en" : "ar";
}

function fail(status: number, message: string): never {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  throw error;
}

export function errorStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
}

async function nextOrderNumber() {
  await db.execute(sql`
    INSERT INTO settings (key, value)
    VALUES ('order_seq', '1000')
    ON CONFLICT (key) DO NOTHING
  `);
  const updated = await db.execute(sql`
    UPDATE settings
    SET value = (GREATEST(COALESCE(value, '1000')::int, 1000) + 1)::text
    WHERE key = 'order_seq'
    RETURNING value
  `);
  const row = (Array.isArray(updated) ? updated[0] : updated.rows?.[0]) as { value?: string } | undefined;
  const value = Number(row?.value);
  if (!Number.isFinite(value)) throw new Error("Could not allocate an order number.");
  return `VX-${value}`;
}

function whatsappText(input: {
  locale: Locale;
  number: string;
  name: string;
  phone: string;
  email: string;
  paymentMethod: string;
  lines: { name: string; qty: number; playerId: string; total: number }[];
  quote: { catalogSubtotal: number; offerDiscount: number; couponDiscount: number; pointsDiscount: number; total: number };
  settings: { vodafone: string; instapay: string; bank: string };
}) {
  const ar = input.locale === "ar";
  const itemLines = input.lines
    .map((line) => {
      const id = line.playerId ? (ar ? `\nPlayer ID: ${line.playerId}` : `\nPlayer ID: ${line.playerId}`) : "";
      return ar
        ? `• ${line.name} × ${line.qty} — ${line.total} ج.م${id}`
        : `• ${line.name} × ${line.qty} — ${line.total} EGP${id}`;
    })
    .join("\n");
  const payBits = [
    input.settings.vodafone ? `Vodafone Cash: ${input.settings.vodafone}` : "",
    input.settings.instapay ? `InstaPay: ${input.settings.instapay}` : "",
    input.settings.bank ? (ar ? `تحويل بنكي: ${input.settings.bank}` : `Bank: ${input.settings.bank}`) : "",
  ].filter(Boolean);
  if (ar) {
    return [
      "طلب جديد من VEXORA",
      `رقم الطلب: ${input.number}`,
      `الاسم: ${input.name}`,
      `الهاتف: ${input.phone}`,
      input.email ? `البريد: ${input.email}` : "",
      `الدفع: ${paymentLabel(input.paymentMethod, "ar")}`,
      "الحالة: في انتظار الدفع",
      "",
      "المنتجات:",
      itemLines,
      "",
      `المجموع قبل الخصم: ${input.quote.catalogSubtotal} ج.م`,
      input.quote.offerDiscount ? `خصم العروض: ${input.quote.offerDiscount} ج.م` : "",
      input.quote.couponDiscount ? `خصم الكود: ${input.quote.couponDiscount} ج.م` : "",
      input.quote.pointsDiscount ? `خصم النقاط: ${input.quote.pointsDiscount} ج.م` : "",
      `الإجمالي: ${input.quote.total} ج.م`,
      "",
      "لم يتم تأكيد الدفع بعد. برجاء إتمام التحويل وتأكيد الطلب.",
      ...payBits,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "New VEXORA order",
    `Order: ${input.number}`,
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    input.email ? `Email: ${input.email}` : "",
    `Payment: ${input.paymentMethod}`,
    "Status: Awaiting Payment",
    "",
    "Items:",
    itemLines,
    "",
    `Subtotal: ${input.quote.catalogSubtotal} EGP`,
    input.quote.offerDiscount ? `Exclusive offer discount: ${input.quote.offerDiscount} EGP` : "",
    input.quote.couponDiscount ? `Code discount: ${input.quote.couponDiscount} EGP` : "",
    input.quote.pointsDiscount ? `Points discount: ${input.quote.pointsDiscount} EGP` : "",
    `Total: ${input.quote.total} EGP`,
    "",
    "Payment is not confirmed yet. Please complete the transfer and confirm this order.",
    ...payBits,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createOrder(input: OrderInput) {
  const locale = localeOf(input.locale);
  const name = input.customerName.trim();
  const phone = cleanPhoneInput(input.phone);
  if (name.length < 2 || !isCheckoutPhone(phone)) {
    fail(400, locale === "ar" ? "أكمل البيانات المطلوبة باسم صحيح ورقم هاتف صحيح." : "Please enter a valid name and phone number.");
  }
  if (input.email && input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    fail(400, locale === "ar" ? "البريد الإلكتروني غير صحيح." : "Enter a valid email address.");
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod as (typeof PAYMENT_METHODS)[number])) {
    fail(400, locale === "ar" ? "اختر طريقة دفع صحيحة." : "Choose a valid payment method.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 30) {
    fail(400, locale === "ar" ? "السلة فارغة." : "Your cart is empty.");
  }
  const catalog = await getPublicCatalog();
  for (const item of input.items) {
    const product = catalog.products.find((entry) => entry.id === item.productId);
    const pkg = product?.packages[item.packageIndex];
    if (!product || !pkg) fail(400, locale === "ar" ? "أحد المنتجات لم يعد متاحًا." : "One of the products is no longer available.");
    const playerId = String(item.playerId ?? "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).trim();
    if (product.requiresPlayerId && !/^\d{5,14}$/.test(playerId)) {
      fail(400, locale === "ar" ? "أدخل Player ID صحيح (من 5 إلى 14 رقمًا)." : "Enter a valid Player ID (5–14 digits).");
    }
  }
  const code = (input.discountCode ?? "").trim().toUpperCase();
  let coupon: { code: string; percent: number; category?: string; active?: boolean } | null = null;
  if (code) {
    const rows = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
    if (!rows[0] || !rows[0].active) {
      fail(404, locale === "ar" ? "كود الخصم غير صحيح" : "Invalid discount code");
    }
    coupon = { code, percent: rows[0].percent, category: rows[0].category ?? undefined, active: rows[0].active };
  }
  let user: { id: number; points: number } | null = null;
  if (input.userId) {
    const rows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    user = rows[0] ?? null;
  }
  const rules = await getPointsRules();
  const quote = buildQuote(
    catalog.products,
    catalog.offers,
    input.items.map((item) => ({
      ...item,
      playerId: String(item.playerId ?? "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).trim(),
      quantity: Math.min(20, Math.max(1, Math.floor(Number(item.quantity) || 1))),
    })),
    coupon,
    user ? { balance: user.points, rules, use: !!input.usePoints } : null,
  );
  if (!quote.lines.length) fail(400, locale === "ar" ? "السلة فارغة." : "Your cart is empty.");
  if (coupon && quote.couponDiscount === 0 && coupon.category && !quote.lines.some((line) => line.category === coupon!.category)) {
    fail(409, locale === "ar" ? "هذا الكود لا ينطبق على منتجات السلة." : "This code does not apply to the cart.");
  }
  if (input.usePoints && user && quote.pointsUsed > user.points) {
    fail(409, locale === "ar" ? "رصيد النقاط تغيّر. حدّث السلة وحاول مرة أخرى." : "Your points balance changed. Refresh and try again.");
  }
  const settings = await getStoreSettings();
  const number = await nextOrderNumber();
  const email = (input.email ?? "").trim().slice(0, 160);
  const message = whatsappText({
    locale,
    number,
    name,
    phone,
    email,
    paymentMethod: input.paymentMethod,
    lines: quote.lines.map((line) => ({
      name: `${locale === "ar" ? line.productName.ar : line.productName.en} — ${locale === "ar" ? line.label.ar : line.label.en}`,
      qty: line.quantity,
      playerId: line.playerId,
      total: line.unitPrice * line.quantity,
    })),
    quote,
    settings,
  });
  const whatsapp = (settings.whatsapp || catalog.whatsapp).replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

  const created = await db.transaction(async (tx) => {
    if (user && quote.pointsUsed > 0) {
      const fresh = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
      if (!fresh[0] || fresh[0].points < quote.pointsUsed) {
        fail(409, locale === "ar" ? "رصيد النقاط غير كافٍ." : "Not enough points.");
      }
      await tx
        .update(users)
        .set({ points: fresh[0].points - quote.pointsUsed })
        .where(eq(users.id, user.id));
      await tx.insert(pointsLedger).values({
        userId: user.id,
        delta: -quote.pointsUsed,
        reason: "redeem",
        orderNumber: number,
      });
    }
    const inserted = await tx
      .insert(orders)
      .values({
        number,
        userId: user?.id ?? null,
        customerName: name,
        phone,
        email,
        paymentMethod: input.paymentMethod,
        locale,
        discountCode: coupon && quote.couponDiscount > 0 ? coupon.code : "",
        discountPercent: quote.couponPercent,
        discountAmount: quote.couponDiscount,
        pointsUsed: quote.pointsUsed,
        pointsDiscount: quote.pointsDiscount,
        subtotal: quote.catalogSubtotal,
        offerDiscount: quote.offerDiscount,
        total: quote.total,
        status: "received",
        message,
      })
      .returning({ id: orders.id });
    const orderId = inserted[0].id;
    await tx.insert(orderItems).values(
      quote.lines.map((line) => ({
        orderId,
        productId: line.productId,
        packageIndex: line.packageIndex,
        packageCode: line.packageCode,
        quantity: line.quantity,
        playerId: line.playerId,
        unitPrice: line.unitPrice,
        catalogPrice: line.catalogPrice,
        labelAr: line.label.ar,
        labelEn: line.label.en,
        productNameAr: line.productName.ar,
        productNameEn: line.productName.en,
        image: line.image,
        offerId: line.offerId,
      })),
    );
    await tx.insert(orderEvents).values({
      orderId,
      status: "received",
      note: locale === "ar" ? "تم استلام الطلب وبانتظار الدفع." : "Order received and awaiting payment.",
    });
    return orderId;
  });

  return { id: created, number, phone, message, whatsappUrl, total: quote.total };
}

async function hydrateOrders(rows: (typeof orders.$inferSelect)[]) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));
  const events = await db.select().from(orderEvents).where(inArray(orderEvents.orderId, ids));
  return rows.map((order) => ({
    id: order.id,
    number: order.number,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    paymentMethod: order.paymentMethod,
    locale: order.locale,
    discountCode: order.discountCode,
    discountPercent: order.discountPercent,
    discountAmount: order.discountAmount,
    pointsUsed: order.pointsUsed,
    pointsDiscount: order.pointsDiscount,
    pointsAwarded: order.pointsAwarded,
    subtotal: order.subtotal,
    offerDiscount: order.offerDiscount,
    total: order.total,
    status: order.status,
    message: order.message,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId,
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        productId: item.productId,
        packageIndex: item.packageIndex,
        packageCode: item.packageCode,
        quantity: item.quantity,
        playerId: item.playerId,
        unitPrice: item.unitPrice,
        catalogPrice: item.catalogPrice,
        packageAr: item.labelAr,
        packageEn: item.labelEn,
        productNameAr: item.productNameAr,
        productNameEn: item.productNameEn,
        image: item.image,
        offerId: item.offerId,
      })),
    events: events
      .filter((event) => event.orderId === order.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => ({
        status: event.status,
        note: event.note,
        createdAt: event.createdAt.toISOString(),
      })),
  }));
}

export async function trackOrder(number: string, phone: string) {
  const cleanNumber = number.trim().toUpperCase();
  const clean = cleanPhoneInput(phone);
  if (!cleanNumber || !isCheckoutPhone(clean)) {
    fail(400, "Enter a valid order number and phone number.");
  }
  const rows = await db.select().from(orders).where(eq(orders.number, cleanNumber)).limit(1);
  const order = rows[0];
  if (!order || normalizeStoredPhone(order.phone) !== normalizeStoredPhone(clean)) {
    fail(404, "Order not found.");
  }
  const [hydrated] = await hydrateOrders([order]);
  return hydrated;
}

export async function listOrders() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return hydrateOrders(rows);
}

export async function listUserOrders(userId: number) {
  const rows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  return hydrateOrders(rows);
}

async function applyPoints(userId: number, delta: number, reason: string, orderNumber: string) {
  if (!userId || delta === 0) return 0;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!rows[0]) return 0;
  const applied = delta < 0 ? -Math.min(rows[0].points, Math.abs(delta)) : delta;
  await db.update(users).set({ points: Math.max(0, rows[0].points + applied) }).where(eq(users.id, userId));
  await db.insert(pointsLedger).values({ userId, delta: applied, reason, orderNumber });
  return applied;
}

export async function updateOrderStatus(number: string, status: string, note: string) {
  const rows = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  const order = rows[0];
  if (!order) fail(404, "Order not found.");
  const allowed = [order.status, ...(STATUS_NEXT[order.status] ?? [])];
  if (!allowed.includes(status)) fail(400, "لا يمكن نقل الطلب إلى هذه الحالة.");
  if (status === order.status && !note.trim()) return (await hydrateOrders([order]))[0];
  const rules = await getPointsRules();
  let pointsAwarded = order.pointsAwarded;
  if (status === "paid" && order.pointsAwarded === 0 && order.userId) {
    const earned = Math.floor(order.total / rules.earnEveryEgp);
    if (earned > 0) {
      await applyPoints(order.userId, earned, "earn", order.number);
      pointsAwarded = earned;
    }
  }
  if (status === "cancelled" && order.status !== "cancelled" && order.userId) {
    if (order.pointsUsed > 0) await applyPoints(order.userId, order.pointsUsed, "refund-redeem", order.number);
    if (order.pointsAwarded > 0) await applyPoints(order.userId, -order.pointsAwarded, "reverse-earn", order.number);
    pointsAwarded = 0;
  }
  await db
    .update(orders)
    .set({ status, pointsAwarded })
    .where(eq(orders.id, order.id));
  if (status !== order.status || note.trim()) {
    await db.insert(orderEvents).values({
      orderId: order.id,
      status,
      note: note.trim().slice(0, 300),
    });
  }
  const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
  return (await hydrateOrders(fresh))[0];
}

export async function deleteOrders(scope: string, number?: string) {
  if (scope === "points") {
    await db.update(users).set({ points: 0 });
    await db.delete(pointsLedger);
    return { ok: true };
  }
  const rows =
    scope === "order" && number
      ? await db.select().from(orders).where(eq(orders.number, number))
      : scope === "orders"
        ? await db.select().from(orders)
        : [];
  if (scope === "order" && !rows.length) fail(404, "Order not found.");
  for (const order of rows) {
    if (order.userId && order.status !== "cancelled") {
      if (order.pointsUsed > 0) await applyPoints(order.userId, order.pointsUsed, "refund-redeem", order.number);
      if (order.pointsAwarded > 0) await applyPoints(order.userId, -order.pointsAwarded, "reverse-earn", order.number);
    }
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orderEvents).where(eq(orderEvents.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
  }
  return { ok: true };
}

export async function listCustomers() {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return rows.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    points: user.points,
    createdAt: user.createdAt.toISOString(),
  }));
}

export function publicStatus(status: string, locale: Locale) {
  return statusLabel(status, locale);
}
