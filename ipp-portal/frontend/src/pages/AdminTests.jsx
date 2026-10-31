import { useState } from "react";
import { api } from "../api";

const blankQuestion = () => ({ text: "", options: ["", "", "", ""], correctIndex: 0 });

export default function AdminTests() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const update = (i, patch) => setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const setOption = (i, j, value) => update(i, { options: questions[i].options.map((o, k) => (k === j ? value : o)) });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const cleaned = questions.map((q) => {
        const options = q.options.map((o) => o.trim()).filter(Boolean);
        return { text: q.text, options, correctIndex: Math.min(q.correctIndex, options.length - 1) };
      });
      const created = await api.post("/tests", { title, category, timeLimitMinutes: Number(minutes), questions: cleaned });
      setMessage(`Test created with ${created.questionCount} question(s).`);
      setTitle("");
      setCategory("");
      setQuestions([blankQuestion()]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h2>Create an aptitude test</h2>
      <form onSubmit={submit}>
        <div className="card">
          <div className="grid2">
            <div>
              <label htmlFor="t-title">Title</label>
              <input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="t-cat">Category</label>
              <input id="t-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Quant, Logical, Verbal" required />
            </div>
            <div>
              <label htmlFor="t-min">Time limit (minutes)</label>
              <input id="t-min" type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} required />
            </div>
          </div>
        </div>
        {questions.map((q, i) => (
          <div className="card" key={i}>
            <label htmlFor={`q-${i}`}>Question {i + 1}</label>
            <input id={`q-${i}`} value={q.text} onChange={(e) => update(i, { text: e.target.value })} required />
            {q.options.map((o, j) => (
              <div className="row" key={j} style={{ marginTop: "0.4rem" }}>
                <input type="radio" style={{ width: "auto" }} name={`correct-${i}`} checked={q.correctIndex === j} onChange={() => update(i, { correctIndex: j })} title="Correct answer" />
                <input style={{ flex: 1 }} placeholder={`Option ${j + 1}${j < 2 ? "" : " (optional)"}`} value={o} onChange={(e) => setOption(i, j, e.target.value)} required={j < 2} />
              </div>
            ))}
            <p className="muted">Select the round button next to the correct option.</p>
            {questions.length > 1 && (
              <button type="button" className="btn ghost" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}>
                Remove question
              </button>
            )}
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setQuestions([...questions, blankQuestion()])}>
            Add a question
          </button>
          <button className="btn">Create test</button>
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
      </form>
    </>
  );
}
