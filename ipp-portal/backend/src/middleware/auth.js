const jwt = require("jsonwebtoken");

const ROLES = ["Student", "Recruiter", "Admin"];

// Reads "Authorization: Bearer <token>", verifies it and sets req.user = { id, role }.
// The login route must sign tokens with the same JWT_SECRET: jwt.sign({ id, role }, secret, { expiresIn })
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Server-side role check. Use after requireAuth: requireRole("Recruiter", "Admin")
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, ROLES };
