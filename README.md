# Online Internship and Placement Prep Portal (Team 16)

A web application made using Python,Javascript MERN, MongoDB and node.js: 
An app where Students can browse internships, apply with a PDF resume, track their applications and take timed
aptitude tests. 
Recruiters can post listings and manage applicants. Admins create aptitude tests.
A small Python (Flask) service is included for later analytics work.

## What you need installed
- Node.js 20 or newer (check in powershell with `node -v`)
- MongoDB Community Server 4.2 or newer, running locally on the default port 27017
  (or a MongoDB Atlas connection string, which goes in `MONGO_URI` below)
- Python 3.11 for the Flask service

## How to run the application
- Clone the repo in your system
- Open powershell in the project folder and run these commands:
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
Open http://localhost:5000, all user types (student, recruiter, and admin) will use the same port


## Demo logins (created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Student | student@ipp.test | Student@123 |
| Recruiter | recruiter@ipp.test | Recruiter@123 |
| Admin | admin@ipp.test | Admin@123 |

You can also register new Student and Recruiter accounts on the login page. Admin accounts come from the seed only.

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
- `docs/DEVIATIONS.md` Changes made from the SRS, SAD and Test Plan first made
- `.github/workflows/ci.yml` lint and tests on every pull request

## Troubleshooting
- **`ECONNREFUSED 127.0.0.1:27017`**: MongoDB is not running. Start the MongoDB service, or put an Atlas connection string in `backend/.env`.
- **`JWT_SECRET is not set`**: copy `backend/.env.example` to `backend/.env`.
- **Blank page on port 5000**: run `npm run build` in `frontend` first (Option A), or use Option B.
- **Port 5000 in use**: change `PORT` in `backend/.env`. In Option B also change the proxy target in `frontend/vite.config.js`.
