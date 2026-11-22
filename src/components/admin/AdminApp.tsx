"use client";

import { useEffect, useMemo, useState } from "react";
import { compressImageFile } from "@/lib/client-image";
import { STATUS_NEXT } from "@/lib/constants";
import { formatWhen, money, parseMoney, statusLabel } from "@/lib/format";
import type { AdminCatalog, Category, DiscountCode, OfferView, PackageView, ProductView } from "@/lib/types";

type AdminOrder = {
  number: string;
  customerName: string;
  phone: string;
  email: string;
  paymentMethod: string;
  status: string;
  total: number;
  subtotal: number;
  offerDiscount: number;
  discountAmount: number;
  pointsDiscount: number;
  createdAt: string;
  items: { productNameAr: string; packageAr: string; quantity: number; playerId: string; unitPrice: number; image: string }[];
  events: { status: string; note: string; createdAt: string }[];
};

type Customer = { id: number; name: string; phone: string | null; email: string | null; points: number; createdAt: string };
type Section = "dashboard" | "products" | "offers" | "orders" | "marketing" | "customers" | "settings";

const sections: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "الملخص", icon: "◈" },
  { id: "products", label: "المنتجات", icon: "▣" },
  { id: "offers", label: "العروض", icon: "✦" },
  { id: "orders", label: "الطلبات", icon: "☰" },
  { id: "marketing", label: "الخصومات", icon: "%" },
  { id: "customers", label: "العملاء", icon: "☺" },
  { id: "settings", label: "الإعدادات", icon: "⚙" },
];

async function adminFetch<T>(path: string, password: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${password}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data as T;
}

