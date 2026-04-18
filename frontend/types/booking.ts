export type BookingStatus = "booked" | "completed" | "cancelled" | "no_show";
export type BookingType = "online" | "walk_in";

export type Booking = {
  id: number;
  stylistId: number;
  serviceId: number;
  customerName: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: BookingStatus;
  bookingType: BookingType;
};
