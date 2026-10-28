const express = require("express");
const Application = require("../models/Application");
const Listing = require("../models/Listing");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /mine - Retrieve all applications for the logged-in Student
router.get("/mine", requireAuth, requireRole("Student"), async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate("listing")
      .sort({ createdAt: -1 });
    return res.json({ applications });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch applications", details: err.message });
  }
});

// GET /:id - Retrieve application by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("listing")
      .populate("student", "name email");

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    const studentId = String(application.student?._id || application.student);
    const isOwner = studentId === String(req.user.id);

    if (!isOwner && req.user.role !== "Admin" && req.user.role !== "Recruiter") {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json({ application });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch application", details: err.message });
  }
});

// POST / - Apply with resume and optional cover note (IPP-F-010)
router.post("/", requireAuth, requireRole("Student"), async (req, res) => {
  try {
    const { listingId, listing: bodyListingId, resumePath, coverNote } = req.body;
    const targetListingId = listingId || bodyListingId;

    if (!targetListingId) {
      return res.status(400).json({ error: "listingId is required" });
    }
    if (!resumePath || !String(resumePath).trim()) {
      return res.status(400).json({ error: "resumePath is required" });
    }

    const listing = await Listing.findById(targetListingId);
    if (!listing || listing.status === "Removed") {
      return res.status(404).json({ error: "Listing not found" });
    }

    // IPP-F-012: applications are closed after the deadline (or once a listing is closed)
    if (listing.status !== "Active") {
      return res.status(400).json({ error: "Listing is no longer active" });
    }

    if (listing.deadline && new Date(listing.deadline) < new Date()) {
      return res.status(410).json({ error: "Application deadline has passed" });
    }

    // IPP-F-011: one application per student per listing
    const existing = await Application.findOne({
      student: req.user.id,
      listing: listing._id,
    });
    if (existing) {
      return res.status(409).json({ error: "You have already applied to this listing" });
    }

    const application = new Application({
      student: req.user.id,
      listing: listing._id,
      resumePath: String(resumePath).trim(),
      coverNote: coverNote ? String(coverNote).trim() : "",
      status: "Applied",
      statusHistory: [{ status: "Applied", changedAt: new Date() }],
    });

    await application.save();

    return res.status(201).json({
      message: "Application submitted successfully",
      applicationId: application._id,
      application,
    });
  } catch (err) {
    // Catch Mongo duplicate key error in case of race condition
    if (err.code === 11000) {
      return res.status(409).json({ error: "You have already applied to this listing" });
    }
    return res.status(500).json({ error: "Failed to submit application", details: err.message });
  }
});

module.exports = router;
