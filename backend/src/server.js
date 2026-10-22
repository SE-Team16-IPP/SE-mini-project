require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set. Copy .env.example to .env");
  }
  await connectDB(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ipp");
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
