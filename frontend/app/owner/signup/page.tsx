"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { signupOwner } from "@/lib/auth";

export default function OwnerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    salon_name: "",
    salon_address: "",
    salon_phone: "",
    timezone: "Asia/Kolkata",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Password and confirm password must match.");
      setSaving(false);
      return;
    }
    try {
      await signupOwner({
        email: form.email.trim(),
        password: form.password,
        salon_name: form.salon_name.trim(),
        salon_address: form.salon_address.trim() || null,
        salon_phone: form.salon_phone.trim() || null,
        timezone: form.timezone.trim(),
      });
      router.push("/owner/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create owner account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <main className="page">
        <section className="section-header">
          <div>
            <span className="eyebrow">Owner signup</span>
            <h1 className="page-title">Create your salon workspace</h1>
            <p className="lead">One owner account manages one salon.</p>
          </div>
        </section>
        <form className="card stack section" onSubmit={submit}>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="form-grid">
            <div className="field">
              <label>Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <PasswordField
              label="Password"
              minLength={8}
              required
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
            />
          </div>
          <div className="form-grid">
            <PasswordField
              label="Confirm password"
              minLength={8}
              required
              value={form.confirm_password}
              onChange={(value) => setForm({ ...form, confirm_password: value })}
            />
          </div>
          <div className="field">
            <label>Salon name</label>
            <input
              required
              value={form.salon_name}
              onChange={(event) => setForm({ ...form, salon_name: event.target.value })}
            />
          </div>
          <div className="field">
            <label>Salon address</label>
            <input
              value={form.salon_address}
              onChange={(event) => setForm({ ...form, salon_address: event.target.value })}
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Salon phone</label>
              <input
                value={form.salon_phone}
                onChange={(event) => setForm({ ...form, salon_phone: event.target.value })}
              />
            </div>
            <div className="field">
              <label>Timezone</label>
              <input
                required
                value={form.timezone}
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
              />
            </div>
          </div>
          <div className="row">
            <button className="button" disabled={saving} type="submit">
              {saving ? "Creating..." : "Create owner account"}
            </button>
            <Link href="/owner/login">Already have an account?</Link>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
