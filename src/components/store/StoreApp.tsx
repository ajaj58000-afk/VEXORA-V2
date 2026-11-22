"use client";

import { useEffect, useMemo, useState } from "react";
import { money, formatWhen, statusLabel, paymentLabel, normalizeDigits } from "@/lib/format";
import { bestOfferForPackage, buildQuote, discountPercent, isLiveOffer, packageImage, strikePrice } from "@/lib/pricing";
import type { CartItem, DiscountCode, Locale, OfferView, ProductView, PublicCatalog } from "@/lib/types";
import { ORDER_FLOW } from "@/lib/constants";

const copy = {
  ar: {
    tagline: "عالمك الرقمي بمستوى أرقى",
    subtitle: "شحن ألعاب وبطاقات هدايا ومنتجات رقمية أصلية في مصر.",
    explore: "تصفّح المتجر",
    products: "المنتجات",
    all: "الكل",
    why: "لماذا VEXORA؟",
    authentic: "منتجات أصلية",
    authenticDesc: "من موردين معتمدين فقط.",
    fast: "تسليم سريع",
    fastDesc: "الوقت المتوقع موضّح لكل منتج.",
    local: "دفع محلي",
    localDesc: "فودافون كاش وإنستاباي وتحويل بنكي.",
    track: "تتبّع طلبك",
    orderNumber: "رقم الطلب",
    phone: "رقم الهاتف",
    trackButton: "تتبّع",
    notFound: "لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف.",
    add: "أضف للسلة",
    choosePackage: "اختر الباقة",
    playerId: "معرّف اللاعب (Player ID)",
    playerIdError: "أدخل Player ID صحيح (من 5 إلى 14 رقمًا).",
    cart: "السلة",
    emptyCart: "السلة فارغة.",
    emptyCartHelp: "اكتشف منتجاتنا الرقمية وأضف ما يعجبك.",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    totalDiscount: "إجمالي الخصم",
    offerDiscount: "خصم العروض الحصرية",
    invalidCode: "كود الخصم غير صحيح",
    wrongCategory: "هذا الكود يخص فئة:",
    discountCode: "كود الخصم",
    apply: "تطبيق",
    total: "الإجمالي",
    fullName: "الاسم الكامل",
    email: "البريد (اختياري)",
    payment: "طريقة الدفع",
    bank: "تحويل بنكي",
    placeOrder: "إتمام الطلب",
    required: "أكمل البيانات المطلوبة باسم صحيح ورقم هاتف صحيح.",
    received: "تم استلام طلبك رقم",
    status: "الحالة",
    delivery: "التسليم",
    available: "متوفر",
    close: "إغلاق",
    whatsapp: "أرسل الطلب عبر واتساب",
    copyMessage: "نسخ الرسالة",
    copied: "تم نسخ الرسالة!",
    orderDetails: "تفاصيل الطلب",
    orderPlaced: "تم استلام طلبك!",
    trackHint: "يمكنك تتبّع حالة طلبك في أي وقت.",
    loading: "جارٍ التحميل...",
    processing: "جارٍ إرسال الطلب...",
    error: "حدث خطأ. حاول مرة أخرى.",
    trackMissing: "أدخل رقم الطلب ورقم الهاتف للتتبّع.",
    trackStatus: "حالة طلبك",
    placedOn: "تاريخ الطلب",
    paymentMethod: "طريقة الدفع",
    items: "المنتجات",
    timeline: "تحديثات الطلب",
    noUpdates: "لم ترد تحديثات جديدة بعد.",
    continueShopping: "متابعة التسوّق",
    remove: "حذف",
    admin: "Admin",
    connectionError: "تعذّر الاتصال. حاول مرة أخرى.",
    added: "تمت إضافة المنتج للسلة",
    applied: "تم تطبيق كود الخصم",
    exclusive: "EXCLUSIVE OFFERS",
    exclusiveTitle: "عروض حصرية",
    exclusiveDesc: "عروض حصرية لفترة محدودة.",
    orderNow: "اطلب الآن",
    search: "بحث",
    searchPlaceholder: "ابحث عن لعبة أو باقة أو بطاقة...",
    noResults: "لا توجد نتائج مطابقة.",
    results: "نتائج البحث",
    deal: "عرض",
    exclusiveTag: "حصري",
    until: "حتى",
    account: "حسابي",
    qty: "الكمية",
    signInPoints: "سجّل دخول واكسب نقاط على كل طلب",
    noPoints: "رصيدك لا يكفي لخصم الآن",
  },
  en: {
    tagline: "Your Digital World Elevated",
    subtitle: "Authentic game top-ups, gift cards and digital products in Egypt.",
    explore: "Explore Store",
    products: "Products",
    all: "All",
    why: "Why VEXORA?",
    authentic: "Authentic products",
    authenticDesc: "Authorized suppliers only.",
    fast: "Fast delivery",
    fastDesc: "Estimated time shown per product.",
    local: "Local payment",
    localDesc: "Vodafone Cash, InstaPay, bank transfer.",
    track: "Track your order",
    orderNumber: "Order number",
    phone: "Phone number",
    trackButton: "Track",
    notFound: "Order not found. Check your order number and phone number.",
    add: "Add to cart",
    choosePackage: "Choose a package",
    playerId: "Player ID",
    playerIdError: "Enter a valid Player ID (5–14 digits).",
    cart: "Cart",
    emptyCart: "Your cart is empty.",
    emptyCartHelp: "Browse our digital products and add what you like.",
    subtotal: "Subtotal",
    discount: "Discount",
    totalDiscount: "Total discount",
    offerDiscount: "Exclusive offer discount",
    invalidCode: "Invalid discount code",
    wrongCategory: "This code is for:",
    discountCode: "Discount code",
    apply: "Apply",
    total: "Total",
    fullName: "Full name",
    email: "Email (optional)",
    payment: "Payment method",
    bank: "Bank transfer",
    placeOrder: "Checkout",
    required: "Enter a valid name and phone number.",
    received: "Order received:",
    status: "Status",
    delivery: "Delivery",
    available: "Available",
    close: "Close",
    whatsapp: "Send order via WhatsApp",
    copyMessage: "Copy message",
    copied: "Message copied!",
    orderDetails: "Order details",
    orderPlaced: "Order received!",
    trackHint: "You can track your order at any time.",
    loading: "Loading...",
    processing: "Submitting your order...",
    error: "Something went wrong. Please try again.",
    trackMissing: "Enter your order number and phone number to track.",
    trackStatus: "Your order status",
    placedOn: "Order date",
    paymentMethod: "Payment method",
    items: "Items",
    timeline: "Order updates",
    noUpdates: "No new updates yet.",
    continueShopping: "Continue shopping",
    remove: "Remove",
    admin: "Admin",
    connectionError: "Could not connect. Please try again.",
    added: "Added to your cart",
    applied: "Discount code applied",
    exclusive: "EXCLUSIVE OFFERS",
    exclusiveTitle: "Exclusive offers",
    exclusiveDesc: "Limited-time exclusive offers.",
    orderNow: "Order now",
    search: "Search",
    searchPlaceholder: "Search a game, package or card...",
    noResults: "No matching results.",
    results: "Search results",
    deal: "Deal",
    exclusiveTag: "Exclusive",
    until: "Until",
    account: "Account",
    qty: "Qty",
    signInPoints: "Sign in to earn points on every order",
    noPoints: "Not enough points for a discount yet",
  },
} as const;

