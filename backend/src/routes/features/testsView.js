const express = require("express");
const mongoose = require("mongoose");
const Test = require("../../models/Test");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// IPP-SEC-008: correct answers are never sent to Students or Recruiters
function hideAnswers(test) {
  const plain = typeof test.toObject === "function" ? test.toObject() : { ...test };
  plain.questions = (plain.questions || []).map((q) => ({
    _id: q._id,
    text: q.text,
    options: q.options,
  }));
  return plain;
}

router.get("/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid test id" });
    }
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: "Test not found" });

    if (req.user.role === "Admin") return res.json(test);
    return res.json(hideAnswers(test));
  } catch {
    return res.status(500).json({ error: "Could not load test" });
  }
});

module.exports = { mount: "/tests", router, hideAnswers };
