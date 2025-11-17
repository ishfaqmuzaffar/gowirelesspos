import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import AppShell from "../layout/AppShell";

export default function Receipt() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await axios.get(`http://localhost:8080/api/receipt/${id}`);
      setData(res.data);
    })();
  }, [id]);

  if (!data) return <AppShell title="Receipt">Loading...</AppShell>;

  const { order, lines } = data;

  return (
    <AppShell title={`Receipt #${order.id}`}>
      <div style={{ background: "white", padding: 16, borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>
          {order.store_name} — Register: {order.register_name}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <div><b>Date:</b> {new Date(order.created_at).toLocaleString()}</div>
          <div><b>Payment:</b> {order.payment_method}</div>
          {order.coupon_code && (
            <div><b>Coupon:</b> {order.coupon_code}</div>
          )}
        </div>

        {order.customer_name && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16 }}>Customer</h3>
            <div><b>Name:</b> {order.customer_name}</div>
            <div><b>Phone:</b> {order.customer_phone || "—"}</div>
            <div><b>Email:</b> {order.customer_email || "—"}</div>
            <div><b>Address:</b> {order.customer_address || "—"}</div>
          </div>
        )}

        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Items</h3>
        <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Product</th>
              <th align="right">Qty</th>
              <th align="right">Price</th>
              <th align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l: any) => (
              <tr key={l.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td>{l.name}</td>
                <td align="right">{l.qty}</td>
                <td align="right">{Number(l.price).toFixed(2)}</td>
                <td align="right">{Number(l.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "right", marginTop: 16, fontSize: 16 }}>
          <div>Subtotal: ${order.subtotal.toFixed(2)}</div>
          <div>Discount: -${order.discount_total.toFixed(2)}</div>
          <div>Tax: ${order.tax_total.toFixed(2)}</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>
            Total: ${order.total.toFixed(2)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
