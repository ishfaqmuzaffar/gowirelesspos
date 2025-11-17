import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
};

const ROLE_OPTIONS = ["admin", "manager", "cashier"] as const;

export default function UsersPage() {
  // read current logged-in user from localStorage
  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("posUser") : null;
  const currentUser: { id: number; name: string; email: string; role: string } | null =
    userRaw ? JSON.parse(userRaw) : null;

  const role = currentUser?.role ?? "";

  const isAdmin = useMemo(() => {
    return String(role).toLowerCase() === "admin";
  }, [role]);

  // If not admin, just show "no permission" inside AppShell
  if (!currentUser || !isAdmin) {
    return (
      <AppShell title="Users">
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
            Users
          </h2>
          <div style={{ color: "#b91c1c" }}>
            You do not have permission to view this page. Only admins can manage
            users.
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Admin-only logic below ----

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "manager" | "cashier">(
    "cashier"
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await axios.get<UserRow[]>(
        "http://localhost:8080/api/admin/users"
      );
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to load users.";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setCreateError("Name, email and password are required.");
      return;
    }

    setCreating(true);
    try {
      const { data } = await axios.post("http://localhost:8080/api/admin/users", {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role: newRole,
      });

      // refresh list
      await loadUsers();

      setCreateSuccess(`User "${data.user.name}" created successfully.`);
      setName("");
      setEmail("");
      setPassword("");
      setNewRole("cashier");
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create user.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Users">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
          User Management
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          Create and manage POS users. Only admins can access this page. For
          now you can create new users with an email, password, and role
          (admin/manager/cashier).
        </p>

        {/* Create user card */}
        <div
          style={{
            marginBottom: 24,
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
            Create New User
          </h2>
          <form
            onSubmit={handleCreate}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "flex-end",
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
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              />
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              />
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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              />
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
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as "admin" | "manager" | "cashier")
                }
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                  background: "white",
                }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: creating ? "#9ca3af" : "#111827",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Creating..." : "Create user"}
              </button>
              {createError && (
                <span style={{ fontSize: 12, color: "#b91c1c" }}>
                  {createError}
                </span>
              )}
              {createSuccess && (
                <span style={{ fontSize: 12, color: "#15803d" }}>
                  {createSuccess}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Users table */}
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
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Existing Users</h2>
            {loading && <span style={{ fontSize: 12 }}>Loading…</span>}
          </div>

          {loadError && (
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
              {loadError}
            </div>
          )}

          {!loading && users.length === 0 && !loadError && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              No users found yet.
            </div>
          )}

          {users.length > 0 && (
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
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {u.name}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {u.email}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        textTransform: "capitalize",
                      }}
                    >
                      {u.role}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        color: "#6b7280",
                      }}
                    >
                      {u.created_at
                        ? new Date(u.created_at).toLocaleString()
                        : "-"}
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
