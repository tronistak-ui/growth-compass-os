/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, ScoreDial, Meter } from "@/components/growth/ui";
import { useActiveOrg, useSingletonRow, useUpsertSingleton } from "@/lib/growth";
import { getSocialConnection, startOAuth, disconnectSocialConnection } from "@/server/functions/oauth";
import { syncPresenceConnection } from "@/server/functions/presence-sync";
import { presenceScore } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/presence")({
  head: () => ({
    meta: [
      { title: `Online presence audit — ${BRAND_FULL}` },
      {
        name: "description",
        content:
          "Audit your website, Google profile, Instagram and WhatsApp, and score your discoverability.",
      },
      { property: "og:title", content: `Online presence audit — ${BRAND_FULL}` },
      {
        property: "og:description",
        content: "Score discoverability, trust and consistency across every channel.",
      },
    ],
  }),
  component: PresencePage,
});

type FieldDef = { key: string; label: string; type?: "text" | "number"; synced?: boolean };
type ToggleDef = { key: string; label: string; synced?: boolean };
type OAuthProvider = "google_business" | "instagram";

type ChannelDef = {
  title: string;
  texts: FieldDef[];
  toggles: ToggleDef[];
  /** Present only for OAuth-connectable channels. */
  oauth?: { provider: OAuthProvider; connectLabel: string };
};

// Which fields each provider's sync actually writes — see
// server/oauth/presence-sync.server.ts. Everything else in a connected
// channel stays manually editable even when connected.
const CHANNELS: ChannelDef[] = [
  {
    title: "Website",
    texts: [{ key: "website_url", label: "Website URL" }],
    toggles: [
      { key: "website_mobile_ready", label: "Mobile friendly" },
      { key: "website_has_cta", label: "Clear call to action" },
      { key: "website_has_contact", label: "Contact details visible" },
    ],
  },
  {
    title: "Google Business Profile",
    oauth: { provider: "google_business", connectLabel: "Google Business Profile" },
    texts: [
      { key: "google_category", label: "Google category", synced: true },
      { key: "google_address", label: "Google address", synced: true },
      { key: "google_phone", label: "Google phone", synced: true },
      { key: "google_hours", label: "Opening hours", synced: true },
      { key: "google_reviews", label: "Review count", type: "number", synced: true },
      { key: "google_rating", label: "Average rating", type: "number", synced: true },
    ],
    toggles: [
      { key: "google_profile_claimed", label: "Profile claimed", synced: true },
      { key: "google_website_linked", label: "Website linked", synced: true },
    ],
  },
  {
    title: "Instagram",
    oauth: { provider: "instagram", connectLabel: "Instagram" },
    texts: [
      { key: "instagram_url", label: "Instagram URL", synced: true },
      { key: "instagram_bio", label: "Instagram bio", synced: true },
      { key: "instagram_followers", label: "Instagram followers", type: "number", synced: true },
    ],
    toggles: [
      // Not exposed by the Instagram API — stay manually editable even when connected.
      { key: "instagram_has_cta", label: "Bio has a call to action" },
      { key: "instagram_link", label: "Link in bio", synced: true },
      { key: "instagram_contact", label: "Contact button set" },
    ],
  },
  {
    title: "WhatsApp",
    texts: [{ key: "whatsapp_number", label: "WhatsApp number" }],
    toggles: [
      { key: "whatsapp_business", label: "WhatsApp Business account" },
      { key: "whatsapp_cta", label: "Greeting / CTA message" },
      { key: "whatsapp_catalogue", label: "Catalogue set up" },
    ],
  },
  {
    title: "Consistency",
    texts: [],
    toggles: [
      { key: "consistent_name", label: "Same business name everywhere" },
      { key: "consistent_phone", label: "Same phone number" },
      { key: "consistent_address", label: "Same address" },
      { key: "consistent_website", label: "Same website link" },
      { key: "consistent_description", label: "Same description" },
    ],
  },
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

function StatusPill({ connection }: { connection: ConnectionData }) {
  if (!connection) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Not connected · entered manually
      </span>
    );
  }
  if (connection.status === "error") {
    return (
      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
        Error — tap Reconnect
      </span>
    );
  }
  return (
    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
      Connected
      {connection.last_synced_at
        ? ` · synced ${formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}`
        : " · never synced"}
    </span>
  );
}

function SyncedBadge() {
  return (
    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase">
      Synced
    </span>
  );
}

/** Query for one social_connections_public row — token-free, safe for the browser. */
function useSocialConnection(orgId: string | undefined, provider: string) {
  return useQuery({
    queryKey: ["social-connections", orgId, provider],
    enabled: !!orgId,
    queryFn: () => getSocialConnection({ data: { orgId: orgId!, provider } }),
  });
}

