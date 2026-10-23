import { useEffect, useState } from "react";
import CreateListing from "./components/CreateListing";
import ListingList from "./components/ListingList";

export default function App() {
  const [status, setStatus] = useState("checking...");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || "Student");

  const fetchListings = () => {
    setLoading(true);
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend not reachable"));

    fetchListings();
  }, []);

  const handleListingCreated = (newListing) => {
    setListings((prev) => [newListing, ...prev]);
  };

  const toggleRole = () => {
    const nextRole = userRole === "Recruiter" ? "Student" : "Recruiter";
    setUserRole(nextRole);
    localStorage.setItem("userRole", nextRole);
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.75rem", color: "#1e293b" }}>
            Online Internship & Placement Portal
          </h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            API Status: <span style={{ fontWeight: 600, color: "#16a34a" }}>{status}</span>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>
            Current View: <strong>{userRole}</strong>
          </span>
          <button
            type="button"
            onClick={toggleRole}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            Switch to {userRole === "Recruiter" ? "Student" : "Recruiter"}
          </button>
        </div>
      </header>

      {userRole === "Recruiter" && (
        <CreateListing
          token={token}
          onListingCreated={handleListingCreated}
        />
      )}

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1e293b" }}>
            Active Internship Opportunities ({listings.length})
          </h2>
          <button
            type="button"
            onClick={fetchListings}
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

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading opportunities...</p>
        ) : (
          <ListingList
            listings={listings}
            onApplyClick={(listing) => {
              alert(`Apply feature is available in PR C for: ${listing.title}`);
            }}
          />
        )}
      </section>
    </main>
  );
}
