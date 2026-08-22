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

export const STAGE_META: Record<
  (typeof ONBOARDING_STAGES)[number],
  { label: string; description: string }
> = {
  not_started: {
    label: "Not Started",
    description: "Business created but no information captured yet.",
  },
  onboarding: {
    label: "Onboarding",
    description: "Collecting business, offer and channel information.",
  },
  audit: {
    label: "Audit",
    description: "Reviewing presence, customers, offers and numbers to find gaps.",
  },
  system_setup: {
    label: "System Setup",
    description: "Installing the growth system: CRM, offers, campaigns and tracking.",
  },
  optimization: {
    label: "Optimization",
    description: "Improving conversion, repeat rate and margin from live data.",
  },
  completed: {
    label: "Completed",
    description: "The growth system is running and reviewed monthly.",
  },
};

export type NicheConfig = {
  lexicon: Lexicon;
  /** Channels that usually matter most for this category. */
  priorityChannels: string[];
  /** Category-appropriate expense buckets, shown first. */
  expenseCategories: string[];
  /** The single metric this category should watch. */
  northStar: string;
  /** Words used for the thing being sold. */
  offerWord: string;
};

const NICHE_CONFIG: Record<string, Partial<Omit<NicheConfig, "lexicon">>> = {
  Restaurant: {
    priorityChannels: ["google", "instagram", "whatsapp", "offline"],
    expenseCategories: ["materials", "staff", "marketing", "rent", "delivery"],
    northStar: "Orders per week",
    offerWord: "Menu item",
  },
  "Salon / Barber": {
    priorityChannels: ["instagram", "google", "whatsapp", "referral"],
    expenseCategories: ["materials", "staff", "marketing", "rent"],
    northStar: "Repeat appointment rate",
    offerWord: "Service",
  },
  "Gym / Fitness": {
    priorityChannels: ["instagram", "google", "referral", "offline"],
    expenseCategories: ["staff", "rent", "marketing", "software"],
    northStar: "Active members",
    offerWord: "Membership",
  },
  Dental: {
    priorityChannels: ["google", "referral", "facebook", "whatsapp"],
    expenseCategories: ["materials", "staff", "marketing", "rent"],
    northStar: "Consultations booked",
    offerWord: "Treatment",
  },
  "Real Estate": {
    priorityChannels: ["google", "facebook", "referral", "whatsapp"],
    expenseCategories: ["marketing", "staff", "software", "operations"],
    northStar: "Qualified site visits",
    offerWord: "Listing",
  },
  Hotel: {
    priorityChannels: ["google", "instagram", "facebook", "other"],
    expenseCategories: ["staff", "operations", "marketing", "rent"],
    northStar: "Direct bookings",
    offerWord: "Room / package",
  },
  Photography: {
    priorityChannels: ["instagram", "referral", "google", "whatsapp"],
    expenseCategories: ["materials", "marketing", "software", "operations"],
    northStar: "Shoots booked",
    offerWord: "Package",
  },
  "Home / Local Services": {
    priorityChannels: ["google", "referral", "whatsapp", "offline"],
    expenseCategories: ["materials", "staff", "marketing", "delivery"],
    northStar: "Jobs completed",
    offerWord: "Service",
  },
};

const ECOM_LIKE = [
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
  "Local Brand",
];

for (const n of ECOM_LIKE) {
  NICHE_CONFIG[n] = {
    priorityChannels: ["instagram", "whatsapp", "google", "referral"],
    expenseCategories: ["materials", "marketing", "delivery", "software"],
    northStar: "Orders per month",
    offerWord: "Product",
  };
}

export function nicheConfig(niche?: string | null): NicheConfig {
  const base = (niche && NICHE_CONFIG[niche]) || {};
  return {
    lexicon: lexicon(niche),
    priorityChannels: base.priorityChannels ?? ["google", "instagram", "referral", "whatsapp"],
    expenseCategories: base.expenseCategories ?? [...EXPENSE_CATEGORIES],
    northStar: base.northStar ?? "New customers per month",
    offerWord: base.offerWord ?? "Offer",
  };
}
