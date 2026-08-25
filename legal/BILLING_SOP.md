# Billing SOP — internal only, not client-facing

Purpose: turn `active → overdue → suspended` from a fresh judgment call each
month into a rule you just follow. Edit the numbers below to match what you
actually want to promise (they also feed the Terms of Service draft, Section 4
— keep the two in sync).

## The rule

| Day relative to `next_payment_due_date` | Status you set | Action |
|---|---|---|
| Due date, payment received | — | Confirm transfer, set `active`, advance `next_payment_due_date` by one month |
| Due date, payment **not** received | `overdue` | Send a friendly reminder (email/WhatsApp) |
| **+7 days**, still not received | `overdue` (unchanged) | Send a firmer follow-up |
| **+14 days**, still not received | `suspended` | Client locked out; send a final notice explaining why and how to restore access |
| Any time after suspension, payment received | `active` | Restore access same day, advance due date from the date paid (not the original due date) |

_(These are suggested defaults — 7/14 days is generous for a low-friction
manual bank-transfer setup. Tighten it if late payment becomes a real
problem; loosen it if you'd rather never lock out a client over a few days'
delay.)_

## Who does it

Right now: you, manually, from `/admin`, after checking your bank statement
for the transfer. There's no automated payment-webhook — every status change
is you clicking a status dropdown for that organization after confirming the
money actually arrived.

## Weekly habit

Pick one fixed day/time (e.g. every Monday morning) to:
1. Check the bank account for transfers received since last check
2. Match each transfer to an organization by name/reference
3. Set that organization to `active` and advance its due date
4. Scan for any organization past its grace period and flip to `overdue` /
   `suspended` per the table above

## What "suspended" actually does in the app

Enforced server-side (`requireOrgMember` / `requireOrgWrite` in
`src/server/authz.server.ts`) — a suspended org's own members are fully
locked out of their data. `platform_admin` / `support` roles (you) always
bypass this, so you can still open a suspended client's account to fix
billing or export their data before/after the lockout.

## Known gap

Overdue/suspended checks currently compare dates in UTC (see the Launch
Execution Plan, Phase 4 — this is one of the three items being fixed now).
Until that fix ships, a client near the India day-boundary could see their
status flip a few hours off from local midnight — not a billing-accuracy
problem, just a display-timing one.
