# V1 Scope

V1 is a single-salon booking and management app.

There is no public admin signup. The developer team provisions the admin account and shares credentials directly with the salon admin.

## Salon Model

- One salon shop for V1.
- One developer-provisioned admin account.
- Admin manages the salon profile, timezone, services, stylists, hours, and bookings.
- Multi-salon and multi-location support are later features.

## Admin

- Log in with credentials provided by the developer team.
- Manage salon profile.
- Select salon timezone.
- Manage services and prices in Rs.
- Create and manage stylist login accounts.
- Manage stylist profile details, phone number, photo URL, and specialties.
- Set salon operating hours.
- Set stylist availability.
- View bookings for the current week by default.
- Reschedule, complete, cancel, and mark bookings paid.
- View dashboard metrics.

## Stylist

- Log in with credentials created by the admin.
- View selected-day schedule.
- View current-week dashboard bookings.
- View booking history with current week selected by default.
- Add walk-in bookings.
- Update profile details.
- Change password.

## Customer

- Book without login.
- Browse services and stylists.
- Choose a specific stylist or any available stylist.
- Select one or more services.
- View available slots.
- Enter name, phone with country code, and optional email.
- See booking confirmation.
- Add booking to calendar.

## System

- Prevent double booking at the database level.
- Store appointment timestamps in UTC.
- Display and filter bookings in the salon timezone.
- Use India-focused demo data.
- Display currency as Rs.
- Default phone country code to India `+91`.
- Support global country codes in phone fields.
- Work on mobile and desktop.
- Expose a lightweight health API at `/api/v1/health`.

## Out of Scope for V1

- Public admin signup.
- Public salon onboarding.
- Multiple salon shops.
- Multi-location support.
- Customer accounts.
- Online payments.
- SMS/email reminders.
- Payroll or commission reports.
- Advanced audit logs.
- AI features.

## Later

- Email and SMS confirmations.
- Payment deposits.
- Holidays and one-off time-off blocks.
- Admin audit trail.
- CSV exports.
- Customer rebooking history.
- Multi-location salons.
