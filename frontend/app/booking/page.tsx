"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Notice } from "@/components/ui/notice";
import { PhoneInput } from "@/components/ui/phone-input";
import { apiRequest, formatCurrency, formatTime, todayInputValue } from "@/lib/api";
import { storeBookingConfirmation } from "@/lib/booking-confirmation";
import { isValidPhoneNumber, normalizePhoneNumber, phoneValidationMessage } from "@/lib/phone";
import type {
  AvailabilityResponse,
  AvailableSlot,
  Salon,
  Service,
  Stylist,
} from "@/types/api";
import type { Booking } from "@/types/api";

type BookingForm = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
};

const initialForm: BookingForm = {
  customer_name: "",
  customer_phone: "+91 ",
  customer_email: "",
  notes: "",
};

const ANY_STYLIST_ID = -1;

type WizardStep = {
  id: string;
  label: string;
  description: string;
};

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function buildAvailabilityQuery(
  params: { stylistId: number; salonId: number; serviceIds: number[]; date: string },
): string {
  const [primaryId, ...extras] = params.serviceIds;
  const query = new URLSearchParams();
  query.set("date", params.date);
  for (const extraId of extras) {
    query.append("additional_service_ids", String(extraId));
  }
  if (params.stylistId === ANY_STYLIST_ID) {
    query.set("salon_id", String(params.salonId));
    query.set("service_id", String(primaryId));
    return `/public/availability/any?${query.toString()}`;
  }
  query.set("stylist_id", String(params.stylistId));
  query.set("service_id", String(primaryId));
  return `/public/availability?${query.toString()}`;
}

