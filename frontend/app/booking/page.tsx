"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Notice } from "@/components/ui/notice";
import { DEFAULT_SALON_ID, apiRequest, formatCurrency, formatTime, todayInputValue } from "@/lib/api";
import type { AvailabilityResponse, AvailableSlot, Service, Stylist } from "@/types/api";

type BookingForm = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
};

const initialForm: BookingForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  notes: "",
};

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [stylistId, setStylistId] = useState<number | null>(null);
  const [date, setDate] = useState(todayInputValue());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId],
  );

  useEffect(() => {
    async function loadPublicData() {
      setLoading(true);
      setError("");
      try {
        const [serviceData, stylistData] = await Promise.all([
          apiRequest<{ services: Service[] }>(`/public/services?salon_id=${DEFAULT_SALON_ID}`),
          apiRequest<{ stylists: Stylist[] }>(`/public/stylists?salon_id=${DEFAULT_SALON_ID}`),
        ]);
        setServices(serviceData.services);
        setStylists(stylistData.stylists);
        setServiceId(serviceData.services[0]?.id ?? null);
        setStylistId(stylistData.stylists[0]?.id ?? null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load booking options.");
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, []);

  useEffect(() => {
    async function loadSlots() {
      if (!serviceId || !stylistId || !date) return;
      setSlotsLoading(true);
      setSelectedSlot(null);
      setError("");
      try {
        const availability = await apiRequest<AvailabilityResponse>(
          `/public/availability?stylist_id=${stylistId}&service_id=${serviceId}&date=${date}`,
        );
        setSlots(availability.slots);
      } catch (caught) {
        setSlots([]);
        setError(caught instanceof Error ? caught.message : "Could not load availability.");
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots();
  }, [serviceId, stylistId, date]);

  async function submitBooking(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedSlot || !serviceId || !stylistId) {
      setError("Choose a service, stylist, date, and time slot.");
      return;
    }
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/public/bookings", {
        method: "POST",
        body: {
          stylist_id: stylistId,
          service_id: serviceId,
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: form.customer_email.trim() || null,
          starts_at_utc: selectedSlot.starts_at_utc,
          notes: form.notes.trim() || null,
        },
      });
      setMessage(`Booked for ${formatTime(selectedSlot.starts_at_local)} on ${date}.`);
      setForm(initialForm);
      setSelectedSlot(null);
      const availability = await apiRequest<AvailabilityResponse>(
        `/public/availability?stylist_id=${stylistId}&service_id=${serviceId}&date=${date}`,
      );
      setSlots(availability.slots);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Booking failed. Please try another slot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <main className="page">
        <section className="section-header">
          <div>
            <span className="eyebrow">Book online</span>
            <h1 className="page-title">Reserve your salon visit</h1>
            <p className="lead">Live availability, no customer login required.</p>
          </div>
        </section>

        {loading && <div className="loading">Loading salon services and stylists...</div>}
        {error && <Notice kind="error">{error}</Notice>}
        {message && <Notice kind="success">{message}</Notice>}

        {!loading && (
          <div className="grid grid-2 section">
            <div className="stack">
              <section className="card stack">
                <h2>Choose a service</h2>
                {services.length === 0 ? (
                  <div className="empty">No services are available yet.</div>
                ) : (
                  <div className="grid">
                    {services.map((service) => (
                      <button
                        className={`card select-card ${service.id === serviceId ? "active" : ""}`}
                        key={service.id}
                        onClick={() => setServiceId(service.id)}
                        type="button"
                      >
                        <div className="row" style={{ justifyContent: "space-between" }}>
                          <strong>{service.name}</strong>
                          <span className="pill">{formatCurrency(service.price)}</span>
                        </div>
                        <p>{service.duration_minutes} minutes</p>
                        {service.description && <p className="lead">{service.description}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="card stack">
                <h2>Choose a stylist</h2>
                {stylists.length === 0 ? (
                  <div className="empty">No stylists are available yet.</div>
                ) : (
                  <div className="grid">
                    {stylists.map((stylist) => (
                      <button
                        className={`card select-card ${stylist.id === stylistId ? "active" : ""}`}
                        key={stylist.id}
                        onClick={() => setStylistId(stylist.id)}
                        type="button"
                      >
                        <div className="row">
                          <img
                            alt={stylist.name}
                            className="avatar"
                            src={
                              stylist.profile_photo_url ||
                              "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80"
                            }
                          />
                          <div>
                            <strong>{stylist.name}</strong>
                            <div className="row">
                              {stylist.specialties.map((specialty) => (
                                <span className="pill" key={specialty}>
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <form className="card stack" onSubmit={submitBooking}>
              <h2>Your appointment</h2>
              {selectedService && (
                <Notice>
                  {selectedService.name}, {selectedService.duration_minutes} minutes,{" "}
                  {formatCurrency(selectedService.price)}
                </Notice>
              )}
              <div className="field">
                <label>Date</label>
                <input min={todayInputValue()} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="stack">
                <strong>Available slots</strong>
                {slotsLoading ? (
                  <div className="loading">Checking openings...</div>
                ) : slots.length === 0 ? (
                  <div className="empty">No slots available for this selection.</div>
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
                  <label>Name</label>
                  <input
                    value={form.customer_name}
                    onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    value={form.customer_phone}
                    onChange={(event) => setForm({ ...form, customer_phone: event.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={(event) => setForm({ ...form, customer_email: event.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Anything we should know?"
                />
              </div>
              <button className="button" disabled={submitting} type="submit">
                {submitting ? "Booking..." : "Confirm booking"}
              </button>
            </form>
          </div>
        )}
      </main>
    </AppShell>
  );
}
