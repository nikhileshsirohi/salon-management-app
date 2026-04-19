"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { apiRequest, formatTime } from "@/lib/api";
import { useOwnerSalon } from "@/lib/use-owner-salon";
import type { Stylist, StylistAvailability } from "@/types/api";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type StylistForm = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  bio: string;
  profile_photo_url: string;
  specialties: string;
};

const emptyStylist: StylistForm = {
  name: "",
  email: "",
  password: "",
  confirm_password: "",
  phone: "",
  bio: "",
  profile_photo_url: "",
  specialties: "",
};

export default function OwnerStylistsPage() {
  return (
    <AppShell area="owner">
      <ProtectedPage role="owner">
        {({ token }) => <OwnerStylists token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function OwnerStylists({ token }: { token: string }) {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selected, setSelected] = useState<Stylist | null>(null);
  const [availability, setAvailability] = useState<StylistAvailability[]>([]);
  const [form, setForm] = useState(emptyStylist);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    bio: "",
    profile_photo_url: "",
    specialties: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { salonId, loading: salonLoading, error: salonError } = useOwnerSalon(token);

  async function loadStylists() {
    if (!salonId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Stylist[]>(`/stylists?salon_id=${salonId}&include_inactive=true`, {
        token,
      });
      setStylists(data);
      if (!selected && data[0]) setSelected(data[0]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load stylists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStylists();
  }, [salonId, token]);

  useEffect(() => {
    async function loadAvailability() {
      if (!selected) return;
      try {
        const data = await apiRequest<StylistAvailability[]>(`/stylists/${selected.id}/availability`, { token });
        setAvailability(data);
      } catch {
        setAvailability([]);
      }
    }
    loadAvailability();
  }, [selected, token]);

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      phone: selected.phone ?? "",
      bio: selected.bio ?? "",
      profile_photo_url: selected.profile_photo_url ?? "",
      specialties: selected.specialties.join(", "),
      password: "",
      confirm_password: "",
    });
  }, [selected]);

  async function createStylist(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (!salonId) {
        setError("Salon is still loading.");
        return;
      }
      if (form.password !== form.confirm_password) {
        setError("Password and confirm password must match.");
        return;
      }
      await apiRequest<Stylist>("/stylists", {
        method: "POST",
        token,
        body: {
          salon_id: salonId,
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone || null,
          bio: form.bio || null,
          profile_photo_url: form.profile_photo_url || null,
          is_active: true,
          specialties: form.specialties
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      setForm(emptyStylist);
      setMessage("Stylist and login account created.");
      await loadStylists();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create stylist.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(stylist: Stylist) {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/stylists/${stylist.id}`, { method: "DELETE", token });
      setMessage("Stylist deactivated.");
      await loadStylists();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not deactivate stylist.");
    }
  }

  async function updateSelectedStylist(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (editForm.password && editForm.password !== editForm.confirm_password) {
        setError("Password and confirm password must match.");
        return;
      }

      const updated = await apiRequest<Stylist>(`/stylists/${selected.id}`, {
        method: "PUT",
        token,
        body: {
          name: editForm.name,
          phone: editForm.phone || null,
          bio: editForm.bio || null,
          profile_photo_url: editForm.profile_photo_url || null,
          specialties: editForm.specialties
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          ...(editForm.password ? { password: editForm.password } : {}),
        },
      });
      setSelected(updated);
      setMessage("Stylist profile saved.");
      await loadStylists();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update stylist.");
    } finally {
      setSaving(false);
    }
  }

  function updateAvailability(index: number, patch: Partial<StylistAvailability>) {
    setAvailability((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeAvailability(index: number) {
    setAvailability((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addAvailability() {
    if (!selected) return;
    setAvailability((current) => [
      ...current,
      {
        id: Date.now(),
        stylist_id: selected.id,
        day_of_week: 0,
        starts_at: "10:00:00",
        ends_at: "18:00:00",
        slot_duration_minutes: 30,
        is_available: true,
      },
    ]);
  }

  async function saveAvailability() {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data = await apiRequest<StylistAvailability[]>(`/stylists/${selected.id}/availability`, {
        method: "PUT",
        token,
        body: {
          availability: availability.map((item) => ({
            day_of_week: item.day_of_week,
            starts_at: item.starts_at,
            ends_at: item.ends_at,
            slot_duration_minutes: item.slot_duration_minutes,
            is_available: item.is_available,
          })),
        },
      });
      setAvailability(data);
      setMessage("Availability saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Owner</span>
          <h1 className="page-title">Stylists</h1>
        </div>
      </section>
      {(error || salonError) && <Notice kind="error">{error || salonError}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <div className="grid grid-2 section">
        <div className="stack">
          <form className="card stack" onSubmit={createStylist}>
            <h2>Create stylist account</h2>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" />
              </div>
            </div>
            <div className="form-grid">
              <PasswordField
                label="Password"
                minLength={8}
                required
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
              />
              <PasswordField
                label="Confirm password"
                minLength={8}
                required
                value={form.confirm_password}
                onChange={(value) => setForm({ ...form, confirm_password: value })}
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
            <div className="field">
              <label>Profile photo URL</label>
              <input value={form.profile_photo_url} onChange={(event) => setForm({ ...form, profile_photo_url: event.target.value })} />
            </div>
            <div className="field">
              <label>Specialties, comma separated</label>
              <input value={form.specialties} onChange={(event) => setForm({ ...form, specialties: event.target.value })} />
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </div>
            <button className="button" disabled={saving} type="submit">
              Create stylist
            </button>
          </form>

          <section className="card stack">
            <h2>Stylist list</h2>
            {loading || salonLoading ? (
              <div className="loading">Loading stylists...</div>
            ) : stylists.length === 0 ? (
              <div className="empty">No stylists yet.</div>
            ) : (
              stylists.map((stylist) => (
                <button
                  className={`card select-card ${selected?.id === stylist.id ? "active" : ""}`}
                  key={stylist.id}
                  onClick={() => setSelected(stylist)}
                  type="button"
                >
                  <div className="row">
                    <img
                      alt={stylist.name}
                      className="avatar"
                      src={
                        stylist.profile_photo_url ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80"
                      }
                    />
                    <div>
                      <strong>{stylist.name}</strong>
                      <p>{stylist.email}</p>
                      <div className="row">
                        {stylist.specialties.map((item) => (
                          <span className="pill" key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!stylist.is_active && <span className="pill">Inactive</span>}
                </button>
              ))
            )}
            {selected?.is_active && (
              <button className="button danger" onClick={() => deactivate(selected)} type="button">
                Deactivate selected
              </button>
            )}
          </section>
        </div>

        {selected && (
        <div className="stack sticky-panel">
        <form className="card stack" onSubmit={updateSelectedStylist}>
          <div>
            <h2>{selected.name} profile</h2>
            <p className="muted">Email cannot be changed: {selected.email}</p>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Profile photo URL</label>
            <input
              value={editForm.profile_photo_url}
              onChange={(event) => setEditForm({ ...editForm, profile_photo_url: event.target.value })}
            />
          </div>
          <div className="field">
            <label>Specialties, comma separated</label>
            <input value={editForm.specialties} onChange={(event) => setEditForm({ ...editForm, specialties: event.target.value })} />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} />
          </div>
          <div className="form-grid">
            <PasswordField
              label="New password"
              minLength={8}
              value={editForm.password}
              onChange={(value) => setEditForm({ ...editForm, password: value })}
              placeholder="Leave blank to keep current password"
            />
            <PasswordField
              label="Confirm new password"
              minLength={8}
              value={editForm.confirm_password}
              onChange={(value) => setEditForm({ ...editForm, confirm_password: value })}
            />
          </div>
          <button className="button" disabled={saving} type="submit">
            Save profile
          </button>
        </form>
        <section className="card stack">
          <div className="section-header">
            <div>
              <h2>{selected.name} availability</h2>
              <p className="lead">Availability must fit inside salon operating hours.</p>
            </div>
            <button className="button secondary" onClick={addAvailability} type="button">
              Add availability
            </button>
          </div>
          {availability.length === 0 ? (
            <div className="empty">No availability set for this stylist.</div>
          ) : (
            availability.map((item, index) => (
              <div className="card form-grid" key={`${item.id}-${index}`}>
                <div className="field">
                  <label>Day</label>
                  <select
                    value={item.day_of_week}
                    onChange={(event) => updateAvailability(index, { day_of_week: Number(event.target.value) })}
                  >
                    {days.map((day, dayIndex) => (
                      <option key={day} value={dayIndex}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Starts</label>
                  <input
                    type="time"
                    value={formatTime(item.starts_at)}
                    onChange={(event) => updateAvailability(index, { starts_at: `${event.target.value}:00` })}
                  />
                </div>
                <div className="field">
                  <label>Ends</label>
                  <input
                    type="time"
                    value={formatTime(item.ends_at)}
                    onChange={(event) => updateAvailability(index, { ends_at: `${event.target.value}:00` })}
                  />
                </div>
                <div className="field">
                  <label>Slot duration</label>
                  <input
                    min={1}
                    type="number"
                    value={item.slot_duration_minutes}
                    onChange={(event) => updateAvailability(index, { slot_duration_minutes: Number(event.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Remove</label>
                  <button className="button danger" onClick={() => removeAvailability(index)} type="button">
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
          <button className="button" disabled={saving} onClick={saveAvailability} type="button">
            Save availability
          </button>
        </section>
        </div>
        )}
      </div>
    </main>
  );
}
