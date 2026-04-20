"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Notice } from "@/components/ui/notice";
import { apiRequest, formatCurrency } from "@/lib/api";
import { useAdminSalon } from "@/lib/use-admin-salon";
import type { Service } from "@/types/api";

type ServiceForm = {
  id?: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
  is_active: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  duration_minutes: 30,
  price: "0.00",
  is_active: true,
};

export default function AdminServicesPage() {
  return (
    <AppShell area="admin">
      <ProtectedPage role="admin">
        {({ token }) => <AdminServices token={token} />}
      </ProtectedPage>
    </AppShell>
  );
}

function AdminServices({ token }: { token: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { salonId, loading: salonLoading, error: salonError } = useAdminSalon(token);

  async function loadServices() {
    if (!salonId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Service[]>(`/services?salon_id=${salonId}&include_inactive=true`, {
        token,
      });
      setServices(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [salonId, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (form.id) {
        await apiRequest<Service>(`/services/${form.id}`, {
          method: "PUT",
          token,
          body: {
            name: form.name,
            description: form.description || null,
            duration_minutes: form.duration_minutes,
            price: form.price,
            is_active: form.is_active,
          },
        });
        setMessage("Service updated.");
      } else {
        if (!salonId) {
          setError("Salon is still loading.");
          return;
        }
        await apiRequest<Service>("/services", {
          method: "POST",
          token,
          body: {
            salon_id: salonId,
            name: form.name,
            description: form.description || null,
            duration_minutes: form.duration_minutes,
            price: form.price,
            is_active: true,
          },
        });
        setMessage("Service created.");
      }
      setForm(emptyForm);
      await loadServices();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(service: Service) {
    setError("");
    setMessage("");
    try {
      await apiRequest<Service>(`/services/${service.id}`, { method: "DELETE", token });
      setMessage("Service deactivated.");
      await loadServices();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not deactivate service.");
    }
  }

  return (
    <main className="page">
      <section className="section-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h1 className="page-title">Services</h1>
        </div>
      </section>
      {(error || salonError) && <Notice kind="error">{error || salonError}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      <div className="grid grid-2 section">
        <form className="card stack" onSubmit={submit}>
          <h2>{form.id ? "Edit service" : "Create service"}</h2>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Duration minutes</label>
              <input
                min={1}
                type="number"
                value={form.duration_minutes}
                onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })}
              />
            </div>
            <div className="field">
              <label>Price</label>
              <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </div>
          </div>
          {form.id && (
            <label className="row">
              <input
                checked={form.is_active}
                type="checkbox"
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Active
            </label>
          )}
          <div className="row">
            <button className="button" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save service"}
            </button>
            {form.id && (
              <button className="button secondary" onClick={() => setForm(emptyForm)} type="button">
                New service
              </button>
            )}
          </div>
        </form>

        <section className="card stack">
          <h2>Service list</h2>
          {loading || salonLoading ? (
            <div className="loading">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="empty">No services yet.</div>
          ) : (
            services.map((service) => (
              <div className="card" key={service.id}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{service.name}</strong>
                  <span className="pill">{service.is_active ? "Active" : "Inactive"}</span>
                </div>
                <p>
                  {service.duration_minutes} minutes, {formatCurrency(service.price)}
                </p>
                <p className="lead">{service.description}</p>
                <div className="row">
                  <button
                    className="button secondary"
                    onClick={() =>
                      setForm({
                        id: service.id,
                        name: service.name,
                        description: service.description ?? "",
                        duration_minutes: service.duration_minutes,
                        price: service.price,
                        is_active: service.is_active,
                      })
                    }
                    type="button"
                  >
                    Edit
                  </button>
                  {service.is_active && (
                    <button className="button danger" onClick={() => deactivate(service)} type="button">
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
