# Online Internship and Placement Prep Portal (Team 16)

A MERN web app: students browse internships, apply with a PDF resume, track their applications and take timed
aptitude tests. Recruiters post listings and manage applicants. Admins create aptitude tests.
A small Python (Flask) service is included for later analytics work.

## What you need installed
- Node.js 20 or newer (check with `node -v`)
- MongoDB Community Server 4.2 or newer, running locally on the default port 27017
  (or a MongoDB Atlas connection string, which goes in `MONGO_URI` below)
- Optional: Python 3.11 for the Flask service

## Run it (two options)

### Option A: one server, one port (easiest for the demo)
```
cd frontend
npm install
npm run build
cd ../backend
copy .env.example .env      (macOS/Linux: cp .env.example .env)
npm install
npm run seed
npm start
```
Open http://localhost:5000

### Option B: development mode with hot reload (two terminals)
Terminal 1:
```
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```
Terminal 2:
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (it forwards /api calls to port 5000).

## Demo logins (created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Student | student@ipp.test | Student@123 |
| Recruiter | recruiter@ipp.test | Recruiter@123 |
| Admin | admin@ipp.test | Admin@123 |

You can also register new Student and Recruiter accounts on the login page. Admin accounts come from the seed only.

## Demo flow (about 2 minutes)
1. Log in as the recruiter, open **Post a listing** and publish an internship.
2. Log out, register or log in as the student, search for the listing, open it and apply with a PDF resume.
3. Open **My applications** to see the status.
4. Log in as the recruiter again, open **My listings**, then **View applicants**, view the resume and change the status to Shortlisted.
5. As the student, open **My applications** to see the new status and the timeline.
6. As the student, open **Aptitude tests**, start a test, answer a few questions and submit. The result page shows the score and the correct answers.
7. Optional: log in as the admin and create a new test under **Create a test**.

## Checks
```
cd backend
npm run lint
npm test                 # unit tests (database mocked)
npm run test:coverage    # coverage report
npm run smoke            # end-to-end check: start the server first, run `npm run seed` first
```
Python service:
```
cd python-service
pip install -r requirements.txt
python -m pytest
python app.py            # http://localhost:8000/health
```

## Folder layout
- `backend/src/routes/features/` one file per feature, loaded automatically by `routes/index.js`
- `backend/src/models/` Mongoose models: User, Listing, Application, Test, Attempt
- `backend/src/middleware/` auth and role checks, input sanitising, resume upload and validation
- `backend/scripts/` `seed.js` (demo data) and `smoke.js` (end-to-end check)
- `frontend/src/pages/` the React pages for each role
- `docs/DEVIATIONS.md` differences from the submitted SRS, SAD and Test Plan
- `.github/workflows/ci.yml` lint and tests on every pull request

## Troubleshooting
- **`ECONNREFUSED 127.0.0.1:27017`**: MongoDB is not running. Start the MongoDB service, or put an Atlas connection string in `backend/.env`.
- **`JWT_SECRET is not set`**: copy `backend/.env.example` to `backend/.env`.
- **Blank page on port 5000**: run `npm run build` in `frontend` first (Option A), or use Option B.
- **Port 5000 in use**: change `PORT` in `backend/.env`. In Option B also change the proxy target in `frontend/vite.config.js`.
