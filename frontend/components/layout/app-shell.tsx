"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, getStoredToken, getStoredUser, refreshCurrentUser } from "@/lib/auth";
import type { User } from "@/types/api";

type AppShellProps = {
  area?: "public" | "owner" | "stylist";
  children: React.ReactNode;
};

const ownerLinks = [
  ["/owner/dashboard", "Dashboard"],
  ["/owner/salon", "Salon"],
  ["/owner/services", "Services"],
  ["/owner/stylists", "Stylists"],
  ["/owner/bookings", "Bookings"],
];

const stylistLinks = [
  ["/stylist/dashboard", "Dashboard"],
  ["/stylist/schedule", "Schedule"],
  ["/stylist/history", "History"],
  ["/stylist/walk-in", "Walk-in"],
];

export function AppShell({ area = "public", children }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const activeArea = user?.role ?? (area !== "public" ? area : undefined);
  const links = activeArea === "owner" ? ownerLinks : activeArea === "stylist" ? stylistLinks : [];

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">S</span>
          <span>Salon Studio</span>
        </Link>
        <nav className="topnav">
          <Link href="/booking">Book</Link>
          {links.map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
          {user ? (
            <button className="text-button" onClick={logout}>
              Logout
            </button>
          ) : (
            <>
              <Link href="/owner/login">Owner Login</Link>
              <Link href="/stylist/login">Staff Login</Link>
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}
