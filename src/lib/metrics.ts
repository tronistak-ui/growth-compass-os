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

  // --- CAC / LTV (Wave 1: cost visibility) ---
  const marketingSpendThisMonth = sum(
    expThis.filter((e) => e["category"] === "marketing"),
  );
  const cac = newCustomersThisMonth > 0 ? marketingSpendThisMonth / newCustomersThisMonth : 0;

  const purchaseStats = purchaseStatsByCustomer(revenue);
  // LTV needs enough repeat behavior to be meaningful — with fewer than 3
  // customers who've bought more than once, it's just AOV wearing a new name.
  const ltv =
    repeatCustomers >= 3
      ? [...purchaseStats.values()].reduce((a, s) => a + s.total, 0) / purchaseStats.size
      : 0;

  const channelPerformance = channelBreakdown(data);
  const crossSellOpportunities = crossSellPairs(revenue, customers);
  const rebookingCandidates = findRebookingCandidates(purchaseStats, customers);
  const customerSegments = segmentCustomers(purchaseStats, customers);

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
    cac,
    ltv,
    channelPerformance,
    crossSellOpportunities,
    rebookingCandidates,
    customerSegments,
  };
}

export type CrossSellOpportunity = {
  productA: string;
  productB: string;
  boughtBoth: number;
  /**
   * The pitch list, in both directions: someone who has A gets pitched B,
   * and someone who has B gets pitched A. A one-directional list would miss
   * half the actual opportunity.
   */
  targets: { customerId: string; customerName: string; has: string; pitch: string }[];
};

/**
 * "Customers who bought A also bought B" — computed from co-occurring
 * products in the same customer's purchase history. Each pair also carries
 * the customers who only have one of the two: the direct cross-sell/upsell
 * pitch list, not just a statistic.
 */
function crossSellPairs(revenue: Row[], customers: Row[]): CrossSellOpportunity[] {
  const nameById = new Map(customers.map((c) => [c["id"], String(c["name"] ?? "Customer")]));
  const productsByCustomer = new Map<string, Set<string>>();
  for (const t of revenue) {
    const cid = t["customer_id"];
    const product = t["product_service"];
    if (!cid || !product) continue;
    if (!productsByCustomer.has(cid)) productsByCustomer.set(cid, new Set());
    productsByCustomer.get(cid)!.add(String(product));
  }

  // Nested by product pair rather than a joined string key — product names
  // are free text and can contain any delimiter we'd pick (seen firsthand:
  // "Follow-up Call" broke a space-joined key).
  const pairCounts = new Map<string, Map<string, number>>();
  for (const products of productsByCustomer.values()) {
    const list = [...products].sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [list[i]!, list[j]!];
        if (!pairCounts.has(a)) pairCounts.set(a, new Map());
        const forA = pairCounts.get(a)!;
        forA.set(b, (forA.get(b) ?? 0) + 1);
      }
    }
  }

  const pairs: CrossSellOpportunity[] = [];
  for (const [productA, forA] of pairCounts) {
    for (const [productB, boughtBoth] of forA) {
      const targets: CrossSellOpportunity["targets"] = [];
      for (const [customerId, products] of productsByCustomer) {
        const customerName = nameById.get(customerId) ?? "Customer";
        const hasA = products.has(productA);
        const hasB = products.has(productB);
        if (hasA && !hasB) targets.push({ customerId, customerName, has: productA, pitch: productB });
        else if (hasB && !hasA) targets.push({ customerId, customerName, has: productB, pitch: productA });
      }
      pairs.push({ productA, productB, boughtBoth, targets });
    }
  }

  return pairs
    .sort((a, b) => b.boughtBoth - a.boughtBoth)
    .slice(0, 8);
}

export type RebookingCandidate = {
  customerId: string;
  customerName: string;
  lastPurchase: string;
  daysSinceLastPurchase: number;
  typicalGapDays: number | null;
  reason: string;
};

