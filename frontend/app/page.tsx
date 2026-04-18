import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal">
            Salon booking
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Book a stylist, manage the schedule, and keep the day moving.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-600">
            Start with the customer booking flow, then add owner and stylist tools
            as the product grows.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Link className="rounded-lg border border-zinc-200 p-5 hover:border-teal" href="/booking">
            <h2 className="text-xl font-semibold">Book Appointment</h2>
            <p className="mt-2 text-sm text-zinc-600">Public booking without login.</p>
          </Link>
          <Link className="rounded-lg border border-zinc-200 p-5 hover:border-teal" href="/owner/dashboard">
            <h2 className="text-xl font-semibold">Owner Dashboard</h2>
            <p className="mt-2 text-sm text-zinc-600">Manage staff, hours, and bookings.</p>
          </Link>
          <Link className="rounded-lg border border-zinc-200 p-5 hover:border-teal" href="/stylist/schedule">
            <h2 className="text-xl font-semibold">Stylist Schedule</h2>
            <p className="mt-2 text-sm text-zinc-600">See appointments and walk-ins.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
