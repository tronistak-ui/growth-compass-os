# Billing SOP — internal only, not client-facing

The `active` / `overdue` / `suspended` mechanism this describes still exists
in the app (enforced server-side in `src/server/authz.server.ts`, settable
from `/admin`) — but it was built for a recurring monthly subscription that
no longer exists. Under the current one-time-payment terms (₹7,500 before
setup, ₹7,500 before handoff — see [Terms of Service](./TERMS_OF_SERVICE.md)
§4), the second payment happens *before* a client ever gets access, so
there's no "already-active client stops paying" scenario for this to
routinely govern. There is no weekly bank-check habit to run anymore.

## What it's still for

An occasional manual tool, not a routine — from `/admin`, you can flip an
organization to `suspended` to lock its own members out of their data (you,
as `platform_admin`/`support`, always retain access to fix things or export
their data). Reach for this for something like a payment dispute or a
contract violation, not as part of the normal delivery flow.

## What "suspended" actually does in the app

Enforced server-side (`requireOrgMember` / `requireOrgWrite` in
`src/server/authz.server.ts`) — a suspended org's own members are fully
locked out of their data. `platform_admin` / `support` roles always bypass
this.
