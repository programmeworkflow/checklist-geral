-- ============================================
-- VISTEC: Schema completo para Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  doc_type TEXT,
  doc TEXT,
  cnpj TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_functions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sector_id TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  audio_description_url TEXT
);

CREATE TABLE IF NOT EXISTS risk_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id TEXT NOT NULL REFERENCES risk_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT DEFAULT '',
  exposure_type TEXT DEFAULT '',
  recommendations TEXT DEFAULT '',
  custom_fields JSONB DEFAULT '{}',
  audio_description_url TEXT
);

CREATE TABLE IF NOT EXISTS safety_measures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  risk_id TEXT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS occupational_exams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  risk_id TEXT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  esocial_code TEXT,
  admissional BOOLEAN DEFAULT false,
  demissional BOOLEAN DEFAULT false,
  periodico BOOLEAN DEFAULT false,
  periodicidade SMALLINT,
  retorno_trabalho BOOLEAN DEFAULT false,
  mudanca BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS epis (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS trainings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS checklist_blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  visible BOOLEAN DEFAULT true,
  description TEXT
);

CREATE TABLE IF NOT EXISTS block_fields (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  block_id TEXT NOT NULL REFERENCES checklist_blocks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  visible BOOLEAN DEFAULT true,
  "order" INT NOT NULL DEFAULT 0,
  description TEXT,
  options JSONB
);

CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL,
  function_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  form_data JSONB DEFAULT '{}',
  selected_risks JSONB DEFAULT '{}',
  selected_epis JSONB DEFAULT '{}',
  selected_trainings JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS nav_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  "order" INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  "order" INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  formation TEXT DEFAULT '',
  registration TEXT DEFAULT ''
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_sectors_company ON sectors(company_id);
CREATE INDEX IF NOT EXISTS idx_functions_sector ON job_functions(sector_id);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category_id);
CREATE INDEX IF NOT EXISTS idx_measures_risk ON safety_measures(risk_id);
CREATE INDEX IF NOT EXISTS idx_exams_risk ON occupational_exams(risk_id);
CREATE INDEX IF NOT EXISTS idx_fields_block ON block_fields(block_id);
CREATE INDEX IF NOT EXISTS idx_checklists_company ON checklists(company_id);

-- RLS: acesso publico
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupational_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'companies','sectors','job_functions','risk_categories','risks',
      'safety_measures','occupational_exams','epis','trainings',
      'checklist_blocks','block_fields','checklists','nav_items',
      'report_blocks','professionals'
    ])
  LOOP
    EXECUTE format('CREATE POLICY "anon_select_%1$s" ON %1$I FOR SELECT USING (true)', tbl);
    EXECUTE format('CREATE POLICY "anon_insert_%1$s" ON %1$I FOR INSERT WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "anon_update_%1$s" ON %1$I FOR UPDATE USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "anon_delete_%1$s" ON %1$I FOR DELETE USING (true)', tbl);
  END LOOP;
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');
