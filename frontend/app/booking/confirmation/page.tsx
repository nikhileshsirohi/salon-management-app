"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { formatCurrency, formatTime } from "@/lib/api";
import {
  type BookingConfirmationPayload,
  buildGoogleCalendarUrl,
  downloadIcsFile,
  readBookingConfirmation,
} from "@/lib/booking-confirmation";

function formatLongDate(isoDateString: string): string {
  const date = new Date(`${isoDateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatLocalTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export default function BookingConfirmationPage() {
  const [payload, setPayload] = useState<BookingConfirmationPayload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Intentionally no cleanup: in React Strict Mode (dev) effects run
    // mount → unmount → mount, so clearing storage on unmount would wipe the
    // payload before the real mount reads it. The payload self-expires after
    // 30 minutes via readBookingConfirmation, which is enough for this flow.
    setPayload(readBookingConfirmation());
    setReady(true);
  }, []);

  const googleUrl = useMemo(
    () => (payload ? buildGoogleCalendarUrl(payload) : ""),
    [payload],
  );

  if (!ready) {
    return (
      <AppShell>
        <main className="page">
          <div className="loading">Preparing your confirmation…</div>
        </main>
      </AppShell>
    );
  }

  if (!payload) {
    return (
      <AppShell>
        <main className="page">
          <div
            className="card stack"
            style={{ padding: 48, textAlign: "center", maxWidth: 640, margin: "40px auto" }}
          >
            <span className="eyebrow">No reservation in this session</span>
            <h1 className="page-title" style={{ marginTop: 0 }}>
              Ready to book your visit?
            </h1>
            <p className="lead" style={{ margin: "0 auto" }}>
              We couldn&rsquo;t find a recent reservation to confirm. Start a new booking and we
              will have your calendar-ready receipt waiting here.
            </p>
            <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 12 }}>
              <Link className="button primary" href="/booking">
                Book a visit
              </Link>
              <Link className="button secondary" href="/">
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const { booking, salon, stylistName, services } = payload;
  const serviceLabel = services.map((s) => s.name).join(" + ");
  const resolvedStylist = stylistName ?? booking.stylist_name ?? "Our team";

  return (
    <AppShell>
      <main className="page">
        <section className="confirmation-hero">
          <div className="confirmation-card card stack">
            <div
              className="confirmation-check"
              role="img"
              aria-label="Booking confirmed"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <span className="eyebrow">Thank you for booking with us</span>
            <h1 className="page-title confirmation-title">
              You&rsquo;re on the books, {booking.customer_name.split(" ")[0] || "friend"}.
            </h1>
            <p className="lead confirmation-lead">
              We&rsquo;ve saved your chair at <strong>{salon?.name ?? "Maison Salon"}</strong>
              {stylistName ? (
                <>
                  {" "}
                  with <strong>{resolvedStylist}</strong>
                </>
              ) : null}
              . A confirmation is on its way, and a gentle reminder will arrive before your visit.
            </p>

            <div className="confirmation-meta">
              <div className="confirmation-meta-row">
                <span className="confirmation-meta-label">Date</span>
                <strong>{formatLongDate(booking.local_date)}</strong>
              </div>
              <div className="confirmation-meta-row">
                <span className="confirmation-meta-label">Time</span>
                <strong>
                  {formatLocalTime(booking.starts_at_utc)}
                  {" – "}
                  {formatLocalTime(booking.ends_at_utc)}
                </strong>
              </div>
              <div className="confirmation-meta-row">
                <span className="confirmation-meta-label">Stylist</span>
                <strong>{resolvedStylist}</strong>
              </div>
              <div className="confirmation-meta-row">
                <span className="confirmation-meta-label">Duration</span>
                <strong>
                  {formatDuration(
                    booking.total_duration_minutes ??
                      services.reduce((sum, s) => sum + s.duration_minutes, 0),
                  )}
                </strong>
              </div>
              {salon?.address && (
                <div className="confirmation-meta-row">
                  <span className="confirmation-meta-label">Studio</span>
                  <strong>{salon.address}</strong>
                </div>
              )}
            </div>

            <div className="confirmation-services">
              <span className="confirmation-meta-label">
                Services ({services.length})
              </span>
              <ul className="confirmation-service-list">
                {services.map((service, index) => (
                  <li key={`${service.id}-${index}`}>
                    <span>
                      <span className="confirmation-service-idx">{index + 1}</span>
                      {service.name}
                      <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                        · {service.duration_minutes} min
                      </span>
                    </span>
                    <strong>{formatCurrency(service.price)}</strong>
                  </li>
                ))}
              </ul>
              <div className="confirmation-total">
                <span>Total</span>
                <span className="confirmation-total-amount">
                  {booking.amount ? formatCurrency(booking.amount) : "—"}
                </span>
              </div>
            </div>

            <div className="confirmation-actions">
              <button
                className="button primary"
                onClick={() => downloadIcsFile(payload)}
                type="button"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Add to calendar (.ics)
              </button>
              <a
                className="button secondary"
                href={googleUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Add to Google Calendar
              </a>
            </div>

            <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
              The .ics file works with Apple Calendar, Outlook, and most clients. Sent to the wrong
              address? Reply to the confirmation email to let us know.
            </p>

            <div className="row confirmation-secondary-links">
              <Link href="/booking">Book another visit</Link>
              <span className="confirmation-dot" aria-hidden>·</span>
              <Link href="/">Back to home</Link>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
