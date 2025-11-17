import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type ProductRow = {
  id: string;
  sku: string;
  barcode?: string | null;
  price: number | string; // API may return string
  product: {
    name: string;
  };
  attributes?: Record<string, string>;
};

type CartItem = {
  variantId: string;
  sku: string;
  name: string;
  attributes: string;
  price: number;
  qty: number;
};

type RegisterSession = {
  id: number;
  store_id: number;
  register_id: number;
  user_id: number;
  opening_amount: number;
  expected_cash: number | null;
  opened_at: string;
  status: string;
  notes: string | null;
};

type HeldSummary = {
  id: number;
  type: "held" | "quote";
  customer_name: string | null;
  total: number;
  created_at: string;
};

export default function SellPage() {
  const ctx = getPosContext();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [couponCode, setCouponCode] = useState("");
  const [couponAmount, setCouponAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    order_id: number;
    total: number;
  } | null>(null);

  // Register session state
  const [session, setSession] = useState<RegisterSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [openAmount, setOpenAmount] = useState("0");
  const [closeCounted, setCloseCounted] = useState("0");
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Held sales / quotes
  const [heldSales, setHeldSales] = useState<HeldSummary[]>([]);
  const [heldLoading, setHeldLoading] = useState(false);

  // Loyalty
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [loyaltyAvailable, setLoyaltyAvailable] = useState<number | null>(null);
  const [loyaltyLifetime, setLoyaltyLifetime] = useState<number | null>(null);
  const [loyaltyRedeemInput, setLoyaltyRedeemInput] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // whenever register changes, load its current session & held sales
    if (ctx?.register) {
      loadSession();
      loadHeldSales();
    } else {
      setSession(null);
      setHeldSales([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.register?.id]);

  // Whenever phone/email changes, clear loyalty (we'll reload on blur)
  useEffect(() => {
    setLoyaltyAvailable(null);
    setLoyaltyLifetime(null);
    setLoyaltyError(null);
    setLoyaltyRedeemInput("");
  }, [customerPhone, customerEmail]);

  async function loadProducts() {
    try {
      const { data } = await axios.get<ProductRow[]>(
        "http://localhost:8080/api/products"
      );

      // Normalize price to number
      const normalized = data.map((p) => ({
        ...p,
        price: Number((p as any).price),
      }));
      setProducts(normalized);
    } catch (err) {
      console.error(err);
      alert("Error loading product list for Sell screen.");
    }
  }

  async function loadSession() {
    if (!ctx?.register) return;
    setSessionLoading(true);
    setSessionError(null);
    try {
      const { data } = await axios.get(
        `http://localhost:8080/api/registers/${ctx.register.id}/session`
      );

      if (!data.session) {
        setSession(null);
      } else {
        const s = data.session;
        const normalized: RegisterSession = {
          id: s.id,
          store_id: s.store_id,
          register_id: s.register_id,
          user_id: s.user_id,
          opening_amount: Number(s.opening_amount ?? 0),
          expected_cash:
            s.expected_cash === null || s.expected_cash === undefined
              ? null
              : Number(s.expected_cash),
          opened_at: s.opened_at,
          status: s.status,
          notes: s.notes ?? null,
        };
        setSession(normalized);
      }
    } catch (err) {
      console.error(err);
      setSessionError("Unable to load register session.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleOpenSession(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx?.store || !ctx?.register) return;

    setSessionLoading(true);
    setSessionError(null);

    try {
      await axios.post(
        `http://localhost:8080/api/registers/${ctx.register.id}/sessions/open`,
        {
          store_id: ctx.store.id,
          opening_amount: parseFloat(openAmount || "0"),
          notes: null,
        }
      );
      await loadSession();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error || "Unable to open register session.";
      setSessionError(msg);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleCloseSession(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx?.register) return;

    setSessionLoading(true);
    setSessionError(null);

    try {
      await axios.post(
        `http://localhost:8080/api/registers/${ctx.register.id}/sessions/close`,
        {
          counted_cash: parseFloat(closeCounted || "0"),
          notes: null,
        }
      );
      await loadSession(); // will become null since session is now closed
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error || "Unable to close register session.";
      setSessionError(msg);
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadHeldSales() {
    if (!ctx?.store) return;

    setHeldLoading(true);
    try {
      const params: any = { store_id: ctx.store.id };
      if (ctx.register) params.register_id = ctx.register.id;

      const { data } = await axios.get(
        "http://localhost:8080/api/held-orders",
        { params }
      );

      const list: HeldSummary[] = data.map((row: any) => ({
        id: row.id,
        type: row.type,
        customer_name: row.customer_name,
        total: Number(row.total),
        created_at: row.created_at,
      }));

      setHeldSales(list);
    } catch (err) {
      console.error(err);
    } finally {
      setHeldLoading(false);
    }
  }

  async function loadLoyalty() {
    // Only attempt lookup if we have at least phone or email
    if (!customerPhone.trim() && !customerEmail.trim()) return;

    setLoyaltyLoading(true);
    setLoyaltyError(null);
    try {
      const params: any = {};
      if (customerPhone.trim()) params.phone = customerPhone.trim();
      if (customerEmail.trim()) params.email = customerEmail.trim();

      const { data } = await axios.get(
        "http://localhost:8080/api/loyalty/lookup",
        { params }
      );

      if (!data.found) {
        setLoyaltyAvailable(0);
        setLoyaltyLifetime(0);
        setLoyaltyError("No loyalty profile yet for this customer.");
      } else {
        setLoyaltyAvailable(Number(data.customer.points || 0));
        setLoyaltyLifetime(Number(data.customer.lifetime || 0));
        setLoyaltyError(null);
      }
    } catch (err: any) {
      console.error(err);
      setLoyaltyError("Unable to load loyalty points.");
      setLoyaltyAvailable(null);
      setLoyaltyLifetime(null);
    } finally {
      setLoyaltyLoading(false);
    }
  }

  function formatAttributes(p: ProductRow) {
    const attrs = p.attributes || {};
    const parts: string[] = [];
    if (attrs.storage) parts.push(attrs.storage);
    if (attrs.color) parts.push(attrs.color);
    if (attrs.size) parts.push(attrs.size);
    return parts.join(" / ");
  }

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 30);
    const s = search.toLowerCase();
    return products.filter((p) => {
      const attrText = formatAttributes(p).toLowerCase();
      return (
        p.sku.toLowerCase().includes(s) ||
        (p.barcode || "").toLowerCase().includes(s) ||
        p.product.name.toLowerCase().includes(s) ||
        attrText.includes(s)
      );
    });
  }, [products, search]);

  function addProductToCart(p: ProductRow) {
    const attrs = formatAttributes(p);
    const unitPrice = Number(p.price) || 0;

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.variantId === p.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          qty: next[existingIndex].qty + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          variantId: p.id,
          sku: p.sku,
          name: p.product.name,
          attributes: attrs,
          price: unitPrice,
          qty: 1,
        },
      ];
    });
    setSearch("");
  }

  function changeQty(idx: number, qty: number) {
    setCart((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, qty } : item))
    );
  }

  function removeItem(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Coupon discount (manual)
  const couponValue = parseFloat(couponAmount || "0") || 0;
  const couponDiscount = Math.min(Math.max(couponValue, 0), subtotal);

  // Loyalty redeem calculations
  const parsedRedeemRequested = Math.max(
    0,
    Math.floor(parseFloat(loyaltyRedeemInput || "0") || 0)
  );

  const maxByAvailable =
    loyaltyAvailable != null
      ? Math.min(parsedRedeemRequested, loyaltyAvailable)
      : parsedRedeemRequested;

  const loyaltyDiscount = Math.min(maxByAvailable, Math.floor(subtotal));

  const totalDiscount = couponDiscount + loyaltyDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  async function submitSale() {
    if (!ctx) {
      alert("Select a store & register first.");
      return;
    }
    if (!ctx.register) {
      alert("Register not selected. Please select a register.");
      return;
    }
    if (!session) {
      alert("Open a register session before processing sales.");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    setSubmitting(true);
    setLastResult(null);

    try {
      const payload = {
        store_id: ctx.store.id,
        register_id: ctx.register.id,
        lines: cart.map((c) => ({
          variant_id: c.variantId,
          qty: c.qty,
        })),
        customer: {
          name: customerName || null,
          phone: customerPhone || null,
          email: customerEmail || null,
          address: customerAddress || null,
        },
        payment_method: paymentMethod,
        coupon_code: couponCode || null,
        // coupon_amount includes manual + loyalty discount in money
        coupon_amount: totalDiscount,
        // loyalty points redeemed (points, not money)
        loyalty_redeem_points: loyaltyDiscount, // 1 point = 1.00
      };

      const { data } = await axios.post(
        "http://localhost:8080/api/orders",
        payload
      );

      setLastResult({
        order_id: data.order_id,
        total: data.total,
      });

      // Reset cart & customer info & loyalty
      setCart([]);
      setCouponAmount("");
      setCouponCode("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
      setLoyaltyAvailable(null);
      setLoyaltyLifetime(null);
      setLoyaltyRedeemInput("");
      setLoyaltyError(null);

      // Refresh expected cash and held list
      await loadSession();
      await loadHeldSales();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Error submitting sale. Check console and backend logs.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function holdSale(type: "held" | "quote") {
    if (!ctx) {
      alert("Select a store & register first.");
      return;
    }
    if (!ctx.register) {
      alert("Register not selected.");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        type,
        store_id: ctx.store.id,
        register_id: ctx.register.id,
        lines: cart.map((c) => ({
          variant_id: c.variantId,
          qty: c.qty,
        })),
        customer: {
          name: customerName || null,
          phone: customerPhone || null,
          email: customerEmail || null,
          address: customerAddress || null,
        },
        coupon_code: couponCode || null,
        // IMPORTANT: we do NOT apply loyalty when just holding/quoting
        coupon_amount: couponDiscount,
      };

      const { data } = await axios.post(
        "http://localhost:8080/api/held-orders",
        payload
      );

      // Clear current sale (but don't touch existing customers' master balance)
      setCart([]);
      setCouponAmount("");
      setCouponCode("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
      setLoyaltyAvailable(null);
      setLoyaltyLifetime(null);
      setLoyaltyRedeemInput("");
      setLoyaltyError(null);

      alert(
        type === "held"
          ? `Sale held as ticket #${data.id}`
          : `Quote saved as #${data.id}`
      );

      await loadHeldSales();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        "Error holding sale / quote. Check backend.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function restoreHeldSale(id: number) {
    try {
      const { data } = await axios.get(
        `http://localhost:8080/api/held-orders/${id}`
      );

      const h = data.held_order;
      const lines = data.lines as any[];

      const restoredCart: CartItem[] = lines.map((l) => {
        const attrsObj = l.attributes || {};
        const attrs =
          attrsObj && typeof attrsObj === "object"
            ? Object.values(attrsObj).join(" / ")
            : "";
        return {
          variantId: l.variant_id,
          sku: l.sku,
          name: l.name,
          attributes: attrs,
          price: Number(l.price),
          qty: Number(l.qty),
        };
      });

      setCart(restoredCart);
      setCustomerName(h.customer_name || "");
      setCustomerPhone(h.customer_phone || "");
      setCustomerEmail(h.customer_email || "");
      setCustomerAddress(h.customer_address || "");
      setCouponCode(h.coupon_code || "");
      setCouponAmount(
        h.coupon_amount !== null && h.coupon_amount !== undefined
          ? String(h.coupon_amount)
          : ""
      );

      // Loyalty will be reloaded when user moves out of phone/email fields
      setLoyaltyAvailable(null);
      setLoyaltyLifetime(null);
      setLoyaltyRedeemInput("");
      setLoyaltyError(null);
    } catch (err) {
      console.error(err);
      alert("Failed to restore held sale.");
    }
  }

  async function deleteHeldSale(id: number) {
    if (!window.confirm("Delete this held sale/quote?")) return;

    try {
      await axios.delete(`http://localhost:8080/api/held-orders/${id}`);
      setHeldSales((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      alert("Unable to delete held sale.");
    }
  }

  // If store/register not selected, block UI
  if (!ctx) {
    return (
      <AppShell title="Sell">
        <div style={{ fontSize: 14 }}>Select a store/register first.</div>
      </AppShell>
    );
  }

  if (!ctx.register) {
    return (
      <AppShell title="Sell">
        <div style={{ fontSize: 14 }}>
          Register not selected. Use "Switch Store/Register" to choose one.
        </div>
      </AppShell>
    );
  }

  const completeDisabled = submitting || cart.length === 0 || !session;

  return (
    <AppShell title="Sell">
      {/* Register session banner */}
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 8,
          background: "#111827",
          color: "white",
          fontFamily: "sans-serif",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 4,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <span>
            Store: {ctx.store?.name || ctx.store?.id} · Register:{" "}
            {ctx.register?.name || ctx.register?.id}
          </span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            {session ? "Session open" : "No open session"}
          </span>
        </div>

        {sessionError && (
          <div
            style={{
              background: "#fee2e2",
              color: "#fecaca",
              borderRadius: 4,
              padding: 6,
              fontSize: 11,
              marginBottom: 6,
            }}
          >
            {sessionError}
          </div>
        )}

        {sessionLoading && (
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            Checking register session…
          </div>
        )}

        {!session && !sessionLoading && (
          <form
            onSubmit={handleOpenSession}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              fontSize: 12,
            }}
          >
            <span>Opening cash:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openAmount}
              onChange={(e) => setOpenAmount(e.target.value)}
              style={{
                width: 100,
                padding: 4,
                borderRadius: 4,
                border: "1px solid #4b5563",
                fontSize: 12,
                background: "white",
                color: "#111827",
              }}
            />
            <button
              type="submit"
              disabled={sessionLoading}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "#10b981",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                cursor: sessionLoading ? "default" : "pointer",
              }}
            >
              Open session
            </button>
          </form>
        )}

        {session && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            <div>
              <div>
                Session #{session.id} · Opened{" "}
                {new Date(session.opened_at).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                Opening: ${session.opening_amount.toFixed(2)} · Expected cash: $
                {Number(session.expected_cash ?? 0).toFixed(2)}
              </div>
            </div>
            <form
              onSubmit={handleCloseSession}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ fontSize: 12 }}>Counted cash:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={closeCounted}
                onChange={(e) => setCloseCounted(e.target.value)}
                style={{
                  width: 100,
                  padding: 4,
                  borderRadius: 4,
                  border: "1px solid #4b5563",
                  fontSize: 12,
                  background: "white",
                  color: "#111827",
                }}
              />
              <button
                type="submit"
                disabled={sessionLoading}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: sessionLoading ? "default" : "pointer",
                }}
              >
                Close session
              </button>
            </form>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.4fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Left: product search & list + held sales */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Find product</div>
            <input
              placeholder="Scan barcode or type SKU / name / storage / color…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredProducts[0]) {
                  addProductToCart(filteredProducts[0]);
                }
              }}
              style={{
                marginTop: 4,
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
            />
          </div>

          <div
            style={{
              maxHeight: "40vh",
              overflowY: "auto",
              borderTop: "1px solid #e5e7eb",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            {filteredProducts.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                No matching products.
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addProductToCart(p)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    marginBottom: 4,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#f9fafb",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.product.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      SKU: {p.sku}
                      {p.barcode && <> · Barcode: {p.barcode}</>}
                    </div>
                    {formatAttributes(p) && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        {formatAttributes(p)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {Number(p.price).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Held Sales / Quotes panel */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Held Sales / Quotes
            </div>
            {heldLoading ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>Loading…</div>
            ) : heldSales.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                No held sales or quotes.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 160,
                  overflowY: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                }}
              >
                {heldSales.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: 8,
                      borderBottom: "1px solid #e5e7eb",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      background: "#fff",
                    }}
                  >
                    <div
                      onClick={() => restoreHeldSale(h.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        #{h.id} · {h.type === "held" ? "Held" : "Quote"}
                      </div>
                      <div style={{ color: "#6b7280" }}>
                        {h.customer_name || "No name"} ·{" "}
                        {h.total.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteHeldSale(h.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#b91c1c",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: "0 4px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: cart + customer + payment + loyalty */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>Cart</div>

          <div style={{ maxHeight: "40vh", overflowY: "auto" }}>
            {cart.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Cart is empty. Add products from the left.
              </div>
            ) : (
              <table
                width="100%"
                cellPadding={6}
                style={{ borderCollapse: "collapse", fontSize: 12 }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th align="left">Item</th>
                    <th align="right">Qty</th>
                    <th align="right">Price</th>
                    <th align="right">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr
                      key={item.variantId}
                      style={{ borderTop: "1px solid #e5e7eb" }}
                    >
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          {item.sku}
                        </div>
                        {item.attributes && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                            }}
                          >
                            {item.attributes}
                          </div>
                        )}
                      </td>
                      <td align="right">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            changeQty(
                              idx,
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          style={{
                            width: 50,
                            padding: 4,
                            borderRadius: 4,
                            border: "1px solid #d1d5db",
                            fontSize: 12,
                          }}
                        />
                      </td>
                      <td align="right">{item.price.toFixed(2)}</td>
                      <td align="right">
                        {(item.price * item.qty).toFixed(2)}
                      </td>
                      <td align="right">
                        <button
                          onClick={() => removeItem(idx)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#b91c1c",
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary + discounts + loyalty */}
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: 8,
              fontSize: 13,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>

            {/* Coupon / manual discount */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>Coupon / Discount</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  placeholder="Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{
                    width: 80,
                    padding: 4,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={couponAmount}
                  onChange={(e) => setCouponAmount(e.target.value)}
                  style={{
                    width: 80,
                    padding: 4,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                />
              </div>
            </div>

            {/* Loyalty info line in summary */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              <span>Loyalty discount</span>
              <span>
                {loyaltyDiscount > 0
                  ? `-${loyaltyDiscount.toFixed(2)} (${loyaltyDiscount} pts)`
                  : "0.00"}
              </span>
            </div>

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer & payment & loyalty redeem input */}
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>Customer (optional)</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 6,
              }}
            >
              <input
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={loadLoyalty}
                style={inputStyle}
              />
              <input
                placeholder="Email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onBlur={loadLoyalty}
                style={inputStyle}
              />
              <input
                placeholder="Address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Loyalty info / redeem */}
            <div
              style={{
                marginTop: 4,
                padding: 6,
                borderRadius: 4,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 12 }}>
                  Loyalty Points
                </span>
                {loyaltyLoading && (
                  <span style={{ fontSize: 11, color: "#6b7280" }}>
                    Checking…
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#4b5563",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Available:{" "}
                  {loyaltyAvailable != null ? loyaltyAvailable : "—"}
                </span>
                <span>
                  Lifetime:{" "}
                  {loyaltyLifetime != null ? loyaltyLifetime : "—"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 11 }}>Use points</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={loyaltyRedeemInput}
                  onChange={(e) => setLoyaltyRedeemInput(e.target.value)}
                  disabled={loyaltyAvailable === null || subtotal <= 0}
                  style={{
                    width: 80,
                    padding: 4,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                />
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  (1 pt = 1.00)
                </span>
              </div>

              {loyaltyError && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#b91c1c",
                  }}
                >
                  {loyaltyError}
                </div>
              )}
            </div>

            <div style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Payment method
              </div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          {/* Bottom actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {lastResult && (
                <div style={{ fontSize: 12, color: "#16a34a" }}>
                  Sale completed. Order #{lastResult.order_id} ·{" "}
                  {lastResult.total.toFixed(2)}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => holdSale("held")}
                disabled={submitting || cart.length === 0}
                style={{
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  color: "#111827",
                  cursor:
                    submitting || cart.length === 0 ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Hold Sale
              </button>

              <button
                onClick={() => holdSale("quote")}
                disabled={submitting || cart.length === 0}
                style={{
                  padding: "8px 12px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "#e0f2fe",
                  color: "#0f172a",
                  cursor:
                    submitting || cart.length === 0 ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Save Quote
              </button>

              <button
                onClick={submitSale}
                disabled={completeDisabled}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: completeDisabled ? "#9ca3af" : "#111827",
                  color: "white",
                  cursor: completeDisabled ? "default" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {submitting
                  ? "Processing..."
                  : !session
                  ? "Open session to sell"
                  : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 6,
  borderRadius: 4,
  border: "1px solid #d1d5db",
  fontSize: 12,
};
