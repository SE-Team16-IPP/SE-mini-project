const request = require("supertest");
const express = require("express");
const { bearer } = require("./helpers/auth");

jest.mock("../src/models/Test", () => ({ find: jest.fn() }));
jest.mock("../src/models/Attempt", () => ({ findById: jest.fn() }));

const Test = require("../src/models/Test");
const Attempt = require("../src/models/Attempt");
const browse = require("../src/routes/features/testsBrowse");
const results = require("../src/routes/features/results");

const app = express();
app.use(express.json());
app.use("/api" + browse.mount, browse.router);
app.use("/api" + results.mount, results.router);

const ID = "64b7f0f2a1b2c3d4e5f60718";

beforeEach(() => jest.clearAllMocks());

describe("GET /api/tests (IPP-F-031)", () => {
  test("requires login", async () => {
    expect((await request(app).get("/api/tests")).status).toBe(401);
  });

  test("lists tests with a question count and no questions or answers", async () => {
    Test.find.mockReturnValue({
      select: () => ({
        sort: () =>
          Promise.resolve([
            { _id: "t1", title: "Aptitude 1", category: "Quant", timeLimitMinutes: 20, questions: [{}, {}, {}] },
          ]),
      }),
    });
    const res = await request(app).get("/api/tests").set("Authorization", bearer("Student"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "t1", title: "Aptitude 1", category: "Quant", timeLimitMinutes: 20, questionCount: 3 },
    ]);
  });

  test("category filter is exact and case-insensitive", async () => {
    Test.find.mockReturnValue({ select: () => ({ sort: () => Promise.resolve([]) }) });
    await request(app).get("/api/tests?category=quant").set("Authorization", bearer("Student"));
    const filter = Test.find.mock.calls[0][0];
    expect(filter.category.test("Quant")).toBe(true);
    expect(filter.category.test("Quantitative")).toBe(false);
  });
});

describe("GET /api/attempts/:id/result (IPP-F-035)", () => {
  const attemptDoc = (extra = {}) => ({
    _id: ID,
    student: "stu1",
    score: 1,
    submittedAt: new Date(),
    autoSubmitted: false,
    answers: [{ questionId: "q1", selectedIndex: 1 }, { questionId: "q2", selectedIndex: 0 }],
    test: {
      title: "Quant",
      questions: [
        { _id: "q1", text: "1+1", options: ["1", "2"], correctIndex: 1 },
        { _id: "q2", text: "2+2", options: ["3", "4"], correctIndex: 1 },
        { _id: "q3", text: "3+3", options: ["5", "6"], correctIndex: 1 },
      ],
    },
    ...extra,
  });

  const mockAttempt = (doc) => Attempt.findById.mockReturnValue({ populate: () => Promise.resolve(doc) });

  test("shows per-question correctness including unanswered questions", async () => {
    mockAttempt(attemptDoc());
    const res = await request(app).get(`/api/attempts/${ID}/result`).set("Authorization", bearer("Student", "stu1"));
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(1);
    expect(res.body.total).toBe(3);
    expect(res.body.results.map((r) => r.isCorrect)).toEqual([true, false, false]);
    expect(res.body.results[2].selectedIndex).toBeNull();
    expect(res.body.results[2].correctIndex).toBe(1);
  });

  test("another student cannot see it, an Admin can", async () => {
    mockAttempt(attemptDoc());
    expect((await request(app).get(`/api/attempts/${ID}/result`).set("Authorization", bearer("Student", "other"))).status).toBe(403);
    mockAttempt(attemptDoc());
    expect((await request(app).get(`/api/attempts/${ID}/result`).set("Authorization", bearer("Admin", "adm"))).status).toBe(200);
  });

  test("an attempt that is not submitted has no result yet", async () => {
    mockAttempt(attemptDoc({ submittedAt: null }));
    const res = await request(app).get(`/api/attempts/${ID}/result`).set("Authorization", bearer("Student", "stu1"));
    expect(res.status).toBe(400);
  });

  test("404 for unknown attempt and 400 for a bad id", async () => {
    mockAttempt(null);
    expect((await request(app).get(`/api/attempts/${ID}/result`).set("Authorization", bearer("Student"))).status).toBe(404);
    expect((await request(app).get("/api/attempts/xyz/result").set("Authorization", bearer("Student"))).status).toBe(400);
  });
});
