import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL, SUPPORT_EMAIL } from "@/lib/brand";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${BRAND_FULL}` },
      { name: "description", content: `Terms for using ${BRAND_FULL}.` },
    ],
  }),
  component: TermsPage,
});

const contact = SUPPORT_EMAIL || "[support email not yet configured]";

function TermsPage() {
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
              Terms of Service — {BRAND_FULL}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Last updated: [date this is published]
            </p>
          </header>

          <Section title="1. The deal">
            <P>
              {BRAND_FULL} ("the Service") is provided by [your legal name / business name] ("we",
              "us") to the business ("you", "the Customer") that engages us. By paying the setup
              fee, you agree to these terms.
            </P>
          </Section>

          <Section title="2. What it costs">
            <P className="font-medium text-foreground">
              One-time setup fee: [amount]. This is a single payment, not a subscription.
            </P>
            <Ul
              items={[
                "Deploying a dedicated instance of the Service on cloud infrastructure you provision (e.g. your own Oracle Cloud account)",
                "Configuring it for your business (branding, niche settings, initial data setup)",
                "Handing over full access credentials to you",
              ]}
            />
            <P>
              There is no recurring fee charged by us for use of the Service itself. Your only
              ongoing cost is whatever your cloud provider charges you directly for hosting — a cost
              you pay them, not us. Payment is made by [bank transfer / UPI / your method] before
              [work begins / handoff].
            </P>
          </Section>

          <Section title="3. What it includes">
            <P>
              Access to the {BRAND_NAME} platform for your organization, covering Presence, Customer
              Discovery, Reach, Conversion, Customer Management, Revenue Growth, Financial Control,
              and Positioning tooling. You can invite as many staff as you need under your
              organization — there is no seat limit.
            </P>
            <P>Support: [what you're actually committing to post-handoff — see Section 6].</P>
          </Section>

          <Section title="4. Payment terms">
            <P>
              The setup fee is due [before work begins / on completion]. Because this is a one-time
              engagement rather than a subscription, there is no ongoing account status tracked by
              the Service — once delivered, the deployment is yours to use indefinitely.
            </P>
          </Section>

          <Section title="5. Refunds">
            <P>
              [Your policy — e.g. "non-refundable once setup work has started" or "refundable in
              full if cancelled within 7 days and no substantial work has begun."]
            </P>
          </Section>

          <Section title="6. After handoff: support and updates">
            <P>
              Because your deployment runs on infrastructure you own, what happens after handoff is
              stated here plainly: [pick one — a clean handoff with no retained access and any
              future work as a new engagement; an included support window of a stated length; or an
              ongoing retainer with its fee and scope stated].
            </P>
          </Section>

          <Section title="7. Cancellation">
            <P>
              Since there is no subscription, there is nothing to "cancel" in the ongoing sense —
              you keep whatever was delivered. If you want your data removed after using the
              Service, you can do that yourself at any time from Settings ("Delete this business" —
              irreversible), or ask us if that's part of the support arrangement in Section 6.
            </P>
          </Section>

          <Section title="8. Your data, your responsibility">
            <P>
              You own the customer and business data you put into the Service. You're responsible
              for:
            </P>
            <Ul
              items={[
                "The accuracy of the data you enter",
                "Having the right to store your customers' contact details (e.g. consent to message them, where relevant)",
                "Keeping your login credentials confidential",
                "Once handed over, the ongoing operation of your own cloud infrastructure (keeping your cloud provider account active and paid)",
              ]}
            />
            <P>
              We're responsible for delivering a working, correctly configured deployment at
              handoff, with your data isolated on infrastructure dedicated to your business alone —
              see the{" "}
              <Link to="/legal/privacy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </P>
          </Section>

          <Section title="9. Availability">
            <P>
              Because your deployment runs on infrastructure you own rather than infrastructure we
              operate, its ongoing availability after handoff depends on that infrastructure
              remaining operational — for example, your cloud provider account staying active and
              paid. We are not responsible for outages caused by your hosting provider, your own
              infrastructure management, or third-party API outages for connected accounts after
              handoff, except as covered under any support arrangement in Section 6.
            </P>
          </Section>

          <Section title="10. Limitation of liability">
            <P>
              To the extent permitted by law, our liability to you for any claim relating to the
              Service is limited to the total setup fee you paid us. We're not liable for indirect
              or consequential losses (like lost profits) arising from use of the Service.
            </P>
          </Section>

          <Section title="11. Changes to these terms">
            <P>
              We'll notify you by email before any material change takes effect that affects an
              active support/retainer arrangement under Section 6.
            </P>
          </Section>

          <Section title="12. Governing law">
            <P>
              These terms are governed by the laws of [India / your state], and any dispute will be
              handled in the courts of [your city].
            </P>
          </Section>

          <Section title="13. Contact">
            <P>{contact}</P>
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