type Sheet = null | "product" | "cart" | "confirmation";
type Me = { name: string; phone?: string; email?: string; points: number; rules: { redeemBlock: number; egpPerBlock: number; maxShare: number; maxDiscountEgp: number; earnEveryEgp: number } };
type Tracked = {
  number: string;
  status: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  items: { productId: number; productNameAr: string; productNameEn: string; packageAr: string; packageEn: string; quantity: number; image?: string }[];
  events: { status: string; note?: string; createdAt: string }[];
};

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 5h8l5 14 5-14h8L16 29z" fill="none" stroke="#D6B45B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 5l5 14 5-14" fill="#D6B45B" opacity=".35" />
    </svg>
  );
}

function Picture({ src, alt, icon, className }: { src?: string; alt: string; icon: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={className ? `${className} img-placeholder` : "img-placeholder"} aria-hidden="true">{icon}</span>;
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export default function StoreApp({ initialCatalog }: { initialCatalog: PublicCatalog | null }) {
  const [locale, setLocale] = useState<Locale>("ar");
  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<PublicCatalog | null>(initialCatalog);
  const [tab, setTab] = useState("all");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [product, setProduct] = useState<ProductView | null>(null);
  const [packageIndex, setPackageIndex] = useState(0);
  const [playerId, setPlayerId] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<(DiscountCode & { code: string }) | null>(null);
  const [couponError, setCouponError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [payment, setPayment] = useState("Vodafone Cash");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [confirmation, setConfirmation] = useState<{ number: string; message: string; whatsappUrl: string } | null>(null);
  const [trackNumber, setTrackNumber] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [tracked, setTracked] = useState<Tracked | null>(null);
  const [trackError, setTrackError] = useState("");
  const [tracking, setTracking] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  const t = copy[locale];

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("vexora_cart") || "[]") as CartItem[];
      if (Array.isArray(stored)) {
        setCart(stored.filter((item) => Number.isInteger(item?.productId) && Number.isInteger(item?.packageIndex) && item.packageIndex >= 0 && Number.isInteger(item?.quantity) && item.quantity > 0 && item.quantity <= 20 && typeof item.key === "string" && typeof item.playerId === "string"));
      }
      if (localStorage.getItem("vexora_lang") === "en") setLocale("en");
    } catch {
      /* ignore broken local cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("vexora_cart", JSON.stringify(cart));
    localStorage.setItem("vexora_lang", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [cart, locale, ready]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PublicCatalog | null) => {
        if (!ignore && data?.products && data.categories) setCatalog(data);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (sheet !== "cart") return;
    let ignore = false;
    fetch("/api/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (ignore) return;
        if (data?.loggedIn) {
          setMe(data);
          setName((current) => current || data.name || "");
          setPhone((current) => current || data.phone || "");
          setEmail((current) => current || data.email || "");
        } else {
          setMe(null);
          setUsePoints(false);
        }
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [sheet]);

  const products = catalog?.products ?? [];
  const categories = catalog?.categories ?? [];
  const offers = catalog?.offers ?? [];
  const quote = useMemo(
    () => buildQuote(products, offers, cart, coupon, me ? { balance: me.points, rules: me.rules, use: usePoints } : null),
    [products, offers, cart, coupon, me, usePoints],
  );
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedPackage = product?.packages[packageIndex] ?? product?.packages[0];
  const selectedOffer = product && selectedPackage ? bestOfferForPackage(offers, product.id, selectedPackage.id, selectedPackage.price) : null;
  const iconFor = (categoryId: string) => categories.find((category) => category.id === categoryId)?.icon || "🛍️";

  function openProduct(next: ProductView, index = 0) {
    setProduct(next);
    setPackageIndex(index);
    setPlayerId("");
    setPlayerError("");
    setSheet("product");
  }

  function changeQty(key: string, delta: number) {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity: Math.min(20, item.quantity + delta) } : item)).filter((item) => item.quantity > 0));
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const response = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        setCoupon(null);
        setCouponError(response.status === 404 ? t.invalidCode : t.connectionError);
        return;
      }
      const data = (await response.json()) as DiscountCode & { code: string };
      if (data.category && !quote.lines.some((line) => line.category === data.category)) {
        setCoupon(null);
        setCouponError(`${t.wrongCategory} ${categories.find((category) => category.id === data.category)?.name[locale] || ""}`);
        return;
      }
      setCoupon(data);
      setCouponError("");
      setToast(t.applied);
    } catch {
      setCouponError(t.connectionError);
    }
  }

  function addToCart() {
    if (!product || !selectedPackage) return;
    const id = normalizeDigits(playerId).replace(/\D/g, "");
    if (product.requiresPlayerId && !/^\d{5,14}$/.test(id)) {
      setPlayerError(t.playerIdError);
      return;
    }
    const key = `${product.id}-${packageIndex}-${id}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) return current.map((item) => (item.key === key ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item));
      return [...current, { key, productId: product.id, packageIndex, playerId: id, quantity: 1 }];
    });
    setSheet(null);
    setToast(t.added);
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!quote.lines.length) return;
    setFormError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          email,
          paymentMethod: payment,
          discountCode: coupon?.code ?? "",
          locale,
          usePoints: usePoints && quote.pointsUsed > 0,
          items: cart.map((item) => ({
            productId: item.productId,
            packageIndex: item.packageIndex,
            quantity: item.quantity,
            playerId: item.playerId,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormError(response.status === 400 || response.status === 409 ? data.error || t.required : t.error);
        return;
      }
      setConfirmation(data);
      setTrackNumber(data.number);
      setTrackPhone(data.phone);
      setTracked(null);
      setCart([]);
      setCoupon(null);
      setCouponInput("");
      setUsePoints(false);
      setSheet("confirmation");
    } catch {
      setFormError(t.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  async function track(event: React.FormEvent) {
    event.preventDefault();
    if (!trackNumber.trim() || !trackPhone.trim()) {
      setTrackError(t.trackMissing);
      setTracked(null);
      return;
    }
    setTrackError("");
    setTracking(true);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: trackNumber, phone: trackPhone }),
      });
      if (!response.ok) {
        setTrackError(response.status === 404 || response.status === 400 ? t.notFound : t.connectionError);
        setTracked(null);
        return;
      }
      setTracked(await response.json());
    } catch {
      setTrackError(t.connectionError);
      setTracked(null);
    } finally {
      setTracking(false);
    }
  }

  function continueShopping() {
    setSheet(null);
    document.getElementById("store")?.scrollIntoView({ behavior: "smooth" });
  }

  const queryText = query.trim().toLowerCase();
  const matchesQuery = (parts: Array<string | undefined>) => !queryText || parts.join(" ").toLowerCase().includes(queryText);
  const liveOffers = offers.filter((offer) => isLiveOffer(offer) && products.some((item) => item.id === offer.productId && item.packages.some((pkg) => pkg.id === offer.packageId)));
  const coveredPackages = new Set(liveOffers.map((offer) => offer.packageId));
  const catalogDeals = products.flatMap((item) =>
    item.packages.flatMap((pkg, index) => {
      if (!pkg.oldPrice || pkg.oldPrice <= pkg.price || coveredPackages.has(pkg.id)) return [];
      return [{ product: item, pkg, index }];
    }),
  );
  const visibleOffers = liveOffers.filter((offer) => {
    const target = products.find((item) => item.id === offer.productId);
    const pkg = target?.packages.find((item) => item.id === offer.packageId);
    return !!target && !!pkg && matchesQuery([offer.title.ar, offer.title.en, offer.description.ar, offer.description.en, target.name.ar, target.name.en, pkg.label.ar, pkg.label.en]);
  });
  const visibleDeals = catalogDeals.filter(({ product: dealProduct, pkg }) => matchesQuery([dealProduct.name.ar, dealProduct.name.en, pkg.label.ar, pkg.label.en]));
  const searchedProducts = products.filter((item) => (tab === "all" || item.category === tab) && matchesQuery([item.name.ar, item.name.en, item.description.ar, item.description.en, ...item.packages.flatMap((pkg) => [pkg.label.ar, pkg.label.en])]));

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="VEXORA home">
          <BrandMark />
          <span>VEXORA</span>
        </a>
        <button className="pill-button header-button" type="button" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={locale === "ar" ? "Switch to English" : "التحويل إلى العربية"}>
          {locale === "ar" ? "EN" : "عربي"}
        </button>
        <a className="pill-button header-button" href="/account">{t.account}</a>
        <button className="pill-button header-button cart-trigger" type="button" onClick={() => { setFormError(""); setSheet("cart"); }} aria-label={t.cart}>
          <span aria-hidden="true">🛒</span> <span>{count}</span>
        </button>
      </header>
      {catalog?.banner.enabled && catalog.banner.text[locale] ? <div className="promo-banner">{catalog.banner.text[locale]}</div> : null}
      <div id="top" className="hero">
        <h1>{t.tagline}</h1>
        <p>{t.subtitle}</p>
        <a className="gold-button" href="#store">{t.explore}</a>
      </div>
      <main>
        {visibleOffers.length || visibleDeals.length ? (
          <section className="content-section offer-section" aria-label={t.exclusive}>
            <div className="offer-head">
              <div className="exclusive-kicker">{t.exclusive}</div>
              <h2 className="section-title">{t.exclusiveTitle}</h2>
              <p className="muted">{t.exclusiveDesc}</p>
            </div>
            <div className="offer-rail">
              {visibleOffers.map((offer) => {
                const target = products.find((item) => item.id === offer.productId);
                const index = target?.packages.findIndex((item) => item.id === offer.packageId) ?? -1;
                const pkg = index >= 0 ? target?.packages[index] : undefined;
                if (!target || !pkg) return null;
                return (
                  <OfferTicket
                    key={`offer-${offer.id}`}
                    locale={locale}
                    badge={t.exclusiveTag}
                    percent={discountPercent(pkg.price, offer.salePrice)}
                    title={offer.title[locale] || target.name[locale]}
                    subtitle={offer.description[locale] || pkg.label[locale]}
                    image={offer.image || pkg.image || target.image}
                    icon={iconFor(target.category)}
                    from={pkg.price}
                    to={offer.salePrice}
                    until={offer.endsAt ? `${t.until} ${formatWhen(offer.endsAt, locale)}` : ""}
                    endsAt={offer.endsAt}
                    action={t.orderNow}
                    onOrder={() => openProduct(target, index)}
                  />
                );
              })}
              {visibleDeals.map(({ product: dealProduct, pkg, index }) => (
                <OfferTicket
                  key={`deal-${dealProduct.id}-${pkg.id}`}
                  locale={locale}
                  badge={t.deal}
                  percent={discountPercent(pkg.oldPrice || pkg.price, pkg.price)}
                  title={dealProduct.name[locale]}
                  subtitle={pkg.label[locale]}
                  image={pkg.image || dealProduct.image}
                  icon={iconFor(dealProduct.category)}
                  from={pkg.oldPrice || pkg.price}
                  to={pkg.price}
                  until=""
                  action={t.orderNow}
                  onOrder={() => openProduct(dealProduct, index)}
                />
              ))}
            </div>
          </section>
        ) : null}
        <section id="store" className="content-section store-section">
          <h2 className="section-title">{t.products}</h2>
          {!catalog ? <p className="muted">{t.loading}</p> : null}
          <label className="store-search">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.search} />
            {query ? <button className="clear-search" type="button" onClick={() => setQuery("")} aria-label={t.close}>×</button> : null}
          </label>
          <div className="tabs" role="tablist" aria-label={t.products}>
            <button className={`pill-button ${tab === "all" ? "active" : ""}`} type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>{t.all}</button>
            {categories.map((category) => (
              <button key={category.id} className={`pill-button ${tab === category.id ? "active" : ""}`} type="button" role="tab" aria-selected={tab === category.id} onClick={() => setTab(category.id)}>
                {category.name[locale]}
              </button>
            ))}
          </div>
          {queryText ? (
            <div className="product-grid filtered-products">
              <p className="muted search-empty">{t.results}: {searchedProducts.length}</p>
              {searchedProducts.map((item) => (
                <ProductCard key={item.id} product={item} locale={locale} icon={iconFor(item.category)} offers={offers} onOpen={openProduct} />
              ))}
              {searchedProducts.length === 0 ? <p className="muted search-empty">{t.noResults}</p> : null}
            </div>
          ) : tab === "all" ? (
            <div className="grouped-products">
              {categories.map((category) => {
                const list = products.filter((item) => item.category === category.id);
                const open = openCategory === category.id;
                return (
                  <div className={`category-section ${open ? "open" : ""}`} key={category.id}>
                    <button type="button" className="category-heading" aria-expanded={open} onClick={() => setOpenCategory(open ? null : category.id)}>
                      <span>{category.icon} {category.name[locale]}</span>
                      <small>{list.length}</small>
                      <span className="chevron" aria-hidden="true">▾</span>
                    </button>
                    <div className="category-body" aria-hidden={!open}>
                      <div className="category-inner">
                        <div className="product-grid">
                          {list.map((item) => (
                            <ProductCard key={item.id} product={item} locale={locale} icon={category.icon} offers={offers} onOpen={openProduct} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="product-grid filtered-products">
              {products.filter((item) => item.category === tab).map((item) => (
                <ProductCard key={item.id} product={item} locale={locale} icon={iconFor(item.category)} offers={offers} onOpen={openProduct} />
              ))}
            </div>
          )}
        </section>
        <section className="content-section why-section">
          <h2 className="section-title">{t.why}</h2>
          <div className="why-grid">
            <div className="feature-card"><strong>{t.authentic}</strong><p className="muted">{t.authenticDesc}</p></div>
            <div className="feature-card"><strong>{t.fast}</strong><p className="muted">{t.fastDesc}</p></div>
            <div className="feature-card"><strong>{t.local}</strong><p className="muted">{t.localDesc}</p></div>
          </div>
        </section>
        <section id="tracking" className="content-section tracking-section">
          <h2 className="section-title">{t.track}</h2>
          <form className="track-form" onSubmit={track}>
            <input placeholder={t.orderNumber} aria-label={t.orderNumber} autoComplete="off" value={trackNumber} onChange={(event) => setTrackNumber(event.target.value)} />
            <input placeholder={t.phone} aria-label={t.phone} inputMode="tel" autoComplete="tel" value={trackPhone} onChange={(event) => setTrackPhone(event.target.value)} />
            <button className="gold-button" type="submit" disabled={tracking}>{tracking ? t.loading : t.trackButton}</button>
          </form>
          {trackError ? <div className="form-error track-error" role="alert">{trackError}</div> : null}
          {tracked ? (
            <div className="tracked-order">
              <div className="tracking-header">
                <div>
                  <span className="eyebrow">{t.trackStatus}</span>
                  <h3 dir="ltr">{tracked.number}</h3>
                </div>
                <span className={`status-badge ${tracked.status === "cancelled" ? "cancelled" : ""}`}>{statusLabel(tracked.status, locale)}</span>
              </div>
              <div className="tracking-facts">
                <div><span>{t.placedOn}</span><strong>{formatWhen(tracked.createdAt, locale)}</strong></div>
                <div><span>{t.total}</span><strong>{money(tracked.total, locale)}</strong></div>
                <div><span>{t.paymentMethod}</span><strong>{paymentLabel(tracked.paymentMethod, locale)}</strong></div>
              </div>
              <h4>{t.timeline}</h4>
              <Timeline order={tracked} locale={locale} />
              <h4>{t.items}</h4>
              <div>
                {tracked.items.map((item, index) => (
                  <div className="tracking-item" key={`${item.productId}-${index}`}>
                    {item.image ? <img src={item.image} alt="" width={54} height={36} /> : null}
                    <span>{locale === "ar" ? item.productNameAr : item.productNameEn} — {locale === "ar" ? item.packageAr : item.packageEn} × {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
      <footer className="site-footer">
        © VEXORA – Digital Store · {t.tagline}
        <br />
        <span className="brand-slogan">YOUR DIGITAL WORLD.</span>
        <br />
        <a href={`https://wa.me/${catalog?.whatsapp || "201004063941"}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <span> · </span>
        <a className="footer-admin" href="/admin">{t.admin}</a>
      </footer>
      {toast ? <div className="toast on" role="status">{toast}</div> : null}
      {sheet ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          {sheet === "product" && product && selectedPackage ? (
            <div className="sheet product-sheet" role="dialog" aria-modal="true" aria-label={product.name[locale]}>
              <button className="sheet-x" type="button" onClick={() => setSheet(null)} aria-label={t.close}>×</button>
              {product.image ? <img className="product-modal-image" src={product.image} alt={product.name[locale]} /> : <div className="product-modal-image img-placeholder" aria-hidden="true">{iconFor(product.category)}</div>}
              <h2>{product.name[locale]}</h2>
              <p className="muted product-description">{product.description[locale]} · {t.delivery}: {product.delivery[locale]} · {t.available}</p>
              <p className="choose-label">{t.choosePackage}</p>
              <div className="package-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, margin: "12px 0" }}>
                {product.packages.map((pkg, index) => {
                  const offer = bestOfferForPackage(offers, product.id, pkg.id, pkg.price);
                  const pay = offer ? offer.salePrice : pkg.price;
                  const strike = strikePrice(pkg, offer);
                  const percent = strike ? discountPercent(strike, pay) : 0;
                  return (
                    <button key={pkg.id || index} type="button" className="product-card package-card" aria-pressed={packageIndex === index} style={packageIndex === index ? { borderColor: "#d6b45b", boxShadow: "0 0 0 2px rgba(214,180,91,.45), 0 0 24px rgba(214,180,91,.25)" } : undefined} onClick={() => { setPackageIndex(index); setPlayerError(""); }}>
                      {percent > 0 ? <span className="sale-badge">{locale === "ar" ? "خصم" : "Sale"} {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en").format(percent)}%</span> : null}
                      <span className="product-image"><Picture src={packageImage(product, pkg)} alt={pkg.label[locale]} icon={iconFor(product.category)} /></span>
                      <span className="product-title">{pkg.label[locale]}</span>
                      <span className="product-price">{strike ? <s className="price-old">{money(strike, locale)}</s> : null}{money(pay, locale)}</span>
                    </button>
                  );
                })}
              </div>
              {product.requiresPlayerId ? <input className="field" value={playerId} onChange={(event) => { setPlayerId(event.target.value); setPlayerError(""); }} placeholder={t.playerId} aria-label={t.playerId} inputMode="numeric" /> : null}
              {playerError ? <div className="form-error" role="alert">{playerError}</div> : null}
              <div className="product-modal-price">
                {selectedPackage && strikePrice(selectedPackage, selectedOffer) ? <s className="price-old">{money(strikePrice(selectedPackage, selectedOffer)!, locale)}</s> : null}{" "}
                {money(selectedOffer ? selectedOffer.salePrice : selectedPackage.price, locale)}
              </div>
              <div className="modal-actions">
                <button className="gold-button" type="button" onClick={addToCart}>{t.add}</button>
                <button className="pill-button" type="button" onClick={() => setSheet(null)}>{t.close}</button>
              </div>
            </div>
          ) : null}
          {sheet === "cart" ? (
            <div className="sheet cart-sheet" role="dialog" aria-modal="true" aria-label={t.cart}>
              <button className="sheet-x" type="button" onClick={() => setSheet(null)} aria-label={t.close}>×</button>
              <h2>{t.cart}</h2>
              {quote.lines.length ? (
                <>
                  <div className="cart-nav">
                    <button className="pill-button" type="button" onClick={continueShopping}>{t.continueShopping}</button>
                  </div>
                  {quote.lines.map((line) => {
                    const item = cart.find((entry) => entry.productId === line.productId && entry.packageIndex === line.packageIndex && entry.playerId === line.playerId);
                    if (!item) return null;
                    return (
                      <article className="cart-card" key={item.key}>
                        {line.image ? <img src={line.image} alt="" /> : <div className="cart-thumb">🛒</div>}
                        <div>
                          <div className="cart-card-top">
                            <strong>{line.productName[locale]}</strong>
                            <button className="remove-link" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))}>{t.remove}</button>
                          </div>
                          <span className="muted">{line.label[locale]}{line.playerId ? ` · ID: ${line.playerId}` : ""}</span>
                          <div className="cart-actions">
                            <div>
                              {line.unitPrice < line.catalogPrice ? <s className="price-old">{money(line.catalogPrice, locale)}</s> : null}{" "}
                              <strong>{money(line.unitPrice, locale)}</strong>
                            </div>
                            <div className="quantity-control">
                              <button type="button" aria-label="Decrease quantity" onClick={() => changeQty(item.key, -1)}>−</button>
                              <span>{item.quantity}</span>
                              <button type="button" aria-label="Increase quantity" onClick={() => changeQty(item.key, 1)}>+</button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  <div className="summary-box">
                    <div className="cart-summary-row"><span>{t.subtotal}</span><span>{money(quote.catalogSubtotal, locale)}</span></div>
                    {quote.offerDiscount > 0 ? <div className="cart-summary-row"><span>{t.offerDiscount}</span><span>−{money(quote.offerDiscount, locale)}</span></div> : null}
                    {quote.couponDiscount > 0 ? <div className="cart-summary-row"><span>{t.discount} ({quote.couponPercent}%)</span><span>−{money(quote.couponDiscount, locale)}</span></div> : null}
                    {quote.pointsDiscount > 0 ? <div className="cart-summary-row"><span>{locale === "ar" ? "خصم النقاط" : "Points discount"}</span><span>−{money(quote.pointsDiscount, locale)}</span></div> : null}
                    {quote.totalDiscount > 0 ? <div className="cart-summary-row"><span>{t.totalDiscount}</span><span>−{money(quote.totalDiscount, locale)}</span></div> : null}
                    <div className="cart-summary-row total-row"><strong>{t.total}</strong><strong>{money(quote.total, locale)}</strong></div>
                  </div>
                  <div className="coupon-row">
                    <input className="field" value={couponInput} onChange={(event) => { setCouponInput(event.target.value); setCouponError(""); }} placeholder={t.discountCode} aria-label={t.discountCode} />
                    <button className="pill-button" type="button" onClick={applyCoupon}>{t.apply}</button>
                  </div>
                  {couponError ? <div className="form-error" role="alert">{couponError}</div> : null}
                  {me ? (
                    <label className="note" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={usePoints && quote.pointsUsed > 0} disabled={buildQuote(products, offers, cart, coupon, { balance: me.points, rules: me.rules, use: true }).pointsUsed <= 0} onChange={(event) => setUsePoints(event.target.checked)} />
                      <span>
                        {buildQuote(products, offers, cart, coupon, { balance: me.points, rules: me.rules, use: true }).pointsUsed > 0
                          ? locale === "ar"
                            ? `استخدم ${buildQuote(products, offers, cart, coupon, { balance: me.points, rules: me.rules, use: true }).pointsUsed} نقطة = خصم ${money(buildQuote(products, offers, cart, coupon, { balance: me.points, rules: me.rules, use: true }).pointsDiscount, locale)} (رصيدك ${me.points})`
                            : `Use ${buildQuote(products, offers, cart, coupon, { balance: me.points, rules: me.rules, use: true }).pointsUsed} points = ${money(buildQuote(products, offers, cart, coupon, { balance: me.points, rules: me.rules, use: true }).pointsDiscount, locale)} off (balance ${me.points})`
                          : t.noPoints}
                      </span>
                    </label>
                  ) : <p className="muted"><a href="/login">{t.signInPoints}</a></p>}
                  <form className="checkout-form" onSubmit={submitOrder}>
                    <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder={t.fullName} aria-label={t.fullName} autoComplete="name" />
                    <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t.phone} aria-label={t.phone} inputMode="tel" autoComplete="tel" />
                    <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.email} aria-label={t.email} type="email" autoComplete="email" />
                    <select className="field" aria-label={t.payment} value={payment} onChange={(event) => setPayment(event.target.value)}>
                      <option value="Vodafone Cash">Vodafone Cash</option>
                      <option value="InstaPay">InstaPay</option>
                      <option value="Bank transfer">{t.bank}</option>
                    </select>
                    <div className="note">{catalog?.paymentNote[locale]}</div>
                    {formError ? <div className="form-error" role="alert">{formError}</div> : null}
                    <button className="gold-button" type="submit" disabled={submitting}>{submitting ? t.processing : t.placeOrder}</button>
                  </form>
                </>
              ) : (
                <div className="empty-cart">
                  <div aria-hidden="true">🛒</div>
                  <p>{t.emptyCart}</p>
                  <span className="muted">{t.emptyCartHelp}</span>
                  <button className="gold-button" type="button" onClick={continueShopping}>{t.continueShopping}</button>
                </div>
              )}
              <button className="pill-button bottom-close" type="button" onClick={() => setSheet(null)}>{t.close}</button>
            </div>
          ) : null}
          {sheet === "confirmation" && confirmation ? (
            <div className="sheet confirmation-sheet" role="dialog" aria-modal="true" aria-label={t.orderPlaced}>
              <button className="sheet-x" type="button" onClick={() => setSheet(null)} aria-label={t.close}>×</button>
              <div className="success-icon" aria-hidden="true">✓</div>
              <h2>{t.orderPlaced}</h2>
              <p className="muted">{t.received}</p>
              <div className="confirmation-number" dir="ltr">{confirmation.number}</div>
              <div className="note">{catalog?.paymentNote[locale]}</div>
              <p className="muted confirmation-hint">{t.trackHint}</p>
              <div className="confirmation-actions">
                <a className="gold-button" href={confirmation.whatsappUrl} target="_blank" rel="noopener noreferrer">💬 {t.whatsapp}</a>
                <button className="pill-button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(confirmation.message); setToast(t.copied); } catch { setToast(t.error); } }}>{t.copyMessage}</button>
                <button className="pill-button" type="button" onClick={() => { setSheet(null); setTimeout(() => document.getElementById("tracking")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }}>{t.track}</button>
              </div>
              <textarea className="field message-preview" value={confirmation.message} readOnly aria-label={t.orderDetails} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function OfferCountdown({ endsAt, locale }: { endsAt: string; locale: Locale }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endsAt).getTime() - Date.now()));
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  const total = Math.floor(remaining / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const fmt = (n: number) => String(n).padStart(2, "0");
  const expired = remaining <= 0;
  return (
    <div className={`offer-countdown${expired ? " expired" : ""}`} aria-live="off">
      <span className="countdown-label">{expired ? (locale === "ar" ? "انتهى العرض" : "Offer ended") : (locale === "ar" ? "ينتهي خلال" : "ENDS IN")}</span>
      <div className="countdown-units" dir="ltr">
        {days > 0 ? <b><strong>{fmt(days)}</strong><small>{locale === "ar" ? "يوم" : "D"}</small></b> : null}
        <b><strong>{fmt(hours)}</strong><small>{locale === "ar" ? "س" : "H"}</small></b>
        <b><strong>{fmt(minutes)}</strong><small>{locale === "ar" ? "د" : "M"}</small></b>
        <b><strong>{fmt(seconds)}</strong><small>{locale === "ar" ? "ث" : "S"}</small></b>
      </div>
    </div>
  );
}

function OfferTicket({ locale, badge, percent, title, subtitle, image, icon, from, to, until, endsAt, action, onOrder }: {
  locale: Locale;
  badge: string;
  percent: number;
  title: string;
  subtitle: string;
  image?: string;
  icon: string;
  from: number;
  to: number;
  until: string;
  endsAt?: string;
  action: string;
  onOrder: () => void;
}) {
  return (
    <article className="offer-ticket">
      <div className="offer-media">{image ? <img src={image} alt="" /> : <span>{icon}</span>}</div>
      <div className="offer-copy">
        <div className="offer-meta">
          <span>{badge}</span>
          {percent > 0 ? <b>{new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en").format(percent)}%</b> : null}
        </div>
        <strong>{title}</strong>
        <span className="muted">{subtitle}</span>
        <div className="offer-prices">
          <s>{money(from, locale)}</s>
          <em>{money(to, locale)}</em>
        </div>
        {endsAt ? <OfferCountdown endsAt={endsAt} locale={locale} /> : until ? <small>{until}</small> : <small className="offer-no-expiry">{locale === "ar" ? "عرض لفترة محدودة" : "Limited-time deal"}</small>}
        <button className="pill-button" type="button" onClick={onOrder}>{action}</button>
      </div>
    </article>
  );
}

function ProductCard({ product, locale, icon, offers, onOpen }: { product: ProductView; locale: Locale; icon: string; offers: OfferView[]; onOpen: (product: ProductView) => void }) {
  const min = Math.min(...product.packages.map((pkg) => bestOfferForPackage(offers, product.id, pkg.id, pkg.price)?.salePrice ?? pkg.price));
  return (
    <button className="product-card" type="button" onClick={() => onOpen(product)} aria-label={product.name[locale]}>
      <span className="product-image"><Picture src={product.image} alt={product.name[locale]} icon={icon} /></span>
      <span className="product-title">{product.name[locale]}</span>
      <span className="product-price">{money(min, locale)}+</span>
    </button>
  );
}

function Timeline({ order, locale }: { order: Tracked; locale: Locale }) {
  const flow: string[] = order.status === "cancelled" ? [...ORDER_FLOW.filter((status) => order.events.some((event) => event.status === status)), "cancelled"] : [...ORDER_FLOW];
  const current = flow.indexOf(order.status);
  return (
    <div className="timeline">
      {flow.map((status, index) => {
        const event = order.events.find((item) => item.status === status);
        const state = status === "cancelled" ? "is-cancelled" : index === current ? "is-current" : index < current ? "is-done" : "is-upcoming";
        return (
          <div className={`timeline-step ${state}`} key={status}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{statusLabel(status, locale)}</strong>
              {event ? <div className="muted">{formatWhen(event.createdAt, locale)}</div> : null}
              {event?.note ? <div className="timeline-note">{event.note}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
