// IPP-SEC-005: strip MongoDB operator keys ($...) and dotted keys from user input
function strip(value) {
  if (Array.isArray(value)) {
    value.forEach(strip);
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
      } else {
        strip(value[key]);
      }
    }
  }
}

function sanitize(req, res, next) {
  strip(req.body);
  strip(req.query);
  strip(req.params);
  next();
}

module.exports = sanitize;
module.exports.strip = strip;
