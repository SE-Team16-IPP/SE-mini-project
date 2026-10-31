const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

jest.mock("../src/models/Test", () => ({ findById: jest.fn() }));
jest.mock("../src/models/Attempt", () => ({ findOne: jest.fn(), create: jest.fn(), updateMany: jest.fn() }));

const Test = require("../src/models/Test");
const Attempt = require("../src/models/Attempt");
const feature = require("../src/routes/features/attemptsStart");
const { autoSubmitExpired, GRACE_MS } = require("../src/services/attemptExpiry");

const bearer = (role, id = "stu1") =>
  `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;

const app = express();
app.use(express.json());
app.use("/api" + feature.mount, feature.router);

const ID = "64b7f0f2a1b2c3d4e5f60718";

beforeEach(() => {
  jest.clearAllMocks();
  Attempt.updateMany.mockResolvedValue({});
});

describe("POST /api/tests/:id/start (IPP-F-032)", () => {
  test("only a Student can start a test", async () => {
    expect((await request(app).post(`/api/tests/${ID}/start`)).status).toBe(401);
    expect((await request(app).post(`/api/tests/${ID}/start`).set("Authorization", bearer("Admin"))).status).toBe(403);
  });

  test("creates an attempt whose deadline matches the time limit", async () => {
    Test.findById.mockResolvedValue({ _id: ID, timeLimitMinutes: 20 });
    Attempt.findOne.mockResolvedValue(null);
    Attempt.create.mockImplementation(async (doc) => ({ _id: "a1", ...doc }));

    const before = Date.now();
    const res = await request(app).post(`/api/tests/${ID}/start`).set("Authorization", bearer("Student"));

    expect(res.status).toBe(201);
    expect(res.body.attemptId).toBe("a1");
    expect(res.body.timeLimitMinutes).toBe(20);
    const created = Attempt.create.mock.calls[0][0];
    expect(created.student).toBe("stu1");
    const minutes = (new Date(created.expiresAt).getTime() - before) / 60000;
    expect(minutes).toBeGreaterThan(19.9);
    expect(minutes).toBeLessThan(20.1);
  });

  test("resumes a running attempt instead of creating a second one", async () => {
    Test.findById.mockResolvedValue({ _id: ID, timeLimitMinutes: 20 });
    Attempt.findOne.mockResolvedValue({ _id: "a0", startedAt: new Date(), expiresAt: new Date(Date.now() + 60000) });
    const res = await request(app).post(`/api/tests/${ID}/start`).set("Authorization", bearer("Student"));
    expect(res.status).toBe(200);
    expect(res.body.attemptId).toBe("a0");
    expect(Attempt.create).not.toHaveBeenCalled();
  });

  test("expired attempts are closed before a new one starts", async () => {
    Test.findById.mockResolvedValue({ _id: ID, timeLimitMinutes: 5 });
    Attempt.findOne.mockResolvedValue(null);
    Attempt.create.mockResolvedValue({ _id: "a2" });
    await request(app).post(`/api/tests/${ID}/start`).set("Authorization", bearer("Student"));
    expect(Attempt.updateMany).toHaveBeenCalled();
  });

  test("404 for an unknown test and 400 for a bad id", async () => {
    Test.findById.mockResolvedValue(null);
    expect((await request(app).post(`/api/tests/${ID}/start`).set("Authorization", bearer("Student"))).status).toBe(404);
    expect((await request(app).post("/api/tests/xyz/start").set("Authorization", bearer("Student"))).status).toBe(400);
  });
});

describe("autoSubmitExpired (IPP-F-033)", () => {
  test("closes only unsubmitted attempts past the deadline plus grace", async () => {
    Attempt.updateMany.mockResolvedValue({ modifiedCount: 1 });
    const now = new Date("2026-10-28T10:00:00Z");
    await autoSubmitExpired("stu1", now);

    const [filter, update] = Attempt.updateMany.mock.calls[0];
    expect(filter.student).toBe("stu1");
    expect(filter.submittedAt).toBeNull();
    expect(filter.expiresAt.$lt.getTime()).toBe(now.getTime() - GRACE_MS);
    expect(update.$set.autoSubmitted).toBe(true);
    expect(update.$set.submittedAt).toEqual(now);
  });
});
