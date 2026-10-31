# Deviations from the submitted SRS, SAD and Test Plan

Team 16, Online Internship and Placement Prep Portal. Updated at the end of Sprint 2.
Lines marked [confirm] must be checked against the final board before this file is submitted.

## 1. Sprint outcome

| | Planned | Delivered |
|---|---|---|
| Sprint 1 (19-23 Oct) | Reduced from 85 to 51 points when the sprint was already running | 11 items, 36 points: IPP-T-001, T-002, T-003, F-050, F-051, F-052, SEC-001, F-053, SEC-004, F-001, F-010 |
| Sprint 2 (26-30 Oct) | Cut from 140 points to what could be built in the week | [confirm] list the items merged by 30 Oct |

Reason for the changes: the first sprint started with no working code, so the plan was cut to the demo path
(register, login, listings, apply) and the remaining items moved to Sprint 2. Six Sprint 1 items assigned to
one member (IPP-T-004, F-003, F-007, F-013, F-015, F-016) were moved to Sprint 2 because they were not completed in time.

## 2. Items added that are not in the SRS

IPP-T-001 to IPP-T-006: repository and MERN skeleton, data models, GitHub Actions CI, test framework,
documentation, deployment and demo videos. They were added because the sprints could not run without them.

## 3. Design decisions that differ from, or add detail to, the documents

| Area | What was built | Related item |
|---|---|---|
| Access control | JWT bearer tokens (valid for 60 minutes) with a server-side role check on every protected route | IPP-F-053, IPP-SEC-004 |
| Accounts | Recruiters are approved automatically at registration. The approval flag exists in the data model but there is no Admin approval screen. Admin accounts are created by the seed script only. | IPP-F-054 |
| Sessions | The login token expires after 60 minutes. There is no inactivity timer. | IPP-SEC-003 |
| Account lockout | Five failed logins lock the account for 15 minutes | IPP-SEC-007 |
| Input handling | MongoDB operator keys and dotted keys are removed from every request. Output encoding is left to React. | IPP-SEC-005 |
| Resume upload | Checks content type, .pdf extension, 5 MB limit and the PDF file header. Files are stored on the server's disk. | IPP-F-013 |
| Resume access | Only the student, the listing's recruiter and an Admin can open a resume | IPP-SEC-006 |
| Aptitude test timing | The server stores the deadline when a test starts. The browser timer submits automatically. Attempts left open are closed when the student next starts a test. There is no autosave of answers. | IPP-F-032, F-033, NF-007 |
| Scoring | The score is the number of correct answers, calculated on the server. The client cannot send a score, and correct answers are not sent until the attempt is submitted. | IPP-F-034, SEC-008, F-035 |
| Expired listings | Listings past their deadline are hidden from the Student list and detail views | IPP-F-006 |

## 4. Requirements not delivered

[confirm] Delete any line that was actually completed.

- Listings: IPP-F-005 filters (keyword search is delivered), IPP-F-008 admin removal
- Applications: IPP-F-014 withdraw, IPP-F-017 notifications
- Accounts: IPP-F-054 Recruiter approval screen for Admin
- Progress and analytics: IPP-F-022, F-040, F-041, F-042, F-043
- Aptitude: IPP-F-036 attempt history view (each attempt is stored separately)
- Non-functional: IPP-NF-001 to NF-007 were not measured or implemented. NF-008 coverage is reported by `npm run test:coverage`.
- Security: IPP-SEC-002 HTTPS (the app runs over HTTP locally)

## 5. Test Plan differences

- Automated unit tests use Jest and Supertest with the database layer mocked. `npm run smoke` runs an end-to-end check against a running server and a real MongoDB.
- Selenium, JMeter and Postman suites from the Test Plan were not built.
- GitHub Actions runs lint and tests on every pull request (backend), a build (frontend) and pytest (Python service).
