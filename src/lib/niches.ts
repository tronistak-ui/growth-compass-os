export const NICHES = [
  "Restaurant",
  "Salon / Barber",
  "Gym / Fitness",
  "Dental",
  "Real Estate",
  "Home / Local Services",
  "Wellness",
  "Hotel",
  "Auto / Detailing",
  "Photography",
  "Local Brand",
  "Clothing Brand",
  "Cookie Business",
  "Home Bakery",
  "Jewelry",
  "Candle Brand",
  "Beauty Brand",
  "Skincare",
  "Sneaker / Streetwear",
  "Gift Business",
  "Handmade Accessories",
  "Flower Business",
  "Perfume Brand",
] as const;

export type Lexicon = {
  lead: string;
  leads: string;
  customer: string;
  customers: string;
  purchase: string;
  purchases: string;
};

const BASE: Lexicon = {
  lead: "Lead",
  leads: "Leads",
  customer: "Customer",
  customers: "Customers",
  purchase: "Purchase",
  purchases: "Purchases",
};

const MAP: Record<string, Partial<Lexicon>> = {
  Restaurant: { purchase: "Order", purchases: "Orders", lead: "Reservation", leads: "Reservations" },
  "Salon / Barber": {
    lead: "Booking",
    leads: "Bookings",
    purchase: "Appointment",
    purchases: "Appointments",
  },
  "Gym / Fitness": { customer: "Member", customers: "Members" },
  Dental: {
    lead: "Consultation",
    leads: "Consultations",
    purchase: "Appointment",
    purchases: "Appointments",
  },
  "Real Estate": { purchase: "Site visit", purchases: "Site visits" },
  Hotel: { purchase: "Booking", purchases: "Bookings", customer: "Guest", customers: "Guests" },
  "Clothing Brand": { purchase: "Order", purchases: "Orders" },
  "Home Bakery": { purchase: "Order", purchases: "Orders" },
  "Cookie Business": { purchase: "Order", purchases: "Orders" },
  Jewelry: { purchase: "Order", purchases: "Orders" },
  "Flower Business": { purchase: "Order", purchases: "Orders" },
  "Gift Business": { purchase: "Order", purchases: "Orders" },
  Photography: { purchase: "Shoot", purchases: "Shoots" },
};

export function lexicon(niche?: string | null): Lexicon {
  return { ...BASE, ...(niche ? (MAP[niche] ?? {}) : {}) };
}

export const CHANNELS = [
  "instagram",
  "google",
  "facebook",
  "whatsapp",
  "referral",
  "organic",
  "offline",
  "other",
] as const;

export const LEAD_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

export const EXPENSE_CATEGORIES = [
  "marketing",
  "operations",
  "materials",
  "staff",
  "software",
  "rent",
  "delivery",
  "other",
] as const;

export const BUSINESS_GOALS = [
  "Get more customers",
  "Generate more leads",
  "Increase conversions",
  "Increase repeat purchases",
  "Increase average order value",
  "Improve online presence",
  "Improve customer management",
  "Improve profitability",
  "Improve brand positioning",
] as const;

export const ONBOARDING_STAGES = [
  "not_started",
  "onboarding",
  "audit",
  "system_setup",
  "optimization",
  "completed",
] as const;

export function stageLabel(stage: string) {
  return stage
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
