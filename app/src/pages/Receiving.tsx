import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type Supplier = {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
};

type ProductOption = {
  id: string; // variant_id (UUID)
  sku: string;
  name: string;
};

type ReceiveLine = {
  variant_id: string;
  sku: string;
  name: string;
  qty: number;
};

export default function ReceivingPage() {
  const ctx = getPosContext();

  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("posUser") : null;
  const currentUser:
    | { id: number; name: string; email: string; role?: string; roles?: string[] }
    | null = userRaw ? JSON.parse(userRaw) : null;

  const roles = useMemo(() => {
    const list: string[] = [];
    if (currentUser?.role) list.push(currentUser.role);
    if (Array.isArray(currentUser?.roles)) list.push(...currentUser.roles);
    return Array.from(new Set(list.map((r) => String(r).toLowerCase())));
  }, [currentUser]);

  const hasRole = (name: string) => roles.includes(name.toLowerCase());
  const canUseReceiving =
    hasRole("admin") || hasRole("manager") || hasRole("inventory");

  // ---- Suppliers ----
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [poExternalRef, setPoExternalRef] = useState("");

  // ---- Products for receiving lines ----
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);

  // ---- PO & receiving ----
  const [currentPoId, setCurrentPoId] = useState<number | null>(null);
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>([]);
  const [poStatusMessage, setPoStatusMessage] = useState<string | null>(null);
  const [poErrorMessage, setPoErrorMessage] = useState<string | null>(null);
  const [receivingStatus, setReceivingStatus] = useState<string | null>(null);
  const [receivingError, setReceivingError] = useState<string | null>(null);

  // -------- Guard: permissions & context --------
  if (!currentUser || !canUseReceiving) {
    return (
      <AppShell title="Receiving / Purchase Orders">
        <div
          style={{
            maxWidth: 600,
            margin: "40px auto",
            padding: 24,
            borderRadius: 8,
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            fontSize: 14,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Receiving / Purchase Orders
          </h2>
          <div style={{ color: "#b91c1c" }}>
            You do not have permission to use this screen. Only admins,
            managers, and inventory users can create POs and receive stock.
          </div>
        </div>
      </AppShell>
    );
  }

  if (!ctx) {
    return (
      <AppShell title="Receiving / Purchase Orders">
        <div
          style={{
            maxWidth: 600,
            margin: "40px auto",
            padding: 24,
            borderRadius: 8,
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            fontSize: 14,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Receiving / Purchase Orders
          </h2>
          <div style={{ color: "#b91c1c" }}>
            Please select a store and register first.
          </div>
        </div>
      </AppShell>
    );
  }

  const storeId = ctx.store.id;

  // ---- Load suppliers ----
  useEffect(() => {
    async function loadSuppliers() {
      setSuppliersLoading(true);
      setSuppliersError(null);
      try {
        const { data } = await axios.get<Supplier[]>(
          "http://localhost:8080/api/suppliers"
        );
        setSuppliers(data);
        if (data.length > 0 && selectedSupplierId === null) {
          setSelectedSupplierId(data[0].id);
        }
      } catch (err: any) {
        console.error(err);
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to load suppliers.";
        setSuppliersError(msg);
      } finally {
        setSuppliersLoading(false);
      }
    }
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load products for receiving (variants) ----
  useEffect(() => {
    async function loadProducts() {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const { data } = await axios.get<any[]>(
          "http://localhost:8080/api/admin/products"
        );
        const opts: ProductOption[] = [];
        for (const row of data) {
          const baseName = row.name || row.product_name || "Product";
          if (Array.isArray(row.variants)) {
            for (const v of row.variants) {
              opts.push({
                id: v.id,
                sku: v.sku,
                name: baseName,
              });
            }
          } else if (row.variant_id && row.variant_sku) {
            opts.push({
              id: row.variant_id,
              sku: row.variant_sku,
              name: baseName,
            });
          }
        }
        setProductOptions(opts);
        if (opts.length > 0 && !selectedVariantId) {
          setSelectedVariantId(opts[0].id);
        }
      } catch (err: any) {
        console.error(err);
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to load products.";
        setProductsError(msg);
      } finally {
        setProductsLoading(false);
      }
    }
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Add line to current receiving list ----
  function handleAddLine(e: FormEvent) {
    e.preventDefault();
    setReceivingError(null);
    setReceivingStatus(null);

    if (!selectedVariantId) {
      setReceivingError("Please select a product/variant.");
      return;
    }
    if (selectedQty <= 0) {
      setReceivingError("Qty must be greater than zero.");
      return;
    }

    const product = productOptions.find((p) => p.id === selectedVariantId);
    if (!product) {
      setReceivingError("Selected product not found.");
      return;
    }

    setReceiveLines((prev) => {
      const existing = prev.find((l) => l.variant_id === selectedVariantId);
      if (existing) {
        return prev.map((l) =>
          l.variant_id === selectedVariantId
            ? { ...l, qty: l.qty + selectedQty }
            : l
        );
      }
      return [
        ...prev,
        {
          variant_id: selectedVariantId,
          sku: product.sku,
          name: product.name,
          qty: selectedQty,
        },
      ];
    });

    setSelectedQty(1);
  }

  // ---- Create PO (with supplier) ----
  async function handleCreatePo(e: FormEvent) {
    e.preventDefault();
    setPoStatusMessage(null);
    setPoErrorMessage(null);

    if (!storeId) {
      setPoErrorMessage("Store not selected.");
      return;
    }

    if (!selectedSupplierId) {
      setPoErrorMessage("Please select a supplier.");
      return;
    }

    if (receiveLines.length === 0) {
      setPoErrorMessage("Add at least one line for the PO (product + qty).");
      return;
    }

    try {
      const payload = {
        store_id: storeId,
        supplier_id: selectedSupplierId,
        external_ref: poExternalRef || null,
        // We send items with variantId, the backend normalizes to lines[].variant_id
        items: receiveLines.map((l) => ({
          variantId: l.variant_id,
          qty: l.qty,
          cost: 0, // you can extend UI later to capture cost per line
        })),
      };

      const { data } = await axios.post<{
        ok: boolean;
        id: number;
        po_id?: number;
      }>("http://localhost:8080/api/receiving/po", payload);

      const poId = data.po_id ?? data.id;
      setCurrentPoId(poId);
      setPoStatusMessage(`PO #${poId} created successfully.`);
      setPoErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create purchase order.";
      setPoErrorMessage(msg);
    }
  }

  // ---- Receive stock for current PO ----
  async function handleReceive(e: FormEvent) {
    e.preventDefault();
    setReceivingStatus(null);
    setReceivingError(null);

    if (!storeId) {
      setReceivingError("Store not selected.");
      return;
    }
    if (!currentPoId) {
      setReceivingError("Create a PO first before receiving.");
      return;
    }
    if (receiveLines.length === 0) {
      setReceivingError("Add at least one line to receive.");
      return;
    }

    try {
      const payload = {
        store_id: storeId,
        po_id: currentPoId,
        note: "Received via POS UI",
        items: receiveLines.map((l) => ({
          variantId: l.variant_id,
          qty: l.qty,
        })),
      };

      await axios.post("http://localhost:8080/api/receiving/receive", payload);

      setReceivingStatus(
        `Received ${receiveLines.length} line(s) into store ${ctx.store.name}.`
      );
      setReceiveLines([]);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to receive stock.";
      setReceivingError(msg);
    }
  }

  return (
    <AppShell title="Receiving / Purchase Orders">
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Receiving / Purchase Orders
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Create POs with suppliers and receive stock into{" "}
          <strong>{ctx.store.name}</strong>.
        </p>

        {/* Top grid: supplier + product selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.4fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Supplier & PO info */}
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
                marginBottom: 10,
              }}
            >
              Supplier & PO Info
            </h2>

            {suppliersError && (
              <div
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 4,
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: 12,
                }}
              >
                {suppliersError}
              </div>
            )}

            <form
              onSubmit={handleCreatePo}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
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
                  Supplier
                </label>
                <select
                  value={selectedSupplierId ?? ""}
                  onChange={(e) =>
                    setSelectedSupplierId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={suppliersLoading}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                  }}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` — ${s.city}` : ""}
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
                  PO Reference (optional)
                </label>
                <input
                  type="text"
                  value={poExternalRef}
                  onChange={(e) => setPoExternalRef(e.target.value)}
                  placeholder="Vendor PO#, invoice ref, etc."
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 6,
                  alignSelf: "flex-start",
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: "#111827",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create PO (header only)
              </button>

              {poStatusMessage && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#15803d",
                    marginTop: 4,
                  }}
                >
                  {poStatusMessage}
                </div>
              )}
              {poErrorMessage && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#b91c1c",
                    marginTop: 4,
                  }}
                >
                  {poErrorMessage}
                </div>
              )}

              {currentPoId && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#4b5563",
                  }}
                >
                  Current PO: <strong>#{currentPoId}</strong>
                </div>
              )}
            </form>
          </div>

          {/* Product selection & lines */}
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
                marginBottom: 10,
              }}
            >
              Add Items to Receive
            </h2>

            {productsError && (
              <div
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 4,
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: 12,
                }}
              >
                {productsError}
              </div>
            )}

            <form
              onSubmit={handleAddLine}
              style={{
                display: "grid",
                gridTemplateColumns: "2.2fr 0.8fr auto",
                gap: 8,
                alignItems: "flex-end",
                marginBottom: 12,
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
                  Product / Variant
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={productsLoading}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                  }}
                >
                  {productsLoading && (
                    <option value="">Loading products…</option>
                  )}
                  {!productsLoading && productOptions.length === 0 && (
                    <option value="">No products found</option>
                  )}
                  {!productsLoading &&
                    productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
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
                  Qty
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={selectedQty}
                  onChange={(e) =>
                    setSelectedQty(parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#111827",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add line
              </button>
            </form>

            {receiveLines.length === 0 && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                No lines added yet. Select a product and quantity, then click{" "}
                <strong>Add line</strong>.
              </div>
            )}

            {receiveLines.length > 0 && (
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
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receiveLines.map((l) => (
                    <tr key={l.variant_id}>
                      <td
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        {l.sku}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        {l.name}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        {l.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom: Receive stock */}
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
            Receive into Inventory
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            This will increase stock in <strong>{ctx.store.name}</strong> and
            attach the receiving to the selected PO.
          </p>

          <form onSubmit={handleReceive}>
            <button
              type="submit"
              disabled={!currentPoId || receiveLines.length === 0}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                background:
                  !currentPoId || receiveLines.length === 0
                    ? "#9ca3af"
                    : "#111827",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  !currentPoId || receiveLines.length === 0
                    ? "default"
                    : "pointer",
              }}
            >
              Receive into store
            </button>

            {receivingStatus && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#15803d",
                }}
              >
                {receivingStatus}
              </div>
            )}
            {receivingError && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#b91c1c",
                }}
              >
                {receivingError}
              </div>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
