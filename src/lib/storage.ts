// Supabase-based data store
import { supabase } from './supabase';
import { toDb, fromDb } from './columnMap';

// ============================================
// TYPES (unchanged)
// ============================================
export type DocType = 'CNPJ' | 'CPF' | 'CEI' | 'CAEPF';

export interface Company { id: string; name: string; docType?: DocType; doc?: string; cnpj?: string; logo?: string; }
export interface Sector { id: string; companyId: string; name: string; }
export interface JobFunction { id: string; sectorId: string; name: string; description?: string; audioDescription?: string; }
export interface RiskCategory { id: string; name: string; type: string; }
export interface Risk { id: string; categoryId: string; name: string; source: string; exposureType: string; recommendations: string; customFields: Record<string, string>; audioDescription?: string; }
export type SafetyMeasureCategory = 'epi' | 'geral';
export interface SafetyMeasure {
  id: string;
  riskId: string;
  name: string;
  category?: SafetyMeasureCategory;
}
export interface Professional { id: string; name: string; formation: string; registration: string; }
export interface OccupationalExam { id: string; riskId: string; name: string; esocialCode?: string; admissional: boolean; demissional: boolean; periodico: boolean; periodicidade?: 6 | 12 | 24; retornoTrabalho: boolean; mudanca: boolean; }
export interface EPI { id: string; name: string; description: string; image?: string; }
export interface Training { id: string; name: string; description: string; }
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'image' | 'display_image' | 'audio' | 'signature' | 'user_select';
export interface BlockField { id: string; blockId: string; label: string; type: FieldType; required: boolean; visible: boolean; order: number; description?: string; options?: string[]; }
export interface ChecklistBlock { id: string; name: string; order: number; isSystem: boolean; visible: boolean; description?: string; }
export interface NavItem { id: string; key: string; label: string; visible: boolean; order: number; }
export interface ReportBlock { id: string; key: string; label: string; visible: boolean; order: number; }
export interface RiskMeasure { id: string; riskId: string; measureId: string; }
export interface RiskExam {
  id: string; riskId: string; examId: string;
  admissional: boolean; demissional: boolean; periodico: boolean;
  periodicidade?: 6 | 12 | 24;
  retornoTrabalho: boolean; mudanca: boolean;
}
export interface ChecklistData {
  id: string; companyId: string; sectorId: string; functionIds: string[]; createdAt: string;
  updatedAt?: string; isDraft?: boolean;
  formData: Record<string, any>;
  selectedRisks: Record<string, { checked: boolean; desc?: string; notes?: string; frequency?: string }>;
  selectedEpis: Record<string, boolean>;
  selectedTrainings: Record<string, boolean>;
}

// ============================================
// HELPERS
// ============================================
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============================================
// GENERIC ASYNC CRUD (Supabase)
// ============================================
export interface CrudStore<T extends { id: string }> {
  getAll: () => Promise<T[]>;
  get: (id: string) => Promise<T | undefined>;
  add: (item: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T | undefined>;
  remove: (id: string) => Promise<void>;
  setAll: (items: T[]) => Promise<void>;
  table: string;
}

function createCrud<T extends { id: string }>(table: string): CrudStore<T> {
  const fail = (op: string, error: any): never => {
    console.error(`[${table}] ${op} error:`, error);
    throw new Error(`${table}.${op}: ${error?.message || error?.details || 'falha desconhecida'}`);
  };
  return {
    table,
    getAll: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) fail('getAll', error);
      return (data || []).map(row => fromDb(table, row) as T);
    },
    get: async (id: string): Promise<T | undefined> => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) fail('get', error);
      return data ? fromDb(table, data) as T : undefined;
    },
    add: async (item: Omit<T, 'id'>): Promise<T> => {
      const id = genId();
      const row = toDb(table, { ...item, id });
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) fail('add', error);
      return fromDb(table, data) as T;
    },
    update: async (id: string, partial: Partial<T>): Promise<T | undefined> => {
      const row = toDb(table, partial);
      delete row.id; // never update PK
      const { data, error } = await supabase.from(table).update(row).eq('id', id).select().maybeSingle();
      if (error) fail('update', error);
      return data ? fromDb(table, data) as T : undefined;
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) fail('remove', error);
    },
    setAll: async (items: T[]): Promise<void> => {
      const delRes = await supabase.from(table).delete().neq('id', '___none___');
      if (delRes.error) fail('setAll(delete)', delRes.error);
      if (items.length > 0) {
        const rows = items.map(i => toDb(table, i));
        const insRes = await supabase.from(table).insert(rows);
        if (insRes.error) fail('setAll(insert)', insRes.error);
      }
    },
  };
}

// ============================================
// STORE INSTANCES
// ============================================
export const companiesStore = createCrud<Company>('companies');
export const sectorsStore = createCrud<Sector>('sectors');
export const functionsStore = createCrud<JobFunction>('job_functions');
export const riskCategoriesStore = createCrud<RiskCategory>('risk_categories');
export const risksStore = createCrud<Risk>('risks');
export const examsStore = createCrud<OccupationalExam>('occupational_exams');
export const safetyMeasuresStore = createCrud<SafetyMeasure>('safety_measures');
export const episStore = createCrud<EPI>('epis');
export const trainingsStore = createCrud<Training>('trainings');
export const checklistBlocksStore = createCrud<ChecklistBlock>('checklist_blocks');
export const blockFieldsStore = createCrud<BlockField>('block_fields');
export const checklistsStore = createCrud<ChecklistData>('checklists');
export const navItemsStore = createCrud<NavItem>('nav_items');
export const reportBlocksStore = createCrud<ReportBlock>('report_blocks');
export const professionalsStore = createCrud<Professional>('professionals');
export const riskMeasuresStore = createCrud<RiskMeasure>('risk_measures');
export const riskExamsStore = createCrud<RiskExam>('risk_exams');

