"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { apiRequest, todayInputValue } from "@/lib/api";
import type { Booking } from "@/types/api";

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function StylistDashboardPage() {
  return (
    <AppShell area="stylist">
      <ProtectedPage role="stylist">
        {({ token, user }) => <StylistDashboard token={token} email={user.email} />}
      </ProtectedPage>
    </AppShell>
  );
}

function StylistDashboard({ token, email }: { token: string; email: string }) {
  const [date, setDate] = useState(todayInputValue());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weekBookings, setWeekBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const weekEnd = addDays(date, 6);
        const [dayData, weekData] = await Promise.all([
          apiRequest<Booking[]>(`/stylist/me/schedule?date=${date}`, { token }),
          apiRequest<Booking[]>(`/stylist/me/booking-history?date_from=${date}&date_to=${weekEnd}`, { token }),
        ]);
        setBookings(dayData);
        setWeekBookings(weekData);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [date, token]);

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Stylist dashboard</span>
          <h1 className="page-title">Your workday</h1>
          <p className="lead">{email}</p>
        </div>
        <div className="row">
          <div className="field">
            <label>Dashboard date</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <Link className="button" href="/stylist/walk-in">
            Add walk-in
          </Link>
        </div>
      </section>
      {error && <Notice kind="error">{error}</Notice>}
      {loading && <div className="loading">Loading stylist dashboard...</div>}
      <section className="grid grid-3 section">
        <div className="card">
          <span className="eyebrow">Selected day</span>
          <div className="metric">{bookings.length}</div>
          <p>appointments</p>
        </div>
        <Link className="card select-card" href="/stylist/schedule">
          <h2>Schedule</h2>
          <p className="lead">See today's appointments and choose another date.</p>
        </Link>
        <Link className="card select-card" href="/stylist/history">
          <h2>History</h2>
          <p className="lead">Review completed, cancelled, and previous bookings.</p>
        </Link>
      </section>
      <section className="card stack section">
        <h2>Selected day appointments</h2>
        {bookings.length === 0 ? (
          <div className="empty">No appointments for this date.</div>
        ) : (
          bookings.map((booking) => (
            <div className="card" key={booking.id}>
              <strong>{booking.customer_name}</strong>
              <p>
                {booking.service_name}, {new Date(booking.starts_at_utc).toLocaleString()}
              </p>
              <p className="muted">
                {booking.customer_phone}
                {booking.customer_email ? ` | ${booking.customer_email}` : ""}
              </p>
            </div>
          ))
        )}
      </section>
      <section className="card stack section">
        <h2>Full week bookings</h2>
        <p className="muted">
          {date} to {addDays(date, 6)}
        </p>
        {weekBookings.length === 0 ? (
          <div className="empty">No bookings in this week.</div>
        ) : (
          weekBookings.map((booking) => (
            <div className="card" key={booking.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{booking.customer_name}</strong>
                <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
              </div>
              <p>
                {booking.service_name}, {new Date(booking.starts_at_utc).toLocaleString()}
              </p>
              <p className="muted">
                {booking.customer_phone}
                {booking.customer_email ? ` | ${booking.customer_email}` : ""}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
