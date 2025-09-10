import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { QRCodeCanvas } from "qrcode.react";

// === Utilities & UI Primitives =================================================
const Card = ({ children }) => (
  <div className="rounded-2xl shadow p-4 bg-white border border-gray-100">{children}</div>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-xl font-semibold mb-3 text-gray-800">{children}</h2>
);

// NOTE: Fixed Badge component syntax and ensured proper closing tags
const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 mr-2">
    {children}
  </span>
);

const Button = ({ children, className = "", disabled = false, ...props }) => (
  <button
    disabled={disabled}
    className={
      "px-3 py-2 rounded-xl shadow-sm border text-sm font-medium transition active:scale-[0.99] " +
      (disabled
        ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed"
        : "bg-black text-white border-black hover:opacity-90") +
      " " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, className = "", ...props }) => (
  <button
    className={
      "px-3 py-2 rounded-xl shadow-sm border text-sm font-medium transition active:scale-[0.99] " +
      "bg-white text-gray-900 border-gray-300 hover:bg-gray-50 " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

// Safer QR component wrapper to avoid React#130 if library default export is missing
const QR = (props) => {
  if (typeof QRCodeCanvas === "function") {
    return <QRCodeCanvas {...props} />;
  }
  // Fallback visual when QR lib is unavailable
  return (
    <div className="grid place-items-center w-[160px] h-[160px] border-2 border-dashed rounded">
      <div className="text-[10px] text-gray-500 text-center px-2">QR lib not found{'\n'}Código: {String(props.value)}</div>
    </div>
  );
};

// === Domain Mock Data ===========================================================
const LOCALITIES = [
  { id: "gesell", name: "Villa Gesell" },
  { id: "mdlp", name: "Mar de las Pampas" },
  { id: "marazul", name: "Mar Azul" },
  { id: "lasgaviotas", name: "Las Gaviotas" },
];

const CATEGORIES = [
  { id: "food", name: "Gastronomía" },
  { id: "stay", name: "Hospedaje" },
  { id: "activity", name: "Actividades" },
  { id: "shops", name: "Comercios" },
];

const initialMerchants = [
  { id: "m1", name: "Heladería Sol Mar", locality: "gesell", category: "food" },
  { id: "m2", name: "Parrilla El Puerto", locality: "mdlp", category: "food" },
  { id: "m3", name: "Aventura DunaBuggy", locality: "gesell", category: "activity" },
];

const initialCoupons = [
  {
    id: "c1",
    merchantId: "m1",
    title: "2x1 en cucuruchos",
    benefit: "Llevá 2, pagás 1 (cucuruchos estándar)",
    terms: "Válido todos los días de 16 a 19 h. No acumulable.",
    startsAt: "2025-09-01",
    endsAt: "2025-12-31",
    status: "active",
  },
  {
    id: "c2",
    merchantId: "m2",
    title: "10% OFF en parrilla",
    benefit: "10% de descuento sobre el total de la mesa",
    terms: "Pago en efectivo. Excluye vinos premium.",
    startsAt: "2025-09-01",
    endsAt: "2025-11-30",
    status: "active",
  },
  {
    id: "c3",
    merchantId: "m3",
    title: "Excursión 3x2",
    benefit: "3 entradas al precio de 2",
    terms: "Con reserva previa. Cupos limitados.",
    startsAt: "2025-09-01",
    endsAt: "2025-10-31",
    status: "active",
  },
];

// === Helpers ====================================================================
const STORAGE_KEY = "ct-mvp-store-v1";
const clampUpper = (s, n) => s.slice(0, n).toUpperCase();

// Very simple base36 checksum (sum char codes % 36)
export function checksum36(str) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const sum = str.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return alphabet[sum % 36];
}

export function generateCode(existingSet) {
  // Ensure uniqueness & add checksum char
  let base = clampUpper(uuidv4().replace(/-/g, ""), 8);
  while (existingSet.has(base) || existingSet.has(base + checksum36(base))) {
    base = clampUpper(uuidv4().replace(/-/g, ""), 8);
  }
  return base + checksum36(base);
}

function usePersistentState(initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return { ...initial, ...parsed };
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  return [state, setState];
}

// === Demo Store (App State) =====================================================
function useDemoStore() {
  // Simulate a session user (tourist)
  const [sessionUserId] = useState(() => uuidv4());

  const [store, setStore] = usePersistentState({
    merchants: initialMerchants,
    coupons: initialCoupons,
    redemptions: [], // {code,couponId,issuedAt,redeemedAt,userId}
    issued: [], // {code,couponId,issuedAt,userId}
  });

  // Build a quick lookup for uniqueness
  const existingCodes = useMemo(() => {
    const set = new Set();
    store.issued.forEach((r) => set.add(r.code));
    store.redemptions.forEach((r) => set.add(r.code));
    return set;
  }, [store.issued, store.redemptions]);

  const createCoupon = (coupon) => {
    setStore((prev) => ({ ...prev, coupons: [...prev.coupons, { ...coupon, id: uuidv4(), status: "active" }] }));
  };

  const hasIssuedActive = (couponId) =>
    store.issued.find(
      (r) => r.couponId === couponId && r.userId === sessionUserId && !store.redemptions.find((x) => x.code === r.code)
    );

  const issueCoupon = (couponId) => {
    // If user already has an unredeemed issuance for this coupon, reuse it
    const existing = hasIssuedActive(couponId);
    if (existing) return { record: existing, reused: true };

    const code = generateCode(existingCodes);
    const now = new Date().toISOString();
    const record = { code, couponId, issuedAt: now, userId: sessionUserId };
    setStore((prev) => ({ ...prev, issued: [record, ...prev.issued] }));
    return { record, reused: false };
  };

  const redeemCode = (code) => {
    // validate checksum
    const body = code.slice(0, -1);
    const check = code.slice(-1);
    if (!body || checksum36(body) !== check) {
      return { ok: false, message: "Código inválido (checksum)" };
    }
    const issuedRecord = [...store.issued, ...store.redemptions].find((r) => r.code === code);
    const coupon = store.coupons.find((c) => c.id === issuedRecord?.couponId);
    if (!issuedRecord || !coupon) return { ok: false, message: "Código no encontrado" };
    const already = store.redemptions.find((r) => r.code === code && r.redeemedAt);
    if (already) return { ok: false, message: "Código ya canjeado" };
    const now = new Date().toISOString();
    const newRed = { ...issuedRecord, redeemedAt: now };
    setStore((prev) => ({ ...prev, redemptions: [newRed, ...prev.redemptions] }));
    return { ok: true, message: "Canje registrado", redemption: newRed };
  };

  const metrics = useMemo(() => {
    const byCoupon = {};
    store.redemptions.forEach((r) => {
      byCoupon[r.couponId] = (byCoupon[r.couponId] || 0) + 1;
    });
    const byMerchant = {};
    store.coupons.forEach((c) => {
      const m = store.merchants.find((mm) => mm.id === c.merchantId);
      if (!m) return;
      byMerchant[m.id] = (byMerchant[m.id] || 0) + (byCoupon[c.id] || 0);
    });
    return { byCoupon, byMerchant };
  }, [store.redemptions, store.coupons, store.merchants]);

  return {
    ...store,
    sessionUserId,
    createCoupon,
    issueCoupon,
    redeemCode,
    hasIssuedActive,
    metrics,
    setStore, // expose for debugging if needed
  };
}

function useCatalog(store, filters) {
  const { merchants, coupons } = store;
  return useMemo(() => {
    return coupons
      .map((c) => ({
        ...c,
        merchant: merchants.find((m) => m.id === c.merchantId),
      }))
      .filter(
        (c) => (!filters.locality || c.merchant?.locality === filters.locality) && (!filters.category || c.merchant?.category === filters.category)
      );
  }, [merchants, coupons, filters.locality, filters.category]);
}

// === UI Blocks =================================================================
function CouponCard({ coupon, onUse, disabled, ctaLabel = "Usar cupón" }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-lg font-semibold text-gray-900">{coupon.title}</div>
          <div className="text-gray-700 mt-1">{coupon.benefit}</div>
          <div className="mt-2 text-xs text-gray-500">{coupon.terms}</div>
          <div className="mt-2 space-x-2">
            <Badge>{coupon.merchant?.name}</Badge>
            <Badge>{LOCALITIES.find((l) => l.id === coupon.merchant?.locality)?.name}</Badge>
          </div>
        </div>
        <div>
          <Button onClick={onUse} disabled={disabled}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TouristView({ store }) {
  const [locality, setLocality] = useState(LOCALITIES[0].id);
  const [category, setCategory] = useState("");
  const [issuedView, setIssuedView] = useState(null); // last issued record
  const [toast, setToast] = useState(null);

  const list = useCatalog(store, { locality, category });

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Código copiado");
      setTimeout(() => setToast(null), 1500);
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <select className="border rounded-xl px-3 py-2" value={locality} onChange={(e) => setLocality(e.target.value)}>
              {LOCALITIES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <select className="border rounded-xl px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todos los rubros</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500">{list.length} cupones</div>
          </div>
        </Card>

        {list.map((c) => {
          const existing = store.hasIssuedActive(c.id);
          return (
            <CouponCard
              key={c.id}
              coupon={c}
              disabled={false}
              ctaLabel={existing ? "Ver código" : "Usar cupón"}
              onUse={() => {
                const { record, reused } = store.issueCoupon(c.id);
                setIssuedView(record);
                setToast(reused ? "Ya tenías un código para este cupón" : "Código generado");
                setTimeout(() => setToast(null), 1500);
              }}
            />
          );
        })}
      </div>

      <div className="space-y-4">
        <Card>
          <SectionTitle>Mi cupón (emitido)</SectionTitle>
          {!issuedView ? (
            <div className="text-sm text-gray-500">
              Elegí un cupón y presioná "Usar cupón" para generar tu QR. Si ya lo generaste antes, verás el mismo código.
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="text-sm text-gray-600 mb-2">Mostrá este QR en caja</div>
              <QR value={issuedView.code} size={160} includeMargin={true} />
              <div className="mt-2 font-mono text-lg tracking-wider">{issuedView.code}</div>
              <div className="flex gap-2 mt-2">
                <SecondaryButton onClick={() => copy(issuedView.code)}>Copiar código</SecondaryButton>
                <SecondaryButton onClick={() => setIssuedView(null)}>Ocultar</SecondaryButton>
              </div>
              <div className="text-xs text-gray-500 mt-2">Código válido por única vez</div>
            </div>
          )}
          {toast && <div className="mt-3 text-xs text-gray-700">{toast}</div>}
        </Card>

        <Card>
          <SectionTitle>Historial</SectionTitle>
          <div className="space-y-2">
            {store.issued.slice(0, 5).map((r) => {
              const c = store.coupons.find((cc) => cc.id === r.couponId);
              const m = store.merchants.find((mm) => mm.id === c?.merchantId);
              return (
                <div key={r.code} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c?.title}</div>
                    <div className="text-gray-500">
                      {m?.name} · <span className="font-mono">{r.code}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(r.issuedAt).toLocaleDateString()}</div>
                </div>
              );
            })}
            {store.issued.length === 0 && <div className="text-sm text-gray-500">Sin emisiones aún.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MerchantView({ store }) {
  const [tab, setTab] = useState("redeem");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);

  const myCoupons = store.coupons.map((c) => ({
    ...c,
    merchant: store.merchants.find((m) => m.id === c.merchantId),
  }));

  const handleRedeem = () => {
    if (!code) return;
    const res = store.redeemCode(code.trim().toUpperCase());
    setMsg(res);
    if (res.ok) setCode("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <div className="flex gap-2">
            <SecondaryButton className={tab === "redeem" ? "ring-2 ring-black" : ""} onClick={() => setTab("redeem")}>
              Canjear
            </SecondaryButton>
            <SecondaryButton className={tab === "coupons" ? "ring-2 ring-black" : ""} onClick={() => setTab("coupons")}>
              Mis cupones
            </SecondaryButton>
            <SecondaryButton className={tab === "metrics" ? "ring-2 ring-black" : ""} onClick={() => setTab("metrics")}>
              Métricas
            </SecondaryButton>
          </div>
        </Card>

        {tab === "redeem" && (
          <Card>
            <SectionTitle>Validar canje</SectionTitle>
            <p className="text-sm text-gray-600 mb-3">Escaneá el QR del cliente o ingresá el código manualmente (incluye letra de control).</p>
            <div className="flex gap-2">
              <input
                className="border rounded-xl px-3 py-2 flex-1 font-mono"
                placeholder="CÓDIGO (ej. 1A2B3C4DX)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <Button onClick={handleRedeem}>Canjear</Button>
            </div>
            {msg && <div className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.message}</div>}
          </Card>
        )}

        {tab === "coupons" && (
          <div className="space-y-3">
            {myCoupons.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-sm text-gray-600">{c.benefit}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.terms}</div>
                  </div>
                  <Badge>{c.status}</Badge>
                </div>
              </Card>
            ))}
            {myCoupons.length === 0 && <Card>No tenés cupones aún.</Card>}
          </div>
        )}

        {tab === "metrics" && (
          <Card>
            <SectionTitle>Métricas rápidas</SectionTitle>
            <div className="space-y-2">
              {myCoupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-gray-500">{c.merchant?.name}</div>
                  </div>
                  <div className="text-gray-900">{store.metrics.byCoupon[c.id] || 0} canjes</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <SectionTitle>Últimos canjes</SectionTitle>
          <div className="space-y-2">
            {store.redemptions.slice(0, 6).map((r) => {
              const c = store.coupons.find((cc) => cc.id === r.couponId);
              const m = store.merchants.find((mm) => mm.id === c?.merchantId);
              return (
                <div key={r.code} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c?.title}</div>
                    <div className="text-gray-500">
                      {m?.name} · <span className="font-mono">{r.code}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(r.redeemedAt).toLocaleTimeString()}</div>
                </div>
              );
            })}
            {store.redemptions.length === 0 && <div className="text-sm text-gray-500">Sin canjes registrados.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminView({ store }) {
  const [title, setTitle] = useState("");
  const [benefit, setBenefit] = useState("");
  const [terms, setTerms] = useState("");
  const [merchantId, setMerchantId] = useState(store.merchants[0]?.id || "");

  const submit = (e) => {
    e.preventDefault();
    if (!title || !merchantId) return;
    store.createCoupon({
      merchantId,
      title,
      benefit,
      terms,
      startsAt: new Date().toISOString().slice(0, 10),
      endsAt: "2025-12-31",
    });
    setTitle("");
    setBenefit("");
    setTerms("");
  };

  const merchantMetrics = Object.entries(store.metrics.byMerchant)
    .map(([merchantId, count]) => ({
      merchant: store.merchants.find((m) => m.id === merchantId),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <SectionTitle>Alta rápida de cupón</SectionTitle>
          <form className="space-y-3" onSubmit={submit}>
            <div className="flex gap-3">
              <select className="border rounded-xl px-3 py-2" value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                {store.merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {LOCALITIES.find((l) => l.id === m.locality)?.name}
                  </option>
                ))}
              </select>
              <input
                className="border rounded-xl px-3 py-2 flex-1"
                placeholder="Título del cupón"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <input
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="Beneficio (ej. 2x1, 10% OFF)"
              value={benefit}
              onChange={(e) => setBenefit(e.target.value)}
            />
            <textarea
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="Términos"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit">Crear cupón</Button>
            </div>
          </form>
        </Card>

        <Card>
          <SectionTitle>Cupones activos</SectionTitle>
          <div className="space-y-2">
            {store.coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-gray-500">{store.merchants.find((m) => m.id === c.merchantId)?.name}</div>
                </div>
                <Badge>activo</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <SectionTitle>Top comercios (canjes)</SectionTitle>
        
          <div className="space-y-2">
            {(merchantMetrics.length ? merchantMetrics : store.merchants.map((m) => ({ merchant: m, count: 0 }))).map(({ merchant, count }) => (
              <div key={merchant.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{merchant.name}</div>
                  <div className="text-gray-500">{LOCALITIES.find((l) => l.id === merchant.locality)?.name}</div>
                </div>
                <div className="text-gray-900">{count} canjes</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// === Lightweight Test Panel =====================================================
function runTests() {
  const results = [];
  const expect = (name, cond) => results.push({ name, ok: !!cond });

  // Test 1: checksum36 correctness (stable for known input)
  const cs = checksum36("ABCDEFGH");
  expect("checksum36 returns single base36 char", cs.length === 1);
  expect("checksum36 deterministic", cs === checksum36("ABCDEFGH"));

  // Test 2: generateCode format & checksum validity
  const set = new Set();
  const code = generateCode(set);
  const body = code.slice(0, -1);
  const check = code.slice(-1);
  expect("generateCode length 9", code.length === 9);
  expect("generateCode uppercase alnum", /^[0-9A-Z]+$/.test(code));
  expect("generateCode checksum valid", checksum36(body) === check);

  // Test 3: uniqueness under collisions
  set.add(code); // simulate collision set
  const code2 = generateCode(set);
  expect("generateCode unique vs existing", code2 !== code);

  // Test 4: issue/reuse semantics in isolated mini-store
  const mini = makeMiniStore();
  const first = mini.issue("c1");
  const second = mini.issue("c1");
  expect("issue reuses active", first.code === second.code);

  // Test 5: redeem flow and double spending prevention
  const ok1 = mini.redeem(first.code);
  const ok2 = mini.redeem(first.code);
  expect("redeem first ok", ok1.ok === true);
  expect("redeem again blocked", ok2.ok === false);

  // Test 6: invalid checksum detection
  const bogus = "AAAAAAAAA"; // checksum unlikely to match
  const bad = mini.redeem(bogus);
  expect("invalid checksum rejected", bad.ok === false);

  return results;
}

function makeMiniStore() {
  const state = {
    issued: [],
    redemptions: [],
    coupons: [{ id: "c1", merchantId: "m1" }],
  };
  const existing = new Set();

  return {
    issue(couponId) {
      const already = state.issued.find((r) => r.couponId === couponId && !state.redemptions.find((x) => x.code === r.code));
      if (already) return already;
      const code = generateCode(existing);
      existing.add(code);
      const rec = { code, couponId, issuedAt: new Date().toISOString() };
      state.issued.unshift(rec);
      return rec;
    },
    redeem(code) {
      const body = code.slice(0, -1);
      const check = code.slice(-1);
      if (!body || checksum36(body) !== check) return { ok: false, message: "Código inválido (checksum)" };
      const issuedRecord = [...state.issued, ...state.redemptions].find((r) => r.code === code);
      const already = state.redemptions.find((r) => r.code === code && r.redeemedAt);
      if (!issuedRecord) return { ok: false, message: "Código no encontrado" };
      if (already) return { ok: false, message: "Código ya canjeado" };
      state.redemptions.unshift({ ...issuedRecord, redeemedAt: new Date().toISOString() });
      return { ok: true, message: "Canje registrado" };
    },
  };
}

function TestPanel() {
  const [results] = useState(() => runTests());
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;

  return (
    <Card>
      <SectionTitle>Tests automáticos</SectionTitle>
      <div className="text-sm text-gray-600 mb-2">{passed}/{total} tests OK</div>
      <ul className="text-sm">
        {results.map((r) => (
          <li key={r.name} className={r.ok ? "text-green-700" : "text-red-700"}>
            {r.ok ? "✔" : "✖"} {r.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// === App Shell =================================================================
export default function App() {
  const store = useDemoStore();
  const [tab, setTab] = useState("tourist");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-bold">CT</div>
            <div>
              <div className="font-semibold text-gray-900">Cuponera Turística — MVP Mock</div>
              <div className="text-xs text-gray-500">Demo funcional (web) • Códigos con checksum • Persistencia local • Tests</div>
            </div>
          </div>
          <nav className="flex gap-2">
            <SecondaryButton className={tab === "tourist" ? "ring-2 ring-black" : ""} onClick={() => setTab("tourist")}>
              Turista
            </SecondaryButton>
            <SecondaryButton className={tab === "merchant" ? "ring-2 ring-black" : ""} onClick={() => setTab("merchant")}>
              Comercio
            </SecondaryButton>
            <SecondaryButton className={tab === "admin" ? "ring-2 ring-black" : ""} onClick={() => setTab("admin")}>
              Admin
            </SecondaryButton>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm text-gray-600">Flujos incluidos</div>
              <ul className="list-disc pl-5 text-sm text-gray-800">
                <li>Explorar cupones por localidad/rubro</li>
                <li>Emisión con QR/código único (con checksum)</li>
                <li>Reutiliza código si ya fue emitido y no canjeado</li>
                <li>Canje manual (demo) con validación</li>
                <li>Métricas básicas por cupón/comercio</li>
                <li>Alta rápida de cupones (admin)</li>
                <li>Persistencia en localStorage</li>
                <li>Tests automáticos en runtime</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-600">Cómo presentar la demo</div>
              <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
                <li>
                  En <b>Turista</b>, generá un código y mostralo.
                </li>
                <li>
                  En <b>Comercio → Canjear</b>, ingresá ese código (incluida la letra final).
                </li>
                <li>
                  Repetí para ver <b>Métricas</b> subir; en <b>Admin</b> creá otro cupón al vuelo.
                </li>
              </ol>
            </div>
          </div>
        </Card>

        {tab === "tourist" && <TouristView store={store} />}
        {tab === "merchant" && <MerchantView store={store} />}
        {tab === "admin" && <AdminView store={store} />}

        <TestPanel />
      </main>

      <footer className="py-10 text-center text-xs text-gray-400">MVP Mock — React + Tailwind + uuid + qrcode.react</footer>
    </div>
  );
}
