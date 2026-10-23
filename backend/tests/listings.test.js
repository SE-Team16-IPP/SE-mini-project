const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";
const app = require("../src/app");
const Listing = require("../src/models/Listing");
const User = require("../src/models/User");

const tokenFor = (role, id = "66f000000000000000000001") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("IPP-F-001: Recruiter creates internship listing", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const validListingPayload = {
    title: "Software Engineering Intern",
    company: "Acme Corp",
    description: "Build full stack applications and collaborate with agile teams.",
    requiredSkills: ["JavaScript", "React", "Node.js"],
    location: "Bangalore (Hybrid)",
    duration: "6 Months",
    stipend: 35000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  };

  test("rejects listing creation without token (401)", async () => {
    const res = await request(app)
      .post("/api/listings")
      .send(validListingPayload);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  test("rejects listing creation by a Student (403)", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Student")}`)
      .send(validListingPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permission/i);
  });

  test("rejects listing creation if recruiter is not approved (403)", async () => {
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "66f000000000000000000001",
      role: "Recruiter",
      approved: false,
    });

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send(validListingPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending admin approval/i);
  });

  test("rejects listing creation if required fields are missing (400)", async () => {
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "66f000000000000000000001",
      role: "Recruiter",
      approved: true,
    });

    // Missing title
    let res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({ ...validListingPayload, title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);

    // Missing company
    res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({ ...validListingPayload, company: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/company/i);

    // Missing description
    res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({ ...validListingPayload, description: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);

    // Missing deadline
    res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({ ...validListingPayload, deadline: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/deadline/i);
  });

  test("rejects listing creation if deadline is in the past (400)", async () => {
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "66f000000000000000000001",
      role: "Recruiter",
      approved: true,
    });

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({ ...validListingPayload, deadline: pastDate });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future date/i);
  });

  test("rejects negative stipend (400)", async () => {
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "66f000000000000000000001",
      role: "Recruiter",
      approved: true,
    });

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send({ ...validListingPayload, stipend: -500 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stipend/i);
  });

  test("successfully creates listing with all eight fields and status Active (201)", async () => {
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "66f000000000000000000001",
      role: "Recruiter",
      approved: true,
    });

    jest.spyOn(Listing.prototype, "save").mockImplementation(function () {
      return Promise.resolve(this);
    });

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send(validListingPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Listing created successfully/i);
    expect(res.body.listing).toBeDefined();

    // Verify all 8 fields are correctly populated and saved
    const listing = res.body.listing;
    expect(listing.title).toBe(validListingPayload.title);
    expect(listing.company).toBe(validListingPayload.company);
    expect(listing.description).toBe(validListingPayload.description);
    expect(listing.requiredSkills).toEqual(validListingPayload.requiredSkills);
    expect(listing.location).toBe(validListingPayload.location);
    expect(listing.duration).toBe(validListingPayload.duration);
    expect(listing.stipend).toBe(validListingPayload.stipend);
    expect(new Date(listing.deadline).toISOString()).toBe(validListingPayload.deadline);
    expect(listing.status).toBe("Active");
  });

  test("successfully creates listing also via /api/internships alias (201)", async () => {
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "66f000000000000000000001",
      role: "Recruiter",
      approved: true,
    });

    jest.spyOn(Listing.prototype, "save").mockImplementation(function () {
      return Promise.resolve(this);
    });

    const res = await request(app)
      .post("/api/internships")
      .set("Authorization", `Bearer ${tokenFor("Recruiter")}`)
      .send(validListingPayload);

    expect(res.status).toBe(201);
    expect(res.body.listing.title).toBe(validListingPayload.title);
  });

  test("GET /api/listings retrieves active listings for students", async () => {
    const mockListings = [
      {
        _id: "listing1",
        title: "Frontend Developer Intern",
        company: "Tech Solutions",
        status: "Active",
      },
    ];

    jest.spyOn(Listing, "find").mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockListings),
    });

    const res = await request(app).get("/api/listings");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.listings)).toBe(true);
    expect(res.body.listings.length).toBe(1);
    expect(res.body.listings[0].title).toBe("Frontend Developer Intern");
  });

  test("GET /api/listings/:id retrieves listing by ID", async () => {
    const mockListing = {
      _id: "listing1",
      title: "Frontend Developer Intern",
      company: "Tech Solutions",
      status: "Active",
    };

    jest.spyOn(Listing, "findById").mockResolvedValue(mockListing);

    const res = await request(app).get("/api/listings/listing1");

    expect(res.status).toBe(200);
    expect(res.body.listing._id).toBe("listing1");
  });

  test("GET /api/listings/:id returns 404 if listing not found", async () => {
    jest.spyOn(Listing, "findById").mockResolvedValue(null);

    const res = await request(app).get("/api/listings/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Listing not found/i);
  });
});
