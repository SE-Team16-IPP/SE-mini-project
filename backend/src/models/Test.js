const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: {
      type: [String],
      validate: (v) => v.length >= 2,
    },
    correctIndex: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    timeLimitMinutes: { type: Number, required: true, min: 1 },
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);
