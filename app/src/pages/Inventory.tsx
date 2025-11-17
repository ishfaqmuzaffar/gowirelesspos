import { useEffect, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type StockRow = {
  id: number;
  store_id: number;
  variant_id: string;
  sku: string;
  barcode?: string | null;
  product: string;
  qty_on_hand: number;
  reorder_point: number;
  reorder_qty: number;
  attributes?: Record<string, string>;
  image_url?: string | null;
};

export default function InventoryPage() {
  const ctx = getPosContext();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!ctx) return;
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.store.id]);

  async function loadStock() {
    if (!ctx) return;
    setLoading(true);
    try {
      const { data } = await axios.get<StockRow[]>(
        "http://localhost:8080/api/stock",
        { params: { store_id: ctx.store.id } }
      );
      setRows(data);
    } catch (err) {
      console.error(err);
      alert("Error loading inventory. Check console.");
    } finally {
      setLoading(false);
    }
  }

  function formatAttributes(attrs?: Record<string, string>) {
    if (!attrs) return "";
    const parts: string[] = [];
    if (attrs.storage) parts.push(attrs.storage);
    if (attrs.color) parts.push(attrs.color);
    if (attrs.size) parts.push(attrs.size);
    return parts.join(" / ");
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.sku.toLowerCase().includes(s) ||
      r.product.toLowerCase().includes(s) ||
      (formatAttributes(r.attributes).toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <AppShell title="Inventory">
      {!ctx ? (
        <div style={{ fontSize: 14 }}>Select a store/register first.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                Inventory — {ctx.store.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Showing on-hand stock for this store.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="Search by SKU, product, attributes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                  minWidth: 260,
                }}
              />
              <button
                onClick={loadStock}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              maxHeight: "75vh",
              overflow: "auto",
            }}
          >
            {loading ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Loading inventory…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                No inventory records found for this store.
              </div>
            ) : (
              <table
                width="100%"
                cellPadding={6}
                style={{ borderCollapse: "collapse", fontSize: 12 }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th align="left">Product</th>
                    <th align="left">SKU</th>
                    <th align="left">Attributes</th>
                    <th align="right">On Hand</th>
                    <th align="right">Reorder Pt</th>
                    <th align="right">Reorder Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        verticalAlign: "middle",
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          {r.image_url && (
                            <img
                              src={r.image_url}
                              alt={r.product}
                              style={{
                                width: 32,
                                height: 32,
                                objectFit: "cover",
                                borderRadius: 4,
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              {r.product}
                            </div>
                            {r.barcode && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                }}
                              >
                                Barcode: {r.barcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{r.sku}</td>
                      <td>{formatAttributes(r.attributes)}</td>
                      <td align="right">{r.qty_on_hand.toFixed(3)}</td>
                      <td align="right">{r.reorder_point.toFixed(3)}</td>
                      <td align="right">{r.reorder_qty.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
