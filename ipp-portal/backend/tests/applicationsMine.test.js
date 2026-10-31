const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

jest.mock("../src/models/Application", () => ({ find: jest.fn() }));

const Application = require("../src/models/Application");
const feature = require("../src/routes/features/applicationsMine");

const bearer = (role, id = "stu1") =>
  `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;

const app = express();
app.use(express.json());
app.use("/api" + feature.mount, feature.router);

beforeEach(() => jest.clearAllMocks());

describe("GET /api/applications/mine (IPP-F-020)", () => {
  test("only a Student can use it", async () => {
    expect((await request(app).get("/api/applications/mine")).status).toBe(401);
    expect((await request(app).get("/api/applications/mine").set("Authorization", bearer("Recruiter"))).status).toBe(403);
  });

  test("returns only the student's own applications with status", async () => {
    Application.find.mockReturnValue({
      populate: () => ({
        sort: () =>
          Promise.resolve([
            {
              _id: "a1",
              listing: { title: "SDE Intern", company: "Acme" },
              status: "Shortlisted",
              createdAt: new Date("2026-10-20"),
              statusHistory: [{ status: "Shortlisted" }],
            },
          ]),
      }),
    });
    const res = await request(app).get("/api/applications/mine").set("Authorization", bearer("Student", "stu1"));
    expect(res.status).toBe(200);
    expect(Application.find).toHaveBeenCalledWith({ student: "stu1" });
    expect(res.body[0]).toMatchObject({ id: "a1", status: "Shortlisted" });
    expect(res.body[0].listing.title).toBe("SDE Intern");
  });

  test("an empty list is fine", async () => {
    Application.find.mockReturnValue({ populate: () => ({ sort: () => Promise.resolve([]) }) });
    const res = await request(app).get("/api/applications/mine").set("Authorization", bearer("Student"));
    expect(res.body).toEqual([]);
  });
});
