const User = require("../src/models/User");
const Listing = require("../src/models/Listing");
const Application = require("../src/models/Application");
const Test = require("../src/models/Test");
const Attempt = require("../src/models/Attempt");

describe("models (schema validation, no database needed)", () => {
  test("User requires name, email, password and a valid role", () => {
    const bad = new User({ name: "A", email: "a@x.com", password: "h", role: "Boss" });
    expect(bad.validateSync().errors.role).toBeDefined();
    const ok = new User({ name: "A", email: "a@x.com", password: "h", role: "Student" });
    expect(ok.validateSync()).toBeUndefined();
  });

  test("Listing requires a title and deadline", () => {
    const bad = new Listing({});
    const errors = bad.validateSync().errors;
    expect(errors.title).toBeDefined();
    expect(errors.deadline).toBeDefined();
  });

  test("Application defaults to Applied", () => {
    const a = new Application({});
    expect(a.status).toBe("Applied");
  });

  test("Test question needs at least two options", () => {
    const t = new Test({
      title: "T",
      category: "Quant",
      timeLimitMinutes: 10,
      questions: [{ text: "Q", options: ["only one"], correctIndex: 0 }],
    });
    expect(t.validateSync()).toBeDefined();
  });

  test("Attempt starts with score 0", () => {
    expect(new Attempt({}).score).toBe(0);
  });
});
