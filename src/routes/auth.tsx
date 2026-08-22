import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Sign in or create your TrendZypher Growth OS account to run your business growth.",
      },
      { property: "og:title", content: "Sign in — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "Access your growth dashboard, leads, customers, revenue and profit.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: String(form.get("full_name") ?? "") },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
          return;
        }
        toast.success("Account created. Setting up your workspace…");
        navigate({ to: "/onboarding" });

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setLoading(false);
      toast.error("Google sign-in failed");
      return;
    }
    // Supabase performs a top-level redirect to Google; execution ends here.
  }

  async function resetPassword(email: string) {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  }

  return (
    <div className="dotfield flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-xl bg-ink font-display text-sm font-bold text-background">
            TZ
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold text-ink">TrendZypher</div>
            <div className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Growth OS
            </div>
          </div>
        </Link>

        <div className="panel p-6">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <form onSubmit={handleEmail} className="mt-5 space-y-4">
              <TabsContent value="signup" className="m-0 space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" placeholder="Alex Rivera" />
              </TabsContent>

              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@business.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] tracking-wider text-muted-foreground uppercase">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              Continue with Google
            </Button>

            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                const el = document.getElementById("email") as HTMLInputElement | null;
                resetPassword(el?.value ?? "");
              }}
            >
              Forgot your password?
            </button>
          </Tabs>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Your business data is isolated per organization and protected by row-level security.
        </p>
      </div>
    </div>
  );
}
