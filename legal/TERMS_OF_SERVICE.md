# Terms of Service — TrendZypher Growth OS

**DRAFT — first pass. Replace every `[bracketed]` placeholder. This is not
legal advice; have someone qualified review it before the first client signs.**

_Last updated: [date you publish this]_

## 1. The deal

TrendZypher Growth OS ("**the Service**") is provided by
**[Your legal name / business name]** ("**we**", "**us**") to the business
("**you**", "**the Customer**") that engages us.

By paying the setup fee, you agree to these terms.

## 2. What it costs

**One-time setup fee: ₹[amount].** This is a single payment, not a
subscription. It covers:
- Deploying a dedicated instance of the Service on cloud infrastructure you
  provision (e.g. your own Oracle Cloud account)
- Configuring it for your business (branding, niche settings, initial data
  setup)
- Handing over full access credentials to you

There is no recurring fee charged by us for use of the Service itself. Your
only ongoing cost is whatever your cloud provider (e.g. Oracle Cloud) charges
you directly for hosting — a cost you pay them, not us.

Payment is made by **[bank transfer / UPI / your method]** to the account
details we provide, before **[work begins / handoff, pick one]**.

## 3. What it includes

Access to the TrendZypher Growth OS platform for your organization, covering
Presence, Customer Discovery, Reach, Conversion, Customer Management, Revenue
Growth, Financial Control, and Positioning tooling. You can invite as many
staff as you need under your organization — there is no seat limit.

Support: **[what you're actually committing to post-handoff — see Section 6,
this needs to say the same thing]**.

## 4. Payment terms

The setup fee is due **[before work begins / on completion, pick one]**.
Because this is a one-time engagement rather than a subscription, there is
no ongoing account status (like "active" or "suspended") tracked by the
Service — once delivered, the deployment is yours to use indefinitely.

## 5. Refunds

**[Your policy — e.g. "non-refundable once setup work has started" or
"refundable in full if cancelled within 7 days and no substantial work has
begun."]**

## 6. After handoff: support and updates

Because your deployment runs on infrastructure you own, what happens after
we hand it over is a decision you need to state plainly here — pick one and
fill in the details:

- **[Option A — clean handoff]:** Once delivered, our engagement ends. We do
  not retain access to your server. Any future changes, updates, or support
  are a separate, new engagement you can request and pay for individually.
- **[Option B — included support window]:** For **[e.g. 30 days]** after
  handoff, we'll fix any setup issues and answer questions at no extra
  charge, reachable at **[support email]**. After that window, further work
  is a separate engagement.
- **[Option C — ongoing retainer, if you decide to offer one]:** State the
  fee, what it covers (e.g. security updates, bug fixes), and how to cancel
  it.

Whichever you choose, **Section 6 of the Privacy Policy needs to say the
same thing** about whether we retain server access after handoff — don't
let the two documents disagree.

## 7. Cancellation

Since there is no subscription, there is nothing to "cancel" in the ongoing
sense — you keep whatever was delivered. If you want your data removed after
using the Service, you can do that yourself at any time from **Settings**
("Delete this business" — irreversible), or ask us if that's part of the
support arrangement in Section 6.

We can decline to begin or complete work for a prospective client at our
discretion before the setup fee is paid; once paid and delivered, the
arrangement is governed by Sections 5 and 6 above.

## 8. Your data, your responsibility

You own the customer and business data you put into the Service. You're
responsible for:
- The accuracy of the data you enter
- Having the right to store your customers' contact details (e.g. consent to
  message them, where relevant)
- Keeping your login credentials confidential
- Once handed over, the ongoing operation of your own cloud infrastructure
  (keeping your Oracle Cloud account active and paid, since your deployment
  runs on it)

We're responsible for delivering a working, correctly configured deployment
at handoff, with your data isolated on infrastructure dedicated to your
business alone — see the [Privacy Policy](./PRIVACY_POLICY.md).

## 9. Availability

Because your deployment runs on infrastructure you own rather than
infrastructure we operate, its ongoing availability after handoff depends on
that infrastructure remaining operational — for example, your cloud
provider account staying active and paid. We are not responsible for outages
caused by your hosting provider, your own infrastructure management, or
third-party API outages for connected accounts (Google, Instagram, etc.)
after handoff, except as covered under any support arrangement in Section 6.

## 10. Limitation of liability

To the extent permitted by law, our liability to you for any claim relating
to the Service is limited to the total setup fee you paid us. We're not
liable for indirect or consequential losses (like lost profits) arising from
use of the Service.

## 11. Changes to these terms

We'll notify you by email before any material change takes effect that
affects an active support/retainer arrangement under Section 6.

## 12. Governing law

These terms are governed by the laws of **[India / your state]**, and any
dispute will be handled in the courts of **[your city]**.

## 13. Contact

**[support email]**

---

### Notes for you (delete before publishing)

- **Section 6 is the one real decision this rewrite can't make for you.**
  The old draft's whole billing-status system existed because there was a
  recurring subscription to enforce. That's gone now — but it leaves a real
  open question your clients will ask: "what happens if something breaks
  next month?" Pick Option A, B, or C (or write your own) and be specific,
  because it's also what a lawyer needs to see to review this properly.
- Fill in the setup-fee amount and refund policy with what you'll actually
  honor.
- This is now wired up live at `/legal/terms` in the app (see
  `src/routes/legal/terms.tsx`) and linked from the signup page footer. If
  you edit the wording here, update that file to match — the live page is
  hand-written JSX, not rendered from this markdown file.
