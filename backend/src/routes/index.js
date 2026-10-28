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
const testsAdmin = require("./features/testsAdmin");
router.use(testsAdmin.mount, testsAdmin.router);

module.exports = router;
