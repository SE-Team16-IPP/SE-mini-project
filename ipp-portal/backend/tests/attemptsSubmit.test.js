const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";

jest.mock("../src/models/Attempt", () => ({ findById: jest.fn() }));
jest.mock("../src/models/Test", () => ({ findById: jest.fn() }));

const Attempt = require("../src/models/Attempt");
const Test = require("../src/models/Test");
const submit = require("../src/routes/features/attemptsSubmit");
const view = require("../src/routes/features/testsView");

const ID = "64b7f0f2a1b2c3d4e5f60718";
const tokenFor = (role, id = "stu1") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });

const app = express();
app.use(express.json());
app.use("/api" + submit.mount, submit.router);
app.use("/api" + view.mount, view.router);

const testDoc = {
  _id: ID,
  title: "Quant",
  questions: [
    { _id: "q1", text: "1+1", options: ["1", "2"], correctIndex: 1 },
    { _id: "q2", text: "2+2", options: ["3", "4"], correctIndex: 1 },
  ],
};

function makeAttempt(extra = {}) {
  return {
    _id: ID,
    student: "stu1",
    test: ID,
    submittedAt: null,
    expiresAt: new Date(Date.now() + 60000),
    save: jest.fn().mockResolvedValue(true),
    ...extra,
  };
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/attempts/:id/submit", () => {
  test("requires a Student token", async () => {
    expect((await request(app).post(`/api/attempts/${ID}/submit`)).status).toBe(401);
    const res = await request(app)
      .post(`/api/attempts/${ID}/submit`)
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`);
    expect(res.status).toBe(403);
  });

  test("scores on the server and ignores a client supplied score", async () => {
    const attempt = makeAttempt();
    Attempt.findById.mockResolvedValue(attempt);
    Test.findById.mockResolvedValue(testDoc);

    const res = await request(app)
      .post(`/api/attempts/${ID}/submit`)
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({ score: 99, answers: [{ questionId: "q1", selectedIndex: 1 }, { questionId: "q2", selectedIndex: 0 }] });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(1);
    expect(res.body.total).toBe(2);
    expect(attempt.score).toBe(1);
    expect(attempt.submittedAt).toBeInstanceOf(Date);
    expect(attempt.save).toHaveBeenCalled();
  });

  test("marks auto submitted when the client says so", async () => {
    const attempt = makeAttempt();
    Attempt.findById.mockResolvedValue(attempt);
    Test.findById.mockResolvedValue(testDoc);
    await request(app)
      .post(`/api/attempts/${ID}/submit`)
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({ auto: true, answers: [] });
    expect(attempt.autoSubmitted).toBe(true);
  });

  test("rejects someone else's attempt", async () => {
    Attempt.findById.mockResolvedValue(makeAttempt({ student: "other" }));
    const res = await request(app)
      .post(`/api/attempts/${ID}/submit`)
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({ answers: [] });
    expect(res.status).toBe(403);
  });

  test("rejects a second submission", async () => {
    Attempt.findById.mockResolvedValue(makeAttempt({ submittedAt: new Date() }));
    const res = await request(app)
      .post(`/api/attempts/${ID}/submit`)
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({ answers: [] });
    expect(res.status).toBe(409);
  });

  test("closes an attempt that is past the time limit plus grace", async () => {
    const attempt = makeAttempt({ expiresAt: new Date(Date.now() - 60000) });
    Attempt.findById.mockResolvedValue(attempt);
    const res = await request(app)
      .post(`/api/attempts/${ID}/submit`)
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({ answers: [{ questionId: "q1", selectedIndex: 1 }] });
    expect(res.status).toBe(400);
    expect(attempt.autoSubmitted).toBe(true);
    expect(attempt.score).toBeUndefined();
  });

  test("invalid id returns 400", async () => {
    const res = await request(app)
      .post("/api/attempts/not-an-id/submit")
      .set("Authorization", `Bearer ${tokenFor("Student")}`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tests/:id hides answers (IPP-SEC-008)", () => {
  test("Student never receives correctIndex", async () => {
    Test.findById.mockResolvedValue(testDoc);
    const res = await request(app).get(`/api/tests/${ID}`).set("Authorization", `Bearer ${tokenFor("Student")}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("correctIndex");
    expect(res.body.questions).toHaveLength(2);
  });

  test("Admin receives the full test", async () => {
    Test.findById.mockResolvedValue(testDoc);
    const res = await request(app).get(`/api/tests/${ID}`).set("Authorization", `Bearer ${tokenFor("Admin")}`);
    expect(res.body.questions[0].correctIndex).toBe(1);
  });

  test("404 when missing and 401 without a token", async () => {
    Test.findById.mockResolvedValue(null);
    expect((await request(app).get(`/api/tests/${ID}`).set("Authorization", `Bearer ${tokenFor("Student")}`)).status).toBe(404);
    expect((await request(app).get(`/api/tests/${ID}`)).status).toBe(401);
  });
});
