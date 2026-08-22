/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, ScoreDial, Meter } from "@/components/growth/ui";
import { useActiveOrg, useSingletonRow, useUpsertSingleton } from "@/lib/growth";
import { supabase } from "@/integrations/supabase/client";
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
  ["instagram_followers", "Instagram followers", "number"],
  ["whatsapp_number", "WhatsApp number"],
];

type ConnectionData =
  | {
      id: string;
      status: string;
      external_account_name: string | null;
      last_synced_at: string | null;
      last_error: string | null;
    }
  | null
  | undefined;

/** One row in the temporary test panel: a connect button, status line, and
 * (once connected) a sync button. `statusOf` is the row shown as connected/
 * error/name; `syncTarget` is the connection whose id actually gets synced —
 * for Meta these differ (facebook proves the OAuth handshake worked,
 * instagram is what sync-presence writes into presence_profiles). */
function ConnectionRow({
  label,
  provider,
  statusOf,
  syncTarget,
  connecting,
  syncing,
  onConnect,
  onSync,
}: {
  label: string;
  provider: "google_business" | "facebook";
  statusOf: ConnectionData;
  syncTarget: ConnectionData;
  connecting: boolean;
  syncing: boolean;
  onConnect: (provider: "google_business" | "facebook") => void;
  onSync: (connectionId: string, label: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={() => onConnect(provider)} disabled={connecting}>
        {connecting ? "Redirecting…" : statusOf ? `Reconnect ${label}` : `Connect ${label}`}
      </Button>
      {statusOf && (
        <span className="text-xs text-muted-foreground">
          Status: <span className="font-medium text-ink">{statusOf.status}</span>
          {statusOf.external_account_name ? ` · ${statusOf.external_account_name}` : ""}
        </span>
      )}
      {syncTarget && (
        <>
          <span className="text-xs text-muted-foreground">
            {syncTarget.last_synced_at
              ? `synced ${new Date(syncTarget.last_synced_at).toLocaleString()}`
              : "never synced"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSync(syncTarget.id, label)}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </>
      )}
      {(syncTarget?.last_error ?? statusOf?.last_error) && (
        <span className="text-xs text-destructive">
          {syncTarget?.last_error ?? statusOf?.last_error}
        </span>
      )}
    </div>
  );
}

/** Query for one social_connections_public row — token-free, safe for the browser. */
function useSocialConnection(orgId: string | undefined, provider: string) {
  return useQuery({
    queryKey: ["social-connections", orgId, provider],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_connections_public")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("provider", provider)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function PresencePage() {
  const { orgId } = useActiveOrg();
  const { data } = useSingletonRow("presence_profiles", orgId);
  const upsert = useUpsertSingleton("presence_profiles", orgId);
  const [form, setForm] = useState<Record<string, any>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const qc = useQueryClient();

  const googleConnection = useSocialConnection(orgId, "google_business");
  const facebookConnection = useSocialConnection(orgId, "facebook");
  const instagramConnection = useSocialConnection(orgId, "instagram");

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  // TEMPORARY: reads the redirect-back params from oauth-callback so we can
  // verify the connect flow end-to-end before building the real §7 UI
  // (status pills, per-channel cards, etc). Remove once that lands.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("connect_status");
    if (!status) return;
    if (status === "connected") {
      toast.success(`Connected ${params.get("provider") ?? "account"}`);
    } else {
      toast.error(params.get("connect_message") ?? "Connect failed");
    }
    params.delete("connect_status");
    params.delete("provider");
    params.delete("connect_message");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const score = presenceScore(form);

  function save() {
    upsert.mutate(form, {
      onSuccess: () => toast.success("Presence audit saved"),
      onError: (e: any) => toast.error(e.message ?? "Could not save"),
    });
  }

  async function startConnect(provider: "google_business" | "facebook") {
    if (!orgId) return;
    setConnecting(provider);
    try {
      const { data: res, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider, org_id: orgId },
      });
      if (error) throw error;
      if (!res?.url) throw new Error("No authorize URL returned");
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start connect flow");
      setConnecting(null);
    }
  }

  /** Syncs one connection row (identified by its own connection_id, which is
   * always the `instagram` row for Meta — that's what actually writes into
   * presence_profiles; the `facebook` row just holds the shared Page token). */
  async function syncNow(connectionId: string, label: string) {
    setSyncing(connectionId);
    try {
      const { data: res, error } = await supabase.functions.invoke("sync-presence", {
        body: { connection_id: connectionId },
      });
      if (error) throw error;
      if (res?.skipped) {
        toast.info(res.reason ?? "Synced too recently");
      } else {
        const result = res?.results?.[0];
        if (result?.ok === false) throw new Error(result.error ?? "Sync failed");
        toast.success(`Synced ${label}`);
      }
      void qc.invalidateQueries({ queryKey: ["presence_profiles", "single", orgId] });
      void qc.invalidateQueries({ queryKey: ["social-connections", orgId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
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
      <Panel
        className="mb-4"
        title="Connect accounts (test)"
        description="Temporary — verifying the OAuth + sync flow before the real Presence channel cards land"
      >
        <div className="space-y-3">
          <ConnectionRow
            label="Google Business Profile"
            provider="google_business"
            statusOf={googleConnection.data}
            syncTarget={googleConnection.data}
            connecting={connecting === "google_business"}
            syncing={syncing === googleConnection.data?.id}
            onConnect={startConnect}
            onSync={syncNow}
          />
          <ConnectionRow
            label="Facebook & Instagram"
            provider="facebook"
            statusOf={facebookConnection.data}
            syncTarget={instagramConnection.data}
            connecting={connecting === "facebook"}
            syncing={syncing === instagramConnection.data?.id}
            onConnect={startConnect}
            onSync={syncNow}
          />
        </div>
      </Panel>

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
                    <Switch checked={Boolean(form[key])} onCheckedChange={(v) => set(key, v)} />
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
