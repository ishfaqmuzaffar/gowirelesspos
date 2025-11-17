import { useEffect, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";

type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  last_order_at?: string | null;
  orders_count: number;
  total_spent: number;
};

type OrderLine = {
  id: number;
  name: string;
  qty: number;
  total: number;
};

type PaymentSummary = {
  method: string;
  amount: number;
};

type CustomerOrder = {
  id: number;
  created_at: string;
  total: number;
  coupon_code?: string | null;
  store_name?: string | null;
  register_name?: string | null;
  payment?: PaymentSummary | null;
  lines: OrderLine[];
};

type CustomerOrdersResponse = {
  customer: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  orders: CustomerOrder[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  async function loadCustomers(q: string = "") {
    setLoadingList(true);
    const { data } = await axios.get<Customer[]>(
      "http://localhost:8080/api/customers",
      { params: q ? { q } : {} }
    );
    setCustomers(data);
    setLoadingList(false);
    if (!selectedCustomer && data.length) {
      // auto select first
      selectCustomer(data[0]);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setOrders([]);
    setLoadingOrders(true);
    try {
      const { data } = await axios.get<CustomerOrdersResponse>(
        `http://localhost:8080/api/customers/${c.id}/orders`
      );
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
      alert("Error loading customer orders. Check console.");
    } finally {
      setLoadingOrders(false);
    }
  }

  function formatDate(dt: string | null | undefined) {
    if (!dt) return "-";
    // simple formatting, backend returns ISO-ish string
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString();
  }

  return (
    <AppShell title="Customers">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 2fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Left: customer list */}
        <div
          style={{
            background: "white",
            padding: 12,
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Customers
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="Search name, phone, email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadCustomers(search)}
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              />
              <button
                onClick={() => loadCustomers(search)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "white",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
            {loadingList
              ? "Loading customers..."
              : `${customers.length} customer(s)`}
          </div>

          <div
            style={{
              overflowY: "auto",
              borderTop: "1px solid #e5e7eb",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            {loadingList ? (
              <div style={{ fontSize: 13, color: "#6b7280", paddingTop: 8 }}>
                Loading…
              </div>
            ) : customers.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280", paddingTop: 8 }}>
                No customers found. Capture some sales with customer info first.
              </div>
            ) : (
              customers.map((c) => {
                const active = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      marginBottom: 4,
                      cursor: "pointer",
                      background: active ? "#e5e7eb" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {c.name || "(No name)"}
                    </div>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      {c.phone && <span>{c.phone}</span>}
                      {c.phone && c.email && <span> · </span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      Orders: {c.orders_count} · Total:{" "}
                      {c.total_spent.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      Last: {formatDate(c.last_order_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: customer detail & orders */}
        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            minHeight: 300,
          }}
        >
          {!selectedCustomer ? (
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              Select a customer on the left to view their history.
            </div>
          ) : (
            <>
              {/* Customer summary */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedCustomer.name || "(No name)"}
                </div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  {selectedCustomer.phone && (
                    <span>Phone: {selectedCustomer.phone}</span>
                  )}
                  {selectedCustomer.email && (
                    <span>
                      {" "}
                      · Email:{" "}
                      <a href={`mailto:${selectedCustomer.email}`}>
                        {selectedCustomer.email}
                      </a>
                    </span>
                  )}
                </div>
                {selectedCustomer.address && (
                  <div style={{ fontSize: 13, color: "#4b5563" }}>
                    Address: {selectedCustomer.address}
                  </div>
                )}
              </div>

              {/* Orders */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Orders</span>
                  <span style={{ color: "#6b7280" }}>
                    {loadingOrders
                      ? "Loading..."
                      : `${orders.length} order(s)`}
                  </span>
                </div>

                {loadingOrders ? (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Loading orders…
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No orders found for this customer.
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: 6,
                    }}
                  >
                    {orders.map((o) => (
                      <div
                        key={o.id}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          marginBottom: 8,
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
                          <div>
                            <div>
                              <strong>Order #{o.id}</strong>{" "}
                              <span style={{ color: "#6b7280", fontSize: 12 }}>
                                {formatDate(o.created_at)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {o.store_name && <span>{o.store_name}</span>}
                              {o.store_name && o.register_name && (
                                <span> · </span>
                              )}
                              {o.register_name && (
                                <span>Register: {o.register_name}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 600 }}>
                              {o.total.toFixed(2)}
                            </div>
                            {o.payment && (
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                Paid by {o.payment.method}
                              </div>
                            )}
                            {o.coupon_code && (
                              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                Coupon: {o.coupon_code}
                              </div>
                            )}
                          </div>
                        </div>

                        {o.lines.length > 0 && (
                          <table
                            width="100%"
                            cellPadding={4}
                            style={{
                              borderCollapse: "collapse",
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            <thead>
                              <tr style={{ background: "#f9fafb" }}>
                                <th align="left">Item</th>
                                <th align="right">Qty</th>
                                <th align="right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines.map((line) => (
                                <tr key={line.id}>
                                  <td>{line.name}</td>
                                  <td align="right">{line.qty}</td>
                                  <td align="right">
                                    {line.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
