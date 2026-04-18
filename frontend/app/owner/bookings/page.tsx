"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { DEFAULT_SALON_ID, apiRequest, formatCurrency, formatTime, todayInputValue } from "@/lib/api";
import type { AvailabilityResponse, AvailableSlot, Booking } from "@/types/api";

function initialDateRange() {
  const today = todayInputValue();

  if (typeof window === "undefined") {
    return { dateFrom: today, dateTo: today };
  }

  const params = new URLSearchParams(window.location.search);
  const queryDateFrom = params.get("date_from") ?? today;
  const queryDateTo = params.get("date_to") ?? queryDateFrom;

  return {
    dateFrom: queryDateFrom,
    dateTo: queryDateTo < queryDateFrom ? queryDateFrom : queryDateTo,
  };
}

export default function OwnerBookingsPage() {
  return (
    <AppShell area="owner">
      <ProtectedPage role="owner">
        {({ token }) => <OwnerBookings token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function OwnerBookings({ token }: { token: string }) {
  const initialDates = initialDateRange();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dateFrom, setDateFrom] = useState(initialDates.dateFrom);
  const [dateTo, setDateTo] = useState(initialDates.dateTo);
  const [rescheduleDateById, setRescheduleDateById] = useState<Record<number, string>>({});
  const [rescheduleSlotById, setRescheduleSlotById] = useState<Record<number, AvailableSlot | undefined>>({});
  const [rescheduleSlotsById, setRescheduleSlotsById] = useState<Record<number, AvailableSlot[]>>({});
  const [rescheduleLoadingById, setRescheduleLoadingById] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadBookings() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Booking[]>(
        `/bookings?salon_id=${DEFAULT_SALON_ID}&date_from=${dateFrom}&date_to=${dateTo}`,
        { token },
      );
      setBookings(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [dateFrom, dateTo, token]);

  function updateDateFrom(value: string) {
    setDateFrom(value);
    setDateTo((current) => (current < value ? value : current));
  }

  function updateDateTo(value: string) {
    setDateTo(value < dateFrom ? dateFrom : value);
  }

  async function action(path: string, method: "PUT" | "POST", body: unknown, success: string) {
    setMessage("");
    setError("");
    try {
      await apiRequest(path, { method, token, body });
      setMessage(success);
      await loadBookings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    }
  }

  async function rescheduleBooking(booking: Booking) {
    const newSlot = rescheduleSlotById[booking.id];

    if (!newSlot) {
      setMessage("");
      setError("Choose an available reschedule slot first.");
      return;
    }

    await action(
      `/bookings/${booking.id}/reschedule`,
      "PUT",
      { starts_at_utc: newSlot.starts_at_utc, notes: booking.notes },
      "Booking rescheduled.",
    );
  }

  async function loadRescheduleSlots(booking: Booking, targetDate = rescheduleDateById[booking.id] ?? booking.local_date) {
    setMessage("");
    setError("");
    setRescheduleLoadingById((current) => ({ ...current, [booking.id]: true }));
    setRescheduleSlotById((current) => ({ ...current, [booking.id]: undefined }));
    try {
      const availability = await apiRequest<AvailabilityResponse>(
        `/public/availability?stylist_id=${booking.stylist_id}&service_id=${booking.service_id}&date=${targetDate}`,
      );
      setRescheduleSlotsById((current) => ({ ...current, [booking.id]: availability.slots }));
      setRescheduleDateById((current) => ({ ...current, [booking.id]: targetDate }));
    } catch (caught) {
      setRescheduleSlotsById((current) => ({ ...current, [booking.id]: [] }));
      setError(caught instanceof Error ? caught.message : "Could not load reschedule slots.");
    } finally {
      setRescheduleLoadingById((current) => ({ ...current, [booking.id]: false }));
    }
  }

  return (
    <main className="page">
        <section className="section-header">
          <div>
            <span className="eyebrow">Owner</span>
            <h1 className="page-title">Bookings</h1>
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
        {message && <Notice kind="success">{message}</Notice>}
        <section className="card stack section">
          {loading ? (
            <div className="loading">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="empty">No bookings found for this range.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Appointment</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Reschedule</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.customer_name}</strong>
                        <br />
                        {booking.customer_phone}
                        {booking.customer_email && (
                          <>
                            <br />
                            <span className="muted">{booking.customer_email}</span>
                          </>
                        )}
                      </td>
                      <td>
                        {booking.service_name} with {booking.stylist_name}
                        <br />
                        {new Date(booking.starts_at_utc).toLocaleString()}
                      </td>
                      <td>
                        <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
                        <br />
                        {booking.booking_type}
                      </td>
                      <td>
                        {formatCurrency(booking.amount)}
                        <br />
                        <span className={`status-badge status-${booking.payment_status ?? "none"}`}>
                          {booking.payment_status ?? "none"}
                        </span>
                      </td>
                      <td>
                        <div className="stack">
                          <input
                            className="input"
                            disabled={booking.status !== "booked"}
                            min={todayInputValue()}
                            type="date"
                            value={rescheduleDateById[booking.id] ?? booking.local_date}
                            onChange={(event) => {
                              const targetDate = event.target.value;
                              setRescheduleDateById((current) => ({ ...current, [booking.id]: targetDate }));
                              loadRescheduleSlots(booking, targetDate);
                            }}
                          />
                          <button
                            className="button secondary"
                            disabled={booking.status !== "booked" || rescheduleLoadingById[booking.id]}
                            onClick={() => loadRescheduleSlots(booking)}
                            type="button"
                          >
                            {rescheduleLoadingById[booking.id] ? "Checking..." : "Show slots"}
                          </button>
                          {rescheduleSlotsById[booking.id] && (
                            <div className="slot-grid compact-slots">
                              {rescheduleSlotsById[booking.id].length === 0 ? (
                                <span className="muted">No slots.</span>
                              ) : (
                                rescheduleSlotsById[booking.id].map((slot) => (
                                  <button
                                    className={`slot ${
                                      rescheduleSlotById[booking.id]?.starts_at_utc === slot.starts_at_utc ? "active" : ""
                                    }`}
                                    disabled={booking.status !== "booked"}
                                    key={slot.starts_at_utc}
                                    onClick={() =>
                                      setRescheduleSlotById((current) => ({ ...current, [booking.id]: slot }))
                                    }
                                    type="button"
                                  >
                                    {formatTime(slot.starts_at_local)}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="row">
                          <button
                            className="button secondary"
                            disabled={booking.status !== "booked"}
                            onClick={() =>
                              action(`/bookings/${booking.id}/status`, "PUT", { status: "completed" }, "Marked completed.")
                            }
                            type="button"
                          >
                            Complete
                          </button>
                          <button
                            className="button secondary"
                            disabled={
                              booking.status === "cancelled" ||
                              booking.payment_status === "paid" ||
                              booking.payment_status === "refunded"
                            }
                            onClick={() =>
                              action(`/bookings/${booking.id}/payment-status`, "PUT", { status: "paid" }, "Payment marked paid.")
                            }
                            type="button"
                          >
                            Paid
                          </button>
                          <button
                            className="button danger"
                            disabled={booking.status !== "booked"}
                            onClick={() =>
                              action(`/bookings/${booking.id}/cancel`, "POST", { reason: "Cancelled by owner" }, "Booking cancelled.")
                            }
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="button secondary"
                            disabled={booking.status !== "booked" || !rescheduleSlotById[booking.id]}
                            onClick={() => rescheduleBooking(booking)}
                            type="button"
                          >
                            Reschedule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
    </main>
  );
}
