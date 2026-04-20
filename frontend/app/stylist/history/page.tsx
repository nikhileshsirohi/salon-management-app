"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { StylistBookingCard } from "@/components/bookings/stylist-booking-card";
import { Notice } from "@/components/ui/notice";
import { apiRequest, todayInputValue } from "@/lib/api";
import { weekDateRange } from "@/lib/date-range";
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
  const initialDates = weekDateRange(todayInputValue());
  const [dateFrom, setDateFrom] = useState(initialDates.dateFrom);
  const [dateTo, setDateTo] = useState(initialDates.dateTo);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadHistory();
  }, [dateFrom, dateTo, token]);

  function updateDateFrom(value: string) {
    setDateFrom(value);
    setDateTo((current) => (current < value ? value : current));
  }

  function updateDateTo(value: string) {
    setDateTo(value < dateFrom ? dateFrom : value);
  }

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
            <input type="date" value={dateFrom} onChange={(event) => updateDateFrom(event.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input min={dateFrom} type="date" value={dateTo} onChange={(event) => updateDateTo(event.target.value)} />
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
            <StylistBookingCard booking={booking} key={booking.id} onChanged={loadHistory} token={token} />
          ))
        )}
      </section>
    </main>
  );
}