type PurchaseStats = { total: number; count: number; dates: string[] };

/** Per-customer total spend, purchase count and every purchase date. */
function purchaseStatsByCustomer(revenue: Row[]): Map<string, PurchaseStats> {
  const map = new Map<string, PurchaseStats>();
  for (const t of revenue) {
    const cid = t["customer_id"];
    if (!cid) continue;
    if (!map.has(cid)) map.set(cid, { total: 0, count: 0, dates: [] });
    const s = map.get(cid)!;
    s.total += Number(t["amount"] ?? 0);
    s.count += 1;
    if (t["occurred_on"]) s.dates.push(String(t["occurred_on"]));
  }
  return map;
}

const DAY_MS = 86_400_000;

/**
 * Days since the most recent purchase, and the customer's own typical gap
 * between purchases (null with fewer than 2 purchases) — the shared basis
 * for both rebooking candidates and customer segmentation, so "overdue"
 * means the same thing in both places.
 */
function purchaseRhythm(stats: PurchaseStats | undefined, now = Date.now()) {
  const dates = (stats?.dates ?? []).slice().sort();
  if (dates.length === 0) return { daysSinceLast: null, typicalGapDays: null, lastDate: null };
  const lastDate = dates[dates.length - 1]!;
  const daysSinceLast = Math.round((now - new Date(lastDate).getTime()) / DAY_MS);
  let typicalGapDays: number | null = null;
  if (dates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((new Date(dates[i]!).getTime() - new Date(dates[i - 1]!).getTime()) / DAY_MS);
    }
    typicalGapDays = Math.round(gaps.reduce((a, v) => a + v, 0) / gaps.length);
  }
  return { daysSinceLast, typicalGapDays, lastDate };
}

/**
 * Customers who are overdue for a repeat purchase — either past their own
 * historical buying rhythm (>=2 purchases), or a single-purchase customer
 * who has gone quiet for 45+ days. The output is a pitch list, not a count.
 */
function findRebookingCandidates(
  purchaseStats: Map<string, PurchaseStats>,
  customers: Row[],
): RebookingCandidate[] {
  const out: RebookingCandidate[] = [];

  for (const c of customers) {
    const { daysSinceLast, typicalGapDays, lastDate } = purchaseRhythm(purchaseStats.get(c["id"]));
    if (daysSinceLast === null) continue;

    const threshold = typicalGapDays !== null ? Math.max(typicalGapDays * 1.5, 14) : 45;
    if (daysSinceLast < threshold) continue;

    out.push({
      customerId: c["id"],
      customerName: String(c["name"] ?? "Customer"),
      lastPurchase: lastDate!,
      daysSinceLastPurchase: daysSinceLast,
      typicalGapDays,
      reason:
        typicalGapDays !== null
          ? `Usually buys every ~${typicalGapDays} days — it's been ${daysSinceLast}`
          : `First purchase was ${daysSinceLast} days ago with no repeat since`,
    });
  }

  return out.sort((a, b) => b.daysSinceLastPurchase - a.daysSinceLastPurchase);
}

export type CustomerSegment = "VIP" | "New" | "Active" | "At Risk" | "Lost";

/**
 * New / Active / At Risk / Lost / VIP, computed from recency (relative to
 * the customer's own buying rhythm) and spend rank — not stored, always
 * reflects live purchase history.
 */
