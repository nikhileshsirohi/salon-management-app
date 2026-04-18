"use client";

import { apiRequest } from "@/lib/api";
import type { AuthToken, User } from "@/types/api";

const TOKEN_KEY = "salon_app_token";
const USER_KEY = "salon_app_user";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function storeAuth(auth: AuthToken) {
  window.localStorage.setItem(TOKEN_KEY, auth.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function login(username: string, password: string) {
  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail ?? "Login failed");
  }

  storeAuth(data as AuthToken);
  return data as AuthToken;
}

export async function refreshCurrentUser(token: string) {
  const user = await apiRequest<User>("/auth/me", { token });
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
