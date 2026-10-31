const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const Listing = require("../../models/Listing");
const Application = require("../../models/Application");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { uploadResume, validateResume } = require("../../middleware/resumeUpload");

const router = express.Router();

const RESUME_DIR = path.join(__dirname, "..", "..", "..", "uploads", "resumes");

function discard(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

// IPP-F-010 apply with a resume and an optional cover note
// IPP-F-011 one application per listing, IPP-F-012 no applications after the deadline, IPP-F-013 PDF up to 5 MB
router.post(
  "/listings/:id/apply",
  requireAuth,
  requireRole("Student"),
  uploadResume("resume"),
  validateResume,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        discard(req.file);
        return res.status(400).json({ error: "Invalid listing id" });
      }
      const listing = await Listing.findById(req.params.id);
      if (!listing) {
        discard(req.file);
        return res.status(404).json({ error: "Listing not found" });
      }
      if (listing.status !== "Active" || new Date(listing.deadline) < new Date()) {
        discard(req.file);
        return res.status(400).json({ error: "Applications for this listing are closed" });
      }
      if (await Application.findOne({ student: req.user.id, listing: listing._id })) {
        discard(req.file);
        return res.status(409).json({ error: "You have already applied to this listing" });
      }

      const application = await Application.create({
        student: req.user.id,
        listing: listing._id,
        resumePath: req.file.filename,
        coverNote: typeof req.body.coverNote === "string" ? req.body.coverNote.trim().slice(0, 1000) : "",
        statusHistory: [{ status: "Applied" }],
      });
      return res.status(201).json({ id: application._id, status: application.status });
    } catch (err) {
      discard(req.file);
      if (err && err.code === 11000) {
        return res.status(409).json({ error: "You have already applied to this listing" });
      }
      return res.status(500).json({ error: "Could not submit application" });
    }
  }
);

// IPP-SEC-006 resumes can be opened only by the student who applied, the listing's recruiter, or an Admin
router.get("/applications/:id/resume", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid application id" });
    }
    const application = await Application.findById(req.params.id).populate("listing");
    if (!application) return res.status(404).json({ error: "Application not found" });

    const isStudent = String(application.student) === req.user.id;
    const isRecruiter =
      req.user.role === "Recruiter" && application.listing && String(application.listing.recruiter) === req.user.id;
    if (!isStudent && !isRecruiter && req.user.role !== "Admin") {
      return res.status(403).json({ error: "You cannot open this resume" });
    }

    const file = path.join(RESUME_DIR, path.basename(application.resumePath));
    if (!fs.existsSync(file)) return res.status(404).json({ error: "Resume file not found" });
    res.type("application/pdf");
    return res.sendFile(file);
  } catch {
    return res.status(500).json({ error: "Could not load resume" });
  }
});

module.exports = { mount: "/", router };
