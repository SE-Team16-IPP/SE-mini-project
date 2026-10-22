const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, selectedIndex: Number }],
    score: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
