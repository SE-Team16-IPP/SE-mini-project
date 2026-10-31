const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateResume, fileFilter, MAX_RESUME_BYTES } = require("../src/middleware/resumeUpload");

function run(req) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const next = jest.fn();
  validateResume(req, res, next);
  return { res, next };
}

describe("validateResume (IPP-F-013)", () => {
  test("rejects a request with no file", () => {
    const { res, next } = run({});
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts a real PDF header in memory", () => {
    const { next } = run({ file: { size: 1000, buffer: Buffer.from("%PDF-1.7 rest") } });
    expect(next).toHaveBeenCalled();
  });

  test("rejects a file that is named .pdf but is not a PDF", () => {
    const { res, next } = run({ file: { size: 1000, buffer: Buffer.from("MZ not a pdf") } });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/valid PDF/);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a file over 5 MB", () => {
    const { res } = run({ file: { size: MAX_RESUME_BYTES + 1, buffer: Buffer.from("%PDF") } });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/5 MB/);
  });

  test("reads the header from disk when the file was stored on disk", () => {
    const good = path.join(os.tmpdir(), `ipp-good-${Date.now()}.pdf`);
    const bad = path.join(os.tmpdir(), `ipp-bad-${Date.now()}.pdf`);
    fs.writeFileSync(good, "%PDF-1.4 content");
    fs.writeFileSync(bad, "hello world");

    expect(run({ file: { size: 10, path: good } }).next).toHaveBeenCalled();
    expect(run({ file: { size: 10, path: bad } }).res.statusCode).toBe(400);

    [good, bad].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
  });
});

describe("fileFilter", () => {
  test("accepts application/pdf with a .pdf name", () => {
    const cb = jest.fn();
    fileFilter({}, { mimetype: "application/pdf", originalname: "cv.PDF" }, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test("rejects other types and other extensions", () => {
    const cb1 = jest.fn();
    fileFilter({}, { mimetype: "image/png", originalname: "cv.png" }, cb1);
    expect(cb1.mock.calls[0][0]).toBeInstanceOf(Error);

    const cb2 = jest.fn();
    fileFilter({}, { mimetype: "application/pdf", originalname: "cv.exe" }, cb2);
    expect(cb2.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
