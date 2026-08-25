import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { verifyEmail } from "@/server/functions/email-verification";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [{ title: `Verify your email — ${BRAND_FULL}` }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"checking" | "done" | "error">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification link.");
      return;
    }
    verifyEmail({ data: { token } })
      .then(() => setStatus("done"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not verify this link");
      });
  }, [token]);

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

        <div className="panel space-y-3 p-6 text-center">
          {status === "checking" && <p className="text-sm text-muted-foreground">Verifying…</p>}
          {status === "done" && (
            <>
              <h1 className="text-lg font-semibold text-ink">Email verified</h1>
              <p className="text-sm text-muted-foreground">You're all set.</p>
              <Link to="/dashboard" className="inline-block text-sm text-primary">
                Go to dashboard
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-lg font-semibold text-ink">Couldn't verify</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-sm text-muted-foreground">
                Signed in already? Request a new link from Settings.
              </p>
              <Link to="/auth" className="inline-block text-sm text-primary">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
