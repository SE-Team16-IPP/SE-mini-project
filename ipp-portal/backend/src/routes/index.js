const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/admin", require("./admin"));

// Auto-mount every file in routes/features. Each exports { mount, router }.
const fs = require("fs");
const path = require("path");
const featuresDir = path.join(__dirname, "features");
if (fs.existsSync(featuresDir)) {
  fs.readdirSync(featuresDir)
    .filter((file) => file.endsWith(".js"))
    .sort()
    .forEach((file) => {
      const feature = require(path.join(featuresDir, file));
      router.use(feature.mount, feature.router);
    });
}

module.exports = router;
