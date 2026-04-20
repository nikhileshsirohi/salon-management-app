"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { clearAuth, login } from "@/lib/auth";
import type { UserRole } from "@/types/api";

type LoginFormProps = {
  expectedRole?: UserRole;
};

const roleDashboard: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  stylist: "/stylist/dashboard",
};

const visuals: Record<
  "admin" | "stylist" | "default",
  { image: string; alt: string; quote: string; attribution: string }
> = {
  admin: {
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    alt: "Salon admin console overlooking the styling floor",
    quote:
      "The calmest mornings I've had running a studio—every booking and payment in one place.",
    attribution: "Studio admin, Bandra",
  },
  stylist: {
    image:
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80",
    alt: "Stylist preparing a chair for the next client",
    quote:
      "My day flows. I see my chair, my walk-ins, and my clients—without leaving the floor.",
    attribution: "Senior colourist",
  },
  default: {
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    alt: "Aaranya Salon reception",
    quote: "A calm Indian studio meets quietly powerful software.",
    attribution: "Aaranya Salon",
  },
};

export function LoginForm({ expectedRole }: LoginFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const auth = await login(email, password);
      if (expectedRole && auth.user.role !== expectedRole) {
        clearAuth();
        setError(`This is the ${expectedRole} login. Please use the correct account.`);
        return;
      }

      const next = params.get("next");
      if (next?.startsWith("/admin") && auth.user.role !== "admin") {
        clearAuth();
        setError("This account is for staff access only. Admin pages need an admin account.");
        return;
      }
      if (next?.startsWith("/stylist") && auth.user.role !== "stylist") {
        clearAuth();
        setError("This account is for admin access only. Staff pages need a stylist account.");
        return;
      }

      router.push(next ?? roleDashboard[auth.user.role]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const kind = expectedRole ?? "default";
  const visual = visuals[kind];
  const title =
    expectedRole === "admin"
      ? "Admin sign-in"
      : expectedRole === "stylist"
        ? "Stylist sign-in"
        : "Sign in to Aaranya";
  const description =
    expectedRole === "admin"
      ? "Open the console to manage services, stylists, hours, bookings, and payments."
      : expectedRole === "stylist"
        ? "Step into your workday—schedule, walk-ins, and booking history, in one serene place."
        : "One set of credentials. Aaranya reads your role and opens the right studio for you.";

  return (
    <AppShell>
      <main className="page">
        <div className="split">
          <section className="auth-visual">
            <img alt={visual.alt} src={visual.image} />
            <div className="auth-visual-text">
              <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>
                Aaranya Salon
              </span>
              <p className="quote">&ldquo;{visual.quote}&rdquo;</p>
              <span style={{ opacity: 0.8, fontSize: 13 }}>— {visual.attribution}</span>
            </div>
          </section>

          <form className="card stack" onSubmit={submit} style={{ padding: 32 }}>
            <div>
              <span className="eyebrow">{title}</span>
              <h1 className="page-title" style={{ fontSize: "2.2rem", marginTop: 6 }}>
                Welcome back.
              </h1>
              <p className="lead" style={{ marginTop: 8, fontSize: 15 }}>
                {description}
              </p>
            </div>

            {error && <Notice kind="error">{error}</Notice>}

            <div className="field">
              <label>Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
            />

            <button className="button primary" disabled={loading} type="submit">
              {loading ? "Signing in…" : "Sign in"}
              {!loading && (
                <span className="arrow" aria-hidden>
                  →
                </span>
              )}
            </button>

            <div className="divider" />

            {expectedRole === "admin" ? (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  Admin accounts are provisioned by the Aaranya team.
                </span>
                <Link className="muted" href="/stylist/login">
                  Stylist sign-in →
                </Link>
              </div>
            ) : expectedRole === "stylist" ? (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Link className="muted" href="/admin/login">
                  Admin sign-in →
                </Link>
                <Link className="muted" href="/customer/booking">
                  Book as a guest
                </Link>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Link className="muted" href="/admin/login">
                  Admin sign-in
                </Link>
                <Link className="muted" href="/stylist/login">
                  Stylist sign-in
                </Link>
              </div>
            )}

            <Link
              className="muted"
              href="/customer/booking"
              style={{ fontSize: 13, textAlign: "center" }}
            >
              Just booking? Guests don&rsquo;t need an account →
            </Link>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