function toLocal(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminApp() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState("");
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [section, setSection] = useState<Section>("dashboard");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<{ text: string; resolve: (value: boolean) => void } | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState("received");
  const [note, setNote] = useState("");
  const [codeDraft, setCodeDraft] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("vexora_admin_key") || "";
    if (saved) void enter(saved);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function notify(text: string, ok = true) {
    setToast({ ok, text });
    if (!ok) setError(text);
    else setError("");
  }

  function ask(text: string) {
    return new Promise<boolean>((resolve) => setConfirm({ text, resolve }));
  }

  async function enter(value: string) {
    setBusy(true);
    setError("");
    try {
      const [store, board] = await Promise.all([
        adminFetch<{ catalog: AdminCatalog }>("/api/admin/catalog", value),
        adminFetch<{ orders: AdminOrder[]; customers: Customer[] }>("/api/admin/orders", value),
      ]);
      setCatalog(store.catalog);
      setOrders(board.orders);
      setCustomers(board.customers);
      setAuthed(value);
      setPassword(value);
      sessionStorage.setItem("vexora_admin_key", value);
      setDirty(false);
    } catch (caught) {
      sessionStorage.removeItem("vexora_admin_key");
      setError(caught instanceof Error ? caught.message : "تعذر الدخول");
    } finally {
      setBusy(false);
    }
  }

  async function refreshOrders() {
    const board = await adminFetch<{ orders: AdminOrder[]; customers: Customer[] }>("/api/admin/orders", authed);
    setOrders(board.orders);
    setCustomers(board.customers);
  }

  function patchCatalog(recipe: (current: AdminCatalog) => AdminCatalog) {
    setCatalog((current) => (current ? recipe(current) : current));
    setDirty(true);
  }

  async function saveCatalog() {
    if (!catalog) return;
    setBusy(true);
    try {
      const data = await adminFetch<{ catalog: AdminCatalog }>("/api/admin/catalog", authed, {
        method: "PUT",
        body: JSON.stringify(catalog),
      });
      setCatalog(data.catalog);
      setDirty(false);
      notify("تم حفظ تعديلات المتجر");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "تعذر الحفظ", false);
    } finally {
      setBusy(false);
    }
  }

  async function saveOffers(next: OfferView[]) {
    setBusy(true);
    try {
      const data = await adminFetch<{ catalog: AdminCatalog }>("/api/admin/offers", authed, {
        method: "PUT",
        body: JSON.stringify({ offers: next }),
      });
      setCatalog(data.catalog);
      notify("تم حفظ العروض الحصرية");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "تعذر حفظ العروض", false);
    } finally {
      setBusy(false);
    }
  }

  const selectedOrder = orders.find((order) => order.number === orderNumber) ?? null;
  const needle = query.trim().toLowerCase();
  const visibleProducts = useMemo(() => {
    if (!catalog) return [];
    return catalog.products.filter((product) => {
      if (!needle) return true;
      return [product.name.ar, product.name.en, ...product.packages.map((pkg) => `${pkg.label.ar} ${pkg.label.en} ${pkg.code}`)].join(" ").toLowerCase().includes(needle);
    });
  }, [catalog, needle]);

  if (!authed || !catalog) {
    return (
      <main className="login-shell" dir="rtl">
        <form className="login-card" onSubmit={(event) => { event.preventDefault(); void enter(password); }}>
          <div className="login-brand"><span>VEXORA<small>ADMIN</small></span></div>
          <h1 style={{ color: "#D6B45B" }}>لوحة التحكم</h1>
          <p className="muted">أدخل كلمة مرور الإدارة. لن تُحفظ في المتصفح إلا أثناء هذه الجلسة.</p>
          <input className="field" type="password" autoComplete="current-password" placeholder="كلمة المرور" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="gold-button" style={{ width: "100%" }} disabled={busy}>{busy ? "..." : "دخول"}</button>
          <a className="back-link" href="/">العودة للمتجر</a>
        </form>
      </main>
    );
  }

  const pending = orders.filter((order) => order.status === "received").length;
  const revenue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);
  const activeOffers = catalog.offers.filter((offer) => offer.active).length;

  return (
    <main className="admin-body" dir="rtl">
      <div className="admin-wrap">
        <div className="admin-top">
          <div>
            <a className="login-brand" href="/"><span>VEXORA<small>YOUR DIGITAL WORLD.</small></span></a>
            <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>لوحة التحكم</h1>
          </div>
          <button className="pill-button" type="button" onClick={() => { sessionStorage.removeItem("vexora_admin_key"); setAuthed(""); }}>خروج</button>
        </div>
        <input className="field admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث سريع: منتج، باقة، طلب، عميل..." aria-label="بحث في لوحة التحكم" />
        <nav className="section-nav" aria-label="أقسام الإدارة">
          {sections.map((item) => (
            <button key={item.id} className={`pill-button ${section === item.id ? "active" : ""}`} type="button" onClick={() => setSection(item.id)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        {error ? <div className="note admin-error" role="alert">{error}</div> : null}

        {section === "dashboard" ? (
          <>
            <div className="stat-grid">
              <button className="stat-card" type="button" onClick={() => setSection("products")}><b>{catalog.products.length}</b><span>منتجات</span></button>
              <button className="stat-card" type="button" onClick={() => setSection("orders")}><b>{pending}</b><span>بانتظار الدفع</span></button>
              <button className="stat-card" type="button" onClick={() => setSection("orders")}><b>{money(revenue, "ar")}</b><span>مبيعات غير ملغاة</span></button>
              <button className="stat-card" type="button" onClick={() => setSection("offers")}><b>{activeOffers}</b><span>عروض مفعلة</span></button>
            </div>
            <section className="panel">
              <h2>آخر الطلبات</h2>
              {orders.slice(0, 5).map((order) => (
                <button className="order-mini" key={order.number} type="button" onClick={() => { setSection("orders"); setOrderNumber(order.number); setStatus(order.status); }} style={{ width: "100%", color: "inherit", textAlign: "start" }}>
                  <strong dir="ltr">{order.number}</strong>
                  <span>{order.customerName} · {statusLabel(order.status, "ar")} · {money(order.total, "ar")}</span>
                </button>
              ))}
              {orders.length === 0 ? <p className="muted">لا توجد طلبات بعد.</p> : null}
            </section>
          </>
        ) : null}

        {section === "products" ? (
          <section className="panel">
            <h2>المنتجات والباقات</h2>
            <p className="muted">صورة المنتج مستقلة عن صورة كل باقة. تغيير واحدة لا يغيّر الأخرى. أكواد الباقات ثابتة.</p>
            {visibleProducts.map((product) => (
              <details key={product.id} className="admin-block">
                <summary>
                  <span>{product.name.ar || "منتج جديد"} {product.hidden ? "· مخفي" : ""}</span>
                  <small className="muted">{product.packages.length} باقات</small>
                </summary>
                <div className="inner">
                  <ImageEditor password={authed} label="صورة المنتج الأساسية" image={product.image} fallback={product.defaultImage} ask={ask} onChange={(url) => updateProduct(product.id, { image: url })} onRemove={() => updateProduct(product.id, { image: "" })} onReset={() => updateProduct(product.id, { image: product.defaultImage || "" })} />
                  <label className="muted">الاسم بالعربي</label>
                  <input className="field" value={product.name.ar} onChange={(event) => updateProduct(product.id, { name: { ...product.name, ar: event.target.value } })} />
                  <label className="muted">الاسم بالإنجليزي</label>
                  <input className="field" dir="ltr" value={product.name.en} onChange={(event) => updateProduct(product.id, { name: { ...product.name, en: event.target.value } })} />
                  <label className="muted">الوصف بالعربي</label>
                  <input className="field" value={product.description.ar} onChange={(event) => updateProduct(product.id, { description: { ...product.description, ar: event.target.value } })} />
                  <label className="muted">الوصف بالإنجليزي</label>
                  <input className="field" dir="ltr" value={product.description.en} onChange={(event) => updateProduct(product.id, { description: { ...product.description, en: event.target.value } })} />
                  <label className="muted">مدة التسليم</label>
                  <input className="field" value={product.delivery.ar} onChange={(event) => updateProduct(product.id, { delivery: { ...product.delivery, ar: event.target.value } })} />
                  <input className="field" dir="ltr" value={product.delivery.en} onChange={(event) => updateProduct(product.id, { delivery: { ...product.delivery, en: event.target.value } })} />
                  <label className="muted">القسم</label>
                  <select className="field" value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value })}>
                    {catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name.ar}</option>)}
                  </select>
                  <label className="admin-check"><input type="checkbox" checked={product.requiresPlayerId} onChange={(event) => updateProduct(product.id, { requiresPlayerId: event.target.checked })} /> يطلب Player ID</label>
                  <label className="admin-check"><input type="checkbox" checked={!!product.hidden} onChange={(event) => updateProduct(product.id, { hidden: event.target.checked })} /> إخفاء المنتج من المتجر</label>
                  <h3>الباقات والأسعار</h3>
                  {product.packages.map((pkg, index) => (
                    <div className="admin-package" key={pkg.id || `${product.id}-${index}`}>
                      <strong dir="ltr">{pkg.code || "كود جديد بعد الحفظ"}</strong>
                      <ImageEditor password={authed} label={`صورة الباقة: ${pkg.label.ar || index + 1}`} image={pkg.image} fallback={pkg.defaultImage} ask={ask} onChange={(url) => updatePackage(product.id, index, { image: url })} onRemove={() => updatePackage(product.id, index, { image: "" })} onReset={() => updatePackage(product.id, index, { image: pkg.defaultImage || "" })} />
                      <input className="field" placeholder="اسم الباقة بالعربي" value={pkg.label.ar} onChange={(event) => updatePackage(product.id, index, { label: { ...pkg.label, ar: event.target.value } })} />
                      <input className="field" dir="ltr" placeholder="اسم الباقة بالإنجليزي" value={pkg.label.en} onChange={(event) => updatePackage(product.id, index, { label: { ...pkg.label, en: event.target.value } })} />
                      <div className="admin-grid2">
                        <input className="field" inputMode="numeric" placeholder="السعر (ج.م)" value={pkg.price || ""} onChange={(event) => updatePackage(product.id, index, { price: parseMoney(event.target.value) })} />
                        <input className="field" inputMode="numeric" placeholder="السعر قبل الخصم" value={pkg.oldPrice || ""} onChange={(event) => updatePackage(product.id, index, { oldPrice: parseMoney(event.target.value) || undefined })} />
                      </div>
                      {product.packages.length > 1 ? <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("حذف هذه الباقة؟ الأكواد الأخرى لن تتغير.")) updateProduct(product.id, { packages: product.packages.filter((_, item) => item !== index) }); }}>حذف الباقة</button> : null}
                    </div>
                  ))}
                  <button className="pill-button" type="button" onClick={() => updateProduct(product.id, { packages: [...product.packages, { id: 0, code: "", label: { ar: "", en: "" }, price: 0 }] })}>+ إضافة باقة</button>
                  <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("حذف المنتج نهائيًا؟")) patchCatalog((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) })); }}>حذف المنتج</button>
                </div>
              </details>
            ))}
            <button className="gold-button admin-add" type="button" onClick={() => {
              const id = catalog.products.reduce((max, item) => Math.max(max, item.id), 0) + 1;
              patchCatalog((current) => ({ ...current, products: [...current.products, { id, category: current.categories[0]?.id || "", image: "", name: { ar: "", en: "" }, description: { ar: "", en: "" }, delivery: { ar: "خلال دقائق", en: "Within minutes" }, requiresPlayerId: false, packages: [{ id: 0, code: "", label: { ar: "", en: "" }, price: 0 }] }] }));
              }}>+ إضافة منتج جديد</button>
            <details className="admin-block">
              <summary>الأقسام <span className="muted">فتح / إغلاق</span></summary>
              <div className="inner">
                {catalog.categories.map((category, index) => (
                  <div className="admin-update" key={category.id}>
                    <div className="admin-grid2">
                      <input className="field" maxLength={4} value={category.icon} onChange={(event) => updateCategory(index, { icon: event.target.value })} aria-label="أيقونة القسم" />
                      <input className="field" value={category.name.ar} placeholder="الاسم بالعربي" onChange={(event) => updateCategory(index, { name: { ...category.name, ar: event.target.value } })} />
                    </div>
                    <input className="field" dir="ltr" value={category.name.en} placeholder="الاسم بالإنجليزي" onChange={(event) => updateCategory(index, { name: { ...category.name, en: event.target.value } })} />
                    <button className="pill-button" type="button" disabled={catalog.products.some((product) => product.category === category.id) || catalog.categories.length < 2} onClick={() => patchCatalog((current) => ({ ...current, categories: current.categories.filter((_, item) => item !== index) }))}>
                      {catalog.products.some((product) => product.category === category.id) ? "فيه منتجات، انقلها الأول" : "حذف القسم"}
                    </button>
                  </div>
                ))}
                <button className="gold-button admin-add" type="button" onClick={() => patchCatalog((current) => ({ ...current, categories: [...current.categories, { id: `cat-${Date.now().toString(36)}`, icon: "🛍️", name: { ar: "", en: "" } }] }))}>+ إضافة قسم</button>
              </div>
            </details>
          </section>
        ) : null}

        {section === "offers" ? <OffersPanel catalog={catalog} password={authed} ask={ask} busy={busy} onSave={saveOffers} notify={notify} /> : null}

        {section === "orders" ? (
          <section className="panel">
            <h2>الطلبات والتتبع</h2>
            {orders.filter((order) => !needle || `${order.number} ${order.customerName} ${order.phone}`.toLowerCase().includes(needle)).map((order) => (
              <button key={order.number} className={`admin-order ${orderNumber === order.number ? "selected" : ""}`} type="button" onClick={() => { setOrderNumber(order.number); setStatus(order.status); setNote(""); }}>
                <span><strong dir="ltr">{order.number}</strong><small>{order.customerName} · {order.phone}</small></span>
                <span><strong>{money(order.total, "ar")}</strong><small>{statusLabel(order.status, "ar")}</small></span>
              </button>
            ))}
            {selectedOrder ? (
              <form className="admin-update" onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                try {
                  await adminFetch("/api/admin/orders", authed, { method: "PATCH", body: JSON.stringify({ number: selectedOrder.number, status, note }) });
                  setNote("");
                  await refreshOrders();
                  notify("تم تحديث الطلب");
                } catch (caught) {
                  notify(caught instanceof Error ? caught.message : "تعذر التحديث", false);
                } finally {
                  setBusy(false);
                }
              }}>
                <h3 dir="ltr">{selectedOrder.number}</h3>
                <p className="muted">{selectedOrder.items.map((item) => `${item.productNameAr} — ${item.packageAr} × ${item.quantity}${item.playerId ? ` · ID ${item.playerId}` : ""}`).join("، ")}</p>
                <p className="muted">المجموع {money(selectedOrder.subtotal, "ar")} · خصم العروض {money(selectedOrder.offerDiscount, "ar")} · خصم الكود {money(selectedOrder.discountAmount, "ar")} · النقاط {money(selectedOrder.pointsDiscount, "ar")}</p>
                <select className="field" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="حالة الطلب">
                  {[selectedOrder.status, ...(STATUS_NEXT[selectedOrder.status] ?? [])].map((item) => <option key={item} value={item}>{statusLabel(item, "ar")}</option>)}
                </select>
                <input className="field" value={note} onChange={(event) => setNote(event.target.value)} placeholder="رسالة للعميل (اختياري)" />
                <button className="gold-button" type="submit" disabled={busy}>حفظ التحديث</button>
                <button className="pill-button danger-button" type="button" onClick={async () => {
                  if (!(await ask("حذف هذا الطلب نهائيًا؟"))) return;
                  await adminFetch("/api/admin/orders", authed, { method: "DELETE", body: JSON.stringify({ scope: "order", number: selectedOrder.number }) });
                  setOrderNumber("");
                  await refreshOrders();
                  notify("تم الحذف");
                }}>حذف هذا الطلب</button>
              </form>
            ) : null}
            <div className="inline-actions" style={{ marginTop: 12 }}>
              <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("مسح كل الطلبات نهائيًا؟ لا يمكن التراجع.")) { await adminFetch("/api/admin/orders", authed, { method: "DELETE", body: JSON.stringify({ scope: "orders" }) }); await refreshOrders(); notify("تم مسح الطلبات"); } }}>مسح كل الطلبات</button>
              <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("تصفير نقاط كل العملاء ومسح سجل النقاط؟")) { await adminFetch("/api/admin/orders", authed, { method: "DELETE", body: JSON.stringify({ scope: "points" }) }); await refreshOrders(); notify("تم تصفير النقاط"); } }}>تصفير كل النقاط</button>
            </div>
          </section>
        ) : null}

        {section === "marketing" ? (
          <section className="panel">
            <h2>أكواد الخصم وشريط العروض</h2>
            {Object.entries(catalog.discountCodes).filter(([code]) => !needle || code.toLowerCase().includes(needle)).map(([code, value]) => (
              <div className="admin-update" key={code}>
                <h3 dir="ltr">{code}</h3>
                <div className="admin-grid2">
                  <input className="field" inputMode="numeric" value={value.percent || ""} placeholder="%" onChange={(event) => updateCode(code, { percent: parseMoney(event.target.value) })} />
                  <select className="field" value={value.category || ""} onChange={(event) => updateCode(code, { category: event.target.value || undefined })}>
                    <option value="">كل الأقسام</option>
                    {catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name.ar}</option>)}
                  </select>
                </div>
                <label className="admin-check"><input type="checkbox" checked={value.active !== false} onChange={(event) => updateCode(code, { active: event.target.checked })} /> الكود مفعّل</label>
                <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("حذف كود الخصم؟")) patchCatalog((current) => { const next = { ...current.discountCodes }; delete next[code]; return { ...current, discountCodes: next }; }); }}>حذف الكود</button>
              </div>
            ))}
            <div className="coupon-row">
              <input className="field" dir="ltr" value={codeDraft} onChange={(event) => setCodeDraft(event.target.value.toUpperCase())} placeholder="كود جديد" />
              <button className="gold-button" type="button" disabled={codeDraft.length < 2 || !!catalog.discountCodes[codeDraft]} onClick={() => { patchCatalog((current) => ({ ...current, discountCodes: { ...current.discountCodes, [codeDraft.replace(/[^A-Z0-9]/g, "")]: { percent: 10, active: true } } })); setCodeDraft(""); }}>إضافة</button>
            </div>
            <div className="admin-update">
              <label className="admin-check"><input type="checkbox" checked={catalog.banner.enabled} onChange={(event) => patchCatalog((current) => ({ ...current, banner: { ...current.banner, enabled: event.target.checked } }))} /> إظهار شريط العروض</label>
              <input className="field" value={catalog.banner.text.ar} placeholder="نص العرض بالعربي" onChange={(event) => patchCatalog((current) => ({ ...current, banner: { ...current.banner, text: { ...current.banner.text, ar: event.target.value } } }))} />
              <input className="field" dir="ltr" value={catalog.banner.text.en} placeholder="نص العرض بالإنجليزي" onChange={(event) => patchCatalog((current) => ({ ...current, banner: { ...current.banner, text: { ...current.banner.text, en: event.target.value } } }))} />
            </div>
          </section>
        ) : null}

        {section === "customers" ? (
          <section className="panel">
            <h2>العملاء والنقاط</h2>
            {customers.filter((customer) => !needle || `${customer.name} ${customer.phone ?? ""} ${customer.email ?? ""}`.toLowerCase().includes(needle)).map((customer) => (
              <div className="customer-row" key={customer.id}>
                <strong>{customer.name}</strong>
                <span dir="ltr">{customer.phone || customer.email}</span>
                <span>{customer.points} نقطة · {formatWhen(customer.createdAt, "ar")}</span>
              </div>
            ))}
            {customers.length === 0 ? <p className="muted">لا يوجد عملاء بعد.</p> : null}
          </section>
        ) : null}

        {section === "settings" ? <SettingsPanel catalog={catalog} password={authed} onSaved={(next) => { setCatalog(next); notify("تم حفظ الإعدادات"); }} notify={notify} /> : null}

        {dirty && (section === "products" || section === "marketing") ? (
          <div className="admin-savebar">
            <button className="gold-button" type="button" disabled={busy} onClick={() => void saveCatalog()}>{busy ? "..." : "حفظ التعديلات"}</button>
          </div>
        ) : null}
      </div>
      {toast ? <div className={`toast on ${toast.ok ? "" : "bad"}`} role="status">{toast.text}</div> : null}
      {confirm ? (
        <div className="modal-backdrop">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <h2>تأكيد</h2>
            <p>{confirm.text}</p>
            <div className="inline-actions">
              <button className="gold-button" type="button" onClick={() => { confirm.resolve(true); setConfirm(null); }}>نعم، متابعة</button>
              <button className="pill-button" type="button" onClick={() => { confirm.resolve(false); setConfirm(null); }}>إلغاء</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );

  function updateProduct(id: number, patch: Partial<ProductView>) {
    patchCatalog((current) => ({ ...current, products: current.products.map((product) => (product.id === id ? { ...product, ...patch } : product)) }));
  }
  function updatePackage(productId: number, index: number, patch: Partial<PackageView>) {
    patchCatalog((current) => ({
      ...current,
      products: current.products.map((product) => product.id === productId ? { ...product, packages: product.packages.map((pkg, item) => item === index ? { ...pkg, ...patch } : pkg) } : product),
    }));
  }
  function updateCategory(index: number, patch: Partial<Category>) {
    patchCatalog((current) => ({ ...current, categories: current.categories.map((category, item) => item === index ? { ...category, ...patch, name: patch.name ?? category.name } : category) }));
  }
  function updateCode(code: string, patch: Partial<DiscountCode>) {
    patchCatalog((current) => ({ ...current, discountCodes: { ...current.discountCodes, [code]: { ...current.discountCodes[code], ...patch } } }));
  }
}

