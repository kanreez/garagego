export type GarageSize = "small" | "medium" | "large";
export type Access = "app" | "manual";
export type BookingMode = "hour" | "day";

export type AvailabilityWindow = { day: number; start: number; end: number };

export type Garage = {
  id: string;
  host_id: string | null;
  title: string;
  city: string;
  area: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  size: GarageSize;
  covered: boolean;
  price_hour: number;
  price_day: number;
  access: Access;
  image_url: string | null;
  description: string | null;
  availability: AvailabilityWindow[] | null;
  created_at: string;
  hidden?: boolean;
  device_key?: string;
  device_last_seen?: string | null;
  rating?: RatingSummary;
};

export type RatingSummary = { average: number | null; count: number };

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
};

export type GarageInput = Pick<
  Garage,
    | "title"
  | "city"
  | "area"
  | "address"
  | "latitude"
  | "longitude"
  | "size"
  | "covered"
  | "price_hour"
  | "price_day"
  | "access"
  | "image_url"
  | "description"
  | "availability"
>;

export type BusySlot = { starts_at: string; ends_at: string };

export type HostPhone = { number: string; public: boolean } | { number: null; public: false; hidden: true };

export type BookingStatus = "pending_payment" | "paid" | "cancelled" | "expired";

export type Booking = {
  id: string;
  garage_id: string;
  renter_id: string;
  starts_at: string;
  ends_at: string;
  mode: BookingMode;
  total_price: number;
  amount_cents: number | null;
  status: BookingStatus;
  expires_at: string | null;
  left_early_at?: string | null;
  created_at: string;
  garage: Garage | null;
  payment: PaymentSummary | null;
  review: Review | null;
  host_phone?: string | null;
};

export type PaymentStatus = "pending" | "succeeded" | "declined" | "requires_action" | "refunded";

export type PaymentSummary = {
  id: string;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  method: "card" | "wallet" | null;
  card_last4: string | null;
  card_brand: string | null;
};

export type Checkout = {
  booking_id: string;
  payment_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  expires_at: string;
  units: number;
  unit: "hour" | "day";
  unit_price_cents: number;
};

export type PayResult = {
  status: "succeeded" | "declined" | "requires_action";
  message?: string;
  card_last4?: string;
  card_brand?: string;
  method?: "card" | "wallet";
};

export type Earnings = {
  total_payout_cents: number;
  currency: string;
  bookings: {
    booking_id: string;
    garage_id: string;
    garage_title: string;
    starts_at: string;
    ends_at: string;
    amount_cents: number;
    host_payout_cents: number;
  }[];
};

export type SearchFilters = {
  city: string | null;
  area: string | null;
  from: string | null;
  to: string | null;
  vehicle_size: GarageSize | null;
  covered: boolean | null;
  wants: string | null;
};

export type SearchResult = {
  filters: SearchFilters;
  from_utc: string | null;
  to_utc: string | null;
  center: { latitude: number; longitude: number } | null;
  wants_checked?: boolean;
  garages: Garage[];
  off_topic?: boolean;
  hint?: string;
};

export type DoorAction = "open" | "close";
export type CommandStatus = "queued" | "opened" | "error";
export type Command = { status: CommandStatus; acked_at: string | null; error: string | null };
