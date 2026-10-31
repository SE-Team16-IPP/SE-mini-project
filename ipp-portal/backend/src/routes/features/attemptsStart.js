const express = require("express");
const mongoose = require("mongoose");
const Test = require("../../models/Test");
const Attempt = require("../../models/Attempt");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { autoSubmitExpired } = require("../../services/attemptExpiry");

const router = express.Router();

// IPP-F-032 starting a test creates an attempt with a server-side deadline the client timer counts down to.
// The questions are loaded separately with GET /api/tests/:id (answers hidden).
router.post("/tests/:id/start", requireAuth, requireRole("Student"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid test id" });
    }
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: "Test not found" });

    await autoSubmitExpired(req.user.id);

    // resume an attempt that is still running instead of starting a second one
    const running = await Attempt.findOne({
      student: req.user.id,
      test: test._id,
      submittedAt: null,
      expiresAt: { $gt: new Date() },
    });
    const attempt =
      running ||
      (await Attempt.create({
        student: req.user.id,
        test: test._id,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + test.timeLimitMinutes * 60 * 1000),
      }));

    return res.status(running ? 200 : 201).json({
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      timeLimitMinutes: test.timeLimitMinutes,
    });
  } catch {
    return res.status(500).json({ error: "Could not start the test" });
  }
});

module.exports = { mount: "/", router };
