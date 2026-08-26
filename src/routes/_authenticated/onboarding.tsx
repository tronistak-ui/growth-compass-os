/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/server/functions/auth";
import { createOrganization } from "@/server/functions/organizations";
import { setStoredOrgId } from "@/lib/growth";
import { NICHES, BUSINESS_GOALS, CHANNELS } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BRAND_FULL, BRAND_TAGLINE } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: `Business onboarding — ${BRAND_FULL}` },
      {
        name: "description",
        content: `Tell the ${BRAND_TAGLINE} about your business, model and goals to activate your workspace.`,
      },
      { property: "og:title", content: `Business onboarding — ${BRAND_FULL}` },
      { property: "og:description", content: "Set up your business profile, model and goals." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Business", "Model", "Goals"];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({
    name: "",
    niche: "Local Brand",
    industry: "",
    location: "",
    website: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    google_profile: "",
    phone: "",
    email: "",
    currency: "USD",
    products_services: "",
    main_offers: "",
    avg_order_value: 0,
    target_location: "",
    main_customer_type: "",
    monthly_revenue_range: "",
    main_goal: "",
    goals: [] as string[],
    acquisition_channels: [] as string[],
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x: string) => x !== v) : [...f[k], v],
    }));

  async function finish() {
    if (!form["name"]) {
      toast.error("Business name is required");
      setStep(0);
      return;
    }
    setSaving(true);

    // Always read the identity fresh at submit time — a stale/expired session in
    // component state is what makes the server reject the new business row.
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      setSaving(false);
      toast.error("Your session expired. Please sign in again.");
      navigate({ to: "/auth" });
      return;
    }

    try {
      const created = await createOrganization({
        data: {
          name: String(form["name"]).trim(),
          niche: form["niche"] || undefined,
          industry: form["industry"] || undefined,
          location: form["location"] || undefined,
          website: form["website"] || undefined,
          instagram: form["instagram"] || undefined,
          facebook: form["facebook"] || undefined,
          whatsapp: form["whatsapp"] || undefined,
          googleProfile: form["google_profile"] || undefined,
          phone: form["phone"] || undefined,
          email: form["email"] || undefined,
          currency: form["currency"] || "USD",
          productsServices: form["products_services"] || undefined,
          mainOffers: form["main_offers"] || undefined,
          avgOrderValue: Number(form["avg_order_value"]) || 0,
          targetLocation: form["target_location"] || undefined,
          mainCustomerType: form["main_customer_type"] || undefined,
          monthlyRevenueRange: form["monthly_revenue_range"] || undefined,
          mainGoal: form["main_goal"] || undefined,
          goals: form["goals"] ?? [],
          acquisitionChannels: form["acquisition_channels"] ?? [],
        },
      });

      setSaving(false);
      if (created?.["id"]) setStoredOrgId(created["id"] as string);
      await qc.invalidateQueries();
      toast.success("Workspace ready");
      // The activation code only ever appears in this one response — hold
      // navigation until it's been shown and acknowledged, rather than
      // risk it flashing past in a toast.
      if (created?.["activation_code"]) {
        setPendingOrgId(created["id"] as string);
        setActivationCode(created["activation_code"] as string);
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      setSaving(false);
      console.error("Create organization failed", error);
      toast.error(error instanceof Error ? error.message : "Couldn't create your business");
    }
  }

  return (
    <div className="dotfield min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Set up your {BRAND_TAGLINE}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Three short steps. Everything can be edited later in Settings.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                  i === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < step
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                <span className="num">{i + 1}</span> {s}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        <div className="panel space-y-5 p-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" required>
                <Input value={form["name"]} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Business type / niche">
                <Select value={form["niche"]} onValueChange={(v) => set("niche", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {NICHES.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Industry">
                <Input value={form["industry"]} onChange={(e) => set("industry", e.target.value)} />
              </Field>
              <Field label="Location">
                <Input value={form["location"]} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={form["website"]} onChange={(e) => set("website", e.target.value)} />
              </Field>
              <Field label="Instagram">
                <Input
                  value={form["instagram"]}
                  onChange={(e) => set("instagram", e.target.value)}
                />
              </Field>
              <Field label="Facebook">
                <Input value={form["facebook"]} onChange={(e) => set("facebook", e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form["whatsapp"]} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
              <Field label="Google Business Profile">
                <Input
                  value={form["google_profile"]}
                  onChange={(e) => set("google_profile", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input value={form["phone"]} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Business email">
                <Input value={form["email"]} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Currency">
                <Input
                  value={form["currency"]}
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Products / services" full>
                <Textarea
                  rows={2}
                  value={form["products_services"]}
                  onChange={(e) => set("products_services", e.target.value)}
                />
              </Field>
              <Field label="Main offers" full>
                <Textarea
                  rows={2}
                  value={form["main_offers"]}
                  onChange={(e) => set("main_offers", e.target.value)}
                />
              </Field>
              <Field label="Average order value">
                <Input
                  type="number"
                  value={form["avg_order_value"]}
                  onChange={(e) => set("avg_order_value", e.target.value)}
                />
              </Field>
              <Field label="Target location">
                <Input
                  value={form["target_location"]}
                  onChange={(e) => set("target_location", e.target.value)}
                />
              </Field>
              <Field label="Main customer type">
                <Input
                  value={form["main_customer_type"]}
                  onChange={(e) => set("main_customer_type", e.target.value)}
                />
              </Field>
              <Field label="Current monthly revenue range">
                <Select
                  value={form["monthly_revenue_range"]}
                  onValueChange={(v) => set("monthly_revenue_range", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a range" />
                  </SelectTrigger>
                  <SelectContent>
                    {["0–1k", "1k–5k", "5k–20k", "20k–50k", "50k+"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current acquisition channels" full>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <Chip
                      key={c}
                      active={form["acquisition_channels"].includes(c)}
                      onClick={() => toggle("acquisition_channels", c)}
                    >
                      {c}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="Main business goal">
                <Select value={form["main_goal"]} onValueChange={(v) => set("main_goal", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_GOALS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-2">
                <Label>Everything you want to improve</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BUSINESS_GOALS.map((g) => (
                    <label
                      key={g}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={form["goals"].includes(g)}
                        onCheckedChange={() => toggle("goals", g)}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button onClick={finish} disabled={saving}>
                {saving ? "Creating workspace…" : "Finish setup"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!activationCode}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Save this activation code</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The workspace is unlocked for you to configure now, but a client member will only get
            full read/write access once this code is entered from the banner shown on their screen.
            This code is shown once — it cannot be retrieved again (only regenerated from the admin
            console, invalidating this one).
          </p>
          <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-center">
            <div className="font-display text-2xl font-semibold tracking-wider text-ink">
              {activationCode}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Hand this to the client only once the remaining setup fee is paid — not before.
          </p>
          <DialogFooter>
            <Button
              onClick={() => {
                setActivationCode(null);
                if (pendingOrgId) setStoredOrgId(pendingOrgId);
                navigate({ to: "/dashboard" });
              }}
            >
              I've saved it — continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
