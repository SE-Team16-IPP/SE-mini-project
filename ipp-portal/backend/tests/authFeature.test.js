const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";

jest.mock("../src/models/User", () => ({ findOne: jest.fn(), create: jest.fn(), findById: jest.fn() }));

const User = require("../src/models/User");
const feature = require("../src/routes/features/auth");

const app = express();
app.use(express.json());
app.use("/api" + feature.mount, feature.router);

const valid = { name: "Asha", email: "Asha@Example.com", password: "Passw0rd!", role: "Student" };

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/register (IPP-F-050, IPP-F-051, IPP-SEC-001)", () => {
  test("creates the account with a hashed password and a lower-case email", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (doc) => ({ _id: "u1", ...doc }));
    const res = await request(app).post("/api/auth/register").send(valid);
    expect(res.status).toBe(201);
    const saved = User.create.mock.calls[0][0];
    expect(saved.email).toBe("asha@example.com");
    expect(saved.password).not.toBe("Passw0rd!");
    expect(await bcrypt.compare("Passw0rd!", saved.password)).toBe(true);
    expect(res.body.password).toBeUndefined();
  });

  test.each([
    ["missing name", { name: "" }],
    ["bad email", { email: "not-an-email" }],
    ["short password", { password: "short" }],
    ["password without a digit", { password: "abcdefghij" }],
    ["password without a letter", { password: "1234567890" }],
    ["Admin role", { role: "Admin" }],
  ])("rejects %s", async (label, patch) => {
    const res = await request(app).post("/api/auth/register").send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  test("rejects an email that already exists", async () => {
    User.findOne.mockResolvedValue({ _id: "u1" });
    const res = await request(app).post("/api/auth/register").send(valid);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login (IPP-F-052, IPP-SEC-007)", () => {
  async function userDoc(extra = {}) {
    return {
      _id: "u1",
      name: "Asha",
      email: "asha@example.com",
      role: "Student",
      password: await bcrypt.hash("Passw0rd!", 4),
      failedLogins: 0,
      lockUntil: null,
      save: jest.fn().mockResolvedValue(true),
      ...extra,
    };
  }

  test("returns a signed token with the user's id and role", async () => {
    User.findOne.mockResolvedValue(await userDoc());
    const res = await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "Passw0rd!" });
    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ id: "u1", role: "Student" });
  });

  test("wrong password and unknown email give the same 401", async () => {
    User.findOne.mockResolvedValue(await userDoc());
    const wrong = await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "nope" });
    User.findOne.mockResolvedValue(null);
    const unknown = await request(app).post("/api/auth/login").send({ email: "x@example.com", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  test("the fifth failed attempt locks the account, and a locked account is refused", async () => {
    const doc = await userDoc({ failedLogins: 4 });
    User.findOne.mockResolvedValue(doc);
    await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "nope" });
    expect(doc.lockUntil).toBeInstanceOf(Date);

    const locked = await userDoc({ lockUntil: new Date(Date.now() + 60000) });
    User.findOne.mockResolvedValue(locked);
    const res = await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "Passw0rd!" });
    expect(res.status).toBe(423);
  });

  test("non-string credentials (operator injection) are rejected", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(res.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});
