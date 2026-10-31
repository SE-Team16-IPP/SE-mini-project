const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// tokenFor("Student") -> "Bearer ..." header value for supertest: .set("Authorization", bearer("Student"))
function tokenFor(role, id = "user1") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

function bearer(role, id) {
  return `Bearer ${tokenFor(role, id)}`;
}

module.exports = { tokenFor, bearer };
