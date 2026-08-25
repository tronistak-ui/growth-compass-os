import { useActiveOrg, useRows, useSingletonRow } from "./growth";
import { computeMetrics, presenceScore, buildInsights } from "./metrics";
import { insightBenchmarks } from "./niches";

/** Aggregated, connected view of one business used by the dashboard and reports. */
export function useOrgData() {
  const { org, orgId, isLoading: orgLoading } = useActiveOrg();

  const leads = useRows("leads", orgId, { order: { column: "created_at" } });
  const customers = useRows("customers", orgId, { order: { column: "created_at" } });
  const revenue = useRows("revenue_transactions", orgId, { order: { column: "occurred_on" } });
  const expenses = useRows("expenses", orgId, { order: { column: "occurred_on" } });
  const campaigns = useRows("campaigns", orgId, { order: { column: "created_at" } });
  const offers = useRows("offers", orgId, { order: { column: "created_at" } });
  const tasks = useRows("tasks", orgId, { order: { column: "created_at" } });
  const presence = useSingletonRow("presence_profiles", orgId);

  const benchmarks = insightBenchmarks(org?.["niche"] as string | undefined);
  const metrics = computeMetrics(
    {
      leads: leads.data ?? [],
      customers: customers.data ?? [],
      revenue: revenue.data ?? [],
      expenses: expenses.data ?? [],
      campaigns: campaigns.data ?? [],
      offers: offers.data ?? [],
    },
    benchmarks.typicalRepeatGapDays,
  );

  const presence_score = presenceScore(presence.data);
  const currency = (org?.["currency"] as string) ?? "USD";
  const insights = buildInsights(metrics, presence_score.total, currency, benchmarks);

  const isLoading =
    orgLoading || leads.isLoading || customers.isLoading || revenue.isLoading || expenses.isLoading;

  const isError =
    leads.isError ||
    customers.isError ||
    revenue.isError ||
    expenses.isError ||
    campaigns.isError ||
    offers.isError ||
    tasks.isError;

  return {
    org,
    orgId,
    currency,
    leads: leads.data ?? [],
    customers: customers.data ?? [],
    revenue: revenue.data ?? [],
    expenses: expenses.data ?? [],
    campaigns: campaigns.data ?? [],
    offers: offers.data ?? [],
    tasks: tasks.data ?? [],
    presence: presence.data,
    presenceScore: presence_score,
    metrics,
    insights,
    isLoading,
    isError,
  };
}
