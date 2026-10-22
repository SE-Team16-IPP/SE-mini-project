const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Example of a role-restricted route. Feature routes follow the same pattern:
// router.post("/listings", requireAuth, requireRole("Recruiter"), handler)
router.get("/ping", requireAuth, requireRole("Admin"), (req, res) => {
  res.json({ message: "admin access granted" });
});

module.exports = router;
