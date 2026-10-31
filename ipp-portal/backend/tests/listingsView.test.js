const request = require("supertest");
const express = require("express");
const { bearer } = require("./helpers/auth");

jest.mock("../src/models/Listing", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
}));

const Listing = require("../src/models/Listing");
const feature = require("../src/routes/features/listingsView");

const app = express();
app.use(express.json());
app.use("/api" + feature.mount, feature.router);

const ID = "64b7f0f2a1b2c3d4e5f60718";

function mockList(items, total) {
  const chain = { sort: jest.fn(), skip: jest.fn(), limit: jest.fn() };
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockResolvedValue(items);
  Listing.find.mockReturnValue(chain);
  Listing.countDocuments.mockResolvedValue(total);
  return chain;
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/listings (IPP-F-003, IPP-F-004, IPP-F-006)", () => {
  test("requires login", async () => {
    expect((await request(app).get("/api/listings")).status).toBe(401);
  });

  test("returns a page of active listings with paging info", async () => {
    const chain = mockList([{ title: "A" }, { title: "B" }], 23);
    const res = await request(app).get("/api/listings?page=2&limit=10").set("Authorization", bearer("Student"));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body).toMatchObject({ page: 2, limit: 10, total: 23, totalPages: 3 });
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  test("only active, not-yet-expired listings are queried", async () => {
    mockList([], 0);
    await request(app).get("/api/listings").set("Authorization", bearer("Student"));
    const filter = Listing.find.mock.calls[0][0];
    expect(filter.status).toBe("Active");
    expect(filter.deadline.$gt).toBeInstanceOf(Date);
  });

  test("keyword search builds a case-insensitive match on title, company and skills", async () => {
    mockList([], 0);
    await request(app).get("/api/listings?q=react").set("Authorization", bearer("Student"));
    const filter = Listing.find.mock.calls[0][0];
    expect(filter.$or).toHaveLength(3);
    expect(filter.$or[0].title.test("Frontend REACT intern")).toBe(true);
  });

  test("special characters in the search are escaped", async () => {
    mockList([], 0);
    await request(app).get("/api/listings?q=" + encodeURIComponent("c++(")).set("Authorization", bearer("Student"));
    const filter = Listing.find.mock.calls[0][0];
    expect(filter.$or[0].title.test("learn c++( today")).toBe(true);
  });

  test("limit is capped at 50 and bad numbers fall back to defaults", async () => {
    const chain = mockList([], 0);
    await request(app).get("/api/listings?limit=500&page=abc").set("Authorization", bearer("Student"));
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(chain.skip).toHaveBeenCalledWith(0);
  });

  test("database failure gives a 500", async () => {
    Listing.find.mockImplementation(() => {
      throw new Error("db down");
    });
    const res = await request(app).get("/api/listings").set("Authorization", bearer("Student"));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/listings/:id (IPP-F-007)", () => {
  const future = new Date(Date.now() + 86400000);
  const past = new Date(Date.now() - 86400000);

  test("returns the listing", async () => {
    Listing.findById.mockResolvedValue({ title: "A", status: "Active", deadline: future });
    const res = await request(app).get(`/api/listings/${ID}`).set("Authorization", bearer("Student"));
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("A");
  });

  test("invalid id gives 400 and unknown id gives 404", async () => {
    expect((await request(app).get("/api/listings/xyz").set("Authorization", bearer("Student"))).status).toBe(400);
    Listing.findById.mockResolvedValue(null);
    expect((await request(app).get(`/api/listings/${ID}`).set("Authorization", bearer("Student"))).status).toBe(404);
  });

  test("a Student cannot open a closed or expired listing, a Recruiter can", async () => {
    Listing.findById.mockResolvedValue({ title: "Old", status: "Active", deadline: past });
    expect((await request(app).get(`/api/listings/${ID}`).set("Authorization", bearer("Student"))).status).toBe(404);
    expect((await request(app).get(`/api/listings/${ID}`).set("Authorization", bearer("Recruiter"))).status).toBe(200);
  });
});
