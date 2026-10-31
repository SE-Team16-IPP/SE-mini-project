module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!src/config/**"],
  coverageReporters: ["text", "lcov"],
};