function ImageEditor({ password, label, image, fallback, ask, onChange, onRemove, onReset }: {
  password: string;
  label: string;
  image?: string;
  fallback?: string;
  ask: (text: string) => Promise<boolean>;
  onChange: (url: string) => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const shown = preview || image;

  async function onFile(file?: File) {
    if (!file) return;
    if (image && !(await ask("استبدال الصورة الحالية؟"))) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    setLocalError("");
    try {
      const dataUrl = await compressImageFile(file);
      const result = await adminFetch<{ url: string }>("/api/admin/image", password, { method: "POST", body: JSON.stringify({ dataUrl }) });
      onChange(result.url);
      setPreview("");
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "تعذر رفع الصورة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-update">
      <label className="muted">{label}</label>
      <div className="preview-frame">{shown ? <img src={shown} alt="" /> : <span className="img-placeholder">🖼️</span>}</div>
      <input className="field" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ""; }} />
      <div className="thumb-row">
        {image ? <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("حذف الصورة؟")) { setPreview(""); onRemove(); } }}>حذف</button> : null}
        <button className="pill-button" type="button" onClick={onReset}>إعادة الصورة الافتراضية</button>
        {fallback ? <span className="muted">الافتراضية محفوظة</span> : null}
      </div>
      {localError ? <p className="form-error">{localError}</p> : null}
      {busy ? <p className="muted">جارٍ ضغط الصورة ورفعها...</p> : null}
    </div>
  );
}

