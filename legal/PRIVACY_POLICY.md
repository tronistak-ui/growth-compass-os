# Privacy Policy — TrendZypher Growth OS

**DRAFT — first pass. Replace every `[bracketed]` placeholder, then have someone
who isn't the person who wrote the software read it before it goes live.**

_Last updated: [date you publish this]_

## 1. Who this is

TrendZypher Growth OS ("**TrendZypher**", "**we**", "**us**") is operated by
**[Your legal name / business name]**, based in **[City, State, India]**.
For anything in this policy, contact **[support email address]**.

This policy applies to the TrendZypher Growth OS web application at
**[your domain]** ("**the Service**"), used by business owners ("**you**",
"**the Customer**") to manage their own customers, leads, and business data.

## 2. What we collect

TrendZypher is multi-tenant: your account and data live in your own
**organization**, invisible to other organizations on the same instance. We
collect two categories of data:

**A. Data about you (the Customer), to run your account:**
- Name, email address, password (stored as an argon2 hash — we never see or
  store your plaintext password)
- Login sessions and timestamps
- Billing status (active / overdue / suspended) and payment due dates —
  no card or bank details are stored in the app itself, since payment is
  collected by bank transfer directly to us, outside the Service

**B. Data you enter about your business and your customers, on your behalf:**
- Customer/lead names, phone numbers, emails, and notes you add
- Revenue, expense, and pricing figures you enter or import
- Content connected from third-party accounts you link (e.g. Google Business
  Profile, Instagram), limited to what that integration's permissions grant
- Files you upload (e.g. CSV imports, receipts)

We do not collect this data for our own purposes — it is yours, entered by
you or your staff, to run your business inside the Service.

## 3. How we use it

- To provide the Service: displaying your dashboards, running the automations
  you configure, sending the emails you or the Service triggers (password
  resets, weekly digests, health alerts)
- To bill you: tracking your `active` / `overdue` / `suspended` status against
  the plan described in our [Terms of Service](./TERMS_OF_SERVICE.md)
- To keep the Service working: error monitoring, backups, security logs
- We do **not** sell, rent, or share your data or your customers' data with
  third parties for their marketing purposes.

## 4. Where it lives

Data is stored on a Postgres database on a VPS we operate, located in
**[VPS provider + region, e.g. Hetzner, Germany / Oracle, Mumbai]**. Backups
are taken **[frequency]** and retained for **[retention period]**.

Data from a third-party connection you authorize (Google Business Profile,
Instagram) is fetched and stored under your organization only, encrypted at
rest, and only used to power the features you connected it for. You can
disconnect these at any time from within the Service.

## 5. Who can see it

- **You and staff you invite** to your organization
- **TrendZypher platform admins** (us) — only to provide support, investigate
  a reported issue, or as required to operate the Service (e.g. confirming a
  bank transfer to update your billing status). We do not browse client data
  without a reason tied to running the Service.
- **Nobody else.** Organizations are isolated from each other in the database;
  another business using TrendZypher cannot see your data.

## 6. Your rights

You (and your customers, where applicable) can ask us at
**[support email]** to:
- Export your organization's data
- Correct inaccurate data
- Delete your account and associated data, subject to what we're legally
  required to retain (e.g. billing records)

_(Self-service export/delete from within the Service is planned — until it
ships, this is a manual request to us.)_

## 7. Cookies & sessions

We use a single essential cookie to keep you signed in (a signed session
token). We do not use third-party advertising or tracking cookies.

## 8. Changes to this policy

If this policy changes materially, we'll notify active organization owners by
email before the change takes effect.

## 9. Grievance / contact

For any privacy question, complaint, or data request:
**[support email]** — **[phone number, if you want to publish one]**

---

### Notes for you (delete before publishing)

- This draft assumes India-based operation and INR billing per the existing
  Terms of Service draft. If you incorporate a company later, update "Who
  this is" with the registered entity name.
- If any client is an individual consumer (not just a business), consider
  whether India's DPDP Act 2023 grievance-officer requirements apply once
  you're operating at scale — worth a real lawyer's fifteen minutes, not
  something to guess into a template.
- Once you approve the wording, I can wire this up as an actual `/legal/privacy`
  route in the app and link it from the signup page and footer — say the word.
