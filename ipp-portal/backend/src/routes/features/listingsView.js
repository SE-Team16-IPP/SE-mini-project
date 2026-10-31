const express = require("express");
const mongoose = require("mongoose");
const Listing = require("../../models/Listing");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// IPP-F-003 paginated list of active listings
// IPP-F-004 keyword search (?q=) over title, company and required skills
// IPP-F-006 listings past their deadline are not shown
router.get("/", requireAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const filter = { status: "Active", deadline: { $gt: new Date() } };
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: rx }, { company: rx }, { requiredSkills: rx }];
    }

    const [data, total] = await Promise.all([
      Listing.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Listing.countDocuments(filter),
    ]);

    return res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch {
    return res.status(500).json({ error: "Could not load listings" });
  }
});

// IPP-F-007 full details of one listing
router.get("/:id", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const open = listing.status === "Active" && new Date(listing.deadline) > new Date();
    if (req.user.role === "Student" && !open) {
      return res.status(404).json({ error: "Listing not found" });
    }
    return res.json(listing);
  } catch {
    return res.status(500).json({ error: "Could not load listing" });
  }
});

module.exports = { mount: "/listings", router };
