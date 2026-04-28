-- ============================================================
-- Migration v2 — Reestruturação Riscos / Exames / Medidas
-- Idempotente. Pode rodar mais de 1x.
-- ============================================================

-- 1) Tornar safety_measures.risk_id e occupational_exams.risk_id NULLABLE
ALTER TABLE safety_measures
  ALTER COLUMN risk_id DROP NOT NULL;

ALTER TABLE occupational_exams
  ALTER COLUMN risk_id DROP NOT NULL;

-- 2) Tabela risk_measures (many-to-many: vincular medidas a riscos)
CREATE TABLE IF NOT EXISTS risk_measures (
  id           text PRIMARY KEY,
  risk_id      text NOT NULL REFERENCES risks(id)            ON DELETE CASCADE,
  measure_id   text NOT NULL REFERENCES safety_measures(id)  ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risk_id, measure_id)
);

-- 3) Tabela risk_exams (many-to-many com tipos por associação)
CREATE TABLE IF NOT EXISTS risk_exams (
  id              text PRIMARY KEY,
  risk_id         text NOT NULL REFERENCES risks(id)              ON DELETE CASCADE,
  exam_id         text NOT NULL REFERENCES occupational_exams(id) ON DELETE CASCADE,
  admissional     boolean DEFAULT false,
  demissional     boolean DEFAULT false,
  periodico       boolean DEFAULT false,
  periodicidade   smallint,         -- 6, 12, 24 meses
  retorno_trabalho boolean DEFAULT false,
  mudanca         boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risk_id, exam_id)
);

-- 4) Migração de dados existentes
-- 4a) Para cada safety_measure que tinha risk_id, criar entrada em risk_measures
INSERT INTO risk_measures (id, risk_id, measure_id)
SELECT
  'rm_' || sm.id,
  sm.risk_id,
  sm.id
FROM safety_measures sm
WHERE sm.risk_id IS NOT NULL
ON CONFLICT (risk_id, measure_id) DO NOTHING;

-- 4b) Para cada occupational_exam que tinha risk_id, criar entrada em risk_exams
-- (preserva os flags admiss/dem/peri/etc atuais do exame)
INSERT INTO risk_exams (id, risk_id, exam_id, admissional, demissional, periodico, periodicidade, retorno_trabalho, mudanca)
SELECT
  're_' || oe.id,
  oe.risk_id,
  oe.id,
  COALESCE(oe.admissional, false),
  COALESCE(oe.demissional, false),
  COALESCE(oe.periodico, false),
  oe.periodicidade,
  COALESCE(oe.retorno_trabalho, false),
  COALESCE(oe.mudanca, false)
FROM occupational_exams oe
WHERE oe.risk_id IS NOT NULL
ON CONFLICT (risk_id, exam_id) DO NOTHING;

-- 5) Índices pra queries rápidas
CREATE INDEX IF NOT EXISTS idx_risk_measures_risk_id   ON risk_measures(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_measures_measure_id ON risk_measures(measure_id);
CREATE INDEX IF NOT EXISTS idx_risk_exams_risk_id       ON risk_exams(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_exams_exam_id       ON risk_exams(exam_id);

-- 6) Habilitar RLS + policies permissivas (mesmo padrão das outras tabelas)
ALTER TABLE risk_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_exams    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['risk_measures','risk_exams'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_read_%1$s"   ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%1$s" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%1$s" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%1$s" ON %1$I', tbl);

    EXECUTE format('CREATE POLICY "anon_read_%1$s"   ON %1$I FOR SELECT USING (true)', tbl);
    EXECUTE format('CREATE POLICY "anon_insert_%1$s" ON %1$I FOR INSERT WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "anon_update_%1$s" ON %1$I FOR UPDATE USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "anon_delete_%1$s" ON %1$I FOR DELETE USING (true)', tbl);
  END LOOP;
END $$;

-- 7) Adicionar coluna is_draft + autosave em checklists
ALTER TABLE checklists
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_checklists_is_draft ON checklists(is_draft) WHERE is_draft = true;

-- Verificação
SELECT 'risk_measures' AS table_name, COUNT(*) FROM risk_measures
UNION ALL SELECT 'risk_exams', COUNT(*) FROM risk_exams
UNION ALL SELECT 'safety_measures (com risk_id)', COUNT(*) FROM safety_measures WHERE risk_id IS NOT NULL
UNION ALL SELECT 'occupational_exams (com risk_id)', COUNT(*) FROM occupational_exams WHERE risk_id IS NOT NULL;
