const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, selectedIndex: Number }],
    score: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
