import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import AppShell from "../layout/AppShell";

type Supplier = {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  active: boolean;
  created_at?: string;
};

type SupplierStats = {
  po_count: number;
  last_po_date?: string | null;
};

type SupplierPoRow = {
  id: number;
  status: string;
  external_ref?: string | null;
  store_name?: string | null;
  created_at: string;
};

type SupplierItemRow = {
  sku: string;
  product: string;
  total_qty: number;
};

type ActivityResponse = {
  supplier: Supplier;
  stats: SupplierStats;
  purchase_orders: SupplierPoRow[];
  items_received: SupplierItemRow[];
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await axios.get<ActivityResponse>(
          `http://localhost:8080/api/suppliers/${id}/activity`
        );
        setData(data);
      } catch (err: any) {
        console.error(err);
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to load supplier activity.";
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const supplier = data?.supplier;
  const stats = data?.stats;
  const pos = data?.purchase_orders ?? [];
  const items = data?.items_received ?? [];

  return (
    <AppShell title={supplier ? `Supplier: ${supplier.name}` : "Supplier"}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <button
          onClick={() => navigate("/suppliers")}
          style={{
            marginBottom: 12,
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid #d1d5db",
            background: "white",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Back to suppliers
        </button>

        {loading && (
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              fontSize: 14,
            }}
          >
            Loading supplier…
          </div>
        )}

        {!loading && loadError && (
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: "#fef2f2",
              color: "#b91c1c",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              fontSize: 14,
            }}
          >
            {loadError}
          </div>
        )}

        {!loading && !loadError && supplier && (
          <>
            {/* Header / basic info */}
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                borderRadius: 8,
                background: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 24,
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {supplier.name}
                  </h1>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {supplier.contact_name && (
                      <div>
                        Contact: <strong>{supplier.contact_name}</strong>
                      </div>
                    )}
                    {supplier.phone && <div>Phone: {supplier.phone}</div>}
                    {supplier.email && <div>Email: {supplier.email}</div>}
                    {supplier.city && <div>City: {supplier.city}</div>}
                    {supplier.address && <div>Address: {supplier.address}</div>}
                  </div>
                  {supplier.notes && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#4b5563",
                      }}
                    >
                      Notes: {supplier.notes}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 12,
                    color: supplier.active ? "#15803d" : "#b91c1c",
                  }}
                >
                  Status:{" "}
                  <strong>{supplier.active ? "Active" : "Inactive"}</strong>
                  {supplier.created_at && (
                    <div style={{ marginTop: 4, color: "#6b7280" }}>
                      Added:{" "}
                      {new Date(supplier.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.04,
                  }}
                >
                  Purchase Orders
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {stats?.po_count ?? 0}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.04,
                  }}
                >
                  Last PO Date
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {stats?.last_po_date
                    ? new Date(stats.last_po_date).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.04,
                  }}
                >
                  SKUs Received
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {items.length}
                </div>
              </div>
            </div>

            {/* Layout: POs + Items */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
                gap: 16,
              }}
            >
              {/* POs list */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Purchase Orders
                </h2>
                {pos.length === 0 && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No purchase orders yet for this supplier.
                  </div>
                )}
                {pos.length > 0 && (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          PO #
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Store
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          External Ref
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pos.map((po) => (
                        <tr key={po.id}>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {po.id}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {po.store_name || "-"}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {po.external_ref || "—"}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {po.status}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {new Date(po.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Items received */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Items Received
                </h2>
                {items.length === 0 && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No receiving moves yet for this supplier.
                  </div>
                )}
                {items.length > 0 && (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          SKU
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Product
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Qty Received
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.sku}>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {it.sku}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {it.product}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            {it.total_qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
