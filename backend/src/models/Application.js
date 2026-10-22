const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    resumePath: { type: String, required: true },
    coverNote: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Applied", "Under Review", "Shortlisted", "Rejected", "Selected", "Withdrawn"],
      default: "Applied",
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// One application per student per listing (duplicate rejection)
applicationSchema.index({ student: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
