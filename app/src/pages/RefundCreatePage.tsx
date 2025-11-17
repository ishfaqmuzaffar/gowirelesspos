import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type OrderLine = {
  id: number;
  name: string;
  sku?: string | null;
  attributes?: string | null;
  qty: number;
  price: number;
  total: number;
};

type OrderDetail = {
  id: number;
  created_at: string;
  status: string;
  source: string;
  totals: {
    subtotal: number;
    discount_total: number;
    tax_total: number;
    total: number;
  };
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  user: {
    name: string | null;
  };
  lines: OrderLine[];
  refunded_total?: number | null;
  refund_status?: string | null;
};

type RefundLineInput = {
  line_id: number;
  qty: number;
  price: number;
};

export default function RefundCreatePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const ctx = getPosContext();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [lines, setLines] = useState<(OrderLine & { qtyToRefund: number })[]>(
    []
  );
  const [returnToInventory, setReturnToInventory] = useState(true);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await axios.get<OrderDetail>(
          `http://localhost:8080/api/orders/${orderId}`
        );
        const o = data;

        setOrder(o);
        setLines(
          (o.lines || []).map((ln) => ({
            ...ln,
            qtyToRefund: 0,
          }))
        );
      } catch (err: any) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Failed to load order. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  function handleQtyChange(index: number, value: string) {
    const qty = Math.max(0, Number(value) || 0);
    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? {
              ...ln,
              qtyToRefund: qty > ln.qty ? ln.qty : qty,
            }
          : ln
      )
    );
  }

  const refundTotal = lines.reduce((sum, ln) => {
    return sum + ln.qtyToRefund * Number(ln.price);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !orderId) return;

    setSubmitting(true);
    setError(null);
    setValidationErrors([]);

    const selectedLines: RefundLineInput[] = lines
      .filter((ln) => ln.qtyToRefund > 0)
      .map((ln) => ({
        line_id: ln.id,
        qty: ln.qtyToRefund,
        price: Number(ln.price),
      }));

    if (selectedLines.length === 0) {
      setError("Please select at least one item to refund.");
      setSubmitting(false);
      return;
    }

    if (refundTotal <= 0) {
      setError("Refund total must be greater than zero.");
      setSubmitting(false);
      return;
    }

    const payload = {
      lines: selectedLines,
      return_to_inventory: returnToInventory,
      notes: notes || null,
      payments: [
        {
          method: paymentMethod,
          amount: refundTotal,
        },
      ],
    };

    try {
      await axios.post(
        `http://localhost:8080/api/orders/${orderId}/refunds`,
        payload
      );
      // ✅ After successful refund, go back to Sales History
      navigate("/sales");
    } catch (err: any) {
      console.error(err);

      const apiMessage = err.response?.data?.message;
      const apiErrors = err.response?.data?.errors;

      if (apiErrors && typeof apiErrors === "object") {
        const flat: string[] = [];
        Object.values(apiErrors).forEach((val: any) => {
          if (Array.isArray(val)) {
            val.forEach((msg) => flat.push(String(msg)));
          } else {
            flat.push(String(val));
          }
        });
        setValidationErrors(flat);
      }

      setError(
        apiMessage || "Failed to create refund. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateTime(value: string) {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }

  if (!ctx) {
    return (
      <AppShell title="Refund order">
        <div style={{ fontSize: 14 }}>Select a store/register first.</div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Refund order">
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          Loading order…
        </div>
      </AppShell>
    );
  }

  if (error && !order) {
    return (
      <AppShell title="Refund order">
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            fontSize: 13,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell title="Refund order">
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          Order not found.
        </div>
      </AppShell>
    );
  }

  const refundedTotal = order.refunded_total ?? 0;
  const remainingRefundable = order.totals.total - refundedTotal;

  return (
    <AppShell title="Refund order">
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header / summary */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Refund Order #{order.id}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {formatDateTime(order.created_at)} ·{" "}
              {order.user?.name && `Cashier: ${order.user.name}`} · Source:{" "}
              {order.source}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Original total: {order.totals.total.toFixed(2)} · Already
              refunded: {refundedTotal.toFixed(2)} · Remaining refundable:{" "}
              {remainingRefundable.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>

        {/* Errors */}
        {(error || validationErrors.length > 0) && (
          <div
            style={{
              background: "#fef2f2",
              borderRadius: 8,
              padding: 10,
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error && <div>{error}</div>}
            {validationErrors.length > 0 && (
              <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                {validationErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Items selection */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Select items to refund
          </div>
          <div style={{ maxHeight: "40vh", overflowY: "auto" }}>
            <table
              width="100%"
              cellPadding={4}
              style={{ borderCollapse: "collapse", fontSize: 12 }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th align="left">Item</th>
                  <th align="right">Sold Qty</th>
                  <th align="right">Price</th>
                  <th align="right">Qty to refund</th>
                  <th align="right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((ln, index) => {
                  const lineTotal = ln.qtyToRefund * Number(ln.price);
                  return (
                    <tr
                      key={ln.id}
                      style={{ borderTop: "1px solid #e5e7eb" }}
                    >
                      <td>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {ln.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          {ln.sku}
                          {ln.sku && ln.attributes ? " · " : ""}
                          {ln.attributes}
                        </div>
                      </td>
                      <td align="right">{ln.qty}</td>
                      <td align="right">{ln.price.toFixed(2)}</td>
                      <td align="right">
                        <input
                          type="number"
                          min={0}
                          max={ln.qty}
                          value={ln.qtyToRefund}
                          onChange={(e) =>
                            handleQtyChange(index, e.target.value)
                          }
                          style={{
                            width: 70,
                            padding: "3px 6px",
                            borderRadius: 4,
                            border: "1px solid #d1d5db",
                            fontSize: 12,
                            textAlign: "right",
                          }}
                        />
                      </td>
                      <td align="right">{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refund options + payment */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Options
            </div>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div style={{ marginBottom: 4 }}>Return to inventory?</div>
              <label style={{ marginRight: 12 }}>
                <input
                  type="radio"
                  checked={returnToInventory}
                  onChange={() => setReturnToInventory(true)}
                  style={{ marginRight: 4 }}
                />
                Yes, return items to inventory
              </label>
              <label>
                <input
                  type="radio"
                  checked={!returnToInventory}
                  onChange={() => setReturnToInventory(false)}
                  style={{ marginRight: 4 }}
                />
                No, refund only (no stock return)
              </label>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ marginBottom: 4 }}>Notes (optional)</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Reason for refund, etc."
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Payment
            </div>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <div style={{ marginBottom: 4 }}>Method</div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="store_credit">Store credit</option>
              </select>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ marginBottom: 4 }}>Refund total</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {refundTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                Remaining refundable on order:{" "}
                {remainingRefundable.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || refundTotal <= 0}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              border: "1px solid #10b981",
              background: refundTotal > 0 ? "#10b981" : "#6b7280",
              color: "white",
              fontSize: 12,
              cursor: refundTotal > 0 ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Processing…" : "Confirm refund"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
