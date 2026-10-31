import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export default function Listings() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], totalPages: 1, total: 0 });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams({ page, limit: 5 });
      if (query) params.set("q", query);
      setResult(await api.get(`/listings?${params}`));
    } catch (err) {
      setError(err.message);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  if (open) return <Details id={open} onBack={() => setOpen(null)} />;

  return (
    <>
      <h2>Internships</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
      >
        <input style={{ flex: 1 }} placeholder="Search by title, company or skill" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="muted">{result.total} open listing(s)</p>
      {result.data.map((l) => (
        <div className="card" key={l._id}>
          <div className="row between">
            <div>
              <strong>{l.title}</strong> <span className="muted">at {l.company}</span>
              <div className="muted">
                {l.location} · {l.duration} · {l.stipend ? `Rs ${l.stipend}/month` : "Unpaid"} · closes {new Date(l.deadline).toLocaleDateString()}
              </div>
              <div>{(l.requiredSkills || []).map((s) => <span className="tag" key={s}>{s}</span>)}</div>
            </div>
            <button className="btn" onClick={() => setOpen(l._id)}>
              View and apply
            </button>
          </div>
        </div>
      ))}
      <div className="row between">
        <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span className="muted">
          Page {page} of {Math.max(result.totalPages, 1)}
        </span>
        <button className="btn ghost" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </>
  );
}

function Details({ id, onBack }) {
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`).then(setListing).catch((err) => setError(err.message));
  }, [id]);

  async function apply(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!file) return setError("Choose a PDF resume first");
    const form = new FormData();
    form.append("resume", file);
    form.append("coverNote", note);
    setBusy(true);
    try {
      await api.upload(`/listings/${id}/apply`, form);
      setMessage("Application submitted. Track it under My applications.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn ghost" onClick={onBack}>
        Back to listings
      </button>
      {error && !listing && <p className="error">{error}</p>}
      {listing && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>{listing.title}</h2>
          <p>
            <strong>{listing.company}</strong> · {listing.location} · {listing.duration} ·{" "}
            {listing.stipend ? `Rs ${listing.stipend}/month` : "Unpaid"}
          </p>
          <p>{listing.description}</p>
          <div>{(listing.requiredSkills || []).map((s) => <span className="tag" key={s}>{s}</span>)}</div>
          <p className="muted">Apply by {new Date(listing.deadline).toLocaleString()}</p>
          <hr style={{ borderColor: "var(--line)" }} />
          <form onSubmit={apply}>
            <label htmlFor="resume">Resume (PDF, up to 5 MB)</label>
            <input id="resume" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
            <label htmlFor="note">Cover note (optional)</label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}
            <button className="btn" disabled={busy} style={{ marginTop: "0.75rem" }}>
              Submit application
            </button>
          </form>
        </div>
      )}
    </>
  );
}
