REVOKE ALL ON FUNCTION public.claim_platform_admin() FROM anon;
REVOKE ALL ON FUNCTION public.claim_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_platform_admin() TO authenticated;