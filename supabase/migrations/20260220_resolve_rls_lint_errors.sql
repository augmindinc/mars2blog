-- 1. Secure content_plans (Admins only)
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage content plans" ON public.content_plans
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Secure inflow_logs (Public insert, Admins only for others)
ALTER TABLE public.inflow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for inflow logs" ON public.inflow_logs
FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage inflow logs" ON public.inflow_logs
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Secure bot_logs (Public insert, Admins only for others)
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for bot logs" ON public.bot_logs
FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage bot logs" ON public.bot_logs
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
