import axios from "axios";
import { ReactNode, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getPosContext, clearPosContext } from "../posContext";

type Props = {
  children: ReactNode;
  title?: string;
};

export default function AppShell({ children, title }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("posUser") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  const ctx = getPosContext();

  // ---- ROLES (from posUser) ----
  const roles = useMemo(() => {
    const list: string[] = [];
    if (user?.role) list.push(user.role);
    if (Array.isArray(user?.roles)) list.push(...user.roles);
    const normalized = list.map((r) => String(r).toLowerCase());
    return Array.from(new Set(normalized));
  }, [user]);

  const hasRole = (name: string) => roles.includes(name.toLowerCase());
  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const isCashier = hasRole("cashier");

  const canSeeDashboard = isAdmin || isManager;
  const canSeeSell = isAdmin || isManager || isCashier;
  const canSeeSalesHistory = isAdmin || isManager || isCashier;
  const canSeeProducts = isAdmin || isManager;
  const canSeeInventory = isAdmin || isManager;
  const canSeeReceiving = isAdmin || isManager;
  const canSeeSuppliers = isAdmin || isManager;
  const canSeeTransfers = isAdmin || isManager;
  const canSeeCustomers = isAdmin || isManager || isCashier;
  const canSeeReports = isAdmin || isManager; // later
  const canSeeUsers = isAdmin; // admin only

  function logout() {
    localStorage.removeItem("posUser");
    localStorage.removeItem("authToken");
    clearPosContext();
    delete axios.defaults.headers.common["Authorization"];
    navigate("/login");
  }

  const menu = [
    { path: "/", label: "Dashboard", show: canSeeDashboard },
    { path: "/sell", label: "Sell", show: canSeeSell },
    { path: "/sales", label: "Sales History", show: canSeeSalesHistory },
    { path: "/products", label: "Products", show: canSeeProducts },
    { path: "/inventory", label: "Inventory", show: canSeeInventory },
    { path: "/transfers", label: "Transfers", show: canSeeTransfers },
    { path: "/receiving", label: "Receiving", show: canSeeReceiving },
    { path: "/suppliers", label: "Suppliers", show: canSeeSuppliers },
    { path: "/customers", label: "Customers", show: canSeeCustomers },
    { path: "/users", label: "Users", show: canSeeUsers },
    { path: "/reports", label: "Reports", show: canSeeReports },
  ];

  const currentPath = location.pathname;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "#111827",
          color: "white",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          GoWireless POS
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {menu
            .filter((item) => item.show)
            .map((item) => {
              // Smarter active detection:
              // - Generic: path or any nested route ("/products" or "/products/123")
              // - Special case: Sales module should stay active on /sales, /orders/:id, /orders/:id/refund, /refunds/:id
              let active = false;

              if (item.path === "/sales") {
                active =
                  currentPath === "/sales" ||
                  currentPath.startsWith("/sales/") ||
                  currentPath.startsWith("/orders/") ||
                  currentPath.startsWith("/refunds/");
              } else if (item.path === "/") {
                active = currentPath === "/";
              } else {
                active =
                  currentPath === item.path ||
                  currentPath.startsWith(item.path + "/");
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    textDecoration: "none",
                    color: "white",
                    background: active ? "#1f2937" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div style={{ marginTop: "auto", fontSize: 11, opacity: 0.8 }}>
          {ctx ? (
            <>
              Store: <strong>{ctx.store.name}</strong>
              <br />
              Register: <strong>{ctx.register.name}</strong>
            </>
          ) : (
            <>Store/Register not selected</>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          style={{
            height: 56,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            background: "white",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {title || "GoWireless POS"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {ctx && (
              <button
                onClick={() => navigate("/select-register")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "white",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Switch Store/Register
              </button>
            )}
            <div style={{ fontSize: 14 }}>
              {user ? (
                <>
                  {user.name}{" "}
                  {roles.length > 0 && (
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      ({roles.join(", ")})
                    </span>
                  )}
                </>
              ) : (
                "Guest"
              )}
            </div>
            {user && (
              <button
                onClick={logout}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={{ padding: 16, background: "#f3f4f6", flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
