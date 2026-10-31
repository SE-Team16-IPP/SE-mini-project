const { readListing } = require("../src/routes/features/listingsManage");

const future = () => new Date(Date.now() + 86400000).toISOString();
const base = () => ({ title: " Intern ", company: "Acme", description: "Do things", deadline: future() });

describe("readListing (IPP-F-001, IPP-F-002)", () => {
  test("accepts a complete listing and trims text", () => {
    const { data, error } = readListing({ ...base(), requiredSkills: "React, Node ,", stipend: "5000" });
    expect(error).toBeUndefined();
    expect(data.title).toBe("Intern");
    expect(data.requiredSkills).toEqual(["React", "Node"]);
    expect(data.stipend).toBe(5000);
    expect(data.deadline).toBeInstanceOf(Date);
  });

  test.each([
    ["no title", { title: "" }],
    ["no company", { company: undefined }],
    ["no description", { description: "  " }],
    ["no deadline", { deadline: undefined }],
    ["past deadline", { deadline: "2020-01-01" }],
    ["invalid deadline", { deadline: "soon" }],
    ["negative stipend", { stipend: -5 }],
  ])("rejects %s", (label, patch) => {
    const body = { ...base(), ...patch };
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
    expect(readListing(body).error).toBeDefined();
  });

  test("a partial update only needs the fields being changed", () => {
    expect(readListing({ location: "Remote" }, { partial: true }).data).toEqual({ location: "Remote" });
    expect(readListing({ title: "" }, { partial: true }).error).toBeDefined();
  });
});
