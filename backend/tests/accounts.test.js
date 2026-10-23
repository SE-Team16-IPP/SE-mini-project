const request = require("supertest");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

process.env.JWT_SECRET = "test-jwt-secret-for-auth";
const app = require("../src/app");

describe("Accounts & Authentication (IPP-F-050, IPP-F-051, IPP-F-052, IPP-SEC-001)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/auth/register (IPP-F-050, IPP-F-051, IPP-SEC-001)", () => {
    test("registers a new Student with valid details and hashes password", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      const saveSpy = jest.spyOn(User.prototype, "save").mockImplementation(function () {
        this._id = "mock_student_id_1";
        return Promise.resolve(this);
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Prateek Hachadad",
        email: "prateek@pesu.pes.edu",
        password: "Password123",
        role: "Student",
      });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe("mock_student_id_1");
      expect(res.body.role).toBe("Student");
      expect(res.body.approved).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
    });

    test("registers a Recruiter with approved: false pending admin approval", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      jest.spyOn(User.prototype, "save").mockImplementation(function () {
        this._id = "mock_recruiter_id_1";
        return Promise.resolve(this);
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Acme HR",
        email: "recruiter@acme.com",
        password: "SecurePassword1",
        role: "Recruiter",
      });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe("Recruiter");
      expect(res.body.approved).toBe(false);
    });

    test("rejects registration when email is already taken (IPP-F-051)", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue({ email: "existing@pesu.pes.edu" });

      const res = await request(app).post("/api/auth/register").send({
        name: "Duplicate User",
        email: "existing@pesu.pes.edu",
        password: "Password123",
        role: "Student",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    test("rejects invalid email formats", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "not-an-email",
        password: "Password123",
        role: "Student",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid email/i);
    });

    test("rejects passwords lacking letters or digits or under 8 chars", async () => {
      const res1 = await request(app).post("/api/auth/register").send({
        name: "Short Pass",
        email: "short@pesu.pes.edu",
        password: "Pass1",
        role: "Student",
      });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post("/api/auth/register").send({
        name: "No Digits",
        email: "nodigits@pesu.pes.edu",
        password: "PasswordOnly",
        role: "Student",
      });
      expect(res2.status).toBe(400);
    });

    test("rejects disallowed roles like Admin at registration", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Fake Admin",
        email: "admin@pesu.pes.edu",
        password: "Password123",
        role: "Admin",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Student or Recruiter/i);
    });
  });

  describe("POST /api/auth/login (IPP-F-052, IPP-SEC-001)", () => {
    test("authenticates user with valid credentials and returns JWT token", async () => {
      const hashedPassword = await bcrypt.hash("Password123", 10);
      const fakeUser = {
        _id: "user_123",
        name: "Prateek",
        email: "prateek@pesu.pes.edu",
        password: hashedPassword,
        role: "Student",
        approved: true,
        failedLogins: 0,
        lockUntil: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, "findOne").mockResolvedValue(fakeUser);

      const res = await request(app).post("/api/auth/login").send({
        email: "prateek@pesu.pes.edu",
        password: "Password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe("Student");
      expect(res.body.user.name).toBe("Prateek");
      expect(fakeUser.failedLogins).toBe(0);
    });

    test("rejects invalid password and increments failed login count", async () => {
      const hashedPassword = await bcrypt.hash("CorrectPassword1", 10);
      const fakeUser = {
        _id: "user_123",
        email: "user@pesu.pes.edu",
        password: hashedPassword,
        failedLogins: 1,
        lockUntil: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, "findOne").mockResolvedValue(fakeUser);

      const res = await request(app).post("/api/auth/login").send({
        email: "user@pesu.pes.edu",
        password: "WrongPassword1",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
      expect(fakeUser.failedLogins).toBe(2);
    });

    test("temporarily locks account after 5 consecutive failed attempts (IPP-SEC-007)", async () => {
      const hashedPassword = await bcrypt.hash("CorrectPassword1", 10);
      const fakeUser = {
        _id: "user_123",
        email: "user@pesu.pes.edu",
        password: hashedPassword,
        failedLogins: 4,
        lockUntil: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, "findOne").mockResolvedValue(fakeUser);

      const res = await request(app).post("/api/auth/login").send({
        email: "user@pesu.pes.edu",
        password: "WrongPassword1",
      });

      expect(res.status).toBe(401);
      expect(fakeUser.failedLogins).toBe(5);
      expect(fakeUser.lockUntil).toBeInstanceOf(Date);
    });

    test("blocks login when account is locked (HTTP 423)", async () => {
      const fakeUser = {
        _id: "user_123",
        email: "locked@pesu.pes.edu",
        password: "hashed",
        lockUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, "findOne").mockResolvedValue(fakeUser);

      const res = await request(app).post("/api/auth/login").send({
        email: "locked@pesu.pes.edu",
        password: "AnyPassword1",
      });

      expect(res.status).toBe(423);
      expect(res.body.error).toMatch(/temporarily locked/i);
    });
  });
});
