"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { PhoneInput } from "@/components/ui/phone-input";
import { apiRequest, formatCurrency, formatTime, todayInputValue } from "@/lib/api";
import { isValidPhoneNumber, normalizePhoneNumber, phoneValidationMessage } from "@/lib/phone";
import type { AvailabilityResponse, AvailableSlot, Service } from "@/types/api";

export default function StylistWalkInPage() {
  return (
    <AppShell area="stylist">
      <ProtectedPage role="stylist">
        {({ token }) => <StylistWalkIn token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function StylistWalkIn({ token }: { token: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(todayInputValue());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+91 ");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await apiRequest<Service[]>("/stylist/me/services", { token });
        setServices(data);
        setServiceId(data[0]?.id ?? null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load services.");
      }
    }
    loadServices();
  }, [token]);

  useEffect(() => {
    async function loadAvailability() {
      if (!serviceId || !date) return;
      setSlotsLoading(true);
      setSelectedSlot(null);
      setError("");
      try {
        const availability = await apiRequest<AvailabilityResponse>(
          `/stylist/me/availability?service_id=${serviceId}&date=${date}`,
          { token },
        );
        setSlots(availability.slots);
      } catch (caught) {
        setSlots([]);
        setError(caught instanceof Error ? caught.message : "Could not load your availability.");
      } finally {
        setSlotsLoading(false);
      }
    }

    loadAvailability();
  }, [date, serviceId, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot || !serviceId) {
      setError("Choose a service, date, and available slot.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Customer name and phone are required.");
      return;
    }
    const normalizedPhone = normalizePhoneNumber(customerPhone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      setError(phoneValidationMessage("Customer phone"));
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/stylist/me/walk-ins", {
        method: "POST",
        token,
        body: {
          service_id: serviceId,
          customer_name: customerName,
          customer_phone: normalizedPhone,
          customer_email: customerEmail || null,
          starts_at_utc: selectedSlot.starts_at_utc,
          notes: notes || null,
        },
      });
      setMessage(`Walk-in added for ${formatTime(selectedSlot.starts_at_local)} on ${date}.`);
      setCustomerName("");
      setCustomerPhone("+91 ");
      setCustomerEmail("");
      setSelectedSlot(null);
      setNotes("");
      const availability = await apiRequest<AvailabilityResponse>(
        `/stylist/me/availability?service_id=${serviceId}&date=${date}`,
        { token },
      );
      setSlots(availability.slots);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add walk-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Stylist portal</span>
          <h1 className="page-title">Add walk-in</h1>
          <p className="lead">Choose a real available opening, then add the customer details.</p>
        </div>
      </section>
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      <form className="card stack section" onSubmit={submit}>
        <div className="field">
          <label>Service</label>
          <select value={serviceId ?? ""} onChange={(event) => setServiceId(Number(event.target.value))}>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {formatCurrency(service.price)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input min={todayInputValue()} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="stack">
          <strong>Available slots</strong>
          {slotsLoading ? (
            <div className="loading">Checking your openings...</div>
          ) : slots.length === 0 ? (
            <div className="empty">No slots available for this service and date.</div>
          ) : (
            <div className="slot-grid">
              {slots.map((slot) => (
                <button
                  className={`slot ${selectedSlot?.starts_at_utc === slot.starts_at_utc ? "active" : ""}`}
                  key={slot.starts_at_utc}
                  onClick={() => setSelectedSlot(slot)}
                  type="button"
                >
                  {formatTime(slot.starts_at_local)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Customer name</label>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
          </div>
          <PhoneInput value={customerPhone} onChange={setCustomerPhone} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <button className="button" disabled={saving || !serviceId || !selectedSlot} type="submit">
          {saving ? "Adding..." : "Add walk-in"}
        </button>
      </form>
    </main>
  );
}
