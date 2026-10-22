# Online Internship and Placement Prep Portal (Team 16)

MERN web app with a small Python service for analytics.

## Structure
- `backend/` Express API, Mongoose models, auth middleware, Jest tests
- `frontend/` React app (Vite)
- `python-service/` Flask service (analytics, later sprints)
- `.github/workflows/ci.yml` runs lint and tests on every pull request

## Run locally
Backend:
```
cd backend
cp .env.example .env
npm install
npm run dev
```
Frontend (second terminal):
```
cd frontend
npm install
npm run dev
```
Python service:
```
cd python-service
pip install -r requirements.txt
python app.py
```

## Tests
```
cd backend && npm test
cd python-service && python -m pytest
```

## Workflow
One branch per issue (e.g. `feature/IPP-F-050-register`), open a PR with `Closes #<issue>`, wait for CI, owner reviews and merges.
