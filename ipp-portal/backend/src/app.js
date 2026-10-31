const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const sanitize = require("./middleware/sanitize");

const app = express();

app.use(cors());
app.use(express.json());
app.use(sanitize);
app.use("/api", routes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// After `npm run build` in frontend/, the API server also serves the web app on the same port
const dist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
}

module.exports = app;
