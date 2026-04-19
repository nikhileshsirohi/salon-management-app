"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { clearAuth, getStoredToken, refreshCurrentUser } from "@/lib/auth";
import type { User, UserRole } from "@/types/api";
import { Notice } from "@/components/ui/notice";

type ProtectedPageProps = {
  role: UserRole;
  children: (auth: { token: string; user: User }) => React.ReactNode;
};

export function ProtectedPage({ role, children }: ProtectedPageProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setToken(storedToken);
    refreshCurrentUser(storedToken)
      .then((freshUser) => {
        setUser(freshUser);
        if (freshUser.role !== role) {
          const destination = freshUser.role === "owner" ? "/owner/dashboard" : "/stylist/dashboard";
          setError(`This page is for ${role}s only. Redirecting...`);
          router.replace(destination);
        }
      })
      .catch((caught) => {
        setToken(null);
        setUser(null);
        if (caught instanceof ApiError && caught.status === 401) {
          clearAuth();
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not check your session.");
      });
  }, [role, router]);

  function goToLogin() {
    clearAuth();
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }

  if (error) {
    return (
      <Notice kind="error">
        {error}{" "}
        <button className="text-button" onClick={goToLogin} type="button">
          Login again
        </button>
      </Notice>
    );
  }

  if (!token || !user) {
    return <div className="loading">Checking your session...</div>;
  }

  if (user.role !== role) {
    return <Notice kind="error">This page is for {role}s only.</Notice>;
  }

  return <>{children({ token, user })}</>;
}
