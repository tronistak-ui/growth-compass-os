import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { resetPassword } from "@/server/functions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: `Set a new password — ${BRAND_FULL}` }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    if (newPassword !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ data: { token, newPassword } });
      setDone(true);
      setTimeout(() => navigate({ to: "/auth" }), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
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
          {!token ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-semibold text-ink">Missing reset link</h1>
              <p className="text-sm text-muted-foreground">
                This page needs a valid reset link from your email.
              </p>
              <Link to="/forgot-password" className="inline-block text-sm text-primary">
                Request a new one
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-semibold text-ink">Password updated</h1>
              <p className="text-sm text-muted-foreground">Taking you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-lg font-semibold text-ink">Set a new password</h1>
              <p className="mb-5 text-sm text-muted-foreground">
                This also signs you out everywhere else, for security.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving…" : "Set new password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
