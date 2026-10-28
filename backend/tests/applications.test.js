const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";
const app = require("../src/app");
const Application = require("../src/models/Application");
const Listing = require("../src/models/Listing");

const tokenFor = (role, id = "66f000000000000000000002") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("IPP-F-010: Apply with resume and cover note", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const mockListingId = "66f000000000000000000099";
  const mockStudentId = "66f000000000000000000002";

  const activeListing = {
    _id: mockListingId,
    title: "Software Engineering Intern",
    company: "Acme Corp",
    status: "Active",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days future
  };

  test("rejects application without token (401)", async () => {
    const res = await request(app).post("/api/applications").send({
      listingId: mockListingId,
      resumePath: "https://example.com/resumes/john_doe.pdf",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  test("rejects application by a Recruiter (403)", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({
        listingId: mockListingId,
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permission/i);
  });

  test("rejects application when missing listingId (400)", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/listingId/i);
  });

  test("rejects application when missing resumePath (400)", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({
        listingId: mockListingId,
        resumePath: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/resumePath/i);
  });

  test("returns 404 if listing does not exist", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue(null);

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({
        listingId: "nonexistent",
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Listing not found/i);
  });

  test("returns 400 if listing is not Active (e.g. Closed) (IPP-F-012)", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue({
      ...activeListing,
      status: "Closed",
    });

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({
        listingId: mockListingId,
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer active/i);
  });

  test("returns 410 if listing deadline has passed (IPP-F-012)", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue({
      ...activeListing,
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send({
        listingId: mockListingId,
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/deadline has passed/i);
  });

  test("rejects duplicate application by same student for same listing (409) (IPP-F-011)", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue(activeListing);
    jest.spyOn(Application, "findOne").mockResolvedValue({
      _id: "app1",
      student: mockStudentId,
      listing: mockListingId,
    });

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student", mockStudentId)}`)
      .send({
        listingId: mockListingId,
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already applied/i);
  });

  test("catches duplicate key error (code 11000) on save during race condition (409) (IPP-F-011)", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue(activeListing);
    jest.spyOn(Application, "findOne").mockResolvedValue(null);
    const duplicateErr = new Error("E11000 duplicate key error");
    duplicateErr.code = 11000;
    jest.spyOn(Application.prototype, "save").mockRejectedValue(duplicateErr);

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student", mockStudentId)}`)
      .send({
        listingId: mockListingId,
        resumePath: "https://example.com/resumes/john_doe.pdf",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already applied/i);
  });

  test("successfully creates application with resume and optional cover note (201)", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue(activeListing);
    jest.spyOn(Application, "findOne").mockResolvedValue(null);
    jest.spyOn(Application.prototype, "save").mockImplementation(function () {
      return Promise.resolve(this);
    });

    const payload = {
      listingId: mockListingId,
      resumePath: "https://storage.googleapis.com/resumes/john_doe.pdf",
      coverNote: "I have strong experience in React and Node.js and would love to contribute.",
    };

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${tokenFor("Student", mockStudentId)}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Application submitted successfully/i);
    expect(res.body.application).toBeDefined();

    const appData = res.body.application;
    expect(String(appData.student)).toBe(mockStudentId);
    expect(String(appData.listing)).toBe(mockListingId);
    expect(appData.resumePath).toBe(payload.resumePath);
    expect(appData.coverNote).toBe(payload.coverNote);
    expect(appData.status).toBe("Applied");
    expect(Array.isArray(appData.statusHistory)).toBe(true);
    expect(appData.statusHistory[0].status).toBe("Applied");
  });

  test("GET /api/applications/mine returns student applications", async () => {
    const mockApps = [
      {
        _id: "app1",
        student: mockStudentId,
        listing: activeListing,
        resumePath: "https://example.com/resume.pdf",
        status: "Applied",
      },
    ];

    jest.spyOn(Application, "find").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockApps),
      }),
    });

    const res = await request(app)
      .get("/api/applications/mine")
      .set("Authorization", `Bearer ${tokenFor("Student", mockStudentId)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
    expect(res.body.applications.length).toBe(1);
    expect(res.body.applications[0].status).toBe("Applied");
  });

  test("GET /api/applications/:id returns application for owner", async () => {
    const mockApp = {
      _id: "app1",
      student: { _id: mockStudentId, name: "John Doe", email: "john@example.com" },
      listing: activeListing,
      status: "Applied",
    };

    jest.spyOn(Application, "findById").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockApp),
      }),
    });

    const res = await request(app)
      .get("/api/applications/app1")
      .set("Authorization", `Bearer ${tokenFor("Student", mockStudentId)}`);

    expect(res.status).toBe(200);
    expect(res.body.application._id).toBe("app1");
  });

  test("GET /api/applications/:id rejects unauthorized student (403)", async () => {
    const mockApp = {
      _id: "app1",
      student: { _id: "other-student-id", name: "Jane Doe" },
      listing: activeListing,
    };

    jest.spyOn(Application, "findById").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockApp),
      }),
    });

    const res = await request(app)
      .get("/api/applications/app1")
      .set("Authorization", `Bearer ${tokenFor("Student", mockStudentId)}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });
});
