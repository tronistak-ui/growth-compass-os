# Privacy Policy — TrendZypher Growth OS

**DRAFT — first pass. Replace every `[bracketed]` placeholder, then have someone
who isn't the person who wrote the software read it before it goes live.**

_Last updated: [date you publish this]_

## 1. Who this is

TrendZypher Growth OS ("**TrendZypher**", "**we**", "**us**") is provided by
**[Your legal name / business name]**, based in **[City, State, India]**.
For anything in this policy, contact **[support email address]**.

This policy applies to the TrendZypher Growth OS application deployed for
your business ("**you**", "**the Customer**") and used by you and staff you
invite to manage your own customers, leads, and business data.

## 2. How this is different from a typical SaaS

Each TrendZypher deployment is dedicated to one business: we set up and
configure a private instance of the application on cloud infrastructure
**that you own** (e.g. your own Oracle Cloud account), and hand you the
credentials. Your data is not stored on shared servers alongside other
businesses' data — it lives on infrastructure provisioned in your name, under
your control.

## 3. What we collect

**A. Data about you (the Customer), to run your account:**
- Name, email address, password (stored as an argon2 hash — we never see or
  store your plaintext password)
- Login sessions and timestamps

We do not process or store any payment information inside the application.
The one-time setup fee is paid directly to us outside the Service (see our
[Terms of Service](./TERMS_OF_SERVICE.md)), and nothing about that payment is
recorded in your account.

**B. Data you enter about your business and your customers, on your behalf:**
- Customer/lead names, phone numbers, emails, and notes you add
- Revenue, expense, and pricing figures you enter or import
- Content connected from third-party accounts you link (e.g. Google Business
  Profile, Instagram), limited to what that integration's permissions grant
- Files you upload (e.g. CSV imports, receipts)

We do not collect this data for our own purposes — it is yours, entered by
you or your staff, to run your business inside the Service.

## 4. How we use it

- To provide the Service: displaying your dashboards, running the automations
  you configure, sending the emails you or the Service triggers (email
  verification, team invites, password resets, weekly digests, health
  alerts)
- To deliver support you request (see Section 6)
- We do **not** sell, rent, or share your data or your customers' data with
  third parties for their marketing purposes.

## 5. Where it lives

Your data is stored on a Postgres database running on cloud infrastructure
**you provision and own** (e.g. an Oracle Cloud account in your name), which
we configure and deploy on your behalf during setup. Because this
infrastructure is yours, its ongoing availability, backups, and continued
payment to the cloud provider are **[your responsibility once handed over /
covered under an ongoing arrangement described here — decide and state
which]**.

Data from a third-party connection you authorize (Google Business Profile,
Instagram) is fetched and stored within your own deployment only, encrypted
at rest, and only used to power the features you connected it for. You can
disconnect these at any time from within the Service.

## 6. Who can see it

- **You and staff you invite** to your organization — team access is managed
  entirely by you from within the Service.
- **Us** — **[state the truth here: do we retain ongoing administrative
  access to the server we set up for you after handoff, e.g. for applying
  updates or providing support you request? Or is access fully transferred
  and revoked on our side once setup is complete, with support handled some
  other way? This is a real decision, not a formality — state it plainly.]**
- **Nobody else.** Because your deployment is dedicated to your business
  alone, there is no other organization's data anywhere on your instance.

## 7. Your rights

From **Settings**, within the Service, you can at any time:
- **Export all of your organization's data** as a download
- **Permanently delete your business and all its data** (irreversible,
  requires typing your business name to confirm)

You do not need to contact us for either of these — they're self-service.
For anything else (correcting data you can't fix yourself, a question about
this policy), contact **[support email]**.

## 8. Cookies & sessions

We use a single essential cookie to keep you signed in (a signed session
token). We do not use third-party advertising or tracking cookies.

## 9. Changes to this policy

If this policy changes materially, we'll notify you by email before the
change takes effect.

## 10. Grievance / contact

For any privacy question, complaint, or data request:
**[support email]** — **[phone number, if you want to publish one]**

---

### Notes for you (delete before publishing)

- This draft assumes India-based operation. If you incorporate a company
  later, update "Who this is" with the registered entity name.
- **Section 5 and 6 have a real decision embedded that the old draft didn't
  need to make**: since each client's data lives on infrastructure *they*
  own, you need to actually decide (not just word carefully) whether you
  keep any ongoing access to a client's server after handoff — for applying
  security updates, fixing bugs, or support — or whether you hand over full
  control and walk away, with any future work being a separate, explicit
  engagement. Both are legitimate models; the Terms of Service and this
  policy both need to say the same thing, whichever you pick.
- If any client is an individual consumer (not just a business), consider
  whether India's DPDP Act 2023 grievance-officer requirements apply once
  you're operating at scale — worth a real lawyer's fifteen minutes, not
  something to guess into a template.
- This is now wired up live at `/legal/privacy` in the app (see
  `src/routes/legal/privacy.tsx`) and linked from the signup page footer.
  If you edit the wording here, update that file to match — the live page
  is hand-written JSX, not rendered from this markdown file.
