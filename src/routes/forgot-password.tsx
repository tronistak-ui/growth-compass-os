import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { requestPasswordReset } from "@/server/functions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: `Reset your password — ${BRAND_FULL}` }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setLoading(true);
    try {
      await requestPasswordReset({ data: { email } });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
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
          {sent ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-semibold text-ink">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for that address, a reset link is on its way. It works once
                and expires in an hour.
              </p>
              <Link to="/auth" className="inline-block text-sm text-primary">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-lg font-semibold text-ink">Reset your password</h1>
              <p className="mb-5 text-sm text-muted-foreground">
                Enter the email on your account and we'll send a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@business.com" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
              <Link to="/auth" className="mt-4 block text-center text-sm text-muted-foreground">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
