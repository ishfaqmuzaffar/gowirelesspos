import { useEffect, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type SalesDay = {
  day: string;
  total: number;
  orders: number;
};

type BestSeller = {
  sku: string;
  product: string;
  units: number;
  revenue: number;
};

type LatestCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  last_order_at?: string | null;
  orders_count: number;
  total_spent: number;
};

type DashboardSummary = {
  summary: {
    today: { total: number; orders: number };
    week: { total: number; orders: number };
  };
  sales_by_day: SalesDay[];
  best_sellers: BestSeller[];
  latest_customers: LatestCustomer[];
};

const COLORS = ["#0ea5e9", "#22c55e", "#6366f1", "#f97316", "#ec4899"];

function formatCurrency(value: number) {
  return value.toFixed(2);
}

function formatDateTime(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<DashboardSummary>(
          "http://localhost:8080/api/dashboard/summary"
        );
        setData(data);
      } catch (err) {
        console.error(err);
        alert("Error loading dashboard summary. Check console.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <p>Loading dashboard...</p>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Dashboard">
        <p>Failed to load dashboard data.</p>
      </AppShell>
    );
  }

  const { summary, sales_by_day, best_sellers, latest_customers } = data;

  return (
    <AppShell title="Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top summary cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <SummaryCard
            label="Today's Sales"
            value={formatCurrency(summary.today.total)}
            sub={`${summary.today.orders} order(s)`}
          />
          <SummaryCard
            label="Last 7 Days Sales"
            value={formatCurrency(summary.week.total)}
            sub={`${summary.week.orders} order(s)`}
          />
          <SummaryCard
            label="Average per Day (7d)"
            value={
              summary.week.total > 0
                ? formatCurrency(summary.week.total / 7)
                : "0.00"
            }
            sub="Total ÷ 7 days"
          />
        </div>

        {/* Middle: sales chart + best sellers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1.2fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          {/* Sales by day */}
          <div
            style={{
              background: "white",
              padding: 16,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              minHeight: 260,
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
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>
                Sales (Last 7 Days)
              </h2>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                Includes POS completed orders
              </span>
            </div>
            {sales_by_day.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                No sales in the last 7 days.
              </p>
            ) : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={sales_by_day}>
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar dataKey="total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Best sellers + pie chart */}
          <div
            style={{
              background: "white",
              padding: 16,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              minHeight: 260,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>
                Best Sellers (Last 30 Days)
              </h2>
            </div>

            {best_sellers.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                No sales yet. Complete some orders first.
              </p>
            ) : (
              <>
                <div style={{ width: "100%", height: 160 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={best_sellers}
                        dataKey="revenue"
                        nameKey="sku"
                        outerRadius={60}
                        labelLine={false}
                        label={(entry) =>
                          `${entry.sku} (${formatCurrency(entry.revenue)})`
                        }
                      >
                        {best_sellers.map((entry, index) => (
                          <Cell
                            key={entry.sku}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any, entry: any) =>
                          [
                            formatCurrency(Number(value)),
                            `${entry.payload.product} (${entry.payload.sku})`,
                          ]
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ fontSize: 12 }}>
                  {best_sellers.map((b, i) => (
                    <div
                      key={b.sku}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            marginRight: 6,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                        <strong>{b.product}</strong>{" "}
                        <span style={{ color: "#6b7280" }}>({b.sku})</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div>{b.units.toFixed(2)} units</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {formatCurrency(b.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Latest customers */}
        <div
          style={{
            background: "white",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>
              Latest Customers
            </h2>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              Most recent by last purchase
            </span>
          </div>

          {latest_customers.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No customers with purchases yet.
            </p>
          ) : (
            <table
              width="100%"
              cellPadding={6}
              style={{ borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th align="left">Name</th>
                  <th align="left">Contact</th>
                  <th align="left">Last Order</th>
                  <th align="right">Orders</th>
                  <th align="right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {latest_customers.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderTop: "1px solid #e5e7eb" }}
                  >
                    <td>{c.name || "(No name)"}</td>
                    <td>
                      {c.phone && <span>{c.phone}</span>}
                      {c.phone && c.email && <span> · </span>}
                      {c.email && (
                        <a href={`mailto:${c.email}`}>{c.email}</a>
                      )}
                    </td>
                    <td>{formatDateTime(c.last_order_at)}</td>
                    <td align="right">{c.orders_count}</td>
                    <td align="right">
                      {formatCurrency(c.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  sub?: string;
};

function SummaryCard({ label, value, sub }: SummaryCardProps) {
  return (
    <div
      style={{
        background: "white",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
