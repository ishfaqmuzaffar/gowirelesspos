import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type Store = { id: number; name: string };

type ProductRow = {
  id: string;
  sku: string;
  product: { name: string };
};

type TransferLineDraft = {
  variant_id: string;
  sku: string;
  name: string;
  qty: number;
};

export default function CreateTransfer() {
  const navigate = useNavigate();

  const [stores, setStores] = useState<Store[]>([]);
  const [fromStore, setFromStore] = useState<number | "">("");
  const [toStore, setToStore] = useState<number | "">("");
  const [transferId, setTransferId] = useState<number | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [items, setItems] = useState<TransferLineDraft[]>([]);
  const [savingLines, setSavingLines] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      const res = await axios.get<Store[]>("http://localhost:8080/api/stores");
      setStores(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateDraft() {
    if (!fromStore || !toStore) {
      setCreateError("Please select both From and To stores.");
      return;
    }
    if (fromStore === toStore) {
      setCreateError("From and To store cannot be the same.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await axios.post<{ ok: boolean; id: number }>(
        "http://localhost:8080/api/transfers",
        {
          from_store_id: Number(fromStore),
          to_store_id: Number(toStore),
        }
      );
      setTransferId(res.data.id);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create transfer.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  function handleAddItemToDraft(item: TransferLineDraft) {
    setItems((prev) => {
      const existing = prev.find((p) => p.variant_id === item.variant_id);
      if (existing) {
        return prev.map((p) =>
          p.variant_id === item.variant_id
            ? { ...p, qty: p.qty + item.qty }
            : p
        );
      }
      return [...prev, item];
    });
  }

  async function handleSendTransfer() {
    if (!transferId) {
      setSaveError("Create a draft transfer first.");
      return;
    }
    if (items.length === 0) {
      setSaveError("Add at least one item to the transfer.");
      return;
    }

    setSavingLines(true);
    setSaveError(null);

    try {
      // Save each line
      for (const it of items) {
        await axios.post(
          `http://localhost:8080/api/transfers/${transferId}/lines`,
          {
            variant_id: it.variant_id,
            qty: it.qty,
          }
        );
      }

      // Mark transfer as sent
      await axios.post(
        `http://localhost:8080/api/transfers/${transferId}/send`
      );

      navigate("/transfers");
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to save transfer lines.";
      setSaveError(msg);
    } finally {
      setSavingLines(false);
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            New Transfer
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Move stock from one store to another.
          </p>
        </div>
      </div>

      {/* Header card: select stores + create draft */}
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
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              From Store
            </label>
            <select
              value={fromStore}
              onChange={(e) =>
                setFromStore(
                  e.target.value ? Number(e.target.value) : ("" as any)
                )
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
              disabled={!!transferId}
            >
              <option value="">Select store…</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              To Store
            </label>
            <select
              value={toStore}
              onChange={(e) =>
                setToStore(
                  e.target.value ? Number(e.target.value) : ("" as any)
                )
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
              disabled={!!transferId}
            >
              <option value="">Select store…</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {createError && (
          <div
            style={{
              marginTop: 10,
              padding: 8,
              borderRadius: 4,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {createError}
          </div>
        )}

        {!transferId && (
          <button
            onClick={handleCreateDraft}
            disabled={creating}
            style={{
              marginTop: 14,
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: "#111827",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: creating ? "default" : "pointer",
              opacity: creating ? 0.8 : 1,
            }}
          >
            {creating ? "Creating…" : "Create Transfer Draft"}
          </button>
        )}

        {transferId && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#4b5563",
            }}
          >
            Draft created: <strong>Transfer #{transferId}</strong>
          </div>
        )}
      </div>

      {/* Items card */}
      <div
        style={{
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
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Items
          </h2>
          <button
            onClick={() => setShowAddItem(true)}
            disabled={!transferId}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "none",
              background: transferId ? "#111827" : "#9ca3af",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: transferId ? "pointer" : "default",
            }}
          >
            + Add item
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {transferId
              ? "No items yet. Click “Add item” to include products in this transfer."
              : "Create a transfer draft first, then you can add items."}
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  SKU
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  Product
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.variant_id}>
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
                    {it.name}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {it.qty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {saveError && (
          <div
            style={{
              marginTop: 10,
              padding: 8,
              borderRadius: 4,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {saveError}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            onClick={handleSendTransfer}
            disabled={!transferId || items.length === 0 || savingLines}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background:
                !transferId || items.length === 0 || savingLines
                  ? "#9ca3af"
                  : "#111827",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                !transferId || items.length === 0 || savingLines
                  ? "default"
                  : "pointer",
            }}
          >
            {savingLines ? "Sending…" : "Send Transfer"}
          </button>
        </div>
      </div>

      {showAddItem && transferId && (
        <AddItemModal
          onClose={() => setShowAddItem(false)}
          onAdd={(newItem) => {
            handleAddItemToDraft(newItem);
            setShowAddItem(false);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------
// Add Item Modal (same theme)
// ----------------------------

function AddItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: TransferLineDraft) => void;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get<ProductRow[]>(
          "http://localhost:8080/api/products"
        );
        setProducts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.sku.toLowerCase().includes(q) ||
      (p.product?.name || "").toLowerCase().includes(q)
    );
  });

  function handleClickProduct(p: ProductRow) {
    const qtyStr = window.prompt("Quantity to transfer?", "1");
    if (!qtyStr) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      alert("Quantity must be a positive number.");
      return;
    }
    onAdd({
      variant_id: p.id,
      sku: p.sku,
      name: p.product?.name || "Product",
      qty,
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 480,
          maxHeight: "80vh",
          background: "white",
          borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add item</div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <input
            placeholder="Search by SKU or product name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #d1d5db",
              fontSize: 13,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              maxHeight: "50vh",
              overflowY: "auto",
              borderRadius: 4,
              border: "1px solid #e5e7eb",
            }}
          >
            {loading ? (
              <div style={{ padding: 10, fontSize: 13 }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 10, fontSize: 13, color: "#6b7280" }}>
                No products match this search.
              </div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleClickProduct(p)}
                  style={{
                    padding: 8,
                    fontSize: 13,
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{p.sku}</div>
                  <div style={{ color: "#6b7280" }}>{p.product?.name}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            padding: 10,
            borderTop: "1px solid #e5e7eb",
            textAlign: "right",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
