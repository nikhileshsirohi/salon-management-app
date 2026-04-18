export type UserRole = "owner" | "stylist";

export type User = {
  id: number;
  email: string;
  role: UserRole;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Service = {
  id: number;
  salon_id: number;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: string;
  is_active: boolean;
};

export type Stylist = {
  id: number;
  salon_id: number;
  user_id?: number | null;
  email?: string | null;
  name: string;
  phone?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  is_active: boolean;
  specialties: string[];
};

export type Salon = {
  id: number;
  owner_user_id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  timezone: string;
  default_slot_duration_minutes: number;
};

export type OperatingHour = {
  id?: number | null;
  salon_id: number;
  day_of_week: number;
  opens_at?: string | null;
  closes_at?: string | null;
  is_closed: boolean;
};

export type StylistAvailability = {
  id: number;
  stylist_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  slot_duration_minutes: number;
  is_available: boolean;
};

export type AvailableSlot = {
  starts_at_local: string;
  ends_at_local: string;
  starts_at_utc: string;
  ends_at_utc: string;
};

export type AvailabilityResponse = {
  salon_id: number;
  stylist_id: number;
  service_id: number;
  date: string;
  timezone: string;
  slots: AvailableSlot[];
};

export type Booking = {
  id: number;
  salon_id: number;
  stylist_id: number;
  service_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  starts_at_utc: string;
  ends_at_utc: string;
  local_date: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
  booking_type: "online" | "walk_in";
  notes?: string | null;
  amount?: string | null;
  payment_status?: "unpaid" | "paid" | "refunded" | null;
  stylist_name?: string | null;
  service_name?: string | null;
};

export type DashboardSummary = {
  salon_id: number;
  date: string;
  generated_at_utc: string;
  metrics: {
    today_bookings: number;
    today_revenue: string;
    upcoming_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
  };
  upcoming_appointments: Booking[];
  stylist_utilization: Array<{
    stylist_id: number;
    stylist_name: string;
    available_minutes: number;
    booked_minutes: number;
    utilization_percent: number;
  }>;
};
