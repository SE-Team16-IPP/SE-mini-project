import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

const STATUSES = ["Under Review", "Shortlisted", "Rejected", "Selected"];

export default function MyListings() {
  const [listings, setListings] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/listings/mine").then(setListings).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function close(id) {
    try {
      await api.post(`/listings/${id}/close`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (open) return <Applicants listing={open} onBack={() => { setOpen(null); load(); }} />;

  return (
    <>
      <h2>My listings</h2>
      {error && <p className="error">{error}</p>}
      {listings && listings.length === 0 && <p className="muted">You have not posted any listings yet.</p>}
      {(listings || []).map((l) => (
        <div className="card" key={l._id}>
          <div className="row between">
            <div>
              <strong>{l.title}</strong> <span className="muted">at {l.company}</span>
              <div className="muted">
                {l.status} · closes {new Date(l.deadline).toLocaleDateString()} · {l.applicantCount} applicant(s)
              </div>
            </div>
            <div className="row">
              <button className="btn" onClick={() => setOpen(l)}>
                View applicants
              </button>
              {l.status === "Active" && (
                <button className="btn ghost" onClick={() => close(l._id)}>
                  Close listing
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function Applicants({ listing, onBack }) {
  const [applicants, setApplicants] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get(`/listings/${listing._id}/applicants`).then((r) => setApplicants(r.applicants)).catch((err) => setError(err.message));
  }, [listing._id]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id, status) {
    try {
      setError("");
      await api.patch(`/applications/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <button className="btn ghost" onClick={onBack}>
        Back to my listings
      </button>
      <h2 style={{ marginTop: "1rem" }}>Applicants for {listing.title}</h2>
      {error && <p className="error">{error}</p>}
      {applicants && applicants.length === 0 && <p className="muted">No applications yet.</p>}
      {(applicants || []).map((a) => (
        <div className="card" key={a._id}>
          <div className="row between">
            <div>
              <strong>{a.student ? a.student.name : "Unknown"}</strong> <span className="muted">{a.student ? a.student.email : ""}</span>
              {a.coverNote && <div className="muted">Note: {a.coverNote}</div>}
            </div>
            <div className="row">
              <button className="btn ghost" onClick={() => api.openResume(a._id).catch((e) => setError(e.message))}>
                View resume
              </button>
              <select value={STATUSES.includes(a.status) ? a.status : ""} onChange={(e) => setStatus(a._id, e.target.value)} style={{ width: "auto" }}>
                <option value="" disabled>
                  {a.status}
                </option>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
