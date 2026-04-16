// Mapeamento camelCase (frontend) <-> snake_case (Supabase)
// Apenas campos que diferem precisam estar aqui

const FIELD_MAPS: Record<string, Record<string, string>> = {
  companies:          { docType: 'doc_type', logo: 'logo_url' },
  sectors:            { companyId: 'company_id' },
  job_functions:      { sectorId: 'sector_id', audioDescription: 'audio_description_url' },
  risk_categories:    {},
  risks:              { categoryId: 'category_id', exposureType: 'exposure_type', customFields: 'custom_fields', audioDescription: 'audio_description_url' },
  safety_measures:    { riskId: 'risk_id' },
  occupational_exams: { riskId: 'risk_id', esocialCode: 'esocial_code', retornoTrabalho: 'retorno_trabalho' },
  epis:               { image: 'image_url' },
  trainings:          {},
  checklist_blocks:   { isSystem: 'is_system' },
  block_fields:       { blockId: 'block_id' },
  checklists:         { companyId: 'company_id', sectorId: 'sector_id', functionIds: 'function_ids', createdAt: 'created_at', formData: 'form_data', selectedRisks: 'selected_risks', selectedEpis: 'selected_epis', selectedTrainings: 'selected_trainings' },
  nav_items:          {},
  report_blocks:      {},
  professionals:      {},
};

// Build reverse maps once
const REVERSE_MAPS: Record<string, Record<string, string>> = {};
for (const [table, map] of Object.entries(FIELD_MAPS)) {
  REVERSE_MAPS[table] = {};
  for (const [camel, snake] of Object.entries(map)) {
    REVERSE_MAPS[table][snake] = camel;
  }
}

/** Convert frontend object (camelCase) to DB row (snake_case) */
export function toDb(table: string, obj: Record<string, any>): Record<string, any> {
  const map = FIELD_MAPS[table] || {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const dbKey = map[key] || key;
    result[dbKey] = value;
  }
  return result;
}

/** Convert DB row (snake_case) to frontend object (camelCase) */
export function fromDb(table: string, row: Record<string, any>): Record<string, any> {
  const rmap = REVERSE_MAPS[table] || {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = rmap[key] || key;
    result[camelKey] = value;
  }
  return result;
}
