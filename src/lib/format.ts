import type { Locale } from "@/lib/types";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

export function money(amount: number, locale: Locale) {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
    Math.round(amount),
  );
  return locale === "ar" ? `${formatted} ج.م` : `${formatted} EGP`;
}

export function formatWhen(value: string | Date, locale: Locale) {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function cleanPhoneInput(value: string) {
  return normalizeDigits(value).replace(/[\s().-]/g, "");
}

export function isCheckoutPhone(value: string) {
  return /^\+?\d{10,14}$/.test(cleanPhoneInput(value));
}

export function normalizeStoredPhone(value: string) {
  let digits = normalizeDigits(value).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("20") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return digits;
}

export function isEgyptianMobile(value: string) {
  return /^01\d{9}$/.test(normalizeStoredPhone(value));
}

export function parseMoney(value: string) {
  const digits = normalizeDigits(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function statusLabel(status: string, locale: Locale) {
  const ar: Record<string, string> = {
    received: "تم استلام الطلب",
    paid: "تم تأكيد الدفع",
    processing: "قيد التنفيذ",
    ready: "جاهز للتسليم",
    delivered: "تم التسليم",
    cancelled: "تم إلغاء الطلب",
  };
  const en: Record<string, string> = {
    received: "Order received",
    paid: "Payment confirmed",
    processing: "Processing",
    ready: "Ready for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return (locale === "ar" ? ar : en)[status] ?? status;
}

export function paymentLabel(method: string, locale: Locale) {
  if (method === "Bank transfer") return locale === "ar" ? "تحويل بنكي" : "Bank transfer";
  return method;
}
