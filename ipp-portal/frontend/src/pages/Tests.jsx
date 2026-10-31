import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function Tests() {
  const [view, setView] = useState({ name: "list" });

  if (view.name === "take") {
    return <TakeTest test={view.test} onDone={(attemptId) => setView({ name: "result", attemptId })} onBack={() => setView({ name: "list" })} />;
  }
  if (view.name === "result") {
    return <Result attemptId={view.attemptId} onBack={() => setView({ name: "list" })} />;
  }
  return <TestList onStart={(test) => setView({ name: "take", test })} />;
}

function TestList({ onStart }) {
  const [category, setCategory] = useState("");
  const [tests, setTests] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setTests(await api.get(`/tests${category ? `?category=${encodeURIComponent(category)}` : ""}`));
    } catch (err) {
      setError(err.message);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h2>Aptitude tests</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input style={{ flex: 1 }} placeholder="Filter by category, for example Quant" value={category} onChange={(e) => setCategory(e.target.value)} />
        <button className="btn">Filter</button>
      </form>
      {error && <p className="error">{error}</p>}
      {tests && tests.length === 0 && <p className="muted">No tests found.</p>}
      {(tests || []).map((t) => (
        <div className="card" key={t.id}>
          <div className="row between">
            <div>
              <strong>{t.title}</strong> <span className="tag">{t.category}</span>
              <div className="muted">
                {t.questionCount} questions · {t.timeLimitMinutes} minutes
              </div>
            </div>
            <button className="btn" onClick={() => onStart(t)}>
              Start test
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

function TakeTest({ test, onDone, onBack }) {
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(null);
  const [error, setError] = useState("");
  const submitted = useRef(false);
  const answersRef = useRef({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const started = await api.post(`/tests/${test.id}/start`);
        const full = await api.get(`/tests/${test.id}`);
        if (cancelled) return;
        setAttempt(started);
        setQuestions(full.questions);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [test.id]);

  const submit = useCallback(
    async (auto) => {
      if (submitted.current || !attempt) return;
      submitted.current = true;
      try {
        const payload = Object.entries(answersRef.current).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
        await api.post(`/attempts/${attempt.attemptId}/submit`, { answers: payload, auto });
        onDone(attempt.attemptId);
      } catch (err) {
        submitted.current = false;
        setError(err.message);
      }
    },
    [attempt, onDone]
  );

  useEffect(() => {
    if (!attempt) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) submit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt, submit]);

  const mm = remaining === null ? "--" : String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = remaining === null ? "--" : String(remaining % 60).padStart(2, "0");

  return (
    <>
      <div className="row between">
        <h2>{test.title}</h2>
        <div className={`timer ${remaining !== null && remaining <= 60 ? "low" : ""}`}>
          {mm}:{ss}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!attempt && !error && <p className="muted">Starting the test...</p>}
      {error && !attempt && (
        <button className="btn ghost" onClick={onBack}>
          Back
        </button>
      )}
      {questions.map((q, i) => (
        <div className="card" key={q._id}>
          <strong>
            {i + 1}. {q.text}
          </strong>
          {q.options.map((opt, idx) => (
            <label className="opt" key={idx}>
              <input type="radio" name={q._id} checked={answers[q._id] === idx} onChange={() => setAnswers({ ...answers, [q._id]: idx })} />
              {opt}
            </label>
          ))}
        </div>
      ))}
      {attempt && (
        <button className="btn" onClick={() => submit(false)}>
          Submit answers
        </button>
      )}
      <p className="muted">The test submits automatically when the timer reaches zero.</p>
    </>
  );
}

function Result({ attemptId, onBack }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/attempts/${attemptId}/result`).then(setResult).catch((err) => setError(err.message));
  }, [attemptId]);

  return (
    <>
      <button className="btn ghost" onClick={onBack}>
        Back to tests
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <h2 style={{ marginTop: "1rem" }}>
            {result.testTitle}: {result.score} / {result.total}
          </h2>
          {result.autoSubmitted && <p className="muted">This attempt was submitted automatically when time ran out.</p>}
          {result.results.map((r, i) => (
            <div className="card" key={r.questionId}>
              <strong>
                {i + 1}. {r.text}
              </strong>{" "}
              <span className={r.isCorrect ? "right" : "wrong"}>{r.isCorrect ? "Correct" : r.selectedIndex === null ? "Not answered" : "Wrong"}</span>
              <div className="muted">
                Your answer: {r.selectedIndex === null ? "none" : r.options[r.selectedIndex]} · Correct answer: {r.options[r.correctIndex]}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
