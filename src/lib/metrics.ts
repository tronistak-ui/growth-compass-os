/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Row } from "./growth";

export function money(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value || 0);
  } catch {
    return `${currency} ${Math.round(value || 0).toLocaleString()}`;
  }
}

export function pct(value: number, digits = 1) {
  if (!isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export const monthKey = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const currentMonthKey = () => monthKey(new Date());

export function previousMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

export function sum(rows: Row[], field = "amount") {
  return rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);
}

export type Metrics = ReturnType<typeof computeMetrics>;

export function computeMetrics(data: {
  leads: Row[];
  customers: Row[];
  revenue: Row[];
  expenses: Row[];
  campaigns: Row[];
  offers: Row[];
}) {
  const { leads, customers, revenue, expenses } = data;
  const thisMonth = currentMonthKey();
  const lastMonth = previousMonthKey();

  const revThis = revenue.filter((r) => monthKey(r["occurred_on"]) === thisMonth);
  const revLast = revenue.filter((r) => monthKey(r["occurred_on"]) === lastMonth);
  const expThis = expenses.filter((r) => monthKey(r["occurred_on"]) === thisMonth);
  const expLast = expenses.filter((r) => monthKey(r["occurred_on"]) === lastMonth);

  const revenueThisMonth = sum(revThis);
  const revenueLastMonth = sum(revLast);
  const expensesThisMonth = sum(expThis);
  const expensesLastMonth = sum(expLast);
  const totalRevenue = sum(revenue);
  const totalExpenses = sum(expenses);

  const profit = revenueThisMonth - expensesThisMonth;
  const margin = revenueThisMonth > 0 ? (profit / revenueThisMonth) * 100 : 0;

  const wonLeads = leads.filter((l) => l["status"] === "won");
  const qualified = leads.filter((l) =>
    ["qualified", "proposal", "won"].includes(String(l["status"])),
  );
  const lostLeads = leads.filter((l) => l["status"] === "lost");
  const conversionRate = leads.length ? (wonLeads.length / leads.length) * 100 : 0;
  const qualifiedRate = leads.length ? (qualified.length / leads.length) * 100 : 0;

  const purchasesByCustomer = new Map<string, number>();
  for (const t of revenue) {
    const cid = t["customer_id"];
    if (!cid) continue;
    purchasesByCustomer.set(cid, (purchasesByCustomer.get(cid) ?? 0) + 1);
  }
  const repeatCustomers = [...purchasesByCustomer.values()].filter((n) => n > 1).length;
  const repeatRate = customers.length ? (repeatCustomers / customers.length) * 100 : 0;
  const aov = revenue.length ? totalRevenue / revenue.length : 0;

  const newCustomersThisMonth = customers.filter(
    (c) => monthKey(c["customer_since"] ?? c["created_at"]) === thisMonth,
  ).length;

  const today = new Date().toISOString().slice(0, 10);
  const followUpsDue = leads.filter(
    (l) => l["next_follow_up"] && String(l["next_follow_up"]) <= today && l["status"] !== "won",
  ).length;
  const uncontacted = leads.filter((l) => l["status"] === "new" && !l["last_contact"]).length;

  const revenueGrowth = revenueLastMonth
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : revenueThisMonth > 0
      ? 100
      : 0;

  const bySource = groupSum(revenue, "source");
  const byProduct = groupSum(revenue, "product_service");
  const leadsBySource = groupCount(leads, "source");
  const expensesByCategory = groupSum(expenses, "category");

  return {
    totalLeads: leads.length,
    qualifiedLeads: qualified.length,
    wonLeads: wonLeads.length,
    lostLeads: lostLeads.length,
    totalCustomers: customers.length,
    newCustomersThisMonth,
    repeatCustomers,
    repeatRate,
    conversionRate,
    qualifiedRate,
    aov,
    revenueThisMonth,
    revenueLastMonth,
    revenueGrowth,
    expensesThisMonth,
    expensesLastMonth,
    totalRevenue,
    totalExpenses,
    profit,
    margin,
    followUpsDue,
    uncontacted,
    bySource,
    byProduct,
    leadsBySource,
    expensesByCategory,
  };
}

export function groupSum(rows: Row[], field: string, valueField = "amount") {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = String(r[field] ?? "Unspecified");
    map.set(key, (map.get(key) ?? 0) + Number(r[valueField] ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function groupCount(rows: Row[], field: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = String(r[field] ?? "Unspecified");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function monthlySeries(revenue: Row[], expenses: Row[], months = 6) {
  const out: { month: string; revenue: number; expenses: number; profit: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    const rev = sum(revenue.filter((r) => monthKey(r["occurred_on"]) === key));
    const exp = sum(expenses.filter((r) => monthKey(r["occurred_on"]) === key));
    out.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      revenue: rev,
      expenses: exp,
      profit: rev - exp,
    });
  }
  return out;
}

export type Insight = {
  title: string;
  detail: string;
  tone: "critical" | "warning" | "info" | "good";
  module: string;
};

/** Deterministic, rule-based insights computed from stored data only. */
export function buildInsights(m: Metrics, presenceScore: number): Insight[] {
  const out: Insight[] = [];

  if (m.uncontacted > 0)
    out.push({
      title: `${m.uncontacted} ${m.uncontacted === 1 ? "lead has" : "leads have"} not been contacted`,
      detail: "Uncontacted leads are the fastest available revenue. Work them before new spend.",
      tone: "critical",
      module: "Leads",
    });

  if (m.followUpsDue > 0)
    out.push({
      title: `${m.followUpsDue} follow-ups are due`,
      detail: "Follow-up dates have passed on open leads.",
      tone: "warning",
      module: "Leads",
    });

  if (m.totalLeads >= 5 && m.conversionRate < 20)
    out.push({
      title: `Conversion rate is ${m.conversionRate.toFixed(1)}%`,
      detail: "Leads exist but few convert — conversion appears to be a growth opportunity.",
      tone: "warning",
      module: "Conversion",
    });

  if (m.totalCustomers >= 3 && m.repeatRate < 25)
    out.push({
      title: `Repeat customer rate is ${m.repeatRate.toFixed(0)}%`,
      detail: "Repeat purchases may be an opportunity — existing customers are cheaper to sell to.",
      tone: "warning",
      module: "Revenue Growth",
    });

  if (m.expensesLastMonth > 0 && m.revenueLastMonth > 0) {
    const expGrowth = ((m.expensesThisMonth - m.expensesLastMonth) / m.expensesLastMonth) * 100;
    if (expGrowth > m.revenueGrowth + 5)
      out.push({
        title: "Expenses are growing faster than revenue",
        detail: `Expenses ${expGrowth.toFixed(0)}% vs revenue ${m.revenueGrowth.toFixed(0)}% month over month.`,
        tone: "critical",
        module: "Finance",
      });
  }

  if (m.leadsBySource.length > 0 && m.totalLeads >= 3) {
    const top = m.leadsBySource[0]!;
    out.push({
      title: `${cap(top.name)} generates the most leads`,
      detail: `${top.value} of ${m.totalLeads} leads came from ${top.name}.`,
      tone: "good",
      module: "Reach",
    });
  }

  if (m.bySource.length > 1) {
    const top = m.bySource[0]!;
    out.push({
      title: `${cap(top.name)} drives the most revenue`,
      detail: `${top.name} accounts for the largest share of recorded revenue.`,
      tone: "info",
      module: "Finance",
    });
  }

  if (presenceScore < 70)
    out.push({
      title: `Presence score is ${presenceScore}/100`,
      detail: "Your online presence has gaps that reduce discoverability and trust.",
      tone: "warning",
      module: "Presence",
    });

  if (m.totalRevenue === 0)
    out.push({
      title: "No revenue recorded yet",
      detail: "Add revenue transactions so profit, AOV and growth can be calculated.",
      tone: "info",
      module: "Finance",
    });

  return out;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function presenceScore(p: Row | null | undefined) {
  if (!p) return { total: 0, discoverability: 0, trust: 0, consistency: 0, conversion: 0 };
  const b = (v: any) => (v ? 1 : 0);

  const discoverParts = [
    b(p["website_url"]),
    b(p["google_profile_claimed"]),
    b(p["google_category"]),
    b(p["instagram_url"]),
    b(p["whatsapp_business"]),
  ];
  const trustParts = [
    Number(p["google_reviews"] ?? 0) >= 10 ? 1 : 0,
    Number(p["google_rating"] ?? 0) >= 4 ? 1 : 0,
    b(p["google_hours"]),
    b(p["google_address"]),
    b(p["instagram_bio"]),
  ];
  const consistencyParts = [
    b(p["consistent_name"]),
    b(p["consistent_phone"]),
    b(p["consistent_address"]),
    b(p["consistent_website"]),
    b(p["consistent_description"]),
  ];
  const conversionParts = [
    b(p["website_has_cta"]),
    b(p["website_has_contact"]),
    b(p["website_mobile_ready"]),
    b(p["instagram_has_cta"]),
    b(p["whatsapp_cta"]),
  ];

  const score = (arr: number[]) => Math.round((arr.reduce((a, c) => a + c, 0) / arr.length) * 100);
  const discoverability = score(discoverParts);
  const trust = score(trustParts);
  const consistency = score(consistencyParts);
  const conversion = score(conversionParts);
  return {
    discoverability,
    trust,
    consistency,
    conversion,
    total: Math.round((discoverability + trust + consistency + conversion) / 4),
  };
}

export function positioningScore(p: Row | null | undefined, competitors: number) {
  const fields = [
    "target_customer",
    "problem",
    "value_proposition",
    "differentiator",
    "brand_promise",
    "proof",
    "messaging",
  ];
  const filled = p ? fields.filter((f) => String(p[f] ?? "").trim().length > 12).length : 0;
  const base = (filled / fields.length) * 85;
  const compBonus = Math.min(competitors, 3) * 5;
  return Math.round(Math.min(100, base + compBonus));
}