function OffersPanel({ catalog, password, ask, busy, onSave, notify }: {
  catalog: AdminCatalog;
  password: string;
  ask: (text: string) => Promise<boolean>;
  busy: boolean;
  onSave: (offers: OfferView[]) => Promise<void>;
  notify: (text: string, ok?: boolean) => void;
}) {
  const blank = (): OfferView => ({
    id: 0,
    title: { ar: "", en: "" },
    description: { ar: "عرض حصري لفترة محدودة", en: "Limited exclusive offer" },
    productId: catalog.products[0]?.id ?? 0,
    packageId: catalog.products[0]?.packages[0]?.id ?? 0,
    packageIndex: 0,
    packageCode: catalog.products[0]?.packages[0]?.code ?? "",
    salePrice: 0,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    sortOrder: catalog.offers.length,
  });
  const [drafts, setDrafts] = useState<OfferView[]>(catalog.offers);
  useEffect(() => setDrafts(catalog.offers), [catalog.offers]);

  function update(index: number, patch: Partial<OfferView>) {
    setDrafts((current) => current.map((offer, item) => item === index ? { ...offer, ...patch } : offer));
  }

  return (
    <section className="panel">
      <h2>العروض الحصرية</h2>
      <p className="muted">السعر بعد الخصم لازم يكون أقل من سعر الباقة الفعلي. الخصم لا يتكرر فوق السعر القديم ولا يتطبق مرتين.</p>
      {drafts.map((offer, index) => {
        const product = catalog.products.find((item) => item.id === Number(offer.productId));
        const pkg = product?.packages.find((item) => item.id === Number(offer.packageId));
        return (
          <details key={offer.id || `new-${index}`} className="admin-block" open>
            <summary><span>{offer.title.ar || "عرض جديد"}</span><small>{offer.active ? "مفعّل" : "متوقف"}</small></summary>
            <div className="inner">
              <ImageEditor password={password} label="صورة العرض" image={offer.image} ask={ask} onChange={(url) => update(index, { image: url })} onRemove={() => update(index, { image: "" })} onReset={() => update(index, { image: "" })} />
              <input className="field" placeholder="عنوان العرض بالعربي" value={offer.title.ar} onChange={(event) => update(index, { title: { ...offer.title, ar: event.target.value } })} />
              <input className="field" dir="ltr" placeholder="Offer title" value={offer.title.en} onChange={(event) => update(index, { title: { ...offer.title, en: event.target.value } })} />
              <input className="field" placeholder="وصف قصير" value={offer.description.ar} onChange={(event) => update(index, { description: { ...offer.description, ar: event.target.value } })} />
              <input className="field" dir="ltr" placeholder="Short description" value={offer.description.en} onChange={(event) => update(index, { description: { ...offer.description, en: event.target.value } })} />
              <label className="muted">المنتج</label>
              <select className="field" value={offer.productId} onChange={(event) => {
                const nextProduct = catalog.products.find((item) => item.id === Number(event.target.value));
                update(index, { productId: Number(event.target.value), packageId: nextProduct?.packages[0]?.id ?? 0, packageCode: nextProduct?.packages[0]?.code ?? "" });
              }}>
                {catalog.products.map((item) => <option key={item.id} value={item.id}>{item.name.ar}</option>)}
              </select>
              <label className="muted">الباقة</label>
              <select className="field" value={offer.packageId} onChange={(event) => {
                const next = product?.packages.find((item) => item.id === Number(event.target.value));
                update(index, { packageId: Number(event.target.value), packageCode: next?.code ?? "" });
              }}>
                {(product?.packages ?? []).map((item) => <option key={item.id} value={item.id}>{item.label.ar} — {item.price} ج.م · {item.code}</option>)}
              </select>
              <label className="muted">السعر بعد الخصم {pkg ? `(سعر الباقة الحالي ${pkg.price} ج.م)` : ""}</label>
              <input className="field" inputMode="numeric" value={offer.salePrice || ""} onChange={(event) => update(index, { salePrice: parseMoney(event.target.value) })} />
              {pkg && offer.salePrice > 0 && offer.salePrice >= pkg.price ? <p className="form-error">السعر لازم يكون أقل من سعر الباقة حتى لا يظهر خصم وهمي.</p> : null}
              <label className="muted">بداية العرض</label>
              <input className="field" type="datetime-local" value={toLocal(offer.startsAt)} onChange={(event) => update(index, { startsAt: new Date(event.target.value).toISOString() })} />
              <label className="muted">نهاية العرض</label>
              <input className="field" type="datetime-local" value={toLocal(offer.endsAt)} onChange={(event) => update(index, { endsAt: new Date(event.target.value).toISOString() })} />
              <label className="admin-check"><input type="checkbox" checked={offer.active} onChange={(event) => update(index, { active: event.target.checked })} /> تفعيل العرض</label>
              <div className="offer-tools">
                <button className="pill-button" type="button" disabled={index === 0} onClick={() => setDrafts((current) => {
                  const next = [...current];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  return next.map((item, order) => ({ ...item, sortOrder: order }));
                })}>أعلى</button>
                <button className="pill-button" type="button" disabled={index === drafts.length - 1} onClick={() => setDrafts((current) => {
                  const next = [...current];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  return next.map((item, order) => ({ ...item, sortOrder: order }));
                })}>أسفل</button>
                <button className="pill-button danger-button" type="button" onClick={async () => { if (await ask("حذف هذا العرض؟")) setDrafts((current) => current.filter((_, item) => item !== index)); }}>حذف</button>
              </div>
            </div>
          </details>
        );
      })}
      <button className="pill-button" type="button" onClick={() => setDrafts((current) => [...current, blank()])}>+ إضافة عرض</button>
      <button className="gold-button admin-add" type="button" disabled={busy} onClick={() => void onSave(drafts.map((offer, index) => ({ ...offer, sortOrder: index }))).catch((caught) => notify(caught instanceof Error ? caught.message : "تعذر الحفظ", false))}>حفظ العروض</button>
    </section>
  );
}

