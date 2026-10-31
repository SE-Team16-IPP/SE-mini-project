const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";
const app = require("../src/app");

const tokenFor = (role) => jwt.sign({ id: "u1", role }, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("role-based access (IPP-F-053, IPP-SEC-004)", () => {
  test("rejects request without a token", async () => {
    const res = await request(app).get("/api/admin/ping");
    expect(res.status).toBe(401);
  });

  test("rejects an invalid token", async () => {
    const res = await request(app).get("/api/admin/ping").set("Authorization", "Bearer not-a-token");
    expect(res.status).toBe(401);
  });

  test("rejects a Student on an Admin route", async () => {
    const res = await request(app).get("/api/admin/ping").set("Authorization", `Bearer ${tokenFor("Student")}`);
    expect(res.status).toBe(403);
  });

  test("allows an Admin on an Admin route", async () => {
    const res = await request(app).get("/api/admin/ping").set("Authorization", `Bearer ${tokenFor("Admin")}`);
    expect(res.status).toBe(200);
  });
});
