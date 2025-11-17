import React, { useEffect, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";

type Variant = {
  id: string;
  sku: string;
  barcode?: string | null;
  price: number;
  cost: number;
  active: boolean;
  attributes?: Record<string, string>;
};

type Product = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  track_serial: boolean;
  active: boolean;
  main_image_path?: string | null;
  main_image_url?: string | null;
  variants: Variant[];
};

type NewVariantForm = {
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  storage: string;
  color: string;
  size: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showEditVariantModal, setShowEditVariantModal] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTrackSerial, setNewTrackSerial] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newVariants, setNewVariants] = useState<NewVariantForm[]>([
    { sku: "", barcode: "", price: "", cost: "", storage: "", color: "", size: "" },
  ]);

  // Edit product form
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTrackSerial, setEditTrackSerial] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  // New variant form (for existing product)
  const [variantSku, setVariantSku] = useState("");
  const [variantBarcode, setVariantBarcode] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantCost, setVariantCost] = useState("");
  const [variantStorage, setVariantStorage] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");

  // Edit variant form
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [editVarSku, setEditVarSku] = useState("");
  const [editVarBarcode, setEditVarBarcode] = useState("");
  const [editVarPrice, setEditVarPrice] = useState("");
  const [editVarCost, setEditVarCost] = useState("");
  const [editVarStorage, setEditVarStorage] = useState("");
  const [editVarColor, setEditVarColor] = useState("");
  const [editVarSize, setEditVarSize] = useState("");
  const [editVarActive, setEditVarActive] = useState(true);

  async function loadProducts(q?: string) {
    setLoading(true);
    try {
      const { data } = await axios.get<Product[]>(
        "http://localhost:8080/api/admin/products",
        q ? { params: { q } } : undefined
      );
      // Normalize variant prices/costs to numbers
      const normalized = data.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({
          ...v,
          price: Number((v as any).price),
          cost: Number((v as any).cost),
        })),
      }));
      setProducts(normalized);
      if (!selected && normalized.length > 0) {
        setSelected(normalized[0]);
      } else if (selected) {
        const updated = normalized.find((p) => p.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading products. Check console.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onClickAddProduct() {
    setNewName("");
    setNewCategory("");
    setNewDescription("");
    setNewTrackSerial(false);
    setNewImageFile(null);
    setNewVariants([
      { sku: "", barcode: "", price: "", cost: "", storage: "", color: "", size: "" },
    ]);
    setShowNewModal(true);
  }

  function onClickEditProduct() {
    if (!selected) return;
    setEditName(selected.name);
    setEditCategory(selected.category || "");
    setEditDescription(selected.description || "");
    setEditTrackSerial(selected.track_serial);
    setEditActive(selected.active);
    setEditImageFile(null);
    setShowEditModal(true);
  }

  function onClickAddVariant() {
    if (!selected) return;
    setVariantSku("");
    setVariantBarcode("");
    setVariantPrice("");
    setVariantCost("");
    setVariantStorage("");
    setVariantColor("");
    setVariantSize("");
    setShowVariantModal(true);
  }

  function onClickEditVariant(v: Variant) {
    setEditingVariant(v);
    setEditVarSku(v.sku);
    setEditVarBarcode(v.barcode || "");
    setEditVarPrice(String(v.price ?? ""));
    setEditVarCost(String(v.cost ?? ""));
    const attrs = v.attributes || {};
    setEditVarStorage(attrs.storage || "");
    setEditVarColor(attrs.color || "");
    setEditVarSize(attrs.size || "");
    setEditVarActive(v.active);
    setShowEditVariantModal(true);
  }

  async function onClickDeactivateVariant(v: Variant) {
    if (!window.confirm(`Deactivate variant ${v.sku}? It will no longer be sold.`)) {
      return;
    }
    try {
      await axios.delete(`http://localhost:8080/api/admin/variants/${v.id}`);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("Error deactivating variant. Check console.");
    }
  }

  function addNewVariantRow() {
    setNewVariants((prev) => [
      ...prev,
      { sku: "", barcode: "", price: "", cost: "", storage: "", color: "", size: "" },
    ]);
  }

  function updateNewVariantRow(
    index: number,
    field: keyof NewVariantForm,
    value: string
  ) {
    setNewVariants((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeNewVariantRow(index: number) {
    setNewVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Product name is required.");
      return;
    }
    if (newVariants.length === 0) {
      alert("At least one variant is required.");
      return;
    }

    const variantsPayload = newVariants
      .filter((v) => v.sku.trim() !== "")
      .map((v) => ({
        sku: v.sku.trim(),
        barcode: v.barcode.trim() || null,
        price: parseFloat(v.price || "0") || 0,
        cost: parseFloat(v.cost || "0") || 0,
        attributes: {
          storage: v.storage.trim() || undefined,
          color: v.color.trim() || undefined,
          size: v.size.trim() || undefined,
        },
      }));

    if (variantsPayload.length === 0) {
      alert("At least one variant with SKU is required.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", newName);
      formData.append("category", newCategory);
      formData.append("description", newDescription);
      formData.append("track_serial", newTrackSerial ? "1" : "0");
      formData.append("variants", JSON.stringify(variantsPayload));
      if (newImageFile) {
        formData.append("image", newImageFile);
      }

      await axios.post("http://localhost:8080/api/admin/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowNewModal(false);
      await loadProducts();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        "Error creating product. Check console.";
      alert(msg);
    }
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!editName.trim()) {
      alert("Product name is required.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("category", editCategory);
      formData.append("description", editDescription);
      formData.append("track_serial", editTrackSerial ? "1" : "0");
      formData.append("active", editActive ? "1" : "0");
      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      await axios.post(
        `http://localhost:8080/api/admin/products/${selected.id}?_method=PUT`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setShowEditModal(false);
      await loadProducts();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        "Error updating product. Check console.";
      alert(msg);
    }
  }

  async function handleCreateVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!variantSku.trim()) {
      alert("Variant SKU is required.");
      return;
    }

    try {
      const payload = {
        sku: variantSku.trim(),
        barcode: variantBarcode.trim() || null,
        price: parseFloat(variantPrice || "0") || 0,
        cost: parseFloat(variantCost || "0") || 0,
        attributes: {
          storage: variantStorage.trim() || undefined,
          color: variantColor.trim() || undefined,
          size: variantSize.trim() || undefined,
        },
      };

      await axios.post(
        `http://localhost:8080/api/admin/products/${selected.id}/variants`,
        payload
      );

      setShowVariantModal(false);
      await loadProducts();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        "Error adding variant. Check console.";
      alert(msg);
    }
  }

  async function handleUpdateVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVariant) return;
    if (!editVarSku.trim()) {
      alert("SKU is required.");
      return;
    }

    try {
      const payload = {
        sku: editVarSku.trim(),
        barcode: editVarBarcode.trim() || null,
        price: parseFloat(editVarPrice || "0") || 0,
        cost: parseFloat(editVarCost || "0") || 0,
        active: editVarActive ? "1" : "0",
        attributes: {
          storage: editVarStorage.trim() || undefined,
          color: editVarColor.trim() || undefined,
          size: editVarSize.trim() || undefined,
        },
      };

      await axios.put(
        `http://localhost:8080/api/admin/variants/${editingVariant.id}`,
        payload
      );

      setShowEditVariantModal(false);
      setEditingVariant(null);
      await loadProducts();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        "Error updating variant. Check console.";
      alert(msg);
    }
  }

  function formatVariantAttributes(v: Variant) {
    const attrs = v.attributes || {};
    const parts: string[] = [];
    if (attrs.storage) parts.push(attrs.storage);
    if (attrs.color) parts.push(attrs.color);
    if (attrs.size) parts.push(attrs.size);
    return parts.length ? parts.join(" / ") : "";
  }

  return (
    <AppShell title="Products">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Products</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadProducts(search)}
              style={{
                padding: 6,
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: 13,
                minWidth: 220,
              }}
            />
            <button
              onClick={() => loadProducts(search)}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Search
            </button>
            <button
              onClick={onClickAddProduct}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "none",
                background: "#111827",
                color: "white",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              + Add Product
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 2fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Left: product list */}
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
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 6,
              }}
            >
              {loading
                ? "Loading products..."
                : `${products.length} product(s)`}
            </div>

            <div
              style={{
                overflowY: "auto",
                borderTop: "1px solid #e5e7eb",
                marginTop: 4,
                paddingTop: 4,
              }}
            >
              {loading ? (
                <div style={{ fontSize: 13, color: "#6b7280" }}>Loading…</div>
              ) : products.length === 0 ? (
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  No products yet. Click “Add Product” to create one.
                </div>
              ) : (
                products.map((p) => {
                  const active = selected?.id === p.id;
                  const variantCount = p.variants.length;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelected(p)}
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        marginBottom: 5,
                        cursor: "pointer",
                        background: active ? "#e5e7eb" : "transparent",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      {p.main_image_url && (
                        <img
                          src={p.main_image_url}
                          alt={p.name}
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: "cover",
                            borderRadius: 4,
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {p.name}
                          {!p.active && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 4px",
                                borderRadius: 4,
                                background: "#fee2e2",
                                color: "#b91c1c",
                              }}
                            >
                              inactive
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#4b5563" }}>
                          {p.category && <span>{p.category}</span>}
                          {p.category && variantCount > 0 && <span> · </span>}
                          {variantCount > 0 && (
                            <span>{variantCount} variant(s)</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          Track serial: {p.track_serial ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: product detail */}
          <div
            style={{
              background: "white",
              padding: 16,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              minHeight: 320,
            }}
          >
            {!selected ? (
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                Select a product from the left to view details.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 12 }}>
                    {selected.main_image_url && (
                      <img
                        src={selected.main_image_url}
                        alt={selected.name}
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>
                        {selected.name}
                      </div>
                      <div style={{ fontSize: 13, color: "#4b5563" }}>
                        {selected.category && (
                          <span>Category: {selected.category}</span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}
                      >
                        Track serial: {selected.track_serial ? "Yes" : "No"} ·{" "}
                        Status: {selected.active ? "Active" : "Inactive"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={onClickAddVariant}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        background: "white",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      + Add Variant
                    </button>
                    <button
                      onClick={onClickEditProduct}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        background: "white",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Edit Product
                    </button>
                  </div>
                </div>

                {selected.description && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#4b5563",
                      marginBottom: 12,
                    }}
                  >
                    {selected.description}
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Variants
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                      }}
                    >
                      {selected.variants.length} variant(s)
                    </div>
                  </div>

                  {selected.variants.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      No variants yet. Use “Add Variant”.
                    </div>
                  ) : (
                    <table
                      width="100%"
                      cellPadding={6}
                      style={{ borderCollapse: "collapse", fontSize: 12 }}
                    >
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          <th align="left">SKU</th>
                          <th align="left">Attributes</th>
                          <th align="left">Barcode</th>
                          <th align="right">Price</th>
                          <th align="right">Cost</th>
                          <th align="right">Status</th>
                          <th align="right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.variants.map((v) => (
                          <tr
                            key={v.id}
                            style={{ borderTop: "1px solid #e5e7eb" }}
                          >
                            <td>{v.sku}</td>
                            <td>{formatVariantAttributes(v)}</td>
                            <td>{v.barcode || "-"}</td>
                            <td align="right">{v.price.toFixed(2)}</td>
                            <td align="right">{v.cost.toFixed(2)}</td>
                            <td align="right">
                              {v.active ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "2px 4px",
                                    borderRadius: 4,
                                    background: "#dcfce7",
                                    color: "#166534",
                                  }}
                                >
                                  active
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "2px 4px",
                                    borderRadius: 4,
                                    background: "#fee2e2",
                                    color: "#b91c1c",
                                  }}
                                >
                                  inactive
                                </span>
                              )}
                            </td>
                            <td align="right">
                              <button
                                onClick={() => onClickEditVariant(v)}
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  border: "1px solid #d1d5db",
                                  background: "white",
                                  fontSize: 11,
                                  cursor: "pointer",
                                  marginRight: 4,
                                }}
                              >
                                Edit
                              </button>
                              {v.active && (
                                <button
                                  onClick={() => onClickDeactivateVariant(v)}
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    fontSize: 11,
                                    cursor: "pointer",
                                    color: "#b91c1c",
                                  }}
                                >
                                  Deactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Product Modal */}
      {showNewModal && (
        <Modal onClose={() => setShowNewModal(false)} title="Add Product">
          <form onSubmit={handleCreateProduct}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  Category
                </label>
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ ...inputStyle, minHeight: 60 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={newTrackSerial}
                  onChange={(e) => setNewTrackSerial(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>Track serial numbers</span>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewImageFile(e.target.files?.[0] || null)
                  }
                  style={{ fontSize: 12, marginTop: 4 }}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Variants
                  </span>
                  <button
                    type="button"
                    onClick={addNewVariantRow}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid #d1d5db",
                      background: "white",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    + Add row
                  </button>
                </div>

                {newVariants.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      padding: 6,
                      marginBottom: 6,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Variant #{i + 1}</span>
                      {newVariants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeNewVariantRow(i)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#b91c1c",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>SKU</label>
                        <input
                          value={row.sku}
                          onChange={(e) =>
                            updateNewVariantRow(i, "sku", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Barcode</label>
                        <input
                          value={row.barcode}
                          onChange={(e) =>
                            updateNewVariantRow(i, "barcode", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.price}
                          onChange={(e) =>
                            updateNewVariantRow(i, "price", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Cost</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.cost}
                          onChange={(e) =>
                            updateNewVariantRow(i, "cost", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 6,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Storage</label>
                        <input
                          value={row.storage}
                          onChange={(e) =>
                            updateNewVariantRow(i, "storage", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Color</label>
                        <input
                          value={row.color}
                          onChange={(e) =>
                            updateNewVariantRow(i, "color", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Size</label>
                        <input
                          value={row.size}
                          onChange={(e) =>
                            updateNewVariantRow(i, "size", e.target.value)
                          }
                          style={inputStyleSmall}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={primaryButtonStyle}>
                  Save Product
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selected && (
        <Modal onClose={() => setShowEditModal(false)} title="Edit Product">
          <form onSubmit={handleUpdateProduct}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ ...inputStyle, minHeight: 60 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={editTrackSerial}
                  onChange={(e) => setEditTrackSerial(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>Track serial numbers</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>Product is active</span>
              </div>
              <div>
                <label style={labelStyle}>Replace Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditImageFile(e.target.files?.[0] || null)
                  }
                  style={{ fontSize: 12, marginTop: 4 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={primaryButtonStyle}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Variant Modal */}
      {showVariantModal && selected && (
        <Modal onClose={() => setShowVariantModal(false)} title="Add Variant">
          <form onSubmit={handleCreateVariant}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={labelStyle}>SKU</label>
                <input
                  value={variantSku}
                  onChange={(e) => setVariantSku(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Barcode</label>
                <input
                  value={variantBarcode}
                  onChange={(e) => setVariantBarcode(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label style={labelStyle}>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variantCost}
                    onChange={(e) => setVariantCost(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                <div>
                  <label style={labelStyle}>Storage</label>
                  <input
                    value={variantStorage}
                    onChange={(e) => setVariantStorage(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Color</label>
                  <input
                    value={variantColor}
                    onChange={(e) => setVariantColor(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Size</label>
                  <input
                    value={variantSize}
                    onChange={(e) => setVariantSize(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={primaryButtonStyle}>
                  Save Variant
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Variant Modal */}
      {showEditVariantModal && editingVariant && (
        <Modal onClose={() => setShowEditVariantModal(false)} title="Edit Variant">
          <form onSubmit={handleUpdateVariant}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={labelStyle}>SKU</label>
                <input
                  value={editVarSku}
                  onChange={(e) => setEditVarSku(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Barcode</label>
                <input
                  value={editVarBarcode}
                  onChange={(e) => setEditVarBarcode(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <label style={labelStyle}>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editVarPrice}
                    onChange={(e) => setEditVarPrice(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editVarCost}
                    onChange={(e) => setEditVarCost(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                <div>
                  <label style={labelStyle}>Storage</label>
                  <input
                    value={editVarStorage}
                    onChange={(e) => setEditVarStorage(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Color</label>
                  <input
                    value={editVarColor}
                    onChange={(e) => setEditVarColor(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Size</label>
                  <input
                    value={editVarSize}
                    onChange={(e) => setEditVarSize(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={editVarActive}
                  onChange={(e) => setEditVarActive(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>Variant is active</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditVariantModal(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={primaryButtonStyle}>
                  Save Variant
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}

function Modal(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 16,
          minWidth: 480,
          maxWidth: 720,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
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
          <div style={{ fontSize: 16, fontWeight: 600 }}>{props.title}</div>
          <button
            onClick={props.onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div>{props.children}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 6,
  borderRadius: 4,
  border: "1px solid #d1d5db",
  fontSize: 13,
  marginTop: 2,
};

const inputStyleSmall: React.CSSProperties = {
  width: "100%",
  padding: 4,
  borderRadius: 4,
  border: "1px solid #d1d5db",
  fontSize: 12,
  marginTop: 2,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 4,
  border: "none",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  background: "white",
  cursor: "pointer",
  fontSize: 13,
};
