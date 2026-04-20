"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, getStoredToken, getStoredUser, refreshCurrentUser } from "@/lib/auth";
import type { User } from "@/types/api";

type AppShellProps = {
  area?: "public" | "admin" | "stylist";
  children: React.ReactNode;
};

const adminLinks: Array<[string, string]> = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/salon", "Salon"],
  ["/admin/services", "Services"],
  ["/admin/stylists", "Stylists"],
  ["/admin/bookings", "Bookings"],
];

const stylistLinks: Array<[string, string]> = [
  ["/stylist/dashboard", "Dashboard"],
  ["/stylist/profile", "Profile"],
  ["/stylist/schedule", "Schedule"],
  ["/stylist/history", "History"],
  ["/stylist/walk-in", "Walk-in"],
];

export function AppShell({ area = "public", children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const activeArea = user?.role ?? (area !== "public" ? area : undefined);
  const links = activeArea === "admin" ? adminLinks : activeArea === "stylist" ? stylistLinks : [];

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }

    refreshCurrentUser(token)
      .then(setUser)
      .catch(() => {
        clearAuth();
        setUser(null);
      });
  }, []);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Maison Salon home">
          <span className="brand-mark">M</span>
          <span className="brand-meta">
            <span>Maison Salon</span>
            <small>Est. 2024 · Boutique</small>
          </span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          {links.length === 0 ? (
            <>
              <Link href="/" className={isActive("/") && pathname === "/" ? "active" : ""}>
                Home
              </Link>
              <Link
                href="/customer/booking"
                className={isActive("/customer/booking") ? "active" : ""}
              >
                Book
              </Link>
              <Link href="/admin/login">Admin</Link>
              <Link href="/stylist/login">Stylist</Link>
              <Link href="/customer/booking" className="cta">
                Reserve
              </Link>
            </>
          ) : (
            <>
              {links.map(([href, label]) => (
                <Link href={href} key={href} className={isActive(href) ? "active" : ""}>
                  {label}
                </Link>
              ))}
              <Link href="/customer/booking" className="cta">
                Public booking
              </Link>
            </>
          )}
          {user ? (
            <button className="text-button" onClick={logout}>
              Logout
            </button>
          ) : null}
        </nav>
      </header>
      {children}
      <footer className="footer">
        <div>
          <strong style={{ color: "var(--ink)" }}>Maison Salon</strong> · Crafted boutique
          salon management
        </div>
        <div className="row" style={{ gap: 18 }}>
          <Link href="/customer/booking">Book</Link>
          <Link href="/admin/login">For admins</Link>
          <Link href="/stylist/login">For stylists</Link>
        </div>
      </footer>
    </div>
  );
}