function ChannelCard({
  channel,
  form,
  set,
  connection,
  connecting,
  syncing,
  disconnecting,
  onConnect,
  onSync,
  onDisconnect,
}: {
  channel: ChannelDef;
  form: Record<string, any>;
  set: (k: string, v: any) => void;
  connection: ConnectionData;
  connecting: boolean;
  syncing: boolean;
  disconnecting: boolean;
  onConnect: (provider: OAuthProvider) => void;
  onSync: (connectionId: string, label: string) => void;
  onDisconnect: (provider: OAuthProvider, label: string) => void;
}) {
  const isConnected = connection?.status === "connected" || connection?.status === "error";

  return (
    <Panel
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>{channel.title}</span>
          {channel.oauth && <StatusPill connection={connection} />}
        </div>
      }
      actions={
        channel.oauth ? (
          <div className="flex flex-wrap items-center gap-2">
            {isConnected && connection && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSync(connection.id, channel.oauth!.connectLabel)}
                disabled={syncing}
              >
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            )}
            <Button
              size="sm"
              variant={isConnected ? "outline" : "default"}
              onClick={() => onConnect(channel.oauth!.provider)}
              disabled={connecting}
            >
              {connecting ? "Redirecting…" : isConnected ? "Reconnect" : "Connect"}
            </Button>
            {isConnected && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDisconnect(channel.oauth!.provider, channel.oauth!.connectLabel)}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {connection?.last_error && (
        <p className="mb-3 text-xs text-destructive">{connection.last_error}</p>
      )}

      {channel.texts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {channel.texts.map((f) => {
            const readOnly = !!(f.synced && isConnected);
            return (
              <div key={f.key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  {f.label}
                  {readOnly && <SyncedBadge />}
                </Label>
                <Input
                  type={f.type ?? "text"}
                  value={form[f.key] ?? ""}
                  disabled={readOnly}
                  onChange={(e) => set(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}

      {channel.toggles.length > 0 && (
        <div className={cn("grid gap-2 sm:grid-cols-2", channel.texts.length > 0 && "mt-4")}>
          {channel.toggles.map((t) => {
            const readOnly = !!(t.synced && isConnected);
            return (
              <label
                key={t.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm"
              >
                <span className="flex items-center gap-1.5 text-foreground/90">
                  {t.label}
                  {readOnly && <SyncedBadge />}
                </span>
                <Switch
                  checked={Boolean(form[t.key])}
                  disabled={readOnly}
                  onCheckedChange={(v) => set(t.key, v)}
                />
              </label>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function PresencePage() {
  const { orgId } = useActiveOrg();
  const { data } = useSingletonRow("presence_profiles", orgId);
  const upsert = useUpsertSingleton("presence_profiles", orgId);
  const [form, setForm] = useState<Record<string, any>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const qc = useQueryClient();

  const googleConnection = useSocialConnection(orgId, "google_business");
  const instagramConnection = useSocialConnection(orgId, "instagram");

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  // Reads the redirect-back params from oauth-callback (?connect_status=...).
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

  function invalidateConnections() {
    void qc.invalidateQueries({ queryKey: ["presence_profiles", "single", orgId] });
    void qc.invalidateQueries({ queryKey: ["social-connections", orgId] });
  }

  async function startConnect(provider: OAuthProvider) {
    if (!orgId) return;
    setConnecting(provider);
    try {
      const res = await startOAuth({ data: { provider, orgId } });
      if (!res?.url) throw new Error("No authorize URL returned");
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start connect flow");
      setConnecting(null);
    }
  }

  async function syncNow(connectionId: string, label: string) {
    setSyncing(connectionId);
    try {
      const res = await syncPresenceConnection({ data: { connectionId } });
      if (res.skipped) {
        toast.info(res.reason ?? "Synced too recently");
      } else if (res.result?.ok === false) {
        throw new Error(res.result.error ?? "Sync failed");
      } else {
        toast.success(`Synced ${label}`);
      }
      invalidateConnections();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  async function disconnect(provider: OAuthProvider, label: string) {
    if (!orgId) return;
    setDisconnecting(provider);
    try {
      await disconnectSocialConnection({ data: { orgId, provider } });
      toast.success(`Disconnected ${label}`);
      invalidateConnections();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setDisconnecting(null);
    }
  }

  const connectionFor: Record<OAuthProvider, ConnectionData> = {
    google_business: googleConnection.data,
    instagram: instagramConnection.data,
  };

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
          {CHANNELS.map((channel) => (
            <ChannelCard
              key={channel.title}
              channel={channel}
              form={form}
              set={set}
              connection={channel.oauth ? connectionFor[channel.oauth.provider] : undefined}
              connecting={!!channel.oauth && connecting === channel.oauth.provider}
              syncing={!!channel.oauth && syncing === connectionFor[channel.oauth.provider]?.id}
              disconnecting={!!channel.oauth && disconnecting === channel.oauth.provider}
              onConnect={startConnect}
              onSync={syncNow}
              onDisconnect={disconnect}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
