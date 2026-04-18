"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { DEFAULT_SALON_ID, apiRequest, formatTime } from "@/lib/api";
import type { OperatingHour, Salon } from "@/types/api";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OwnerSalonPage() {
  return (
    <AppShell area="owner">
      <ProtectedPage role="owner">
        {({ token }) => <OwnerSalon token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function OwnerSalon({ token }: { token: string }) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [salonData, hoursData] = await Promise.all([
          apiRequest<Salon>(`/salon/${DEFAULT_SALON_ID}`, { token }),
          apiRequest<OperatingHour[]>(`/salon/${DEFAULT_SALON_ID}/operating-hours`, { token }),
        ]);
        setSalon(salonData);
        setHours(hoursData);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load salon settings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  async function saveSalon(event: FormEvent) {
    event.preventDefault();
    if (!salon) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await apiRequest<Salon>(`/salon/${DEFAULT_SALON_ID}`, {
        method: "PUT",
        token,
        body: {
          name: salon.name,
          address: salon.address,
          phone: salon.phone,
          timezone: salon.timezone,
          default_slot_duration_minutes: salon.default_slot_duration_minutes,
        },
      });
      setSalon(updated);
      setMessage("Salon settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save salon.");
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await apiRequest<OperatingHour[]>(`/salon/${DEFAULT_SALON_ID}/operating-hours`, {
        method: "PUT",
        token,
        body: {
          hours: hours.map((hour) => ({
            day_of_week: hour.day_of_week,
            opens_at: hour.is_closed ? null : hour.opens_at,
            closes_at: hour.is_closed ? null : hour.closes_at,
            is_closed: hour.is_closed,
          })),
        },
      });
      setHours(updated);
      setMessage("Operating hours saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save operating hours.");
    } finally {
      setSaving(false);
    }
  }

  function updateHour(day: number, patch: Partial<OperatingHour>) {
    setHours((current) =>
      current.map((hour) => (hour.day_of_week === day ? { ...hour, ...patch } : hour)),
    );
  }

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Salon settings</span>
          <h1 className="page-title">Hours and profile</h1>
        </div>
      </section>
      {loading && <div className="loading">Loading settings...</div>}
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      {salon && (
        <div className="grid grid-2 section">
          <form className="card stack" onSubmit={saveSalon}>
            <h2>Salon profile</h2>
            <div className="field">
              <label>Name</label>
              <input value={salon.name} onChange={(event) => setSalon({ ...salon, name: event.target.value })} />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={salon.address ?? ""} onChange={(event) => setSalon({ ...salon, address: event.target.value })} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Phone</label>
                <input value={salon.phone ?? ""} onChange={(event) => setSalon({ ...salon, phone: event.target.value })} />
              </div>
              <div className="field">
                <label>Timezone</label>
                <input value={salon.timezone} onChange={(event) => setSalon({ ...salon, timezone: event.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Default slot duration</label>
              <input
                type="number"
                value={salon.default_slot_duration_minutes}
                onChange={(event) =>
                  setSalon({ ...salon, default_slot_duration_minutes: Number(event.target.value) })
                }
              />
            </div>
            <button className="button" disabled={saving} type="submit">
              Save salon
            </button>
          </form>

          <section className="card stack">
            <h2>Operating hours</h2>
            {hours.map((hour) => (
              <div className="card" key={hour.day_of_week}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{dayNames[hour.day_of_week]}</strong>
                  <label className="row">
                    <input
                      checked={hour.is_closed}
                      type="checkbox"
                      onChange={(event) => updateHour(hour.day_of_week, { is_closed: event.target.checked })}
                    />
                    Closed
                  </label>
                </div>
                {!hour.is_closed && (
                  <div className="form-grid">
                    <div className="field">
                      <label>Opens</label>
                      <input
                        type="time"
                        value={formatTime(hour.opens_at ?? "09:00:00")}
                        onChange={(event) => updateHour(hour.day_of_week, { opens_at: `${event.target.value}:00` })}
                      />
                    </div>
                    <div className="field">
                      <label>Closes</label>
                      <input
                        type="time"
                        value={formatTime(hour.closes_at ?? "18:00:00")}
                        onChange={(event) => updateHour(hour.day_of_week, { closes_at: `${event.target.value}:00` })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button className="button" disabled={saving} onClick={saveHours} type="button">
              Save hours
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
