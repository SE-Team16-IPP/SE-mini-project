const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// IPP-F-050: Register as Student or Recruiter
// IPP-F-051: Email validation and duplicate rejection
// IPP-SEC-001: Passwords stored as salted bcrypt hashes
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    if (!password || typeof password !== "string" || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters and contain at least one letter and one number",
      });
    }

    const allowedRoles = ["Student", "Recruiter"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Role must be either Student or Recruiter" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // IPP-SEC-001: Salted hash using bcrypt (cost factor 10)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Recruiters require admin approval before posting listings (IPP-F-054)
    const approved = role === "Student";

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      approved,
      failedLogins: 0,
      lockUntil: null,
    });

    await user.save();

    return res.status(201).json({
      message: "Account registered successfully",
      userId: user._id,
      role: user.role,
      approved: user.approved,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
});

// IPP-F-052: Login with email and password
// IPP-SEC-007: Account lockout after 5 failed attempts for 15 minutes
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check account lockout
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
      return res.status(423).json({
        error: `Account is temporarily locked due to repeated failed login attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      }
      await user.save();
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Successful login: reset failed attempts
    user.failedLogins = 0;
    user.lockUntil = null;
    await user.save();

    const secret = process.env.JWT_SECRET || "default_jwt_secret";
    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
      secret,
      { expiresIn: "60m" }
    );

    return res.json({
      token,
      role: user.role,
      expiresIn: "60m",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

// Current user profile
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch user" });
  }
});

module.exports = router;
