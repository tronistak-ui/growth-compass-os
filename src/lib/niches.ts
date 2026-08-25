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

/**
 * Per-niche labels for the same six canonical stage keys above — the status
 * values written to leads.status never change, so computeMetrics keeps
 * working untouched. Only the words shown for each stage change, so a
 * dental pipeline reads "Consultation Booked" where a generic one reads
 * "Qualified", without a separate pipeline engine per niche.
 */
const LEAD_STAGE_LABELS: Record<string, Partial<Record<(typeof LEAD_STAGES)[number]["key"], string>>> = {
  Dental: {
    qualified: "Consultation Booked",
    proposal: "Treatment Proposed",
    won: "Treatment Accepted",
    lost: "Declined",
  },
  "Salon / Barber": {
    qualified: "Booking Requested",
    proposal: "Booked",
    won: "Visited",
    lost: "No-show / Lost",
  },
  "Gym / Fitness": {
    qualified: "Trial Booked",
    proposal: "Trial Attended",
    won: "Member",
    lost: "Didn't Join",
  },
  Restaurant: {
    new: "New Enquiry",
    qualified: "Reservation Requested",
    proposal: "Reservation Confirmed",
    won: "Dined",
    lost: "Cancelled",
  },
  Hotel: {
    qualified: "Availability Checked",
    proposal: "Quote Sent",
    won: "Booked",
    lost: "Booked Elsewhere",
  },
  "Real Estate": {
    qualified: "Site Visit Scheduled",
    proposal: "Negotiation",
    won: "Closed Won",
    lost: "Closed Lost",
  },
  Photography: {
    qualified: "Date Checked",
    proposal: "Quote Sent",
    won: "Booked",
    lost: "Booked Elsewhere",
  },
  "Home / Local Services": {
    qualified: "Site Assessed",
    proposal: "Quote Sent",
    won: "Job Won",
    lost: "Job Lost",
  },
};

const ECOM_LEAD_LABELS: Partial<Record<(typeof LEAD_STAGES)[number]["key"], string>> = {
  qualified: "Cart / Enquiry",
  proposal: "Order Placed",
  won: "Delivered",
  lost: "Abandoned",
};

/** Niche-appropriate labels for the same six canonical lead stages. */
export function leadStages(niche?: string | null): { key: string; label: string }[] {
  const overrides =
    (niche && LEAD_STAGE_LABELS[niche]) || (niche && ECOM_LIKE.includes(niche) ? ECOM_LEAD_LABELS : {});
  return LEAD_STAGES.map((s) => ({ key: s.key, label: overrides[s.key] ?? s.label }));
}

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

export type InsightBenchmarks = {
  /** Won ÷ total leads, below which "low conversion" fires. */
  conversionRateTarget: number;
  /** % of customers with 2+ purchases, below which "low repeat rate" fires. */
  repeatRateTarget: number;
  /** Profit margin %, below which "thin margin" fires. */
  marginTarget: number;
  /**
   * Fallback expected days between purchases, used only for a customer with
   * fewer than 2 purchases (no personal rhythm to measure yet) — drives when
   * they're flagged "At Risk"/"Lost" and when they show up as a rebooking
   * candidate. Once a customer has bought twice, their own gap replaces this.
   */
  typicalRepeatGapDays: number;
};

const DEFAULT_BENCHMARKS: InsightBenchmarks = {
  conversionRateTarget: 20,
  repeatRateTarget: 25,
  marginTarget: 20,
  typicalRepeatGapDays: 45,
};

/**
 * Same flat 20%/25%/20% bar for every business was the biggest honest
 * weakness in the insight engine — a dental practice and a jewelry brand
 * don't convert, retain or margin the same way. These aren't scientific
 * benchmarks, just defensible category norms (a restaurant runs thin
 * margins by nature; a photography studio's is mostly labor, so it should
 * run high) — good enough to stop flagging a healthy business as broken.
 */
const INSIGHT_BENCHMARKS: Record<string, Partial<InsightBenchmarks>> = {
  Restaurant: { conversionRateTarget: 40, repeatRateTarget: 35, marginTarget: 15, typicalRepeatGapDays: 30 },
  "Salon / Barber": {
    conversionRateTarget: 35,
    repeatRateTarget: 45,
    marginTarget: 25,
    typicalRepeatGapDays: 35,
  },
  "Gym / Fitness": {
    conversionRateTarget: 15,
    repeatRateTarget: 50,
    marginTarget: 20,
    typicalRepeatGapDays: 30,
  },
  Dental: { conversionRateTarget: 30, repeatRateTarget: 20, marginTarget: 30, typicalRepeatGapDays: 180 },
  "Real Estate": {
    conversionRateTarget: 10,
    repeatRateTarget: 5,
    marginTarget: 30,
    typicalRepeatGapDays: 730,
  },
  Hotel: { conversionRateTarget: 35, repeatRateTarget: 20, marginTarget: 15, typicalRepeatGapDays: 180 },
  Photography: {
    conversionRateTarget: 25,
    repeatRateTarget: 10,
    marginTarget: 35,
    typicalRepeatGapDays: 365,
  },
  "Home / Local Services": {
    conversionRateTarget: 25,
    repeatRateTarget: 20,
    marginTarget: 20,
    typicalRepeatGapDays: 120,
  },
};

for (const n of ECOM_LIKE) {
  INSIGHT_BENCHMARKS[n] = {
    conversionRateTarget: 15,
    repeatRateTarget: 30,
    marginTarget: 20,
    typicalRepeatGapDays: 45,
  };
}

export function insightBenchmarks(niche?: string | null): InsightBenchmarks {
  const base = (niche && INSIGHT_BENCHMARKS[niche]) || {};
  return { ...DEFAULT_BENCHMARKS, ...base };
}
