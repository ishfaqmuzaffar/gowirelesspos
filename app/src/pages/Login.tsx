import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [canRegister, setCanRegister] = useState(false);

  const [name, setName] = useState("GoWireless Admin");
  const [email, setEmail] = useState("admin@gowireless.test");
  const [password, setPassword] = useState("password");
  const [passwordConfirm, setPasswordConfirm] = useState("password");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation() as any;

  useEffect(() => {
    // Check if admin registration is allowed
    axios
      .get("http://localhost:8080/api/auth/admin/can-register")
      .then((res) => {
        const allowed = !!res.data.can_register;
        setCanRegister(allowed);
        if (allowed) {
          setMode("register");
        }
      })
      .catch(() => {
        // ignore; just fallback to login-only
      });
  }, []);

  function handleAuthSuccess(data: LoginResponse) {
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("posUser", JSON.stringify(data.user));
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

    const redirectTo = location.state?.from?.pathname || "/select-register";
    navigate(redirectTo, { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { data } = await axios.post<LoginResponse>(
          "http://localhost:8080/api/auth/login",
          { email, password }
        );
        handleAuthSuccess(data);
      } else {
        const { data } = await axios.post<LoginResponse>(
          "http://localhost:8080/api/auth/admin/register",
          {
            name,
            email,
            password,
            password_confirmation: passwordConfirm,
          }
        );
        handleAuthSuccess(data);
      }
    } catch (err: any) {
      console.error(err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Request failed. Please check your details and API.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111827",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          color: "#111827",
          padding: 24,
          borderRadius: 8,
          minWidth: 340,
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          GoWireless POS
        </h1>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
          {isRegister
            ? "First time setup – create the first admin account."
            : "Sign in with your admin or staff account."}
        </p>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            marginBottom: 16,
            borderRadius: 999,
            background: "#e5e7eb",
            padding: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: !isRegister ? "#111827" : "transparent",
              color: !isRegister ? "white" : "#4b5563",
            }}
          >
            Sign in
          </button>
          {canRegister && (
            <button
              type="button"
              onClick={() => setMode("register")}
              style={{
                flex: 1,
                padding: "6px 0",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: isRegister ? "#111827" : "transparent",
                color: isRegister ? "white" : "#4b5563",
              }}
            >
              Register Admin
            </button>
          )}
        </div>

        {isRegister && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #d1d5db",
                marginTop: 4,
                fontSize: 14,
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #d1d5db",
              marginTop: 4,
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #d1d5db",
              marginTop: 4,
              fontSize: 14,
            }}
          />
        </div>

        {isRegister && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Confirm password
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 4,
                border: "1px solid #d1d5db",
                marginTop: 4,
                fontSize: 14,
              }}
            />
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: 12,
              padding: 8,
              borderRadius: 4,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 4,
            border: "none",
            background: loading ? "#9ca3af" : "#111827",
            color: "white",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            marginTop: 6,
          }}
        >
          {loading
            ? "Please wait..."
            : isRegister
            ? "Create admin account"
            : "Sign in"}
        </button>

        {mode === "login" && canRegister && (
          <p
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            First time setup?{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              style={{
                border: "none",
                background: "transparent",
                color: "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Register Admin
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
