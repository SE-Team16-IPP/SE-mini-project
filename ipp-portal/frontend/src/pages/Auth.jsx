import { useState } from "react";
import { api, saveSession } from "../api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Student" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "register") {
        await api.post("/auth/register", form);
        setNotice("Account created. You can log in now.");
        setMode("login");
      } else {
        const { token, user } = await api.post("/auth/login", { email: form.email, password: form.password });
        saveSession(token, user);
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth card">
      <h2>{mode === "login" ? "Log in" : "Create an account"}</h2>
      <form onSubmit={submit}>
        {mode === "register" && (
          <>
            <label htmlFor="name">Name</label>
            <input id="name" value={form.name} onChange={set("name")} required />
            <label htmlFor="role">I am a</label>
            <select id="role" value={form.role} onChange={set("role")}>
              <option>Student</option>
              <option>Recruiter</option>
            </select>
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set("email")} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={form.password} onChange={set("password")} required minLength={mode === "register" ? 8 : undefined} />
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
        <div className="row between" style={{ marginTop: "1rem" }}>
          <button className="btn" disabled={busy}>
            {mode === "login" ? "Log in" : "Register"}
          </button>
          <button type="button" className="btn ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create an account" : "I have an account"}
          </button>
        </div>
      </form>
      <div className="hint">
        Demo logins after <code>npm run seed</code>:<br />
        student@ipp.test / Student@123<br />
        recruiter@ipp.test / Recruiter@123<br />
        admin@ipp.test / Admin@123
      </div>
    </div>
  );
}
