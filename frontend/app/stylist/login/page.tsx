"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function StylistLoginPage() {
  return (
    <Suspense fallback={<div className="loading">Loading staff login...</div>}>
      <LoginForm expectedRole="stylist" />
    </Suspense>
  );
}
