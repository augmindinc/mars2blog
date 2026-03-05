-- 1. Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Allow public read-only access (anonymous and authenticated users)
CREATE POLICY "Allow public read-only access for categories" ON public.categories
FOR SELECT USING (true);

-- 3. Allow admins to manage categories (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
