"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { DEFAULT_SALON_ID, apiRequest, formatCurrency, todayInputValue } from "@/lib/api";
import type { DashboardSummary } from "@/types/api";

export default function OwnerDashboardPage() {
  return (
    <AppShell area="owner">
      <ProtectedPage role="owner">
        {({ token }) => <OwnerDashboard token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function OwnerDashboard({ token }: { token: string }) {
  const [date, setDate] = useState(todayInputValue());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<DashboardSummary>(
          `/dashboard/summary?salon_id=${DEFAULT_SALON_ID}&date=${date}&upcoming_limit=6`,
          { token },
        );
        setSummary(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [date, token]);

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Owner dashboard</span>
          <h1 className="page-title">Today at a glance</h1>
        </div>
        <div className="field">
          <label>Dashboard date</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </section>

      {error && <Notice kind="error">{error}</Notice>}
      {loading && <div className="loading">Loading dashboard...</div>}

      {summary && !loading && (
        <>
          <section className="grid grid-3 section">
            <div className="card">
              <span className="eyebrow">Bookings</span>
              <div className="metric">{summary.metrics.today_bookings}</div>
            </div>
            <div className="card">
              <span className="eyebrow">Revenue</span>
              <div className="metric">{formatCurrency(summary.metrics.today_revenue)}</div>
            </div>
            <div className="card">
              <span className="eyebrow">Upcoming</span>
              <div className="metric">{summary.metrics.upcoming_bookings}</div>
            </div>
          </section>

          <section className="grid grid-2 section">
            <div className="card stack">
              <h2>Upcoming appointments</h2>
              {summary.upcoming_appointments.length === 0 ? (
                <div className="empty">No upcoming appointments.</div>
              ) : (
                summary.upcoming_appointments.map((booking) => (
                  <Link
                    className="card select-card"
                    href={`/owner/bookings?date_from=${booking.local_date}&date_to=${booking.local_date}`}
                    key={booking.id}
                  >
                    <strong>{booking.customer_name}</strong>
                    <p>
                      {booking.service_name} with {booking.stylist_name}
                    </p>
                    <span className="pill">{new Date(booking.starts_at_utc).toLocaleString()}</span>
                  </Link>
                ))
              )}
            </div>
            <div className="card stack">
              <h2>Stylist utilization</h2>
              {summary.stylist_utilization.map((item) => (
                <div className="card" key={item.stylist_id}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{item.stylist_name}</strong>
                    <span className="pill">{item.utilization_percent}%</span>
                  </div>
                  <p>
                    {item.booked_minutes} booked of {item.available_minutes} available minutes
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
