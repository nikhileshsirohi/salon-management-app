# Deployment Guide

Recommended free setup:

- Frontend: Vercel
- Backend: Render
- Database: Neon Postgres

## 1. Neon Postgres

Create a free Neon project and copy the database connection string.

Use the pooled connection string if Neon gives you one. Either format is okay:

```txt
postgresql://...
postgresql+psycopg://...
```

The backend normalizes `postgresql://` and `postgres://` to the installed `psycopg` driver.

## 2. Render Backend

Deploy the backend from this repository using `render.yaml`, or create a Render web service manually.

Manual settings:

```txt
Root directory: backend
Build command: pip install -r requirements.txt
Start command: bash scripts/start.sh
Health check path: /api/v1/health
```

Render environment variables:

```txt
PROJECT_NAME=Salon Management App API
API_V1_PREFIX=/api/v1
SECRET_KEY=<long-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DATABASE_URL=<neon-postgres-url>
BACKEND_CORS_ORIGINS=http://localhost:3000,https://your-vercel-app.vercel.app
```

`scripts/start.sh` runs database migrations first:

```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

After deployment, test:

```txt
https://your-render-service.onrender.com/api/v1/health
```

Expected response:

```json
{"status":"ok"}
```

## 3. Vercel Frontend

Create a Vercel project for the `frontend` directory.

Vercel settings:

```txt
Root directory: frontend
Framework: Next.js
Build command: npm run build
Install command: npm install
```

Vercel environment variable:

```txt
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com/api/v1
```

After Vercel gives you a public URL, copy it into Render:

```txt
BACKEND_CORS_ORIGINS=https://your-vercel-app.vercel.app
```

For local + production together:

```txt
BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://your-vercel-app.vercel.app
```

## 4. Final Test Order

1. Open the Vercel frontend URL.
2. Open `/customer/booking` and confirm salons load.
3. Create an owner at `/owner/signup`.
4. Add salon services and stylists.
5. Add stylist availability.
6. Book as a customer.
7. Login as owner and verify the booking.
8. Login as stylist and verify booking actions.

## Free Tier Reminder

Render free services can sleep after inactivity. The first request after sleep may take a little while.
