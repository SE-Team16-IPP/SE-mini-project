const express = require("express");
const mongoose = require("mongoose");
const Listing = require("../../models/Listing");
const Application = require("../../models/Application");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

const STATUSES = ["Under Review", "Shortlisted", "Rejected", "Selected"];

// IPP-F-015 a Recruiter sees applicants of their own listings only
router.get("/listings/:id/applicants", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (String(listing.recruiter) !== req.user.id) {
      return res.status(403).json({ error: "This is not your listing" });
    }

    const applicants = await Application.find({ listing: listing._id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    return res.json({ listing: { id: listing._id, title: listing.title }, applicants });
  } catch {
    return res.status(500).json({ error: "Could not load applicants" });
  }
});

// IPP-F-016 a Recruiter sets the status of an application on their own listing
router.patch("/applications/:id/status", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid application id" });
    }
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}` });
    }

    const application = await Application.findById(req.params.id).populate("listing");
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (!application.listing || String(application.listing.recruiter) !== req.user.id) {
      return res.status(403).json({ error: "This application is not on your listing" });
    }

    application.status = status;
    application.statusHistory.push({ status });
    await application.save();

    return res.json({ id: application._id, status: application.status });
  } catch {
    return res.status(500).json({ error: "Could not update status" });
  }
});

module.exports = { mount: "/", router, STATUSES };
