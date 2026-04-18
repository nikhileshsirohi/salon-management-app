"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { apiRequest, todayInputValue } from "@/lib/api";
import type { Booking } from "@/types/api";

export default function StylistHistoryPage() {
  return (
    <AppShell area="stylist">
      <ProtectedPage role="stylist">
        {({ token }) => <StylistHistory token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function StylistHistory({ token }: { token: string }) {
  const [dateFrom, setDateFrom] = useState(todayInputValue());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<Booking[]>(
          `/stylist/me/booking-history?date_from=${dateFrom}&date_to=${dateTo}`,
          { token },
        );
        setBookings(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load booking history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [dateFrom, dateTo, token]);

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Stylist portal</span>
          <h1 className="page-title">Booking history</h1>
        </div>
        <div className="row">
          <div className="field">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>
      </section>
      {error && <Notice kind="error">{error}</Notice>}
      <section className="card stack section">
        {loading ? (
          <div className="loading">Loading history...</div>
        ) : bookings.length === 0 ? (
          <div className="empty">No booking history for this range.</div>
        ) : (
          bookings.map((booking) => (
            <div className="card" key={booking.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{booking.customer_name}</strong>
                <span className="pill">{booking.status}</span>
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
