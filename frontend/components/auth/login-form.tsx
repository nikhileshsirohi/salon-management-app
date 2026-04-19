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
  owner: "/owner/dashboard",
  stylist: "/stylist/dashboard",
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
      if (next?.startsWith("/owner") && auth.user.role !== "owner") {
        clearAuth();
        setError("This account is for staff access only. Owner pages need an owner account.");
        return;
      }
      if (next?.startsWith("/stylist") && auth.user.role !== "stylist") {
        clearAuth();
        setError("This account is for owner access only. Staff pages need a stylist account.");
        return;
      }

      router.push(next ?? roleDashboard[auth.user.role]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const title = expectedRole === "owner" ? "Owner login" : expectedRole === "stylist" ? "Staff login" : "Owner or staff login";
  const description =
    expectedRole === "owner"
      ? "Owners can manage salon settings, services, stylists, bookings, and payments."
      : expectedRole === "stylist"
        ? "Stylists can view their schedule, add walk-ins, and check booking history."
        : "Enter your credentials once. The app reads your account role and opens the correct dashboard.";

  return (
    <AppShell>
      <main className="page">
        <div className="grid grid-2">
          <section className="card stack">
            <span className="eyebrow">{title}</span>
            <h1 className="page-title">Welcome back.</h1>
            <p className="lead">{description}</p>
            <img
              alt="Salon reception desk"
              className="hero-image"
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80"
            />
          </section>
          <form className="card stack" onSubmit={submit}>
            <h2>Sign in</h2>
            {error && <Notice kind="error">{error}</Notice>}
            <div className="field">
              <label>Email</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </div>
            <PasswordField label="Password" value={password} onChange={setPassword} />
            <button className="button" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>
            {expectedRole === "owner" ? (
              <div className="row">
                <Link href="/owner/signup">Create owner account</Link>
                <Link href="/stylist/login">Use staff login instead</Link>
              </div>
            ) : expectedRole === "stylist" ? (
              <Link href="/owner/login">Use owner login instead</Link>
            ) : (
              <div className="row">
                <Link href="/owner/login">Owner login</Link>
                <Link href="/stylist/login">Staff login</Link>
                <Link href="/owner/signup">Owner signup</Link>
              </div>
            )}
            <Link href="/customer/booking">Customer booking page</Link>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
