import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type RefundLine = {
  id: number;
  product_id: string;
  variant_id?: string | null;
  qty: number;
  price: number;
  total: number;
  product?: {
    name: string;
    sku?: string | null;
  };
  variant?: {
    name: string;
  };
};

type RefundPayment = {
  id: number;
  method: string;
  amount: number;
};

type Refund = {
  id: number;
  order_id: number;
  total_amount: number;
  return_to_inventory: boolean;
  notes?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
  store?: {
    id: number;
    name: string | null;
  };
  order?: {
    id: number;
    order_number?: string;
  };
  lines: RefundLine[];
  payments: RefundPayment[];
};

export default function RefundDetailPage() {
  const { refundId } = useParams<{ refundId: string }>();
  const navigate = useNavigate();
  const ctx = getPosContext();

  const [refund, setRefund] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!refundId) return;

    const fetchRefund = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(
          `http://localhost:8080/api/refunds/${refundId}`
        );
        const data: Refund = res.data.data || res.data;

        setRefund(data);
      } catch (err: any) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Failed to load refund details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRefund();
  }, [refundId]);

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
      <AppShell title="Refund">
        <div style={{ fontSize: 14 }}>Select a store/register first.</div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Refund">
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
          Loading refund…
        </div>
      </AppShell>
    );
  }

  if (error || !refund) {
    return (
      <AppShell title="Refund">
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
          {error || "Refund not found."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Refund">
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header */}
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
              Refund R-{refund.id}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {formatDateTime(refund.created_at)} ·{" "}
              {refund.user?.name && `Processed by: ${refund.user.name}`}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Order:{" "}
              {refund.order ? (
                <Link
                  to={`/orders/${refund.order.id}`}
                  style={{ color: "#2563eb", textDecoration: "none" }}
                >
                  {refund.order.order_number || `#${refund.order.id}`}
                </Link>
              ) : (
                `#${refund.order_id}`
              )}{" "}
              · Store: {refund.store?.name || "-"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Inventory:{" "}
              {refund.return_to_inventory
                ? "Returned to inventory"
                : "No stock return"}
            </div>
            {refund.notes && (
              <div
                style={{
                  fontSize: 12,
                  color: "#374151",
                  marginTop: 4,
                }}
              >
                Notes: {refund.notes}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(`/orders/${refund.order?.id || refund.order_id}`)
            }
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Back to order
          </button>
        </div>

        {/* Items */}
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
            Items
          </div>
          {refund.lines.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              No items on this refund.
            </div>
          ) : (
            <div style={{ maxHeight: "40vh", overflowY: "auto" }}>
              <table
                width="100%"
                cellPadding={4}
                style={{ borderCollapse: "collapse", fontSize: 12 }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th align="left">Item</th>
                    <th align="right">Qty</th>
                    <th align="right">Price</th>
                    <th align="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {refund.lines.map((ln) => (
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
                          {ln.product?.name || ln.product_id}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          {ln.product?.sku}
                          {ln.product?.sku && ln.variant?.name ? " · " : ""}
                          {ln.variant?.name}
                        </div>
                      </td>
                      <td align="right">{ln.qty}</td>
                      <td align="right">{Number(ln.price).toFixed(2)}</td>
                      <td align="right">{Number(ln.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments */}
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
            Payments
          </div>
          {refund.payments.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              No payments recorded.
            </div>
          ) : (
            <table
              width="100%"
              cellPadding={4}
              style={{ borderCollapse: "collapse", fontSize: 12 }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th align="left">Method</th>
                  <th align="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {refund.payments.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderTop: "1px solid #e5e7eb" }}
                  >
                    <td>{p.method}</td>
                    <td align="right">
                      {Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              marginTop: 6,
              paddingTop: 6,
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 600 }}>Total refunded</span>
            <span style={{ fontWeight: 600 }}>
              {Number(refund.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
