"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatWhen, money, statusLabel } from "@/lib/format";
import type { PointsRules } from "@/lib/types";

type AccountOrder = {
  number: string;
  status: string;
  total: number;
  createdAt: string;
  paymentMethod: string;
  items: { productNameAr: string; packageAr: string; quantity: number }[];
};

export default function AccountApp() {
  const router = useRouter();
  const [data, setData] = useState<{ user: { name: string; phone: string; email: string; points: number }; rules: PointsRules; orders: AccountOrder[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!response.ok) throw new Error("تعذر تحميل الحساب");
        return response.json();
      })
      .then((payload) => payload && setData(payload))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "تعذر تحميل الحساب"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  if (!data) {
    return <main className="account-shell" dir="rtl"><div className="account-wrap"><p>{error || "جارٍ التحميل..."}</p></div></main>;
  }

  return (
    <main className="account-shell" dir="rtl">
      <div className="account-wrap">
        <div className="admin-top">
          <div>
            <a className="login-brand" href="/"><span>VEXORA<small>YOUR DIGITAL WORLD.</small></span></a>
            <h1 style={{ margin: "8px 0 0" }}>أهلاً {data.user.name}</h1>
          </div>
          <button className="pill-button" type="button" onClick={logout}>خروج</button>
        </div>
        <section className="points-hero">
          <span className="muted">رصيد النقاط</span>
          <strong>{data.user.points}</strong>
          <p className="muted">نقطة واحدة لكل {data.rules.earnEveryEgp} جنيه بعد تأكيد الدفع. كل {data.rules.redeemBlock} نقطة = {data.rules.egpPerBlock} جنيه، بحد أقصى {data.rules.maxDiscountEgp} جنيه و {Math.round(data.rules.maxShare * 100)}% من الطلب.</p>
          <p className="muted">{data.user.phone} {data.user.email ? `· ${data.user.email}` : ""}</p>
        </section>
        <section className="panel">
          <h2>طلباتك</h2>
          {data.orders.length === 0 ? <p className="muted">لا توجد طلبات مرتبطة بهذا الحساب بعد.</p> : data.orders.map((order) => (
            <article className="order-mini" key={order.number}>
              <strong dir="ltr">{order.number}</strong>
              <span>{statusLabel(order.status, "ar")} · {money(order.total, "ar")}</span>
              <span className="muted">{formatWhen(order.createdAt, "ar")}</span>
              <span className="muted">{order.items.map((item) => `${item.productNameAr} — ${item.packageAr} × ${item.quantity}`).join("، ")}</span>
            </article>
          ))}
          <a className="gold-button" href="/#tracking" style={{ marginTop: 12 }}>تتبّع طلب</a>
        </section>
      </div>
    </main>
  );
}
