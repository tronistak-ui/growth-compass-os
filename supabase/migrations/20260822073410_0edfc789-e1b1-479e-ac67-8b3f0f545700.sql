-- Use a plain unique index so PostgREST upserts can infer the conflict target
-- (NULL insight_key rows are manual entries and remain unconstrained).
DROP INDEX IF EXISTS public.growth_opportunities_auto_key;
CREATE UNIQUE INDEX IF NOT EXISTS growth_opportunities_auto_key
  ON public.growth_opportunities (organization_id, insight_key);