const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const sanitize = require("./middleware/sanitize");

const app = express();

app.use(cors());
app.use(express.json());
app.use(sanitize);
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

module.exports = app;
