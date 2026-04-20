"use client";

import { useState } from "react";
import { Notice } from "@/components/ui/notice";
import { apiRequest, formatCurrency, formatTime, todayInputValue } from "@/lib/api";
import type { AvailabilityResponse, AvailableSlot, Booking } from "@/types/api";

type StylistBookingCardProps = {
  booking: Booking;
  token: string;
  onChanged: () => Promise<void> | void;
};

export function StylistBookingCard({ booking, token, onChanged }: StylistBookingCardProps) {
  const [rescheduleDate, setRescheduleDate] = useState(booking.local_date);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runAction(path: string, method: "PUT" | "POST", body: unknown, success: string) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiRequest(path, { method, token, body });
      setMessage(success);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  async function loadSlots(targetDate = rescheduleDate) {
    setLoadingSlots(true);
    setMessage("");
    setError("");
    setSelectedSlot(null);
    try {
      const availability = await apiRequest<AvailabilityResponse>(
        `/stylist/me/availability?service_id=${booking.service_id}&date=${targetDate}`,
        { token },
      );
      setRescheduleSlots(availability.slots);
    } catch (caught) {
      setRescheduleSlots([]);
      setError(caught instanceof Error ? caught.message : "Could not load slots.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function reschedule() {
    if (!selectedSlot) {
      setError("Choose an available slot first.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiRequest(`/stylist/me/bookings/${booking.id}/reschedule`, {
        method: "PUT",
        token,
        body: { starts_at_utc: selectedSlot.starts_at_utc, notes: booking.notes },
      });
      setMessage("Booking rescheduled.");
      setRescheduleSlots(null);
      setSelectedSlot(null);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reschedule booking.");
    } finally {
      setSaving(false);
    }
  }

  const isBooked = booking.status === "booked";
  const canMarkPaid = booking.status !== "cancelled" && booking.payment_status !== "paid" && booking.payment_status !== "refunded";

  return (
    <div className="card booking-card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>{booking.customer_name}</strong>
          <p className="muted">
            {booking.customer_phone}
            {booking.customer_email ? ` | ${booking.customer_email}` : ""}
          </p>
        </div>
        <div className="row">
          <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
          <span className={`status-badge status-${booking.payment_status ?? "none"}`}>
            {booking.payment_status ?? "none"}
          </span>
        </div>
      </div>
      <div className="booking-card-media">
        <img
          alt="Salon appointment"
          src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=500&q=80"
        />
        <div>
          <h3>
            {booking.services && booking.services.length > 0
              ? booking.services.map((s) => s.name).join(" + ")
              : booking.service_name}
          </h3>
          {booking.services && booking.services.length > 1 && (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {booking.services.map((service) => (
                <span className="pill rose" key={service.service_id}>
                  {service.name}
                </span>
              ))}
            </div>
          )}
          <p>{new Date(booking.starts_at_utc).toLocaleString()}</p>
          <p>{formatCurrency(booking.amount)}</p>
          {booking.notes && <p className="muted">{booking.notes}</p>}
        </div>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      <div className="row action-row">
        <button
          className="button secondary"
          disabled={!isBooked || saving}
          onClick={() => runAction(`/stylist/me/bookings/${booking.id}/status`, "PUT", { status: "completed" }, "Marked completed.")}
          type="button"
        >
          Complete
        </button>
        <button
          className="button secondary"
          disabled={!canMarkPaid || saving}
          onClick={() =>
            runAction(`/stylist/me/bookings/${booking.id}/payment-status`, "PUT", { status: "paid" }, "Payment marked paid.")
          }
          type="button"
        >
          Paid
        </button>
        <button
          className="button danger"
          disabled={!isBooked || saving}
          onClick={() =>
            runAction(`/stylist/me/bookings/${booking.id}/cancel`, "POST", { reason: "Cancelled by stylist" }, "Booking cancelled.")
          }
          type="button"
        >
          Cancel
        </button>
      </div>
      <div className="reschedule-panel">
        <div className="form-grid">
          <div className="field">
            <label>Reschedule date</label>
            <input
              disabled={!isBooked}
              min={todayInputValue()}
              type="date"
              value={rescheduleDate}
              onChange={(event) => {
                setRescheduleDate(event.target.value);
                setRescheduleSlots(null);
                setSelectedSlot(null);
              }}
            />
          </div>
          <div className="field">
            <label>Slots</label>
            <button className="button secondary" disabled={!isBooked || loadingSlots} onClick={() => loadSlots()} type="button">
              {loadingSlots ? "Checking..." : "Show slots"}
            </button>
          </div>
        </div>
        {rescheduleSlots && (
          <div className="slot-grid compact-slots">
            {rescheduleSlots.length === 0 ? (
              <span className="muted">No slots.</span>
            ) : (
              rescheduleSlots.map((slot) => (
                <button
                  className={`slot ${selectedSlot?.starts_at_utc === slot.starts_at_utc ? "active" : ""}`}
                  disabled={!isBooked}
                  key={slot.starts_at_utc}
                  onClick={() => setSelectedSlot(slot)}
                  type="button"
                >
                  {formatTime(slot.starts_at_local)}
                </button>
              ))
            )}
          </div>
        )}
        <button className="button" disabled={!isBooked || !selectedSlot || saving} onClick={reschedule} type="button">
          Reschedule
        </button>
      </div>
    </div>
  );
}
