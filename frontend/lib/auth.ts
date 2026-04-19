"use client";

import { API_URL, apiRequest } from "@/lib/api";
import type { AuthToken, OwnerSignupPayload, User } from "@/types/api";

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    });
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw new Error("Backend did not respond. Please check that FastAPI is running on http://127.0.0.1:8000.");
    }
    if (caught instanceof TypeError) {
      throw new Error("Could not reach the backend. Please check that FastAPI is running on http://127.0.0.1:8000.");
    }
    throw caught;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail ?? "Login failed");
  }

  storeAuth(data as AuthToken);
  return data as AuthToken;
}

export async function signupOwner(payload: OwnerSignupPayload) {
  const response = await apiRequest<AuthToken>("/auth/owner-signup", {
    method: "POST",
    body: payload,
  });
  storeAuth(response);
  return response;
}

export async function changeMyPassword(token: string, currentPassword: string, newPassword: string) {
  return apiRequest<User>("/auth/me/password", {
    method: "PUT",
    token,
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}

export async function refreshCurrentUser(token: string) {
  const user = await apiRequest<User>("/auth/me", { token });
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