function segmentCustomers(
  purchaseStats: Map<string, PurchaseStats>,
  customers: Row[],
): Map<string, CustomerSegment> {
  const totals = [...purchaseStats.values()].map((s) => s.total).sort((a, b) => a - b);
  // Top-20th-percentile spend, among customers who've actually bought something.
  const vipThreshold = totals.length ? totals[Math.floor(totals.length * 0.8)]! : Infinity;

  const out = new Map<string, CustomerSegment>();
  for (const c of customers) {
    const stats = purchaseStats.get(c["id"]);
    const { daysSinceLast, typicalGapDays } = purchaseRhythm(stats);

    if (daysSinceLast === null) {
      out.set(c["id"], "New");
      continue;
    }

    const lostAt = typicalGapDays !== null ? typicalGapDays * 3 : 120;
    const atRiskAt = typicalGapDays !== null ? typicalGapDays * 1.5 : 45;

    if (daysSinceLast > lostAt) out.set(c["id"], "Lost");
    else if (daysSinceLast > atRiskAt) out.set(c["id"], "At Risk");
    else if (stats!.count >= 3 && stats!.total >= vipThreshold && vipThreshold > 0)
      out.set(c["id"], "VIP");
    else out.set(c["id"], "Active");
  }
  return out;
}

export type ChannelPerformance = {
  channel: string;
  leads: number;
  customers: number;
  revenue: number;
  spend: number;
  cac: number;
};

/**
 * Per-channel Source → Leads → Customers → Revenue, plus marketing spend
 * (via expenses.campaign_id → campaigns.channel) and the resulting CAC.
 * A channel only gets a CAC figure once it has both spend and customers —
 * otherwise the number is meaningless, not just small.
 */
