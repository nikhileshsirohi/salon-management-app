import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function BookingConfirmationPage() {
  return (
    <AppShell>
      <main className="page">
        <div className="card stack">
          <span className="eyebrow">Confirmed</span>
          <h1 className="page-title">Your appointment is booked.</h1>
          <p className="lead">We saved your appointment details.</p>
          <Link className="button" href="/booking">
            Book another appointment
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
