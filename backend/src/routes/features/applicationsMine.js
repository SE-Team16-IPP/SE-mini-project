const express = require("express");
const Application = require("../../models/Application");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

// IPP-F-020 a Student sees all of their own applications with the current status
router.get("/applications/mine", requireAuth, requireRole("Student"), async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate("listing", "title company deadline status")
      .sort({ createdAt: -1 });

    return res.json(
      applications.map((a) => ({
        id: a._id,
        listing: a.listing,
        status: a.status,
        appliedAt: a.createdAt,
        statusHistory: a.statusHistory || [],
      }))
    );
  } catch {
    return res.status(500).json({ error: "Could not load your applications" });
  }
});

module.exports = { mount: "/", router };