export default function BookingPage() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonId, setSalonId] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
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
  const [stepIndex, setStepIndex] = useState(0);

  const hasMultipleSalons = salons.length > 1;
  const steps: WizardStep[] = useMemo(() => {
    const base: WizardStep[] = [
      { id: "services", label: "Services", description: "Pick the services you'd like today." },
      { id: "stylist", label: "Stylist", description: "Choose who's holding the scissors." },
      { id: "schedule", label: "Date & time", description: "Find the slot that fits your calendar." },
      { id: "details", label: "Your details", description: "Contact info and any notes." },
    ];
    if (hasMultipleSalons) {
      return [
        { id: "studio", label: "Studio", description: "Choose your Aaranya Salon location." },
        ...base,
      ];
    }
    return base;
  }, [hasMultipleSalons]);
  const currentStep = steps[stepIndex];

  const selectedServices = useMemo(
    () =>
      selectedServiceIds
        .map((id) => services.find((service) => service.id === id))
        .filter((service): service is Service => Boolean(service)),
    [selectedServiceIds, services],
  );
  const totalDurationMinutes = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0),
    [selectedServices],
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price ?? 0), 0),
    [selectedServices],
  );
  const selectedStylist = useMemo(() => {
    if (stylistId === ANY_STYLIST_ID) return null;
    return stylists.find((stylist) => stylist.id === stylistId) ?? null;
  }, [stylists, stylistId]);
  const selectedSalon = useMemo(
    () => salons.find((salon) => salon.id === salonId),
    [salons, salonId],
  );

  useEffect(() => {
    async function loadSalons() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<{ salons: Salon[] }>("/public/salons");
        setSalons(data.salons);
        setSalonId(data.salons[0]?.id ?? null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load salons.");
      } finally {
        setLoading(false);
      }
    }

    loadSalons();
  }, []);

  useEffect(() => {
    async function loadPublicData() {
      if (!salonId) return;
      setLoading(true);
      setError("");
      setSelectedSlot(null);
      try {
        const [serviceData, stylistData] = await Promise.all([
          apiRequest<{ services: Service[] }>(`/public/services?salon_id=${salonId}`),
          apiRequest<{ stylists: Stylist[] }>(`/public/stylists?salon_id=${salonId}`),
        ]);
        setServices(serviceData.services);
        setStylists(stylistData.stylists);
        setSelectedServiceIds([]);
        setStylistId(ANY_STYLIST_ID);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load booking options.");
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [salonId]);

  useEffect(() => {
    async function loadSlots() {
      if (selectedServiceIds.length === 0 || stylistId === null || !date || !salonId) {
        setSlots([]);
        return;
      }
      setSlotsLoading(true);
      setSelectedSlot(null);
      setError("");
      try {
        const availability = await apiRequest<AvailabilityResponse>(
          buildAvailabilityQuery({
            stylistId,
            salonId,
            serviceIds: selectedServiceIds,
            date,
          }),
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
  }, [selectedServiceIds, stylistId, salonId, date]);

  function toggleService(serviceId: number) {
    setSelectedSlot(null);
    setSelectedServiceIds((current) => {
      if (current.includes(serviceId)) {
        const next = current.filter((id) => id !== serviceId);
        return next;
      }
      return [...current, serviceId];
    });
  }

  function canContinue(): boolean {
    switch (currentStep.id) {
      case "studio":
        return salonId !== null;
      case "services":
        return selectedServices.length > 0;
      case "stylist":
        return stylistId !== null;
      case "schedule":
        return selectedSlot !== null;
      case "details":
        return Boolean(form.customer_name.trim() && isValidPhoneNumber(form.customer_phone));
      default:
        return false;
    }
  }

  function goNext() {
    if (!canContinue()) {
      setError(continueBlockedReason());
      return;
    }
    setError("");
    setStepIndex((idx) => Math.min(idx + 1, steps.length - 1));
  }

  function goBack() {
    setError("");
    setStepIndex((idx) => Math.max(idx - 1, 0));
  }

  function continueBlockedReason(): string {
    switch (currentStep.id) {
      case "studio":
        return "Pick a studio to continue.";
      case "services":
        return "Select at least one service.";
      case "stylist":
        return "Pick a stylist, or choose Any available.";
      case "schedule":
        return "Pick a time slot to continue.";
      case "details":
        return form.customer_name.trim() ? phoneValidationMessage() : "Name and phone are required.";
      default:
        return "";
    }
  }

  async function submitBooking(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedSlot || selectedServiceIds.length === 0 || stylistId === null) {
      setError("Please complete every step before confirming.");
      return;
    }
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    const normalizedPhone = normalizePhoneNumber(form.customer_phone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      setError(phoneValidationMessage());
      return;
    }

    const [primaryServiceId, ...additionalServiceIds] = selectedServiceIds;
    const effectiveStylistId =
      stylistId === ANY_STYLIST_ID ? selectedSlot.stylist_id ?? null : stylistId;
    if (!effectiveStylistId) {
      setError("We could not assign a stylist to that slot. Please pick another.");
      return;
    }

    setSubmitting(true);
    try {
      const booking = await apiRequest<Booking>("/public/bookings", {
        method: "POST",
        body: {
          stylist_id: effectiveStylistId,
          service_id: primaryServiceId,
          additional_service_ids: additionalServiceIds,
          customer_name: form.customer_name.trim(),
          customer_phone: normalizedPhone,
          customer_email: form.customer_email.trim() || null,
          starts_at_utc: selectedSlot.starts_at_utc,
          notes: form.notes.trim() || null,
        },
      });
      const resolvedStylistName =
        stylistId === ANY_STYLIST_ID
          ? selectedSlot.stylist_name ?? null
          : selectedStylist?.name ?? null;
      storeBookingConfirmation({
        booking,
        salon: selectedSalon ?? null,
        stylistName: resolvedStylistName,
        services: selectedServices.map((service) => ({
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: service.price,
        })),
      });
      router.push("/booking/confirmation");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Booking failed. Please try another slot.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <main className="page">
        <section className="section-header">
          <div>
            <span className="eyebrow">Reserve online</span>
            <h1 className="page-title">Compose your salon visit.</h1>
            <p className="lead">
              Four quiet steps. Mix multiple services, pin your stylist or let us choose the best
              match, then pick a slot that slips into your day.
            </p>
          </div>
        </section>

        <ol className="wizard-stepper" aria-label="Booking steps">
          {steps.map((step, idx) => {
            const status = idx < stepIndex ? "done" : idx === stepIndex ? "active" : "upcoming";
            return (
              <li key={step.id} className={`wizard-step wizard-step-${status}`}>
                <button
                  type="button"
                  className="wizard-step-button"
                  onClick={() => {
                    if (idx <= stepIndex) setStepIndex(idx);
                  }}
                  disabled={idx > stepIndex}
                  aria-current={idx === stepIndex ? "step" : undefined}
                >
                  <span className="wizard-step-number">{idx < stepIndex ? "✓" : idx + 1}</span>
                  <span className="wizard-step-label">
                    <strong>{step.label}</strong>
                    <span className="muted">{step.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {loading && <div className="loading">Loading studios, services, and stylists…</div>}
        {error && <Notice kind="error">{error}</Notice>}
        {message && <Notice kind="success">{message}</Notice>}

        {!loading && (
          <div className="grid grid-2 section wizard-grid" style={{ alignItems: "start" }}>
            <div className="stack wizard-body">
              {currentStep.id === "studio" && (
                <section className="card stack">
                  <div>
                    <h2>Choose your studio</h2>
                    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {salons.length} locations to choose from.
                    </p>
                  </div>
                  <div className="grid">
                    {salons.map((salon) => (
                      <button
                        className={`card select-card ${salon.id === salonId ? "active" : ""}`}
                        key={salon.id}
                        onClick={() => setSalonId(salon.id)}
                        type="button"
                      >
                        <strong>{salon.name}</strong>
                        {salon.address && <p className="muted">{salon.address}</p>}
                        {salon.phone && <span className="pill">{salon.phone}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {currentStep.id === "services" && (
                <section className="card stack">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2>Pick one or more services</h2>
                      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        Tap to add or remove. We&rsquo;ll book them back-to-back in one visit.
                      </p>
                    </div>
                    <span className="pill rose">{selectedServices.length} selected</span>
                  </div>
                  {services.length === 0 ? (
                    <div className="empty">No services are available yet.</div>
                  ) : (
                    <div className="grid grid-2">
                      {services.map((service) => {
                        const isSelected = selectedServiceIds.includes(service.id);
                        const orderIndex = selectedServiceIds.indexOf(service.id);
                        return (
                          <button
                            aria-pressed={isSelected}
                            className={`card select-card multi-select-card ${isSelected ? "active" : ""}`}
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            type="button"
                          >
                            <div
                              className="row"
                              style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}
                            >
                              <div className="row" style={{ gap: 10, alignItems: "center", minWidth: 0 }}>
                                <span className={`check-bubble ${isSelected ? "on" : ""}`} aria-hidden>
                                  {isSelected ? orderIndex + 1 : ""}
                                </span>
                                <strong style={{ minWidth: 0 }}>{service.name}</strong>
                              </div>
                              <span className="pill gold">{formatCurrency(service.price)}</span>
                            </div>
                            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                              {service.duration_minutes} min
                            </p>
                            {service.description && (
                              <p style={{ fontSize: 14, marginTop: 8 }}>{service.description}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {currentStep.id === "stylist" && (
                <section className="card stack">
                  <div>
                    <h2>Choose your stylist</h2>
                    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      No preference? We&rsquo;ll match you with the first available artist who fits
                      your services.
                    </p>
                  </div>

                  <button
                    aria-pressed={stylistId === ANY_STYLIST_ID}
                    className={`card select-card any-stylist-card ${stylistId === ANY_STYLIST_ID ? "active" : ""}`}
                    onClick={() => {
                      setStylistId(ANY_STYLIST_ID);
                      setSelectedSlot(null);
                    }}
                    type="button"
                  >
                    <div className="row" style={{ gap: 14, alignItems: "center" }}>
                      <span className="any-stylist-mark" aria-hidden>
                        ✦
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>Any available stylist</strong>
                        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          Faster to book. We&rsquo;ll show you every open slot across the team and
                          pin the right chair automatically.
                        </p>
                      </div>
                      {stylists.length > 0 && (
                        <div className="any-stylist-stack" aria-hidden>
                          {stylists.slice(0, 4).map((stylist, idx) => (
                            <img
                              alt=""
                              key={stylist.id}
                              className="avatar avatar-sm"
                              src={
                                stylist.profile_photo_url ||
                                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=180&q=80"
                              }
                              style={{ zIndex: 10 - idx }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>

                  {stylists.length === 0 ? (
                    <div className="empty">No stylists are available yet.</div>
                  ) : (
                    <div className="grid grid-2">
                      {stylists.map((stylist) => {
                        const isActive = stylist.id === stylistId;
                        return (
                          <button
                            aria-pressed={isActive}
                            className={`card select-card stylist-card ${isActive ? "active" : ""}`}
                            key={stylist.id}
                            onClick={() => {
                              setStylistId(stylist.id);
                              setSelectedSlot(null);
                            }}
                            type="button"
                          >
                            <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                              <img
                                alt={stylist.name}
                                className="avatar"
                                src={
                                  stylist.profile_photo_url ||
                                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80"
                                }
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  className="row"
                                  style={{ justifyContent: "space-between", gap: 8, alignItems: "center" }}
                                >
                                  <strong>{stylist.name}</strong>
                                  {typeof stylist.clients_served === "number" && stylist.clients_served > 0 && (
                                    <span className="pill rose clients-pill" title="Clients served">
                                      {stylist.clients_served.toLocaleString()} clients
                                    </span>
                                  )}
                                </div>
                                {stylist.bio && (
                                  <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                                    {stylist.bio}
                                  </p>
                                )}
                                {stylist.specialties.length > 0 && (
                                  <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                                    {stylist.specialties.slice(0, 3).map((specialty) => (
                                      <span className="pill" key={specialty}>
                                        {specialty}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {currentStep.id === "schedule" && (
                <section className="card stack">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2>Pick a date and time</h2>
                      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        Total visit: <strong>{formatDuration(totalDurationMinutes)}</strong>
                        {stylistId === ANY_STYLIST_ID
                          ? " — we'll show every open slot across the team."
                          : selectedStylist
                            ? ` with ${selectedStylist.name}.`
                            : ""}
                      </p>
                    </div>
                    {selectedSlot && (
                      <span className="pill rose">
                        {formatTime(selectedSlot.starts_at_local)}
                        {selectedSlot.stylist_name ? ` · ${selectedSlot.stylist_name}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="field" style={{ maxWidth: 260 }}>
                    <label>Date</label>
                    <input
                      min={todayInputValue()}
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>

                  {slotsLoading ? (
                    <div className="loading">Checking openings…</div>
                  ) : slots.length === 0 ? (
                    <div className="empty">
                      No {formatDuration(totalDurationMinutes)} openings for {date}. Try another
                      date or a different stylist.
                    </div>
                  ) : (
                    <div className="slot-grid">
                      {slots.map((slot) => {
                        const isActive = selectedSlot?.starts_at_utc === slot.starts_at_utc;
                        return (
                          <button
                            className={`slot slot-rich ${isActive ? "active" : ""}`}
                            key={slot.starts_at_utc}
                            onClick={() => setSelectedSlot(slot)}
                            type="button"
                          >
                            <strong>{formatTime(slot.starts_at_local)}</strong>
                            {slot.stylist_name && stylistId === ANY_STYLIST_ID && (
                              <span className="slot-sub">with {slot.stylist_name.split(" ")[0]}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {currentStep.id === "details" && (
                <form className="card stack" onSubmit={submitBooking}>
                  <div>
                    <h2>Your details</h2>
                    <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      We&rsquo;ll send a confirmation and a gentle reminder. No account required.
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>Full name</label>
                      <input
                        value={form.customer_name}
                        onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
                        placeholder="Your name"
                      />
                    </div>
                    <PhoneInput
                      value={form.customer_phone}
                      onChange={(phone) => setForm({ ...form, customer_phone: phone })}
                    />
                  </div>
                  <div className="field">
                    <label>Email (optional)</label>
                    <input
                      type="email"
                      value={form.customer_email}
                      onChange={(event) => setForm({ ...form, customer_email: event.target.value })}
                      placeholder="For confirmation and reminders"
                    />
                  </div>
                  <div className="field">
                    <label>Notes for your stylist</label>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="Anything we should know? Allergies, inspirations, preferences."
                    />
                  </div>
                  <button className="button primary" disabled={submitting} type="submit">
                    {submitting ? "Confirming…" : "Confirm reservation"}
                    {!submitting && (
                      <span className="arrow" aria-hidden>
                        →
                      </span>
                    )}
                  </button>
                </form>
              )}

              <div className="wizard-nav">
                <button
                  className="button secondary"
                  disabled={stepIndex === 0}
                  onClick={goBack}
                  type="button"
                >
                  ← Back
                </button>
                {currentStep.id !== "details" && (
                  <button
                    className="button primary"
                    disabled={!canContinue()}
                    onClick={goNext}
                    type="button"
                  >
                    Continue
                    <span className="arrow" aria-hidden>→</span>
                  </button>
                )}
              </div>
            </div>

            <aside className="card stack sticky-panel summary-panel" style={{ padding: 26 }}>
              <div>
                <span className="eyebrow">Your appointment</span>
                <h2 style={{ marginTop: 6 }}>Reservation summary</h2>
              </div>

              <div
                className="stack"
                style={{
                  gap: 10,
                  padding: 14,
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "rgba(251, 248, 244, 0.6)",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="summary-label">Studio</span>
                  <strong>{selectedSalon?.name ?? "—"}</strong>
                </div>
                <div style={{ borderTop: "1px dashed var(--line)", margin: "2px 0" }} />
                <div>
                  <span className="summary-label">Services ({selectedServices.length})</span>
                  <div className="stack" style={{ gap: 6, marginTop: 6 }}>
                    {selectedServices.length === 0 ? (
                      <span className="muted" style={{ fontSize: 13 }}>Pick at least one service.</span>
                    ) : (
                      selectedServices.map((service, index) => (
                        <div
                          key={service.id}
                          className="row"
                          style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}
                        >
                          <span style={{ fontSize: 14 }}>
                            <span className="summary-idx">{index + 1}.</span>
                            {service.name}
                            <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                              · {service.duration_minutes} min
                            </span>
                          </span>
                          <strong style={{ fontSize: 14 }}>{formatCurrency(service.price)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ borderTop: "1px dashed var(--line)", margin: "2px 0" }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="summary-label">Stylist</span>
                  <strong>
                    {stylistId === ANY_STYLIST_ID
                      ? selectedSlot?.stylist_name ?? "Any available"
                      : selectedStylist?.name ?? "—"}
                  </strong>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="summary-label">Date</span>
                  <strong>{date}</strong>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="summary-label">Time</span>
                  <strong>
                    {selectedSlot ? formatTime(selectedSlot.starts_at_local) : "—"}
                  </strong>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="summary-label">Total time</span>
                  <strong>{formatDuration(totalDurationMinutes)}</strong>
                </div>
                <div className="divider" style={{ margin: "4px 0" }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Total</span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      color: "var(--rose)",
                      fontWeight: 600,
                    }}
                  >
                    {selectedServices.length > 0 ? formatCurrency(totalPrice) : "—"}
                  </span>
                </div>
              </div>

              <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
                You can change any selection before confirming. No card required today.
              </p>
            </aside>
          </div>
        )}
      </main>
    </AppShell>
  );
}
