const fs = require("fs");
const path = require("path");
const multer = require("multer");

// IPP-F-013: only PDF resumes up to 5 MB
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function fileFilter(req, file, cb) {
  const isPdf =
    file.mimetype === "application/pdf" && path.extname(file.originalname || "").toLowerCase() === ".pdf";
  if (!isPdf) {
    const err = new Error("Only PDF files are allowed");
    err.status = 400;
    return cb(err);
  }
  return cb(null, true);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "..", "uploads", "resumes");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`),
});

const upload = multer({ storage, limits: { fileSize: MAX_RESUME_BYTES }, fileFilter });

// uploadResume("resume") replaces multer's upload.single("resume") and turns upload errors into JSON
function uploadResume(field = "resume") {
  const single = upload.single(field);
  return (req, res, next) =>
    single(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Resume must be 5 MB or smaller" });
      }
      return res.status(err.status || 400).json({ error: err.message });
    });
}

function readHeader(file) {
  if (file.buffer) return file.buffer.subarray(0, 4).toString("latin1");
  if (file.path) {
    const fd = fs.openSync(file.path, "r");
    try {
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0);
      return buf.toString("latin1");
    } finally {
      fs.closeSync(fd);
    }
  }
  return "";
}

function discard(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

// Runs after uploadResume: checks the file really is a PDF (not just named .pdf) and within the size limit
function validateResume(req, res, next) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Resume is required" });

  if (file.size > MAX_RESUME_BYTES) {
    discard(file);
    return res.status(400).json({ error: "Resume must be 5 MB or smaller" });
  }
  if (readHeader(file) !== "%PDF") {
    discard(file);
    return res.status(400).json({ error: "Resume is not a valid PDF" });
  }
  return next();
}

module.exports = { uploadResume, validateResume, fileFilter, MAX_RESUME_BYTES };
