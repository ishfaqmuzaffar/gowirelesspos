import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

type TransferRow = {
  id: number;
  from_store: string;
  to_store: string;
  created_by: string;
  status: string;
  created_at: string;
};

export default function TransfersList() {
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<TransferRow[]>(
        "http://localhost:8080/api/transfers"
      );
      setRows(res.data);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to load transfers.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function statusPill(status: string) {
    const lower = status.toLowerCase();
    let bg = "#e5e7eb";
    let color = "#374151";

    if (lower === "sent") {
      bg = "#dbeafe";
      color = "#1d4ed8";
    } else if (lower === "received") {
      bg = "#dcfce7";
      color = "#166534";
    } else if (lower === "cancelled") {
      bg = "#fee2e2";
      color = "#b91c1c";
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          background: bg,
          color,
          textTransform: "capitalize",
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      {/* Header row */}
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
            Transfers
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Store-to-store stock movements across your locations.
          </p>
        </div>
        <Link
          to="/transfers/new"
          style={{
            background: "#111827",
            padding: "8px 14px",
            color: "white",
            borderRadius: 6,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + New Transfer
        </Link>
      </div>

      {/* Card */}
      <div
        style={{
          padding: 16,
          borderRadius: 8,
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: 10,
              padding: 8,
              borderRadius: 4,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 14 }}>Loading transfers…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            No transfers yet. Click{" "}
            <span style={{ fontWeight: 600 }}>New Transfer</span> to start one.
          </div>
        ) : (
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
                    fontWeight: 500,
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  From
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  To
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  Created by
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 500,
                  }}
                >
                  Created at
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <Link
                      to={`/transfers/${t.id}`}
                      style={{ color: "#111827", textDecoration: "none" }}
                    >
                      #{t.id}
                    </Link>
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {t.from_store}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {t.to_store}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {statusPill(t.status)}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {t.created_by}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    {new Date(t.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
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
