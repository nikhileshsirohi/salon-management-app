# Salon Management App

A beginner-friendly salon booking and management web application.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, Python
- Database: PostgreSQL

## Project Layout

```text
.
├── backend/
│   └── app/
├── frontend/
│   └── app/
├── docs/
├── docker-compose.yml
├── .env
├── .env.example
└── .gitignore
```

## First-Time Setup

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Database:

```bash
docker compose up -d db
```

## Local URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
