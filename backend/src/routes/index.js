const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/admin", require("./admin"));
router.use("/auth", require("./auth"));
router.use("/listings", require("./listings"));
router.use("/internships", require("./listings"));
router.use("/applications", require("./applications"));

// Sprint 2 feature routes
const attemptsStart = require("./features/attemptsStart");
router.use(attemptsStart.mount, attemptsStart.router);

module.exports = router;
