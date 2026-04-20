"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getStoredUser } from "@/lib/auth";
import type { User } from "@/types/api";

type Feature = {
  icon: React.ReactNode;
  title: string;
  lead: string;
};

type ServiceHighlight = {
  name: string;
  duration: string;
  price: string;
  description: string;
  image: string;
};

const features: Feature[] = [
  {
    title: "Live slot discovery",
    lead: "Transparent, real-time availability across every stylist, without the back-and-forth calls.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
      </svg>
    ),
  },
  {
    title: "Signature stylists",
    lead: "Vetted professionals with distinct specialties, from precision cuts to bridal finishes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21a8 8 0 1 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    title: "All-in-one admin suite",
    lead: "Run services, stylists, hours, bookings, and payments from a single elegant console.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
];

const services: ServiceHighlight[] = [
  {
    name: "Signature Haircut & Blow Dry",
    duration: "60 min",
    price: "From Rs 1,200",
    description: "Personal consultation, precision cut, and polished blow dry.",
    image:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1000&q=80",
  },
  {
    name: "Balayage & Global Colour",
    duration: "150 min",
    price: "From Rs 4,200",
    description: "Hand-painted dimension with gloss, toner, and bond protection.",
    image:
      "https://images.unsplash.com/photo-1522337094846-8a818192de1f?auto=format&fit=crop&w=1000&q=80",
  },
  {
    name: "Keratin Smoothing",
    duration: "120 min",
    price: "From Rs 5,500",
    description: "Frizz-control treatment with smooth, glossy results.",
    image:
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1000&q=80",
  },
  {
    name: "Bridal Hair Styling",
    duration: "90 min",
    price: "From Rs 6,500",
    description: "Elegant buns, waves, and dupatta-friendly finishes for the occasion.",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80",
  },
];

const testimonials = [
  {
    quote:
      "The calmest salon visit I have had in Mumbai. Booking takes thirty seconds and the finish is always polished.",
    name: "Ananya S.",
    role: "Regular guest, Bandra",
  },
  {
    quote:
      "Running the studio with Aaranya replaced three tools. My stylists finally have one place for schedule, walk-ins, and payments.",
    name: "Ritika M.",
    role: "Admin, Aaranya Salon",
  },
  {
    quote:
      "My colour appointments are seamless. Live slots and thoughtful reminders mean I never have to call twice.",
    name: "Priya N.",
    role: "Regular guest, Powai",
  },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const dashboardHref =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "stylist"
        ? "/stylist/dashboard"
        : "/login";

  return (
    <AppShell>
      <main className="page">
        {/* ============== HERO ============== */}
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span className="dot" />
              Boutique salon experience
            </span>
            <h1>
              Refined cuts. Radiant colour. <em>Effortless booking.</em>
            </h1>
            <p>
              Aaranya Salon pairs a calm Indian studio experience with a quietly powerful
              booking platform. Choose your service, meet your stylist, and reserve a
              real appointment in under a minute.
            </p>
            <div className="row" style={{ gap: 14 }}>
              <Link className="button primary" href="/customer/booking">
                Reserve your visit
                <span className="arrow" aria-hidden>
                  →
                </span>
              </Link>
              <Link className="button secondary" href={dashboardHref}>
                {user ? "Open dashboard" : "Login"}
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="value">12k+</span>
                <span className="label">Guests served</span>
              </div>
              <div className="hero-stat">
                <span className="value">4.9</span>
                <span className="label">Avg. review</span>
              </div>
              <div className="hero-stat">
                <span className="value">24</span>
                <span className="label">Signature stylists</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img
              alt="Aaranya Salon styling floor"
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=85"
            />
            <div className="hero-badge">
              <span className="stars">★★★★★</span>
              <span>Loved by Mumbai guests, 2025</span>
            </div>
          </div>
        </section>

        {/* ============== FEATURES ============== */}
        <section className="section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Why Aaranya</span>
              <h2>Designed around calm, crafted for detail.</h2>
            </div>
            <p className="lead" style={{ maxWidth: 420 }}>
              Every moment of the salon visit, online and in-chair, has been polished
              to feel as considered as your finished look.
            </p>
          </div>
          <div className="grid grid-3">
            {features.map((feature) => (
              <article className="card feature" key={feature.title}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p className="lead" style={{ fontSize: 15, marginTop: 8 }}>
                  {feature.lead}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ============== SIGNATURE SERVICES ============== */}
        <section className="section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Signature services</span>
              <h2>A curated menu, crafted for Indian routines.</h2>
            </div>
            <Link className="button ghost" href="/customer/booking">
              Browse all services
              <span className="arrow" aria-hidden>
                →
              </span>
            </Link>
          </div>
          <div className="grid grid-4">
            {services.map((service) => (
              <article className="service-card" key={service.name}>
                <div
                  style={{
                    height: 160,
                    borderRadius: 14,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <img
                    alt={service.name}
                    src={service.image}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 6 }}
                >
                  <span className="pill gold">{service.duration}</span>
                  <span className="price">{service.price}</span>
                </div>
                <h3>{service.name}</h3>
                <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ============== ROLES ============== */}
        <section className="section">
          <div className="section-header">
            <div>
              <span className="eyebrow">For everyone at the salon</span>
              <h2>One studio. Three thoughtful experiences.</h2>
            </div>
          </div>
          <div className="grid grid-3">
            <article className="card">
              <span className="pill rose">Guests</span>
              <h3 style={{ marginTop: 12 }}>Book in minutes</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
                Live availability across every stylist. No account, no friction—just a
                reserved chair waiting for you.
              </p>
              <Link
                className="button ghost sm"
                href="/customer/booking"
                style={{ marginTop: 14 }}
              >
                Start booking →
              </Link>
            </article>
            <article className="card">
              <span className="pill moss">Admins</span>
              <h3 style={{ marginTop: 12 }}>Run the day, gracefully</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
                Services, stylists, hours, bookings, and payments—one calm console
                that keeps the studio on rhythm.
              </p>
              <Link
                className="button ghost sm"
                href="/admin/login"
                style={{ marginTop: 14 }}
              >
                Admin sign-in →
              </Link>
            </article>
            <article className="card">
              <span className="pill gold">Stylists</span>
              <h3 style={{ marginTop: 12 }}>Stay in flow</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
                See your day at a glance, welcome walk-ins, and close bookings without
                breaking your creative flow.
              </p>
              <Link
                className="button ghost sm"
                href="/stylist/login"
                style={{ marginTop: 14 }}
              >
                Stylist sign-in →
              </Link>
            </article>
          </div>
        </section>

        {/* ============== TESTIMONIALS ============== */}
        <section className="section">
            <div className="section-header">
            <div>
              <span className="eyebrow">Loved by guests & studios</span>
              <h2>Quiet praise, carried gently.</h2>
            </div>
          </div>
          <div className="grid grid-3">
            {testimonials.map((t) => (
              <article className="testimonial" key={t.name}>
                <p className="quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="person">
                  <div
                    className="avatar"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(181,117,100,0.3), rgba(184,134,77,0.3))",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--rose)",
                      fontWeight: 700,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ============== CTA BAND ============== */}
        <section className="cta-band">
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>
              Reserve today
            </span>
            <h2 style={{ marginTop: 12 }}>
              Your chair, prepared. Your stylist, ready.
            </h2>
            <p>
              Browse live availability and lock in a visit. Thoughtful reminders, soft
              follow-ups, and an always-open studio—on your schedule.
            </p>
          </div>
          <div className="row">
            <Link className="button primary" href="/customer/booking">
              Book a visit
              <span className="arrow" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
