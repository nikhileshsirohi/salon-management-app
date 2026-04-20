"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="loading">Loading admin login...</div>}>
      <LoginForm expectedRole="admin" />
    </Suspense>
  );
}
