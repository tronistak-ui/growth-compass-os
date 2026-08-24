import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { Panel, ScoreDial, Meter } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrg, useSingletonRow, useUpsertSingleton, useRows } from "@/lib/growth";
import { positioningScore, presenceScore, brandProgression, type BrandStage } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/positioning")({
  head: () => ({
    meta: [
      { title: "Positioning — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Say clearly who you are for, what you promise and why you are the better choice.",
      },
      { property: "og:title", content: "Positioning — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "Sharpen your value proposition and track competitors in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PositioningPage,
});

const FIELDS: [string, string, string][] = [
  ["target_customer", "Who it is for", "Busy families within 5km who want a quick weekday meal"],
  ["problem", "Problem you solve", "Good food takes too long on a work night"],
  ["value_proposition", "Value proposition", "Hot, home-style dinners delivered in 20 minutes"],
  ["differentiator", "Why you, not them", "Only kitchen in the area cooking to order after 9pm"],
  ["brand_promise", "Brand promise", "Fresh every time, or the next one is on us"],
  ["proof", "Proof", "480 Google reviews at 4.8 stars"],
  ["messaging", "Core message", "One line you repeat everywhere"],
];

function PositioningPage() {
  const { orgId } = useActiveOrg();
  const { data: row } = useSingletonRow("positioning", orgId);
  const { data: presence } = useSingletonRow("presence_profiles", orgId);
  const { data: competitors } = useRows("competitors", orgId, { order: { column: "created_at" } });
  const upsert = useUpsertSingleton("positioning", orgId);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (row) setForm({ ...row });
  }, [row]);

  function save() {
    const payload: Record<string, any> = {};
    for (const [key] of FIELDS) payload[key] = form[key] ?? null;
    upsert.mutate(payload, {
      onSuccess: () => toast.success("Positioning saved"),
      onError: (e: any) => toast.error(e.message ?? "Could not save"),
    });
  }

  const compCount = (competitors ?? []).length;
  const score = positioningScore(form, compCount);
  const filledFields = FIELDS.filter(
    ([k]) => String(form[k] ?? "").trim().length > 12,
  ).length;
  const clarity = Math.round((filledFields / FIELDS.length) * 85);
  const compDepth = Math.round((Math.min(compCount, 3) / 3) * 100);
  const brand = brandProgression(presenceScore(presence).total, score, presence);

  return (
    <AppShell
      title="Positioning"
      subtitle="If you sound like everyone else, price becomes the only argument"
      actions={
        <Button size="sm" onClick={save} disabled={upsert.isPending}>
          {upsert.isPending ? "Saving…" : "Save positioning"}
        </Button>
      }
    >
      <Panel
        title="Positioning score"
        description="How clear and differentiated your position is today"
        className="mb-4"
      >
        <div className="flex flex-wrap items-center gap-8">
          <ScoreDial score={score} label="Positioning score" />
          <div className="grid min-w-[240px] flex-1 gap-2.5">
            <Meter label={`Clarity — ${filledFields}/${FIELDS.length} fields filled`} value={clarity} />
            <Meter label="Competitor research" value={compDepth} />
          </div>
        </div>
      </Panel>

      <Panel
        title="Brand progression"
        description="Unknown → Recognized → Trusted → Preferred, blended from presence, positioning and reviews"
        className="mb-4"
      >
        <BrandStageTracker stage={brand.stage} />
        <p className="mt-3 text-sm text-muted-foreground">{brand.priority}</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Meter label="Presence" value={brand.breakdown.presence} />
          <Meter label="Positioning" value={brand.breakdown.positioning} />
          <Meter label="Social proof" value={brand.breakdown.socialProof} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Your position" description="Keep every answer to one sentence">
          <div className="space-y-3">
            {FIELDS.map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Textarea
                  rows={2}
                  placeholder={placeholder}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </Panel>

        <CrudPanel
          table="competitors"
          orgId={orgId}
          title="Competitors"
          description="What they do well, and the gap you can own"
          emptyTitle="No competitors added"
          emptyDescription="Add the two or three businesses your customers compare you against."
          queryOpts={{ order: { column: "created_at" } }}
          fields={[
            { name: "name", label: "Competitor", required: true },
            { name: "website", label: "Website" },
            { name: "positioning", label: "Their positioning", inTable: false, type: "textarea" },
            { name: "strengths", label: "Strengths", type: "textarea", inTable: false },
            { name: "weaknesses", label: "Weaknesses", type: "textarea", inTable: false },
            { name: "opportunity", label: "Your opening", type: "textarea" },
          ]}
        />
      </div>
    </AppShell>
  );
}

const BRAND_STAGES: BrandStage[] = ["Unknown", "Recognized", "Trusted", "Preferred"];

function BrandStageTracker({ stage }: { stage: BrandStage }) {
  const idx = BRAND_STAGES.indexOf(stage);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {BRAND_STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
              i === idx
                ? "border-primary bg-primary text-primary-foreground"
                : i < idx
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground",
            )}
          >
            <span className="num">{i + 1}</span> {s}
          </div>
          {i < BRAND_STAGES.length - 1 && <div className="h-px w-3 bg-border" />}
        </div>
      ))}
    </div>
  );
}
