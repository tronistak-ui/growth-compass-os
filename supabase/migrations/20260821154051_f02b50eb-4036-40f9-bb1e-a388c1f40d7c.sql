
-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('platform_admin','business_owner');

-- ============ core ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'business_owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  niche text,
  industry text,
  location text,
  target_location text,
  website text,
  instagram text,
  facebook text,
  whatsapp text,
  google_profile text,
  phone text,
  email text,
  currency text NOT NULL DEFAULT 'USD',
  products_services text,
  main_offers text,
  main_customer_type text,
  avg_order_value numeric(12,2) DEFAULT 0,
  monthly_revenue_range text,
  main_goal text,
  goals text[] DEFAULT '{}',
  acquisition_channels text[] DEFAULT '{}',
  onboarding_status text NOT NULL DEFAULT 'not_started',
  onboarding_completed boolean NOT NULL DEFAULT false,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- ============ helper functions ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'platform_admin');
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'business_owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- owner auto-membership
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.presence_profiles (organization_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.positioning (organization_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- ============ business tables ============
CREATE TABLE public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  age_range text,
  location text,
  interests text,
  problems text,
  goals text,
  buying_triggers text,
  objections text,
  preferred_channels text[] DEFAULT '{}',
  customer_value numeric(12,2),
  buying_frequency text,
  offer text,
  priority text DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  segment_id uuid REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  price numeric(12,2) DEFAULT 0,
  cost numeric(12,2) DEFAULT 0,
  cta text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'instagram',
  target_audience text,
  budget numeric(12,2) DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  source text,
  segment_id uuid REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  customer_since date DEFAULT CURRENT_DATE,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  source text DEFAULT 'instagram',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  value numeric(12,2) DEFAULT 0,
  last_contact date,
  next_follow_up date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.revenue_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  product_service text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  module text NOT NULL DEFAULT 'dashboard',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  positioning text,
  strengths text,
  weaknesses text,
  opportunity text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversion_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'missing',
  url text,
  conversion_goal text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_month date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  visitors integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  qualified_leads integer NOT NULL DEFAULT 0,
  customers integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_month)
);

CREATE TABLE public.growth_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  lever text NOT NULL DEFAULT 'new_customers',
  current_value text,
  target_value text,
  recommended_action text,
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.presence_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  website_url text,
  website_status text DEFAULT 'missing',
  website_mobile_ready boolean DEFAULT false,
  website_has_cta boolean DEFAULT false,
  website_has_contact boolean DEFAULT false,
  google_profile_claimed boolean DEFAULT false,
  google_category text,
  google_address text,
  google_phone text,
  google_hours text,
  google_reviews integer DEFAULT 0,
  google_rating numeric(2,1) DEFAULT 0,
  google_website_linked boolean DEFAULT false,
  instagram_url text,
  instagram_bio text,
  instagram_has_cta boolean DEFAULT false,
  instagram_link boolean DEFAULT false,
  instagram_contact boolean DEFAULT false,
  whatsapp_business boolean DEFAULT false,
  whatsapp_number text,
  whatsapp_cta boolean DEFAULT false,
  whatsapp_catalogue boolean DEFAULT false,
  consistent_name boolean DEFAULT false,
  consistent_phone boolean DEFAULT false,
  consistent_address boolean DEFAULT false,
  consistent_website boolean DEFAULT false,
  consistent_description boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.positioning (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_customer text,
  problem text,
  value_proposition text,
  differentiator text,
  brand_promise text,
  proof text,
  messaging text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER on_organization_created
AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- ============ profiles / roles / orgs policies ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'platform_admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "create own org" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "members update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_member(id)) WITH CHECK (public.is_org_member(id));
CREATE POLICY "owner delete org" ON public.organizations FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'platform_admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read memberships" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organization_id));
CREATE POLICY "manage memberships" ON public.organization_members FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

-- ============ generated policies for org-scoped tables ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_segments','offers','campaigns','customers','leads','interactions',
    'revenue_transactions','expenses','tasks','competitors','conversion_assets','funnel_snapshots',
    'growth_opportunities','presence_profiles','positioning']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "org members manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE TRIGGER set_updated_at_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
    EXECUTE format('CREATE INDEX idx_%1$s_org ON public.%1$I (organization_id)', t);
  END LOOP;
END $$;

CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_leads_status ON public.leads (organization_id, status);
CREATE INDEX idx_rev_date ON public.revenue_transactions (organization_id, occurred_on);
CREATE INDEX idx_exp_date ON public.expenses (organization_id, occurred_on);
CREATE INDEX idx_members_user ON public.organization_members (user_id);
