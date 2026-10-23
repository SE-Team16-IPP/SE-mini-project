const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/admin", require("./admin"));
router.use("/listings", require("./listings"));
router.use("/internships", require("./listings"));

module.exports = router;