// ============================================
// SEED DEFAULTS (async)
// ============================================
let _seeded = false;
export async function seedDefaults() {
  if (_seeded) return;
  _seeded = true;

  const cats = await riskCategoriesStore.getAll();
  if (cats.length === 0) {
    const catDefs = [
      { name: 'Químicos', type: 'chemical' },
      { name: 'Físicos', type: 'physical' },
      { name: 'Biológicos', type: 'biological' },
      { name: 'Ergonômicos', type: 'ergonomic' },
      { name: 'Acidentes', type: 'accident' },
      { name: 'Outros', type: 'other' },
    ];
    for (const c of catDefs) await riskCategoriesStore.add(c as any);
  }

  const risks = await risksStore.getAll();
  if (risks.length === 0) {
    const allCats = await riskCategoriesStore.getAll();
    const defaultRisks: Record<string, string[]> = {
      chemical: ['Aplicação de defensivos agrícolas','Contato com óleos e graxas','Exposição a poeiras incômodas','Gases / névoas / vapores químicos','Utilização de produtos de limpeza'],
      physical: ['Calor por fonte natural','Ruído contínuo e/ou intermitente','Vibração – VCI','Exposição aos raios solares'],
      biological: ['Vírus / Bactérias / Fungos','Manipulação de alimentos','Contato com material infecto-contagiante'],
      ergonomic: ['Levantamento e transporte manual de peso','Movimentos repetitivos','Postura em pé por longos períodos','Postura sentada por longos períodos','Estresse psíquico'],
      accident: ['Queda de objetos e/ou materiais','Choques elétricos','Cortes / escoriações / perfurações','Trabalho em altura','Escorregões, tropeços, quedas'],
    };
    for (const cat of allCats) {
      for (const name of (defaultRisks[cat.type] || [])) {
        await risksStore.add({ categoryId: cat.id, name, source: '', exposureType: '', recommendations: '', customFields: {} } as any);
      }
    }
  }

  const epis = await episStore.getAll();
  if (epis.length === 0) {
    for (const name of ['Botina de segurança','Capacete de segurança','Luva de vaqueta','Óculos de proteção','Protetor auricular plug','Protetor solar','Cinto de segurança','Luva nitrílica','Másc. PFF sem filtro']) {
      await episStore.add({ name, description: '' } as any);
    }
  }

  const trainings = await trainingsStore.getAll();
  if (trainings.length === 0) {
    for (const name of ['NR 01','NR 05','NR 06','NR 10','NR 12','NR 17','NR 18','NR 33','NR 35']) {
      await trainingsStore.add({ name, description: '' } as any);
    }
  }

  const blocks = await checklistBlocksStore.getAll();
  if (blocks.length === 0) {
    const names = ['Informações Gerais','Setorização / GSE','Atribuições dos Cargos','Percepções de Riscos','Aplicação dos EPIs','Treinamentos','Observações'];
    for (let i = 0; i < names.length; i++) {
      await checklistBlocksStore.add({ name: names[i], order: i, isSystem: true, visible: true } as any);
    }
  }

  const nav = await navItemsStore.getAll();
  if (nav.length === 0) {
    const defaults = [
      { key: 'dashboard', label: 'Dashboard', visible: true, order: 0 },
      { key: 'empresas', label: 'Empresas', visible: true, order: 1 },
      { key: 'checklists', label: 'Checklists', visible: true, order: 2 },
      { key: 'relatorios', label: 'Relatórios', visible: true, order: 3 },
      { key: 'riscos', label: 'Riscos', visible: true, order: 4 },
      { key: 'exames', label: 'Exames', visible: true, order: 5 },
      { key: 'medidas', label: 'Medidas de Segurança', visible: true, order: 6 },
      { key: 'profissionais', label: 'Profissionais', visible: true, order: 7 },
      { key: 'configuracoes', label: 'Configurações', visible: true, order: 8 },
    ];
    for (const item of defaults) await navItemsStore.add(item as any);
  }

  const report = await reportBlocksStore.getAll();
  if (report.length === 0) {
    const defaults = [
      { key: 'info', label: 'Informações Gerais', visible: true, order: 0 },
      { key: 'risks', label: 'Riscos Identificados', visible: true, order: 1 },
      { key: 'conformities', label: 'Conformidades', visible: true, order: 2 },
      { key: 'nonconformities', label: 'Não Conformidades', visible: true, order: 3 },
      { key: 'na', label: 'Não se Aplica', visible: true, order: 4 },
      { key: 'actionplan', label: 'Plano de Ação', visible: true, order: 5 },
      { key: 'epis', label: 'EPIs Aplicados', visible: false, order: 6 },
      { key: 'trainings', label: 'Treinamentos', visible: false, order: 7 },
      { key: 'exams', label: 'Exames por Função', visible: true, order: 8 },
      { key: 'custom', label: 'Blocos Personalizados', visible: true, order: 9 },
      { key: 'observations', label: 'Observações', visible: true, order: 10 },
    ];
    for (const item of defaults) await reportBlocksStore.add(item as any);
  }
}
