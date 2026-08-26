import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL, SUPPORT_EMAIL } from "@/lib/brand";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${BRAND_FULL}` },
      { name: "description", content: `How ${BRAND_FULL} handles your data.` },
    ],
  }),
  component: PrivacyPage,
});

const contact = SUPPORT_EMAIL || "[support email not yet configured]";
const PROVIDER_NAME = "TrendZypher";
const PROVIDER_LOCATION = "Andhra Pradesh, India";
const SUPPORT_WINDOW_DAYS = 15;

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 flex items-center gap-2.5">
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

        <article className="panel space-y-6 p-6 sm:p-8">
          <header>
            <h1 className="font-display text-xl font-semibold text-ink">
              Privacy Policy — {BRAND_FULL}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Last updated: [date this is published]
            </p>
          </header>

          <Section title="1. Who this is">
            <P>
              {BRAND_FULL} ("we", "us") is provided by {PROVIDER_NAME}, based in {PROVIDER_LOCATION}
              . For anything in this policy, contact {contact}.
            </P>
            <P>
              This policy applies to the {BRAND_FULL} application deployed for your business ("you",
              "the Customer") and used by you and staff you invite to manage your own customers,
              leads, and business data.
            </P>
          </Section>

          <Section title="2. How this is different from a typical SaaS">
            <P>
              Each {BRAND_NAME} deployment is dedicated to one business: we set up and configure a
              private instance of the application on cloud infrastructure that you own (e.g. your
              own Oracle Cloud account), and hand you the credentials. Your data is not stored on
              shared servers alongside other businesses' data — it lives on infrastructure
              provisioned in your name, under your control.
            </P>
          </Section>

          <Section title="3. What we collect">
            <P className="font-medium text-foreground">
              A. Data about you (the Customer), to run your account:
            </P>
            <Ul
              items={[
                "Name, email address, password (stored as an argon2 hash — we never see or store your plaintext password)",
                "Login sessions and timestamps",
              ]}
            />
            <P>
              We do not process or store any payment information inside the application. The
              one-time setup fee is paid directly to us outside the Service (see our{" "}
              <Link to="/legal/terms" className="text-primary underline underline-offset-2">
                Terms of Service
              </Link>
              ), and nothing about that payment is recorded in your account.
            </P>
            <P className="font-medium text-foreground">
              B. Data you enter about your business and your customers, on your behalf:
            </P>
            <Ul
              items={[
                "Customer/lead names, phone numbers, emails, and notes you add",
                "Revenue, expense, and pricing figures you enter or import",
                "Content connected from third-party accounts you link (e.g. Google Business Profile, Instagram), limited to what that integration's permissions grant",
                "Files you upload (e.g. CSV imports, receipts)",
              ]}
            />
            <P>
              We do not collect this data for our own purposes — it is yours, entered by you or your
              staff, to run your business inside the Service.
            </P>
          </Section>

          <Section title="4. How we use it">
            <Ul
              items={[
                "To provide the Service: displaying your dashboards, running the automations you configure, sending the emails you or the Service triggers (email verification, team invites, password resets, weekly digests, health alerts)",
                "To deliver support you request",
                "We do not sell, rent, or share your data or your customers' data with third parties for their marketing purposes.",
              ]}
            />
          </Section>

          <Section title="5. Where it lives">
            <P>
              Your data is stored on a Postgres database running on cloud infrastructure you
              provision and own (e.g. an Oracle Cloud account in your name), which we configure and
              deploy on your behalf during setup. Because this infrastructure is yours, its ongoing
              availability, backups, and continued payment to your cloud provider are your
              responsibility once handed over — we do not own or manage your infrastructure or your
              data. For {SUPPORT_WINDOW_DAYS} days after handoff, we're available to help with
              setup-related issues (see the{" "}
              <Link to="/legal/terms" className="text-primary underline underline-offset-2">
                Terms of Service
              </Link>
              ); after that window, this is entirely your responsibility.
            </P>
            <P>
              Data from a third-party connection you authorize (Google Business Profile, Instagram)
              is fetched and stored within your own deployment only, encrypted at rest, and only
              used to power the features you connected it for. You can disconnect these at any time
              from within the Service.
            </P>
          </Section>

          <Section title="6. Who can see it">
            <Ul
              items={[
                "You and staff you invite to your organization — team access is managed entirely by you from within the Service.",
                `Us — during the ${SUPPORT_WINDOW_DAYS}-day support window after handoff, we may access your deployment to help resolve setup issues you report. After that window, we do not have any ongoing access unless you specifically ask us to, for a new, separate engagement.`,
                "Nobody else. Because your deployment is dedicated to your business alone, there is no other organization's data anywhere on your instance.",
              ]}
            />
          </Section>

          <Section title="7. Your rights">
            <P>
              From Settings, within the Service, you can at any time export all of your
              organization's data as a download, or permanently delete your business and all its
              data (irreversible, requires typing your business name to confirm). You do not need to
              contact us for either of these — they're self-service. For anything else, contact{" "}
              {contact}.
            </P>
          </Section>

          <Section title="8. Cookies & sessions">
            <P>
              We use a single essential cookie to keep you signed in (a signed session token). We do
              not use third-party advertising or tracking cookies.
            </P>
          </Section>

          <Section title="9. Changes to this policy">
            <P>
              If this policy changes materially, we'll notify you by email before the change takes
              effect.
            </P>
          </Section>

          <Section title="10. Grievance / contact">
            <P>For any privacy question, complaint, or data request: {contact}</P>
          </Section>
        </article>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function P({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-foreground/90 ${className}`}>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1 text-sm text-foreground/90">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
