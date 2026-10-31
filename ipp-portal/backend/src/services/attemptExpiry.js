const Attempt = require("../models/Attempt");

const GRACE_MS = 15 * 1000;

// IPP-F-033: attempts whose time ran out (plus a short grace) and were never submitted are closed automatically.
// Called before a student starts a new attempt.
async function autoSubmitExpired(studentId, now = new Date()) {
  const cutoff = new Date(now.getTime() - GRACE_MS);
  return Attempt.updateMany(
    { student: studentId, submittedAt: null, expiresAt: { $lt: cutoff } },
    { $set: { submittedAt: now, autoSubmitted: true } }
  );
}

module.exports = { autoSubmitExpired, GRACE_MS };
