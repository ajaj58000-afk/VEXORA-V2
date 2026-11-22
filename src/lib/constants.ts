export const DEFAULT_WHATSAPP = "201004063941";

export const ORDER_FLOW = ["received", "paid", "processing", "ready", "delivered"] as const;

export const STATUS_NEXT: Record<string, string[]> = {
  received: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const PAYMENT_METHODS = ["Vodafone Cash", "InstaPay", "Bank transfer"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
