"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<div className="loading">Loading owner login...</div>}>
      <LoginForm expectedRole="owner" />
    </Suspense>
  );
}
