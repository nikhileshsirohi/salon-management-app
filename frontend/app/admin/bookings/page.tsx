"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { apiRequest, formatCurrency, formatTime, todayInputValue } from "@/lib/api";
import { weekDateRange } from "@/lib/date-range";
import { useAdminSalon } from "@/lib/use-admin-salon";
import type { AvailabilityResponse, AvailableSlot, Booking } from "@/types/api";

function initialDateRange() {
  const currentWeek = weekDateRange(todayInputValue());

  if (typeof window === "undefined") {
    return currentWeek;
  }

  const params = new URLSearchParams(window.location.search);
  const queryDateFrom = params.get("date_from") ?? currentWeek.dateFrom;
  const queryDateTo = params.get("date_to") ?? currentWeek.dateTo;

  return {
    dateFrom: queryDateFrom,
    dateTo: queryDateTo < queryDateFrom ? queryDateFrom : queryDateTo,
  };
}

export default function AdminBookingsPage() {
  return (
    <AppShell area="admin">
      <ProtectedPage role="admin">
        {({ token }) => <AdminBookings token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function AdminBookings({ token }: { token: string }) {
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
  const { salonId, loading: salonLoading, error: salonError } = useAdminSalon(token);

  async function loadBookings() {
    if (!salonId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Booking[]>(
        `/bookings?salon_id=${salonId}&date_from=${dateFrom}&date_to=${dateTo}`,
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
  }, [dateFrom, dateTo, salonId, token]);

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

    setMessage("");
    setError("");
    try {
      await apiRequest(`/bookings/${booking.id}/reschedule`, {
        method: "PUT",
        token,
        body: { starts_at_utc: newSlot.starts_at_utc, notes: booking.notes },
      });
      setMessage("Booking rescheduled.");
      setRescheduleSlotsById((current) => {
        const next = { ...current };
        delete next[booking.id];
        return next;
      });
      setRescheduleSlotById((current) => ({ ...current, [booking.id]: undefined }));
      await loadBookings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reschedule booking.");
    }
  }

  async function loadRescheduleSlots(booking: Booking, targetDate = rescheduleDateById[booking.id] ?? booking.local_date) {
    setMessage("");
    setError("");
    setRescheduleLoadingById((current) => ({ ...current, [booking.id]: true }));
    setRescheduleSlotById((current) => ({ ...current, [booking.id]: undefined }));
    try {
      const additionalIds =
        booking.services
          ?.filter((s) => s.service_id !== booking.service_id)
          .map((s) => s.service_id) ?? [];
      const params = new URLSearchParams();
      params.set("stylist_id", String(booking.stylist_id));
      params.set("service_id", String(booking.service_id));
      params.set("date", targetDate);
      for (const extraId of additionalIds) {
        params.append("additional_service_ids", String(extraId));
      }
      const availability = await apiRequest<AvailabilityResponse>(
        `/public/availability?${params.toString()}`,
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
            <span className="eyebrow">Admin</span>
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
        {(error || salonError) && <Notice kind="error">{error || salonError}</Notice>}
        {message && <Notice kind="success">{message}</Notice>}
        <section className="card stack section">
          {loading || salonLoading ? (
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
                        {booking.services && booking.services.length > 0
                          ? booking.services.map((s) => s.name).join(" + ")
                          : booking.service_name}{" "}
                        with {booking.stylist_name}
                        {booking.services && booking.services.length > 1 && (
                          <>
                            {" "}
                            <span className="pill rose" style={{ fontSize: 11 }}>
                              {booking.services.length} services
                            </span>
                          </>
                        )}
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
                              action(`/bookings/${booking.id}/cancel`, "POST", { reason: "Cancelled by admin" }, "Booking cancelled.")
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
