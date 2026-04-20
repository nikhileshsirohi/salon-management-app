"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { apiRequest, formatCurrency, todayInputValue } from "@/lib/api";
import { useAdminSalon } from "@/lib/use-admin-salon";
import type { DashboardSummary } from "@/types/api";

export default function AdminDashboardPage() {
  return (
    <AppShell area="admin">
      <ProtectedPage role="admin">
        {({ token }) => <AdminDashboard token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function AdminDashboard({ token }: { token: string }) {
  const [date, setDate] = useState(todayInputValue());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { salon, salonId, loading: salonLoading, error: salonError } = useAdminSalon(token);

  useEffect(() => {
    async function loadSummary() {
      if (!salonId) return;
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<DashboardSummary>(
          `/dashboard/summary?salon_id=${salonId}&date=${date}&upcoming_limit=6`,
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
  }, [date, salonId, token]);

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Admin dashboard</span>
          <h1 className="page-title">Today at a glance</h1>
          {salon && <p className="lead">{salon.name}</p>}
        </div>
        <div className="field">
          <label>Dashboard date</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </section>

      {(error || salonError) && <Notice kind="error">{error || salonError}</Notice>}
      {(loading || salonLoading) && <div className="loading">Loading dashboard...</div>}

      {summary && !loading && (
        <>
          <section className="visual-band section">
            <img
              alt="Salon styling stations"
              src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1400&q=85"
            />
            <div className="visual-band-text">
              <h2>{salon?.name ?? "Salon"} flow</h2>
              <p>Bookings, payments, and stylist time stay connected through the day.</p>
            </div>
          </section>
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
                    href={`/admin/bookings?date_from=${booking.local_date}&date_to=${booking.local_date}`}
                    key={booking.id}
                  >
                    <strong>{booking.customer_name}</strong>
                    <p>
                      {booking.services && booking.services.length > 0
                        ? booking.services.map((s) => s.name).join(" + ")
                        : booking.service_name}{" "}
                      with {booking.stylist_name}
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
