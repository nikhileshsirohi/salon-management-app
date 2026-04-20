import type { Booking, Salon } from "@/types/api";

const STORAGE_KEY = "aaranya-booking-confirmation";
const LEGACY_STORAGE_KEYS = ["maison-booking-confirmation"];
// Anything older than this is treated as stale, so a refresh tomorrow doesn't
// resurrect yesterday's confirmation.
const FRESHNESS_WINDOW_MS = 30 * 60 * 1000;

export type ConfirmationServiceSnapshot = {
  id: number;
  name: string;
  duration_minutes: number;
  price: string;
};

export type BookingConfirmationPayload = {
  booking: Booking;
  salon: Salon | null;
  stylistName: string | null;
  services: ConfirmationServiceSnapshot[];
};

type StoredPayload = BookingConfirmationPayload & { _storedAt: number };

export function storeBookingConfirmation(payload: BookingConfirmationPayload): void {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredPayload = { ...payload, _storedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* noop — full storage, private mode, etc. */
  }
}

export function readBookingConfirmation(): BookingConfirmationPayload | null {
  if (typeof window === "undefined") return null;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      sessionStorage.removeItem(key);
    }
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredPayload;
    if (stored.salon?.name?.includes("Maison")) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (
      typeof stored._storedAt === "number" &&
      Date.now() - stored._storedAt > FRESHNESS_WINDOW_MS
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { _storedAt: _ignored, ...payload } = stored;
    void _ignored;
    return payload;
  } catch {
    return null;
  }
}

export function clearBookingConfirmation(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

function formatIcsDate(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsEvent(payload: BookingConfirmationPayload): string {
  const { booking, salon, stylistName, services } = payload;
  const serviceLabel = services.map((s) => s.name).join(" + ") || "Salon appointment";
  const summary = `${serviceLabel} @ ${salon?.name ?? "Aaranya Salon"}`;
  const descriptionParts = [
    `Services: ${services.map((s) => `${s.name} (${s.duration_minutes} min)`).join(", ")}`,
    stylistName ? `Stylist: ${stylistName}` : "",
    booking.amount ? `Total: ${booking.amount}` : "",
    booking.customer_name ? `Guest: ${booking.customer_name}` : "",
    booking.notes ? `Notes: ${booking.notes}` : "",
  ].filter(Boolean);
  const description = descriptionParts.join("\\n");
  const location = [salon?.name, salon?.address].filter(Boolean).join(", ");
  const uid = `aaranya-booking-${booking.id}@aaranya-salon.local`;
  const now = formatIcsDate(new Date().toISOString());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aaranya Salon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(booking.starts_at_utc)}`,
    `DTEND:${formatIcsDate(booking.ends_at_utc)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function buildGoogleCalendarUrl(payload: BookingConfirmationPayload): string {
  const { booking, salon, stylistName, services } = payload;
  const serviceLabel = services.map((s) => s.name).join(" + ") || "Salon appointment";
  const title = `${serviceLabel} @ ${salon?.name ?? "Aaranya Salon"}`;
  const details = [
    `Services: ${services.map((s) => `${s.name} (${s.duration_minutes} min)`).join(", ")}`,
    stylistName ? `Stylist: ${stylistName}` : "",
    booking.notes ? `Notes: ${booking.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const location = [salon?.name, salon?.address].filter(Boolean).join(", ");
  const dates = `${formatIcsDate(booking.starts_at_utc)}/${formatIcsDate(booking.ends_at_utc)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile(payload: BookingConfirmationPayload): void {
  if (typeof window === "undefined") return;
  const ics = buildIcsEvent(payload);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aaranya-salon-booking-${payload.booking.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
