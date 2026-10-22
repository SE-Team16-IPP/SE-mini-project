const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // store a bcrypt hash only
    role: { type: String, enum: ["Student", "Recruiter", "Admin"], required: true },
    approved: { type: Boolean, default: true }, // set false for new Recruiters until Admin approves
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
