const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// IPP-F-050 register as Student or Recruiter, IPP-F-051 validation and duplicate rejection, IPP-SEC-001 hashed passwords
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Name is required" });
    if (typeof email !== "string" || !EMAIL_RX.test(email.trim())) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    if (typeof password !== "string" || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters with at least one letter and one digit" });
    }
    if (!["Student", "Recruiter"].includes(role)) {
      return res.status(400).json({ error: "Role must be Student or Recruiter" });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: cleanEmail })) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 10),
      role,
    });
    return res.status(201).json(publicUser(user));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    return res.status(500).json({ error: "Could not register" });
  }
});

// IPP-F-052 login, IPP-SEC-007 lockout after repeated failures
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      return res.status(423).json({ error: "Account temporarily locked after too many failed attempts. Try again later." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.failedLogins = 0;
      }
      await user.save();
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.role === "Recruiter" && user.approved === false) {
      return res.status(403).json({ error: "Your recruiter account is waiting for approval" });
    }

    user.failedLogins = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: "60m" });
    return res.json({ token, user: publicUser(user) });
  } catch {
    return res.status(500).json({ error: "Could not log in" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(publicUser(user));
  } catch {
    return res.status(500).json({ error: "Could not load profile" });
  }
});

module.exports = { mount: "/auth", router };
