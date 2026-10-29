const express = require("express");
const mongoose = require("mongoose");
const Attempt = require("../../models/Attempt");
const Test = require("../../models/Test");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { scoreAttempt } = require("../../services/scoring");

const router = express.Router();
const GRACE_MS = 15 * 1000; // allowance for network delay after the timer ends

router.post("/attempts/:id/submit", requireAuth, requireRole("Student"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });
    if (String(attempt.student) !== req.user.id) {
      return res.status(403).json({ error: "This is not your attempt" });
    }
    if (attempt.submittedAt) {
      return res.status(409).json({ error: "Attempt already submitted" });
    }

    const now = new Date();
    if (attempt.expiresAt && now.getTime() > new Date(attempt.expiresAt).getTime() + GRACE_MS) {
      attempt.submittedAt = now;
      attempt.autoSubmitted = true;
      await attempt.save();
      return res.status(400).json({ error: "Time limit exceeded, attempt closed with no score" });
    }

    const test = await Test.findById(attempt.test);
    if (!test) return res.status(404).json({ error: "Test not found" });

    // req.body.score (or any other client field) is ignored on purpose
    const result = scoreAttempt(test, req.body.answers);
    attempt.answers = result.answers;
    attempt.score = result.score;
    attempt.submittedAt = now;
    attempt.autoSubmitted = req.body.auto === true;
    await attempt.save();

    return res.json({ attemptId: attempt._id, score: result.score, total: result.total });
  } catch {
    return res.status(500).json({ error: "Could not submit attempt" });
  }
});

module.exports = { mount: "/", router, GRACE_MS };
