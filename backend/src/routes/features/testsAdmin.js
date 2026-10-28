const express = require("express");
const Test = require("../../models/Test");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

// Returns an error message, or null when the payload is valid
function validateTestPayload(body) {
  if (!body || typeof body !== "object") return "Request body is required";
  if (typeof body.title !== "string" || !body.title.trim()) return "Title is required";
  if (typeof body.category !== "string" || !body.category.trim()) return "Category is required";
  if (!Number.isInteger(body.timeLimitMinutes) || body.timeLimitMinutes < 1) {
    return "Time limit must be a whole number of minutes (at least 1)";
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return "At least one question is required";
  }
  for (let i = 0; i < body.questions.length; i += 1) {
    const q = body.questions[i];
    const n = i + 1;
    if (!q || typeof q.text !== "string" || !q.text.trim()) return `Question ${n}: text is required`;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.some((o) => typeof o !== "string" || !o.trim())) {
      return `Question ${n}: at least two non-empty options are required`;
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return `Question ${n}: exactly one correct option is required`;
    }
  }
  return null;
}

// IPP-F-030 Admin creates an aptitude test
router.post("/", requireAuth, requireRole("Admin"), async (req, res) => {
  const problem = validateTestPayload(req.body);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const { title, category, timeLimitMinutes, questions } = req.body;
    const test = await Test.create({
      title: title.trim(),
      category: category.trim(),
      timeLimitMinutes,
      questions: questions.map((q) => ({
        text: q.text.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
      })),
      createdBy: req.user.id,
    });
    return res.status(201).json({ id: test._id, title: test.title, questionCount: test.questions.length });
  } catch {
    return res.status(500).json({ error: "Could not create test" });
  }
});

module.exports = { mount: "/tests", router, validateTestPayload };
