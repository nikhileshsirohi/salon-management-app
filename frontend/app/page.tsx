import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Scissors,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

const services = [
  {
    name: "Signature Cut",
    time: "45 min",
    price: "$55",
    image:
      "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Gloss Color",
    time: "90 min",
    price: "$120",
    image:
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Bridal Styling",
    time: "75 min",
    price: "$95",
    image:
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80",
  },
];

const metrics = [
  { label: "Bookings today", value: "38", icon: CalendarDays },
  { label: "Active stylists", value: "12", icon: UsersRound },
  { label: "Avg wait", value: "8m", icon: Clock3 },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#171312]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link className="flex items-center gap-3 text-lg font-bold" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#171312] text-white">
            <Scissors size={20} />
          </span>
          Luma Salon
        </Link>
        <div className="hidden items-center gap-6 text-sm font-semibold text-[#6f625d] sm:flex">
          <Link href="/booking">Booking</Link>
          <Link href="/owner/dashboard">Owner</Link>
          <Link href="/stylist/schedule">Stylist</Link>
        </div>
      </nav>

      <section className="relative min-h-[82vh] overflow-hidden">
        <img
          alt="Salon stylist finishing a client's hair"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1800&q=85"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#171312]/85 via-[#171312]/55 to-transparent" />
        <div className="relative mx-auto flex min-h-[82vh] max-w-7xl items-center px-5 pb-20 pt-10 sm:px-8">
          <div className="max-w-2xl text-white">
            <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} />
              Smart salon booking and daily operations
            </p>
            <h1 className="text-5xl font-bold leading-tight sm:text-7xl">
              Beauty bookings that feel effortless.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/85">
              Help guests reserve their favorite service, give owners a calm
              command center, and keep stylists clear on every appointment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-[#c64f67] px-5 py-3 font-bold text-white shadow-xl shadow-black/20"
                href="/booking"
              >
                Book now <ArrowRight size={18} />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-white/15 px-5 py-3 font-bold text-white backdrop-blur"
                href="/owner/dashboard"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-12 grid max-w-7xl gap-4 px-5 pb-16 sm:grid-cols-3 sm:px-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              className="rounded-lg border border-[#eaded6] bg-white p-5 shadow-sm"
              key={metric.label}
            >
              <Icon className="text-[#c64f67]" size={22} />
              <p className="mt-4 text-3xl font-bold">{metric.value}</p>
              <p className="text-sm font-semibold text-[#6f625d]">
                {metric.label}
              </p>
            </div>
          );
        })}
      </div>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-20 sm:grid-cols-3 sm:px-8">
        {services.map((service) => (
          <article
            className="overflow-hidden rounded-lg border border-[#eaded6] bg-white shadow-sm"
            key={service.name}
          >
            <img
              alt={service.name}
              className="h-56 w-full object-cover"
              src={service.image}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{service.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-[#6f625d]">
                    {service.time}
                  </p>
                </div>
                <p className="rounded-lg bg-[#f7e7dc] px-3 py-2 font-bold text-[#8a4a13]">
                  {service.price}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-[#b88945]">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Star fill="currentColor" key={item} size={16} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
