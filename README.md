# Aaranya Salon — Salon Management App

A full-stack salon booking and management app for a single salon shop. Guests can book appointments without logging in, stylists can manage their schedule, and the admin can run day-to-day salon operations.

- **Live app:** https://salon-management-app-five.vercel.app/
- **Approach doc:** [`APPROACH.md`](./APPROACH.md)
- **V1 scope:** [`docs/V1_SCOPE.md`](./docs/V1_SCOPE.md)
- **Deployment guide:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)

> **Render free-tier note.** The backend is hosted on Render's free plan, which can sleep after inactivity. For the demo window, this repo includes a GitHub Actions keepalive workflow that can ping `/api/v1/health` during the day.

---

## Current Product Model

This V1 is built for **one salon shop**.

There is **no public admin signup**. Admin access is provisioned by the developer team and credentials are shared directly with the salon admin. This keeps the demo simple and avoids exposing salon creation to public users.

The app has three surfaces:

| Surface | Who uses it | What it does |
| --- | --- | --- |
| Public booking site | Customers, no login | Browse services and stylists, choose a date/time, book a slot, and see a confirmation. |
| Admin console | Developer-provisioned admin | Manage salon profile, timezone, services, stylists, operating hours, stylist availability, bookings, and dashboard metrics. |
| Stylist portal | Salon stylists | View schedule, full booking history, profile, and add walk-in bookings. |

---

## Login Model

### Admin

Admin accounts are **not created from the frontend**.

Use one of these developer-controlled options:

```bash
cd backend
.venv/bin/python -m app.scripts.create_admin \
  --email admin@example.com \
  --password "password123" \
  --salon-name "Aaranya Salon - Bandra" \
  --salon-address "14 Linking Road, Bandra West, Mumbai" \
  --salon-phone "+91 98765 40100" \
  --timezone "Asia/Kolkata"
```

For demo data:

```bash
cd backend
.venv/bin/python -m app.scripts.seed_demo --reset
```

Demo admin:

```text
admin@example.com / password123
```

### Stylists

Stylists are created by the admin from the admin console. The admin sets their login email and password.

Demo stylist accounts:

```text
ananya@example.com / password123
rohan@example.com / password123
meera@example.com / password123
kavya@example.com / password123
```

### Customers

Customers do not need an account. They book directly from the public booking flow.

---

## Key Features

- Single-salon admin console
- Developer-provisioned admin credentials
- Public customer booking without login
- Multiple services per booking
- "Any available stylist" booking mode
- Stylist profiles, specialties, and availability windows
- Salon operating hours and timezone support
- Admin booking view with reschedule, cancel, complete, and paid actions
- Stylist dashboard, schedule, history, profile, and walk-in flow
- Rupee pricing and India-focused demo data
- Country-code phone input with India `+91` as default
- UTC-at-rest scheduling with salon-local display
- Database-level double-booking prevention using a Postgres GiST exclusion constraint

---

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, deployed on Vercel
- **Backend:** FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, JWT auth, deployed on Render
- **Database:** PostgreSQL on Neon
- **Tests:** pytest with a SQLite test DB plus migration checks for Postgres-specific constraints

---

## Repository Layout

```text
.
├── backend/
│   ├── app/
│   │   ├── core/           # config, database, security, dependencies, phone helpers
│   │   ├── models/         # users, salons, stylists, services, availability, bookings
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── routers/        # auth, public, salon, services, stylists, bookings, dashboard
│   │   ├── scripts/        # create_admin, seed_demo
│   │   └── main.py
│   ├── migrations/         # Alembic versions
│   ├── tests/              # pytest suite
│   └── requirements.txt
├── frontend/
│   ├── app/                # Next.js routes
│   ├── components/         # layout, auth, bookings, UI
│   ├── lib/                # API client, auth, date, phone, timezone helpers
│   └── types/
├── docs/V1_SCOPE.md
├── .github/workflows/      # temporary Render keepalive workflow for demo testing
├── docker-compose.yml
├── render.yaml
├── APPROACH.md
├── DEPLOYMENT.md
└── README.md
```

---

## Data Model

```text
users ──┬─ salons ──┬─ services
        │           ├─ stylists ── stylist_specialties
        │           ├─ salon_operating_hours
        │           └─ stylist_availability
        └─ stylists (user_id for stylist login)

bookings ──┬─ booking_services
           └─ booking_charges
```

Important rules:

- One admin owns the salon in V1.
- Appointment times are stored in UTC.
- The salon timezone controls local display and date filtering.
- A booking can include one or more services.
- Booking service duration and price are snapshotted at booking time.
- Active overlapping bookings for the same stylist are blocked at the database level.

---

## Local Setup

### 1. Environment

```bash
cp .env.example .env
```

### 2. Start Local Postgres

```bash
docker compose up -d db
```

### 3. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend URLs:

```text
API: http://localhost:8000
Docs: http://localhost:8000/docs
Health: http://localhost:8000/api/v1/health
```

### 4. Seed Demo Data

```bash
cd backend
.venv/bin/python -m app.scripts.seed_demo --reset
```

This creates the single demo salon, admin, services, stylists, operating hours, and availability.

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

---

## Typical Demo Flow

1. Developer provisions or seeds the admin account.
2. Admin logs in at `/login` or `/admin/login`.
3. Admin manages salon profile, services, stylists, hours, and availability.
4. Customer books from `/customer/booking` without login.
5. Stylist logs in from `/stylist/login` and sees schedule/history.
6. Admin tracks bookings and dashboard metrics.

---

## Testing

```bash
cd backend
source .venv/bin/activate
pytest
```

Current coverage includes:

- Auth and role guards
- Admin salon/service/stylist access rules
- Public booking rules
- Duplicate service rejection
- Double-booking protection
- Dashboard metrics
- Stylist-scoped schedule/actions
- Migration checks

---

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md).

Short version:

1. Create Neon Postgres and set `DATABASE_URL`.
2. Deploy backend to Render with `render.yaml`.
3. Deploy frontend to Vercel.
4. Set `NEXT_PUBLIC_API_URL` to the Render backend URL plus `/api/v1`.
5. Provision admin credentials using `create_admin` or seed demo data.

For demo-only keepalive, configure GitHub secret:

```text
RENDER_HEALTH_URL=https://your-render-backend.onrender.com/api/v1/health
```

The workflow in `.github/workflows/render-keepalive.yml` pings the backend during the daytime demo window.

---

## Roadmap

### V1

- [x] Single-salon admin console
- [x] Developer-provisioned admin account
- [x] Services CRUD
- [x] Stylists CRUD with login accounts
- [x] Salon operating hours
- [x] Stylist availability
- [x] Public booking without customer login
- [x] Any-stylist availability mode
- [x] Multi-service bookings
- [x] Booking confirmation
- [x] Stylist portal
- [x] Admin dashboard
- [x] Booking actions
- [x] Phone country-code support
- [x] India-focused demo data and INR display
- [x] Race-safe double-booking prevention

### Later

- [ ] Email/SMS confirmations and reminders
- [ ] Online payments or deposits
- [ ] Customer accounts
- [ ] Holidays and one-off time off
- [ ] Audit trail for booking edits
- [ ] CSV exports
- [ ] Multi-location support

---

## License

Private project built as a technical assignment. Not open-sourced.
