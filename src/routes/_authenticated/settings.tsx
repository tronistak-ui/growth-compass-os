import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, StageTracker } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveOrg, useProfile, useSaveRow } from "@/lib/growth";
import { NICHES, ONBOARDING_STAGES, stageLabel } from "@/lib/niches";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Manage your business profile, industry, currency and account details.",
      },
      { property: "og:title", content: "Settings — TrendZypher Growth OS" },
      { property: "og:description", content: "Business profile, industry and currency settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { org, orgId } = useActiveOrg();
  const { data: profile } = useProfile();
  const save = useSaveRow("organizations", orgId);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (org) setForm({ ...org });
  }, [org]);

  function set(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!org) return;
    save.mutate(
      { id: org["id"], name: form["name"], niche: form["niche"], currency: form["currency"] },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e: any) => toast.error(e.message ?? "Could not save"),
      },
    );
  }

  const currentStage = form["onboarding_status"] ?? "not_started";

  function setStage(stage: string) {
    if (!org) return;
    save.mutate(
      { id: org["id"], onboarding_status: stage },
      {
        onSuccess: () => {
          setForm((f) => ({ ...f, onboarding_status: stage }));
          toast.success("Stage updated");
        },
        onError: (e: any) => toast.error(e.message ?? "Could not save"),
      },
    );
  }

  return (
    <AppShell title="Settings" subtitle="Business profile and account details">
      <Panel
        title="Onboarding journey"
        description="Where this business is in the Growth OS rollout"
        className="mb-4"
      >
        <StageTracker stage={currentStage} />
        <div className="mt-4 flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Move to</Label>
          <Select value={currentStage} onValueChange={setStage}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ONBOARDING_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {stageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Business profile" description="Used across every module">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Business name</Label>
              <Input value={form["name"] ?? ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form["niche"] ?? ""}
                onChange={(e) => set("niche", e.target.value)}
              >
                <option value="">Select industry</option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                value={form["currency"] ?? ""}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Panel>

        <Panel title="Account" description="Your personal login">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{profile?.["full_name"] ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{profile?.["email"] ?? "—"}</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </AppShell>
  );
}
