import React, { useEffect, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";
import { getPosContext } from "../posContext";

type Store = { id: number; name: string };
type Register = { id: number; name: string; store_id: number };

export default function ReportsPage() {
  const ctx = getPosContext();

  const [stores, setStores] = useState<Store[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);

  const [dateFrom, setDateFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [storeId, setStoreId] = useState<string>("");
  const [registerId, setRegisterId] = useState<string>("");

  const [groupBy, setGroupBy] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    const { data } = await axios.get("http://localhost:8080/api/stores");
    setStores(data);
  }

  async function loadRegisters(sid: string) {
    if (!sid) {
      setRegisters([]);
      return;
    }
    const { data } = await axios.get(
      "http://localhost:8080/api/registers?store_id=" + sid
    );
    setRegisters(data);
  }

  function handleStoreChange(e: any) {
    const sid = e.target.value;
    setStoreId(sid);
    setRegisterId("");
    loadRegisters(sid);
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params: any = {
        date_from: dateFrom,
        date_to: dateTo,
      };
      if (storeId) params.store_id = storeId;
      if (registerId) params.register_id = registerId;
      if (groupBy) params.group = groupBy;

      const { data } = await axios.get(
        "http://localhost:8080/api/reports/sales",
        { params }
      );
      setResult(data);
    } catch (err) {
      alert("Error fetching report.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    const params: any = {
      date_from: dateFrom,
      date_to: dateTo,
    };
    if (storeId) params.store_id = storeId;
    if (registerId) params.register_id = registerId;
    if (groupBy) params.group = groupBy;

    const query = new URLSearchParams(params).toString();

    window.open(
      "http://localhost:8080/api/reports/sales/export?" + query,
      "_blank"
    );
  }

  // ---------- Render
  return (
    <AppShell title="Reports">
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          Sales Reports
        </div>

        {/* Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <label style={label}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Store</label>
            <select value={storeId} onChange={handleStoreChange} style={input}>
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Register</label>
            <select
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              style={input}
              disabled={registers.length === 0}
            >
              <option value="">All Registers</option>
              {registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              style={input}
            >
              <option value="">None</option>
              <option value="store">Store</option>
              <option value="register">Register</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchReport} style={btnPrimary} disabled={loading}>
            {loading ? "Loading..." : "Generate Report"}
          </button>

          <button onClick={downloadCSV} style={btn}>
            Download CSV
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
            Summary
          </h3>

          <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            <SummaryBox
              label="Orders"
              value={result.summary.orders_count}
            />
            <SummaryBox
              label="Gross Sales"
              value={result.summary.gross_sales.toFixed(2)}
            />
            <SummaryBox
              label="Refunds"
              value={result.summary.refunds_total.toFixed(2)}
            />
            <SummaryBox
              label="Net Sales"
              value={result.summary.net_sales.toFixed(2)}
            />
          </div>

          {/* Table */}
          {result.group && renderTable(result)}
        </div>
      )}
    </AppShell>
  );
}

function SummaryBox({ label, value }: any) {
  return (
    <div
      style={{
        background: "#f9fafb",
        padding: 12,
        borderRadius: 6,
        flex: 1,
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function renderTable(result: any) {
  const rows = result.rows;

  if (result.group === "store") {
    return (
      <Table
        headers={[
          "Store",
          "Orders",
          "Gross",
          "Refunds",
          "Net",
        ]}
        rows={rows.map((r: any) => [
          r.store_name,
          r.orders_count,
          r.gross_sales.toFixed(2),
          r.refunds_total.toFixed(2),
          r.net_sales.toFixed(2),
        ])}
      />
    );
  }

  if (result.group === "register") {
    return (
      <Table
        headers={[
          "Register",
          "Store",
          "Orders",
          "Gross",
          "Refunds",
          "Net",
        ]}
        rows={rows.map((r: any) => [
          r.register_name,
          r.store_name,
          r.orders_count,
          r.gross_sales.toFixed(2),
          r.refunds_total.toFixed(2),
          r.net_sales.toFixed(2),
        ])}
      />
    );
  }

  if (result.group === "product") {
    return (
      <Table
        headers={["SKU", "Product", "Units", "Gross"]}
        rows={rows.map((r: any) => [
          r.sku,
          r.product_name,
          r.units,
          r.gross_sales.toFixed(2),
        ])}
      />
    );
  }

  return null;
}

function Table({ headers, rows }: any) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
      }}
    >
      <thead>
        <tr style={{ background: "#f3f4f6" }}>
          {headers.map((h: string) => (
            <th
              key={h}
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any, i: number) => (
          <tr key={i}>
            {r.map((cell: any, j: number) => (
              <td
                key={j}
                style={{
                  padding: 8,
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Styles
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  marginBottom: 4,
  color: "#4b5563",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 8,
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 13,
  background: "white",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px",
  background: "#111827",
  color: "white",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const btn: React.CSSProperties = {
  padding: "8px 14px",
  background: "#f3f4f6",
  color: "#111827",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  cursor: "pointer",
  fontWeight: 600,
};
