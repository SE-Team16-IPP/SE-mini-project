const express = require("express");
const Test = require("../../models/Test");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// IPP-F-031 browse aptitude tests, optionally by category: GET /api/tests?category=Quant
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (typeof req.query.category === "string" && req.query.category.trim()) {
      filter.category = new RegExp(`^${escapeRegex(req.query.category.trim())}$`, "i");
    }

    const tests = await Test.find(filter).select("title category timeLimitMinutes questions").sort({ title: 1 });

    return res.json(
      tests.map((t) => ({
        id: t._id,
        title: t.title,
        category: t.category,
        timeLimitMinutes: t.timeLimitMinutes,
        questionCount: (t.questions || []).length,
      }))
    );
  } catch {
    return res.status(500).json({ error: "Could not load tests" });
  }
});

module.exports = { mount: "/tests", router };
