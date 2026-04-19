"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { StylistBookingCard } from "@/components/bookings/stylist-booking-card";
import { Notice } from "@/components/ui/notice";
import { apiRequest, todayInputValue } from "@/lib/api";
import type { Booking } from "@/types/api";

export default function StylistSchedulePage() {
  return (
    <AppShell area="stylist">
      <ProtectedPage role="stylist">
        {({ token }) => <StylistSchedule token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function StylistSchedule({ token }: { token: string }) {
  const [date, setDate] = useState(todayInputValue());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSchedule() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Booking[]>(`/stylist/me/schedule?date=${date}`, { token });
      setBookings(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, [date, token]);

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Stylist portal</span>
          <h1 className="page-title">My schedule</h1>
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </section>
      {error && <Notice kind="error">{error}</Notice>}
      <section className="card stack section">
        {loading ? (
          <div className="loading">Loading schedule...</div>
        ) : bookings.length === 0 ? (
          <div className="empty">No appointments for this date.</div>
        ) : (
          bookings.map((booking) => (
            <StylistBookingCard booking={booking} key={booking.id} onChanged={loadSchedule} token={token} />
          ))
        )}
      </section>
    </main>
  );
}
