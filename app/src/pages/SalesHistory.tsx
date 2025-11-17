import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type OrderRow = {
  id: number;
  store_id: number;
  created_at: string;
  total: number;
  status: string;
  source: string;
  customer_name?: string | null;
  payment_method?: string | null;
  refunded_total?: number | null;
  refund_status?: string | null;
};

type OrderLine = {
  id: number;
  name: string;
  sku?: string | null;
  attributes?: string | null;
  qty: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
  refunded_qty?: number;
  remaining_qty?: number;
};

type Payment = {
  id: number;
  method: string;
  amount: number;
  txn_ref?: string | null;
};

type OrderDetail = {
  id: number;
  store: {
    id: number;
    name: string | null;
    address: string | null;
  };
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
  payments: Payment[];
  refunded_total?: number | null;
  refund_status?: string | null;
};

export default function SalesHistoryPage() {
  const ctx = getPosContext();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("30");
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!ctx) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.store.id, days]);

  async function loadOrders() {
    if (!ctx) return;
    setLoading(true);
    try {
      const { data } = await axios.get<OrderRow[]>(
        "http://localhost:8080/api/orders",
        {
          params: {
            store_id: ctx.store.id,
            days: days || 30,
            q: search || undefined,
          },
        }
      );
      setOrders(data);
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert("Error loading orders. Check console.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrderDetail(id: number) {
    setLoadingDetail(true);
    try {
      const { data } = await axios.get<OrderDetail>(
        `http://localhost:8080/api/orders/${id}`
      );
      setSelected(data);
    } catch (err) {
      console.error(err);
      alert("Error loading order detail. Check console.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleClickRow(row: OrderRow) {
    loadOrderDetail(row.id);
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

  function printReceipt() {
    if (!selected) return;

    const o = selected;
    const win = window.open("", "_blank");
    if (!win) {
      alert("Popup blocked. Allow popups for this site to print.");
      return;
    }

    const linesHtml = o.lines
      .map(
        (l) => `
      <tr>
        <td style="padding:4px 0;">
          <div><strong>${escapeHtml(l.name)}</strong></div>
          <div style="font-size:11px;color:#4b5563;">
            ${l.sku || ""}${l.sku && l.attributes ? " · " : ""}${
          l.attributes || ""
        }
          </div>
        </td>
        <td style="text-align:right;padding-left:6px;">${l.qty}</td>
        <td style="text-align:right;padding-left:6px;">${l.price.toFixed(
          2
        )}</td>
        <td style="text-align:right;padding-left:6px;">${l.total.toFixed(
          2
        )}</td>
      </tr>
    `
      )
      .join("");

    const paymentsHtml = o.payments
      .map(
        (p) => `
      <tr>
        <td>${escapeHtml(p.method)}</td>
        <td style="text-align:right;">${p.amount.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt #${o.id}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 12px;
      color: #111827;
    }
    .receipt {
      max-width: 480px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 16px;
      margin: 0;
    }
    .muted {
      color: #6b7280;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    hr {
      border: none;
      border-top: 1px dashed #d1d5db;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${escapeHtml(o.store.name || "Store")}</h1>
      <div class="muted">${escapeHtml(o.store.address || "")}</div>
    </div>

    <div style="font-size: 12px; margin-bottom: 4px;">
      <div>Receipt #${o.id}</div>
      <div>${formatDateTime(o.created_at)}</div>
      <div>Cashier: ${escapeHtml(o.user.name || "")}</div>
      <div>Source: ${escapeHtml(o.source)}</div>
    </div>

    ${
      o.customer.name || o.customer.phone || o.customer.email
        ? `
      <hr />
      <div style="font-size:12px;margin-bottom:4px;">
        <strong>Customer</strong><br/>
        ${escapeHtml(o.customer.name || "")}<br/>
        ${escapeHtml(o.customer.phone || "")}<br/>
        ${escapeHtml(o.customer.email || "")}
      </div>
    `
        : ""
    }

    <hr />
    <table>
      <thead>
        <tr>
          <th align="left">Item</th>
          <th align="right">Qty</th>
          <th align="right">Price</th>
          <th align="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <hr />
    <table style="font-size:12px;">
      <tr>
        <td>Subtotal</td>
        <td style="text-align:right;">${o.totals.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Discount</td>
        <td style="text-align:right;">-${o.totals.discount_total.toFixed(
          2
        )}</td>
      </tr>
      <tr>
        <td>Tax</td>
        <td style="text-align:right;">${o.totals.tax_total.toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Total</strong></td>
        <td style="text-align:right;"><strong>${o.totals.total.toFixed(
          2
        )}</strong></td>
      </tr>
    </table>

    ${
      o.payments.length
        ? `
      <hr />
      <div style="font-size:12px;margin-bottom:2px;"><strong>Payments</strong></div>
      <table style="font-size:12px;">
        ${paymentsHtml}
      </table>
    `
        : ""
    }

    <hr />
    <div style="text-align:center;font-size:11px;margin-top:6px;">
      Thank you for shopping!
    </div>
  </div>
  <script>
    window.print();
  </script>
</body>
</html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  if (!ctx) {
    return (
      <AppShell title="Sales">
        <div style={{ fontSize: 14 }}>Select a store/register first.</div>
      </AppShell>
    );
  }

  const remainingRefundable =
    selected && selected.totals
      ? selected.totals.total - (selected.refunded_total ?? 0)
      : 0;
  const canRefund =
    !!selected && remainingRefundable > 0.0001 && selected.status !== "refunded";

  return (
    <AppShell title="Sales history">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1.4fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Left: orders list */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            maxHeight: "80vh",
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                Orders — {ctx.store.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Last {days} day(s)
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                }}
              >
                <option value="1">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <input
                placeholder="Search by customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadOrders()}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                  minWidth: 180,
                }}
              />
              <button
                onClick={loadOrders}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "white",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Loading orders…
            </div>
          ) : orders.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              No orders found for this period.
            </div>
          ) : (
            <table
              width="100%"
              cellPadding={6}
              style={{ borderCollapse: "collapse", fontSize: 12 }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th align="left">Order #</th>
                  <th align="left">Date</th>
                  <th align="left">Customer</th>
                  <th align="left">Pay</th>
                  <th align="right">Total</th>
                  <th align="right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => handleClickRow(o)}
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      cursor: "pointer",
                      background:
                        selected && selected.id === o.id
                          ? "#e5e7eb"
                          : "transparent",
                    }}
                  >
                    <td>#{o.id}</td>
                    <td>{formatDateTime(o.created_at)}</td>
                    <td>
                      {o.customer_name || (
                        <span style={{ color: "#9ca3af" }}>Walk-in</span>
                      )}
                    </td>
                    <td>{o.payment_method || "-"}</td>
                    <td align="right">{o.total.toFixed(2)}</td>
                    <td align="right">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: order detail */}
        <div
          style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            minHeight: 260,
          }}
        >
          {!selected ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {loading
                ? "Select an order from the left."
                : "Select an order from the left to view details."}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    Order #{selected.id}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {formatDateTime(selected.created_at)} ·{" "}
                    {selected.user?.name && `Cashier: ${selected.user.name}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Status: {selected.status} · Source: {selected.source}
                  </div>
                  {selected.refunded_total != null && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      Refunded: {(selected.refunded_total || 0).toFixed(2)} /{" "}
                      {selected.totals.total.toFixed(2)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={printReceipt}
                    disabled={loadingDetail}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 4,
                      border: "1px solid #d1d5db",
                      background: "white",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Print receipt
                  </button>
                  <button
                    onClick={() =>
                      selected && navigate(`/orders/${selected.id}/refund`)
                    }
                    disabled={!canRefund || loadingDetail}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 4,
                      border: "1px solid #10b981",
                      background: canRefund ? "#10b981" : "#e5e7eb",
                      color: canRefund ? "white" : "#6b7280",
                      fontSize: 12,
                      cursor: canRefund ? "pointer" : "not-allowed",
                    }}
                  >
                    {canRefund ? "Refund" : "Refunded"}
                  </button>
                </div>
              </div>

              {selected.customer &&
              (selected.customer.name ||
                selected.customer.phone ||
                selected.customer.email) ? (
                <div
                  style={{
                    fontSize: 12,
                    marginBottom: 8,
                    padding: 6,
                    borderRadius: 4,
                    background: "#f9fafb",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    Customer
                  </div>
                  <div>{selected.customer.name}</div>
                  <div>{selected.customer.phone}</div>
                  <div>{selected.customer.email}</div>
                </div>
              ) : null}

              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                Items
              </div>
              <div style={{ maxHeight: "35vh", overflowY: "auto" }}>
                <table
                  width="100%"
                  cellPadding={4}
                  style={{ borderCollapse: "collapse", fontSize: 12 }}
                >
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      <th align="left">Item</th>
                      <th align="right">Qty</th>
                      <th align="right">Refunded</th>
                      <th align="right">Price</th>
                      <th align="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr
                        key={l.id}
                        style={{ borderTop: "1px solid #e5e7eb" }}
                      >
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {l.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                            }}
                          >
                            {l.sku}
                            {l.sku && l.attributes ? " · " : ""}
                            {l.attributes}
                          </div>
                        </td>
                        <td align="right">{l.qty}</td>
                        <td align="right">{(l.refunded_qty ?? 0).toFixed(2)}</td>
                        <td align="right">{l.price.toFixed(2)}</td>
                        <td align="right">{l.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  marginTop: 6,
                  paddingTop: 6,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span>Subtotal</span>
                  <span>{selected.totals.subtotal.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span>Discount</span>
                  <span>-{selected.totals.discount_total.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span>Tax</span>
                  <span>{selected.totals.tax_total.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  <span>Total</span>
                  <span>{selected.totals.total.toFixed(2)}</span>
                </div>
              </div>

              {selected.payments.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    marginTop: 6,
                    paddingTop: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    Payments
                  </div>
                  {selected.payments.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {p.method}
                        {p.txn_ref ? ` (${p.txn_ref})` : ""}
                      </span>
                      <span>{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
