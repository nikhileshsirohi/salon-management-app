import Link from "next/link";
import {
  CalendarCheck,
  DollarSign,
  Scissors,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";

const cards = [
  { label: "Today's revenue", value: "$4,860", icon: DollarSign, tone: "bg-[#fff1f4] text-[#c64f67]" },
  { label: "Appointments", value: "38", icon: CalendarCheck, tone: "bg-[#eef5f0] text-[#47685a]" },
  { label: "Checked in", value: "24", icon: UserRoundCheck, tone: "bg-[#f7e7dc] text-[#8a4a13]" },
  { label: "Utilization", value: "82%", icon: TrendingUp, tone: "bg-[#f2eee9] text-[#171312]" },
];

const bookings = [
  ["10:00", "Emma Stone", "Gloss Color", "Maya"],
  ["11:30", "Riya Patel", "Signature Cut", "Ava"],
  ["01:00", "Sofia Reed", "Spa Facial", "Nora"],
  ["03:30", "Meera Shah", "Bridal Trial", "Maya"],
];

export default function OwnerDashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ef] text-[#171312]">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-[#eaded6] bg-white p-5 lg:min-h-[calc(100vh-48px)]">
          <Link className="flex items-center gap-3 text-lg font-bold" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#171312] text-white">
              <Scissors size={20} />
            </span>
            Luma Salon
          </Link>
          <nav className="mt-8 grid gap-2 text-sm font-bold text-[#6f625d]">
            {["Dashboard", "Bookings", "Services", "Stylists", "Hours"].map((item) => (
              <Link
                className={`rounded-lg px-3 py-3 ${
                  item === "Dashboard" ? "bg-[#171312] text-white" : "hover:bg-[#f7f3ef]"
                }`}
                href={item === "Dashboard" ? "/owner/dashboard" : `/owner/${item.toLowerCase()}`}
                key={item}
              >
                {item}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="grid gap-6">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-[#eaded6] bg-white p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-[#c64f67]">
                Owner dashboard
              </p>
              <h1 className="mt-2 text-4xl font-bold">Today's salon flow</h1>
              <p className="mt-2 text-[#6f625d]">
                Keep bookings, revenue, chairs, and team workload in one view.
              </p>
            </div>
            <Link className="rounded-lg bg-[#c64f67] px-5 py-3 text-center font-bold text-white" href="/booking">
              Add booking
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div className="rounded-lg border border-[#eaded6] bg-white p-5" key={card.label}>
                  <span className={`grid h-11 w-11 place-items-center rounded-lg ${card.tone}`}>
                    <Icon size={20} />
                  </span>
                  <p className="mt-5 text-3xl font-bold">{card.value}</p>
                  <p className="mt-1 text-sm font-semibold text-[#6f625d]">{card.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-lg border border-[#eaded6] bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold">Upcoming appointments</h2>
                <Link className="text-sm font-bold text-[#c64f67]" href="/owner/bookings">
                  View all
                </Link>
              </div>
              <div className="mt-5 overflow-hidden rounded-lg border border-[#eaded6]">
                {bookings.map(([time, client, service, stylist]) => (
                  <div className="grid grid-cols-[70px_1fr] gap-4 border-b border-[#eaded6] p-4 last:border-b-0 sm:grid-cols-[80px_1fr_1fr_90px]" key={`${time}-${client}`}>
                    <p className="font-bold text-[#c64f67]">{time}</p>
                    <p className="font-bold">{client}</p>
                    <p className="text-[#6f625d]">{service}</p>
                    <p className="text-[#6f625d]">{stylist}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-[#eaded6] bg-white">
              <img
                alt="Salon reception desk"
                className="h-56 w-full object-cover"
                src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=900&q=85"
              />
              <div className="p-5">
                <h2 className="text-xl font-bold">Chair utilization</h2>
                <div className="mt-5 grid gap-3">
                  {["Cutting", "Color", "Wash", "Spa"].map((area, index) => (
                    <div key={area}>
                      <div className="mb-2 flex justify-between text-sm font-bold">
                        <span>{area}</span>
                        <span>{[88, 74, 63, 91][index]}%</span>
                      </div>
                      <div className="h-3 rounded-lg bg-[#f2eee9]">
                        <div className="h-3 rounded-lg bg-[#47685a]" style={{ width: `${[88, 74, 63, 91][index]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
