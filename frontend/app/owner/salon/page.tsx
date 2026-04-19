"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { apiRequest, formatTime } from "@/lib/api";
import { changeMyPassword } from "@/lib/auth";
import type { OperatingHour, Salon, User } from "@/types/api";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultOpenTime = "09:00:00";
const defaultCloseTime = "18:00:00";

export default function OwnerSalonPage() {
  return (
    <AppShell area="owner">
      <ProtectedPage role="owner">
        {({ token, user }) => <OwnerSalon token={token} user={user} />}
      </ProtectedPage>
    </AppShell>
  );
}

function OwnerSalon({ token, user }: { token: string; user: User }) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const salonData = await apiRequest<Salon>("/salon/me/current", { token });
        const hoursData = await apiRequest<OperatingHour[]>(`/salon/${salonData.id}/operating-hours`, { token });
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
      const updated = await apiRequest<Salon>(`/salon/${salon.id}`, {
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
      if (!salon) return;
      const updated = await apiRequest<OperatingHour[]>(`/salon/${salon.id}/operating-hours`, {
        method: "PUT",
        token,
        body: {
          hours: hours.map((hour) => ({
            day_of_week: hour.day_of_week,
            opens_at: hour.is_closed ? null : hour.opens_at ?? defaultOpenTime,
            closes_at: hour.is_closed ? null : hour.closes_at ?? defaultCloseTime,
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

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New password and confirm password must match.");
      setSaving(false);
      return;
    }
    try {
      await changeMyPassword(token, passwordForm.current_password, passwordForm.new_password);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setMessage("Password changed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  function updateHour(day: number, patch: Partial<OperatingHour>) {
    setHours((current) =>
      current.map((hour) => {
        if (hour.day_of_week !== day) return hour;

        const nextHour = { ...hour, ...patch };
        if (patch.is_closed === false) {
          nextHour.opens_at = nextHour.opens_at ?? defaultOpenTime;
          nextHour.closes_at = nextHour.closes_at ?? defaultCloseTime;
        }

        return nextHour;
      }),
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
          <div className="stack">
            <section className="card stack">
              <h2>Owner profile</h2>
              <p className="muted">{user.email}</p>
            </section>
            <form className="card stack" onSubmit={savePassword}>
              <h2>Change password</h2>
              <PasswordField
                label="Current password"
                required
                value={passwordForm.current_password}
                onChange={(value) => setPasswordForm({ ...passwordForm, current_password: value })}
              />
              <div className="form-grid">
                <PasswordField
                  label="New password"
                  minLength={8}
                  required
                  value={passwordForm.new_password}
                  onChange={(value) => setPasswordForm({ ...passwordForm, new_password: value })}
                />
                <PasswordField
                  label="Confirm new password"
                  minLength={8}
                  required
                  value={passwordForm.confirm_password}
                  onChange={(value) => setPasswordForm({ ...passwordForm, confirm_password: value })}
                />
              </div>
              <button className="button" disabled={saving} type="submit">
                Save password
              </button>
            </form>
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
          </div>

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
                        value={formatTime(hour.opens_at ?? defaultOpenTime)}
                        onChange={(event) => updateHour(hour.day_of_week, { opens_at: `${event.target.value}:00` })}
                      />
                    </div>
                    <div className="field">
                      <label>Closes</label>
                      <input
                        type="time"
                        value={formatTime(hour.closes_at ?? defaultCloseTime)}
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
