"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { apiRequest } from "@/lib/api";
import { changeMyPassword } from "@/lib/auth";
import type { Stylist } from "@/types/api";

export default function StylistProfilePage() {
  return (
    <AppShell area="stylist">
      <ProtectedPage role="stylist">
        {({ token, user }) => <StylistProfile token={token} email={user.email} />}
      </ProtectedPage>
    </AppShell>
  );
}

function StylistProfile({ token, email }: { token: string; email: string }) {
  const [profile, setProfile] = useState<Stylist | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    bio: "",
    profile_photo_url: "",
    specialties: "",
  });
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
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<Stylist>("/stylist/me/profile", { token });
        setProfile(data);
        setForm({
          name: data.name,
          phone: data.phone ?? "",
          bio: data.bio ?? "",
          profile_photo_url: data.profile_photo_url ?? "",
          specialties: data.specialties.join(", "),
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [token]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await apiRequest<Stylist>("/stylist/me/profile", {
        method: "PUT",
        token,
        body: {
          name: form.name,
          phone: form.phone || null,
          bio: form.bio || null,
          profile_photo_url: form.profile_photo_url || null,
          specialties: form.specialties
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      setProfile(updated);
      setMessage("Profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
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

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Stylist portal</span>
          <h1 className="page-title">My profile</h1>
          <p className="lead">{email}</p>
        </div>
      </section>
      {loading && <div className="loading">Loading profile...</div>}
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      {profile && (
        <div className="grid grid-2 section">
          <form className="card stack" onSubmit={saveProfile}>
            <h2>Profile details</h2>
            <p className="muted">Email cannot be changed.</p>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Profile photo URL</label>
              <input
                value={form.profile_photo_url}
                onChange={(event) => setForm({ ...form, profile_photo_url: event.target.value })}
              />
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
              Save profile
            </button>
          </form>

          <form className="card stack" onSubmit={savePassword}>
            <h2>Change password</h2>
            <PasswordField
              label="Current password"
              required
              value={passwordForm.current_password}
              onChange={(value) => setPasswordForm({ ...passwordForm, current_password: value })}
            />
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
            <button className="button" disabled={saving} type="submit">
              Save password
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
