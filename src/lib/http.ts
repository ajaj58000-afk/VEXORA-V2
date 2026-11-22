import { errorStatus } from "@/lib/orders";

export function jsonError(error: unknown, fallback = "حدث خطأ. حاول مرة أخرى.") {
  const status = errorStatus(error);
  const message = error instanceof Error && error.message ? error.message : fallback;
  return Response.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
}
