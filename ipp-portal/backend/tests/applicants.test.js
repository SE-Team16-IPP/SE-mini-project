const request = require("supertest");
const express = require("express");
const { bearer } = require("./helpers/auth");

jest.mock("../src/models/Listing", () => ({ findById: jest.fn() }));
jest.mock("../src/models/Application", () => ({ find: jest.fn(), findById: jest.fn() }));

const Listing = require("../src/models/Listing");
const Application = require("../src/models/Application");
const feature = require("../src/routes/features/applicants");

const app = express();
app.use(express.json());
app.use("/api" + feature.mount, feature.router);

const ID = "64b7f0f2a1b2c3d4e5f60718";

beforeEach(() => jest.clearAllMocks());

describe("GET /api/listings/:id/applicants (IPP-F-015)", () => {
  test("only Recruiters can call it", async () => {
    expect((await request(app).get(`/api/listings/${ID}/applicants`)).status).toBe(401);
    expect((await request(app).get(`/api/listings/${ID}/applicants`).set("Authorization", bearer("Student"))).status).toBe(403);
  });

  test("returns applicants of the recruiter's own listing", async () => {
    Listing.findById.mockResolvedValue({ _id: ID, title: "SDE Intern", recruiter: "rec1" });
    Application.find.mockReturnValue({
      populate: () => ({ sort: () => Promise.resolve([{ status: "Applied" }]) }),
    });
    const res = await request(app).get(`/api/listings/${ID}/applicants`).set("Authorization", bearer("Recruiter", "rec1"));
    expect(res.status).toBe(200);
    expect(res.body.applicants).toHaveLength(1);
    expect(res.body.listing.title).toBe("SDE Intern");
  });

  test("another recruiter's listing gives 403", async () => {
    Listing.findById.mockResolvedValue({ _id: ID, recruiter: "someone-else" });
    const res = await request(app).get(`/api/listings/${ID}/applicants`).set("Authorization", bearer("Recruiter", "rec1"));
    expect(res.status).toBe(403);
  });

  test("unknown listing gives 404 and bad id gives 400", async () => {
    Listing.findById.mockResolvedValue(null);
    expect((await request(app).get(`/api/listings/${ID}/applicants`).set("Authorization", bearer("Recruiter"))).status).toBe(404);
    expect((await request(app).get("/api/listings/xyz/applicants").set("Authorization", bearer("Recruiter"))).status).toBe(400);
  });
});

describe("PATCH /api/applications/:id/status (IPP-F-016)", () => {
  function mockApplication(recruiter) {
    const application = {
      _id: ID,
      status: "Applied",
      statusHistory: [],
      listing: { recruiter },
      save: jest.fn().mockResolvedValue(true),
    };
    Application.findById.mockReturnValue({ populate: () => Promise.resolve(application) });
    return application;
  }

  test("a Student cannot change a status", async () => {
    const res = await request(app)
      .patch(`/api/applications/${ID}/status`)
      .set("Authorization", bearer("Student"))
      .send({ status: "Selected" });
    expect(res.status).toBe(403);
  });

  test("the owning recruiter can change the status and it is recorded", async () => {
    const application = mockApplication("rec1");
    const res = await request(app)
      .patch(`/api/applications/${ID}/status`)
      .set("Authorization", bearer("Recruiter", "rec1"))
      .send({ status: "Shortlisted" });
    expect(res.status).toBe(200);
    expect(application.status).toBe("Shortlisted");
    expect(application.statusHistory).toHaveLength(1);
    expect(application.save).toHaveBeenCalled();
  });

  test("an invalid status is rejected", async () => {
    mockApplication("rec1");
    const res = await request(app)
      .patch(`/api/applications/${ID}/status`)
      .set("Authorization", bearer("Recruiter", "rec1"))
      .send({ status: "Hired!!" });
    expect(res.status).toBe(400);
  });

  test("a recruiter cannot change an application on someone else's listing", async () => {
    const application = mockApplication("other");
    const res = await request(app)
      .patch(`/api/applications/${ID}/status`)
      .set("Authorization", bearer("Recruiter", "rec1"))
      .send({ status: "Rejected" });
    expect(res.status).toBe(403);
    expect(application.save).not.toHaveBeenCalled();
  });

  test("unknown application gives 404", async () => {
    Application.findById.mockReturnValue({ populate: () => Promise.resolve(null) });
    const res = await request(app)
      .patch(`/api/applications/${ID}/status`)
      .set("Authorization", bearer("Recruiter"))
      .send({ status: "Rejected" });
    expect(res.status).toBe(404);
  });
});
