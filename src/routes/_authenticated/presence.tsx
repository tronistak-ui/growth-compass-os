/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, ScoreDial, Meter } from "@/components/growth/ui";
import { useActiveOrg, useSingletonRow, useUpsertSingleton } from "@/lib/growth";
import { presenceScore } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/presence")({
  head: () => ({
    meta: [
      { title: "Online presence audit — TrendZypher Growth OS" },
      {
        name: "description",
        content:
          "Audit your website, Google profile, Instagram and WhatsApp, and score your discoverability.",
      },
      { property: "og:title", content: "Online presence audit — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "Score discoverability, trust and consistency across every channel.",
      },
    ],
  }),
  component: PresencePage,
});

const TOGGLES: Record<string, [string, string][]> = {
  Website: [
    ["website_mobile_ready", "Mobile friendly"],
    ["website_has_cta", "Clear call to action"],
    ["website_has_contact", "Contact details visible"],
  ],
  "Google Business Profile": [
    ["google_profile_claimed", "Profile claimed"],
    ["google_website_linked", "Website linked"],
  ],
  Instagram: [
    ["instagram_has_cta", "Bio has a call to action"],
    ["instagram_link", "Link in bio"],
    ["instagram_contact", "Contact button set"],
  ],
  WhatsApp: [
    ["whatsapp_business", "WhatsApp Business account"],
    ["whatsapp_cta", "Greeting / CTA message"],
    ["whatsapp_catalogue", "Catalogue set up"],
  ],
  Consistency: [
    ["consistent_name", "Same business name everywhere"],
    ["consistent_phone", "Same phone number"],
    ["consistent_address", "Same address"],
    ["consistent_website", "Same website link"],
    ["consistent_description", "Same description"],
  ],
};

const TEXTS: [string, string, string?][] = [
  ["website_url", "Website URL"],
  ["google_category", "Google category"],
  ["google_address", "Google address"],
  ["google_phone", "Google phone"],
  ["google_hours", "Opening hours"],
  ["google_reviews", "Review count", "number"],
  ["google_rating", "Average rating", "number"],
  ["instagram_url", "Instagram URL"],
  ["instagram_bio", "Instagram bio"],
  ["whatsapp_number", "WhatsApp number"],
];

function PresencePage() {
  const { orgId } = useActiveOrg();
  const { data } = useSingletonRow("presence_profiles", orgId);
  const upsert = useUpsertSingleton("presence_profiles", orgId);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const score = presenceScore(form);

  function save() {
    upsert.mutate(form, {
      onSuccess: () => toast.success("Presence audit saved"),
      onError: (e: any) => toast.error(e.message ?? "Could not save"),
    });
  }

  return (
    <AppShell
      title="Online Presence"
      subtitle="Can customers find you, and do they trust what they find?"
      actions={
        <Button size="sm" onClick={save} disabled={upsert.isPending}>
          {upsert.isPending ? "Saving…" : "Save audit"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Presence score" description="Weighted across all channels">
          <ScoreDial score={score.total} label="Overall presence" />
          <div className="mt-5 space-y-3">
            <Meter label="Discoverability" value={score.discoverability} />
            <Meter label="Trust" value={score.trust} />
            <Meter label="Consistency" value={score.consistency} />
            <Meter label="Conversion" value={score.conversion} />
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Channel details">
            <div className="grid gap-3 sm:grid-cols-2">
              {TEXTS.map(([key, label, type]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    type={type ?? "text"}
                    value={form[key] ?? ""}
                    onChange={(e) =>
                      set(key, type === "number" ? Number(e.target.value) : e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </Panel>

          {Object.entries(TOGGLES).map(([group, items]) => (
            <Panel key={group} title={group}>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm"
                  >
                    <span className="text-foreground/90">{label}</span>
                    <Switch
                      checked={Boolean(form[key])}
                      onCheckedChange={(v) => set(key, v)}
                    />
                  </label>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
