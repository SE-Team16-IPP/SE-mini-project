// End-to-end check against a running server: node scripts/smoke.js [baseUrl]
// Requires the server to be running and `npm run seed` to have been run.
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:5000";
let failures = 0;

function check(name, condition, extra = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${condition ? "" : "  " + extra}`);
  if (!condition) failures += 1;
}

async function call(method, url, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(BASE + "/api" + url, { method, headers, body });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("json") ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await call("POST", "/auth/login", { json: { email, password } });
  return r.data.token;
}

function pdfForm(bytes, name = "resume.pdf", note = "Hello") {
  const form = new FormData();
  form.append("resume", new Blob([bytes], { type: "application/pdf" }), name);
  form.append("coverNote", note);
  return form;
}

async function main() {
  const stamp = Date.now();
  const studentEmail = `smoke.student.${stamp}@ipp.test`;

  // accounts
  let r = await call("POST", "/auth/register", { json: { name: "Smoke Student", email: studentEmail, password: "Passw0rd!", role: "Student" } });
  check("register a student", r.status === 201, JSON.stringify(r.data));
  r = await call("POST", "/auth/register", { json: { name: "Dup", email: studentEmail, password: "Passw0rd!", role: "Student" } });
  check("duplicate email is rejected", r.status === 409);
  r = await call("POST", "/auth/register", { json: { name: "Bad", email: "nope", password: "Passw0rd!", role: "Student" } });
  check("invalid email is rejected", r.status === 400);
  r = await call("POST", "/auth/login", { json: { email: studentEmail, password: "wrong-password" } });
  check("wrong password is rejected", r.status === 401);

  const student = await login(studentEmail, "Passw0rd!");
  const recruiter = await login("recruiter@ipp.test", "Recruiter@123");
  const admin = await login("admin@ipp.test", "Admin@123");
  check("student, recruiter and admin can log in", Boolean(student && recruiter && admin));

  // role protection
  r = await call("GET", "/admin/ping", { token: student });
  check("student cannot use admin route", r.status === 403);
  r = await call("GET", "/listings");
  check("listings need a token", r.status === 401);

  // listings
  const deadline = new Date(Date.now() + 5 * 86400000).toISOString();
  r = await call("POST", "/listings", { token: student, json: { title: "x" } });
  check("student cannot create a listing", r.status === 403);
  r = await call("POST", "/listings", { token: recruiter, json: { title: "Smoke Intern", company: "Smoke Co", description: "Testing the portal", requiredSkills: "React, Node", location: "Remote", duration: "2 months", stipend: 5000, deadline } });
  check("recruiter creates a listing", r.status === 201, JSON.stringify(r.data));
  const listingId = r.data._id;

  r = await call("POST", "/listings", { token: recruiter, json: { title: "Old", company: "C", description: "D", deadline: "2020-01-01" } });
  check("past deadline is rejected", r.status === 400);

  r = await call("GET", "/listings?q=smoke", { token: student });
  check("search finds the new listing", r.status === 200 && r.data.data.some((l) => l._id === listingId), JSON.stringify(r.data).slice(0, 200));
  r = await call("GET", "/listings?page=1&limit=2", { token: student });
  check("listings are paginated", r.status === 200 && r.data.data.length <= 2 && r.data.totalPages >= 1);
  r = await call("GET", `/listings/${listingId}`, { token: student });
  check("listing details load", r.status === 200 && r.data.title === "Smoke Intern");
  r = await call("GET", "/listings/mine", { token: recruiter });
  check("recruiter sees own listings", r.status === 200 && r.data.some((l) => l._id === listingId));

  // apply
  const goodPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  r = await call("POST", `/listings/${listingId}/apply`, { token: student, form: pdfForm(Buffer.from("not a pdf at all"), "cv.pdf") });
  check("fake pdf is rejected", r.status === 400, JSON.stringify(r.data));
  const bad = new FormData();
  bad.append("resume", new Blob(["x"], { type: "text/plain" }), "cv.txt");
  r = await call("POST", `/listings/${listingId}/apply`, { token: student, form: bad });
  check("non-pdf is rejected", r.status === 400);
  r = await call("POST", `/listings/${listingId}/apply`, { token: student, form: pdfForm(Buffer.alloc(5 * 1024 * 1024 + 10, 65)) });
  check("file over 5 MB is rejected", r.status === 400);
  r = await call("POST", `/listings/${listingId}/apply`, { token: student, form: pdfForm(goodPdf) });
  check("student applies with a pdf", r.status === 201, JSON.stringify(r.data));
  const applicationId = r.data.id;
  r = await call("POST", `/listings/${listingId}/apply`, { token: student, form: pdfForm(goodPdf) });
  check("second application is rejected", r.status === 409);

  r = await call("GET", "/applications/mine", { token: student });
  check("student dashboard lists the application", r.status === 200 && r.data.some((a) => a.id === applicationId));

  // recruiter side
  r = await call("GET", `/listings/${listingId}/applicants`, { token: recruiter });
  check("recruiter sees the applicant", r.status === 200 && r.data.applicants.length === 1);
  r = await call("GET", `/listings/${listingId}/applicants`, { token: student });
  check("student cannot see applicants", r.status === 403);
  r = await call("GET", `/applications/${applicationId}/resume`, { token: recruiter });
  check("recruiter can open the resume", r.status === 200 && r.data.byteLength > 0);
  r = await call("PATCH", `/applications/${applicationId}/status`, { token: student, json: { status: "Selected" } });
  check("student cannot change status", r.status === 403);
  r = await call("PATCH", `/applications/${applicationId}/status`, { token: recruiter, json: { status: "Shortlisted" } });
  check("recruiter shortlists the application", r.status === 200 && r.data.status === "Shortlisted");
  r = await call("GET", "/applications/mine", { token: student });
  check("student sees the new status", r.data.find((a) => a.id === applicationId).status === "Shortlisted");

  r = await call("POST", `/listings/${listingId}/close`, { token: recruiter });
  check("recruiter closes the listing", r.status === 200 && r.data.status === "Closed");
  r = await call("GET", `/listings/${listingId}`, { token: student });
  check("closed listing is hidden from students", r.status === 404);

  // aptitude test
  r = await call("GET", "/tests?category=quant", { token: student });
  check("tests can be browsed by category", r.status === 200 && r.data.length >= 1, JSON.stringify(r.data));
  const testId = r.data[0].id;
  r = await call("GET", `/tests/${testId}`, { token: student });
  check("student never receives correct answers", r.status === 200 && !JSON.stringify(r.data).includes("correctIndex"));
  const questions = r.data.questions;
  r = await call("POST", `/tests/${testId}/start`, { token: admin });
  check("admin cannot start a test", r.status === 403);
  r = await call("POST", `/tests/${testId}/start`, { token: student });
  check("student starts a test with a deadline", r.status === 201 && Boolean(r.data.expiresAt), JSON.stringify(r.data));
  const attemptId = r.data.attemptId;
  r = await call("GET", `/attempts/${attemptId}/result`, { token: student });
  check("no result before submitting", r.status === 400);

  // answer: pick option index 2 for every question (only some are right)
  const answers = questions.map((q) => ({ questionId: q._id, selectedIndex: 2 }));
  r = await call("POST", `/attempts/${attemptId}/submit`, { token: student, json: { score: 99, answers } });
  check("submit returns a server-calculated score", r.status === 200 && r.data.score <= r.data.total && r.data.score !== 99, JSON.stringify(r.data));
  const score = r.data.score;
  r = await call("POST", `/attempts/${attemptId}/submit`, { token: student, json: { answers } });
  check("second submit is rejected", r.status === 409);
  r = await call("GET", `/attempts/${attemptId}/result`, { token: student });
  check("result shows correct answers and the same score", r.status === 200 && r.data.score === score && r.data.results.every((x) => x.correctIndex !== undefined));

  // admin creates a test
  r = await call("POST", "/tests", { token: student, json: {} });
  check("student cannot create a test", r.status === 403);
  r = await call("POST", "/tests", { token: admin, json: { title: "Smoke Test", category: "Smoke", timeLimitMinutes: 5, questions: [{ text: "1+1?", options: ["1", "2"], correctIndex: 1 }] } });
  check("admin creates a test", r.status === 201, JSON.stringify(r.data));

  // operator injection
  r = await call("POST", "/auth/login", { json: { email: { $gt: "" }, password: { $gt: "" } } });
  check("operator injection at login is rejected", r.status === 400 || r.status === 401);

  fs.writeFileSync(path.join(os.tmpdir(), "ipp-smoke-done"), String(stamp));
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test could not run:", err.message);
  process.exit(1);
});