function channelBreakdown(data: {
  leads: Row[];
  customers: Row[];
  revenue: Row[];
  expenses: Row[];
  campaigns: Row[];
}): ChannelPerformance[] {
  const { leads, customers, revenue, expenses, campaigns } = data;
  const channelByCampaign = new Map(campaigns.map((c) => [c["id"], c["channel"]]));

  const channels = new Set<string>();
  for (const l of leads) if (l["source"]) channels.add(String(l["source"]));
  for (const c of customers) if (c["source"]) channels.add(String(c["source"]));

  const spendByChannel = new Map<string, number>();
  for (const e of expenses) {
    const channel = channelByCampaign.get(e["campaign_id"]);
    if (!channel) continue;
    spendByChannel.set(channel, (spendByChannel.get(channel) ?? 0) + Number(e["amount"] ?? 0));
    channels.add(channel);
  }

  return [...channels]
    .map((channel) => {
      const channelLeads = leads.filter((l) => l["source"] === channel);
      const channelCustomers = customers.filter((c) => c["source"] === channel);
      const channelRevenue = sum(
        revenue.filter((r) => channelCustomers.some((c) => c["id"] === r["customer_id"])),
      );
      const spend = spendByChannel.get(channel) ?? 0;
      const cac = spend > 0 && channelCustomers.length > 0 ? spend / channelCustomers.length : 0;
      return {
        channel,
        leads: channelLeads.length,
        customers: channelCustomers.length,
        revenue: channelRevenue,
        spend,
        cac,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
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
  key: string;
  title: string;
  detail: string;
  tone: "critical" | "warning" | "info" | "good";
  module: string;
  /** Which of the growth levers this insight maps to. */
  lever: string;
  current: string;
  target: string;
  /** 0-100 deterministic priority score. */
  impact: number;
  action: string;
};

/**
 * Deterministic, rule-based insights computed from stored data only.
 * No AI, no randomness — the same inputs always produce the same output,
 * which is what makes these safe to persist as growth opportunities.
 */
export function buildInsights(m: Metrics, presence: number, currency = "USD"): Insight[] {
  const out: Insight[] = [];

  if (m.uncontacted > 0)
    out.push({
      key: "uncontacted_leads",
      title: `${m.uncontacted} ${m.uncontacted === 1 ? "lead has" : "leads have"} not been contacted`,
      detail: "Uncontacted leads are the fastest available revenue. Work them before new spend.",
      tone: "critical",
      module: "Leads",
      lever: "more_customers",
      current: `${m.uncontacted} uncontacted`,
      target: "0 uncontacted",
      impact: Math.min(100, 60 + m.uncontacted * 4),
      action: "Contact every new lead within 24 hours and log the outcome.",
    });

  if (m.followUpsDue > 0)
    out.push({
      key: "followups_due",
      title: `${m.followUpsDue} follow-ups are due`,
      detail: "Follow-up dates have passed on open leads.",
      tone: "warning",
      module: "Leads",
      lever: "more_customers",
      current: `${m.followUpsDue} overdue`,
      target: "0 overdue",
      impact: Math.min(95, 50 + m.followUpsDue * 4),
      action: "Clear the overdue follow-up list today and set the next date on each lead.",
    });

  if (m.totalLeads >= 5 && m.conversionRate < 20)
    out.push({
      key: "low_conversion",
      title: `Conversion rate is ${m.conversionRate.toFixed(1)}%`,
      detail: "Leads exist but few convert — conversion is the constraint, not traffic.",
      tone: "warning",
      module: "Conversion",
      lever: "more_customers",
      current: pct(m.conversionRate),
      target: "20%+",
      impact: 80,
      action: "Tighten the offer and response time before spending more on reach.",
    });

  if (m.totalCustomers >= 3 && m.repeatRate < 25)
    out.push({
      key: "low_repeat_rate",
      title: `Repeat customer rate is ${m.repeatRate.toFixed(0)}%`,
      detail: "Existing customers are the cheapest revenue available.",
      tone: "warning",
      module: "Revenue Growth",
      lever: "more_often",
      current: pct(m.repeatRate, 0),
      target: "25%+",
      impact: 70,
      action: "Run a win-back message to every customer who has bought only once.",
    });

  if (m.expensesLastMonth > 0 && m.revenueLastMonth > 0) {
    const expGrowth = ((m.expensesThisMonth - m.expensesLastMonth) / m.expensesLastMonth) * 100;
    if (expGrowth > m.revenueGrowth + 5)
      out.push({
        key: "expenses_outpacing_revenue",
        title: "Expenses are growing faster than revenue",
        detail: `Expenses ${expGrowth.toFixed(0)}% vs revenue ${m.revenueGrowth.toFixed(0)}% month over month.`,
        tone: "critical",
        module: "Finance",
        lever: "better_margin",
        current: `${expGrowth.toFixed(0)}% expense growth`,
        target: `below ${m.revenueGrowth.toFixed(0)}%`,
        impact: 90,
        action: "Review the largest expense category and cut or renegotiate it this month.",
      });
  }

  if (m.margin < 20 && m.revenueThisMonth > 0)
    out.push({
      key: "thin_margin",
      title: `Profit margin is ${m.margin.toFixed(0)}%`,
      detail: "Margin is thin, so extra revenue converts into very little profit.",
      tone: "warning",
      module: "Finance",
      lever: "better_margin",
      current: pct(m.margin),
      target: "20%+",
      impact: 75,
      action: "Raise price on the top-selling item or reduce the largest cost line.",
    });

  if (m.cac > 0 && m.ltv > 0 && m.cac > m.ltv)
    out.push({
      key: "cac_exceeds_ltv",
      title: `Acquisition costs more than customers are worth`,
      detail: `CAC is ${money(m.cac, currency)} against an LTV of ${money(m.ltv, currency)} — every new customer this month is a net loss before they buy again.`,
      tone: "critical",
      module: "Finance",
      lever: "better_margin",
      current: `CAC ${money(m.cac, currency)}`,
      target: `below LTV (${money(m.ltv, currency)})`,
      impact: 92,
      action: "Pause the highest-CAC channel and shift spend toward the cheapest one until CAC drops under LTV.",
    });

  if (m.lostLeads >= 3)
    out.push({
      key: "lost_lead_recovery",
      title: `${m.lostLeads} lost leads can be re-opened`,
      detail: "Lost leads already know you — a single follow-up sequence often recovers some.",
      tone: "info",
      module: "Revenue Growth",
      lever: "lost_lead_recovery",
      current: `${m.lostLeads} lost`,
      target: "10% recovered",
      impact: 55,
      action: "Send one recovery offer to every lead marked lost in the last 90 days.",
    });

  if (m.leadsBySource.length > 0 && m.totalLeads >= 3) {
    const top = m.leadsBySource[0]!;
    out.push({
      key: "best_lead_source",
      title: `${cap(top.name)} generates the most leads`,
      detail: `${top.value} of ${m.totalLeads} leads came from ${top.name}.`,
      tone: "good",
      module: "Reach",
      lever: "more_customers",
      current: `${top.value} leads from ${top.name}`,
      target: "double down",
      impact: 45,
      action: `Put the next unit of time or budget into ${top.name}.`,
    });
  }

  if (m.bySource.length > 1) {
    const top = m.bySource[0]!;
    out.push({
      key: "best_revenue_source",
      title: `${cap(top.name)} drives the most revenue`,
      detail: `${top.name} accounts for the largest share of recorded revenue.`,
      tone: "info",
      module: "Finance",
      lever: "higher_value",
      current: top.name,
      target: "protect and scale",
      impact: 40,
      action: `Make sure ${top.name} has an active offer running at all times.`,
    });
  }

  if (presence < 70)
    out.push({
      key: "presence_gap",
      title: `Presence score is ${presence}/100`,
      detail: "Your online presence has gaps that reduce discoverability and trust.",
      tone: "warning",
      module: "Presence",
      lever: "more_customers",
      current: `${presence}/100`,
      target: "70+",
      impact: 65,
      action: "Fix the lowest presence pillar first — usually Google profile completeness.",
    });

  if (m.totalRevenue === 0)
    out.push({
      key: "no_revenue",
      title: "No revenue recorded yet",
      detail: "Add revenue transactions so profit, AOV and growth can be calculated.",
      tone: "info",
      module: "Finance",
      lever: "higher_value",
      current: "0 transactions",
      target: "log every sale",
      impact: 85,
      action: "Record the last 30 days of sales in Finance.",
    });

  return out.sort((a, b) => b.impact - a.impact);
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

export function priorityLabel(impact: number): "High" | "Medium" | "Low" {
  if (impact >= 80) return "High";
  if (impact >= 50) return "Medium";
  return "Low";
}

export type AdvisorAnswer = { answer: string; detail: string };

export type AdvisorSummary = {
  /** Where are my customers coming from? */
  sourcing: AdvisorAnswer;
  /** Where am I losing them? */
  leaking: AdvisorAnswer;
  /** How much money am I making? */
  revenue: AdvisorAnswer;
  /** What is preventing me from making more? */
  blocker: AdvisorAnswer;
  /** What should I do next? */
  nextAction: AdvisorAnswer;
  /** The single highest-impact insight — the worked example. */
  topOpportunity: Insight | null;
};

/**
 * Assembles the five standing questions plus the "biggest opportunity"
 * worked example entirely from metrics and insights already computed
 * elsewhere — no new data, no AI call. Deterministic and re-derivable from
 * a re-render, same as buildInsights.
 */
export function buildAdvisorSummary(m: Metrics, insights: Insight[], currency = "USD"): AdvisorSummary {
  const topChannel = m.channelPerformance.find((c) => c.leads > 0 || c.customers > 0) ?? null;
  const sourcing: AdvisorAnswer = topChannel
    ? {
        answer: `${cap(topChannel.channel)} is your top source`,
        detail: `${topChannel.customers} customer${topChannel.customers === 1 ? "" : "s"} and ${money(topChannel.revenue, currency)} in revenue came through ${topChannel.channel}${topChannel.leads ? `, from ${topChannel.leads} lead${topChannel.leads === 1 ? "" : "s"}` : ""}.`,
      }
    : {
        answer: "Not enough source data yet",
        detail: "Add a source when you create a lead or customer so this can be answered.",
      };

  let leaking: AdvisorAnswer;
  if (m.totalLeads === 0) {
    leaking = {
      answer: "You don't have leads recorded yet",
      detail: "Capture is the first leak to fix — add leads as they come in.",
    };
  } else if (m.qualifiedRate < 50) {
    leaking = {
      answer: "Most leads never get qualified",
      detail: `Only ${pct(m.qualifiedRate, 0)} of ${m.totalLeads} leads move past first contact — the drop-off is early, before the offer even comes up.`,
    };
  } else if (m.conversionRate < 20) {
    leaking = {
      answer: "Leads get qualified but few convert",
      detail: `${pct(m.qualifiedRate, 0)} get qualified, but only ${pct(m.conversionRate, 0)} of all leads become customers — the leak is at the close.`,
    };
  } else {
    leaking = {
      answer: "Your funnel is holding up well",
      detail: `${pct(m.conversionRate, 0)} of leads become customers — the constraint right now is volume, not leaks.`,
    };
  }

  const revenue: AdvisorAnswer =
    m.revenueThisMonth > 0
      ? {
          answer: `${money(m.profit, currency)} profit this month`,
          detail: `${pct(m.margin, 0)} margin on ${money(m.revenueThisMonth, currency)} revenue, ${money(m.expensesThisMonth, currency)} spent.`,
        }
      : {
          answer: "No revenue recorded yet this month",
          detail: "Log sales in Finance so profit and margin can be calculated.",
        };

  const topOpportunity = insights[0] ?? null;
  const blockerInsight = insights.find((i) => i.tone === "critical" || i.tone === "warning") ?? null;

  const blocker: AdvisorAnswer = blockerInsight
    ? { answer: blockerInsight.title, detail: blockerInsight.detail }
    : {
        answer: "Nothing critical is blocking growth right now",
        detail: "The biggest lever left is opportunity, not a fix — see below.",
      };

  const nextAction: AdvisorAnswer = topOpportunity
    ? { answer: topOpportunity.action, detail: `Moves: ${topOpportunity.module} — ${topOpportunity.current} → ${topOpportunity.target}` }
    : {
        answer: "Add leads, revenue and presence data",
        detail: "The advisor needs real numbers before it can recommend a next move.",
      };

  return { sourcing, leaking, revenue, blocker, nextAction, topOpportunity };
}

export type BrandStage = "Unknown" | "Recognized" | "Trusted" | "Preferred";

export type BrandProgression = {
  stage: BrandStage;
  score: number;
  breakdown: { presence: number; positioning: number; socialProof: number };
  priority: string;
};

const BRAND_STAGE_PRIORITY: Record<BrandStage, string> = {
  Unknown:
    "Get discoverable first — claim your Google Business Profile and put up a website or landing page.",
  Recognized:
    "Build trust — collect your first 10 reviews and finish every field of your positioning statement.",
  Trusted:
    "Convert trust into preference — publish testimonials everywhere and keep the message identical across channels.",
  Preferred:
    "Protect the position — keep reviews fresh, watch competitor moves, and don't let consistency slip.",
};

/**
 * Unknown → Recognized → Trusted → Preferred, blended from presence score,
 * positioning score, and social proof (review count + rating — the only
 * proof signal currently captured). No new data required.
 */
export function brandProgression(
  presence: number,
  positioning: number,
  presenceProfile: Row | null | undefined,
): BrandProgression {
  const reviews = Number(presenceProfile?.["google_reviews"] ?? 0);
  const rating = Number(presenceProfile?.["google_rating"] ?? 0);
  const socialProof =
    reviews > 0 ? Math.round((Math.min(reviews, 20) / 20) * 60 + (rating / 5) * 40) : 0;

  const score = Math.round((presence + positioning + socialProof) / 3);
  const stage: BrandStage = score < 30 ? "Unknown" : score < 55 ? "Recognized" : score < 80 ? "Trusted" : "Preferred";

  return { stage, score, breakdown: { presence, positioning, socialProof }, priority: BRAND_STAGE_PRIORITY[stage] };
}
