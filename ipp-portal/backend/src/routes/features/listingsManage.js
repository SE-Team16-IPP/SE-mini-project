const express = require("express");
const mongoose = require("mongoose");
const Listing = require("../../models/Listing");
const Application = require("../../models/Application");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

function parseSkills(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// Returns { error } or { data } for the editable listing fields
function readListing(body, { partial = false } = {}) {
  const data = {};
  const text = (key, label, required) => {
    if (body[key] === undefined) {
      if (required && !partial) return `${label} is required`;
      return null;
    }
    if (typeof body[key] !== "string" || !body[key].trim()) return `${label} is required`;
    data[key] = body[key].trim();
    return null;
  };

  const problems = [text("title", "Title", true), text("company", "Company", true), text("description", "Description", true)];
  const failed = problems.find(Boolean);
  if (failed) return { error: failed };

  if (body.location !== undefined) data.location = String(body.location).trim();
  if (body.duration !== undefined) data.duration = String(body.duration).trim();
  if (body.requiredSkills !== undefined) data.requiredSkills = parseSkills(body.requiredSkills);

  if (body.stipend !== undefined && body.stipend !== "") {
    const stipend = Number(body.stipend);
    if (!Number.isFinite(stipend) || stipend < 0) return { error: "Stipend must be a number, zero or more" };
    data.stipend = stipend;
  }

  if (body.deadline === undefined) {
    if (!partial) return { error: "Deadline is required" };
  } else {
    const deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) return { error: "Deadline is not a valid date" };
    if (deadline.getTime() <= Date.now()) return { error: "Deadline must be in the future" };
    data.deadline = deadline;
  }
  return { data };
}

// IPP-F-001 Recruiter creates a listing
router.post("/", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    const { error, data } = readListing(req.body || {});
    if (error) return res.status(400).json({ error });
    const listing = await Listing.create({ ...data, recruiter: req.user.id });
    return res.status(201).json(listing);
  } catch {
    return res.status(500).json({ error: "Could not create listing" });
  }
});

// A Recruiter's own listings with applicant counts (must be registered before GET /:id in listingsView)
router.get("/mine", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    const listings = await Listing.find({ recruiter: req.user.id }).sort({ createdAt: -1 });
    const withCounts = await Promise.all(
      listings.map(async (l) => ({
        ...l.toObject(),
        applicantCount: await Application.countDocuments({ listing: l._id }),
      }))
    );
    return res.json(withCounts);
  } catch {
    return res.status(500).json({ error: "Could not load your listings" });
  }
});

async function loadOwned(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ error: "Invalid listing id" });
    return null;
  }
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return null;
  }
  if (String(listing.recruiter) !== req.user.id) {
    res.status(403).json({ error: "This is not your listing" });
    return null;
  }
  return listing;
}

// IPP-F-002 edit own listing
router.patch("/:id", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    const listing = await loadOwned(req, res);
    if (!listing) return undefined;
    const { error, data } = readListing(req.body || {}, { partial: true });
    if (error) return res.status(400).json({ error });
    listing.set(data);
    await listing.save();
    return res.json(listing);
  } catch {
    return res.status(500).json({ error: "Could not update listing" });
  }
});

// IPP-F-002 close own listing
router.post("/:id/close", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    const listing = await loadOwned(req, res);
    if (!listing) return undefined;
    listing.status = "Closed";
    await listing.save();
    return res.json(listing);
  } catch {
    return res.status(500).json({ error: "Could not close listing" });
  }
});

module.exports = { mount: "/listings", router, readListing };
