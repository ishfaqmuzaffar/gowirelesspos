// src/pages/SelectRegister.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AppShell from "../layout/AppShell";
import type { PosContext, StoreRef, RegisterRef } from "../posContext";
import { setPosContext } from "../posContext";

export default function SelectRegisterPage() {
  const [stores, setStores] = useState<StoreRef[]>([]);
  const [registers, setRegisters] = useState<RegisterRef[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const navigate = useNavigate();

  // Load stores
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<StoreRef[]>(
          "http://localhost:8080/api/stores"
        );
        setStores(data);
        if (data.length) {
          setStoreId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load stores from API. Check backend is running.");
      }
    })();
  }, []);

  // Load registers when store changes
  useEffect(() => {
    if (!storeId) return;
    setLoadingRegs(true);
    setRegisters([]);
    setRegisterId(null);
    (async () => {
      try {
        const { data } = await axios.get<RegisterRef[]>(
          `http://localhost:8080/api/registers?store_id=${storeId}`
        );
        setRegisters(data);
        if (data.length) setRegisterId(data[0].id);
      } catch (err) {
        console.error(err);
        alert("Failed to load registers. Check backend /api/registers.");
      } finally {
        setLoadingRegs(false);
      }
    })();
  }, [storeId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !registerId) {
      alert("Please choose both store and register.");
      return;
    }
    const store = stores.find((s) => s.id === storeId);
    const reg = registers.find((r) => r.id === registerId);
    if (!store || !reg) {
      alert("Invalid selection.");
      return;
    }

    const ctx: PosContext = {
      store,
      register: reg,
    };
    setPosContext(ctx);
    navigate("/sell");
  }

  return (
    <AppShell title="Select Store & Register">
      <form
        onSubmit={handleSave}
        style={{
          maxWidth: 400,
          margin: "0 auto",
          background: "white",
          padding: 16,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Choose where you are</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          This ties sales to the correct store and register, similar to Lightspeed.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Store</label>
          <select
            value={storeId ?? ""}
            onChange={(e) => setStoreId(Number(e.target.value))}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #d1d5db",
              marginTop: 4,
            }}
          >
            <option value="" disabled>
              -- Select store --
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Register</label>
          <select
            value={registerId ?? ""}
            onChange={(e) => setRegisterId(Number(e.target.value))}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #d1d5db",
              marginTop: 4,
            }}
            disabled={loadingRegs || !stores.length}
          >
            <option value="" disabled>
              {loadingRegs ? "Loading registers..." : "-- Select register --"}
            </option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 4,
            border: "none",
            background: "#111827",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Continue to Sell
        </button>
      </form>
    </AppShell>
  );
}
