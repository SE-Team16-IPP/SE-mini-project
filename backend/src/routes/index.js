const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/admin", require("./admin"));
router.use("/auth", require("./auth"));

module.exports = router;
