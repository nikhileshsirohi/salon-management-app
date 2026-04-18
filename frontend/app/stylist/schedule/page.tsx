import Link from "next/link";
import { Clock3, Coffee, Scissors, Sparkles } from "lucide-react";

const appointments = [
  { time: "10:00 AM", guest: "Riya Patel", service: "Signature Cut", status: "Checked in" },
  { time: "11:30 AM", guest: "Nina Kapoor", service: "Blowout", status: "Arriving" },
  { time: "1:00 PM", guest: "Sara Miles", service: "Gloss Color", status: "Prep" },
  { time: "3:30 PM", guest: "Leah Wong", service: "Layered Cut", status: "Confirmed" },
];

export default function StylistSchedulePage() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#171312]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between">
          <Link className="flex items-center gap-3 text-lg font-bold" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#171312] text-white">
              <Scissors size={20} />
            </span>
            Luma Salon
          </Link>
          <Link className="rounded-lg bg-[#171312] px-4 py-2 text-sm font-bold text-white" href="/stylist/walk-ins">
            Add walk-in
          </Link>
        </nav>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="overflow-hidden rounded-lg border border-[#eaded6] bg-white">
            <img
              alt="Stylist preparing hair tools"
              className="h-72 w-full object-cover"
              src="https://images.unsplash.com/photo-1559599076-9c61d8e1b77d?auto=format&fit=crop&w=1000&q=85"
            />
            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-normal text-[#c64f67]">
                Stylist portal
              </p>
              <h1 className="mt-2 text-4xl font-bold">Ava's schedule</h1>
              <p className="mt-3 text-[#6f625d]">
                Four appointments, one break, and a light color block this
                afternoon.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#fff1f4] p-4">
                  <Clock3 className="text-[#c64f67]" size={20} />
                  <p className="mt-3 text-2xl font-bold">6h 30m</p>
                  <p className="text-sm font-semibold text-[#6f625d]">Booked time</p>
                </div>
                <div className="rounded-lg bg-[#eef5f0] p-4">
                  <Coffee className="text-[#47685a]" size={20} />
                  <p className="mt-3 text-2xl font-bold">2:15 PM</p>
                  <p className="text-sm font-semibold text-[#6f625d]">Next break</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#eaded6] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Today</h2>
                <p className="mt-1 text-[#6f625d]">Saturday appointments</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#f7e7dc] px-3 py-2 text-sm font-bold text-[#8a4a13]">
                <Sparkles size={16} />
                On track
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {appointments.map((appointment, index) => (
                <article
                  className="grid gap-4 rounded-lg border border-[#eaded6] p-4 sm:grid-cols-[96px_1fr_auto]"
                  key={`${appointment.time}-${appointment.guest}`}
                >
                  <div className="font-bold text-[#c64f67]">{appointment.time}</div>
                  <div>
                    <h3 className="text-lg font-bold">{appointment.guest}</h3>
                    <p className="text-[#6f625d]">{appointment.service}</p>
                  </div>
                  <span
                    className={`h-fit rounded-lg px-3 py-2 text-sm font-bold ${
                      index === 0
                        ? "bg-[#eef5f0] text-[#47685a]"
                        : "bg-[#f2eee9] text-[#6f625d]"
                    }`}
                  >
                    {appointment.status}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
