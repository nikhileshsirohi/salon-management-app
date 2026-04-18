"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getStoredUser } from "@/lib/auth";
import type { User } from "@/types/api";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const dashboardHref =
    user?.role === "owner" ? "/owner/dashboard" : user?.role === "stylist" ? "/stylist/dashboard" : "/login";

  return (
    <AppShell>
      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Salon appointments</span>
            <h1>Fresh cuts, polished color, calm booking.</h1>
            <p>
              Choose a service, pick your stylist, and reserve a real available appointment without
              creating an account.
            </p>
            <div className="row">
              <Link className="button" href="/booking">
                Book appointment
              </Link>
              <Link className="button secondary" href={dashboardHref}>
                {user ? "Go to dashboard" : "Staff login"}
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img
              alt="Salon chair and styling station"
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1100&q=80"
            />
          </div>
        </section>

        <section className="section grid grid-3">
          <div className="card">
            <span className="pill">Customers</span>
            <h2>Book in minutes</h2>
            <p className="lead">See live slots and reserve the appointment that fits your day.</p>
          </div>
          <div className="card">
            <span className="pill">Owners</span>
            <h2>Run the day</h2>
            <p className="lead">Manage stylists, services, hours, bookings, and payments.</p>
          </div>
          <div className="card">
            <span className="pill">Stylists</span>
            <h2>Stay focused</h2>
            <p className="lead">View your schedule and add walk-ins from one simple portal.</p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
