import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser, signIn, signUp } from "@/server/functions/auth";
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
    getCurrentUser().then((user) => {
      if (user) navigate({ to: "/dashboard", replace: true });
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
        await signUp({ data: { email, password, fullName: String(form.get("full_name") ?? "") } });
        toast.success("Account created. Setting up your workspace…");
        navigate({ to: "/onboarding" });
      } else {
        await signIn({ data: { email, password } });
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dotfield flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-xl bg-ink">
            <img src="/tz-mark.png" alt="" className="size-6 object-contain" />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                      Forgot password?
                    </Link>
                  )}
                </div>
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
          </Tabs>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Your business data is isolated per organization.
        </p>
      </div>
    </div>
  );
}
