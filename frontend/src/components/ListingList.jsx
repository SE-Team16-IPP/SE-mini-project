export default function ListingList({ listings = [], onApplyClick }) {
  if (!listings || listings.length === 0) {
    return (
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
        No internship listings available at the moment.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {listings.map((item) => {
        const deadlineDate = item.deadline
          ? new Date(item.deadline).toLocaleDateString()
          : "N/A";

        return (
          <div
            key={item._id}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1.25rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1.15rem" }}>
                  {item.title}
                </h3>
                <span style={{ color: "#2563eb", fontWeight: 600, fontSize: "0.95rem" }}>
                  {item.company}
                </span>
                <span style={{ color: "#64748b", fontSize: "0.85rem", marginLeft: "0.75rem" }}>
                  📍 {item.location || "Remote"} • ⏱️ {item.duration || "N/A"}
                </span>
              </div>
              <span
                style={{
                  background: "#dbeafe",
                  color: "#1e40af",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "9999px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                ₹{item.stipend ? item.stipend.toLocaleString() : "0"}/mo
              </span>
            </div>

            <p style={{ color: "#334155", fontSize: "0.9rem", margin: "0.75rem 0", lineHeight: "1.4" }}>
              {item.description}
            </p>

            {item.requiredSkills && item.requiredSkills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.75rem" }}>
                {item.requiredSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                📅 Deadline: <strong>{deadlineDate}</strong>
              </span>

              {onApplyClick && (
                <button
                  type="button"
                  onClick={() => onApplyClick(item)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "5px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Apply Now
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
