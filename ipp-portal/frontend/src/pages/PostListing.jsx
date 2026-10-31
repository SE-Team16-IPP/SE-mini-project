import { useState } from "react";
import { api } from "../api";

const EMPTY = { title: "", company: "", description: "", requiredSkills: "", location: "", duration: "", stipend: "", deadline: "" };

export default function PostListing({ goTo }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api.post("/listings", { ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : "" });
      setMessage("Listing published.");
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Post an internship</h2>
      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div>
            <label htmlFor="title">Title</label>
            <input id="title" value={form.title} onChange={set("title")} required />
          </div>
          <div>
            <label htmlFor="company">Company</label>
            <input id="company" value={form.company} onChange={set("company")} required />
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input id="location" value={form.location} onChange={set("location")} />
          </div>
          <div>
            <label htmlFor="duration">Duration</label>
            <input id="duration" value={form.duration} onChange={set("duration")} placeholder="3 months" />
          </div>
          <div>
            <label htmlFor="stipend">Monthly stipend (Rs)</label>
            <input id="stipend" type="number" min="0" value={form.stipend} onChange={set("stipend")} />
          </div>
          <div>
            <label htmlFor="deadline">Application deadline</label>
            <input id="deadline" type="datetime-local" value={form.deadline} onChange={set("deadline")} required />
          </div>
        </div>
        <label htmlFor="skills">Required skills (comma separated)</label>
        <input id="skills" value={form.requiredSkills} onChange={set("requiredSkills")} placeholder="React, Node.js" />
        <label htmlFor="description">Description</label>
        <textarea id="description" value={form.description} onChange={set("description")} required />
        {error && <p className="error">{error}</p>}
        {message && (
          <p className="success">
            {message}{" "}
            <button type="button" className="btn ghost" onClick={() => goTo("mine")}>
              View my listings
            </button>
          </p>
        )}
        <button className="btn" disabled={busy} style={{ marginTop: "0.75rem" }}>
          Publish listing
        </button>
      </form>
    </>
  );
}
