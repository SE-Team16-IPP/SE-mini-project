# Running tests

## Backend (Node, Jest)
cd backend
npm install
npm test
npm test -- --coverage   # must stay at or above 70% line coverage (IPP-NF-008)
npm run lint

## Python service (pytest)
cd python-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m pytest
flake8 .
