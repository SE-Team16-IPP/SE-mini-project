const express = require("express");
const Listing = require("../models/Listing");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET / - List all active internship listings for Students
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find({ status: "Active" }).sort({ createdAt: -1 });
    return res.json({ listings });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch listings", details: err.message });
  }
});

// GET /:id - Retrieve single listing by ID
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing || listing.status === "Removed") {
      return res.status(404).json({ error: "Listing not found" });
    }
    return res.json({ listing });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch listing", details: err.message });
  }
});

// POST / - Recruiter creates a new internship listing with all 8 fields (IPP-F-001)
router.post("/", requireAuth, requireRole("Recruiter"), async (req, res) => {
  try {
    // Check recruiter approval status
    const recruiter = await User.findById(req.user.id);
    if (recruiter && recruiter.approved === false) {
      return res.status(403).json({ error: "Recruiter account is pending admin approval" });
    }

    const {
      title,
      company,
      description,
      requiredSkills,
      location,
      duration,
      stipend,
      deadline,
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Listing title is required" });
    }
    if (!company || !company.trim()) {
      return res.status(400).json({ error: "Company name is required" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!deadline) {
      return res.status(400).json({ error: "Application deadline is required" });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ error: "Invalid deadline date format" });
    }
    if (deadlineDate <= new Date()) {
      return res.status(400).json({ error: "Deadline must be a future date" });
    }

    let parsedStipend = 0;
    if (stipend !== undefined && stipend !== null && stipend !== "") {
      parsedStipend = Number(stipend);
      if (isNaN(parsedStipend) || parsedStipend < 0) {
        return res.status(400).json({ error: "Stipend must be a non-negative number" });
      }
    }

    let parsedSkills = [];
    if (Array.isArray(requiredSkills)) {
      parsedSkills = requiredSkills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof requiredSkills === "string" && requiredSkills.trim()) {
      parsedSkills = requiredSkills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const listing = new Listing({
      recruiter: req.user.id,
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      requiredSkills: parsedSkills,
      location: location ? location.trim() : "",
      duration: duration ? duration.trim() : "",
      stipend: parsedStipend,
      deadline: deadlineDate,
      status: "Active",
    });

    await listing.save();

    return res.status(201).json({
      message: "Listing created successfully",
      listing,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create listing", details: err.message });
  }
});

module.exports = router;
