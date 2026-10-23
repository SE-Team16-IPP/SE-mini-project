import { useState } from "react";

export default function ApplyModal({ listing, onClose, onSuccess, token }) {
  const [resumePath, setResumePath] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authToken = token || localStorage.getItem("token") || "";
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          listingId: listing?._id,
          resumePath: resumePath.trim(),
          coverNote: coverNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSuccess(true);
      if (onSuccess) {
        onSuccess(data.application);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          maxWidth: "520px",
          width: "100%",
          padding: "1.75rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.25rem", color: "#0f172a" }}>
              Apply for Internship
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              {listing?.title} at <strong>{listing?.company}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#166534" }}>Application Submitted!</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
              Your resume and cover note have been securely sent to the recruiter.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.25rem",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "0.35rem",
                }}
              >
                Resume Document Link or File Path *
              </label>
              <input
                type="text"
                required
                value={resumePath}
                onChange={(e) => setResumePath(e.target.value)}
                placeholder="https://drive.google.com/... or /uploads/resume.pdf"
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Accepted: PDF documents up to 2 MB (IPP-F-013)
              </span>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "0.35rem",
                }}
              >
                Cover Note (Optional)
              </label>
              <textarea
                rows={3}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Introduce yourself, your key skills, and why you are interested in this role..."
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.5rem 1.25rem",
                  background: loading ? "#94a3b8" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
