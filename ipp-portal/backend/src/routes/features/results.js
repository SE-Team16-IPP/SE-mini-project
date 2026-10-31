const express = require("express");
const mongoose = require("mongoose");
const Attempt = require("../../models/Attempt");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// IPP-F-035 result of a submitted attempt, with the correct answer for every question
router.get("/attempts/:id/result", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }
    const attempt = await Attempt.findById(req.params.id).populate("test");
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const isOwner = String(attempt.student) === req.user.id;
    if (!isOwner && req.user.role !== "Admin") {
      return res.status(403).json({ error: "This is not your attempt" });
    }
    if (!attempt.submittedAt) {
      return res.status(400).json({ error: "Attempt has not been submitted yet" });
    }

    const questions = (attempt.test && attempt.test.questions) || [];
    const results = questions.map((q) => {
      const answer = (attempt.answers || []).find((a) => String(a.questionId) === String(q._id));
      const selectedIndex = answer ? answer.selectedIndex : null;
      return {
        questionId: q._id,
        text: q.text,
        options: q.options,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect: selectedIndex === q.correctIndex,
      };
    });

    return res.json({
      attemptId: attempt._id,
      testTitle: attempt.test ? attempt.test.title : null,
      score: attempt.score,
      total: questions.length,
      autoSubmitted: Boolean(attempt.autoSubmitted),
      submittedAt: attempt.submittedAt,
      results,
    });
  } catch {
    return res.status(500).json({ error: "Could not load result" });
  }
});

module.exports = { mount: "/", router };