function SettingsPanel({ catalog, password, onSaved, notify }: { catalog: AdminCatalog; password: string; onSaved: (catalog: AdminCatalog) => void; notify: (text: string, ok?: boolean) => void }) {
  const [settings, setSettings] = useState(catalog.settings);
  const [rules, setRules] = useState(catalog.pointsRules);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>إعدادات المتجر</h2>
      <label className="muted">رقم واتساب الدولي بدون +</label>
      <input className="field" dir="ltr" value={settings.whatsapp} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} />
      <label className="muted">فودافون كاش (اختياري)</label>
      <input className="field" dir="ltr" value={settings.vodafone} onChange={(event) => setSettings({ ...settings, vodafone: event.target.value })} />
      <label className="muted">إنستاباي (اختياري)</label>
      <input className="field" dir="ltr" value={settings.instapay} onChange={(event) => setSettings({ ...settings, instapay: event.target.value })} />
      <label className="muted">بيانات التحويل البنكي (اختياري)</label>
      <input className="field" value={settings.bank} onChange={(event) => setSettings({ ...settings, bank: event.target.value })} />
      <label className="muted">ملاحظة الدفع بالعربي</label>
      <textarea className="field" value={settings.paymentNoteAr} onChange={(event) => setSettings({ ...settings, paymentNoteAr: event.target.value })} />
      <label className="muted">ملاحظة الدفع بالإنجليزي</label>
      <textarea className="field" dir="ltr" value={settings.paymentNoteEn} onChange={(event) => setSettings({ ...settings, paymentNoteEn: event.target.value })} />
      <h3>قواعد النقاط</h3>
      <div className="admin-grid2">
        <input className="field" inputMode="numeric" value={rules.earnEveryEgp} onChange={(event) => setRules({ ...rules, earnEveryEgp: parseMoney(event.target.value) })} aria-label="جنيه لكل نقطة" />
        <input className="field" inputMode="numeric" value={rules.redeemBlock} onChange={(event) => setRules({ ...rules, redeemBlock: parseMoney(event.target.value) })} aria-label="عدد النقاط لكل خصم" />
        <input className="field" inputMode="numeric" value={rules.egpPerBlock} onChange={(event) => setRules({ ...rules, egpPerBlock: parseMoney(event.target.value) })} aria-label="قيمة الخصم بالجنيه" />
        <input className="field" inputMode="numeric" value={rules.maxDiscountEgp} onChange={(event) => setRules({ ...rules, maxDiscountEgp: parseMoney(event.target.value) })} aria-label="أقصى خصم" />
      </div>
      <h3>تغيير كلمة مرور الإدارة</h3>
      <input className="field" type="password" placeholder="كلمة المرور الحالية" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      <input className="field" type="password" placeholder="كلمة المرور الجديدة" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
      <button className="gold-button" type="button" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const data = await adminFetch<{ catalog: AdminCatalog }>("/api/admin/settings", password, {
            method: "PUT",
            body: JSON.stringify({ settings, pointsRules: rules, currentPassword, nextPassword }),
          });
          onSaved(data.catalog);
          setNextPassword("");
          setCurrentPassword("");
        } catch (caught) {
          notify(caught instanceof Error ? caught.message : "تعذر الحفظ", false);
        } finally {
          setBusy(false);
        }
      }}>حفظ الإعدادات</button>
    </section>
  );
}
