import { useState } from "react";

export default function Auth({ user, onAuthSuccess, onLogout }) {
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Registration failed");
        }
        setMessage("Account created successfully! Please log in.");
        setMode("login");
        setPassword("");
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Login failed");
        }
        localStorage.setItem("ipp_token", data.token);
        localStorage.setItem("ipp_user", JSON.stringify(data.user));
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div style={{ padding: "1rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#f8fafc", marginBottom: "1.5rem" }}>
        <h3>Welcome, {user.name} ({user.role})</h3>
        <p style={{ margin: "4px 0", color: "#475569" }}>Email: {user.email}</p>
        {user.role === "Recruiter" && (
          <p style={{ margin: "4px 0", color: user.approved ? "#16a34a" : "#d97706", fontWeight: "bold" }}>
            Account Status: {user.approved ? "Approved" : "Pending Admin Approval"}
          </p>
        )}
        <button
          onClick={onLogout}
          style={{ marginTop: "8px", padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem", background: "#ffffff", marginBottom: "2rem" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); setMessage(""); }}
          style={{
            flex: 1,
            padding: "8px",
            border: "none",
            borderRadius: "4px",
            background: mode === "login" ? "#0284c7" : "#f1f5f9",
            color: mode === "login" ? "white" : "#334155",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); setMessage(""); }}
          style={{
            flex: 1,
            padding: "8px",
            border: "none",
            borderRadius: "4px",
            background: mode === "register" ? "#0284c7" : "#f1f5f9",
            color: mode === "register" ? "white" : "#334155",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Register
        </button>
      </div>

      {error && <div style={{ padding: "8px", background: "#fee2e2", color: "#991b1b", borderRadius: "4px", marginBottom: "1rem" }}>{error}</div>}
      {message && <div style={{ padding: "8px", background: "#dcfce7", color: "#166534", borderRadius: "4px", marginBottom: "1rem" }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {mode === "register" && (
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "4px" }}
              placeholder="e.g. Prateek Hachadad"
            />
          </div>
        )}

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}>Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            placeholder={mode === "register" ? "Min 8 chars with 1 letter & 1 digit" : "Enter password"}
          />
        </div>

        {mode === "register" && (
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}>Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            >
              <option value="Student">Student</option>
              <option value="Recruiter">Recruiter</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px",
            background: "#0284c7",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: "6px",
          }}
        >
          {loading ? "Processing..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
    </div>
  );
}
