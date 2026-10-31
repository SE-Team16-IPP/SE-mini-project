const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

jest.mock("../src/models/Test", () => ({ create: jest.fn() }));

const Test = require("../src/models/Test");
const feature = require("../src/routes/features/testsAdmin");

const bearer = (role, id = "adm1") =>
  `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;

const app = express();
app.use(express.json());
app.use("/api" + feature.mount, feature.router);

const valid = () => ({
  title: "Quant 1",
  category: "Quant",
  timeLimitMinutes: 15,
  questions: [
    { text: "1+1", options: ["1", "2", "3"], correctIndex: 1 },
    { text: "2+2", options: ["3", "4"], correctIndex: 1 },
  ],
});

beforeEach(() => jest.clearAllMocks());

describe("POST /api/tests (IPP-F-030)", () => {
  test("only an Admin may create a test", async () => {
    expect((await request(app).post("/api/tests").send(valid())).status).toBe(401);
    expect((await request(app).post("/api/tests").set("Authorization", bearer("Student")).send(valid())).status).toBe(403);
    expect((await request(app).post("/api/tests").set("Authorization", bearer("Recruiter")).send(valid())).status).toBe(403);
  });

  test("a valid test is saved with the admin as creator", async () => {
    Test.create.mockResolvedValue({ _id: "t1", title: "Quant 1", questions: [{}, {}] });
    const res = await request(app).post("/api/tests").set("Authorization", bearer("Admin")).send(valid());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "t1", title: "Quant 1", questionCount: 2 });
    expect(Test.create.mock.calls[0][0].createdBy).toBe("adm1");
  });

  test.each([
    ["missing title", (b) => { b.title = ""; }],
    ["missing category", (b) => { delete b.category; }],
    ["time limit of zero", (b) => { b.timeLimitMinutes = 0; }],
    ["time limit that is not a whole number", (b) => { b.timeLimitMinutes = 1.5; }],
    ["no questions", (b) => { b.questions = []; }],
    ["question with one option", (b) => { b.questions[0].options = ["only"]; }],
    ["question with a blank option", (b) => { b.questions[0].options = ["a", " "]; }],
    ["correct option out of range", (b) => { b.questions[0].correctIndex = 5; }],
    ["question without text", (b) => { b.questions[1].text = ""; }],
  ])("rejects %s", async (name, mutate) => {
    const body = valid();
    mutate(body);
    const res = await request(app).post("/api/tests").set("Authorization", bearer("Admin")).send(body);
    expect(res.status).toBe(400);
    expect(Test.create).not.toHaveBeenCalled();
  });

  test("database failure gives a 500", async () => {
    Test.create.mockRejectedValue(new Error("db"));
    const res = await request(app).post("/api/tests").set("Authorization", bearer("Admin")).send(valid());
    expect(res.status).toBe(500);
  });
});
