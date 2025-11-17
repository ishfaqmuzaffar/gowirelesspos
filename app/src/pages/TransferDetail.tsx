import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { getPosContext } from "../posContext";

type TransferHeader = {
  id: number;
  from_store_id: number;
  to_store_id: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type TransferLine = {
  id: number;
  sku: string;
  product: string;
  qty: number | string;
};

type Store = {
  id: number;
  name: string;
};

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = getPosContext();

  const [header, setHeader] = useState<TransferHeader | null>(null);
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // current user + roles
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    setActionMessage(null);
    try {
      const [transferRes, storesRes] = await Promise.all([
        axios.get(`http://localhost:8080/api/transfers/${id}`),
        axios.get("http://localhost:8080/api/stores"),
      ]);

      setHeader(transferRes.data.header);
      setLines(transferRes.data.lines || []);
      setStores(storesRes.data || []);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to load transfer.";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }

  const storeMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of stores) m.set(s.id, s.name);
    return m;
  }, [stores]);

  const fromStoreName = header
    ? storeMap.get(header.from_store_id) || `Store #${header.from_store_id}`
    : "";
  const toStoreName = header
    ? storeMap.get(header.to_store_id) || `Store #${header.to_store_id}`
    : "";

  function statusColors(status: string) {
    switch (status.toLowerCase()) {
      case "draft":
        return { bg: "#e5e7eb", text: "#374151" };
      case "sent":
        return { bg: "#dbeafe", text: "#1d4ed8" };
      case "received":
        return { bg: "#dcfce7", text: "#166534" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#b91c1c" };
      default:
        return { bg: "#e5e7eb", text: "#374151" };
    }
  }

  const isDestinationStore =
    header && ctx ? ctx.store.id === header.to_store_id : false;

  const canManageTransfer =
    !!currentUser &&
    isDestinationStore &&
    (hasRole("admin") || hasRole("manager") || hasRole("inventory"));

  async function handleReceive() {
    if (!header) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await axios.post(
        `http://localhost:8080/api/transfers/${header.id}/receive`
      );
      setActionMessage("Transfer received into this store.");
      await load();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to receive transfer.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!header) return;
    if (!window.confirm("Cancel this transfer? This cannot be undone.")) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await axios.post(
        `http://localhost:8080/api/transfers/${header.id}/cancel`
      );
      setActionMessage("Transfer cancelled.");
      await load();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to cancel transfer.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <div>Loading transfer…</div>;
  }

  if (loadError) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "40px auto",
          padding: 16,
          borderRadius: 8,
          background: "#fef2f2",
          color: "#b91c1c",
          fontSize: 14,
        }}
      >
        {loadError}
      </div>
    );
  }

  if (!header) {
    return <div>Transfer not found.</div>;
  }

  const colors = statusColors(header.status);
  const status = header.status.toLowerCase();
  const canReceive = canManageTransfer && status === "sent";
  const canCancel = canManageTransfer && (status === "draft" || status === "sent");
  const canPrint = canManageTransfer; // per your request: restricted to destination

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      {/* Top heading + back button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>
          Transfer #{header.id}
        </h1>
        <button
          onClick={() => navigate("/transfers")}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid #d1d5db",
            background: "white",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Back to transfers
        </button>
      </div>

      {/* Summary + actions card */}
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
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
              From
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              {fromStoreName}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginTop: 10,
                marginBottom: 4,
              }}
            >
              To
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{toStoreName}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: colors.bg,
                color: colors.text,
                textTransform: "capitalize",
                marginBottom: 8,
              }}
            >
              {header.status}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              <div>
                Created:{" "}
                {new Date(header.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              <div>
                Updated:{" "}
                {new Date(header.updated_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canManageTransfer && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px dashed #e5e7eb",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            {canReceive && (
              <button
                onClick={handleReceive}
                disabled={actionLoading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#111827",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: actionLoading ? "default" : "pointer",
                }}
              >
                {actionLoading ? "Working…" : "Receive transfer"}
              </button>
            )}

            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: actionLoading ? "default" : "pointer",
                }}
              >
                Cancel transfer
              </button>
            )}

            {canPrint && (
              <button
                onClick={handlePrint}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Print transfer
              </button>
            )}

            {!canReceive && !canCancel && !canPrint && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                No actions available for this transfer and store.
              </div>
            )}
          </div>
        )}

        {actionMessage && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#16a34a",
            }}
          >
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#b91c1c",
            }}
          >
            {actionError}
          </div>
        )}
      </div>

      {/* Items card (unchanged visual style) */}
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
          Items in transfer
        </h2>

        {lines.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            No items added to this transfer.
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
              {lines.map((l) => (
                <tr key={l.id}>
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
                    {l.product}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {typeof l.qty === "string" ? l.qty : l.qty.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
