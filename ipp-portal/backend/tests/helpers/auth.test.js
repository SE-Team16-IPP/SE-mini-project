const jwt = require("jsonwebtoken");
const { tokenFor, bearer } = require("./auth");

describe("test helpers", () => {
  test("tokenFor signs the role and id", () => {
    const payload = jwt.verify(tokenFor("Recruiter", "r1"), process.env.JWT_SECRET);
    expect(payload.role).toBe("Recruiter");
    expect(payload.id).toBe("r1");
  });

  test("bearer builds the Authorization header value", () => {
    expect(bearer("Admin")).toMatch(/^Bearer /);
  });
});
