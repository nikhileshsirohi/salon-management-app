import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, Scissors, UserRound } from "lucide-react";

const services = ["Haircut", "Hair Color", "Spa Facial", "Bridal Styling"];
const stylists = ["Maya Chen", "Ava Brooks", "Nora Lee"];
const times = ["10:00 AM", "11:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"];

export default function BookingPage() {
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
          <Link className="text-sm font-bold text-[#c64f67]" href="/owner/dashboard">
            Owner view
          </Link>
        </nav>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[520px] overflow-hidden rounded-lg">
            <img
              alt="Salon chair and mirror"
              className="absolute inset-0 h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1200&q=85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171312]/85 via-[#171312]/25 to-transparent" />
            <div className="absolute bottom-0 p-6 text-white sm:p-8">
              <p className="text-sm font-bold uppercase tracking-normal text-white/75">
                Reserve your chair
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
                Pick a service, stylist, and time in one calm flow.
              </h1>
            </div>
          </div>

          <div className="rounded-lg border border-[#eaded6] bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-5">
              <section>
                <div className="mb-3 flex items-center gap-2 font-bold">
                  <Scissors size={18} className="text-[#c64f67]" />
                  Select service
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((service, index) => (
                    <button
                      className={`rounded-lg border p-4 text-left font-bold ${
                        index === 0
                          ? "border-[#c64f67] bg-[#fff1f4] text-[#9f3148]"
                          : "border-[#eaded6] bg-white text-[#171312]"
                      }`}
                      key={service}
                    >
                      {service}
                      <span className="mt-2 block text-sm font-semibold text-[#6f625d]">
                        From ${index === 0 ? "55" : index === 1 ? "120" : "75"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 font-bold">
                  <UserRound size={18} className="text-[#47685a]" />
                  Choose stylist
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {stylists.map((stylist, index) => (
                    <button
                      className={`rounded-lg border p-4 text-left ${
                        index === 1 ? "border-[#47685a] bg-[#eef5f0]" : "border-[#eaded6]"
                      }`}
                      key={stylist}
                    >
                      <span className="block font-bold">{stylist}</span>
                      <span className="text-sm font-semibold text-[#6f625d]">
                        {index === 0 ? "Color" : index === 1 ? "Cuts" : "Texture"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#b88945]" />
                    Appointment date
                  </span>
                  <input
                    className="rounded-lg border border-[#eaded6] px-4 py-3 outline-none focus:border-[#c64f67]"
                    type="date"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <Clock3 size={18} className="text-[#b88945]" />
                    Available time
                  </span>
                  <select className="rounded-lg border border-[#eaded6] px-4 py-3 outline-none focus:border-[#c64f67]">
                    {times.map((time) => (
                      <option key={time}>{time}</option>
                    ))}
                  </select>
                </label>
              </section>

              <div className="rounded-lg bg-[#171312] p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white/65">
                      Haircut with Ava Brooks
                    </p>
                    <p className="mt-1 text-2xl font-bold">$55.00</p>
                  </div>
                  <Link
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c64f67] px-4 py-3 font-bold"
                    href="/booking/confirmation"
                  >
                    Continue <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
