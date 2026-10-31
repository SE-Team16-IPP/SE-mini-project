import { useEffect, useState } from "react";
import { api } from "../api";

export default function MyApplications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/applications/mine").then(setItems).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h2>My applications</h2>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && <p className="muted">You have not applied to anything yet.</p>}
      {(items || []).map((a) => (
        <div className="card" key={a.id}>
          <div className="row between">
            <div>
              <strong>{a.listing ? a.listing.title : "Listing removed"}</strong>{" "}
              <span className="muted">{a.listing ? `at ${a.listing.company}` : ""}</span>
              <div className="muted">Applied {new Date(a.appliedAt).toLocaleDateString()}</div>
            </div>
            <span className="status">{a.status}</span>
          </div>
          {a.statusHistory.length > 0 && (
            <div className="muted" style={{ marginTop: "0.5rem" }}>
              Timeline: {a.statusHistory.map((h) => `${h.status} (${new Date(h.changedAt).toLocaleDateString()})`).join(" → ")}
            </div>
          )}
          <button className="btn ghost" style={{ marginTop: "0.6rem" }} onClick={() => api.openResume(a.id).catch((e) => setError(e.message))}>
            View my resume
          </button>
        </div>
      ))}
    </>
  );
}
