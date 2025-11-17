import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import AppShell from "../layout/AppShell";
import { useNavigate } from "react-router-dom";

type SupplierRow = {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  active: boolean;
  created_at?: string;
};

export default function SuppliersPage() {
  const navigate = useNavigate();

  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("posUser") : null;
  const currentUser: { id: number; name: string; email: string; role?: string; roles?: string[] } | null =
    userRaw ? JSON.parse(userRaw) : null;

  const roles = useMemo(() => {
    const list: string[] = [];
    if (currentUser?.role) list.push(currentUser.role);
    if (Array.isArray(currentUser?.roles)) list.push(...currentUser.roles);
    return Array.from(new Set(list.map((r) => String(r).toLowerCase())));
  }, [currentUser]);

  const hasRole = (name: string) => roles.includes(name.toLowerCase());
  const canManageSuppliers = hasRole("admin") || hasRole("manager");

  if (!currentUser || !canManageSuppliers) {
    return (
      <AppShell title="Suppliers">
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
            Suppliers
          </h2>
          <div style={{ color: "#b91c1c" }}>
            You do not have permission to view this page. Only admins and
            managers can manage suppliers.
          </div>
        </div>
      </AppShell>
    );
  }

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  async function loadSuppliers() {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await axios.get<SupplierRow[]>(
        "http://localhost:8080/api/suppliers"
      );
      setSuppliers(data);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to load suppliers.";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!name.trim()) {
      setCreateError("Supplier name is required.");
      return;
    }

    setCreating(true);
    try {
      await axios.post("http://localhost:8080/api/suppliers", {
        name: name.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      setCreateSuccess(`Supplier "${name.trim()}" created successfully.`);
      setName("");
      setContactName("");
      setPhone("");
      setEmail("");
      setCity("");
      setAddress("");
      setNotes("");

      await loadSuppliers();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create supplier.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Suppliers">
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Suppliers
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Manage your supplier list. Click a supplier row to view details and
          activity.
        </p>

        {/* Create supplier card */}
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
              marginBottom: 10,
            }}
          >
            Add Supplier
          </h2>
          <form
            onSubmit={handleCreate}
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr 1fr",
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
                Supplier name
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
                Contact person
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
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
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / span 2" }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                }}
              />
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
                {creating ? "Saving…" : "Add supplier"}
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

        {/* List suppliers */}
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
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Existing Suppliers</h2>
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

          {!loading && suppliers.length === 0 && !loadError && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              No suppliers added yet.
            </div>
          )}

          {suppliers.length > 0 && (
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
                    Contact
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Phone
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
                    City
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/suppliers/${s.id}`)}
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {s.name}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {s.contact_name || "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {s.phone || "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {s.email || "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {s.city || "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {s.active ? "Yes" : "No"}
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
