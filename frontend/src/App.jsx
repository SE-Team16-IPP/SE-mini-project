import { useEffect, useState } from "react";
import Auth from "./components/Auth";
import ApplyModal from "./components/ApplyModal";

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
  const [token, setToken] = useState(() => localStorage.getItem("ipp_token") || localStorage.getItem("token") || "");
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [activeListing, setActiveListing] = useState(null);
  const [customListingId, setCustomListingId] = useState("");

  const fetchApplications = () => {
    const authToken = token || localStorage.getItem("ipp_token") || localStorage.getItem("token");
    if (!authToken) {
      setLoadingApps(false);
      return;
    }

    setLoadingApps(true);
    fetch("/api/applications/mine", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setApplications(data.applications || []);
        setLoadingApps(false);
      })
      .catch(() => {
        setLoadingApps(false);
      });
  };

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend not reachable"));

    if (token) {
      fetchApplications();
    }
  }, [token]);

  const handleAuthSuccess = (user, authToken) => {
    setCurrentUser(user);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem("token", authToken);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ipp_token");
    localStorage.removeItem("ipp_user");
    localStorage.removeItem("token");
    setCurrentUser(null);
    setToken("");
    setApplications([]);
  };

  const handleApplySuccess = (newApp) => {
    setApplications((prev) => [newApp, ...prev]);
  };

  return (
    <main
      style={{
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: "2rem 1.5rem",
        maxWidth: "960px",
        margin: "0 auto",
        color: "#0f172a",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.75rem", color: "#1e293b" }}>
            Online Internship & Placement Portal
          </h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            API Status: <span style={{ fontWeight: 600, color: status === "ok" ? "#16a34a" : "#dc2626" }}>{status}</span>
          </p>
        </div>
      </header>

      {/* Account & Authentication Section */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "0.75rem" }}>
          Account &amp; Authentication
        </h2>
        <Auth user={currentUser} onAuthSuccess={handleAuthSuccess} onLogout={handleLogout} />
      </section>

      {/* Student Application Quick Action (IPP-F-010) */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#1e293b" }}>
          Apply for an Internship (IPP-F-010)
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem 0" }}>
          Enter a listing ID below or apply directly to any active opportunity with your resume and cover note.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", maxWidth: "600px" }}>
          <input
            type="text"
            value={customListingId}
            onChange={(e) => setCustomListingId(e.target.value)}
            placeholder="Enter Listing ID (e.g. 66f000000000000000000001)..."
            style={{
              flex: 1,
              padding: "0.55rem 0.75rem",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (customListingId.trim()) {
                setActiveListing({
                  _id: customListingId.trim(),
                  title: "Internship Opportunity",
                  company: "Company",
                });
              }
            }}
            style={{
              padding: "0.55rem 1.25rem",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Apply with Resume
          </button>
        </div>
      </section>

      {/* Submitted Applications Dashboard */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1e293b" }}>
            My Submitted Applications ({applications.length})
          </h2>
          <button
            type="button"
            onClick={fetchApplications}
            style={{
              background: "transparent",
              border: "none",
              color: "#2563eb",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {loadingApps ? (
          <p style={{ color: "#64748b" }}>Loading applications...</p>
        ) : applications.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px dashed #cbd5e1",
              color: "#64748b",
            }}
          >
            No applications submitted yet. Apply for an active internship above.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {applications.map((app) => (
              <div
                key={app._id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>
                    {app.listing?.title || "Internship"} • {app.listing?.company || "Company"}
                  </h3>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "9999px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Status: {app.status}
                  </span>
                </div>
                <p style={{ margin: "0.5rem 0", fontSize: "0.85rem", color: "#475569" }}>
                  📄 <strong>Resume:</strong> {app.resumePath}
                </p>
                {app.coverNote && (
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
                    &ldquo;{app.coverNote}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Popup */}
      {activeListing && (
        <ApplyModal
          listing={activeListing}
          token={token}
          onClose={() => setActiveListing(null)}
          onSuccess={(newApp) => {
            handleApplySuccess(newApp);
            setActiveListing(null);
          }}
        />
      )}
    </main>
  );
}
