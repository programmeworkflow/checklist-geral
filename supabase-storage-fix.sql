-- ============================================================
-- Fix Storage bucket "uploads" (rodar no SQL Editor do Supabase)
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- ============================================================

-- 1) Criar o bucket (público, para leitura direta via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Policies permissivas sobre storage.objects (apenas bucket uploads)
DROP POLICY IF EXISTS "public_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_read"   ON storage.objects;
DROP POLICY IF EXISTS "public_update" ON storage.objects;
DROP POLICY IF EXISTS "public_delete" ON storage.objects;

CREATE POLICY "public_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "public_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "public_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'uploads');

-- Verificação
SELECT id, name, public FROM storage.buckets WHERE id = 'uploads';
