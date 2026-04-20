# Approach — Aaranya Salon Management App

**Live app:** https://salon-management-app-five.vercel.app/

## Product Direction

The current V1 is intentionally scoped to **one salon shop**.

I removed public admin signup from the product. Admin credentials are now created and shared by the developer team, either with the `create_admin` script or by seeding demo data. This better matches the current demo/testing workflow: one known salon, one admin account, and controlled access to operational tools.

Customers do not need accounts. They use the public booking flow. Stylists receive login accounts created by the admin.

## Stack & Hosting

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, hosted on Vercel
- **Backend:** FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, JWT auth, hosted on Render
- **Database:** PostgreSQL on Neon

The backend currently runs on Render's free tier, so it can sleep after inactivity. For the demo window, a GitHub Actions keepalive workflow pings `/api/v1/health` during the day.

## How I Scoped V1

I split the product into three role-based surfaces:

1. **Public booking:** customers can browse services/stylists, select a slot, and book without login.
2. **Admin console:** one developer-provisioned admin manages the salon setup and operations.
3. **Stylist portal:** stylists see their own workday, history, profile, and walk-in flow.

The single-salon constraint removes the need for public salon onboarding, subscription logic, tenant switching, or marketplace discovery. The database still has a `salons` table because the domain needs salon timezone, operating hours, services, and ownership boundaries, but V1 treats it as one active shop.

## Key Design Decisions

### 1. No Public Admin Signup

Admin account creation is a controlled developer action.

This avoids:

- random public users creating salons
- unfinished onboarding states
- duplicate salon setup in a single-shop demo
- extra security review around public admin registration

The admin can still create stylist login accounts from the admin console.

### 2. UTC at Rest, Salon Timezone at the Edge

Bookings store `starts_at_utc` and `ends_at_utc` in UTC. The salon's IANA timezone is used for local date filtering and UI display.

This keeps storage consistent and avoids ambiguity around date boundaries.

### 3. Database-Enforced Double-Booking Protection

The application checks availability before booking, but the database is the final source of truth. A Postgres GiST exclusion constraint prevents overlapping active bookings for the same stylist.

That means two users cannot book the same stylist slot even if they submit at the same time.

### 4. Snapshot Booking Services

A booking can contain one or more services. `booking_services` snapshots service duration and price when the booking is created, so later service edits do not rewrite historical appointments.

### 5. India-Focused Demo

The demo data and UI are tuned for an Indian salon:

- salon timezone defaults to `Asia/Kolkata`
- phone inputs default to India `+91`
- currency displays as `Rs`
- demo salon/stylists/services use Indian names and pricing

## Current Data Model

```text
users ──┬─ salons ──┬─ services
        │           ├─ stylists ── stylist_specialties
        │           ├─ salon_operating_hours
        │           └─ stylist_availability
        └─ stylists (user_id for stylist login)

bookings ──┬─ booking_services
           └─ booking_charges
```

Roles:

- `admin`: developer-provisioned salon admin
- `stylist`: created by admin

Customers are intentionally anonymous in V1.

## Backend Structure

FastAPI routers are split by product surface:

- `auth`
- `public`
- `salon`
- `services`
- `stylists`
- `bookings`
- `dashboard`
- `stylist_portal`

Shared booking logic, such as availability calculation and overlap handling, is reused across public booking, admin reschedule, and stylist walk-ins.

## Frontend Structure

The frontend mirrors the roles:

- `/customer/booking` for public booking
- `/admin/*` for admin operations
- `/stylist/*` for stylist workflows
- `/login` chooses the correct dashboard after authentication

The app shell reads auth state after hydration to avoid server/client nav mismatches.

## What Shipped in V1

- Developer-provisioned admin credentials
- Single-salon setup and management
- Services CRUD
- Stylists CRUD with login accounts
- Salon operating hours
- Stylist availability
- Public booking without customer login
- Any-stylist booking mode
- Multi-service booking
- Booking confirmation
- Admin bookings page with booking actions
- Admin dashboard
- Stylist dashboard, schedule, history, profile, and walk-ins
- Country-code phone input
- INR formatting and Indian demo data
- Alembic migrations
- pytest suite

## What Is Intentionally Out of Scope

- Public admin signup
- Multi-salon marketplace
- Multi-location salon groups
- Customer accounts
- Payments
- SMS/email reminders
- Staff payroll or commission reports
- Production-grade notification/audit systems

## V2 - Next 

The most useful next layer would be:

- email/SMS confirmations and reminders
- Stripe deposits / pre-authorization at booking time
- holiday and one-off time-off blocks
- admin audit trail
- CSV export
- customer rebooking history
- **Client-side caching of availability & booking status** — cache slot lookups in `IndexedDB` / a service worker so repeat browsing is instant, booked slots disappear optimistically, and the booking flow still works on flaky mobile networks. The authoritative check still happens server-side at POST time so the cache can't cause double-bookings


## V3 — later

- Multi-location salons under one admin account
- Google Calendar **two-way sync** for stylists (not just the guest-side "add to calendar" link we ship today)
- No-show tracking with auto deposit-forfeit rules
- AI-assisted slot suggestions ("quietest Tuesday morning next month")
- Automated review requests post-appointment
- Stylist revenue share + commission reports


## How I used AI (ChatGpt, Codex and Cursor)

Cursor's agent was the pair programmer. I drove the **what** — the scope doc, the data model sketch, the UTC/local invariant, the exclusion-constraint decision — and delegated the **how**: scaffolding routers, generating Alembic migrations, writing pytest fixtures, and translating schemas into Pydantic + Zod. I reviewed every diff, rejected boilerplate that didn't match the MVP, and used failing tests as the contract whenever AI-written code drifted. The result: ~2 focused days from empty repo to deployed, timezone-correct, race-safe booking.

