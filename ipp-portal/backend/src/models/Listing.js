const mongoose = require("mongoose");

// Align these fields with the listing fields in the SRS (IPP-F-001).
const listingSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requiredSkills: [{ type: String, trim: true }],
    location: { type: String, trim: true },
    duration: { type: String, trim: true },
    stipend: { type: Number, min: 0 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ["Active", "Closed", "Removed"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", listingSchema);
