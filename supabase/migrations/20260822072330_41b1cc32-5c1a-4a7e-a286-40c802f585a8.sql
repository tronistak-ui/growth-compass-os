CREATE POLICY "admin read orgs" ON public.organizations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "admin read leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "admin read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "admin read revenue" ON public.revenue_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin'));