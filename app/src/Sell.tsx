import { useEffect, useState } from "react";
import axios from "axios";

type Variant = { id: string; sku: string; barcode?: string; price: number | string; product: { name: string } };

export default function Sell() {
  const [sku, setSku] = useState("");
  const [all, setAll] = useState<Variant[]>([]);
  const [cart, setCart] = useState<{ variant: Variant; qty: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await axios.get("http://localhost:8080/api/products");
      console.log("Products loaded:", data);
      setAll(data);
      setLoaded(true);
    })();
  }, []);

  function findMatch(input: string) {
    const key = input.trim().toUpperCase();
    return (
      all.find(x => x.sku?.trim().toUpperCase() === key) ||
      all.find(x => x.barcode?.trim().toUpperCase() === key)
    );
  }

  async function addBySku() {
    if (!loaded) { alert("Still loading products. Try again in a second."); return; }
    const v = findMatch(sku);
    if (!v) { alert(`SKU not found: "${sku}"`); return; }
    setCart(prev => {
      const i = prev.findIndex(l => l.variant.id === v.id);
      if (i >= 0) { const copy = [...prev]; copy[i].qty++; return copy; }
      return [...prev, { variant: v, qty: 1 }];
    });
    setSku("");
  }

  async function checkout() {
    if (!cart.length) return;
    const lines = cart.map(l => ({ variant_id: l.variant.id, qty: l.qty }));
    const { data } = await axios.post("http://localhost:8080/api/orders", { store_id: 1, lines });
    alert(`Order ${data.order_id} total ${data.total}`);
    setCart([]);
  }

  const total = cart.reduce((s, l) => s + Number(l.variant.price) * l.qty, 0);

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h2>Sell</h2>
      <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.7 }}>
        Loaded: {loaded ? `${all.length} products` : "loading..."}
      </div>
      <input
        placeholder="Scan/Type SKU or Barcode (e.g., PHONE-BASE-01)"
        value={sku}
        onChange={e => setSku(e.target.value)}
        onKeyDown={e => e.key === "Enter" && addBySku()}
        style={{ padding: 8, width: 360, marginRight: 8 }}
      />
      <button onClick={addBySku}>Add</button>

      <table width="100%" style={{ marginTop: 10 }}>
        <thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>
          {cart.map((l, i) => (
            <tr key={i}>
              <td>{l.variant.sku}</td>
              <td>{l.variant.product.name}</td>
              <td>{l.qty}</td>
              <td>{Number(l.variant.price).toFixed(2)}</td>
              <td>{(Number(l.variant.price) * l.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Grand Total: {total.toFixed(2)}</h3>
      <button disabled={!cart.length} onClick={checkout}>Checkout (Cash)</button>
    </div>
  );
}
