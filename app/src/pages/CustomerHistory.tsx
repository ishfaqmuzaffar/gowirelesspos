import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import AppShell from "../layout/AppShell";

type Order = {
  id: number;
  created_at: string;
  total: number;
  payment_method: string;
  coupon_code?: string | null;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
};

export default function CustomerHistory() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await axios.get(`http://localhost:8080/api/customers/${id}`);
      setCustomer(data.customer);
      setOrders(data.orders);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <AppShell title="Customer History">Loading...</AppShell>;
  if (!customer) return <AppShell title="Customer History">Customer not found</AppShell>;

  return (
    <AppShell title="Customer History">
      <div style={{ background: "white", padding: 16, borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>{customer.name}</h2>
        <div style={{ marginBottom: 16, fontSize: 14 }}>
          <div><b>Phone:</b> {customer.phone || "—"}</div>
          <div><b>Email:</b> {customer.email || "—"}</div>
          <div><b>Address:</b> {customer.address || "—"}</div>
        </div>

        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Purchase History</h3>

        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Order #</th>
              <th align="left">Date</th>
              <th align="right">Total</th>
              <th align="left">Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td>{o.id}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td align="right">${o.total.toFixed(2)}</td>
                <td>{o.payment_method}</td>
                <td>
                  <Link
                    to={`/receipt/${o.id}`}
                    style={{ color: "#2563eb", textDecoration: "underline" }}
                  >
                    View Receipt
                  </Link>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={5} style={{ paddingTop: 12 }}>
                  No orders for this customer yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
