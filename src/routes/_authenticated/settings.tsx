import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, StageTracker } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveOrg, useProfile, useSaveRow, signOut as signOutSession } from "@/lib/growth";
import { changePassword } from "@/server/functions/password-reset";
import {
  listOrgTeam,
  inviteTeamMember,
  revokeInvite,
  removeTeamMember,
} from "@/server/functions/team";
import { exportOrgData, deleteOrganization } from "@/server/functions/organizations";
import { deleteMyAccount } from "@/server/functions/auth";
import { BRAND_FULL, BRAND_TAGLINE, SUPPORT_EMAIL } from "@/lib/brand";
import { NICHES, ONBOARDING_STAGES, stageLabel, BUSINESS_GOALS } from "@/lib/niches";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: `Settings — ${BRAND_FULL}` },
      {
        name: "description",
        content: "Manage your business profile, industry, currency and account details.",
      },
      { property: "og:title", content: `Settings — ${BRAND_FULL}` },
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

  function toggleGoal(goal: string) {
    setForm((f) => {
      const goals: string[] = f["goals"] ?? [];
      return {
        ...f,
        goals: goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal],
      };
    });
  }

  function submit() {
    if (!org) return;
    save.mutate(
      {
        id: org["id"],
        name: form["name"],
        niche: form["niche"],
        currency: form["currency"],
        location: form["location"],
        goals: form["goals"] ?? [],
      },
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
        description={`Where this business is in the ${BRAND_TAGLINE} rollout`}
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
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={form["location"] ?? ""}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Business goals</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {BUSINESS_GOALS.map((g) => (
                  <label
                    key={g}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={(form["goals"] ?? []).includes(g)}
                      onCheckedChange={() => toggleGoal(g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
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
          <div className="mt-4 border-t pt-4">
            <ChangePasswordForm />
          </div>
          <DeleteAccountSection profile={profile} org={org} />
        </Panel>
      </div>

      <TeamPanel orgId={orgId} currentUserId={profile?.["id"] as string | undefined} />

      <DataPanel org={org} orgId={orgId} />

      {SUPPORT_EMAIL && (
        <Panel
          className="mt-4"
          title="Get help"
          description="Something not working, or have a question?"
        >
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Contact support — {SUPPORT_EMAIL}
          </a>
        </Panel>
      )}
    </AppShell>
  );
}

function DataPanel({
  org,
  orgId,
}: {
  org: Record<string, any> | null | undefined;
  orgId: string | undefined;
}) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function exportData() {
    if (!orgId) return;
    setExporting(true);
    try {
      const data = await exportOrgData({ data: { orgId } });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${org?.["name"] ?? "business"}-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export data");
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (!orgId) return;
    setDeleting(true);
    try {
      await deleteOrganization({ data: { orgId, confirmName } });
      await signOutSession();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete business");
      setDeleting(false);
    }
  }

  return (
    <>
      <Panel
        className="mt-4"
        title="Your data"
        description="Export everything, or permanently delete this business"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportData} disabled={exporting || !orgId}>
            {exporting ? "Exporting…" : "Export all data"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
            disabled={!orgId}
          >
            Delete this business
          </Button>
        </div>
      </Panel>

      <Dialog open={deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {org?.["name"] ?? "this business"}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes every lead, customer, revenue record, task and setting for this
            business. There is no undo — export your data first if you want a copy.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_name" className="text-xs text-muted-foreground">
              Type <b>{org?.["name"]}</b> to confirm
            </Label>
            <Input
              id="confirm_name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || confirmName !== org?.["name"]}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamPanel({
  orgId,
  currentUserId,
}: {
  orgId: string | undefined;
  currentUserId: string | undefined;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const team = useQuery({
    queryKey: ["team", orgId],
    enabled: !!orgId,
    queryFn: () => listOrgTeam({ data: { orgId: orgId! } }),
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["team", orgId] });
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !email.trim()) return;
    setInviting(true);
    try {
      await inviteTeamMember({ data: { orgId, email: email.trim() } });
      toast.success(`Invite sent to ${email.trim()}`);
      setEmail("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setInviting(false);
    }
  }

  async function resend(inviteEmail: string) {
    if (!orgId) return;
    try {
      await inviteTeamMember({ data: { orgId, email: inviteEmail } });
      toast.success(`Invite resent to ${inviteEmail}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend invite");
    }
  }

  async function revoke(inviteId: string) {
    if (!orgId) return;
    try {
      await revokeInvite({ data: { orgId, inviteId } });
      toast.success("Invite revoked");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke invite");
    }
  }

  async function remove(memberUserId: string) {
    if (!orgId) return;
    try {
      await removeTeamMember({ data: { orgId, memberUserId } });
      toast.success("Removed from the team");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    }
  }

  const members = team.data?.members ?? [];
  const invites = team.data?.invites ?? [];
  const ownerId = team.data?.ownerId;

  return (
    <Panel
      className="mt-4"
      title="Team"
      description="Everyone invited gets the same full access as you — there's no separate permission tier yet"
    >
      <form onSubmit={invite} className="mb-4 flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@business.com"
          className="max-w-xs"
        />
        <Button type="submit" disabled={inviting || !email.trim()} size="sm">
          {inviting ? "Sending…" : "Invite"}
        </Button>
      </form>

      <ul className="space-y-1.5">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-ink">{m.fullName || m.email}</span>
              <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
              {m.userId === currentUserId && (
                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground capitalize">
                {m.userId === ownerId ? "Owner" : m.role}
              </span>
              {m.userId !== ownerId && (
                <Button variant="ghost" size="sm" onClick={() => remove(m.userId)}>
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {invites.length > 0 && (
        <>
          <div className="mt-4 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Pending invites
          </div>
          <ul className="space-y-1.5">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{i.email}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    invited {new Date(i.createdAt).toLocaleDateString()} — expires{" "}
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => resend(i.email)}>
                    Resend
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => revoke(i.id)}>
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("current_password"));
    const newPassword = String(form.get("new_password"));
    const confirm = String(form.get("confirm_password"));
    if (newPassword !== confirm) {
      toast.error("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await changePassword({ data: { currentPassword, newPassword } });
      toast.success(
        "Password changed — you're still signed in here, but every other device was signed out.",
      );
      e.currentTarget.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label className="text-sm font-medium">Change password</Label>
      <div className="space-y-1.5">
        <Label htmlFor="current_password" className="text-xs text-muted-foreground">
          Current password
        </Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new_password" className="text-xs text-muted-foreground">
          New password
        </Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm_password" className="text-xs text-muted-foreground">
          Confirm new password
        </Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={loading}>
        {loading ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

function DeleteAccountSection({
  profile,
  org,
}: {
  profile: Record<string, any> | null | undefined;
  org: Record<string, any> | null | undefined;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ownsCurrentOrg = !!org && !!profile && org["owner_id"] === profile["id"];

  async function confirmDeleteAccount() {
    setDeleting(true);
    try {
      await deleteMyAccount({ data: { confirmEmail } });
      await signOutSession();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <Label className="text-sm font-medium">Delete account</Label>
      <p className="mt-1 text-xs text-muted-foreground">
        Permanently deletes your login.{" "}
        {ownsCurrentOrg
          ? "You own this business — deleting your account deletes it and everything in it, for every teammate too."
          : "Any business you don't own is unaffected; you're just removed from it."}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        Delete my account
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes your login and personal access.{" "}
            {ownsCurrentOrg
              ? "Because you own this business, it and every lead, customer and revenue record in it will be deleted too — for everyone on your team."
              : ""}{" "}
            There is no undo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_email" className="text-xs text-muted-foreground">
              Type <b>{profile?.["email"]}</b> to confirm
            </Label>
            <Input
              id="confirm_email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || confirmEmail !== profile?.["email"]}
              onClick={confirmDeleteAccount}
            >
              {deleting ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
