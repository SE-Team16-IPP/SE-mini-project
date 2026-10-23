import { useEffect, useState } from "react";
import Auth from "./components/Auth";

export default function App() {
  const [status, setStatus] = useState("checking...");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("ipp_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend not reachable"));
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("ipp_token");
    localStorage.removeItem("ipp_user");
    setCurrentUser(null);
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <header style={{ borderBottom: "2px solid #0284c7", paddingBottom: "1rem", marginBottom: "2rem" }}>
        <h1 style={{ color: "#0f172a", margin: 0 }}>Online Internship &amp; Placement Prep Portal</h1>
        <p style={{ color: "#64748b", margin: "4px 0" }}>Team 16 | Section F</p>
        <span style={{ fontSize: "0.85rem", color: status === "ok" ? "#16a34a" : "#dc2626" }}>
          System Health: {status}
        </span>
      </header>

      <section>
        <h2>Account &amp; Authentication</h2>
        <Auth user={currentUser} onAuthSuccess={handleAuthSuccess} onLogout={handleLogout} />
      </section>
    </main>
  );
}
