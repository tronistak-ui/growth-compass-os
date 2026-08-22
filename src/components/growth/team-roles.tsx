import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel, LoadingRows, EmptyState } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/growth";

type Member = { user_id: string; email: string | null; roles: AppRole[] };

const ASSIGNABLE: AppRole[] = ["support", "auditor", "platform_admin"];

export function TeamRolesPanel() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("support");
  const [saving, setSaving] = useState(false);

  const members = useQuery({
    queryKey: ["admin", "team-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id,role");
      if (error) throw error;
      const userIds = [...new Set((roles ?? []).map((r) => r.user_id as string))];
      if (userIds.length === 0) return [] as Member[];
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id,email")
        .in("id", userIds);
      if (profErr) throw profErr;
      const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
      const grouped = new Map<string, AppRole[]>();
      for (const r of roles ?? []) {
        const list = grouped.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        grouped.set(r.user_id, list);
      }
      return [...grouped.entries()].map(([user_id, rs]) => ({
        user_id,
        email: emailById.get(user_id) ?? null,
        roles: rs,
      })) as Member[];
    },
  });

  async function grant() {
    if (!email.trim()) {
      toast.error("Enter the person's account email");
      return;
    }
    setSaving(true);
    try {
      const { data: profile, error: findErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();
      if (findErr) throw findErr;
      if (!profile) {
        toast.error("No account found with that email — they need to sign up first");
        return;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: profile.id, role });
      if (error) throw error;
      toast.success(`Granted ${role.replace("_", " ")}`);
      setEmail("");
      void qc.invalidateQueries({ queryKey: ["admin", "team-roles"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not grant role");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(userId: string, r: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", r);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Removed ${r.replace("_", " ")}`);
    void qc.invalidateQueries({ queryKey: ["admin", "team-roles"] });
  }

  return (
    <Panel
      title="Team & access"
      description="Grant admin, support or auditor access. Each role only sees what it needs."
      actions={
        <div className="flex items-center gap-1.5">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="h-8 w-44"
          />
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={saving} onClick={grant}>
            Grant
          </Button>
        </div>
      }
    >
      {members.isLoading ? (
        <LoadingRows rows={3} />
      ) : !members.data || members.data.length === 0 ? (
        <EmptyState
          title="No elevated roles yet"
          description="Grant support or auditor access above."
        />
      ) : (
        <ul className="space-y-1.5">
          {members.data.map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="text-xs font-medium text-ink">{m.email ?? m.user_id}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {m.roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => revoke(m.user_id, r)}
                    title="Click to revoke"
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.05em] hover:bg-destructive/10 hover:text-destructive"
                  >
                    {r.replace("_", " ")} ✕
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
