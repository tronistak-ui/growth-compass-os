-- Social Connections — OAuth-linked Presence data.
--
-- Additive: does NOT replace organizations.instagram / .facebook / .whatsapp /
-- .google_profile (those stay as the canonical link/handle fields the client
-- typed at onboarding) or the manual fields on presence_profiles. A connected
-- provider lets a scheduled sync keep the relevant presence_profiles columns
-- current automatically; anyone who doesn't connect keeps entering them by hand.
--
-- No client accounts/passwords/emails are created by TrendZypher — each
-- platform's own OAuth consent screen handles authentication, and this table
-- only ever holds a scoped access token for the account the client approved.

CREATE TABLE public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('instagram','facebook','google_business','whatsapp')),
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','error','disconnected')),
  external_account_id text,             -- IG/Page/Location/WABA id
  external_account_name text,           -- display name, for the UI
  access_token text NOT NULL,           -- encrypted at rest, see edge functions
  refresh_token text,                   -- if the provider issues one
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX idx_social_connections_org ON public.social_connections (organization_id);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Org members (and platform_admin/support/auditor, via is_org_member) can see
-- connection status, but never the raw token — the view below is what the
-- frontend actually queries.
CREATE POLICY social_connections_org_read ON public.social_connections FOR SELECT
  USING (public.is_org_member(organization_id));

-- All writes (insert on connect, update on refresh/sync, delete on
-- disconnect) go through edge functions using the service role — no
-- INSERT/UPDATE/DELETE policy for regular clients, so a stolen client
-- session can never grant itself a token or read someone else's.

CREATE TRIGGER set_updated_at_social_connections BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Token-free read surface for the frontend.
CREATE VIEW public.social_connections_public
  WITH (security_invoker = true) AS
  SELECT id, organization_id, provider, status, external_account_name,
         last_synced_at, last_error, created_at
  FROM public.social_connections;

GRANT SELECT ON public.social_connections_public TO authenticated;
