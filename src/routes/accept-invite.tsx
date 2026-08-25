import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getInviteInfo,
  acceptInviteNewUser,
  acceptInviteExistingUser,
} from "@/server/functions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({
    meta: [{ title: `Accept invite — ${BRAND_FULL}` }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: AcceptInvitePage,
});

type InviteInfo =
  | { valid: false }
  | { valid: true; email: string; orgName: string; userExists: boolean };

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInfo({ valid: false });
      return;
    }
    getInviteInfo({ data: { token } }).then(setInfo);
  }, [token]);

  async function handleNewUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await acceptInviteNewUser({
        data: { token, fullName: String(form.get("full_name") ?? ""), password },
      });
      toast.success("Welcome aboard!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setLoading(false);
    }
  }

  async function handleExistingUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await acceptInviteExistingUser({ data: { token, password: String(form.get("password")) } });
      toast.success("You're in!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dotfield flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-xl bg-ink">
            <img src="/brand-mark.png" alt="" className="size-6 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold text-ink">{BRAND_NAME}</div>
            <div className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {BRAND_TAGLINE}
            </div>
          </div>
        </Link>

        <div className="panel p-6">
          {info === null ? (
            <p className="text-center text-sm text-muted-foreground">Checking your invite…</p>
          ) : !info.valid ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-semibold text-ink">Invite not valid</h1>
              <p className="text-sm text-muted-foreground">
                This invite link is invalid, expired, or has already been used — ask whoever
                invited you to send a new one.
              </p>
              <Link to="/auth" className="inline-block text-sm text-primary">
                Back to sign in
              </Link>
            </div>
          ) : info.userExists ? (
            <>
              <h1 className="mb-1 text-lg font-semibold text-ink">Join {info.orgName}</h1>
              <p className="mb-5 text-sm text-muted-foreground">
                An account already exists for <b>{info.email}</b> — enter your password to accept.
              </p>
              <form onSubmit={handleExistingUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Joining…" : `Join ${info.orgName}`}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-lg font-semibold text-ink">Join {info.orgName}</h1>
              <p className="mb-5 text-sm text-muted-foreground">
                Set a password for <b>{info.email}</b> to get started.
              </p>
              <form onSubmit={handleNewUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Your name</Label>
                  <Input id="full_name" name="full_name" placeholder="Alex Rivera" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" name="confirm" type="password" required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Joining…" : `Join ${info.orgName}`}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
