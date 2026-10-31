// IPP-SO-1 confidentiality, IPP-SO-2 integrity, IPP-SO-3 authenticated access only.
// These checks use the real app. Every case is rejected before any database call is made.
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { bearer } = require("./helpers/auth");

const app = require("../src/app");

const ID = "64b7f0f2a1b2c3d4e5f60718";

describe("IPP-SO-3: authenticated access only", () => {
  const protectedRoutes = [
    ["get", "/api/listings"],
    ["get", `/api/listings/${ID}`],
    ["get", `/api/listings/${ID}/applicants`],
    ["patch", `/api/applications/${ID}/status`],
    ["get", "/api/tests"],
    ["get", `/api/tests/${ID}`],
    ["post", "/api/tests"],
    ["post", `/api/attempts/${ID}/submit`],
    ["get", `/api/attempts/${ID}/result`],
    ["get", "/api/admin/ping"],
  ];

  test.each(protectedRoutes)("%s %s rejects a request with no token", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });

  test("a token signed with the wrong secret is rejected", async () => {
    const forged = jwt.sign({ id: "x", role: "Admin" }, "not-the-real-secret");
    const res = await request(app).get("/api/admin/ping").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test("an expired token is rejected", async () => {
    const old = jwt.sign({ id: "x", role: "Admin" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/admin/ping").set("Authorization", `Bearer ${old}`);
    expect(res.status).toBe(401);
  });
});

describe("IPP-SO-1 and IPP-SO-2: roles protect data and state", () => {
  test("a Student cannot see applicants of a listing", async () => {
    const res = await request(app).get(`/api/listings/${ID}/applicants`).set("Authorization", bearer("Student"));
    expect(res.status).toBe(403);
  });

  test("a Student cannot change an application status", async () => {
    const res = await request(app)
      .patch(`/api/applications/${ID}/status`)
      .set("Authorization", bearer("Student"))
      .send({ status: "Selected" });
    expect(res.status).toBe(403);
  });

  test("only an Admin can create a test", async () => {
    for (const role of ["Student", "Recruiter"]) {
      const res = await request(app).post("/api/tests").set("Authorization", bearer(role)).send({});
      expect(res.status).toBe(403);
    }
  });

  test("only a Student can submit an attempt", async () => {
    for (const role of ["Recruiter", "Admin"]) {
      const res = await request(app).post(`/api/attempts/${ID}/submit`).set("Authorization", bearer(role)).send({});
      expect(res.status).toBe(403);
    }
  });
});
