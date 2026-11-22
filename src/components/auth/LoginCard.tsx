"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Brand() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 5h8l5 14 5-14h8L16 29z" fill="none" stroke="#D6B45B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 5l5 14 5-14" fill="#D6B45B" opacity=".35" />
    </svg>
  );
}

export default function LoginCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", identifier: "", password: "" });

  function setField(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "حصل خطأ");
      } else {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: form.identifier, password: form.password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "بيانات الدخول غير صحيحة");
      }
      router.push("/account");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "حصل خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell" dir="rtl">
      <section className="login-card">
        <a className="login-brand" href="/">
          <Brand />
          <span>VEXORA<small>YOUR DIGITAL WORLD.</small></span>
        </a>
        <h1 style={{ margin: "18px 0 6px", color: "#D6B45B", fontSize: 30 }}>حسابك في VEXORA</h1>
        <p className="muted">سجّل دخولك واكسب نقطة على كل 10 جنيه بعد تأكيد الدفع، وبدّلها بخصم.</p>
        <button type="button" className="pill-button" style={{ width: "100%", marginTop: 22 }} onClick={() => setError("تسجيل جوجل غير مفعّل على هذا الخادم. استخدم رقم الموبايل أو الإيميل.")}>
          المتابعة بحساب جوجل
        </button>
        <div style={{ height: 1, background: "#ffffff26", margin: "18px 0" }} />
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" ? (
            <>
              <input className="field" placeholder="الاسم" value={form.name} onChange={setField("name")} required />
              <input className="field" dir="ltr" inputMode="tel" placeholder="رقم الموبايل 01xxxxxxxxx" value={form.phone} onChange={setField("phone")} required />
              <input className="field" dir="ltr" type="email" placeholder="الإيميل (اختياري)" value={form.email} onChange={setField("email")} />
            </>
          ) : (
            <input className="field" dir="ltr" placeholder="رقم الموبايل أو الإيميل" value={form.identifier} onChange={setField("identifier")} required />
          )}
          <div className="password-wrap">
            <input className="field" dir="ltr" type={showPassword ? "text" : "password"} placeholder="الباسورد" value={form.password} onChange={setField("password")} required />
            <button className="eye-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
              {showPassword ? "إخفاء" : "إظهار"}
            </button>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="gold-button" style={{ width: "100%" }} disabled={busy}>{busy ? "..." : mode === "login" ? "دخول" : "إنشاء حساب"}</button>
        </form>
        <button type="button" className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "معندكش حساب؟ سجّل دلوقتي" : "عندك حساب؟ سجّل دخول"}
        </button>
        <div><a className="back-link" href="/">العودة للمتجر</a></div>
      </section>
    </main>
  );
}
