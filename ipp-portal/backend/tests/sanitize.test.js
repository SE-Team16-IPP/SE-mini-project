const request = require("supertest");
const express = require("express");
const sanitize = require("../src/middleware/sanitize");

describe("sanitize (IPP-SEC-005)", () => {
  test("strip removes operator and dotted keys at any depth", () => {
    const input = { email: { $gt: "" }, nested: { ok: 1, "a.b": 2, list: [{ $where: "x", keep: 1 }] } };
    sanitize.strip(input);
    expect(input).toEqual({ email: {}, nested: { ok: 1, list: [{ keep: 1 }] } });
  });

  test("middleware cleans body and query before the handler runs", async () => {
    const app = express();
    app.use(express.json());
    app.use(sanitize);
    app.post("/echo", (req, res) => res.json({ body: req.body, query: req.query }));

    const res = await request(app).post("/echo?$ne=1&name=x").send({ email: { $gt: "" }, name: "a" });
    expect(res.body.body).toEqual({ email: {}, name: "a" });
    expect(res.body.query).toEqual({ name: "x" });
  });
});
